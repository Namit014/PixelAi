import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AiAccessState {
  loading: boolean;
  allowed: boolean;
  reason: 'no_plan' | 'no_credits' | null;
  balance: number;
  tier: string;
}

/**
 * Resolves whether the current user can run an AI tool action.
 *
 * Blocked when: no active paid subscription AND balance <= 0.
 *
 * Use together with `<NoCreditsUpgradeModal />` and `runAiAction`.
 */
export function useRequireAiAccess() {
  const [state, setState] = useState<AiAccessState>({
    loading: true,
    allowed: true, // optimistic — don't block UI before we know
    reason: null,
    balance: 0,
    tier: 'free',
  });
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, allowed: false, reason: 'no_plan', balance: 0, tier: 'free' });
      return;
    }
    const { data: credits } = await supabase
      .from('credits')
      .select('balance, subscription_tier, subscription_expires_at, plan_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const balance = credits?.balance ?? 0;
    const tier = (credits?.subscription_tier ?? 'free').toLowerCase();
    const hasActivePaid =
      tier !== 'free' &&
      (credits?.plan_status === 'active' ||
        (credits?.subscription_expires_at && new Date(credits.subscription_expires_at) > new Date()));

    let reason: AiAccessState['reason'] = null;
    let allowed = true;
    if (!hasActivePaid && balance <= 0) {
      allowed = false;
      reason = tier === 'free' ? 'no_plan' : 'no_credits';
    }
    setState({ loading: false, allowed, reason, balance, tier });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ensureAccess = useCallback(async (): Promise<boolean> => {
    // Always re-check fresh — credits change between actions.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setOpen(true);
      return false;
    }
    const { data: credits } = await supabase
      .from('credits')
      .select('balance, subscription_tier, subscription_expires_at, plan_status')
      .eq('user_id', user.id)
      .maybeSingle();
    const balance = credits?.balance ?? 0;
    const tier = (credits?.subscription_tier ?? 'free').toLowerCase();
    const hasActivePaid =
      tier !== 'free' &&
      (credits?.plan_status === 'active' ||
        (credits?.subscription_expires_at && new Date(credits.subscription_expires_at) > new Date()));
    if (hasActivePaid || balance > 0) return true;
    setState((s) => ({ ...s, allowed: false, reason: tier === 'free' ? 'no_plan' : 'no_credits' }));
    setOpen(true);
    return false;
  }, []);

  return {
    ...state,
    refresh,
    ensureAccess,
    upgradeModalOpen: open,
    setUpgradeModalOpen: setOpen,
  };
}
