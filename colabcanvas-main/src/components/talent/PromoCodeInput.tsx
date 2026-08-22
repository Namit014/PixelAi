import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  subtotal: number;
  projectId: string;
  onApplied: (result: { promo_id: string; code: string; discount_amount: number; new_total: number }) => void;
  appliedCode?: string;
  onClear?: () => void;
}

export const PromoCodeInput = ({ subtotal, projectId, onApplied, appliedCode, onClear }: Props) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('talent-apply-promo', {
        body: { code: code.trim(), subtotal, project_id: projectId },
      });
      if (error) throw error;
      if (!(data as any).valid) {
        toast.error((data as any).error || 'Invalid code');
      } else {
        onApplied(data as any);
        toast.success(`${(data as any).code} applied — saved $${(data as any).discount_amount}`);
        setCode('');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Could not apply code');
    } finally {
      setBusy(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
        <Check className="w-4 h-4 text-emerald-700" />
        <span className="font-medium text-emerald-900">{appliedCode} applied</span>
        {onClear && <button onClick={onClear} className="ml-auto text-xs text-emerald-700 hover:underline">Remove</button>}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="Promo code"
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg uppercase"
        />
      </div>
      <Button onClick={apply} disabled={busy || !code.trim()} variant="outline">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
      </Button>
    </div>
  );
};
