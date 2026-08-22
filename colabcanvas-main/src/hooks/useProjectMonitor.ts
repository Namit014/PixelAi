import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Project {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_primary_url: string | null;
  industry: string | null;
  created_at: string;
}

export interface ProjectActivity {
  projectId: string;
  projectTitle: string;
  lastActivity: Date;
  artboardCount: number;
}

export function useProjectMonitor() {
  const { user } = useAuth();
  const [realtimeActivity, setRealtimeActivity] = useState<ProjectActivity[]>([]);

  // Fetch user's projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, thumbnail_url, created_at, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Project[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's brands
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['user-brands', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, slug, description, logo_primary_url, industry, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as Brand[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch design asset counts per project (images, videos)
  const { data: projectStats = {} } = useQuery({
    queryKey: ['project-asset-stats', user?.id],
    queryFn: async () => {
      if (!user?.id || projects.length === 0) return {};
      
      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('design_assets')
        .select('project_id')
        .in('project_id', projectIds)
        .in('asset_type', ['image', 'video']);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach(a => {
        if (a.project_id) {
          counts[a.project_id] = (counts[a.project_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user?.id && projects.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Subscribe to realtime project updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('project-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artboards',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const projectId = (payload.new as any)?.project_id || (payload.old as any)?.project_id;
          if (projectId) {
            const project = projects.find(p => p.id === projectId);
            if (project) {
              setRealtimeActivity(prev => {
                const existing = prev.find(a => a.projectId === projectId);
                const updated = {
                  projectId,
                  projectTitle: project.title,
                  lastActivity: new Date(),
                  artboardCount: existing?.artboardCount || 1,
                };
                return [updated, ...prev.filter(a => a.projectId !== projectId)].slice(0, 5);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, projects]);

  return {
    projects,
    projectsLoading,
    brands,
    brandsLoading,
    projectStats,
    realtimeActivity,
  };
}
