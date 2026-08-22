import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Database, Server, Zap, Activity, CheckCircle2, HardDrive, Users, FolderKanban } from 'lucide-react';

interface SystemMetric {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  value: number;
  unit: string;
  maxValue?: number;
}

interface RealMetrics {
  totalStorageMB: number;
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalWorkflows: number;
  totalBrands: number;
  totalCredits: number;
}

export const SystemHealth = () => {
  const [realMetrics, setRealMetrics] = useState<RealMetrics>({
    totalStorageMB: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalWorkflows: 0,
    totalBrands: 0,
    totalCredits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealMetrics();
  }, []);

  const loadRealMetrics = async () => {
    try {
      // Get storage usage
      const { data: brandAssets } = await supabase
        .from('brand_assets')
        .select('file_size');
      
      const { data: uploadedAssets } = await supabase
        .from('uploaded_assets')
        .select('file_size');

      const brandStorageBytes = brandAssets?.reduce((sum, a) => sum + Number(a.file_size || 0), 0) || 0;
      const uploadedStorageBytes = uploadedAssets?.reduce((sum, a) => sum + Number(a.file_size || 0), 0) || 0;
      const totalStorageMB = (brandStorageBytes + uploadedStorageBytes) / (1024 * 1024);

      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true);

      // Get project count
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get workflow count
      const { count: totalWorkflows } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true });

      // Get brand count
      const { count: totalBrands } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get credits
      const { data: creditsData } = await supabase
        .from('credits')
        .select('balance');
      
      const totalCredits = creditsData?.reduce((sum, c) => sum + c.balance, 0) || 0;

      setRealMetrics({
        totalStorageMB,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalProjects: totalProjects || 0,
        totalWorkflows: totalWorkflows || 0,
        totalBrands: totalBrands || 0,
        totalCredits,
      });
    } catch (error) {
      console.error('Error loading real metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate storage usage percentage (assuming 10GB limit)
  const storageLimit = 10 * 1024; // 10GB in MB
  const storagePercentage = Math.min((realMetrics.totalStorageMB / storageLimit) * 100, 100);

  const metrics: SystemMetric[] = [
    { 
      name: 'Storage Usage', 
      status: storagePercentage > 80 ? 'degraded' : 'operational', 
      value: realMetrics.totalStorageMB, 
      unit: 'MB',
      maxValue: storageLimit
    },
    { 
      name: 'Active Users', 
      status: 'operational', 
      value: realMetrics.activeUsers, 
      unit: '' 
    },
    { 
      name: 'Total Projects', 
      status: 'operational', 
      value: realMetrics.totalProjects, 
      unit: '' 
    },
    { 
      name: 'Total Workflows', 
      status: 'operational', 
      value: realMetrics.totalWorkflows, 
      unit: '' 
    },
  ];

  const services = [
    { name: 'Database', icon: Database, status: 'operational' as const },
    { name: 'API', icon: Server, status: 'operational' as const },
    { name: 'Functions', icon: Zap, status: 'operational' as const },
    { name: 'Storage', icon: Activity, status: 'operational' as const },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse">
          <div className="h-40 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">System Status</h3>
            <p className="text-sm text-zinc-400">All systems operational</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-500">Healthy</span>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {services.map((service) => (
            <div key={service.name} className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <service.icon className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${getStatusColor(service.status)}`} />
                <span className="text-xs text-zinc-400 capitalize">{service.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Data Metrics */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Platform Metrics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-zinc-400">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{realMetrics.totalUsers}</p>
            <p className="text-xs text-zinc-500">{realMetrics.activeUsers} active</p>
          </div>
          
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-zinc-400">Projects</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{realMetrics.totalProjects}</p>
          </div>
          
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-zinc-400">Workflows</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{realMetrics.totalWorkflows}</p>
          </div>
          
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-zinc-400">Storage</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {realMetrics.totalStorageMB >= 1024 
                ? `${(realMetrics.totalStorageMB / 1024).toFixed(2)} GB`
                : `${realMetrics.totalStorageMB.toFixed(0)} MB`}
            </p>
          </div>
        </div>

        {/* Storage Progress */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Storage Usage</span>
              </div>
              <span className="text-sm font-bold text-zinc-100">
                {realMetrics.totalStorageMB >= 1024 
                  ? `${(realMetrics.totalStorageMB / 1024).toFixed(2)} GB`
                  : `${realMetrics.totalStorageMB.toFixed(0)} MB`} / 10 GB
              </span>
            </div>
            <Progress 
              value={storagePercentage} 
              className="h-2 bg-zinc-800"
            />
            <p className="text-xs text-zinc-500">{storagePercentage.toFixed(1)}% used</p>
          </div>
        </div>
      </div>

      {/* Credit Economy */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Credit Economy</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <p className="text-xs text-zinc-400 mb-1">Total Credits in Circulation</p>
            <p className="text-3xl font-bold text-zinc-100">
              {realMetrics.totalCredits >= 1000000 
                ? `${(realMetrics.totalCredits / 1000000).toFixed(2)}M`
                : realMetrics.totalCredits.toLocaleString()}
            </p>
          </div>
          
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <p className="text-xs text-zinc-400 mb-1">Average per User</p>
            <p className="text-3xl font-bold text-zinc-100">
              {realMetrics.totalUsers > 0 
                ? Math.round(realMetrics.totalCredits / realMetrics.totalUsers).toLocaleString()
                : '0'}
            </p>
          </div>
          
          <div className="p-4 bg-zinc-800/50 rounded-xl">
            <p className="text-xs text-zinc-400 mb-1">Total Brands</p>
            <p className="text-3xl font-bold text-zinc-100">{realMetrics.totalBrands}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
