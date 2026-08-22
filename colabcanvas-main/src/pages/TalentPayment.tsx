import { useParams, useNavigate } from 'react-router-dom';
import { useTalentProject } from '@/hooks/useTalentProject';
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, ArrowRight, CheckCircle2, AlertCircle, CreditCard, RotateCcw, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PromoCodeInput } from '@/components/talent/PromoCodeInput';
import { toast } from 'sonner';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';

type PlanType = 'full' | 'split-50-50' | 'split-40-30-30';

const TalentPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, loading, refresh } = useTalentProject(id);
  const [credits, setCredits] = useState<{ talent_balance: number } | null>(null);
  const [planType, setPlanType] = useState<PlanType>('full');
  const [promo, setPromo] = useState<{ promo_id: string; code: string; discount_amount: number; new_total: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Stable idempotency key for this payment attempt — prevents duplicate inserts on rapid clicks.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  // Hard mutex against synchronous double-fires.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('credits').select('talent_balance').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setCredits(data as any);
    });
  }, [user]);

  if (loading || !project) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  // If already paid, jump straight to the workspace.
  if (['paid', 'active', 'completed'].includes(project.status)) {
    navigate(`/talent/projects/${id}`, { replace: true });
    return null;
  }

  if (!(project as any).client_signed_at) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h2 className="font-semibold text-zinc-900">Contract must be signed first</h2>
          <p className="text-sm text-zinc-600 mt-1">Sign the contract on the project page to unlock payment.</p>
          <Button className="mt-4 bg-zinc-900 hover:bg-zinc-800" onClick={() => navigate(`/talent/projects/${id}`)}>
            Back to project
          </Button>
        </Card>
      </div>
    );
  }

  const subtotal = project.pricing?.total ?? 0;
  const discount = promo?.discount_amount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const buildInstallments = () => {
    if (planType === 'full') return [{ label: 'Full payment', amount: total }];
    if (planType === 'split-50-50') return [
      { label: 'Kickoff (50%)', amount: Math.round(total * 0.5) },
      { label: 'Delivery (50%)', amount: total - Math.round(total * 0.5) },
    ];
    const a = Math.round(total * 0.4);
    const b = Math.round(total * 0.3);
    return [
      { label: 'Kickoff (40%)', amount: a },
      { label: 'Midpoint (30%)', amount: b },
      { label: 'Delivery (30%)', amount: total - a - b },
    ];
  };

  const installments = buildInstallments();
  const firstAmount = installments[0]?.amount ?? total;
  const insufficient = total > 0 && (!credits || credits.talent_balance < firstAmount);

  const goTopUp = () => {
    // Remember where to return after PayU redirect
    if (id) sessionStorage.setItem('talent_topup_return', id);
    navigate('/pricing');
  };

  const pay = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPaying(true);
    setLastError(null);
    try {
      const { data, error } = await supabase.functions.invoke('talent-lock-escrow', {
        body: {
          project_id: id,
          payment_plan: { type: planType, installments },
          promo_id: promo?.promo_id,
          idempotency_key: idempotencyKeyRef.current,
        },
      });
      if (error) {
        const ctx: any = (error as any)?.context;
        let serverMsg: string | undefined;
        if (ctx?.json) serverMsg = ctx.json?.error;
        else if (typeof ctx?.body === 'string') {
          try { serverMsg = JSON.parse(ctx.body)?.error; } catch { serverMsg = ctx.body; }
        }
        throw new Error(serverMsg || error.message || 'Could not reach payment service');
      }
      const d = data as any;
      if (d?.error) {
        if (d.code === 'INSUFFICIENT_FUNDS') {
          setLastError('Not enough talent credits — please top up first.');
          return;
        }
        throw new Error(d.error);
      }

      const replayed = !!d?.replayed;

      // Persist promo + discount on project (skip on replay — already persisted)
      if (promo && !replayed) {
        await supabase.from('talent_projects').update({
          promo_code: promo.code,
          discount_amount: promo.discount_amount,
        } as any).eq('id', id!);
      }

      // Compile creative brief asynchronously — only on first successful run
      if (!replayed) {
        supabase.functions.invoke('talent-compile-brief', {
          body: { project, conversation: [] },
        }).then(async ({ data: brief }) => {
          const b = brief as any;
          if (b?.brief_md) {
            await supabase.from('talent_projects').update({
              compiled_brief_md: b.brief_md,
              compiled_brief_json: b.brief_json,
              status: 'active',
            } as any).eq('id', id!);
          }
        }).catch(console.error);
      }

      // Auto-create the linked Canvas workspace shared with the assigned designer
      if (!replayed) {
        supabase.functions.invoke('talent-create-workspace', {
          body: { project_id: id },
        }).catch((err) => console.warn('[talent-create-workspace] non-fatal', err));
      }

      notifyAiComplete({ source: 'think', title: 'Project locked', message: 'Payment in escrow. Briefing compiled.' });
      toast.success(replayed ? 'Already locked — opening project' : 'Payment locked into escrow');
      navigate(`/talent/projects/${id}`);
    } catch (e: any) {
      console.error('[talent-lock-escrow] failed', e);
      const msg = e?.message ?? 'Payment failed';
      setLastError(msg);
      toast.error(msg, {
        description: 'You can safely retry — duplicate clicks won\'t double-charge.',
      });
    } finally {
      setPaying(false);
      inFlightRef.current = false;
      refresh();
    }
  };

  const retry = () => {
    // Same idempotency key → server replays cleanly, no duplicate work.
    pay();
  };

  const startFresh = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
    setLastError(null);
    pay();
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Payment</div>
        <h1 className="text-3xl font-medium text-zinc-900">Lock your team in</h1>
        <p className="text-sm text-zinc-600 mt-1">Funds go into escrow and release as milestones complete.</p>
      </div>

      {/* Wallet status */}
      <Card className="p-5 bg-zinc-50 border-zinc-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-zinc-700" />
            <div>
              <div className="text-xs text-zinc-500">Talent wallet balance</div>
              <div className="text-lg font-semibold text-zinc-900">${(credits?.talent_balance ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <Button variant="outline" onClick={goTopUp}>
            <CreditCard className="w-4 h-4 mr-2" /> Top up
          </Button>
        </div>
      </Card>

      {/* Payment plan */}
      <Card className="p-5">
        <h2 className="font-medium mb-3">Payment plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {([
            { v: 'full', label: 'Pay in full', sub: 'One payment now' },
            { v: 'split-50-50', label: '50 / 50', sub: 'Kickoff + delivery' },
            { v: 'split-40-30-30', label: '40 / 30 / 30', sub: 'Kickoff · midpoint · delivery' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              onClick={() => setPlanType(opt.v as PlanType)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${planType === opt.v ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              <div className="font-medium text-sm text-zinc-900">{opt.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          {installments.map((inst, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-zinc-700">{inst.label}{i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-700">Locks now</span>}</span>
              <span className="font-medium text-zinc-900">${inst.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Promo code */}
      <Card className="p-5">
        <h2 className="font-medium mb-3">Promo code</h2>
        <PromoCodeInput
          subtotal={subtotal}
          projectId={id!}
          onApplied={setPromo}
          appliedCode={promo?.code}
          onClear={() => setPromo(null)}
        />
      </Card>

      {/* Summary */}
      <Card className="p-5">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
          {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount ({promo?.code})</span><span>−${discount.toLocaleString()}</span></div>}
          <div className="flex justify-between text-base font-semibold text-zinc-900 pt-2 border-t border-zinc-200"><span>Total</span><span>${total.toLocaleString()}</span></div>
          <div className="flex justify-between text-xs text-zinc-500"><span>Locks now</span><span>${firstAmount.toLocaleString()}</span></div>
        </div>
      </Card>

      {insufficient && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5" />
            <div className="text-sm text-zinc-800">
              You need <strong>${firstAmount.toLocaleString()}</strong> in your talent wallet to lock the first installment.
              <Button variant="link" className="px-0 py-0 h-auto ml-1" onClick={goTopUp}>Top up now</Button>
            </div>
          </div>
        </Card>
      )}

      {lastError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-700 mt-0.5" />
            <div className="text-sm text-zinc-900 flex-1">
              <div className="font-medium">Payment couldn't complete</div>
              <div className="text-zinc-700 mt-0.5">{lastError}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={retry} disabled={paying} size="sm" className="bg-zinc-900 hover:bg-zinc-800">
              {paying ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-2" />}
              Try again
            </Button>
            <Button onClick={startFresh} disabled={paying} size="sm" variant="outline">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Start fresh
            </Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(`/talent/projects/${id}`)} disabled={paying} className="flex-1">Back</Button>
        <Button onClick={pay} disabled={paying || insufficient} className="flex-1 bg-zinc-900 hover:bg-zinc-800 h-12">
          {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Locking…</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Lock in escrow <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </div>
  );
};

export default TalentPayment;
