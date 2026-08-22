import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2, CheckCircle, Gift, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import colabLogo from "@/assets/colab-logo.svg";
import { RedeemCouponDialog } from "@/components/pricing/RedeemCouponDialog";
import { TopUpCreditsDialog } from "@/components/pricing/TopUpCreditsDialog";
import { getDisplayPlanName, getCreditAllocation, getCogentRunsAllocation } from "@/lib/planUtils";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_inr: number;
  price_usd: number | null;
  credits_monthly: number;
  features: any;
  is_active: boolean;
  display_order: number;
}

interface DiscountInfo {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discountAmount: number;
  applicable_plan_ids: string[] | null;
  applicable_billing_periods: string[] | null;
}

// Fixed USD pricing structure (5-tier model)
const USD_PRICING: Record<string, { monthly: number; yearly: number }> = {
  'Starter':    { monthly: 15,  yearly: 12 },
  'Creator':    { monthly: 29,  yearly: 24 },
  'Pro':        { monthly: 59,  yearly: 49 },
  'Business':   { monthly: 120, yearly: 99 },
  'Enterprise': { monthly: 0,   yearly: 0 }, // custom
};

// Tiers that show "Contact Sales" instead of a price + checkout
const CUSTOM_PRICING_TIERS = new Set(['Enterprise']);

const REQUIRED_TIERS = ['Starter', 'Creator', 'Pro', 'Business', 'Enterprise'] as const;

const normalizePlanName = (name: string | null | undefined) =>
  (name || '').trim().toLowerCase();

const canonicalPlanName = (name: string) =>
  REQUIRED_TIERS.find((tier) => tier.toLowerCase() === normalizePlanName(name)) || name;

