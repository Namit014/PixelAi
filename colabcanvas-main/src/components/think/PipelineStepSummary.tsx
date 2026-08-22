import React from 'react';
import {
  Palette, Search, Swords, Target, LayoutGrid, Paintbrush,
  ShieldCheck, BarChart3, ExternalLink, Quote, Type,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PipelineStep {
  state: string;
  label: string;
  completedLabel: string;
  icon: React.ElementType;
  checkpointKey: string;
  activeColor: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { state: 'BRAND_RESOLUTION', label: 'Brand DNA', completedLabel: 'Brand DNA Resolved', icon: Palette, checkpointKey: 'brandDNA', activeColor: 'bg-violet-500' },
  { state: 'MARKET_RESEARCH', label: 'Market Research', completedLabel: 'Market Research', icon: Search, checkpointKey: 'marketResearch', activeColor: 'bg-emerald-500' },
  { state: 'COMPETITIVE_ANALYSIS', label: 'Competitive Analysis', completedLabel: 'Competitive Analysis', icon: Swords, checkpointKey: 'competitiveAnalysis', activeColor: 'bg-orange-500' },
  { state: 'STRATEGY_BUILD', label: 'Strategy', completedLabel: 'Strategy Built', icon: Target, checkpointKey: 'strategy', activeColor: 'bg-rose-500' },
  { state: 'ASSET_PLANNING', label: 'Asset Matrix', completedLabel: 'Asset Matrix', icon: LayoutGrid, checkpointKey: 'assetList', activeColor: 'bg-sky-500' },
  { state: 'WEBSITE_GENERATION', label: 'Website', completedLabel: 'Website Built', icon: Globe, checkpointKey: 'websiteResult', activeColor: 'bg-cyan-500' },
  { state: 'ASSET_GENERATION', label: 'Assets', completedLabel: 'Assets Generated', icon: Paintbrush, checkpointKey: 'generatedAssets', activeColor: 'bg-amber-500' },
  { state: 'VALIDATION', label: 'Brand Validation', completedLabel: 'Brand Validation', icon: ShieldCheck, checkpointKey: 'validationResult', activeColor: 'bg-teal-500' },
  { state: 'SCORING', label: 'Performance Scoring', completedLabel: 'Performance Scoring', icon: BarChart3, checkpointKey: 'scoring', activeColor: 'bg-indigo-500' },
];

export function getStepBadge(checkpointKey: string, data: any): string | null {
  if (!data) return null;
  switch (checkpointKey) {
    case 'marketResearch': {
      const sources = data.research_sources || [];
      return sources.length > 0 ? `${sources.length} Sources` : null;
    }
    case 'competitiveAnalysis': {
      const comps = data.competitors || [];
      return comps.length > 0 ? `${comps.length} Competitors` : null;
    }
    case 'assetList':
      return Array.isArray(data) && data.length > 0 ? `${data.length} Assets` : null;
    case 'websiteResult':
      return data?.sectionCount ? `${data.sectionCount} Sections` : Array.isArray(data?.siteData?.sections) ? `${data.siteData.sections.length} Sections` : null;
    case 'generatedAssets':
      return Array.isArray(data) && data.length > 0 ? `${data.length} Assets` : null;
    default:
      return null;
  }
}

/* ─── Shared UI primitives ─── */

function SectionCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2", className)}>
      {title && <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</div>}
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", className)}>
      {children}
    </span>
  );
}

function ColorSwatch({ hex, name }: { hex: string; name?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-md border border-border shrink-0 shadow-sm" style={{ backgroundColor: hex }} />
      <div className="text-[10px]">
        {name && <span className="text-foreground font-medium">{name} </span>}
        <span className="text-muted-foreground uppercase">{hex}</span>
      </div>
    </div>
  );
}

