import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, Loader2, Play, Square, RotateCcw, Rocket, 
  ExternalLink, Clock, Zap, ChevronDown, ChevronUp, 
  Palette, Target, LayoutGrid, Paintbrush, ShieldCheck, BarChart3, FileText,
  Globe, Search, Eye, Image, Swords, TrendingUp, TrendingDown, Lightbulb, AlertTriangle,
  FileText as DocIcon, Presentation, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  type AutonomousJob, type JobLog, type JobState,
  JOB_STATES, getStateProgress, getStateLabel 
} from '@/hooks/useAutonomousJobs';
import { ResourceViewer } from './ResourceViewer';
import RumiBlackIcon from '@/assets/icons/rumi-black.svg?react';

interface AutonomousJobDashboardProps {
  activeJob: AutonomousJob;
  jobLogs: JobLog[];
  onCancel: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onOpenProject: (projectId: string) => void;
  onDismiss: () => void;
}

// ─── Sub-components ─────────────────────────────────────

function StateIcon({ state, isActive }: { state: string; isActive: boolean }) {
  if (state === 'COMPLETE') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (state === 'FAILED') return <XCircle className="h-4 w-4 text-destructive" />;
  if (isActive) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
}

function ElapsedTime({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = React.useState('');
  
  React.useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  
  if (!startedAt) return null;
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" /> {elapsed}
    </span>
  );
}

function StepCard({ title, icon: Icon, isComplete, children }: { title: string; icon: React.ElementType; isComplete: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(isComplete);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          'w-full flex items-center gap-3 p-3 rounded-t-xl border transition-all text-left',
          isComplete ? 'bg-card border-border' : 'bg-muted/20 border-border/50',
          !open && 'rounded-b-xl',
        )}>
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            isComplete ? 'bg-green-500/10' : 'bg-muted',
          )}>
            {isComplete ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
          </div>
          <span className="text-sm font-medium text-foreground flex-1">{title}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-xl p-4 bg-card space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  const display = typeof value === 'object' && value !== null && !React.isValidElement(value)
    ? JSON.stringify(value)
    : value;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-foreground flex-1">{display}</span>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label || color}</span>
    </div>
  );
}

// ─── Checkpoint Section Renderers ─────────────────────────

function BrandDNASection({ brandDNA }: { brandDNA: any }) {
  if (!brandDNA) return null;
  const colors = brandDNA.color_palette || brandDNA.brand_system?.colors || [];
  return (
    <StepCard title="Brand DNA Resolved" icon={Palette} isComplete={true}>
      <DataRow label="Brand" value={brandDNA.name} />
      <DataRow label="Industry" value={brandDNA.industry} />
      <DataRow label="Audience" value={brandDNA.target_audience} />
      <DataRow label="Voice" value={(() => {
        const v = brandDNA.brand_voice || brandDNA.tone;
        if (typeof v === 'object' && v !== null) return v.description || v.adjectives?.join(', ') || JSON.stringify(v);
        return v;
      })()} />
      {Array.isArray(colors) && colors.length > 0 && (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Colors</span>
          <div className="flex flex-wrap gap-2">
            {colors.map((c: string, i: number) => <ColorSwatch key={i} color={c} />)}
          </div>
        </div>
      )}
      {brandDNA.typography && (
        <DataRow label="Typography" value={`${brandDNA.typography.heading_font || ''} / ${brandDNA.typography.body_font || ''}`} />
      )}
    </StepCard>
  );
}

// ─── NEW: Market Research Section ─────────────────────────

