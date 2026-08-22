/**
 * WebsitesManagementTab — admin oversight for AI-generated landing pages.
 * Shows all published sites with traffic, lead counts, and lifecycle controls.
 * Includes a per-site drawer with leads analytics, visits trend, and toggles
 * for activate / deactivate / delete.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Globe,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Mail,
  TrendingUp,
  Users,
  Calendar,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Site {
  id: string;
  user_id: string;
  slug: string;
  custom_domain: string | null;
  domain_verified: boolean;
  title: string | null;
  is_active: boolean;
  visit_count: number;
  published_at: string;
  updated_at: string;
  unpublished_at: string | null;
  meta_description: string | null;
}

interface Lead {
  id: string;
  page_id: string;
  email: string | null;
  name: string | null;
  fields: any;
  source_url: string | null;
  utm: any;
  status: string;
  created_at: string;
}

interface VisitDay {
  day: string;
  count: number;
}

export const WebsitesManagementTab = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Site | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visitsByDay, setVisitsByDay] = useState<VisitDay[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    loadSites();
    const channel = supabase
      .channel("admin-websites")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "published_landing_pages" },
        () => loadSites()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("published_landing_pages")
      .select(
        "id, user_id, slug, custom_domain, domain_verified, title, is_active, visit_count, published_at, updated_at, unpublished_at, meta_description"
      )
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error(`Failed to load sites: ${error.message}`);
      setLoading(false);
      return;
    }
    setSites((data || []) as Site[]);

    // Load lead counts in parallel
    const ids = (data || []).map((s) => s.id);
    if (ids.length) {
      const { data: leadsData } = await supabase
        .from("landing_page_leads")
        .select("page_id")
        .in("page_id", ids);
      const counts: Record<string, number> = {};
      for (const row of leadsData || []) {
        counts[row.page_id] = (counts[row.page_id] || 0) + 1;
      }
      setLeadCounts(counts);
    }
    setLoading(false);
  };

  const openDrawer = async (site: Site) => {
    setSelected(site);
    setDrawerLoading(true);
    setLeads([]);
    setVisitsByDay([]);

    const [leadsRes, visitsRes] = await Promise.all([
      supabase
        .from("landing_page_leads")
        .select("*")
        .eq("page_id", site.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("landing_page_visits")
        .select("visited_at")
        .eq("page_id", site.id)
        .gte(
          "visited_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .limit(5000),
    ]);

    setLeads((leadsRes.data || []) as Lead[]);

    // Aggregate visits by day
    const byDay: Record<string, number> = {};
    for (const v of visitsRes.data || []) {
      const day = new Date(v.visited_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
    const days: VisitDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      days.push({ day: d, count: byDay[d] || 0 });
    }
    setVisitsByDay(days);
    setDrawerLoading(false);
  };

  const toggleActive = async (site: Site) => {
    const { error } = await supabase
      .from("published_landing_pages")
      .update({
        is_active: !site.is_active,
        unpublished_at: site.is_active ? new Date().toISOString() : null,
      })
      .eq("id", site.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(site.is_active ? "Site unpublished" : "Site re-published");
    loadSites();
  };

  const deleteSite = async (site: Site) => {
    if (
      !confirm(
        `Permanently delete "${site.title || site.slug}"? Leads & visits will be removed.`
      )
    )
      return;
    const { error } = await supabase
      .from("published_landing_pages")
      .delete()
      .eq("id", site.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Site deleted");
    setSelected(null);
    loadSites();
  };

  const exportLeadsCSV = () => {
    if (!leads.length) return;
    const header = ["created_at", "name", "email", "source_url", "utm", "fields"];
    const rows = leads.map((l) =>
      [
        l.created_at,
        l.name ?? "",
        l.email ?? "",
        l.source_url ?? "",
        JSON.stringify(l.utm ?? {}),
        JSON.stringify(l.fields ?? {}),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${selected?.slug || "site"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (filter === "active" && !s.is_active) return false;
      if (filter === "inactive" && s.is_active) return false;
      if (!q) return true;
      return (
        (s.title || "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.custom_domain || "").toLowerCase().includes(q)
      );
    });
  }, [sites, search, filter]);

  const stats = useMemo(() => {
    const active = sites.filter((s) => s.is_active).length;
    const totalVisits = sites.reduce((sum, s) => sum + (s.visit_count || 0), 0);
    const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
    return { active, total: sites.length, totalVisits, totalLeads };
  }, [sites, leadCounts]);

  const maxVisits = Math.max(1, ...visitsByDay.map((v) => v.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100">Websites</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Monitor every AI-generated landing page across all users.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total sites" value={stats.total} icon={<Globe className="w-4 h-4" />} />
        <StatCard label="Active" value={stats.active} icon={<Eye className="w-4 h-4" />} />
        <StatCard label="Total visits" value={stats.totalVisits.toLocaleString()} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Total leads" value={stats.totalLeads.toLocaleString()} icon={<Mail className="w-4 h-4" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search title, slug, or domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-zinc-950 border border-zinc-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Site</th>
              <th className="text-left px-4 py-3 font-medium">URL</th>
              <th className="text-left px-4 py-3 font-medium">Visits</th>
              <th className="text-left px-4 py-3 font-medium">Leads</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Published</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-500">
                  No sites match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-zinc-900 hover:bg-zinc-900/30 cursor-pointer"
                  onClick={() => openDrawer(s)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100">
                      {s.title || "Untitled"}
                    </div>
                    <div className="text-xs text-zinc-500 truncate max-w-xs">
                      {s.meta_description || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    <div className="flex items-center gap-1">
                      <code className="text-xs">/l/{s.slug}</code>
                    </div>
                    {s.custom_domain && (
                      <div className="text-xs text-zinc-500">
                        {s.custom_domain}{" "}
                        {s.domain_verified ? (
                          <Badge variant="outline" className="text-[10px] ml-1 border-emerald-700 text-emerald-400">
                            verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] ml-1 border-amber-700 text-amber-400">
                            pending
                          </Badge>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {(s.visit_count || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {leadCounts[s.id] || 0}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <Badge className="bg-emerald-900/40 text-emerald-300 border-emerald-800">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {formatDistanceToNow(new Date(s.published_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          window.open(`/l/${s.slug}`, "_blank")
                        }
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSite(s)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-zinc-950 border-zinc-800">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-zinc-100 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {selected.title || selected.slug}
                </SheetTitle>
                <SheetDescription className="text-zinc-500">
                  /l/{selected.slug}
                  {selected.custom_domain && ` • ${selected.custom_domain}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="Visits"
                    value={(selected.visit_count || 0).toLocaleString()}
                    icon={<TrendingUp className="w-4 h-4" />}
                  />
                  <StatCard
                    label="Leads"
                    value={leads.length}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <StatCard
                    label="Conv. rate"
                    value={
                      selected.visit_count
                        ? `${(
                            (leads.length / selected.visit_count) *
                            100
                          ).toFixed(1)}%`
                        : "—"
                    }
                    icon={<Users className="w-4 h-4" />}
                  />
                </div>

                {/* Visit trend */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Visits — last 30 days
                    </h4>
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {visitsByDay.map((v) => (
                      <div
                        key={v.day}
                        className="flex-1 bg-blue-500/30 hover:bg-blue-500/60 rounded-t transition-colors"
                        style={{
                          height: `${(v.count / maxVisits) * 100}%`,
                          minHeight: v.count > 0 ? "2px" : "0",
                        }}
                        title={`${v.day}: ${v.count}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Leads */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Leads ({leads.length})
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportLeadsCSV}
                      disabled={!leads.length}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      CSV
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {drawerLoading ? (
                      <div className="text-center text-zinc-500 py-8 text-sm">
                        Loading…
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="text-center text-zinc-500 py-8 text-sm">
                        No leads captured yet.
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="text-zinc-500 uppercase tracking-wider">
                          <tr className="border-b border-zinc-800">
                            <th className="text-left px-3 py-2 font-medium">When</th>
                            <th className="text-left px-3 py-2 font-medium">Name</th>
                            <th className="text-left px-3 py-2 font-medium">Email</th>
                            <th className="text-left px-3 py-2 font-medium">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.map((l) => (
                            <tr key={l.id} className="border-b border-zinc-900">
                              <td className="px-3 py-2 text-zinc-400">
                                {formatDistanceToNow(new Date(l.created_at), {
                                  addSuffix: true,
                                })}
                              </td>
                              <td className="px-3 py-2 text-zinc-200">
                                {l.name || "—"}
                              </td>
                              <td className="px-3 py-2 text-zinc-200">
                                {l.email || "—"}
                              </td>
                              <td className="px-3 py-2 text-zinc-500 truncate max-w-[140px]">
                                {l.utm?.utm_source || l.source_url || "direct"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/l/${selected.slug}`, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </Button>
                  <Button variant="outline" onClick={() => toggleActive(selected)}>
                    {selected.is_active ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Re-publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteSite(selected)}
                    className="ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
    <div className="flex items-center justify-between text-zinc-500 text-xs">
      <span>{label}</span>
      {icon}
    </div>
    <div className="mt-2 text-2xl font-semibold text-zinc-100">{value}</div>
  </div>
);
