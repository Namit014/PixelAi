import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Sparkles, UserPlus, FolderKanban, Workflow, Palette, CreditCard } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'project_created' | 'workflow_created' | 'brand_created' | 'payment_success' | 'generation_success' | 'generation_failed';
  description: string;
  timestamp: string;
  user_id?: string;
  user_name?: string;
}

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Set up real-time updates for multiple tables
    const profilesChannel = supabase
      .channel('activity-profiles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => loadActivities()
      )
      .subscribe();

    const projectsChannel = supabase
      .channel('activity-projects')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        () => loadActivities()
      )
      .subscribe();

    const workflowsChannel = supabase
      .channel('activity-workflows')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workflows' },
        () => loadActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(workflowsChannel);
    };
  }, []);

  const loadActivities = async () => {
    try {
      const allActivities: ActivityItem[] = [];

      // Load recent user signups
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (profiles) {
        profiles.forEach(p => {
          allActivities.push({
            id: `signup-${p.id}`,
            type: 'user_signup',
            description: `${p.full_name || p.email || 'New user'} signed up`,
            timestamp: p.created_at,
            user_id: p.id,
            user_name: p.full_name || p.email || undefined,
          });
        });
      }

      // Load recent projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, created_at, user_id, profiles(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (projects) {
        projects.forEach(p => {
          const profile = p.profiles as any;
          allActivities.push({
            id: `project-${p.id}`,
            type: 'project_created',
            description: `${profile?.full_name || 'User'} created "${p.title}"`,
            timestamp: p.created_at,
            user_id: p.user_id,
            user_name: profile?.full_name || undefined,
          });
        });
      }

      // Load recent workflows
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, title, created_at, user_id, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (workflows) {
        workflows.forEach(w => {
          const profile = w.profiles as any;
          allActivities.push({
            id: `workflow-${w.id}`,
            type: 'workflow_created',
            description: `${profile?.full_name || 'User'} created workflow "${w.title}"`,
            timestamp: w.created_at,
            user_id: w.user_id,
            user_name: profile?.full_name || undefined,
          });
        });
      }

      // Load recent brands
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, created_at, user_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (brands) {
        brands.forEach(b => {
          allActivities.push({
            id: `brand-${b.id}`,
            type: 'brand_created',
            description: `New brand "${b.name}" created`,
            timestamp: b.created_at!,
            user_id: b.user_id,
          });
        });
      }

      // Load recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, created_at, user_id, status')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(10);

      if (payments) {
        payments.forEach(p => {
          allActivities.push({
            id: `payment-${p.id}`,
            type: 'payment_success',
            description: `Payment of ₹${p.amount} received`,
            timestamp: p.created_at,
            user_id: p.user_id,
          });
        });
      }

      // Sort all activities by timestamp (most recent first)
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 20));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'project_created':
        return <FolderKanban className="w-4 h-4 text-purple-500" />;
      case 'workflow_created':
        return <Workflow className="w-4 h-4 text-cyan-500" />;
      case 'brand_created':
        return <Palette className="w-4 h-4 text-orange-500" />;
      case 'payment_success':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'generation_success':
        return <Sparkles className="w-4 h-4 text-green-500" />;
      case 'generation_failed':
        return <Activity className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-100">Live Activity</h3>
        <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-zinc-400">Live</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="p-1.5 bg-zinc-800 rounded-lg mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 line-clamp-2">
                  {activity.description}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {getRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
