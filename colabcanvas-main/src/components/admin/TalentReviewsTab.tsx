import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X, ExternalLink, RefreshCw, UserCheck, UserX, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "pending" | "in_review" | "approved" | "rejected";

interface Freelancer {
  id: string;
  user_id: string;
  domain: string[];
  role_level: string | null;
  tools: string[];
  portfolio_urls: string[];
  availability: string | null;
  vetting_status: Status;
  evaluation_submission: any;
  quality_score: number | null;
  communication_score: number | null;
  created_at: string;
  updated_at: string;
  profile: { id: string; email: string; full_name: string | null; created_at: string } | null;
}

const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  in_review: "bg-blue-100 text-blue-900 border-blue-200",
  approved: "bg-emerald-100 text-emerald-900 border-emerald-200",
  rejected: "bg-rose-100 text-rose-900 border-rose-200",
};

export const TalentReviewsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rows, setRows] = useState<Freelancer[]>([]);
  const [tab, setTab] = useState<Status | "all">("in_review");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, { q: string; c: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-freelancers");
      if (error) throw error;
      setRows((data as any)?.freelancers ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return rows
      .filter(r => tab === "all" ? true : r.vetting_status === tab)
      .filter(r => !s ? true : (r.profile?.email?.toLowerCase().includes(s) || r.profile?.full_name?.toLowerCase().includes(s) || r.domain?.join(" ").toLowerCase().includes(s)));
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, in_review: 0, approved: 0, rejected: 0, all: rows.length };
    rows.forEach(r => { c[r.vetting_status] = (c[r.vetting_status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const setStatus = async (f: Freelancer, status: Status) => {
    setBusy(f.id);
    try {
      const note = notes[f.id]?.trim() || undefined;
      const sc = scores[f.id];
      const quality_score = sc?.q ? Number(sc.q) : undefined;
      const communication_score = sc?.c ? Number(sc.c) : undefined;
      const { error } = await supabase.functions.invoke("admin-set-freelancer-status", {
        body: { user_id: f.user_id, vetting_status: status, note, quality_score, communication_score },
      });
      if (error) throw error;
      toast({ title: `Marked ${status}`, description: f.profile?.email ?? f.user_id });
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Talent reviews</h2>
          <p className="text-sm text-zinc-500">Approve, reject or request more info from creative applicants.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="in_review"><Clock className="w-3.5 h-3.5 mr-1" />Under review ({counts.in_review ?? 0})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending ?? 0})</TabsTrigger>
          <TabsTrigger value="approved"><UserCheck className="w-3.5 h-3.5 mr-1" />Approved ({counts.approved ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected"><UserX className="w-3.5 h-3.5 mr-1" />Rejected ({counts.rejected ?? 0})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all ?? 0})</TabsTrigger>
        </TabsList>

        <div className="my-3">
          <Input placeholder="Search by name, email, or craft…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <TabsContent value={tab} forceMount>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-zinc-500">No freelancers in this bucket.</Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(f => (
                <Card key={f.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-zinc-900">{f.profile?.full_name || "—"}</div>
                        <span className="text-xs text-zinc-500">{f.profile?.email}</span>
                        <Badge className={STATUS_BADGE[f.vetting_status]} variant="outline">{f.vetting_status.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {f.role_level || "—"} · {f.availability || "—"} · applied {new Date(f.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {(f.quality_score != null || f.communication_score != null) && (
                      <div className="text-xs text-zinc-600 flex items-center gap-3">
                        <span><Star className="w-3 h-3 inline -mt-0.5 mr-0.5" />Quality: {f.quality_score ?? "—"}/10</span>
                        <span>Communication: {f.communication_score ?? "—"}/10</span>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Craft</div>
                      <div className="flex flex-wrap gap-1 mt-1">{(f.domain ?? []).map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Tools</div>
                      <div className="flex flex-wrap gap-1 mt-1">{(f.tools ?? []).map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Portfolio</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {(f.portfolio_urls ?? []).slice(0, 4).map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline truncate inline-flex items-center gap-1">
                            {u} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                        {(f.portfolio_urls ?? []).length === 0 && <span className="text-xs text-zinc-400">—</span>}
                      </div>
                    </div>
                  </div>

                  {f.evaluation_submission?.case && (
                    <div className="mt-3 p-3 bg-zinc-50 rounded text-xs text-zinc-700 whitespace-pre-wrap">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Evaluation</div>
                      {f.evaluation_submission.case}
                    </div>
                  )}

                  {Array.isArray(f.evaluation_submission?.admin_notes) && f.evaluation_submission.admin_notes.length > 0 && (
                    <div className="mt-2 text-xs text-zinc-500">
                      Last admin note: {f.evaluation_submission.admin_notes[f.evaluation_submission.admin_notes.length - 1].note}
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-2 mt-3">
                    <Input
                      placeholder="Quality score 1-10"
                      type="number" min={1} max={10}
                      value={scores[f.id]?.q ?? ""}
                      onChange={e => setScores(s => ({ ...s, [f.id]: { ...(s[f.id] ?? { q: "", c: "" }), q: e.target.value } }))}
                    />
                    <Input
                      placeholder="Communication score 1-10"
                      type="number" min={1} max={10}
                      value={scores[f.id]?.c ?? ""}
                      onChange={e => setScores(s => ({ ...s, [f.id]: { ...(s[f.id] ?? { q: "", c: "" }), c: e.target.value } }))}
                    />
                    <Textarea
                      placeholder="Internal note (optional)"
                      rows={1}
                      value={notes[f.id] ?? ""}
                      onChange={e => setNotes(n => ({ ...n, [f.id]: e.target.value }))}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 justify-end">
                    <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => setStatus(f, "in_review")}>
                      Mark under review
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => setStatus(f, "rejected")}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" disabled={busy === f.id} onClick={() => setStatus(f, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                      {busy === f.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />} Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