function ResearchSection({ research, onViewUrl }: { research: any; onViewUrl: (url: string) => void }) {
  if (!research) return null;
  const sources = research.research_sources || [];
  const available = research.research_available;

  return (
    <StepCard title={`Market Research (${sources.length} sources)`} icon={Search} isComplete={true}>
      {!available && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700 dark:text-yellow-400">
          Web research was skipped — Firecrawl not configured. Strategy relies on AI knowledge only.
        </div>
      )}
      {sources.length > 0 && (
        <div className="space-y-3">
          {sources.map((source: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary text-xs font-medium shrink-0">
                    {i + 1}
                  </span>
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{source.title}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onViewUrl(source.url)}>
                    <Eye className="h-3 w-3" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => window.open(source.url, '_blank')}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {source.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-2">{source.snippet}</p>
              )}
              {Array.isArray(source.key_findings) && source.key_findings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Key Findings</span>
                  <ul className="space-y-0.5">
                    {source.key_findings.map((f: string, fi: number) => (
                      <li key={fi} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-muted-foreground/60 hover:text-primary truncate block font-mono"
              >
                {source.url}
              </a>
            </div>
          ))}
        </div>
      )}
      {research.queries_executed && Array.isArray(research.queries_executed) && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Queries: {research.queries_executed.join(' | ')}</span>
        </div>
      )}
    </StepCard>
  );
}

// ─── NEW: Competitive Analysis / SWOT Section ─────────────

