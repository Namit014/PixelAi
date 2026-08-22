import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Sparkles,
  FileImage,
  Wand2,
  Lock,
  Undo2,
  Users2,
  Wallet,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type EventType =
  | 'addition'
  | 'deduction'
  | 'generation'
  | 'vectorization'
  | 'collateral'
  | 'video_generation'
  | 'image_edit'
  | 'talent_deduction'
  | 'talent_payout'
  | 'escrow_lock'
  | 'escrow_refund'
  | 'refund'
  | 'bonus'
  | 'subscription';

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: EventType;
  description: string;
  created_at: string;
  balance_after: number | null;
  metadata?: Record<string, any> | null;
}

const isCredit = (t: EventType) =>
  t === 'addition' || t === 'bonus' || t === 'refund' || t === 'escrow_refund' || t === 'talent_payout' || t === 'subscription';

const eventLabel: Record<EventType, string> = {
  addition: 'Top-up',
  deduction: 'Deduction',
  generation: 'AI Generation',
  vectorization: 'Vectorize',
  collateral: 'Collateral',
  video_generation: 'Video Generation',
  image_edit: 'Image Edit',
  talent_deduction: 'Talent Spend',
  talent_payout: 'Talent Payout',
  escrow_lock: 'Escrow Lock',
  escrow_refund: 'Escrow Refund',
  refund: 'Refund',
  bonus: 'Bonus',
  subscription: 'Subscription',
};

const eventIcon = (t: EventType) => {
  switch (t) {
    case 'generation': return Sparkles;
    case 'vectorization': return Wand2;
    case 'collateral': return FileImage;
    case 'video_generation': return Sparkles;
    case 'image_edit': return Wand2;
    case 'escrow_lock': return Lock;
    case 'escrow_refund': return Undo2;
    case 'talent_payout':
    case 'talent_deduction': return Users2;
    case 'addition':
    case 'bonus':
    case 'subscription':
    case 'refund': return ArrowUpCircle;
    default: return ArrowDownCircle;
  }
};

const eventTone = (t: EventType) => isCredit(t)
  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
  : 'text-rose-700 bg-rose-50 border-rose-200';

export const CreditHistorySection = () => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credits' | 'spend'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  useEffect(() => {
    loadTransactions();
    loadBalance();
  }, [filter, typeFilter]);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('credits').select('balance').eq('user_id', user.id).maybeSingle();
    if (data) setCurrentBalance((data as any).balance ?? 0);
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data || []) as CreditTransaction[];
      if (filter === 'credits') rows = rows.filter(r => isCredit(r.transaction_type));
      if (filter === 'spend') rows = rows.filter(r => !isCredit(r.transaction_type));
      setTransactions(rows);
    } catch (error) {
      console.error('Error loading credit transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = transactions.reduce(
    (acc, t) => {
      if (isCredit(t.transaction_type)) acc.credited += t.amount;
      else acc.spent += t.amount;
      return acc;
    },
    { credited: 0, spent: 0 },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Credits Ledger</h1>
          <p className="text-sm text-zinc-600">Every generation, vectorization, and collateral request — with running balance.</p>
        </div>
        <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Credits Ledger</h1>
        <p className="text-sm text-zinc-600">Every generation, vectorization, and collateral request — with running balance.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-zinc-700" /> Current balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{currentBalance ?? '—'}</div>
            <div className="text-xs text-zinc-500 mt-1">credits available</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-600" /> Credited (recent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">+{summary.credited}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-rose-600" /> Spent (recent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">-{summary.spent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['all', 'credits', 'spend'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'credits' ? 'Credits in' : 'Credits out'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {(Object.keys(eventLabel) as EventType[]).map(t => (
                <SelectItem key={t} value={t}>{eventLabel[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>{transactions.length} events</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-600 font-medium">No events yet</p>
              <p className="text-sm text-zinc-500">Every generation, vectorization, or collateral request will show up here.</p>
            </div>
          ) : (
            <ScrollArea className="h-[560px] pr-4">
              <div className="space-y-2">
                {transactions.map((t) => {
                  const Icon = eventIcon(t.transaction_type);
                  const credit = isCredit(t.transaction_type);
                  const meta = t.metadata || {};
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`mt-0.5 p-2 rounded-lg border ${eventTone(t.transaction_type)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-900 text-sm truncate">{t.description}</span>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{eventLabel[t.transaction_type] ?? t.transaction_type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                            <span>{format(new Date(t.created_at), 'MMM dd, yyyy • HH:mm')}</span>
                            {meta?.model && <span>• {meta.model}</span>}
                            {meta?.project_id && <span className="truncate">• project {String(meta.project_id).slice(0, 8)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${credit ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {credit ? '+' : '-'}{t.amount}
                        </div>
                        {t.balance_after !== null && t.balance_after !== undefined && (
                          <div className="text-[11px] text-zinc-500">balance {t.balance_after}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
