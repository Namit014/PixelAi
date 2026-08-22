import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, X, Tag, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_inr: number;
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

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fixed USD pricing structure (matching Pricing.tsx)
const USD_PRICING: Record<string, { monthly: number; yearly: number }> = {
  'Starter': { monthly: 15, yearly: 12 },
  'Creator': { monthly: 29, yearly: 24 },
  'Pro': { monthly: 59, yearly: 49 },
  'Business': { monthly: 120, yearly: 99 },
  'Enterprise': { monthly: 0, yearly: 0 },
};

const CUSTOM_PRICING_TIERS = new Set(['Enterprise']);
const USD_TO_INR_RATE = 83;

const PLAN_OUTCOMES: Record<string, { bestFor: string; capability: string; intelligence: string; automation: string; excluded: string }> = {
  Starter: {
    bestFor: 'Solo creators testing output quality',
    capability: 'Canvas basic generation + limited Cosmo docs',
    intelligence: 'No Cogent layer',
    automation: 'Manual tool usage only',
    excluded: 'Covex video, autonomous workflows',
  },
  Creator: {
    bestFor: 'Freelancers shipping client assets',
    capability: 'Full Canvas + unlimited Cosmo slides/docs + basic Covex',
    intelligence: 'Brand-aware generation',
    automation: 'Guided workflow execution',
    excluded: 'Cogent autonomous agents, priority queue',
  },
  Pro: {
    bestFor: 'Agencies replacing production teams',
    capability: 'Canvas, Cosmo and Covex fully unlocked',
    intelligence: 'Cogent included: 5 runs/month',
    automation: 'Partial autonomous execution',
    excluded: 'SSO, dedicated account manager',
  },
  Business: {
    bestFor: 'Teams scaling creative ops',
    capability: 'Everything in Pro + team workspaces',
    intelligence: 'Cogent included: 25 runs/month',
    automation: 'Full campaign workflow execution',
    excluded: 'Custom contracts and SLA',
  },
  Enterprise: {
    bestFor: 'Large organizations needing scale',
    capability: 'Unlimited scale across every product surface',
    intelligence: 'Unlimited Cogent usage',
    automation: 'Custom autonomous systems',
    excluded: 'Nothing material excluded',
  },
};

