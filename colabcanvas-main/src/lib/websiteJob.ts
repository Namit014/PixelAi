/**
 * Centralized website job detection and pipeline metadata helpers.
 * Used across Think.tsx, ThinkWorkspacePanel, CreativeIntelligenceMode, InlineAgentPipeline.
 */

export type ExecutionMode = 'website_only' | 'full_campaign';
export type JobType = 'website' | 'campaign';

export interface MinimalJob {
  id?: string;
  objective?: Record<string, unknown> | null;
  checkpoint?: Record<string, unknown> | null;
  state?: string;
}

const WEBSITE_KEYWORDS = [
  'landing page',
  'landing-page',
  'website',
  'waitlist page',
  'sales page',
  'launch page',
  'web page',
  'site',
];

/** Returns true if a job is a website / landing-page generation job. */
export function isWebsiteJob(job: MinimalJob | null | undefined): boolean {
  if (!job) return false;
  const objective = (job.objective || {}) as Record<string, unknown>;
  const checkpoint = (job.checkpoint || {}) as Record<string, unknown>;

  // Explicit metadata wins
  if ((objective as any).jobType === 'website') return true;
  if ((objective as any).executionMode === 'website_only') return true;
  if ((objective as any).websitePreferences) return true;

  // Checkpoint evidence
  if ((checkpoint as any).websiteResult) return true;

  // Loose keyword match in goal — last resort
  const goal = String((objective as any).goal || '').toLowerCase();
  if (goal && WEBSITE_KEYWORDS.some(k => goal.includes(k))) return true;

  return false;
}

/** Pipeline state ordering for the *short* website-only fast path. */
export const WEBSITE_ONLY_PIPELINE = [
  'QUEUED',
  'BRAND_RESOLUTION',
  'STRATEGY_BUILD',
  'WEBSITE_GENERATION',
  'COMPLETE',
] as const;

/** Pipeline state ordering for the full creative campaign. */
export const FULL_PIPELINE = [
  'QUEUED',
  'BRAND_RESOLUTION',
  'MARKET_RESEARCH',
  'COMPETITIVE_ANALYSIS',
  'STRATEGY_BUILD',
  'ASSET_PLANNING',
  'WEBSITE_GENERATION',
  'PROJECT_CREATION',
  'ASSET_GENERATION',
  'VALIDATION',
  'SCORING',
  'COMPLETE',
] as const;

export const WEBSITE_PIPELINE_ETA_SEC = 180; // 3 minutes
export const FULL_PIPELINE_ETA_SEC = 540; // 9 minutes

export function getJobPipeline(job: MinimalJob | null | undefined): readonly string[] {
  return isWebsiteJob(job) ? WEBSITE_ONLY_PIPELINE : FULL_PIPELINE;
}

export function getJobETASec(job: MinimalJob | null | undefined): number {
  return isWebsiteJob(job) ? WEBSITE_PIPELINE_ETA_SEC : FULL_PIPELINE_ETA_SEC;
}

/** Returns 0-100 progress based on the job's actual pipeline (not the global state list). */
export function getPipelineProgress(job: MinimalJob | null | undefined): number {
  if (!job?.state) return 0;
  if (job.state === 'COMPLETE') return 100;
  if (job.state === 'FAILED' || job.state === 'CANCELLED') return 0;
  const pipeline = getJobPipeline(job);
  const idx = pipeline.indexOf(job.state as any);
  if (idx <= 0) return 5;
  // Map idx → progress, leaving 100% for COMPLETE
  return Math.min(95, Math.round((idx / (pipeline.length - 1)) * 100));
}

/** Build the standard /site-preview URL for a job. Always uses jobId first. */
export function buildSitePreviewUrl(opts: {
  jobId?: string | null;
  projectId?: string | null;
  agentMode?: boolean;
  brandParams?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.jobId) params.set('jobId', opts.jobId);
  if (opts.projectId) params.set('projectId', opts.projectId);
  if (opts.agentMode) params.set('agentMode', 'true');
  const base = `/site-preview?${params.toString()}`;
  return opts.brandParams ? `${base}${opts.brandParams.startsWith('&') ? opts.brandParams : `&${opts.brandParams}`}` : base;
}

/** Add explicit website metadata to an objective before submission. */
export function tagWebsiteObjective<T extends Record<string, unknown>>(objective: T): T {
  return {
    ...objective,
    jobType: 'website' as JobType,
    executionMode: 'website_only' as ExecutionMode,
  };
}