const createFallbackPlan = (name: string, idx: number): Plan => ({
  id: `fallback-${name.toLowerCase()}`,
  name,
  description: null,
  price_inr: 0,
  price_usd: USD_PRICING[name]?.monthly ?? 0,
  credits_monthly: getCreditAllocation(name),
  features: [],
  is_active: true,
  display_order: idx + 1,
});

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentPlanOrder, setCurrentPlanOrder] = useState<number | null>(null);
  const [planBillingPeriods, setPlanBillingPeriods] = useState<Record<string, 'monthly' | 'yearly'>>({});
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [maxCredits, setMaxCredits] = useState(100);
  const [cogentRunsUsed, setCogentRunsUsed] = useState(0);
  const [cogentRunsLimit, setCogentRunsLimit] = useState(0);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const navigate = useNavigate();

  // USD to INR conversion rate (for PayU which only supports INR)
  const USD_TO_INR_RATE = 83;
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle payment success/failure from URL params
  useEffect(() => {
    const success = searchParams.get('success');

    if (success === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Credits will be added shortly.",
      });
      window.history.replaceState({}, '', '/pricing');
      loadCurrentSubscription();

      // If the user came from the talent payment flow, send them back so they can
      // immediately lock the escrow with their newly topped-up wallet.
      const talentReturnId = sessionStorage.getItem('talent_topup_return');
      if (talentReturnId) {
        sessionStorage.removeItem('talent_topup_return');
        toast({
          title: "Returning to your project…",
          description: "Your wallet is being updated.",
        });
        setTimeout(() => {
          navigate(`/talent/projects/${talentReturnId}/pay`);
        }, 2500);
      }
    } else if (success === 'false') {
      toast({
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again.",
        variant: "destructive"
      });
      window.history.replaceState({}, '', '/pricing');
      sessionStorage.removeItem('talent_topup_return');
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([loadPlans(), loadCurrentSubscription()]);
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      // Ensure all 5 tiers are always shown — merge DB plans with required tier order.
      const byName = new Map((data || []).map((p: any) => [normalizePlanName(p.name), p]));
      const merged: Plan[] = REQUIRED_TIERS.map((name, idx) => {
        const existing = byName.get(name.toLowerCase());
        if (existing) return { ...(existing as Plan), name, display_order: idx + 1 };
        return createFallbackPlan(name, idx);
      });
      setPlans(merged);

      const initialPeriods: Record<string, 'monthly' | 'yearly'> = {};
      merged.forEach(plan => { initialPeriods[plan.id] = 'monthly'; });
      setPlanBillingPeriods(initialPeriods);
    } catch (error: any) {
      console.error('Failed to load plans, using fallback:', error);
      const fallback: Plan[] = REQUIRED_TIERS.map((name, idx) => createFallbackPlan(name, idx));
      setPlans(fallback);
      const initialPeriods: Record<string, 'monthly' | 'yearly'> = {};
      fallback.forEach(p => { initialPeriods[p.id] = 'monthly'; });
      setPlanBillingPeriods(initialPeriods);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentPlanName: string | null = null;

      // Load credits data
      const { data: creditsData } = await supabase
        .from('credits')
        .select('balance, subscription_tier, subscription_expires_at, plan_status, cogent_runs_used, cogent_runs_limit')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        const hasActivePlan = creditsData.plan_status === 'active' ||
          (!!creditsData.subscription_expires_at && new Date(creditsData.subscription_expires_at) > new Date());
        setCurrentCredits(hasActivePlan ? (creditsData.balance || 0) : 0);

        // Set max credits based on tier using centralized utility
        setMaxCredits(hasActivePlan ? getCreditAllocation(creditsData.subscription_tier) : 0);

        // Cogent run quota
        setCogentRunsUsed((creditsData as any).cogent_runs_used ?? 0);
        setCogentRunsLimit(
          (creditsData as any).cogent_runs_limit ?? getCogentRunsAllocation(creditsData.subscription_tier),
        );

        if (creditsData.subscription_expires_at) {
          const expiresAt = new Date(creditsData.subscription_expires_at);
          setSubscriptionEndDate(expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
      }

      // First check for active paid subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_plans(name, display_order)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const hasActiveSubscription = !!subscription?.subscription_plans;

      if (hasActiveSubscription) {
        currentPlanName = (subscription.subscription_plans as any).name;
        setCurrentPlan(currentPlanName);
        setCurrentPlanOrder((subscription.subscription_plans as any).display_order);
        return;
      }

      // No active paid subscription = free user
      // Do NOT map to any plan card - all cards show "Upgrade"
      setCurrentPlan(null);
      setCurrentPlanOrder(null);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSubscribe = async (planId: string, planName: string) => {
    try {
      setProcessingPlanId(planId);

      // Guard: don't allow checkout against a fallback plan id (DB row missing).
      if (planId.startsWith('fallback-')) {
        toast({
          title: 'Plan unavailable',
          description: 'This plan isn\'t set up yet. Please refresh in a moment or contact support.',
          variant: 'destructive',
        });
        setProcessingPlanId(null);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      const billingPeriod = planBillingPeriods[planId] || 'monthly';
      const pricing = USD_PRICING[planName];
      
      if (!pricing) {
        toast({
          title: "Error",
          description: "Invalid plan selected",
          variant: "destructive"
        });
        setProcessingPlanId(null);
        return;
      }

      const priceUSD = billingPeriod === 'yearly' ? pricing.yearly * 12 : pricing.monthly;
      
      // Convert to INR for PayU
      const priceINR = Math.round(priceUSD * USD_TO_INR_RATE);

      // Free plan handling
      if (priceINR === 0) {
        toast({
          title: "Success",
          description: "You're already on the free plan!"
        });
        setProcessingPlanId(null);
        return;
      }

      // Calculate discount if applicable
      let finalPrice = priceINR;
      let appliedDiscountCode: string | null = null;
      if (discountInfo) {
        const isPlanEligible = !discountInfo.applicable_plan_ids || 
          discountInfo.applicable_plan_ids.length === 0 || 
          discountInfo.applicable_plan_ids.includes(planId);
        
        const isBillingEligible = !discountInfo.applicable_billing_periods || 
          discountInfo.applicable_billing_periods.length === 0 || 
          discountInfo.applicable_billing_periods.includes(billingPeriod);
        
        if (isPlanEligible && isBillingEligible) {
          if (discountInfo.discount_type === 'percentage') {
            finalPrice = Math.round(priceINR - (priceINR * discountInfo.discount_value / 100));
          } else {
            finalPrice = Math.max(0, priceINR - discountInfo.discountAmount);
          }
          appliedDiscountCode = discountInfo.code;
        }
      }

      // Handle 100% discount (free subscription) - activate directly without PayU
      if (finalPrice <= 0 && appliedDiscountCode) {
        console.log('100% discount detected, activating free subscription');
        
        const { data, error } = await supabase.functions.invoke('activate-free-subscription', {
          body: {
            planId,
            planName,
            discountCode: appliedDiscountCode,
            billingPeriod
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          console.error('Free subscription error:', error);
          throw new Error(error.message || 'Failed to activate subscription');
        }

        // Check for error in the response data (edge function returned error)
        if (data?.error) {
          console.error('Free subscription error response:', data.error);
          throw new Error(data.error);
        }

        // Fire celebration confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
        }, 250);

        toast({
          title: "🎉 Welcome to Premium!",
          description: data.message || "Your subscription has been activated!"
        });
        
        // Navigate to success page
        navigate('/payment/callback?status=success&type=free');
        return;
      }

      console.log('Creating payment for plan:', planId);

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          planId,
          planName,
          discountCode: appliedDiscountCode,
          billingPeriod,
          currency: 'USD',
          successUrl: `${window.location.origin}/payment/callback?status=success`,
          failureUrl: `${window.location.origin}/payment/callback?status=failure`
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create payment');
      }

      if (!data || !data.payuUrl || !data.paymentData) {
        console.error('Invalid payment response:', data);
        throw new Error('Invalid payment response from server');
      }

      console.log('Payment created successfully, redirecting to PayU');

      // Create and submit PayU Money form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.payuUrl;
      
      Object.entries(data.paymentData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error: any) {
      console.error('Payment error details:', {
        message: error.message,
        stack: error.stack,
        error
      });

      let errorMessage = 'Failed to initiate payment';
      if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('Auth')) {
        errorMessage = 'Session expired. Please log in again.';
        setTimeout(() => navigate('/auth'), 2000);
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
      setProcessingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-transparent">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <section className="mb-8 rounded-2xl border border-zinc-900 bg-zinc-950 text-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <div className="flex items-center gap-3 mb-8">
                <img src={colabLogo} alt="Colab" className="w-9 h-9 invert" />
                <span className="text-xs uppercase tracking-[0.22em] text-zinc-400">Pricing plans</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-normal leading-[0.98] max-w-3xl">
                Pick the level of creative execution you want.
              </h1>
              <p className="mt-6 max-w-xl text-sm md:text-base text-zinc-300 leading-relaxed">
                Colab is priced by output capability, intelligence access and automation depth — not by a confusing wall of identical ticks.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => document.getElementById('plan-cards')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white text-zinc-950 hover:bg-zinc-200">
                  Compare plans
                </Button>
                <Button variant="outline" onClick={() => setShowRedeemDialog(true)} className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900">
                  <Gift className="w-4 h-4 mr-2" /> Redeem Coupon
                </Button>
              </div>
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/60 p-7 md:p-10 lg:p-12">
              <div className="grid grid-cols-1 gap-4">
                <div className="border-b border-zinc-700 pb-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2">Your account</div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{currentPlan ? `${currentPlan} plan` : 'No active plan'}</span>
                    <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800">Manage</Button>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{subscriptionEndDate ? `Renews ${subscriptionEndDate}` : 'A paid plan is required to use the product.'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-zinc-700 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-2">Credits</div>
                    <div className="text-2xl font-semibold">{currentCredits}</div>
                    <div className="text-xs text-zinc-500 mt-1">of {maxCredits} available</div>
                  </div>
                  <div className="border border-zinc-700 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-2">Cogent runs</div>
                    <div className="text-2xl font-semibold">{cogentRunsLimit === -1 ? '∞' : cogentRunsLimit}</div>
                    <div className="text-xs text-zinc-500 mt-1">{cogentRunsUsed} used this month</div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowTopUpDialog(true)} className="w-full border-zinc-700 bg-transparent text-white hover:bg-zinc-800">
                  <Plus className="w-4 h-4 mr-2" /> Top up credits
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Discount Applied Banner */}
        {discountInfo && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-8">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 flex-1">
              Code <strong>{discountInfo.code}</strong> applied! 
              {discountInfo.discount_type === 'percentage' 
                ? ` ${discountInfo.discount_value}% off`
                : ` $${discountInfo.discount_value} off`}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setDiscountInfo(null)} className="h-6 px-2 text-xs">
              Remove
            </Button>
          </div>
        )}

        {/* Redeem Dialog */}
        <RedeemCouponDialog 
          open={showRedeemDialog} 
          onOpenChange={setShowRedeemDialog}
          onDiscountApplied={setDiscountInfo}
        />

        {/* Top Up Dialog */}
        <TopUpCreditsDialog
          open={showTopUpDialog}
          onOpenChange={setShowTopUpDialog}
        />

        <div id="plan-cards">
          <PlanCards
            plans={plans}
            planBillingPeriods={planBillingPeriods}
            setPlanBillingPeriods={setPlanBillingPeriods}
            discountInfo={discountInfo}
            processingPlanId={processingPlanId}
            currentPlan={currentPlan}
            currentPlanOrder={currentPlanOrder}
            onSubscribe={handleSubscribe}
          />
        </div>

        {/* Benefits / Why Colab */}
        <BenefitsSection />

        {/* Detailed comparison table */}
        <ComparisonTable plans={plans} />

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p className="text-xs">No free product access. A paid plan is required to create.</p>
          <p className="mt-2 text-xs">Secure payment powered by PayU Money</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Outcome-driven plan cards ---------------- */

const PLAN_OUTCOMES: Record<string, { tagline: string; bestFor: string; highlights: string[]; notIncluded: string[] }> = {
  Starter: {
    tagline: 'Try Colab and ship a few designs.',
    bestFor: 'Solo creators testing the waters',
    highlights: [
      '300 credits / month (~15 designs)',
      'Canvas — basic generation',
      'Cosmo — limited slides & docs',
      'Standard image quality',
    ],
    notIncluded: ['Covex video', 'Cogent autonomous workflows', 'Brand intelligence layer'],
  },
  Creator: {
    tagline: 'Run a full creative pipeline solo.',
    bestFor: 'Freelancers and indie creators',
    highlights: [
      '1,000 credits / month (~50 designs)',
      'Canvas — full quality + advanced edits',
      'Cosmo — unlimited slides & docs',
      'Covex — basic video generation',
    ],
    notIncluded: ['Cogent autonomous agents', 'Priority queue'],
  },
  Pro: {
    tagline: 'Replace your design + video team.',
    bestFor: 'Agencies and growing brands',
    highlights: [
      '2,500 credits / month (~125 designs)',
      'Everything in Creator',
      'Covex — full video generation',
      'Cogent — 5 autonomous runs / month',
      'Priority generation queue',
    ],
    notIncluded: ['SSO', 'Dedicated support'],
  },
  Business: {
    tagline: 'Operate a full creative agency.',
    bestFor: 'Teams scaling output',
    highlights: [
      '6,000 credits / month (~300 designs)',
      'Everything in Pro',
      'Cogent — 25 autonomous runs / month',
      'Team workspaces',
      'Priority support',
    ],
    notIncluded: ['Custom contracts'],
  },
  Enterprise: {
    tagline: 'Unlimited creative infrastructure.',
    bestFor: 'Large orgs with custom needs',
    highlights: [
      '15,000+ credits / month',
      'Unlimited Cogent runs',
      'SSO + custom roles',
      'Dedicated account manager',
      'Custom integrations & SLAs',
    ],
    notIncluded: [],
  },
};

interface PlanCardsProps {
  plans: Plan[];
  planBillingPeriods: Record<string, 'monthly' | 'yearly'>;
  setPlanBillingPeriods: React.Dispatch<React.SetStateAction<Record<string, 'monthly' | 'yearly'>>>;
  discountInfo: DiscountInfo | null;
  processingPlanId: string | null;
  currentPlan: string | null;
  currentPlanOrder: number | null;
  onSubscribe: (planId: string, planName: string) => void;
}

function PlanCards({
  plans, planBillingPeriods, setPlanBillingPeriods, discountInfo,
  processingPlanId, currentPlan, currentPlanOrder, onSubscribe,
}: PlanCardsProps) {
  const orderedPlans = REQUIRED_TIERS.map((tier, idx) => {
    const existing = plans.find((plan) => normalizePlanName(plan.name) === tier.toLowerCase());
    return existing ? { ...existing, name: tier, display_order: idx + 1 } : createFallbackPlan(tier, idx);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {orderedPlans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.name;
        const isCustom = CUSTOM_PRICING_TIERS.has(plan.name);
        const billingPeriod = planBillingPeriods[plan.id] || 'monthly';
        const pricing = USD_PRICING[plan.name];
        const monthlyPrice = pricing?.monthly || 0;
        const yearlyPrice = pricing?.yearly || 0;
        const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;
        const totalYearly = yearlyPrice * 12;
        const isPopular = plan.name === 'Pro';
        const outcome = PLAN_OUTCOMES[plan.name] || { tagline: '', bestFor: '', highlights: [], notIncluded: [] };

        const isUpgrade = currentPlanOrder !== null && plan.display_order > currentPlanOrder;
        const isDowngrade = currentPlanOrder !== null && plan.display_order < currentPlanOrder;
        const isPlanEligible = !discountInfo?.applicable_plan_ids ||
          discountInfo.applicable_plan_ids.length === 0 ||
          discountInfo.applicable_plan_ids.includes(plan.id);
        const isBillingEligible = !discountInfo?.applicable_billing_periods ||
          discountInfo.applicable_billing_periods.length === 0 ||
          discountInfo.applicable_billing_periods.includes(billingPeriod);
        const basePrice = billingPeriod === 'yearly' ? totalYearly : displayPrice;
        let discountedPrice = basePrice;
        let hasDiscount = false;
        if (discountInfo && !isCustom && isPlanEligible && isBillingEligible) {
          discountedPrice = discountInfo.discount_type === 'percentage'
            ? Math.max(0, Math.round(basePrice - (basePrice * discountInfo.discount_value / 100)))
            : Math.max(0, basePrice - discountInfo.discountAmount);
          hasDiscount = discountedPrice !== basePrice;
        }

        return (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-2xl bg-white border p-5 transition-all',
              isPopular ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200',
            )}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
            )}

            {/* Header */}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 min-h-[32px]">{outcome.tagline}</p>
            </div>

            {/* Price */}
            <div className="mt-4 mb-3">
              {isCustom ? (
                <div className="text-3xl font-bold text-zinc-900">Custom</div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    {hasDiscount && <span className="text-lg line-through text-zinc-400">${basePrice}</span>}
                    <span className="text-3xl font-bold text-zinc-900">{hasDiscount && discountedPrice === 0 ? 'FREE' : `$${hasDiscount ? discountedPrice : displayPrice}`}</span>
                    {(!hasDiscount || discountedPrice > 0) && <span className="text-sm text-zinc-500">/mo</span>}
                  </div>
                  {hasDiscount && discountedPrice === 0 && <div className="text-[11px] text-emerald-600 mt-1">100% off with code</div>}
                  {billingPeriod === 'yearly' && !hasDiscount && (
                    <div className="text-[11px] text-emerald-600 mt-1">
                      Billed ${totalYearly}/yr · save ${(monthlyPrice - yearlyPrice) * 12}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Billing toggle */}
            {!isCustom && (
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-full mb-4 w-fit">
                {(['monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlanBillingPeriods(prev => ({ ...prev, [plan.id]: p }))}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-medium transition',
                      billingPeriod === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                    )}
                  >
                    {p === 'monthly' ? 'Monthly' : 'Yearly -20%'}
                  </button>
                ))}
              </div>
            )}

            {/* Best for */}
            <div className="mb-3 pb-3 border-b border-zinc-100">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Best for</div>
              <div className="text-xs text-zinc-700">{outcome.bestFor}</div>
            </div>

            {/* Highlights */}
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">What you get</div>
              <ul className="space-y-2 mb-4">
                {outcome.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-900" strokeWidth={2.5} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              {outcome.notIncluded.length > 0 && (
                <ul className="space-y-1.5">
                  {outcome.notIncluded.map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
                      <span className="mt-1.5 w-2 h-px bg-zinc-300 shrink-0" />
                      <span className="line-through decoration-zinc-300">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* CTA */}
            <div className="mt-5">
              {isCustom ? (
                <Button
                  variant="outline"
                  onClick={() => { window.location.href = 'mailto:hello@letscolab.in?subject=Enterprise%20plan%20inquiry'; }}
                  className="w-full"
                >
                  Contact Sales
                </Button>
              ) : (
                <Button
                  onClick={() => onSubscribe(plan.id, plan.name)}
                  disabled={processingPlanId === plan.id || isCurrentPlan}
                  className={cn(
                    'w-full',
                    isPopular ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50',
                  )}
                >
                  {processingPlanId === plan.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : isCurrentPlan ? 'Current Plan'
                    : hasDiscount && discountedPrice === 0 ? 'Activate Free'
                    : isUpgrade ? 'Upgrade'
                    : isDowngrade ? 'Downgrade'
                    : 'Get Started'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Benefits Section ---------------- */

function BenefitsSection() {
  const benefits = [
    { title: 'Replace your agency', desc: 'Generate brand assets, decks, videos and campaigns without hiring designers.' },
    { title: 'One credit economy', desc: 'Same credits work across Canvas, Cosmo, Covex and Cogent. No surprise bills.' },
    { title: 'Brand-aware AI', desc: 'Every generation respects your colors, fonts, and tone — automatically.' },
    { title: 'Autonomous workflows', desc: 'Cogent runs entire creative pipelines on its own. You just approve.' },
  ];
  return (
    <div className="mt-16 mb-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Why teams choose Colab</h2>
        <p className="text-sm text-zinc-500 mt-1">A creative agency on tap — for the price of a lunch.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="text-sm font-semibold text-zinc-900 mb-2">{b.title}</div>
            <div className="text-xs text-zinc-600 leading-relaxed">{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Comparison table ---------------- */

interface FeatureRow {
  category?: string;
  label: string;
  values: (string | boolean)[]; // [Starter, Creator, Pro, Business, Enterprise]
}

const COMPARISON_ROWS: FeatureRow[] = [
  { category: 'Credits & access', label: 'Monthly credits', values: ['300', '1,000', '2,500', '6,000', '15,000+'] },
  { label: 'Credit rollover', values: ['—', 'Up to 500', 'Up to 1,000', 'Up to 2,500', 'Custom'] },
  { label: 'Top-up credits', values: [true, true, true, true, true] },

  { category: 'Canvas (image generation)', label: 'Basic generation', values: [true, true, true, true, true] },
  { label: 'Advanced edits & filters', values: [false, true, true, true, true] },
  { label: 'High-quality models', values: [false, true, true, true, true] },
  { label: 'Priority queue', values: [false, false, true, true, true] },

  { category: 'Cosmo (presentations & docs)', label: 'Slides & documents', values: ['Limited', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Brand guideline generator', values: [false, true, true, true, true] },

  { category: 'Covex (video)', label: 'Video generation', values: [false, 'Basic', 'Full', 'Full', 'Full'] },
  { label: 'HD video export', values: [false, false, true, true, true] },

  { category: 'Cogent (autonomous AI)', label: 'Autonomous runs / month', values: ['—', '—', '5', '25', 'Unlimited'] },
  { label: 'Multi-step workflows', values: [false, false, true, true, true] },

  { category: 'Team & support', label: 'Team workspaces', values: [false, false, false, true, true] },
  { label: 'SSO & roles', values: [false, false, false, false, true] },
  { label: 'Priority support', values: [false, false, true, true, true] },
  { label: 'Dedicated account manager', values: [false, false, false, false, true] },
];

function ComparisonTable({ plans }: { plans: Plan[] }) {
  const tierOrder = ['Starter', 'Creator', 'Pro', 'Business', 'Enterprise'];
  return (
    <div className="mt-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Compare plans</h2>
        <p className="text-sm text-zinc-500 mt-1">Every feature, side by side.</p>
      </div>
      <div className="overflow-x-auto bg-white border border-zinc-200 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left p-4 font-semibold text-zinc-900 w-1/3">Features</th>
              {tierOrder.map((name) => (
                <th key={name} className={cn(
                  'text-center p-4 font-semibold',
                  name === 'Pro' ? 'text-zinc-900 bg-zinc-50' : 'text-zinc-700',
                )}>
                  {name}
                  {name === 'Pro' && <div className="text-[10px] text-zinc-500 font-normal mt-0.5">Most popular</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <React.Fragment key={i}>
                {row.category && (
                  <tr className="bg-zinc-50/50">
                    <td colSpan={6} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {row.category}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-zinc-100 last:border-b-0">
                  <td className="p-4 text-zinc-700">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className={cn('p-4 text-center', tierOrder[j] === 'Pro' && 'bg-zinc-50/50')}>
                      {typeof v === 'boolean' ? (
                        v ? <Check className="w-4 h-4 inline text-zinc-900" strokeWidth={2.5} />
                          : <span className="text-zinc-300">—</span>
                      ) : (
                        <span className="text-zinc-700 text-xs">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