const COMPARISON_ROWS = [
  ['Monthly credits', '300', '1,000', '2,500', '6,000', 'Custom'],
  ['Canvas', 'Basic generation', 'Full quality', 'Full + priority', 'Full + teams', 'Custom'],
  ['Cosmo', 'Limited docs', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
  ['Covex', 'Not included', 'Basic video', 'Full video', 'Full video', 'Full video'],
  ['Cogent', 'Not included', 'Not included', '5 runs', '25 runs', 'Unlimited'],
  ['Automation depth', 'Manual', 'Guided', 'Partial autonomous', 'Full workflows', 'Custom'],
];

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentPlanOrder, setCurrentPlanOrder] = useState<number | null>(null);
  const [planBillingPeriods, setPlanBillingPeriods] = useState<Record<string, 'monthly' | 'yearly'>>({});
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Parallelize both data loads for faster modal open
      Promise.all([loadPlans(), loadCurrentSubscription()]);
      // Reset discount state when modal opens
      setDiscountCode("");
      setDiscountInfo(null);
      setDiscountError(null);
    }
  }, [open]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setPlans(data || []);
      
      // Initialize billing periods for each plan
      const initialPeriods: Record<string, 'monthly' | 'yearly'> = {};
      (data || []).forEach(plan => {
        initialPeriods[plan.id] = 'monthly';
      });
      setPlanBillingPeriods(initialPeriods);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentPlanName: string | null = null;

      // First check for active paid subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_plans(name, display_order)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.subscription_plans) {
        currentPlanName = (subscription.subscription_plans as any).name;
        setCurrentPlan(currentPlanName);
        setCurrentPlanOrder((subscription.subscription_plans as any).display_order);
        return;
      }

      // No active paid subscription = free user
      // Do NOT map to any plan card - all cards show upgrade options
      setCurrentPlan(null);
      setCurrentPlanOrder(null);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const validateDiscountCode = async (planPrice: number, planId?: string, billingPeriod?: string) => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }

    setValidatingCode(true);
    setDiscountError(null);

    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDiscountError("Please log in to apply discount codes");
        setValidatingCode(false);
        return;
      }

      // Use secure edge function for discount code validation
      const { data, error } = await supabase.functions.invoke('validate-discount-code', {
        body: {
          code: discountCode.trim(),
          plan_price: planPrice,
          plan_id: planId,
          billing_period: billingPeriod || 'monthly'
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        setDiscountError("Failed to validate discount code");
        setDiscountInfo(null);
        return;
      }

      if (!data.valid) {
        setDiscountError(data.error || "Invalid discount code");
        setDiscountInfo(null);
        return;
      }

      // Set discount info from server response
      setDiscountInfo({
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'fixed',
        discount_value: data.discount_value,
        discountAmount: data.discount_amount,
        applicable_plan_ids: data.applicable_plan_ids || null,
        applicable_billing_periods: data.applicable_billing_periods || null
      });
      setDiscountError(null);

      toast({
        title: "Discount Applied!",
        description: `${data.discount_type === 'percentage' ? `${data.discount_value}%` : `$${data.discount_value}`} off your purchase`,
      });
    } catch (error) {
      setDiscountError("Failed to validate discount code");
      setDiscountInfo(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const removeDiscount = () => {
    setDiscountCode("");
    setDiscountInfo(null);
    setDiscountError(null);
  };

  const handleSubscribe = async (planId: string, planName: string) => {
    if (planId.startsWith('fallback-')) {
      toast({
        title: 'Plan unavailable',
        description: 'This plan isn\'t set up yet. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }
    const billingPeriod = planBillingPeriods[planId] || 'monthly';
    const pricing = USD_PRICING[planName];
    if (!pricing) return;
    
    const displayPrice = billingPeriod === 'yearly' ? pricing.yearly : pricing.monthly;
    const totalPriceUSD = billingPeriod === 'yearly' ? pricing.yearly * 12 : displayPrice;
    const totalPrice = Math.round(totalPriceUSD * USD_TO_INR_RATE);
    
    try {
      setProcessingPlanId(planId);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive"
        });
        onOpenChange(false);
        navigate('/auth');
        return;
      }

      if (totalPrice === 0) {
        toast({
          title: "Success",
          description: "You're already on the free plan!"
        });
        setProcessingPlanId(null);
        return;
      }

      // Calculate final price after discount
      let finalPrice = totalPrice;
      let appliedDiscountCode: string | null = null;
      if (discountInfo) {
        const isPlanEligible = !discountInfo.applicable_plan_ids ||
          discountInfo.applicable_plan_ids.length === 0 ||
          discountInfo.applicable_plan_ids.includes(planId);
        const isBillingEligible = !discountInfo.applicable_billing_periods ||
          discountInfo.applicable_billing_periods.length === 0 ||
          discountInfo.applicable_billing_periods.includes(billingPeriod);

        if (isPlanEligible && isBillingEligible) {
          finalPrice = discountInfo.discount_type === 'percentage'
            ? Math.round(totalPrice - (totalPrice * discountInfo.discount_value / 100))
            : Math.max(0, totalPrice - discountInfo.discountAmount);
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
        
        onOpenChange(false);
        // Navigate to success page
        navigate('/payment/callback?status=success&type=free');
        return;
      }

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
        throw new Error(error.message || 'Failed to create payment');
      }

      if (!data || !data.payuUrl || !data.paymentData) {
        throw new Error('Invalid payment response from server');
      }

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
      console.error('Payment error:', error);
      
      let errorMessage = 'Failed to initiate payment';
      if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('Auth')) {
        errorMessage = 'Session expired. Please log in again.';
        setTimeout(() => {
          onOpenChange(false);
          navigate('/auth');
        }, 2000);
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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-7xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[92vh] overflow-hidden">
          {/* Close Button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full p-2 opacity-70 transition-opacity hover:opacity-100 hover:bg-zinc-100 focus:outline-none">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="p-6 overflow-y-auto max-h-[92vh]">
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 mb-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-950 text-white p-6 flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-400 mb-4">Colab pricing</div>
                  <h2 className="text-4xl font-semibold leading-tight mb-4">Pay for creative output, not tool checklists.</h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Choose by capability, intelligence access and automation depth across Canvas, Cosmo, Covex and Cogent.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-6 text-xs">
                  <div className="border-t border-zinc-700 pt-3"><span className="block text-zinc-400">Tools</span>Canvas / Cosmo / Covex</div>
                  <div className="border-t border-zinc-700 pt-3"><span className="block text-zinc-400">AI layer</span>Cogent access</div>
                  <div className="border-t border-zinc-700 pt-3"><span className="block text-zinc-400">Execution</span>Manual to autonomous</div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">Quick comparison</h3>
                    <p className="text-xs text-zinc-500 mt-1">No vague tick marks — every tier states what changes.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); navigate('/pricing'); }}>
                    Full page
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                  <table className="w-full text-xs">
                    <tbody>
                      {COMPARISON_ROWS.map((row) => (
                        <tr key={row[0]} className="border-b border-zinc-100 last:border-0">
                          {row.map((cell, index) => (
                            <td key={`${row[0]}-${index}`} className={cn('px-3 py-2.5 whitespace-nowrap', index === 0 ? 'font-medium text-zinc-900 bg-zinc-50' : 'text-zinc-600 text-center')}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">Choose your execution level</h3>
                <p className="text-sm text-zinc-500 mt-1">Starter is tools. Pro and above unlock agency-replacement automation.</p>
              </div>

              {/* Discount Code Input */}
              <div className="w-full md:max-w-sm">
                {discountInfo ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">
                      Code <strong>{discountInfo.code}</strong> applied! 
                      {discountInfo.discount_type === 'percentage' 
                        ? ` ${discountInfo.discount_value}% off`
                        : ` $${discountInfo.discount_value} off`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={removeDiscount} className="h-6 px-2 text-xs">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input
                        value={discountCode}
                        onChange={(e) => {
                          setDiscountCode(e.target.value.toUpperCase());
                          if (discountError) setDiscountError(null);
                        }}
                        placeholder="Promo code"
                        className={cn(
                          "pl-9 h-9 text-sm",
                          discountError && "border-red-500 focus:ring-red-500"
                        )}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const firstPaidPlan = plans.find(p => p.price_inr > 0);
                        if (firstPaidPlan) {
                          const pricing = USD_PRICING[firstPaidPlan.name];
                          const period = planBillingPeriods[firstPaidPlan.id] || 'monthly';
                          const priceUSD = period === 'yearly' ? (pricing?.yearly || 0) * 12 : (pricing?.monthly || 0);
                          const price = Math.round(priceUSD * USD_TO_INR_RATE);
                          validateDiscountCode(price, undefined, period);
                        }
                      }}
                      disabled={validatingCode || !discountCode.trim()}
                      className="h-9"
                    >
                      {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {discountError && (
                  <p className="text-xs text-red-500 mt-1">{discountError}</p>
                )}
              </div>
            </div>

            {/* Plans Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan === plan.name;
                  const isCustom = CUSTOM_PRICING_TIERS.has(plan.name);
                  const billingPeriod = planBillingPeriods[plan.id] || 'monthly';
                  const pricing = USD_PRICING[plan.name];
                  const monthlyPrice = pricing?.monthly || 0;
                  const yearlyPrice = pricing?.yearly || 0;
                  const displayPrice = billingPeriod === 'yearly' ? yearlyPrice : monthlyPrice;
                  const totalYearlyPrice = yearlyPrice * 12;
                  const outcome = PLAN_OUTCOMES[plan.name] || {
                    bestFor: plan.description || 'Creative teams',
                    capability: `${plan.credits_monthly.toLocaleString()} monthly credits`,
                    intelligence: 'Plan-specific intelligence access',
                    automation: 'Plan-specific execution depth',
                    excluded: 'See full comparison',
                  };
                  const isPlanEligible = !discountInfo?.applicable_plan_ids || 
                    discountInfo.applicable_plan_ids.length === 0 || 
                    discountInfo.applicable_plan_ids.includes(plan.id);
                  const isBillingEligible = !discountInfo?.applicable_billing_periods || 
                    discountInfo.applicable_billing_periods.length === 0 || 
                    discountInfo.applicable_billing_periods.includes(billingPeriod);
                  const isDiscountEligible = isPlanEligible && isBillingEligible;
                  let discountedPrice = billingPeriod === 'yearly' ? totalYearlyPrice : displayPrice;
                  let hasDiscount = false;
                  if (discountInfo && !isCustom && isDiscountEligible) {
                    if (discountInfo.discount_type === 'percentage') {
                      discountedPrice = Math.round(discountedPrice - (discountedPrice * discountInfo.discount_value / 100));
                    } else {
                      discountedPrice = Math.max(0, discountedPrice - discountInfo.discount_value);
                    }
                    hasDiscount = discountedPrice !== (billingPeriod === 'yearly' ? totalYearlyPrice : displayPrice);
                  }
                  const isUpgrade = currentPlanOrder !== null && plan.display_order > currentPlanOrder;
                  const isDowngrade = currentPlanOrder !== null && plan.display_order < currentPlanOrder;
                  const isPopular = plan.name === 'Pro';

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative flex flex-col rounded-xl border bg-white p-4 transition-all duration-200",
                        isPopular ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200'
                      )}
                    >
                      {isPopular && (
                        <Badge className="absolute -top-3 left-4 bg-zinc-950 text-white text-[10px]">
                          Agency replacement
                        </Badge>
                      )}

                      <div className="flex-1 pt-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                            <p className="text-[11px] text-zinc-500 mt-1 min-h-[32px]">{outcome.bestFor}</p>
                          </div>
                        </div>

                        {/* Per-card billing toggle */}
                        {!isCustom && (
                          <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-full mb-3 w-fit">
                            <button
                              onClick={() => setPlanBillingPeriods(prev => ({ ...prev, [plan.id]: 'monthly' }))}
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200",
                                billingPeriod === 'monthly' ? "bg-white text-zinc-900" : "text-zinc-500"
                              )}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => setPlanBillingPeriods(prev => ({ ...prev, [plan.id]: 'yearly' }))}
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200",
                                billingPeriod === 'yearly' ? "bg-white text-zinc-900" : "text-zinc-500"
                              )}
                            >
                              Yearly -20%
                            </button>
                          </div>
                        )}

                        <div className="mb-4">
                          <div className="flex items-baseline gap-1.5">
                            {isCustom ? (
                              <span className="text-2xl font-bold text-zinc-900">Custom</span>
                            ) : hasDiscount ? (
                              <>
                                <span className="text-lg line-through text-zinc-400">
                                  ${billingPeriod === 'yearly' ? totalYearlyPrice : displayPrice}
                                </span>
                                <span className="text-2xl font-bold text-zinc-900">
                                  {discountedPrice === 0 ? 'FREE' : `$${discountedPrice}`}
                                </span>
                              </>
                            ) : (
                              <span className="text-2xl font-bold text-zinc-900">${displayPrice}</span>
                            )}
                            {!isCustom && discountedPrice > 0 && (
                              <span className="text-xs text-zinc-500">/mo</span>
                            )}
                          </div>
                          {billingPeriod === 'yearly' && !isCustom && !hasDiscount && (
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              ${totalYearlyPrice}/year (save ${(monthlyPrice - yearlyPrice) * 12})
                            </div>
                          )}
                          {hasDiscount && discountedPrice === 0 && (
                            <div className="text-[11px] text-green-600 font-medium mt-0.5">
                              100% off with code
                            </div>
                          )}
                        </div>

                        <div className="mb-3 rounded-lg bg-zinc-50 border border-zinc-100 p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 mb-1">Output</div>
                          <div className="text-xs text-zinc-800">{isCustom ? 'Custom credit scale' : `${plan.credits_monthly.toLocaleString()} credits/month`}</div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="font-medium text-zinc-900">Tool access</div>
                            <div className="text-zinc-600">{outcome.capability}</div>
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900">Intelligence layer</div>
                            <div className="text-zinc-600">{outcome.intelligence}</div>
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900">Automation depth</div>
                            <div className="text-zinc-600">{outcome.automation}</div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
                          Not included: {outcome.excluded}
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          variant={isPopular ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => isCustom ? window.location.href = 'mailto:hello@letscolab.in?subject=Enterprise%20plan%20inquiry' : handleSubscribe(plan.id, plan.name)}
                          disabled={processingPlanId === plan.id || isCurrentPlan}
                          className={cn(
                            "w-full text-xs h-9",
                            isPopular ? 'bg-zinc-950 hover:bg-zinc-800 text-white' : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300'
                          )}
                        >
                          {processingPlanId === plan.id ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Processing...
                            </>
                          ) : isCustom ? (
                            'Contact Sales'
                          ) : isCurrentPlan ? (
                            'Current Plan'
                          ) : hasDiscount && discountedPrice === 0 ? (
                            'Activate Free'
                          ) : isUpgrade ? (
                            'Upgrade'
                          ) : isDowngrade ? (
                            'Downgrade'
                          ) : (
                            'Get Started'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-[10px] text-muted-foreground">
                No free product access. A paid plan is required to use Canvas, Cosmo, Covex and Cogent.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/pricing');
                }}
              >
                View full pricing details →
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
