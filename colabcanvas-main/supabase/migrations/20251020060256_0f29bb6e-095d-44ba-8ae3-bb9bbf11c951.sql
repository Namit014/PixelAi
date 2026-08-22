-- Phase 1: Fix Data Persistence
-- Add object_id column to canvas_objects for stable object identification
ALTER TABLE public.canvas_objects 
ADD COLUMN IF NOT EXISTS object_id text;

-- Create unique constraint to prevent duplicates and enable upsert
CREATE UNIQUE INDEX IF NOT EXISTS canvas_objects_project_object_id_key 
ON public.canvas_objects(project_id, object_id);

-- Phase 2: Fix Critical Security Issues
-- Lock down profiles table - only users can see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Lock down feedback table - no public access
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
CREATE POLICY "Users can view their own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Lock down payments table - only user's own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Lock down subscription_plans - keep public read access for plan selection
-- (already correct - no changes needed)

-- Lock down support_tickets - only user's own tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Lock down support_messages - only messages for user's tickets
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_messages;
CREATE POLICY "Users can view messages for their tickets" 
ON public.support_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM support_tickets 
  WHERE support_tickets.id = support_messages.ticket_id 
  AND support_tickets.user_id = auth.uid()
));