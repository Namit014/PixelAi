import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Lock, CheckCircle2, Clock, Loader2, Building2, ArrowDownToLine, ShieldCheck, ShieldAlert, ScanFace } from 'lucide-react';
import { toast } from 'sonner';
import { BankVerifySheet } from './BankVerifySheet';
import { KycSheet } from './KycSheet';

interface Account {
  id: string;
  country: string;
  currency: string;
  account_holder: string;
  bank_name: string;
  account_number_last4: string;
  routing_or_ifsc: string | null;
  swift: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'failed';
  verification_method?: string | null;
  verification_details?: any;
}
interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider_ref: string | null;
  requested_at: string;
  processed_at: string | null;
}

export const EscrowWalletCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [released, setReleased] = useState(0);
  const [locked, setLocked] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'submitted' | 'verified' | 'rejected'>('unverified');
  const [bankOpen, setBankOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [esc, acc, po, kyc] = await Promise.all([
      supabase.from('talent_escrow').select('amount, status').eq('freelancer_id', user.id),
      supabase.from('talent_payout_accounts').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('talent_payouts').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }).limit(10),
      supabase.from('talent_kyc').select('status').eq('user_id', user.id).maybeSingle(),
    ]);
    const escrows = esc.data ?? [];
    setLocked(escrows.filter((e: any) => e.status === 'locked').reduce((s: number, e: any) => s + e.amount, 0));
    setReleased(escrows.filter((e: any) => e.status === 'released').reduce((s: number, e: any) => s + e.amount, 0));
    setPendingPayout((po.data ?? []).filter((p: any) => p.status === 'pending' || p.status === 'processing').reduce((s: number, p: any) => s + p.amount, 0));
    setAccount(acc.data as any);
    setPayouts((po.data ?? []) as any);
    setKycStatus(((kyc.data as any)?.status as any) ?? 'unverified');
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const available = Math.max(0, released - pendingPayout - payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0));
  const bankVerified = account?.verification_status === 'verified';
  const kycVerified = kycStatus === 'verified';
  const canWithdraw = available > 0 && bankVerified && kycVerified;

  const tryWithdraw = () => {
    if (!account) { setBankOpen(true); return; }
    if (!bankVerified) { setBankOpen(true); toast.message('Verify your bank first'); return; }
    if (!kycVerified) { setKycOpen(true); toast.message('Verify your identity to withdraw'); return; }
    setWithdrawOpen(true);
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-zinc-700 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Escrow wallet</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-900">${available.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">Available to withdraw</div>
          </div>
          <Button
            onClick={tryWithdraw}
            disabled={available <= 0 && bankVerified && kycVerified}
            className="bg-zinc-900 hover:bg-zinc-800 rounded-full"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            {!account ? 'Add bank account' : !bankVerified ? 'Verify bank' : !kycVerified ? 'Verify identity' : 'Withdraw to bank'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1"><Lock className="w-3 h-3" /> In escrow</div>
            <div className="text-sm font-medium text-zinc-900 mt-0.5">${locked.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Released</div>
            <div className="text-sm font-medium text-zinc-900 mt-0.5">${released.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending payout</div>
            <div className="text-sm font-medium text-zinc-900 mt-0.5">${pendingPayout.toLocaleString()}</div>
          </div>
        </div>

        {/* Verification status row */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setBankOpen(true)}
            className={`text-left flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
              bankVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
              account ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' :
              'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {bankVerified ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {bankVerified ? 'Bank verified' : account ? 'Bank pending verification' : 'Add bank account'}
              </div>
              <div className="opacity-70 truncate">
                {account ? `${account.bank_name} ···· ${account.account_number_last4}` : 'Required to withdraw'}
              </div>
            </div>
          </button>
          <button
            onClick={() => setKycOpen(true)}
            className={`text-left flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
              kycVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
              kycStatus === 'submitted' ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' :
              'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {kycVerified ? <ShieldCheck className="w-4 h-4" /> : <ScanFace className="w-4 h-4" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {kycVerified ? 'Identity verified' : kycStatus === 'submitted' ? 'KYC under review' : 'Verify identity (KYC)'}
              </div>
              <div className="opacity-70 truncate">
                {kycVerified ? 'You can withdraw funds' : 'AI-verified ID + selfie · ~30 seconds'}
              </div>
            </div>
          </button>
        </div>

        {payouts.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Recent withdrawals</div>
            <div className="space-y-1.5">
              {payouts.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="text-zinc-700">{new Date(p.requested_at).toLocaleDateString()}</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      p.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>{p.status}</span>
                    <span className="font-medium text-zinc-900">${p.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <BankVerifySheet open={bankOpen} onOpenChange={setBankOpen} existing={account} onSaved={load} />
      <KycSheet open={kycOpen} onOpenChange={setKycOpen} onVerified={load} />
      <WithdrawSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        available={available}
        accountId={account?.id}
        currency={account?.currency || 'USD'}
        onSubmitted={load}
      />
    </>
  );
};

const WithdrawSheet = ({ open, onOpenChange, available, accountId, currency, onSubmitted }: any) => {
  const [amt, setAmt] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setAmt(String(available)); }, [open, available]);

  const submit = async () => {
    const n = Number(amt);
    if (!n || n <= 0) { toast.error('Enter an amount'); return; }
    if (n > available) { toast.error('Exceeds available balance'); return; }
    if (!accountId) { toast.error('Add a bank account first'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('request_talent_payout', { _payout_account_id: accountId, _amount: n });
      if (error) {
        if (/BANK_NOT_VERIFIED/.test(error.message)) { toast.error('Verify your bank first'); return; }
        if (/KYC_NOT_VERIFIED/.test(error.message)) { toast.error('Verify your identity first'); return; }
        throw error;
      }
      toast.success('Withdrawal requested. Funds arrive in 2–5 business days.');
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) { toast.error(e.message ?? 'Request failed'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader><SheetTitle>Withdraw to bank</SheetTitle></SheetHeader>
        <div className="mt-6 space-y-3">
          <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Available</div>
            <div className="text-xl font-semibold text-zinc-900">{currency} {available.toLocaleString()}</div>
          </div>
          <div>
            <Label>Amount ({currency})</Label>
            <Input type="number" value={amt} onChange={e => setAmt(e.target.value)} max={available} min={1} />
          </div>
          <p className="text-[11px] text-zinc-500">No fee. Funds arrive in 2–5 business days. We email you a receipt.</p>
          <Button onClick={submit} disabled={busy} className="w-full bg-zinc-900 hover:bg-zinc-800">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request withdrawal'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
