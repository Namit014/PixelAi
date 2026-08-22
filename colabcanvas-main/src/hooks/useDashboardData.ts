import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch functions - exported for prefetching
export const fetchCredits = async (userId: string) => {
  const { data, error } = await supabase
    .from('credits')
    .select('balance, subscription_tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || { balance: 0, subscription_tier: 'free' };
};

export const fetchProjects = async (userId: string, sortBy: 'recent' | 'date') => {
  const orderColumn = sortBy === 'recent' ? 'last_accessed_at' : 'created_at';
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, thumbnail_url, updated_at, created_at, last_accessed_at, brand_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order(orderColumn, { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Batch fetch all collaborators in ONE query instead of N+1
  const projectIds = data.map(p => p.id);
  const { data: allCollabs } = await supabase
    .from('project_collaborators')
    .select('project_id, user_id')
    .in('project_id', projectIds);

  if (!allCollabs || allCollabs.length === 0) {
    return data.map(p => ({ ...p, collaborators: [] }));
  }

  // Batch fetch all collaborator profiles in ONE query
  const uniqueUserIds = [...new Set(allCollabs.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', uniqueUserIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Group collabs by project
  const collabsByProject = new Map<string, typeof allCollabs>();
  for (const c of allCollabs) {
    if (!collabsByProject.has(c.project_id)) collabsByProject.set(c.project_id, []);
    collabsByProject.get(c.project_id)!.push(c);
  }

  return data.map(project => ({
    ...project,
    collaborators: (collabsByProject.get(project.id) || []).slice(0, 5).map(c => {
      const profile = profileMap.get(c.user_id);
      return {
        id: c.user_id,
        full_name: profile?.full_name || 'Collaborator',
        avatar_url: profile?.avatar_url || null
      };
    })
  }));
};

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchBrands = async (userId: string) => {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      id,
      name,
      slug,
      description,
      logo_primary_url,
      created_at,
      updated_at,
      brand_sections (
        id,
        section_name,
        brand_content_blocks (
          id,
          block_type,
          content
        )
      )
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export function useDashboardData(userId: string | undefined, sortBy: 'recent' | 'date') {
  const creditsQuery = useQuery({
    queryKey: ['user-credits', userId],
    queryFn: () => fetchCredits(userId!),
    staleTime: 60_000, // 1 minute cache
    gcTime: 5 * 60_000, // 5 minute garbage collection
    enabled: !!userId,
  });

  const projectsQuery = useQuery({
    queryKey: ['user-projects', userId, sortBy],
    queryFn: () => fetchProjects(userId!, sortBy),
    staleTime: 30_000, // 30 second cache
    gcTime: 5 * 60_000,
    enabled: !!userId,
  });

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchProfile(userId!),
    staleTime: 300_000, // 5 minute cache
    gcTime: 10 * 60_000,
    enabled: !!userId,
  });

  return {
    credits: creditsQuery.data,
    projects: projectsQuery.data || [],
    profile: profileQuery.data,
    isLoading: creditsQuery.isLoading || projectsQuery.isLoading,
    isProjectsLoading: projectsQuery.isLoading,
    refetchProjects: projectsQuery.refetch,
  };
}

export function useBrandsData(userId: string | undefined) {
  return useQuery({
    queryKey: ['brands', userId],
    queryFn: () => fetchBrands(userId!),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: !!userId,
  });
}

// Fetch presentations for unified dashboard
export const fetchPresentations = async (userId: string) => {
  const { data, error } = await supabase
    .from('presentations')
    .select('id, title, updated_at, created_at, theme_id, slides')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
};

export function usePresentationsData(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-presentations', userId],
    queryFn: () => fetchPresentations(userId!),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!userId,
  });
}

// Fetch covex (workflow) projects for unified dashboard
export const fetchCovex = async (userId: string) => {
  const { data, error } = await supabase
    .from('workflows')
    .select('id, title, created_at, updated_at, is_template, is_public')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
};

export function useCovexData(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-covex', userId],
    queryFn: () => fetchCovex(userId!),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!userId,
  });
}

// Hook to prefetch data for navigation
export function usePrefetchNavigation() {
  const queryClient = useQueryClient();
  
  const prefetchDashboard = (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['user-projects', userId, 'recent'],
      queryFn: () => fetchProjects(userId, 'recent'),
      staleTime: 30_000,
    });
    queryClient.prefetchQuery({
      queryKey: ['user-credits', userId],
      queryFn: () => fetchCredits(userId),
      staleTime: 60_000,
    });
  };

  const prefetchBrands = (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['brands', userId],
      queryFn: () => fetchBrands(userId),
      staleTime: 60_000,
    });
  };

  return { prefetchDashboard, prefetchBrands };
}
