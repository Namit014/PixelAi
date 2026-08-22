import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Clock, ChevronDown, ChevronRight, Square,
  ExternalLink, Loader2, Wrench, AlertTriangle,
  Brain, Eye, ListChecks, MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAgentActionExecutor, type AgentAction } from '@/hooks/useAgentActionExecutor';
import {
  type AutonomousJob, type JobLog, type JobState,
  JOB_STATES, getStateProgress, getStateLabel,
} from '@/hooks/useAutonomousJobs';
import { StepSummary, type PipelineStep, PIPELINE_STEPS, getStepBadge } from './PipelineStepSummary';

interface InlineAgentPipelineProps {
  activeJob: AutonomousJob;
  jobLogs: JobLog[];
  onCancel: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onViewFullReport: () => void;
  onOpenProject: (projectId: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  generate_asset: 'Generating image...',
  analyze_brand: 'Analyzing brand...',
  chat_designer: 'Chatting with AI Designer...',
  research: 'Researching...',
  refine_design: 'Refining design...',
  export_asset: 'Exporting asset...',
  apply_brand: 'Applying brand system...',
  canvas_operation: 'Working on canvas...',
  agent_plan: 'Agent plan',
  agent_thought_summary: 'Agent thought',
  agent_tool_call: 'Calling tool',
  agent_observation: 'Observation',
  agent_quality_check: 'Quality check',
};

function getActionLabel(action: AgentAction): string {
  const data = action.action_data as any;
  if (data?.step) return data.step;
  return ACTION_LABELS[action.action_type] || action.action_type.replace(/_/g, ' ');
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function AgentActionsFeed({ actions }: { actions: AgentAction[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5 px-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Wrench className="h-3 w-3" /> Agent Tool Use — {actions.length} step{actions.length !== 1 ? 's' : ''}
      </span>
      {actions.slice(-8).map((action) => {
        const isExpanded = expandedId === action.id;
        const isDone = action.status === 'done';
        const isFailed = action.status === 'failed';
        const isRunning = action.status === 'executing';
        const data = action.action_data as any;
        const resultData = action.result_data as any;

        const AGENT_ICONS: Record<string, typeof Wrench> = {
          agent_plan: ListChecks,
          agent_thought_summary: MessageSquare,
          agent_tool_call: Wrench,
          agent_observation: Eye,
          agent_quality_check: Check,
        };
        const AgentIcon = AGENT_ICONS[action.action_type];

        return (
          <div key={action.id} className="rounded-md border border-border/50 bg-muted/30 overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : action.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-muted/50 transition-colors"
            >
              {AgentIcon ? (
                <AgentIcon className="h-3 w-3 text-primary/70 shrink-0" />
              ) : isRunning ? (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
              ) : isFailed ? (
                <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
              ) : (
                <Check className="h-3 w-3 text-green-500 shrink-0" />
              )}
              <span className={cn(
                "truncate flex-1 text-left",
                isRunning ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {getActionLabel(action)}
              </span>
              {data?.tool && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-mono shrink-0">
                  {data.tool}
                </span>
              )}
              {action.action_type === 'generate_asset' && data?.assetIndex != null && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {data.assetIndex + 1}/{data.totalAssets}
                </span>
              )}
              {isDone && action.updated_at && (
                <span className="text-[9px] text-muted-foreground/60 shrink-0">
                  {formatDuration(action.created_at, action.updated_at)}
                </span>
              )}
              <ChevronRight className={cn("h-3 w-3 text-muted-foreground/40 shrink-0 transition-transform", isExpanded && "rotate-90")} />
            </button>

            {/* Inline transparent agent payload (always visible for agent_* events) */}
            {AgentIcon && (data?.plan || data?.thought || data?.observation || data?.purpose) && (
              <div className="px-2 pb-2 pt-0.5 -mt-1 text-[10px] space-y-1">
                {Array.isArray(data?.plan) && (
                  <ul className="space-y-0.5 pl-4">
                    {data.plan.slice(0, 6).map((item: string, i: number) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary/50">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(data?.thought || data?.observation || data?.purpose) && (
                  <p className="text-muted-foreground italic pl-4 leading-relaxed">
                    {data?.thought || data?.observation || data?.purpose}
                  </p>
                )}
              </div>
            )}

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-2 space-y-1.5 border-t border-border/30">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 pt-1.5">
                      <span>⏱ {formatTime(action.created_at)}</span>
                      <span>Type: {action.action_type}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                        isDone && "bg-green-500/10 text-green-600",
                        isFailed && "bg-destructive/10 text-destructive",
                        isRunning && "bg-primary/10 text-primary"
                      )}>
                        {action.status}
                      </span>
                    </div>
                    {isFailed && action.error_message && (
                      <div className="text-[10px] text-destructive bg-destructive/5 rounded p-1.5">
                        {action.error_message}
                      </div>
                    )}
                    {resultData && (
                      <div className="text-[10px] text-muted-foreground">
                        {resultData.imageUrl && (
                          <img src={resultData.imageUrl} alt="Result" className="w-16 h-16 object-cover rounded mt-1" />
                        )}
                        {resultData.text && (
                          <p className="truncate">{resultData.text}</p>
                        )}
                      </div>
                    )}
                    <details className="text-[10px]">
                      <summary className="text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">Raw data</summary>
                      <pre className="mt-1 p-1.5 bg-muted/50 rounded text-[9px] text-muted-foreground overflow-x-auto max-h-32 overflow-y-auto">
                        {JSON.stringify(action.action_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}


function useElapsedTime(startedAt: string | null, isStopped: boolean) {
  const [elapsed, setElapsed] = React.useState('00:00');
  const [elapsedSec, setElapsedSec] = React.useState(0);
  React.useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
      setElapsedSec(diff);
    };
    tick();
    if (isStopped) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, isStopped]);
  return { elapsed, elapsedSec };
}

/** Detect if the pipeline is a website-only fast path */
import { isWebsiteJob, getJobPipeline, getJobETASec, getPipelineProgress } from '@/lib/websiteJob';

function isWebsiteOnlyJob(job: AutonomousJob): boolean {
  return isWebsiteJob(job);
}

function getETALabel(elapsedSec: number, etaTotalSec: number): string {
  const remaining = Math.max(0, etaTotalSec - elapsedSec);
  if (remaining <= 0) return 'Almost done...';
  if (remaining < 60) return `~${remaining}s remaining`;
  const m = Math.ceil(remaining / 60);
  return `~${m} min remaining`;
}

/** Detect stalled state: same state for >90s with no new logs */
function useStallDetection(job: AutonomousJob, logs: JobLog[]): boolean {
  const [stalled, setStalled] = React.useState(false);
  const lastStateRef = React.useRef(job.state);
  const lastStateTimeRef = React.useRef(Date.now());
  const lastLogCountRef = React.useRef(logs.length);

  React.useEffect(() => {
    if (job.state !== lastStateRef.current || logs.length !== lastLogCountRef.current) {
      lastStateRef.current = job.state;
      lastStateTimeRef.current = Date.now();
      lastLogCountRef.current = logs.length;
      setStalled(false);
    }
    const id = setInterval(() => {
      const elapsed = Date.now() - lastStateTimeRef.current;
      if (elapsed > 90_000 && job.state !== 'COMPLETE' && job.state !== 'FAILED' && job.state !== 'CANCELLED') {
        setStalled(true);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [job.state, logs.length]);

  return stalled;
}

/** Explicit step ↔ agent name mapping */
const STEP_AGENT_MAP: Record<string, string[]> = {
  BRAND_RESOLUTION: ['Brand Context Agent'],
  MARKET_RESEARCH: ['Market Research Agent'],
  COMPETITIVE_ANALYSIS: ['Competitive Analysis Agent'],
  STRATEGY_BUILD: ['Strategy Agent'],
  ASSET_PLANNING: ['Asset Structuring Agent'],
  WEBSITE_GENERATION: ['Website Experience Agent'],
  ASSET_GENERATION: ['Creative Director'],
  VALIDATION: ['Brand Guardrail Agent'],
  SCORING: ['Performance Prediction Agent'],
};

/** Filter logs relevant to a specific pipeline step */
function getLogsForStep(step: PipelineStep, allLogs: JobLog[]): JobLog[] {
  const agentNames = STEP_AGENT_MAP[step.state] || [];
  return allLogs.filter(log => {
    const name = log.agent_name || '';
    // Exact match on known agent names first
    if (agentNames.some(a => name === a)) return true;
    // Fallback: loose matching
    const lower = name.toLowerCase();
    const stepLower = step.state.toLowerCase().replace(/_/g, '');
    const keyLower = step.checkpointKey.toLowerCase();
    return lower.includes(stepLower) || lower.includes(keyLower);
  }).slice(-6);
}

/** Try multiple key variations to find checkpoint data for a step, with fallbacks from job-level fields and logs */
function resolveCheckpointData(
  checkpoint: Record<string, any>,
  checkpointKey: string,
  jobFallbacks?: { strategyOutput?: Record<string, any>; assetMatrix?: unknown[]; scoringOutput?: Record<string, any> },
  logs?: JobLog[],
): any {
  if (checkpoint[checkpointKey]) return checkpoint[checkpointKey];
  // Try snake_case version: brandDNA -> brand_dna
  const snakeKey = checkpointKey.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (checkpoint[snakeKey]) return checkpoint[snakeKey];
  // Try common alternative keys
  const altMap: Record<string, string[]> = {
    brandDNA: ['brand_dna', 'brand_system', 'brand_resolution', 'brand'],
    marketResearch: ['market_research', 'research'],
    competitiveAnalysis: ['competitive_analysis', 'competition'],
    strategy: ['strategy_build', 'campaign_strategy'],
    assetList: ['asset_list', 'asset_planning', 'assets_planned'],
    generatedAssets: ['generated_assets', 'assets', 'asset_generation'],
    validationResult: ['validation_result', 'validation', 'brand_validation'],
    scoring: ['performance_scoring', 'scores', 'score'],
  };
  for (const alt of (altMap[checkpointKey] || [])) {
    if (checkpoint[alt]) return checkpoint[alt];
  }
  // Fallback to job-level fields
  if (jobFallbacks) {
    if (checkpointKey === 'strategy' && jobFallbacks.strategyOutput && Object.keys(jobFallbacks.strategyOutput).length > 0) {
      return jobFallbacks.strategyOutput;
    }
    if (checkpointKey === 'assetList' && jobFallbacks.assetMatrix && (jobFallbacks.assetMatrix as any[]).length > 0) {
      return jobFallbacks.assetMatrix;
    }
    if (checkpointKey === 'scoring' && jobFallbacks.scoringOutput && Object.keys(jobFallbacks.scoringOutput).length > 0) {
      return jobFallbacks.scoringOutput;
    }
  }
  // Fallback: extract structured data from agent logs
  if (logs && logs.length > 0) {
    const agentNames = STEP_AGENT_MAP[checkpointKey === 'brandDNA' ? 'BRAND_RESOLUTION' :
      checkpointKey === 'marketResearch' ? 'MARKET_RESEARCH' :
      checkpointKey === 'competitiveAnalysis' ? 'COMPETITIVE_ANALYSIS' :
      checkpointKey === 'strategy' ? 'STRATEGY_BUILD' :
      checkpointKey === 'assetList' ? 'ASSET_PLANNING' :
      checkpointKey === 'generatedAssets' ? 'ASSET_GENERATION' :
      checkpointKey === 'validationResult' ? 'VALIDATION' :
      checkpointKey === 'scoring' ? 'SCORING' : ''] || [];
    
    const relevantLog = logs.filter(l => agentNames.some(a => l.agent_name === a) && l.output_summary).pop();
    if (relevantLog?.output_summary) {
      // Return a log-derived summary object for rendering
      return { _fromLogs: true, summary: relevantLog.output_summary, agent: relevantLog.agent_name, timestamp: relevantLog.created_at };
    }
  }
  return null;
}

export function InlineAgentPipeline({
  activeJob,
  jobLogs,
  onCancel,
  onResume,
  onViewFullReport,
  onOpenProject,
}: InlineAgentPipelineProps) {
  const [focusedStep, setFocusedStep] = React.useState<string | null>(null);
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = React.useState<string | null>(null);

  // Transparent agent actions
  const { actions: agentActions, currentAction } = useAgentActionExecutor(activeJob.id);

  const isRunning = activeJob.state !== 'COMPLETE' && activeJob.state !== 'FAILED' && activeJob.state !== 'CANCELLED';
  const isComplete = activeJob.state === 'COMPLETE';
  const isFailed = activeJob.state === 'FAILED';
  const isCancelled = activeJob.state === 'CANCELLED';
  const { elapsed, elapsedSec } = useElapsedTime(activeJob.started_at, !isRunning);
  const isWebOnly = isWebsiteOnlyJob(activeJob);
  const etaTotalSec = getJobETASec(activeJob);
  const progressPct = isRunning ? getPipelineProgress(activeJob) : (isComplete ? 100 : 0);
  const isStalled = useStallDetection(activeJob, jobLogs);
  const checkpoint = (activeJob.checkpoint || {}) as Record<string, any>;
  const strategyOutput = (activeJob.strategy_output || {}) as Record<string, any>;
  const assetMatrix = (activeJob.asset_matrix || []) as unknown[];
  const scoringOutput = (activeJob.scoring_output || {}) as Record<string, any>;
  const jobFallbacks = { strategyOutput, assetMatrix, scoringOutput };
  const objectiveGoal = (activeJob.objective as any)?.goal || 'Creative Campaign';

  const currentIdx = JOB_STATES.indexOf(activeJob.state as any);

  const activeStep = PIPELINE_STEPS.find(s => s.state === activeJob.state);

  const completedSteps = PIPELINE_STEPS.filter(s => {
    const sIdx = JOB_STATES.indexOf(s.state as any);
    return sIdx < currentIdx || isComplete;
  });

  // Card stack ordering
  const stackCards = React.useMemo(() => {
    if (focusedStep) {
      const focused = completedSteps.find(s => s.state === focusedStep);
      if (focused) {
        const others = completedSteps.filter(s => s.state !== focusedStep);
        return {
          topCard: { ...focused, status: 'focused' as const },
          activeCard: activeStep && isRunning ? { ...activeStep, status: 'active-behind' as const, depth: 1 } : null,
          stackedCards: others.slice(-3).reverse().map((s, i) => ({ ...s, depth: i + 2 })),
        };
      }
    }
    return {
      topCard: activeStep && isRunning ? { ...activeStep, status: 'active' as const } : null,
      activeCard: null,
      stackedCards: completedSteps.slice(-4).reverse().map((s, i) => ({ ...s, depth: i + 1 })),
    };
  }, [focusedStep, completedSteps, activeStep, isRunning]);

  const topCardState = stackCards.topCard?.state;
  const isTopExpanded = expandedCard === topCardState;

  // ─── COMPLETED/FAILED STATE ───
  if (!isRunning) {
    return (
      <div className="w-full max-w-2xl mx-auto pt-8 pb-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {isComplete ? 'Execution Complete' : isCancelled ? 'Execution Cancelled' : 'Execution Failed'}
          </h2>
          {isFailed && activeJob.error_message && (
            <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-1.5 max-w-md mx-auto">{activeJob.error_message}</p>
          )}
          <p className="text-sm text-muted-foreground truncate max-w-md mx-auto">{objectiveGoal}</p>
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-sm font-mono">{elapsed}</span>
          </div>
        </div>

        <div className="space-y-2">
          {PIPELINE_STEPS.map((step) => {
            const data = resolveCheckpointData(checkpoint, step.checkpointKey, jobFallbacks, jobLogs);
            const badge = getStepBadge(step.checkpointKey, data);
            const isExpanded = expandedCard === step.state;
            const StepIcon = step.icon;
            const sIdx = JOB_STATES.indexOf(step.state as any);
            const wasCompleted = sIdx < currentIdx || isComplete;
            if (!wasCompleted) return null;

            const stepLogs = getLogsForStep(step, jobLogs);

            return (
              <div key={step.state} className="rounded-xl border border-border bg-card">
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : step.state)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", step.activeColor)}>
                    <StepIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{step.completedLabel}</span>
                  {badge && (
                    <span className="border border-border text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">{badge}</span>
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-1 ml-11 space-y-3">
                        <StepSummary stepKey={step.checkpointKey} data={data} />
                        {stepLogs.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Activity</span>
                            {stepLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 text-[11px]">
                                <span className="text-muted-foreground shrink-0 w-12">
                                  {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                                <span className="text-foreground/80 truncate">{log.output_summary || log.agent_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          {isFailed && (
            <Button variant="outline" size="sm" onClick={() => onResume(activeJob.id)} className="gap-1.5 h-8 text-xs">Retry</Button>
          )}
          {isComplete && activeJob.project_id && (
            <Button size="sm" onClick={() => onOpenProject(activeJob.project_id!)} className="gap-1.5 h-8 text-xs">
              <ExternalLink className="h-3 w-3" /> Open Project
            </Button>
          )}
          {!isComplete && !isFailed && <div />}
          <button onClick={onViewFullReport} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
        </div>
      </div>
    );
  }

  // ─── RUNNING STATE: Card Stack + Expandable Steps Below ───
  return (
    <div className="w-full max-w-2xl mx-auto py-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          {isWebOnly ? 'Building Landing Page' : 'Executing Autonomously'}
        </h2>
        <p className="text-sm text-muted-foreground truncate max-w-md mx-auto">{objectiveGoal}</p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-mono">{elapsed}</span>
          <span className="text-[11px] text-muted-foreground/70">• {getETALabel(elapsedSec, etaTotalSec)}</span>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Progress value={progressPct} className="w-48 h-1.5" />
          <span className="text-[10px] font-mono text-muted-foreground">{progressPct}%</span>
        </div>
        <p className="text-xs text-muted-foreground/80">{getStateLabel(activeJob.state)}</p>
        {isStalled && (
          <div className="flex items-center justify-center gap-1.5 text-amber-600 text-xs mt-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>This is taking longer than expected</span>
            <button onClick={() => onResume(activeJob.id)} className="underline font-medium ml-1">Retry</button>
          </div>
        )}
      </div>

      {/* Floating Card Stack */}
      <div className="relative mx-auto max-w-sm" style={{ minHeight: isTopExpanded ? 'auto' : 120 }}>
        {/* Stacked cards behind */}
        {stackCards.stackedCards.map((step) => {
          const depth = step.depth;
          const isHovered = hoveredStep === step.state;
          const StepIcon = step.icon;
          const badge = getStepBadge(step.checkpointKey, resolveCheckpointData(checkpoint, step.checkpointKey, jobFallbacks, jobLogs));

          return (
            <motion.div
              key={step.state}
            className="absolute inset-x-0 top-0 rounded-2xl border border-border bg-card shadow-md px-4 py-3 cursor-pointer overflow-hidden"
              initial={{ scale: 1, opacity: 1, y: 0 }}
              animate={{
                scale: 1 - depth * 0.04,
                opacity: Math.max(0.3, 0.8 - depth * 0.15),
                y: isHovered ? -(depth * 10) - 20 : -(depth * 10),
              }}
              whileHover={{ opacity: 0.95 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              style={{ zIndex: 10 - depth }}
              onMouseEnter={() => setHoveredStep(step.state)}
              onMouseLeave={() => setHoveredStep(null)}
              onClick={() => { setFocusedStep(step.state); setExpandedCard(step.state); }}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", step.activeColor)}>
                  <StepIcon className="h-4 w-4 text-white" />
                </div>
                {/* Only show label on first stacked card, hide text on deeper cards to prevent bleed */}
                <span className={cn("text-sm font-medium text-muted-foreground flex-1", depth > 1 && "opacity-0")}>{step.completedLabel}</span>
                {badge && depth <= 1 && (
                  <span className="border border-border text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">{badge}</span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Active-behind card (when a completed card is focused) */}
        {stackCards.activeCard && activeStep && (
          <motion.div
            className="absolute inset-x-0 top-0 rounded-2xl border border-border bg-card shadow-md px-4 py-3 cursor-pointer"
            animate={{ scale: 0.96, opacity: 0.6, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ zIndex: 9 }}
            onClick={() => { setFocusedStep(null); setExpandedCard(null); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <activeStep.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{activeStep.label}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-400 text-[10px] font-medium text-emerald-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
          </motion.div>
        )}

        {/* Top card */}
        {stackCards.topCard && (
          <AnimatePresence mode="wait">
            <motion.div
              key={stackCards.topCard.state}
              className="relative rounded-2xl border border-border bg-card shadow-xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              style={{ zIndex: 20 }}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedCard(isTopExpanded ? null : topCardState!)}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  stackCards.topCard.status === 'active' ? 'bg-blue-500' : stackCards.topCard.activeColor
                )}>
                  <stackCards.topCard.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {stackCards.topCard.status === 'active' ? stackCards.topCard.label : stackCards.topCard.completedLabel}
                    </span>
                    {stackCards.topCard.status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-400 text-[10px] font-medium text-emerald-500">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                </div>
                {(() => {
                  const badge = getStepBadge(stackCards.topCard.checkpointKey, resolveCheckpointData(checkpoint, stackCards.topCard.checkpointKey, jobFallbacks, jobLogs));
                  return badge ? (
                    <span className="border border-border text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">{badge}</span>
                  ) : null;
                })()}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0", isTopExpanded && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isTopExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 ml-12 space-y-3">
                      {resolveCheckpointData(checkpoint, stackCards.topCard.checkpointKey, jobFallbacks, jobLogs) && (
                        <StepSummary stepKey={stackCards.topCard.checkpointKey} data={resolveCheckpointData(checkpoint, stackCards.topCard.checkpointKey, jobFallbacks, jobLogs)} />
                      )}
                      {/* Per-card activity logs */}
                      {(() => {
                        const topStep = PIPELINE_STEPS.find(s => s.state === stackCards.topCard!.state);
                        const stepLogs = topStep ? getLogsForStep(topStep, jobLogs) : [];
                        if (stepLogs.length === 0) return null;
                        return (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              {stackCards.topCard!.status === 'active' ? 'Live Activity' : 'Activity'}
                            </span>
                            {stepLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 text-[11px]">
                                <span className="text-muted-foreground shrink-0 w-12">
                                  {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                                <span className="text-foreground/80 truncate">{log.output_summary || log.agent_name}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {focusedStep && (
                <div className="px-4 pb-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setFocusedStep(null); setExpandedCard(null); }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to live view
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Expandable Completed Steps Below Stack */}
      {completedSteps.length > 0 && (
        <div className="space-y-2">
          {completedSteps.map((step) => {
            const data = resolveCheckpointData(checkpoint, step.checkpointKey, jobFallbacks, jobLogs);
            const badge = getStepBadge(step.checkpointKey, data);
            const isExpanded = expandedCard === `below-${step.state}`;
            const StepIcon = step.icon;
            const stepLogs = getLogsForStep(step, jobLogs);

            return (
              <div key={step.state} className="rounded-xl border border-border bg-card">
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : `below-${step.state}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", step.activeColor)}>
                    <StepIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{step.completedLabel}</span>
                  {badge && (
                    <span className="border border-border text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">{badge}</span>
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-1 ml-11 space-y-3">
                        <StepSummary stepKey={step.checkpointKey} data={data} />
                        {stepLogs.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Activity</span>
                            {stepLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 text-[11px]">
                                <span className="text-muted-foreground shrink-0 w-12">
                                  {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                                <span className="text-foreground/80 truncate">{log.output_summary || log.agent_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Transparent Agent Actions Feed */}
      {agentActions.length > 0 && (
        <AgentActionsFeed actions={agentActions} />
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => onCancel(activeJob.id)} className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors">
          <Square className="h-2.5 w-2.5 fill-current" /> Cancel
        </button>
        <button onClick={onViewFullReport} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
      </div>
    </div>
  );
}