function SourceLink({ url, title }: { url: string; title?: string }) {
  const displayUrl = url?.replace(/^https?:\/\//, '').split('/')[0] || url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium"
    >
      {title || displayUrl}
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 75 ? 'from-emerald-500 to-emerald-400' : pct >= 50 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground font-mono">{Math.round(score)}/{max}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full bg-gradient-to-r", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export function StepSummary({ stepKey, data }: { stepKey: string; data: any }) {
  if (!data) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Processing… data will appear once this step completes.
      </div>
    );
  }

  // Handle log-derived fallback data
  if (data._fromLogs) {
    return (
      <SectionCard title={data.agent}>
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{data.summary}</div>
        {data.timestamp && (
          <div className="text-[10px] text-muted-foreground">
            Completed {new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
        )}
      </SectionCard>
    );
  }

  // Generic fallback
  const renderGenericFallback = (d: any) => {
    if (!d || typeof d !== 'object') return null;
    const entries = Object.entries(d).filter(([, v]) => v != null).slice(0, 8);
    if (entries.length === 0) return null;
    return (
      <SectionCard>
        <div className="space-y-1.5 text-xs">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: </span>
              <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  };

  switch (stepKey) {
    /* ═══ BRAND DNA ═══ */
    case 'brandDNA':
      return (
        <div className="space-y-3">
          {/* Brand identity */}
          <SectionCard title="Identity">
            <div className="space-y-1.5 text-xs">
              {data.name && <div className="text-foreground font-semibold text-sm">{data.name}</div>}
              {data.industry && <Pill className="border-primary/30 text-primary bg-primary/5">{data.industry}</Pill>}
              {data.target_audience && <div><span className="text-muted-foreground">Audience: </span><span className="text-foreground">{data.target_audience}</span></div>}
              {(data.brand_voice || data.tone) && (
                <div className="flex items-center gap-1.5">
                  <Quote className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground italic text-[11px]">{data.brand_voice || data.tone}</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Colors */}
          {data.color_palette && Array.isArray(data.color_palette) && data.color_palette.length > 0 && (
            <SectionCard title="Color Palette">
              <div className="flex flex-wrap gap-3">
                {(data.color_palette as any[]).slice(0, 8).map((c: any, i: number) => {
                  const hex = typeof c === 'string' ? c : c?.hex || c?.value;
                  const name = typeof c === 'object' ? c?.name : undefined;
                  return hex ? <ColorSwatch key={i} hex={hex} name={name} /> : null;
                })}
              </div>
            </SectionCard>
          )}

          {/* Typography */}
          {data.typography && Array.isArray(data.typography) && data.typography.length > 0 && (
            <SectionCard title="Typography">
              <div className="space-y-1.5">
                {(data.typography as any[]).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground font-medium">{t.font_family || t.name}</span>
                    {t.weights && <span className="text-[10px] text-muted-foreground">[{Array.isArray(t.weights) ? t.weights.join(', ') : t.weights}]</span>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Logo */}
          {data.logo_url && (
            <SectionCard title="Logo">
              <img src={data.logo_url} alt="Brand logo" className="h-10 rounded object-contain" />
            </SectionCard>
          )}
        </div>
      );

    /* ═══ MARKET RESEARCH ═══ */
    case 'marketResearch': {
      const sources = data.research_sources || [];
      return (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">{sources.length} sources analyzed</div>
          {sources.slice(0, 6).map((s: any, i: number) => (
            <SectionCard key={i}>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-foreground font-medium leading-tight">{s.title || `Source ${i + 1}`}</span>
                </div>
                {s.url && <SourceLink url={s.url} />}
                {s.key_findings?.length > 0 && (
                  <div className="space-y-1 mt-1.5">
                    {s.key_findings.slice(0, 3).map((f: string, j: number) => (
                      <div key={j} className="flex gap-2 text-[11px]">
                        <div className="w-0.5 shrink-0 rounded-full bg-emerald-500/60 mt-1" style={{ minHeight: 12 }} />
                        <span className="text-muted-foreground leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      );
    }

    /* ═══ COMPETITIVE ANALYSIS ═══ */
    case 'competitiveAnalysis': {
      const comps = data.competitors || [];
      return (
        <div className="space-y-3">
          {comps.slice(0, 5).map((c: any, i: number) => (
            <SectionCard key={i} title={c.name}>
              {c.url && <SourceLink url={c.url} title={c.url.replace(/^https?:\/\//, '').split('/')[0]} />}
              {c.swot && (
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((q) => {
                    const colors: Record<string, string> = {
                      strengths: 'border-l-emerald-500 bg-emerald-500/5',
                      weaknesses: 'border-l-red-400 bg-red-400/5',
                      opportunities: 'border-l-sky-500 bg-sky-500/5',
                      threats: 'border-l-amber-500 bg-amber-500/5',
                    };
                    const labels: Record<string, string> = { strengths: 'S', weaknesses: 'W', opportunities: 'O', threats: 'T' };
                    const items = c.swot[q];
                    if (!items?.length) return null;
                    return (
                      <div key={q} className={cn("rounded-md border-l-2 p-2 space-y-0.5", colors[q])}>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{labels[q]}</div>
                        {items.slice(0, 2).map((item: string, j: number) => (
                          <div key={j} className="text-[10px] text-foreground leading-snug">{item}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          ))}
          {data.own_swot && (
            <SectionCard title="Your Brand SWOT">
              <div className="grid grid-cols-2 gap-1.5">
                {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map((q) => {
                  const colors: Record<string, string> = {
                    strengths: 'border-l-emerald-500 bg-emerald-500/5',
                    weaknesses: 'border-l-red-400 bg-red-400/5',
                    opportunities: 'border-l-sky-500 bg-sky-500/5',
                    threats: 'border-l-amber-500 bg-amber-500/5',
                  };
                  const labels: Record<string, string> = { strengths: 'S', weaknesses: 'W', opportunities: 'O', threats: 'T' };
                  const items = data.own_swot[q];
                  if (!items?.length) return null;
                  return (
                    <div key={q} className={cn("rounded-md border-l-2 p-2 space-y-0.5", colors[q])}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{labels[q]}</div>
                      {items.slice(0, 2).map((item: string, j: number) => (
                        <div key={j} className="text-[10px] text-foreground leading-snug">{item}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          {data.competitive_positioning && (
            <div className="text-[11px] text-muted-foreground italic px-1">{data.competitive_positioning}</div>
          )}
        </div>
      );
    }

    /* ═══ STRATEGY ═══ */
    case 'strategy':
      return (
        <div className="space-y-3">
          {data.objective_tree?.primary_goal && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Goal</div>
              <div className="text-xs text-foreground font-medium">{data.objective_tree.primary_goal}</div>
            </div>
          )}

          {data.content_pillars?.length > 0 && (
            <SectionCard title="Content Pillars">
              <div className="flex flex-wrap gap-1.5">
                {data.content_pillars.map((p: string, i: number) => (
                  <Pill key={i} className="border-primary/20 text-foreground bg-primary/5">{p}</Pill>
                ))}
              </div>
            </SectionCard>
          )}

          {data.messaging_hierarchy && (
            <SectionCard title="Messaging">
              <div className="space-y-2">
                {data.messaging_hierarchy.headline_theme && (
                  <div className="flex gap-2">
                    <div className="w-0.5 shrink-0 rounded-full bg-rose-500/60" style={{ minHeight: 16 }} />
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Headline</div>
                      <div className="text-xs text-foreground">{data.messaging_hierarchy.headline_theme}</div>
                    </div>
                  </div>
                )}
                {data.messaging_hierarchy.cta_direction && (
                  <div className="flex gap-2">
                    <div className="w-0.5 shrink-0 rounded-full bg-sky-500/60" style={{ minHeight: 16 }} />
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">CTA Direction</div>
                      <div className="text-xs text-foreground">{data.messaging_hierarchy.cta_direction}</div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {data.emotional_direction && (
            <SectionCard title="Tone">
              <div className="text-xs text-foreground">{data.emotional_direction}</div>
            </SectionCard>
          )}

          {data.market_insights?.length > 0 && (
            <SectionCard title="Market Insights">
              <div className="space-y-1">
                {data.market_insights.slice(0, 4).map((m: string, i: number) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <div className="w-0.5 shrink-0 rounded-full bg-amber-500/60 mt-0.5" style={{ minHeight: 12 }} />
                    <span className="text-muted-foreground">{m}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      );

    /* ═══ ASSET MATRIX ═══ */
    case 'websiteResult':
      return (
        <div className="space-y-3">
          {data?.siteData?.siteTitle && (
            <SectionCard title="Website">
              <div className="text-sm font-medium text-foreground">{data.siteData.siteTitle}</div>
              {data?.siteData?.metaDescription && (
                <p className="text-xs text-muted-foreground mt-1">{data.siteData.metaDescription}</p>
              )}
            </SectionCard>
          )}
          {Array.isArray(data?.siteData?.sections) && data.siteData.sections.length > 0 && (
            <SectionCard title="Sections">
              <div className="flex flex-wrap gap-1.5">
                {data.siteData.sections.map((section: any, index: number) => (
                  <Pill key={`${section.type || 'section'}-${index}`} className="border-primary/20 text-foreground bg-primary/5">
                    {section.type || `section-${index + 1}`}
                  </Pill>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      );

    case 'assetList':
      return (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{Array.isArray(data) ? data.length : 0} assets planned</div>
          {Array.isArray(data) && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {data.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                  <span className="text-xs text-foreground font-medium flex-1">{a.asset_type || 'Asset'}</span>
                  {a.platform && <Pill className="border-sky-500/20 text-sky-600 bg-sky-500/5">{a.platform}</Pill>}
                  {a.dimensions && <Pill className="border-border text-muted-foreground bg-muted/50">{a.dimensions.width}×{a.dimensions.height}</Pill>}
                  <Pill className={cn(
                    a.priority === 'high' ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' :
                    a.priority === 'medium' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' :
                    'border-border text-muted-foreground bg-muted/50'
                  )}>
                    {a.priority || 'normal'}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    /* ═══ GENERATED ASSETS ═══ */
    case 'generatedAssets': {
      const assets = Array.isArray(data) ? data : [];
      const placed = assets.filter((a: any) => a.canvas_placed).length;
      return (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Pill className="border-emerald-500/20 text-emerald-600 bg-emerald-500/5">{placed} Placed</Pill>
            <Pill className="border-border text-muted-foreground">{assets.length} Total</Pill>
          </div>
          {assets.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {assets.slice(0, 9).map((a: any, i: number) => (
                <div key={i} className="relative group">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.asset_type} className="w-full aspect-square rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">
                      {a.content_type === 'document' ? '📄' : a.content_type === 'cosmo_presentation' ? '📊' : '—'}
                    </div>
                  )}
                  <div className={cn(
                    "absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                    a.canvas_placed ? "bg-emerald-500" : a.error ? "bg-red-500" : "bg-muted-foreground/50"
                  )}>
                    {a.canvas_placed ? '✓' : a.error ? '✗' : '·'}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate mt-1">{a.asset_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    /* ═══ VALIDATION ═══ */
    case 'validationResult': {
      const s = data.summary || {};
      const results = data.results || [];
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-center">
              <div className="text-lg font-bold text-emerald-600">{s.passed || 0}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Passed</div>
            </div>
            <div className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-center">
              <div className="text-lg font-bold text-amber-600">{s.corrected || 0}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Corrected</div>
            </div>
            <div className="flex-1 rounded-lg border border-red-400/20 bg-red-400/5 p-2 text-center">
              <div className="text-lg font-bold text-red-500">{s.flagged || 0}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Flagged</div>
            </div>
          </div>
          {results.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.slice(0, 8).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[11px] rounded-md px-2 py-1.5 bg-muted/30">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0",
                    r.status === 'pass' ? 'bg-emerald-500' : r.status === 'corrected' ? 'bg-amber-500' : 'bg-red-400'
                  )}>
                    {r.status === 'pass' ? '✓' : r.status === 'corrected' ? '⚠' : '✗'}
                  </span>
                  <span className="text-foreground font-medium flex-1 truncate">{r.asset_type || `Asset ${i + 1}`}</span>
                  {r.issue && <span className="text-muted-foreground text-[10px] truncate max-w-[40%]">{r.issue}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    /* ═══ SCORING ═══ */
    case 'scoring': {
      const avg = data.summary?.avg_score;
      const scores = data.per_asset_scores || data.scores || [];
      return (
        <div className="space-y-3">
          {avg != null && (
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-foreground font-mono">{Math.round(avg)}</div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</div>
                <div className="text-xs text-muted-foreground">out of 100</div>
              </div>
            </div>
          )}
          {Array.isArray(scores) && scores.length > 0 && (
            <SectionCard title="Per-Asset Scores">
              <div className="space-y-2.5">
                {scores.slice(0, 8).map((s: any, i: number) => (
                  <ScoreBar key={i} label={s.asset_type || `Asset ${i + 1}`} score={s.score || 0} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      );
    }

    default:
      return renderGenericFallback(data);
  }
}
