import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Globe, Search, FileText, Sparkles, Check, ExternalLink, Wrench, Eye, ListChecks, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { SourcePreview } from './SourcePreview';
import ReactMarkdown from 'react-markdown';

export interface ActivitySource {
  title: string;
  url: string;
  favicon?: string;
  snippet?: string;
}

export interface ActivityStep {
  step: 'thinking' | 'researching' | 'source_found' | 'analyzing' | 'generating' | 'agent_plan' | 'agent_thought_summary' | 'agent_tool_call' | 'agent_observation' | 'agent_quality_check';
  message: string;
  source?: ActivitySource;
  sources?: ActivitySource[];
  sourceCount?: number;
  timestamp: number;
  complete?: boolean;
  /** Extended payload for transparent agent events. */
  data?: {
    plan?: string[];
    thought?: string;
    tool?: string;
    purpose?: string;
    observation?: string;
    [key: string]: unknown;
  };
}

interface ActivityFeedProps {
  steps: ActivityStep[];
  streamingContent: string;
  isComplete: boolean;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  thinking: Brain,
  researching: Globe,
  source_found: Search,
  analyzing: FileText,
  generating: Sparkles,
  agent_plan: ListChecks,
  agent_thought_summary: MessageSquare,
  agent_tool_call: Wrench,
  agent_observation: Eye,
  agent_quality_check: Check,
};

const STEP_LABELS: Record<string, string> = {
  thinking: 'Thinking',
  researching: 'Researching',
  source_found: 'Source Found',
  analyzing: 'Analyzing',
  generating: 'Generating',
  agent_plan: 'Plan',
  agent_thought_summary: 'Thought',
  agent_tool_call: 'Tool Call',
  agent_observation: 'Observation',
  agent_quality_check: 'Quality Check',
};

export function ActivityFeed({ steps, streamingContent, isComplete }: ActivityFeedProps) {
  const [previewSource, setPreviewSource] = useState<ActivitySource | null>(null);
  
  // Collect all found sources
  const allSources = steps
    .filter(s => s.step === 'source_found' && s.source)
    .map(s => s.source!);

  // Agent reasoning events (plan/thought/tool/observation/quality) accumulate
  // as a transparent timeline. Pipeline steps (thinking/researching/etc.) replace.
  const AGENT_EVENT_TYPES = new Set([
    'agent_plan', 'agent_thought_summary', 'agent_tool_call', 'agent_observation', 'agent_quality_check',
  ]);

  const displaySteps = steps.reduce<ActivityStep[]>((acc, step) => {
    if (step.step === 'source_found') return acc; // shown as cards
    if (AGENT_EVENT_TYPES.has(step.step)) {
      acc.push(step); // accumulate every agent event
      return acc;
    }
    const existingIdx = acc.findIndex(s => s.step === step.step);
    if (existingIdx >= 0) acc[existingIdx] = step;
    else acc.push(step);
    return acc;
  }, []);

  // Mark completed steps
  const stepOrder = ['thinking', 'researching', 'analyzing', 'generating'];
  const latestStepIdx = Math.max(...displaySteps.filter(s => stepOrder.includes(s.step)).map(s => stepOrder.indexOf(s.step)), -1);

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {displaySteps.map((step, idx) => {
          const Icon = STEP_ICONS[step.step] || Brain;
          const isAgentEvent = AGENT_EVENT_TYPES.has(step.step);
          const stepIdx = stepOrder.indexOf(step.step);
          const isPipelineStep = stepIdx >= 0;
          const isDone = (isPipelineStep && stepIdx < latestStepIdx) || isComplete;
          const isCurrent = isPipelineStep && stepIdx === latestStepIdx && !isComplete;
          const key = isAgentEvent ? `${step.step}-${step.timestamp}-${idx}` : step.step;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                "flex items-start gap-2 text-sm transition-all duration-300",
                isDone && !isAgentEvent && "opacity-60"
              )}
            >
              {/* Step status indicator */}
              <div className="shrink-0 mt-1.5">
                {isAgentEvent ? (
                  <Icon className="w-3 h-3 text-primary/80" />
                ) : isDone ? (
                  <Check className="w-3 h-3 text-primary" />
                ) : (
                  <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-medium text-xs",
                    isCurrent || isAgentEvent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {STEP_LABELS[step.step]}
                  </span>
                  {step.data?.tool && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                      {step.data.tool}
                    </span>
                  )}
                  {isCurrent && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </div>
                <p className={cn(
                  "text-xs mt-0.5",
                  isAgentEvent ? "text-foreground/80" : "text-muted-foreground truncate"
                )}>
                  {step.message}
                </p>

                {/* Agent plan: numbered checklist */}
                {step.step === 'agent_plan' && Array.isArray(step.data?.plan) && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {step.data!.plan!.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary/60 mt-0.5">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Agent thought / observation / tool purpose */}
                {(step.data?.thought || step.data?.observation || step.data?.purpose) && (
                  <p className="text-xs text-muted-foreground italic mt-1 leading-relaxed">
                    {step.data?.thought || step.data?.observation || step.data?.purpose}
                  </p>
                )}

                {/* Source cards appear after researching step */}
                {step.step === 'researching' && allSources.length > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-1.5 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {allSources.map((source, sIdx) => (
                      <motion.button
                        key={source.url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: sIdx * 0.1, duration: 0.2 }}
                        onClick={() => setPreviewSource(source)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                          "bg-muted/80 hover:bg-muted border border-border/50",
                          "text-xs text-foreground/80 hover:text-foreground",
                          "transition-colors cursor-pointer max-w-[200px]"
                        )}
                      >
                        <img
                          src={source.favicon || `https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                          alt=""
                          className="w-3.5 h-3.5 rounded-sm shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="truncate">{source.title || new URL(source.url).hostname}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Streaming content */}
      {streamingContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 prose prose-sm max-w-none dark:prose-invert text-sm"
        >
          <ReactMarkdown>{streamingContent}</ReactMarkdown>
          {!isComplete && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-primary/70 ml-0.5 -mb-0.5"
            />
          )}
        </motion.div>
      )}

      {/* Source preview overlay */}
      <AnimatePresence>
        {previewSource && (
          <SourcePreview 
            source={previewSource} 
            onClose={() => setPreviewSource(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
