-- Add admin notes and assignment fields to feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS assigned_admin_id uuid;

-- Add escalation fields to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS escalated_reason text,
ADD COLUMN IF NOT EXISTS assigned_admin_id uuid;

-- Create indexes for faster queries (only on existing columns)
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated ON public.support_tickets(escalated_at) WHERE escalated_at IS NOT NULL;