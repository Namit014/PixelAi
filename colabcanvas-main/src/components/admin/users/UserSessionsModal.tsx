import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Smartphone, Tablet, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  login_at: string;
  logout_at: string | null;
  is_active: boolean;
}

interface UserSessionsModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserSessionsModal = ({ userId, open, onOpenChange }: UserSessionsModalProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      loadSessions();
    }
  }, [open, userId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, logout_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Session terminated',
      });

      loadSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        variant: 'destructive',
      });
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (!deviceType) return <Monitor className="h-4 w-4" />;
    if (deviceType.toLowerCase().includes('mobile')) return <Smartphone className="h-4 w-4" />;
    if (deviceType.toLowerCase().includes('tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">User Sessions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">No sessions found</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center justify-between"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-zinc-400 mt-1">
                    {getDeviceIcon(session.device_type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">
                        {session.device_type || 'Unknown Device'}
                      </span>
                      {session.is_active && (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-zinc-500">
                      IP: {session.ip_address || 'Unknown'}
                    </div>
                    <div className="text-sm text-zinc-500">
                      Login: {formatDistanceToNow(new Date(session.login_at), { addSuffix: true })}
                    </div>
                    {session.logout_at && (
                      <div className="text-sm text-zinc-500">
                        Logout: {formatDistanceToNow(new Date(session.logout_at), { addSuffix: true })}
                      </div>
                    )}
                    {session.user_agent && (
                      <div className="text-xs text-zinc-600 truncate max-w-md">
                        {session.user_agent}
                      </div>
                    )}
                  </div>
                </div>
                {session.is_active && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleForceLogout(session.id)}
                    className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Force Logout
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
