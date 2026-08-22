import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, HardDrive, Coins, Users, FolderKanban, Workflow, Palette } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface EnhancedStats {
  totalRevenue: number;
  totalUsers: number;
  activeUsers: number;
  userGrowthRate: number;
  totalStorageUsed: number;
  totalCredits: number;
  avgCreditsPerUser: number;
  totalProjects: number;
  totalWorkflows: number;
  totalBrands: number;
}

export const EnhancedStatsCards = () => {
  const [stats, setStats] = useState<EnhancedStats>({
    totalRevenue: 0,
    totalUsers: 0,
    activeUsers: 0,
    userGrowthRate: 0,
    totalStorageUsed: 0,
    totalCredits: 0,
    avgCreditsPerUser: 0,
    totalProjects: 0,
    totalWorkflows: 0,
    totalBrands: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnhancedStats();
  }, []);

  useRealtimeSubscription(
    ['payments', 'profiles', 'credits', 'projects', 'workflows', 'brands', 'brand_assets', 'uploaded_assets'],
    loadEnhancedStats,
  );

  async function loadEnhancedStats() {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (onboarded)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true);

      // Calculate user growth rate (this week vs last week)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { count: thisWeekCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: lastWeekCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      const growthRate = lastWeekCount && lastWeekCount > 0 
        ? ((thisWeekCount || 0) - lastWeekCount) / lastWeekCount * 100 
        : 0;

      // Calculate total revenue from payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .in('status', ['success', 'completed']);

      const totalRevenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Calculate total storage used from brand_assets and uploaded_assets
      const { data: brandAssetsData } = await supabase
        .from('brand_assets')
        .select('file_size');

      const { data: uploadedAssetsData } = await supabase
        .from('uploaded_assets')
        .select('file_size');

      const brandStorageBytes = brandAssetsData?.reduce((sum, a) => sum + Number(a.file_size || 0), 0) || 0;
      const uploadedStorageBytes = uploadedAssetsData?.reduce((sum, a) => sum + Number(a.file_size || 0), 0) || 0;
      const totalStorageMB = (brandStorageBytes + uploadedStorageBytes) / (1024 * 1024);

      // Calculate total credits
      const { data: creditsData } = await supabase
        .from('credits')
        .select('balance');

      const totalCredits = creditsData?.reduce((sum, c) => sum + c.balance, 0) || 0;
      const avgCreditsPerUser = creditsData && creditsData.length > 0
        ? totalCredits / creditsData.length
        : 0;

      // Get total projects
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get total workflows
      const { count: totalWorkflows } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true });

      // Get total brands
      const { count: totalBrands } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      setStats({
        totalRevenue,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        userGrowthRate: growthRate,
        totalStorageUsed: totalStorageMB,
        totalCredits,
        avgCreditsPerUser,
        totalProjects: totalProjects || 0,
        totalWorkflows: totalWorkflows || 0,
        totalBrands: totalBrands || 0,
      });
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-zinc-800 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: null,
      subtitle: 'From successful payments',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      trend: stats.userGrowthRate > 0 ? 'positive' : stats.userGrowthRate < 0 ? 'negative' : null,
      subtitle: `${stats.activeUsers} active (onboarded)`,
    },
    {
      title: 'User Growth',
      value: `${stats.userGrowthRate > 0 ? '+' : ''}${stats.userGrowthRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: stats.userGrowthRate > 0 ? 'positive' : stats.userGrowthRate < 0 ? 'negative' : null,
      subtitle: 'vs last week',
    },
    {
      title: 'Storage Used',
      value: stats.totalStorageUsed >= 1024 
        ? `${(stats.totalStorageUsed / 1024).toFixed(2)} GB`
        : `${stats.totalStorageUsed.toFixed(0)} MB`,
      icon: HardDrive,
      trend: null,
      subtitle: 'Brand + uploaded assets',
    },
  ];

  const secondaryCards = [
    {
      title: 'Total Credits',
      value: stats.totalCredits >= 1000000 
        ? `${(stats.totalCredits / 1000000).toFixed(1)}M`
        : stats.totalCredits >= 1000 
          ? `${(stats.totalCredits / 1000).toFixed(1)}K`
          : stats.totalCredits.toString(),
      icon: Coins,
      subtitle: `Avg ${Math.round(stats.avgCreditsPerUser).toLocaleString()}/user`,
    },
    {
      title: 'Projects',
      value: stats.totalProjects.toString(),
      icon: FolderKanban,
      subtitle: 'Active projects',
    },
    {
      title: 'Workflows',
      value: stats.totalWorkflows.toString(),
      icon: Workflow,
      subtitle: 'Cosmo workflows',
    },
    {
      title: 'Brands',
      value: stats.totalBrands.toString(),
      icon: Palette,
      subtitle: 'Brand systems',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div 
            key={index} 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-zinc-400">{card.title}</p>
              <div className="p-2 bg-zinc-800 rounded-lg">
                <card.icon className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
            
            <p className="text-4xl font-bold text-zinc-50 tracking-tight">
              {card.value}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              {card.trend && (
                <TrendingUp className={`w-3 h-3 ${card.trend === 'positive' ? 'text-green-500' : 'text-red-500'}`} />
              )}
              <span className={`text-xs ${card.trend === 'positive' ? 'text-green-500' : card.trend === 'negative' ? 'text-red-500' : 'text-zinc-500'}`}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {secondaryCards.map((card, index) => (
          <div 
            key={index} 
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <card.icon className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">{card.title}</p>
                <p className="text-xl font-bold text-zinc-100">{card.value}</p>
                <p className="text-xs text-zinc-500">{card.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
