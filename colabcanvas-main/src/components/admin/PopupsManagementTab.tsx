/**
 * PopupsManagementTab — admin CRUD for in-app announcement popups with
 * realtime sync, page targeting, audience filters, schedule, frequency, and
 * impression / dismissal / CTR analytics aggregated from announcement_popup_views.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, Eye, BarChart3, Upload, X, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

/** Small image input that supports both pasting a URL and uploading a file to the admin-notifications bucket. */
function PopupImageInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">(value && /^https?:\/\//.test(value) ? "url" : "upload");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `popups/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("admin-notifications").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("admin-notifications").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-300">{label}</Label>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-0.5 rounded ${mode === "upload" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded ${mode === "url" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            URL
          </button>
        </div>
      </div>

      {mode === "url" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="bg-zinc-900 border-zinc-800 text-zinc-100"
        />
      ) : value ? (
        <div className="relative rounded-md border border-zinc-800 bg-zinc-900 p-2">
          <img src={value} alt={label} className="w-full h-28 object-contain rounded" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-zinc-950/80 rounded-full p-1 text-zinc-300 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-1 border border-dashed border-zinc-700 rounded-md py-6 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Click to upload image"}
          <span className="text-[10px] text-zinc-600">PNG, JPG, WebP · max 5MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}

interface Popup {
  id: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  secondary_image_url: string | null;
  pages: string[];
  audience: any;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  dismissible: boolean;
  frequency: "once" | "session" | "always";
  created_at: string;
  updated_at: string;
}

interface ViewStats {
  popup_id: string;
  impressions: number;
  dismissals: number;
  clicks: number;
}

const KNOWN_PAGES = [
  { label: "Everywhere (*)", value: "*" },
  { label: "Dashboard (/dashboard)", value: "/dashboard" },
  { label: "Canvas (/canvas/*)", value: "/canvas/*" },
  { label: "Cosmo (/cosmo/*)", value: "/cosmo/*" },
  { label: "Think (/think)", value: "/think" },
  { label: "Companion (/talent/*)", value: "/talent/*" },
  { label: "Brands (/brands/*)", value: "/brands/*" },
  { label: "Settings (/settings)", value: "/settings" },
];

const emptyPopup = (): Partial<Popup> => ({
  title: "",
  body: "",
  cta_label: "",
  cta_url: "",
  image_url: "",
  secondary_image_url: "",
  pages: ["*"],
  audience: {},
  priority: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
  dismissible: true,
  frequency: "once",
});

export const PopupsManagementTab = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [stats, setStats] = useState<Record<string, ViewStats>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Popup> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcement_popups")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Failed to load popups: ${error.message}`);
      setLoading(false);
      return;
    }
    setPopups((data as Popup[]) ?? []);

    // Aggregate analytics
    const ids = (data ?? []).map((p: any) => p.id);
    if (ids.length > 0) {
      const { data: viewRows } = await supabase
        .from("announcement_popup_views")
        .select("popup_id, dismissed, cta_clicked")
        .in("popup_id", ids);

      const agg: Record<string, ViewStats> = {};
      ids.forEach((id) => {
        agg[id] = { popup_id: id, impressions: 0, dismissals: 0, clicks: 0 };
      });
      (viewRows ?? []).forEach((v: any) => {
        const row = agg[v.popup_id];
        if (!row) return;
        row.impressions += 1;
        if (v.dismissed) row.dismissals += 1;
        if (v.cta_clicked) row.clicks += 1;
      });
      setStats(agg);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin_popups_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_popups" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_popup_views" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast.error("Title is required");
      return;
    }

    const { id, created_at, updated_at, ...payload } = editing as any;

    if (id) {
      const { error } = await supabase
        .from("announcement_popups")
        .update(payload)
        .eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Popup updated");
    } else {
      const { error } = await supabase
        .from("announcement_popups")
        .insert([{ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id }]);
      if (error) return toast.error(error.message);
      toast.success("Popup created");
    }
    setEditing(null);
  };

  const remove = async (popup: Popup) => {
    if (!confirm(`Delete "${popup.title}"? This is permanent.`)) return;
    const { error } = await supabase.from("announcement_popups").delete().eq("id", popup.id);
    if (error) return toast.error(error.message);
    toast.success("Popup deleted");
  };

  const clone = (popup: Popup) => {
    const { id, created_at, updated_at, ...rest } = popup;
    setEditing({ ...rest, title: `${popup.title} (copy)`, is_active: false });
  };

  const toggleActive = async (popup: Popup) => {
    await supabase
      .from("announcement_popups")
      .update({ is_active: !popup.is_active })
      .eq("id", popup.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-zinc-50">Popups</h2>
          <p className="text-sm text-zinc-400">Page-targeted announcements shown to users in-app.</p>
        </div>
        <Button onClick={() => setEditing(emptyPopup())} className="gap-2 bg-zinc-50 text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> New popup
        </Button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm py-12 text-center">Loading…</div>
      ) : popups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500">
          No popups yet. Click <span className="text-zinc-300">New popup</span> to create your first announcement.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {popups.map((p) => {
            const s = stats[p.id] ?? { impressions: 0, dismissals: 0, clicks: 0 };
            const ctr = s.impressions ? Math.round((s.clicks / s.impressions) * 100) : 0;
            return (
              <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-medium text-zinc-50 truncate">{p.title}</h3>
                      {p.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                      ) : (
                        <Badge className="bg-zinc-700 text-zinc-300 border-zinc-600">Paused</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{p.body || "No body"}</p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {p.pages.map((pg) => (
                    <Badge key={pg} className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      {pg}
                    </Badge>
                  ))}
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] capitalize">
                    {p.frequency}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Impressions</div>
                    <div className="text-lg font-medium text-zinc-100 inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-zinc-500" /> {s.impressions}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Dismissed</div>
                    <div className="text-lg font-medium text-zinc-100">{s.dismissals}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">CTR</div>
                    <div className="text-lg font-medium text-zinc-100 inline-flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-zinc-500" /> {ctr}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => clone(p)} className="text-zinc-400 hover:text-zinc-100">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)} className="text-zinc-400 hover:text-zinc-100">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100">
          <SheetHeader>
            <SheetTitle className="text-zinc-50">{editing?.id ? "Edit popup" : "New popup"}</SheetTitle>
            <SheetDescription className="text-zinc-500">
              Page-scoped announcement that appears in the app.
            </SheetDescription>
          </SheetHeader>

          {editing && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-zinc-300">Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  placeholder="GPT-image 2 Now Live…"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Body</Label>
                <Textarea
                  value={editing.body ?? ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[120px]"
                  placeholder="Upgrade to unlock the all-new…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300">CTA label</Label>
                  <Input
                    value={editing.cta_label ?? ""}
                    onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                    placeholder="Get 45% OFF"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">CTA URL</Label>
                  <Input
                    value={editing.cta_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                    placeholder="/pricing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PopupImageInput
                  label="Header image"
                  value={editing.image_url ?? ""}
                  onChange={(url) => setEditing({ ...editing, image_url: url })}
                />
                <PopupImageInput
                  label="Secondary image"
                  value={editing.secondary_image_url ?? ""}
                  onChange={(url) => setEditing({ ...editing, secondary_image_url: url })}
                />
              </div>

              <div>
                <Label className="text-zinc-300">Pages (one per line, e.g. /dashboard or /canvas/*)</Label>
                <Textarea
                  value={(editing.pages ?? ["*"]).join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      pages: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs min-h-[80px]"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {KNOWN_PAGES.map((kp) => (
                    <button
                      key={kp.value}
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          pages: Array.from(new Set([...(editing.pages ?? []), kp.value])),
                        })
                      }
                      className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    >
                      + {kp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300">Frequency</Label>
                  <Select
                    value={editing.frequency ?? "once"}
                    onValueChange={(v: any) => setEditing({ ...editing, frequency: v })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="once">Once per user</SelectItem>
                      <SelectItem value="session">Once per session</SelectItem>
                      <SelectItem value="always">Always</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300">Priority</Label>
                  <Input
                    type="number"
                    value={editing.priority ?? 0}
                    onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value || "0", 10) })}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300">Starts at (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={editing.starts_at ? new Date(editing.starts_at).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Ends at (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={editing.ends_at ? new Date(editing.ends_at).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div>
                  <div className="text-sm text-zinc-200">Active</div>
                  <div className="text-xs text-zinc-500">Whether this popup is eligible to be shown.</div>
                </div>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div>
                  <div className="text-sm text-zinc-200">Dismissible</div>
                  <div className="text-xs text-zinc-500">Show a close button.</div>
                </div>
                <Switch
                  checked={editing.dismissible ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, dismissible: v })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button variant="ghost" onClick={() => setEditing(null)} className="text-zinc-300">
                  Cancel
                </Button>
                <Button onClick={save} className="bg-zinc-50 text-zinc-900 hover:bg-zinc-200">
                  {editing.id ? "Save changes" : "Create popup"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
