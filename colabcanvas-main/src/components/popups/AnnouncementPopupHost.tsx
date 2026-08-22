/**
 * AnnouncementPopupHost
 *
 * Mounted once globally in AppLayout. Polls active popups (and listens to
 * realtime updates), filters them against the current route + user audience +
 * frequency rules, and renders the highest-priority match as a modal.
 *
 * The dialog matches the two-card reference layout: a soft brushstroke outer
 * card containing the headline + body + CTA, with an optional inner secondary
 * card visual (image or supplementary content).
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AnnouncementPopup {
  id: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  secondary_image_url: string | null;
  pages: string[];
  audience: { plans?: string[]; roles?: string[]; created_after?: string };
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  dismissible: boolean;
  frequency: "once" | "session" | "always";
}

interface ViewRecord {
  popup_id: string;
  dismissed: boolean;
  cta_clicked: boolean;
  seen_at: string;
}

const SESSION_KEY = "announcement_popups_session_views";

function getSessionViews(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function recordSessionView(popupId: string) {
  try {
    const set = getSessionViews();
    set.add(popupId);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* noop */
  }
}

function pageMatches(patterns: string[], pathname: string): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((pattern) => {
    if (!pattern) return false;
    if (pattern === "*") return true;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return pathname === prefix || pathname.startsWith(prefix + "/");
    }
    return pathname === pattern;
  });
}

export const AnnouncementPopupHost = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [popups, setPopups] = useState<AnnouncementPopup[]>([]);
  const [views, setViews] = useState<ViewRecord[]>([]);
  const [activePopup, setActivePopup] = useState<AnnouncementPopup | null>(null);
  const [open, setOpen] = useState(false);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const nowIso = new Date().toISOString();
      const [{ data: popupRows }, { data: viewRows }] = await Promise.all([
        supabase
          .from("announcement_popups")
          .select("*")
          .eq("is_active", true)
          .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
          .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
          .order("priority", { ascending: false }),
        supabase
          .from("announcement_popup_views")
          .select("popup_id, dismissed, cta_clicked, seen_at")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setPopups((popupRows as AnnouncementPopup[]) ?? []);
      setViews((viewRows as ViewRecord[]) ?? []);
    };

    load();

    const channel = supabase
      .channel("announcement_popups_host")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_popups" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Pick the right popup for the current route
  useEffect(() => {
    if (!user) {
      setActivePopup(null);
      setOpen(false);
      return;
    }

    const sessionViews = getSessionViews();
    const candidate = popups.find((p) => {
      if (!pageMatches(p.pages, location.pathname)) return false;

      const view = views.find((v) => v.popup_id === p.id);

      if (p.frequency === "once") {
        if (view && view.dismissed) return false;
      } else if (p.frequency === "session") {
        if (sessionViews.has(p.id)) return false;
      }

      // audience.created_after filter
      if (p.audience?.created_after && user.created_at) {
        const userCreated = new Date(user.created_at).getTime();
        const cutoff = new Date(p.audience.created_after).getTime();
        if (userCreated < cutoff) return false;
      }

      return true;
    });

    if (candidate) {
      setActivePopup(candidate);
      setOpen(true);
    } else {
      setActivePopup(null);
      setOpen(false);
    }
  }, [popups, views, location.pathname, user]);

  const recordEvent = async (
    popup: AnnouncementPopup,
    patch: Partial<Pick<ViewRecord, "dismissed" | "cta_clicked">>,
  ) => {
    if (!user) return;
    recordSessionView(popup.id);
    await supabase
      .from("announcement_popup_views")
      .upsert(
        {
          popup_id: popup.id,
          user_id: user.id,
          seen_at: new Date().toISOString(),
          dismissed: patch.dismissed ?? false,
          cta_clicked: patch.cta_clicked ?? false,
        },
        { onConflict: "popup_id,user_id" },
      );
    setViews((prev) => {
      const others = prev.filter((v) => v.popup_id !== popup.id);
      return [
        ...others,
        {
          popup_id: popup.id,
          seen_at: new Date().toISOString(),
          dismissed: patch.dismissed ?? false,
          cta_clicked: patch.cta_clicked ?? false,
        },
      ];
    });
  };

  const handleDismiss = async () => {
    if (!activePopup) return;
    setOpen(false);
    await recordEvent(activePopup, { dismissed: true });
  };

  const handleCta = async () => {
    if (!activePopup) return;
    await recordEvent(activePopup, { dismissed: true, cta_clicked: true });
    setOpen(false);
    if (activePopup.cta_url) {
      if (/^https?:\/\//i.test(activePopup.cta_url)) {
        window.open(activePopup.cta_url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = activePopup.cta_url;
      }
    }
  };

  if (!activePopup) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleDismiss() : setOpen(true))}>
      <DialogContent
        className="sm:max-w-[640px] p-0 overflow-hidden border-0 bg-transparent shadow-none"
        // Hide the default close icon — we render our own to match the design.
        onInteractOutside={(e) => {
          if (!activePopup.dismissible) e.preventDefault();
        }}
      >
        <div className="relative rounded-3xl overflow-hidden bg-white">
          {/* Brushstroke header */}
          <div
            className="relative h-44 w-full"
            style={{
              backgroundImage: activePopup.image_url
                ? `url(${activePopup.image_url})`
                : "linear-gradient(135deg, #cfe0f0, #aac5e0)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {activePopup.dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-zinc-700"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Inner secondary card (right card from the screenshot) */}
            {activePopup.secondary_image_url && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-xl bg-white shadow-sm overflow-hidden">
                <img
                  src={activePopup.secondary_image_url}
                  alt=""
                  className="w-full h-auto block"
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6 space-y-3">
            <h2 className="text-lg font-medium text-zinc-900 leading-snug">
              {activePopup.title}
            </h2>
            {activePopup.body && (
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                {activePopup.body}
              </p>
            )}
            {activePopup.cta_label && (
              <div className="pt-2 flex justify-end">
                <Button onClick={handleCta} className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-5">
                  {activePopup.cta_label}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
