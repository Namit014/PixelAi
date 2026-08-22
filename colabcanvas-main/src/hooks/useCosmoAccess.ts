import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCosmoAccess() {
  const { user } = useAuth();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['cosmo-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('cosmo_access')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking cosmo access:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    hasAccess: hasAccess ?? false,
    isLoading,
  };
}
