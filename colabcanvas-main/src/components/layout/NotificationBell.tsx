import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, Sparkles, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAiSoundToggle } from '@/hooks/useAiSoundToggle';
import {
  subscribeAiActivity,
  markAiActivityRead,
  markAllAiActivityRead,
  type AiActivityItem,
} from '@/lib/notifications/aiActivityFeed';

// Custom notification icon
const NotificationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.02 2.91C8.71 2.91 6.02 5.6 6.02 8.91V11.8C6.02 12.41 5.76 13.34 5.45 13.86L4.3 15.77C3.59 16.95 4.08 18.26 5.38 18.7C9.69 20.14 14.34 20.14 18.65 18.7C19.86 18.3 20.39 16.87 19.73 15.77L18.58 13.86C18.28 13.34 18.02 12.41 18.02 11.8V8.91C18.02 5.61 15.32 2.91 12.02 2.91Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round"/>
    <path d="M13.87 3.2C13.56 3.11 13.24 3.04 12.91 3C11.95 2.88 11.03 2.95 10.17 3.2C10.46 2.46 11.18 1.94 12.02 1.94C12.86 1.94 13.58 2.46 13.87 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.02 19.06C15.02 20.71 13.67 22.06 12.02 22.06C11.2 22.06 10.44 21.72 9.90002 21.18C9.36002 20.64 9.02002 19.88 9.02002 19.06" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10"/>
  </svg>
);

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  status: string;
  resource_type: string | null;
  resource_id: string | null;
  share_id: string | null;
  sender_id: string | null;
  created_at: string;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  image_url: string | null;
  created_at: string;
  isRead?: boolean;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminReadIds, setAdminReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [aiActivity, setAiActivity] = useState<AiActivityItem[]>([]);
  const { enabled: soundEnabled, toggle: toggleSound } = useAiSoundToggle();

  // Subscribe to local AI activity feed (Cosmo / Canvas / Think completions)
  useEffect(() => {
    const unsub = subscribeAiActivity(setAiActivity);
    return unsub;
  }, []);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch regular notifications
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Fetch sender profiles
        const senderIds = [...new Set(data?.map(n => n.sender_id).filter(Boolean))];
        let senderProfiles: Record<string, any> = {};
        
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);
          
          if (profiles) {
            senderProfiles = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
          }
        }

        const notificationsWithSenders = data?.map(n => ({
          ...n,
          sender: n.sender_id ? senderProfiles[n.sender_id] : undefined
        })) || [];

        setNotifications(notificationsWithSenders);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  // Fetch admin notifications (broadcasts)
  useEffect(() => {
    if (!userId) return;

    const fetchAdminNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_notifications')
          .select('id, title, message, action_label, action_url, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          setAdminNotifications(data);
        }

        // Fetch read status
        const { data: reads } = await supabase
          .from('user_notification_reads')
          .select('notification_id')
          .eq('user_id', userId);

        if (reads) {
          setAdminReadIds(new Set(reads.map(r => r.notification_id)));
        }
      } catch (error) {
        console.error('Error fetching admin notifications:', error);
      }
    };

    fetchAdminNotifications();
  }, [userId]);

  // Subscribe to realtime updates for regular notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            if (newNotif.sender_id) {
              const { data: sender } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newNotif.sender_id)
                .single();
              newNotif.sender = sender || undefined;
            }
            setNotifications(prev => [newNotif, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const unreadAdminCount = adminNotifications.filter(n => !adminReadIds.has(n.id)).length;
  const unreadAiCount = aiActivity.filter(a => !a.read).length;
  const totalUnread = pendingCount + unreadAdminCount + unreadAiCount;

  const markAdminAsRead = async (notificationId: string) => {
    if (!userId || adminReadIds.has(notificationId)) return;

    const { error } = await supabase
      .from('user_notification_reads')
      .insert({
        notification_id: notificationId,
        user_id: userId,
      });

    if (!error) {
      setAdminReadIds(prev => new Set([...prev, notificationId]));
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    // Mark all admin notifications as read
    const unreadIds = adminNotifications
      .filter(n => !adminReadIds.has(n.id))
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      const insertData = unreadIds.map(id => ({
        notification_id: id,
        user_id: userId!,
      }));
      
      await supabase
        .from('user_notification_reads')
        .insert(insertData);
    }
    
    // Mark all regular notifications as read
    await supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending');
    
    // Clear all notifications from view
    setAdminNotifications([]);
    setNotifications([]);
    setAdminReadIds(new Set());

    // Mark local AI activity as read
    markAllAiActivityRead();

    toast({ title: 'All notifications cleared' });
  };

  const handleAdminNotificationClick = (notification: AdminNotification) => {
    markAdminAsRead(notification.id);
    
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
      setOpen(false);
    }
  };

  const handleAccept = async (notification: Notification) => {
    if (!notification.share_id || !notification.resource_type) return;
    
    setActionLoading(notification.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please log in', variant: 'destructive' });
        return;
      }

      // Find share token
      const sharesTable = notification.resource_type === 'project' ? 'project_shares' : 'workflow_shares';
      const { data: share, error: shareError } = await supabase
        .from(sharesTable)
        .select('share_token')
        .eq('id', notification.share_id)
        .single();

      if (shareError || !share) {
        toast({ title: 'Share link not found', variant: 'destructive' });
        return;
      }

      // Accept the share
      const edgeFn = notification.resource_type === 'project' ? 'accept-project-share' : 'accept-workflow-share';
      const { data, error } = await supabase.functions.invoke(edgeFn, {
        body: { shareToken: share.share_token, action: 'join' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      // Update notification status
      await supabase
        .from('notifications')
        .update({ status: 'accepted', actioned_at: new Date().toISOString() })
        .eq('id', notification.id);

      toast({ title: 'Invitation accepted!' });

      // Navigate to the resource
      if (notification.resource_type === 'project') {
        navigate(`/canvas?project=${notification.resource_id}`);
      } else {
        navigate(`/workflow?id=${notification.resource_id}`);
      }
      
      setOpen(false);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({ title: 'Failed to accept', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (notification: Notification) => {
    setActionLoading(notification.id);
    try {
      await supabase
        .from('notifications')
        .update({ status: 'rejected', actioned_at: new Date().toISOString() })
        .eq('id', notification.id);

      toast({ title: 'Invitation declined' });
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast({ title: 'Failed to decline', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.status !== 'pending') return;
    
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', notification.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter notifications based on active tab
  const filteredAdminNotifications = activeTab === 'unread' 
    ? adminNotifications.filter(n => !adminReadIds.has(n.id))
    : adminNotifications;
  
  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => n.status === 'pending')
    : notifications;

  const filteredAiActivity = activeTab === 'unread'
    ? aiActivity.filter(a => !a.read)
    : aiActivity;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <NotificationIcon />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] font-medium rounded-full flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white border border-zinc-200" align="end" sideOffset={8}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={toggleSound}
            title={soundEnabled ? 'AI sounds on — click to mute' : 'AI sounds muted — click to enable'}
            className={cn(
              "flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border",
              soundEnabled
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-muted-foreground border-zinc-200 hover:bg-zinc-50"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-4 h-4 rounded-full transition-colors",
              soundEnabled ? "bg-white/15" : "bg-zinc-100"
            )}>
              {soundEnabled
                ? <Volume2 className="w-2.5 h-2.5" />
                : <VolumeX className="w-2.5 h-2.5" />}
            </span>
            {soundEnabled ? 'Sound on' : 'Muted'}
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                activeTab === 'all' 
                  ? "bg-zinc-900 text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                activeTab === 'unread' 
                  ? "bg-zinc-900 text-white" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              Unread
              {totalUnread > 0 && (
                <span className="bg-zinc-200 text-zinc-600 text-[10px] px-1 py-0.5 rounded">
                  {String(totalUnread).padStart(2, '0')}
                </span>
              )}
            </button>
          </div>
          {totalUnread > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        <ScrollArea className="h-[320px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (filteredNotifications.length === 0 && filteredAdminNotifications.length === 0 && filteredAiActivity.length === 0) ? (
            <div className="py-6 text-center text-muted-foreground text-xs">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </div>
          ) : (
            <div>
              {/* AI Activity (Cosmo / Canvas / Think completions) */}
              {filteredAiActivity.map((item) => {
                const Icon = item.status === 'error' ? AlertCircle : Sparkles;
                return (
                  <div
                    key={`ai-${item.id}`}
                    onClick={() => markAiActivityRead(item.id)}
                    className={cn(
                      "px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer border-l-2",
                      item.read ? "border-transparent" : item.status === 'error' ? "border-red-400" : "border-emerald-400"
                    )}
                  >
                    <div className="flex gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                        item.status === 'error' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-xs font-medium leading-tight",
                            item.read ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: false })}
                          </span>
                        </div>
                        {item.message && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                            {item.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredAdminNotifications.map((notification) => {
                const isRead = adminReadIds.has(notification.id);
                return (
                  <div
                    key={`admin-${notification.id}`}
                    className="px-4 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Image thumbnail */}
                      {notification.image_url && (
                        <img 
                          src={notification.image_url} 
                          alt="" 
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-xs font-semibold leading-tight",
                            isRead ? 'text-muted-foreground' : 'text-foreground'
                          )}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {notification.message}
                        </p>
                        
                        {notification.action_label && notification.action_url && (
                          <Button
                            size="sm"
                            onClick={() => handleAdminNotificationClick(notification)}
                            className="mt-2 h-6 px-3 text-[11px] bg-zinc-900 text-white hover:bg-zinc-800 rounded-md"
                          >
                            {notification.action_label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Regular Notifications */}
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className="px-4 py-3 hover:bg-zinc-50 transition-colors"
                  onClick={() => markAsRead(notification)}
                >
                  <div className="flex gap-2.5">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={notification.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(notification.sender?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-xs font-medium leading-tight",
                          notification.status === 'pending' ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
                        </span>
                      </div>
                      {notification.message && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {notification.message}
                        </p>
                      )}

                      {/* Action buttons for pending invites */}
                      {notification.status === 'pending' && notification.type.includes('invite') && (
                        <div className="flex gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-2.5 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(notification);
                            }}
                            disabled={actionLoading === notification.id}
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-2.5 h-2.5 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2.5 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(notification);
                            }}
                            disabled={actionLoading === notification.id}
                          >
                            <X className="w-2.5 h-2.5 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}