import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Lightbulb, AlertTriangle, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  extracted: any;
  recommendations?: string[];
  assumptions?: string[];
  concerns?: string[];
  attachments?: any[];
  confidence?: number;
  readyToCurate?: boolean;
  variant?: 'sidebar' | 'inline';
  defaultOpen?: boolean;
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    <div className="text-zinc-900 text-sm font-medium leading-tight mt-0.5">{value}</div>
  </div>
);

const Ring = ({ pct }: { pct: number }) => {
  const stroke = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-9 h-9 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none" stroke={stroke}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      <span className="text-[10px] font-semibold text-zinc-900 relative">{pct}%</span>
    </div>
  );
};

export const UnderstandingPanel = ({
  extracted,
  recommendations = [],
  assumptions = [],
  concerns = [],
  attachments = [],
  confidence = 0,
  readyToCurate = false,
  variant = 'sidebar',
  defaultOpen = false,
}: Props) => {
  const pct = Math.round((confidence ?? 0) * 100);
  const [open, setOpen] = useState(defaultOpen);

  // ===== Inline (composer-attached) variant =====
  if (variant === 'inline') {
    if (!open) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-3 hover:border-zinc-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Ring pct={pct} />
            <span className="text-sm text-zinc-700">What we understand</span>
          </div>
          <span className="text-sm text-zinc-900 hover:text-zinc-600 transition-colors">
            Expand
          </span>
        </button>
      );
    }
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Ring pct={pct} />
            <span className="text-sm text-zinc-500">What we understand</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-sm text-zinc-900 px-3 py-1 rounded-full hover:bg-zinc-100"
          >
            Collapse
          </button>
        </div>

        {!extracted ? (
          <div className="text-sm text-zinc-400 italic">Tell me about your project — I'll fill this in as we talk.</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {extracted.project_type && <Field label="Project" value={extracted.project_type} />}
            {extracted.goals?.length > 0 && <Field label="Goals" value={extracted.goals.join(', ')} />}
            {extracted.deliverables?.length > 0 && <Field label="Deliverables" value={extracted.deliverables.join(', ')} />}
            {typeof extracted.complexity === 'number' && <Field label="Complexity" value={`${extracted.complexity}/5`} />}
            {typeof extracted.urgency === 'number' && <Field label="Urgency" value={`${extracted.urgency}/5`} />}
            {extracted.audience && <Field label="Audience" value={extracted.audience} />}
            {extracted.style_direction && <Field label="Style" value={extracted.style_direction} />}
            {extracted.budget_hint && <Field label="Budget" value={extracted.budget_hint} />}
            {extracted.timeline_hint && <Field label="Timeline" value={extracted.timeline_hint} />}
          </div>
        )}

        {(recommendations.length > 0 || assumptions.length > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.length > 0 && (
              <div className="rounded-xl border border-zinc-200 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700">RUMI recommends</div>
                </div>
                <ul className="space-y-1.5">
                  {recommendations.slice(0, 4).map((r, i) => (
                    <li key={i} className="text-xs text-zinc-700 leading-snug">{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {assumptions.length > 0 && (
              <div className="rounded-xl border border-zinc-200 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Assumed</div>
                </div>
                <ul className="space-y-1 text-xs text-zinc-600">
                  {assumptions.slice(0, 4).map((a, i) => <li key={i}>· {a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {concerns.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-200 p-3.5 bg-red-50/30">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Concerns</div>
            </div>
            <ul className="space-y-1 text-xs text-zinc-700">
              {concerns.map((c, i) => <li key={i}>· {c}</li>)}
            </ul>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500">References:</span>
            {attachments.map((a, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 truncate max-w-[140px]" title={a.name}>
                {a.name}
              </span>
            ))}
          </div>
        )}

        {readyToCurate && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-900 text-white text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Ready to assemble your team.
          </div>
        )}
      </div>
    );
  }

  // ===== Sidebar (legacy) variant =====
  return (
    <aside className="hidden lg:block w-[340px] flex-shrink-0">
      <div className="sticky top-[88px]">
        <Card className="rounded-2xl border-zinc-200 bg-white p-5 shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-zinc-900">What we understand</div>
              <div className="text-[11px] text-zinc-500">Live brief</div>
            </div>
            <Ring pct={pct} />
          </div>

          {!extracted && (
            <div className="text-sm text-zinc-400 italic">Tell me about your project — I'll fill this in as we talk.</div>
          )}

          {extracted && (
            <div className="space-y-3">
              {extracted.project_type && <Field label="Project" value={extracted.project_type} />}
              {extracted.deliverables?.length > 0 && <Field label="Deliverables" value={extracted.deliverables.join(', ')} />}
              {extracted.audience && <Field label="Audience" value={extracted.audience} />}
              {extracted.goals?.length > 0 && <Field label="Goals" value={extracted.goals.join(', ')} />}
              {extracted.style_direction && <Field label="Style" value={extracted.style_direction} />}
              {extracted.budget_hint && <Field label="Budget" value={extracted.budget_hint} />}
              {extracted.timeline_hint && <Field label="Timeline" value={extracted.timeline_hint} />}
              {typeof extracted.complexity === 'number' && <Field label="Complexity" value={`${extracted.complexity}/5`} />}
              {typeof extracted.urgency === 'number' && <Field label="Urgency" value={`${extracted.urgency}/5`} />}
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">RUMI recommends</div>
              </div>
              <ul className="space-y-1.5">
                {recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-zinc-700 leading-snug">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {assumptions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Assumed</div>
              </div>
              <ul className="space-y-1 text-xs text-zinc-600">
                {assumptions.map((a, i) => <li key={i}>· {a}</li>)}
              </ul>
            </div>
          )}

          {concerns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700">Concerns</div>
              </div>
              <ul className="space-y-1 text-xs text-zinc-600">
                {concerns.map((c, i) => <li key={i}>· {c}</li>)}
              </ul>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Paperclip className="w-3.5 h-3.5 text-zinc-700" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">References ({attachments.length})</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 truncate max-w-[140px]" title={a.name}>
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {readyToCurate && (
            <div className={cn("mt-5 p-3 rounded-xl bg-zinc-900 text-white text-xs flex items-center gap-2")}>
              <CheckCircle2 className="w-4 h-4" /> Ready to assemble your team.
            </div>
          )}
        </Card>
      </div>
    </aside>
  );
};
