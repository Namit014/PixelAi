import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NoCreditsUpgradeModal } from '@/components/pricing/NoCreditsUpgradeModal';

interface Ctx {
  /**
   * Returns true when the user can run an AI action. Returns false (and opens
   * the upgrade modal) when the user has no active plan and no credits.
   */
  requireAi: () => Promise<boolean>;
}

const AiAccessContext = createContext<Ctx | null>(null);

export function AiAccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<'no_plan' | 'no_credits' | null>(null);

  const requireAi = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReason('no_plan');
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
      setReason(tier === 'free' ? 'no_plan' : 'no_credits');
      setOpen(true);
      return false;
    } catch {
      // Fail open so we never block on a transient network error.
      return true;
    }
  }, []);

  useEffect(() => {
    const aiFunctions = new Set([
      'analyze-design-canvas', 'analyze-mockup', 'analyze-product-image',
      'canvas-ai-chat', 'edit-image', 'generate-color-palette', 'generate-cosmo-workflow',
      'generate-design', 'generate-presentation', 'rumi-autonomous-resume',
      'rumi-proactive-agent', 'rumi-autonomous-start', 'motion-studio-ai',
      'generate-video', 'generate-qr',
    ]);
    const functionsClient = supabase.functions as any;
    const originalInvoke = functionsClient.invoke.bind(functionsClient);

    functionsClient.invoke = async (functionName: string, options?: any) => {
      if (aiFunctions.has(functionName) && !(await requireAi())) {
        return { data: null, error: new Error('AI access required') };
      }
      return originalInvoke(functionName, options);
    };

    return () => {
      functionsClient.invoke = originalInvoke;
    };
  }, [requireAi]);

  return (
    <AiAccessContext.Provider value={{ requireAi }}>
      {children}
      <NoCreditsUpgradeModal open={open} onOpenChange={setOpen} reason={reason} />
    </AiAccessContext.Provider>
  );
}

export function useAiAccess(): Ctx {
  const ctx = useContext(AiAccessContext);
  // No-op fallback so callers outside the provider don't crash.
  if (!ctx) return { requireAi: async () => true };
  return ctx;
}
