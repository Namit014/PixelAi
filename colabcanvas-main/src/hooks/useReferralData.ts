import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  is_active: boolean;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code_id: string;
  status: string;
  credited_amount: number;
  revenue_share_amount: number;
  revenue_share_percent: number;
  plan_purchased: string | null;
  signed_up_at: string | null;
  converted_at: string | null;
  created_at: string;
  referred_profile?: { email: string; full_name: string } | null;
}

export interface ReferralEarnings {
  id: string;
  user_id: string;
  total_credits_earned: number;
  total_revenue_earned: number;
  pending_payout: number;
  paid_out: number;
  total_referrals: number;
  successful_conversions: number;
  updated_at: string;
}

export const useReferralData = () => {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<ReferralEarnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [codeRes, referralsRes, earningsRes] = await Promise.all([
      supabase.from('referral_codes').select('*').eq('user_id', user.id).single(),
      supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('referral_earnings').select('*').eq('user_id', user.id).single(),
    ]);

    if (codeRes.data) setReferralCode(codeRes.data as unknown as ReferralCode);
    if (referralsRes.data) setReferrals(referralsRes.data as unknown as Referral[]);
    if (earningsRes.data) setEarnings(earningsRes.data as unknown as ReferralEarnings);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('referral-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_earnings' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { referralCode, referrals, earnings, isLoading, refetch: loadData };
};
