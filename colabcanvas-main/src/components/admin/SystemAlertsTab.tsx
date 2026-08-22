import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, AlertTriangle, CheckCircle, XCircle, Clock, Shield, Zap, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SystemAlert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  severity: string;
  threshold: Record<string, any>;
  is_active: boolean;
  is_acknowledged: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
}

export function SystemAlertsTab() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['admin-system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SystemAlert[];
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('system_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-alerts'] });
      toast.success('Alert acknowledged');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-alerts'] });
      toast.success('Alert status updated');
    }
  });

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/20',
      error: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      info: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    };
    return <Badge className={styles[severity] || 'bg-zinc-500/10 text-zinc-400'}>{severity}</Badge>;
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      error_rate: AlertTriangle,
      rate_limit: Zap,
      credit_low: CreditCard,
      usage_spike: Zap,
      security: Shield
    };
    const Icon = icons[type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  const activeAlerts = alerts?.filter(a => a.is_active && !a.is_acknowledged) || [];
  const acknowledgedAlerts = alerts?.filter(a => a.is_acknowledged) || [];
  const inactiveAlerts = alerts?.filter(a => !a.is_active) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">System Alerts</h2>
        <p className="text-zinc-400">Monitor and manage platform alerts</p>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Total Alerts</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{alerts?.length || 0}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-zinc-400">Active Alerts</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{activeAlerts.length}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-zinc-400">Acknowledged</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{acknowledgedAlerts.length}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">Disabled</span>
          </div>
          <p className="text-2xl font-bold text-zinc-500">{inactiveAlerts.length}</p>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Active Alerts
          </h3>
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-lg border border-red-500/30 bg-red-500/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-red-500">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-zinc-100">{alert.title}</h4>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      {alert.description && (
                        <p className="text-sm text-zinc-400 mb-2">{alert.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>Type: {alert.alert_type.replace('_', ' ')}</span>
                        <span>Triggered: {alert.trigger_count}x</span>
                        {alert.last_triggered_at && (
                          <span>Last: {formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    size="sm"
                    disabled={acknowledgeMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Alerts */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">All Alert Configurations</h3>
        
        {isLoading ? (
          <p className="text-zinc-400">Loading alerts...</p>
        ) : !alerts || alerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Alerts Configured</h3>
            <p className="text-zinc-500">System is running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.is_active ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-800 bg-zinc-900/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${alert.is_active ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-zinc-200">{alert.title}</h4>
                        {getSeverityBadge(alert.severity)}
                        {alert.is_acknowledged && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Acknowledged
                          </Badge>
                        )}
                        {!alert.is_active && (
                          <Badge className="bg-zinc-500/10 text-zinc-500">Disabled</Badge>
                        )}
                      </div>
                      {alert.description && (
                        <p className="text-sm text-zinc-500">{alert.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({ id: alert.id, isActive: !alert.is_active })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  >
                    {alert.is_active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
