-- User segments for admin targeting
CREATE TABLE IF NOT EXISTS admin_user_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filter_criteria jsonb NOT NULL DEFAULT '{}',
  user_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('image', 'prompt', 'workflow', 'brand')),
  content_id uuid NOT NULL,
  content_url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_reason text,
  flag_source text DEFAULT 'auto' CHECK (flag_source IN ('auto', 'user_report', 'admin')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- System alerts configuration
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('error_rate', 'rate_limit', 'credit_low', 'usage_spike', 'security')),
  title text NOT NULL,
  description text,
  severity text DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  threshold jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Revenue metrics tracking (aggregated daily)
CREATE TABLE IF NOT EXISTS revenue_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  total_revenue numeric(12,2) DEFAULT 0,
  subscription_revenue numeric(12,2) DEFAULT 0,
  credit_purchases numeric(12,2) DEFAULT 0,
  new_subscriptions integer DEFAULT 0,
  churned_subscriptions integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_generations integer DEFAULT 0,
  total_credits_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE admin_user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies using has_role function (which exists)
CREATE POLICY "Only admins can view user segments"
ON admin_user_segments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage user segments"
ON admin_user_segments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can view moderation queue"
ON moderation_queue FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage moderation queue"
ON moderation_queue FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can view system alerts"
ON system_alerts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage system alerts"
ON system_alerts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can view revenue metrics"
ON revenue_metrics FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage revenue metrics"
ON revenue_metrics FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON moderation_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON system_alerts(is_active, severity);
CREATE INDEX IF NOT EXISTS idx_revenue_metrics_date ON revenue_metrics(metric_date DESC);