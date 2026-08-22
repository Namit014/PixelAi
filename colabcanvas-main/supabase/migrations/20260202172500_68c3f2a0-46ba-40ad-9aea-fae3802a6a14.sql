-- Create admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'specific')),
  target_user_id UUID,
  action_label TEXT,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create user notification reads table
CREATE TABLE public.user_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Admin can insert notifications
CREATE POLICY "Admins can create notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Admin can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Users can view notifications targeted to them or to all
CREATE POLICY "Users can view their notifications"
ON public.admin_notifications
FOR SELECT
USING (
  target_type = 'all' OR target_user_id = auth.uid()
);

-- Users can insert their own read records
CREATE POLICY "Users can mark notifications as read"
ON public.user_notification_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can view their own read records
CREATE POLICY "Users can view their read records"
ON public.user_notification_reads
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all read records
CREATE POLICY "Admins can view all read records"
ON public.user_notification_reads
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_target_type ON public.admin_notifications(target_type);
CREATE INDEX idx_admin_notifications_target_user ON public.admin_notifications(target_user_id);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_user_notification_reads_user ON public.user_notification_reads(user_id);
CREATE INDEX idx_user_notification_reads_notification ON public.user_notification_reads(notification_id);