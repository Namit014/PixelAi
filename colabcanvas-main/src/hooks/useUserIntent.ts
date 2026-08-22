import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type IntentValue = 'client' | 'freelancer' | 'agency' | 'undecided';

export interface UserIntentState {
  intent: IntentValue;
  completed_at: string | null;
}

export interface ClientProfileState {
  exists: boolean;
  completion_state: 'pending' | 'partial' | 'complete';
  data: any | null;
}

export interface FreelancerProfileState {
  exists: boolean;
  completion_state: 'pending' | 'partial' | 'complete';
  vetting_status: string;
  data: any | null;
}

export interface AgencyProfileState {
  exists: boolean;
  completion_state: 'pending' | 'partial' | 'complete';
  vetting_status: string;
  data: any | null;
}

export const useUserIntent = () => {
  const { user } = useAuth();
  const [intent, setIntent] = useState<UserIntentState>({ intent: 'undecided', completed_at: null });
  const [clientProfile, setClientProfile] = useState<ClientProfileState>({
    exists: false,
    completion_state: 'pending',
    data: null,
  });
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfileState>({
    exists: false,
    completion_state: 'pending',
    vetting_status: 'pending',
    data: null,
  });
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfileState>({
    exists: false,
    completion_state: 'pending',
    vetting_status: 'pending',
    data: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [intentRes, clientRes, freelancerRes, agencyRes] = await Promise.all([
        supabase.from('user_intent').select('intent, completed_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('freelancer_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('agency_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      setIntent({
        intent: (intentRes.data?.intent as IntentValue) ?? 'undecided',
        completed_at: intentRes.data?.completed_at ?? null,
      });

      setClientProfile({
        exists: !!clientRes.data,
        completion_state: (clientRes.data?.completion_state as any) ?? 'pending',
        data: clientRes.data,
      });

      setFreelancerProfile({
        exists: !!freelancerRes.data,
        completion_state: (freelancerRes.data?.completion_state as any) ?? 'pending',
        vetting_status: freelancerRes.data?.vetting_status ?? 'pending',
        data: freelancerRes.data,
      });

      setAgencyProfile({
        exists: !!agencyRes.data,
        completion_state: (agencyRes.data?.completion_state as any) ?? 'pending',
        vetting_status: (agencyRes.data as any)?.vetting_status ?? 'pending',
        data: agencyRes.data,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setIntentValue = useCallback(
    async (value: IntentValue) => {
      if (!user?.id) return;
      const completed_at = value === 'undecided' ? null : new Date().toISOString();
      const { error } = await supabase
        .from('user_intent')
        .upsert({ user_id: user.id, intent: value, completed_at }, { onConflict: 'user_id' });
      if (error) throw error;
      setIntent({ intent: value, completed_at });
    },
    [user?.id],
  );

  return {
    intent: intent.intent,
    intentRecord: intent,
    clientProfile,
    freelancerProfile,
    agencyProfile,
    loading,
    refresh,
    setIntent: setIntentValue,
  };
};
