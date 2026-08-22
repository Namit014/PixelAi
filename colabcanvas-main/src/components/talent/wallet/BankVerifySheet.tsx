import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: Account | null;
  onSaved: () => void;
}

const COUNTRIES = [
  { code: 'US', label: 'United States', currency: 'USD', routingLabel: 'ABA Routing (9 digits)' },
  { code: 'IN', label: 'India', currency: 'INR', routingLabel: 'IFSC Code' },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP', routingLabel: 'IBAN' },
  { code: 'DE', label: 'Germany', currency: 'EUR', routingLabel: 'IBAN' },
  { code: 'FR', label: 'France', currency: 'EUR', routingLabel: 'IBAN' },
  { code: 'NL', label: 'Netherlands', currency: 'EUR', routingLabel: 'IBAN' },
  { code: 'OTHER', label: 'Other (SWIFT)', currency: 'USD', routingLabel: 'SWIFT/BIC' },
];

export const BankVerifySheet = ({ open, onOpenChange, existing, onSaved }: Props) => {
  const { user } = useAuth();
  const [country, setCountry] = useState(existing?.country || 'US');
  const [currency, setCurrency] = useState(existing?.currency || 'USD');
  const [holder, setHolder] = useState(existing?.account_holder || '');
  const [bank, setBank] = useState(existing?.bank_name || '');
  const [acctNum, setAcctNum] = useState('');
  const [routing, setRouting] = useState(existing?.routing_or_ifsc || '');
  const [swift, setSwift] = useState(existing?.swift || '');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; method?: string; bank_name?: string; reason?: string } | null>(null);

  useEffect(() => {
    if (existing) {
      setCountry(existing.country);
      setCurrency(existing.currency);
      setHolder(existing.account_holder);
      setBank(existing.bank_name);
      setRouting(existing.routing_or_ifsc || '');
      setSwift(existing.swift || '');
      setVerifyResult(null);
    }
  }, [existing, open]);

  const onCountryChange = (code: string) => {
    setCountry(code);
    const c = COUNTRIES.find(x => x.code === code);
    if (c) setCurrency(c.currency);
    setVerifyResult(null);
  };

  const countryConfig = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

  const verifyAndSave = async () => {
    if (!holder || !bank || !acctNum) { toast.error('Please fill required fields'); return; }
    if (acctNum.length < 4) { toast.error('Account number too short'); return; }
    setBusy(true);
    setVerifying(true);
    setVerifyResult(null);
    try {
      // Save first (so verify can update by id)
      const last4 = acctNum.slice(-4);
      const obf = btoa(acctNum + ':' + (user?.id || ''));
      const payload = {
        user_id: user!.id, country, currency, account_holder: holder,
        bank_name: bank, account_number_last4: last4, account_number_encrypted: obf,
        routing_or_ifsc: routing || null, swift: swift || null,
        verification_status: 'pending' as const,
      };

      let accountId = existing?.id;
      if (accountId) {
        const { error } = await supabase.from('talent_payout_accounts').update(payload).eq('id', accountId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('talent_payout_accounts').insert(payload).select('id').single();
        if (error) throw error;
        accountId = data.id;
      }

      // Verify via edge function
      const { data: vData, error: vErr } = await supabase.functions.invoke('verify-bank-account', {
        body: {
          account_id: accountId,
          country,
          routing_or_ifsc: routing || null,
          swift: swift || null,
          account_holder: holder,
          bank_name: bank,
        },
      });
      if (vErr) throw vErr;
      const v = vData as any;
      setVerifyResult(v);
      if (v?.verified) {
        toast.success('Bank account verified');
        onSaved?.();
        setTimeout(() => onOpenChange(false), 1200);
      } else {
        toast.message('Saved. Manual review pending.', { description: v?.reason ?? 'We will verify within 1 business day.' });
        onSaved?.();
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    } finally {
      setBusy(false);
      setVerifying(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existing ? 'Edit & verify bank account' : 'Add & verify bank account'}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {existing?.verification_status === 'verified' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 inline-flex items-center gap-2 w-full">
              <CheckCircle2 className="w-4 h-4" /> This account is verified ({existing.verification_method ?? 'auto'})
            </div>
          )}

          <div>
            <Label>Country</Label>
            <select
              value={country}
              onChange={e => onCountryChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-white text-sm"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Currency</Label><Input value={currency} onChange={e => setCurrency(e.target.value)} /></div>
            <div><Label>Account holder *</Label><Input value={holder} onChange={e => setHolder(e.target.value)} /></div>
          </div>

          <div><Label>Bank name *</Label><Input value={bank} onChange={e => setBank(e.target.value)} /></div>
          <div>
            <Label>Account number / IBAN *</Label>
            <Input value={acctNum} onChange={e => setAcctNum(e.target.value)} placeholder={existing ? `Re-enter to update (last4: ${existing.account_number_last4})` : ''} />
          </div>

          {country !== 'OTHER' && (
            <div>
              <Label>{countryConfig.routingLabel}</Label>
              <Input value={routing} onChange={e => setRouting(e.target.value)} placeholder={country === 'US' ? '021000021' : country === 'IN' ? 'HDFC0001234' : 'GB29NWBK60161331926819'} />
            </div>
          )}
          {(country === 'OTHER' || country === 'GB' || country === 'DE' || country === 'FR' || country === 'NL') && (
            <div>
              <Label>SWIFT / BIC {country === 'OTHER' ? '*' : '(optional)'}</Label>
              <Input value={swift} onChange={e => setSwift(e.target.value)} placeholder="DEUTDEFF" />
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
            <span>We verify bank details automatically using public bank registries (ABA / IFSC / IBAN). SWIFT-only accounts are reviewed manually within 1 business day. We never store your full account number.</span>
          </div>

          {verifyResult && (
            <div className={`rounded-lg border p-3 text-xs ${verifyResult.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <div className="font-medium inline-flex items-center gap-1.5">
                {verifyResult.verified ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {verifyResult.verified ? 'Verified automatically' : 'Manual review required'}
              </div>
              {verifyResult.bank_name && <div className="mt-1">Bank: {verifyResult.bank_name}</div>}
              {verifyResult.reason && <div className="mt-1 opacity-80">{verifyResult.reason}</div>}
            </div>
          )}

          <Button onClick={verifyAndSave} disabled={busy} className="w-full bg-zinc-900 hover:bg-zinc-800">
            {verifying ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying…</>) : 'Save & verify'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
