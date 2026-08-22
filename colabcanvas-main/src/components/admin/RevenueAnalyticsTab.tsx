import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface RevenueMetric {
  metric_date: string;
  total_revenue: number;
  subscription_revenue: number;
  credit_purchases: number;
  new_subscriptions: number;
  churned_subscriptions: number;
  active_users: number;
  new_users: number;
  total_generations: number;
  total_credits_used: number;
}

interface CreditData {
  subscription_tier: string;
  balance: number;
}

export function RevenueAnalyticsTab() {
  // Fetch revenue metrics
  const { data: revenueMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-revenue-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as RevenueMetric[];
    }
  });

  // Fetch subscription breakdown from credits table
  const { data: subscriptionBreakdown } = useQuery({
    queryKey: ['admin-subscription-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credits')
        .select('subscription_tier, balance');
      
      if (error) throw error;
      
      // Aggregate by tier
      const breakdown = (data as CreditData[]).reduce((acc: Record<string, { count: number; totalCredits: number }>, curr) => {
        const tier = curr.subscription_tier || 'free';
        if (!acc[tier]) {
          acc[tier] = { count: 0, totalCredits: 0 };
        }
        acc[tier].count++;
        acc[tier].totalCredits += curr.balance;
        return acc;
      }, {});
      
      return breakdown;
    }
  });

  // Fetch payment data for actual revenue
  const { data: paymentStats } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .eq('status', 'success')
        .gte('created_at', thirtyDaysAgo);
      
      if (error) throw error;
      
      const totalRevenue = data.reduce((sum, p) => sum + (p.amount || 0), 0);
      const transactionCount = data.length;
      
      return { totalRevenue, transactionCount };
    }
  });

  // Calculate MRR from subscription data
  const calculateMRR = () => {
    if (!subscriptionBreakdown) return 0;
    // Assuming pricing: free=0, pro=29, enterprise=99
    const pricing: Record<string, number> = {
      free: 0,
      pro: 29,
      enterprise: 99
    };
    
    let mrr = 0;
    Object.entries(subscriptionBreakdown).forEach(([tier, data]) => {
      mrr += (pricing[tier] || 0) * data.count;
    });
    
    return mrr;
  };

  const mrr = calculateMRR();
  const arr = mrr * 12;

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    format: formatType = 'number'
  }: { 
    title: string; 
    value: number | string; 
    change?: number;
    icon: React.ComponentType<{ className?: string }>;
    format?: 'number' | 'currency' | 'percentage';
  }) => {
    const formattedValue = formatType === 'currency' 
      ? `$${Number(value).toLocaleString()}`
      : formatType === 'percentage'
      ? `${value}%`
      : value.toLocaleString();
      
    return (
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <Icon className="w-5 h-5 text-zinc-400" />
          {change !== undefined && (
            <Badge className={change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
              {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-zinc-100">{formattedValue}</p>
        <p className="text-sm text-zinc-400 mt-1">{title}</p>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Revenue Analytics</h2>
        <p className="text-zinc-400">Financial metrics and subscription insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={mrr}
          icon={DollarSign}
          format="currency"
          change={12}
        />
        <MetricCard
          title="Annual Recurring Revenue"
          value={arr}
          icon={TrendingUp}
          format="currency"
        />
        <MetricCard
          title="30-Day Revenue"
          value={paymentStats?.totalRevenue || 0}
          icon={CreditCard}
          format="currency"
        />
        <MetricCard
          title="Transactions (30d)"
          value={paymentStats?.transactionCount || 0}
          icon={Activity}
        />
      </div>

      {/* Subscription Breakdown */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Subscription Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionBreakdown && Object.entries(subscriptionBreakdown).map(([tier, data]) => (
            <div key={tier} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300 capitalize font-medium">{tier}</span>
                <Badge className={
                  tier === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                  tier === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-zinc-500/10 text-zinc-400'
                }>
                  {data.count} users
                </Badge>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{data.count}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {data.totalCredits.toLocaleString()} total credits
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Credit Economy */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Credit Economy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <span className="text-zinc-300">Total Credits in Circulation</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {subscriptionBreakdown 
                ? Object.values(subscriptionBreakdown).reduce((sum, d) => sum + d.totalCredits, 0).toLocaleString()
                : '0'
              }
            </p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-zinc-300">Average Credits per User</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {subscriptionBreakdown 
                ? Math.round(
                    Object.values(subscriptionBreakdown).reduce((sum, d) => sum + d.totalCredits, 0) /
                    Object.values(subscriptionBreakdown).reduce((sum, d) => sum + d.count, 0)
                  )
                : '0'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Revenue History */}
      {revenueMetrics && revenueMetrics.length > 0 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Revenue History (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 text-zinc-400">Date</th>
                  <th className="text-right py-2 text-zinc-400">Revenue</th>
                  <th className="text-right py-2 text-zinc-400">New Users</th>
                  <th className="text-right py-2 text-zinc-400">Generations</th>
                  <th className="text-right py-2 text-zinc-400">Credits Used</th>
                </tr>
              </thead>
              <tbody>
                {revenueMetrics.map((metric) => (
                  <tr key={metric.metric_date} className="border-b border-zinc-800/50">
                    <td className="py-2 text-zinc-300">
                      {format(new Date(metric.metric_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-2 text-right text-zinc-300">
                      ${metric.total_revenue?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-2 text-right text-zinc-300">
                      {metric.new_users || 0}
                    </td>
                    <td className="py-2 text-right text-zinc-300">
                      {metric.total_generations || 0}
                    </td>
                    <td className="py-2 text-right text-zinc-300">
                      {metric.total_credits_used || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
