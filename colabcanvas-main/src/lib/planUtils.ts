/**
 * Plan Display Utilities
 *
 * Central place for plan-related display logic to ensure consistency across the app.
 */

export type PlanTier =
  | 'free'
  | 'starter'
  | 'creator'
  | 'pro'
  | 'business'
  | 'enterprise';

export type ToolName = 'canvas' | 'cosmo' | 'covex' | 'cogent';
export type ToolAccess = false | 'basic' | 'limited' | 'full' | 'high' | 'unlimited';

/**
 * Get the display name for a subscription tier.
 * Free users always see "Free Plan".
 */
export function getDisplayPlanName(
  tier: string | null | undefined,
  hasActiveSubscription: boolean = false
): string {
  if (!tier || tier.toLowerCase() === 'free') return 'Free Plan';

  if (hasActiveSubscription) {
    const displayNames: Record<string, string> = {
      starter: 'Starter',
      creator: 'Creator',
      pro: 'Pro',
      business: 'Business',
      enterprise: 'Enterprise',
    };
    return displayNames[tier.toLowerCase()] || 'Free Plan';
  }

  return 'Free Plan';
}

/**
 * Monthly credit allocation per tier (matches backend `subscription_plans.credits_monthly`).
 */
export function getCreditAllocation(tier: string | null | undefined): number {
  const allocations: Record<string, number> = {
    free: 0,
    starter: 300,
    creator: 1000,
    pro: 2500,
    business: 6000,
    enterprise: 15000,
  };
  return allocations[tier?.toLowerCase() || 'free'] ?? 0;
}

/**
 * Monthly Cogent (autonomous AI) execution quota per tier.
 * -1 = unlimited.
 */
export function getCogentRunsAllocation(tier: string | null | undefined): number {
  const runs: Record<string, number> = {
    free: 0,
    starter: 0,
    creator: 0,
    pro: 5,
    business: 25,
    enterprise: -1,
  };
  return runs[tier?.toLowerCase() || 'free'] ?? 0;
}

/**
 * Tool access matrix per tier.
 */
const TOOL_ACCESS: Record<string, Record<ToolName, ToolAccess>> = {
  free:       { canvas: false,       cosmo: false,     covex: false,    cogent: false },
  starter:    { canvas: 'basic',     cosmo: 'limited', covex: false,    cogent: false },
  creator:    { canvas: 'full',      cosmo: 'full',    covex: 'basic',  cogent: false },
  pro:        { canvas: 'full',      cosmo: 'full',    covex: 'full',   cogent: 'limited' },
  business:   { canvas: 'full',      cosmo: 'full',    covex: 'full',   cogent: 'high' },
  enterprise: { canvas: 'full',      cosmo: 'full',    covex: 'full',   cogent: 'unlimited' },
};

export function getToolAccess(tier: string | null | undefined, tool: ToolName): ToolAccess {
  return TOOL_ACCESS[tier?.toLowerCase() || 'free']?.[tool] ?? false;
}

export function hasToolAccess(tier: string | null | undefined, tool: ToolName): boolean {
  return getToolAccess(tier, tool) !== false;
}

export function hasFullToolAccess(tier: string | null | undefined, tool: ToolName): boolean {
  const access = getToolAccess(tier, tool);
  return access === 'full' || access === 'high' || access === 'unlimited';
}

export function hasCogentAccess(tier: string | null | undefined): boolean {
  return getCogentRunsAllocation(tier) !== 0;
}

/**
 * Has video access — kept for backwards compatibility.
 */
export function hasVideoAccess(tier: string | null | undefined): boolean {
  const t = tier?.toLowerCase() || 'free';
  return ['pro', 'business', 'enterprise'].includes(t);
}

export function getVideoCostMultiplier(tier: string | null | undefined): number {
  const multipliers: Record<string, number> = {
    free: 1.0,
    starter: 1.0,
    creator: 1.0,
    pro: 2.0,
    business: 1.5,
    enterprise: 1.0,
  };
  return multipliers[tier?.toLowerCase() || 'free'] || 1.0;
}

export function normalizeTierName(tier: string | null | undefined): string {
  if (!tier) return 'free';
  return tier.toLowerCase();
}
