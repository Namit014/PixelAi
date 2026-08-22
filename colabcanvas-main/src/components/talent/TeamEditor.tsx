import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Role {
  role: string;
  seniority: string;
  count: number;
  hours: number;
  hourly_rate: number;
  rationale?: string;
}

interface Props {
  roles: Role[];
  teamComposition: any;
  timeline: any;
  pricing: any;
  controls: any;
  projectId?: string;
  onUpdated: (next: { team_composition: any; timeline: any; pricing: any; controls: any }) => void;
}

const SENIORITIES = ['Junior', 'Mid', 'Senior', 'Lead'];
const ROLE_LIBRARY = ['Designer', 'Illustrator', 'Motion Designer', 'Copywriter', 'Strategist', 'Art Director', 'Producer', 'Photographer', 'Developer'];
const RATE_BY_LEVEL: Record<string, number> = { Junior: 60, Mid: 95, Senior: 140, Lead: 180 };

export const TeamEditor = ({ roles, teamComposition, timeline, pricing, controls, projectId, onUpdated }: Props) => {
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const recost = async (nextRoles: Role[]) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-recost', {
        body: {
          team_composition: { ...teamComposition, roles: nextRoles },
          timeline,
          pricing,
          controls: controls ?? {},
        },
      });
      if (error) throw error;
      onUpdated(data as any);

      // Auto re-curate to assign real freelancers to any new roles.
      if (projectId && (data as any)?.team_composition) {
        supabase.functions
          .invoke('talent-curate-team', {
            body: { project_id: projectId, team_composition: (data as any).team_composition },
          })
          .then(({ data: curated, error: cErr }) => {
            if (cErr || !curated) return;
            onUpdated({ ...(data as any), team_composition: (curated as any).team_composition ?? (data as any).team_composition });
          })
          .catch(() => {});
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Recost failed');
    } finally {
      setBusy(false);
    }
  };

  const updateRole = (i: number, patch: Partial<Role>) => {
    const next = roles.map((r, idx) => idx === i ? { ...r, ...patch, hourly_rate: patch.seniority ? RATE_BY_LEVEL[patch.seniority] : r.hourly_rate } : r);
    recost(next);
  };
  const removeRole = (i: number) => recost(roles.filter((_, idx) => idx !== i));
  const addRole = (roleName: string) => {
    const next: Role = { role: roleName, seniority: 'Mid', count: 1, hours: 40, hourly_rate: RATE_BY_LEVEL.Mid, rationale: 'Added by client' };
    recost([...roles, next]);
    setShowAdd(false);
  };

  return (
    <div className="space-y-2">
      {roles.map((r, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={r.seniority}
                onChange={e => updateRole(i, { seniority: e.target.value })}
                disabled={busy}
                className="text-xs px-2 py-1 rounded bg-white border border-zinc-300"
              >
                {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-sm font-medium text-zinc-900">{r.role}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => updateRole(i, { count: Math.max(1, r.count - 1) })} disabled={busy} className="w-6 h-6 rounded border border-zinc-300 bg-white hover:bg-zinc-100"><Minus className="w-3 h-3 mx-auto" /></button>
                <span className="text-xs font-medium w-6 text-center">{r.count}</span>
                <button onClick={() => updateRole(i, { count: r.count + 1 })} disabled={busy} className="w-6 h-6 rounded border border-zinc-300 bg-white hover:bg-zinc-100"><Plus className="w-3 h-3 mx-auto" /></button>
              </div>
              <input
                type="number"
                value={r.hours}
                onChange={e => updateRole(i, { hours: Math.max(1, parseInt(e.target.value) || 1) })}
                disabled={busy}
                className="w-16 text-xs px-2 py-1 rounded bg-white border border-zinc-300"
              />
              <span className="text-xs text-zinc-500">hrs</span>
            </div>
            {r.rationale && <div className="text-[11px] text-zinc-500 mt-1 truncate">{r.rationale}</div>}
          </div>
          <button onClick={() => removeRole(i)} disabled={busy || roles.length <= 1} className="text-zinc-400 hover:text-red-600 disabled:opacity-30">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {showAdd ? (
        <div className="p-3 rounded-lg border border-dashed border-zinc-300 bg-white">
          <div className="text-xs text-zinc-600 mb-2">Add a role</div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_LIBRARY.map(r => (
              <button key={r} onClick={() => addRole(r)} disabled={busy} className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50">
                + {r}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="mt-2">Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} disabled={busy} className="w-full">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add role
        </Button>
      )}

      {busy && <div className="text-xs text-zinc-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Recalculating…</div>}
    </div>
  );
};