function SwotGrid({ swot, title }: { swot: any; title: string }) {
  if (!swot) return null;
  const categories = [
    { key: 'strengths', label: 'Strengths', icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
    { key: 'weaknesses', label: 'Weaknesses', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
    { key: 'opportunities', label: 'Opportunities', icon: Lightbulb, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'threats', label: 'Threats', icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10' },
  ];
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <div className="grid grid-cols-2 gap-2">
        {categories.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className={cn('p-3 rounded-lg border border-border', bg)}>
            <div className={cn('flex items-center gap-1.5 mb-1.5', color)}>
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{label}</span>
            </div>
            <ul className="space-y-0.5">
              {(swot[key] || []).map((item: string, i: number) => (
                <li key={i} className="text-xs text-foreground">• {item}</li>
              ))}
              {(!swot[key] || swot[key].length === 0) && (
                <li className="text-xs text-muted-foreground italic">None identified</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitiveAnalysisSection({ analysis, onViewUrl }: { analysis: any; onViewUrl: (url: string) => void }) {
  if (!analysis) return null;
  const competitors = analysis.competitors || [];

  return (
    <StepCard title={`Competitive Analysis (${competitors.length} competitors)`} icon={Swords} isComplete={true}>
      {analysis.own_swot && <SwotGrid swot={analysis.own_swot} title="Your Brand SWOT" />}

      {analysis.competitive_positioning && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-3">
          <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Competitive Positioning</span>
          <p className="text-sm text-foreground mt-1">{analysis.competitive_positioning}</p>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="space-y-3 mt-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Competitors</span>
          {competitors.map((comp: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-destructive/10 text-destructive text-xs font-medium">{i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{comp.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onViewUrl(comp.url)}>
                    <Eye className="h-3 w-3" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(comp.url, '_blank')}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {comp.branding?.colors && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(comp.branding.colors).slice(0, 6).map(([k, v]) => (
                    <ColorSwatch key={k} color={v as string} label={k.replace(/([A-Z])/g, ' $1').trim()} />
                  ))}
                </div>
              )}
              <SwotGrid swot={comp.swot} title={`${comp.name} SWOT`} />
            </div>
          ))}
        </div>
      )}
    </StepCard>
  );
}

// ─── Multi-Format Generated Assets Section ────────────────

function MultiFormatGeneratedAssetsSection({ assets, onViewUrl }: { assets: any[]; onViewUrl: (url: string) => void }) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const placedCount = assets.filter(a => a.canvas_placed).length;
  const hasMultiFormat = assets.some(a => a.content_type && a.content_type !== 'visual');

  const getAssetBadge = (contentType: string) => {
    switch (contentType) {
      case 'document': return { label: 'Document', bg: 'bg-blue-500/10 text-blue-600' };
      case 'presentation': return { label: 'Slides', bg: 'bg-purple-500/10 text-purple-600' };
      case 'video': return { label: 'Video Prompt', bg: 'bg-orange-500/10 text-orange-600' };
      default: return { label: 'Image', bg: 'bg-green-500/10 text-green-600' };
    }
  };

  return (
    <StepCard title={`Generated Assets (${placedCount}/${assets.length} on canvas)`} icon={Paintbrush} isComplete={true}>
      <div className="space-y-4">
        {assets.map((asset: any, i: number) => {
          const contentType = asset.content_type || 'visual';
          const spec = asset.generated_spec;
          const badge = getAssetBadge(contentType);

          if (!spec && !asset.canvas_placed) return (
            <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
              [{contentType}] {asset.asset_type} — generation failed
            </div>
          );

          return (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{asset.asset_type} — {asset.platform}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', badge.bg)}>{badge.label}</span>
                  {asset.canvas_placed && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> On Canvas
                    </span>
                  )}
                </div>
                {asset.dimensions && <span className="text-xs text-muted-foreground">{asset.dimensions.width}×{asset.dimensions.height}</span>}
              </div>

              {asset.image_url && contentType === 'visual' && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={asset.image_url} alt={spec?.headline || asset.asset_type} className="w-full max-h-48 object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}

              {(contentType === 'document' || contentType === 'presentation') && (asset.doc_url || asset.ppt_url) && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onViewUrl(asset.doc_url || asset.ppt_url)}>
                  <Eye className="h-3 w-3" /> Preview {contentType === 'document' ? 'Document' : 'Slides'}
                </Button>
              )}

              {contentType === 'video' && spec && (
                <div className="text-xs space-y-1">
                  {spec.title && <div className="font-medium text-foreground">{spec.title}</div>}
                  {spec.duration_seconds && <div className="text-muted-foreground">Duration: {spec.duration_seconds}s</div>}
                  {spec.video_prompt && (
                    <div className="p-2 rounded bg-muted border border-border">
                      <span className="text-muted-foreground">Prompt:</span>
                      <p className="text-foreground mt-0.5">{spec.video_prompt}</p>
                    </div>
                  )}
                </div>
              )}

              {contentType === 'visual' && spec && (
                <>
                  {spec.headline && <div className="text-sm"><span className="text-muted-foreground">Headline:</span> <span className="text-foreground font-medium">{spec.headline}</span></div>}
                  {spec.cta_text && <div className="text-sm"><span className="text-muted-foreground">CTA:</span> <span className="text-foreground font-medium">{spec.cta_text}</span></div>}
                  {spec.color_map && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(spec.color_map).map(([k, v]) => (
                        <ColorSwatch key={k} color={v as string} label={k.replace(/_/g, ' ')} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </StepCard>
  );
}

function StrategySection({ strategy }: { strategy: any }) {
  if (!strategy) return null;
  return (
    <StepCard title="Strategy Built" icon={Target} isComplete={true}>
      {strategy.objective_tree?.primary_goal && (
        <DataRow label="Goal" value={strategy.objective_tree.primary_goal} />
      )}
      {strategy.messaging_hierarchy?.headline_theme && (
        <DataRow label="Headline" value={strategy.messaging_hierarchy.headline_theme} />
      )}
      {strategy.messaging_hierarchy?.cta_direction && (
        <DataRow label="CTA Direction" value={strategy.messaging_hierarchy.cta_direction} />
      )}
      {strategy.emotional_direction && (
        <DataRow label="Emotion" value={strategy.emotional_direction} />
      )}
      {Array.isArray(strategy.content_pillars) && (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Content Pillars</span>
          <div className="flex flex-wrap gap-1">
            {strategy.content_pillars.map((p: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">{p}</span>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(strategy.market_insights) && strategy.market_insights.length > 0 && (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Market Insights</span>
          <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
            {strategy.market_insights.map((m: string, i: number) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(strategy.messaging_hierarchy?.supporting_messages) && (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Supporting Messages</span>
          <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
            {strategy.messaging_hierarchy.supporting_messages.map((m: string, i: number) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </StepCard>
  );
}

function AssetMatrixSection({ assetList }: { assetList: any[] }) {
  if (!Array.isArray(assetList) || assetList.length === 0) return null;
  return (
    <StepCard title={`Asset Matrix (${assetList.length} assets)`} icon={LayoutGrid} isComplete={true}>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Platform</TableHead>
              <TableHead className="text-xs">Size</TableHead>
              <TableHead className="text-xs">Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assetList.map((a: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-medium">{a.asset_type}</TableCell>
                <TableCell className="text-xs">{a.platform}</TableCell>
                <TableCell className="text-xs">{a.dimensions ? `${a.dimensions.width}×${a.dimensions.height}` : '—'}</TableCell>
                <TableCell>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    a.priority === 'high' && 'bg-destructive/10 text-destructive',
                    a.priority === 'medium' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                    a.priority === 'low' && 'bg-muted text-muted-foreground',
                  )}>{a.priority}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </StepCard>
  );
}

function GeneratedAssetsSection({ assets }: { assets: any[] }) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const placedCount = assets.filter(a => a.canvas_placed || a.image_url).length;
  return (
    <StepCard title={`Generated Assets (${placedCount}/${assets.length} with images)`} icon={Paintbrush} isComplete={true}>
      <div className="space-y-4">
        {assets.map((asset: any, i: number) => {
          const spec = asset.generated_spec;
          if (!spec) return (
            <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
              {asset.asset_type} — generation failed
            </div>
          );
          return (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{asset.asset_type} — {asset.platform}</span>
                  {asset.canvas_placed && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
                      <Image className="h-3 w-3" /> On Canvas
                    </span>
                  )}
                </div>
                {asset.dimensions && <span className="text-xs text-muted-foreground">{asset.dimensions.width}×{asset.dimensions.height}</span>}
              </div>
              {asset.image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={asset.image_url} 
                    alt={spec.headline || asset.asset_type}
                    className="w-full max-h-48 object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
              {spec.headline && <div className="text-sm"><span className="text-muted-foreground">Headline:</span> <span className="text-foreground font-medium">{spec.headline}</span></div>}
              {spec.body_copy && <div className="text-sm"><span className="text-muted-foreground">Body:</span> <span className="text-foreground">{spec.body_copy}</span></div>}
              {spec.cta_text && <div className="text-sm"><span className="text-muted-foreground">CTA:</span> <span className="text-foreground font-medium">{spec.cta_text}</span></div>}
              {spec.image_prompt && (
                <div className="text-xs p-2 rounded bg-muted border border-border">
                  <span className="text-muted-foreground">Image Prompt:</span>
                  <p className="text-foreground mt-0.5">{spec.image_prompt}</p>
                </div>
              )}
              {spec.layout_spec && (
                <div className="text-xs text-muted-foreground">
                  Layout: {spec.layout_spec.grid} | Focal: {spec.layout_spec.focal_point}
                </div>
              )}
              {spec.color_map && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(spec.color_map).map(([k, v]) => (
                    <ColorSwatch key={k} color={v as string} label={k.replace(/_/g, ' ')} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </StepCard>
  );
}

function ValidationSection({ validation }: { validation: any }) {
  if (!validation) return null;
  const summary = validation.summary || {};
  const items = validation.corrections || validation.validated_assets || [];
  return (
    <StepCard title="Brand Validation" icon={ShieldCheck} isComplete={true}>
      <div className="grid grid-cols-3 gap-2">
        {summary.passed != null && (
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-lg font-bold text-green-600">{summary.passed}</p>
            <p className="text-[10px] text-muted-foreground">Passed</p>
          </div>
        )}
        {summary.corrected != null && (
          <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
            <p className="text-lg font-bold text-yellow-600">{summary.corrected}</p>
            <p className="text-[10px] text-muted-foreground">Corrected</p>
          </div>
        )}
        {summary.flagged != null && (
          <div className="p-2 rounded-lg bg-destructive/10 text-center">
            <p className="text-lg font-bold text-destructive">{summary.flagged}</p>
            <p className="text-[10px] text-muted-foreground">Flagged</p>
          </div>
        )}
      </div>
      {Array.isArray(items) && items.length > 0 && (
        <div className="space-y-1 mt-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                item.status === 'pass' ? 'bg-green-500' : item.status === 'corrected' ? 'bg-yellow-500' : 'bg-destructive',
              )} />
              <span className="text-foreground">{item.asset_id}</span>
              {item.corrections?.length > 0 && (
                <span className="text-muted-foreground">— {item.corrections.join(', ')}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </StepCard>
  );
}

function ScoringSection({ scoring }: { scoring: any }) {
  if (!scoring) return null;
  const scores = scoring.scores || [];
  const summary = scoring.summary || {};
  return (
    <StepCard title="Performance Scores" icon={BarChart3} isComplete={true}>
      {summary.avg_score != null && (
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{Math.round(summary.avg_score)}</p>
            <p className="text-[10px] text-muted-foreground">Avg Score</p>
          </div>
          {summary.recommendation && (
            <p className="text-sm text-foreground flex-1">{summary.recommendation}</p>
          )}
        </div>
      )}
      {scores.length > 0 && (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Asset</TableHead>
                <TableHead className="text-xs">Clarity</TableHead>
                <TableHead className="text-xs">Attention</TableHead>
                <TableHead className="text-xs">CTA</TableHead>
                <TableHead className="text-xs">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((s: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{s.asset_id}</TableCell>
                  <TableCell className="text-xs">{s.clarity_index}</TableCell>
                  <TableCell className="text-xs">{s.attention_density}</TableCell>
                  <TableCell className="text-xs">{s.cta_visibility}</TableCell>
                  <TableCell className="text-xs font-bold">{s.overall_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </StepCard>
  );
}

// ─── Live Agent Terminal ─────────────────────────────────

function LiveAgentTerminal({ logs, isRunning }: { logs: JobLog[]; isRunning: boolean }) {
  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--card))]">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs font-mono text-muted-foreground flex-1">rumi-agent-pipeline</span>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            LIVE
          </span>
        )}
      </div>
      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="max-h-52 overflow-y-auto p-3 space-y-1 font-mono text-xs"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.length === 0 && (
          <div className="text-muted-foreground/50 py-4 text-center">Waiting for agent activity...</div>
        )}
        <AnimatePresence initial={false}>
          {logs.map((log, i) => {
            const StatusIcon = log.status === 'complete' ? CheckCircle2 :
              log.status === 'failed' ? XCircle :
              log.status === 'job_created' ? Rocket : Zap;
            const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i === logs.length - 1 ? 0.1 : 0 }}
                className="flex items-start gap-2"
              >
                <span className="text-muted-foreground/50 shrink-0 select-none">{time}</span>
                <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-foreground font-semibold shrink-0">{log.agent_name}</span>
                {log.duration_ms != null && (
                  <span className="text-muted-foreground shrink-0">[{(log.duration_ms / 1000).toFixed(1)}s]</span>
                )}
                {log.confidence != null && (
                  <span className="text-primary/60 shrink-0">{Math.round(log.confidence * 100)}%</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isRunning && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-primary/60 pl-16"
          >
            ▌ processing...
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Log Timeline ─────────────────────────────────

function AgentTimeline({ logs }: { logs: JobLog[] }) {
  if (logs.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No agent activity yet...</p>;
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-border/50 last:border-0">
          <span className={cn(
            'w-2 h-2 rounded-full mt-1.5 shrink-0',
            log.status === 'complete' ? 'bg-green-500' :
            log.status === 'failed' ? 'bg-destructive' :
            log.status === 'job_created' ? 'bg-blue-500' : 'bg-primary',
          )} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{log.agent_name}</span>
              {log.confidence != null && (
                <span className="text-xs text-muted-foreground">({Math.round(log.confidence * 100)}% confidence)</span>
              )}
              {log.duration_ms != null && (
                <span className="text-xs text-muted-foreground">{(log.duration_ms / 1000).toFixed(1)}s</span>
              )}
            </div>
            {log.output_summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{log.output_summary}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────

export function AutonomousJobDashboard({
  activeJob,
  jobLogs,
  onCancel,
  onResume,
  onOpenProject,
  onDismiss,
}: AutonomousJobDashboardProps) {
  const [viewingUrl, setViewingUrl] = React.useState<string | null>(null);
  const progress = getStateProgress(activeJob.state as JobState);
  const isRunning = activeJob.state !== 'COMPLETE' && activeJob.state !== 'FAILED';
  const isComplete = activeJob.state === 'COMPLETE';
  const isFailed = activeJob.state === 'FAILED';
  const objectiveGoal = (activeJob.objective as any)?.goal || (activeJob.objective as any)?.title || 'Creative Campaign';

  // Extract checkpoint data
  const checkpoint = activeJob.checkpoint || {};
  const brandDNA = (checkpoint as any).brandDNA;
  const marketResearch = (checkpoint as any).marketResearch;
  const competitiveAnalysis = (checkpoint as any).competitiveAnalysis;
  const strategy = (checkpoint as any).strategy;
  const assetList = (checkpoint as any).assetList;
  const generatedAssets = (checkpoint as any).generatedAssets;
  const validationResult = (checkpoint as any).validationResult;
  const scoringData = (checkpoint as any).scoring || activeJob.scoring_output;

  return (
    <>
      <ScrollArea className="h-full">
        <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <RumiBlackIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {isComplete ? <><CheckCircle2 className="h-5 w-5 text-green-500" /> Campaign Ready</> : isFailed ? <><XCircle className="h-5 w-5 text-destructive" /> Execution Failed</> : <><Zap className="h-5 w-5 text-primary" /> Executing Autonomously</>}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate max-w-md">{objectiveGoal}</p>
                </div>
              </div>
              <ElapsedTime startedAt={activeJob.started_at} />
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {getStateLabel(activeJob.state as JobState)}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </motion.div>

          {/* State Pipeline */}
          <div className="grid grid-cols-5 gap-1.5">
            {JOB_STATES.filter(s => s !== 'QUEUED').map((state) => {
              const stateIdx = JOB_STATES.indexOf(state);
              const currentIdx = JOB_STATES.indexOf(activeJob.state as any);
              const isPast = stateIdx < currentIdx || activeJob.state === 'COMPLETE';
              const isCurrent = state === activeJob.state;

              return (
                <div key={state} className={cn(
                  'rounded-lg p-1.5 text-center transition-all',
                  isPast && 'bg-green-500/10 border border-green-500/20',
                  isCurrent && 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20',
                  !isPast && !isCurrent && 'bg-muted/30 border border-border',
                )}>
                  <div className="flex justify-center mb-0.5">
                    <StateIcon state={isPast ? 'COMPLETE' : isCurrent ? activeJob.state : ''} isActive={isCurrent && isRunning} />
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground leading-tight block">
                    {getStateLabel(state as JobState).replace(/^(Resolving |Building |Planning |Creating |Generating |Validating |Scoring |Researching )/, '')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ─── Live Agent Terminal ─── */}
          <LiveAgentTerminal logs={jobLogs} isRunning={isRunning} />

          {/* Error Message */}
          {isFailed && activeJob.error_message && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive font-medium">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{activeJob.error_message}</p>
            </div>
          )}

          {/* ─── Step-by-Step Execution Report ─── */}
          <div className="space-y-3">
            {brandDNA && <BrandDNASection brandDNA={brandDNA} />}
            {marketResearch && <ResearchSection research={marketResearch} onViewUrl={setViewingUrl} />}
            {competitiveAnalysis && <CompetitiveAnalysisSection analysis={competitiveAnalysis} onViewUrl={setViewingUrl} />}
            {strategy && <StrategySection strategy={strategy} />}
            {assetList && <AssetMatrixSection assetList={assetList} />}
            {generatedAssets && <MultiFormatGeneratedAssetsSection assets={generatedAssets} onViewUrl={setViewingUrl} />}
            {validationResult && <ValidationSection validation={validationResult} />}
            {scoringData && Object.keys(scoringData).length > 0 && <ScoringSection scoring={scoringData} />}
          </div>

          {/* Open Project */}
          {isComplete && activeJob.project_id && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Button onClick={() => onOpenProject(activeJob.project_id!)} className="w-full gap-2" size="lg">
                <ExternalLink className="h-4 w-4" />
                Open Project in Canvas
              </Button>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isRunning && (
              <Button variant="destructive" size="sm" onClick={() => onCancel(activeJob.id)} className="gap-1">
                <Square className="h-3 w-3" /> Cancel
              </Button>
            )}
            {isFailed && (
              <Button variant="outline" size="sm" onClick={() => onResume(activeJob.id)} className="gap-1">
                <RotateCcw className="h-3 w-3" /> Resume
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDismiss} className="ml-auto">
              {isComplete ? 'Back to Chat' : 'Dismiss'}
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* In-App Resource Viewer */}
      <ResourceViewer url={viewingUrl} onClose={() => setViewingUrl(null)} />
    </>
  );
}
