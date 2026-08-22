-- =============================================
-- COMPREHENSIVE RLS SECURITY FIX (Retry with proper drops)
-- Fixes 20 error-level security issues
-- =============================================

-- 1. PROFILES TABLE - Restrict to owner only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. ADMIN_NOTIFICATIONS TABLE - Only authenticated users can view their notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Users can view their own or public notifications" ON public.admin_notifications;

CREATE POLICY "Users can view their own or public notifications"
ON public.admin_notifications FOR SELECT
TO authenticated
USING (target_type = 'all' OR target_user_id = auth.uid());

-- 3. PAYMENTS TABLE - Owner only access
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 4. USER_SUBSCRIPTIONS TABLE - Owner only access  
DROP POLICY IF EXISTS "Anyone can view user subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 5. CREDITS TABLE - Owner only access
DROP POLICY IF EXISTS "Anyone can view credits" ON public.credits;
DROP POLICY IF EXISTS "Public can view credits" ON public.credits;
DROP POLICY IF EXISTS "Users can view their own credits" ON public.credits;

CREATE POLICY "Users can view their own credits"
ON public.credits FOR SELECT
USING (auth.uid() = user_id);

-- 6. USER_SESSIONS TABLE - Owner and admins only
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Public can view sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 7. SUPPORT_TICKETS TABLE - Owner and admins only
DROP POLICY IF EXISTS "Anyone can view support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Public can view support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;

CREATE POLICY "Users can view their own support tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 8. FEEDBACK TABLE - Owner and admins only
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;

CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.feedback FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 9. BRANDS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;
DROP POLICY IF EXISTS "Public can view brands" ON public.brands;
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;

CREATE POLICY "Users can view their own brands"
ON public.brands FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- 10. PROJECTS TABLE - Owner and collaborators only
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own or collaborated projects" ON public.projects;

CREATE POLICY "Users can view their own or collaborated projects"
ON public.projects FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = projects.id AND pc.user_id = auth.uid()
  )
);

-- 11. CONVERSATIONS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user_id);

-- 12. MESSAGES TABLE - Owner only (via conversation)
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;
DROP POLICY IF EXISTS "Public can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;

CREATE POLICY "Users can view messages from their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  )
);

-- 13. WORKFLOWS TABLE - Owner only with public template exception
DROP POLICY IF EXISTS "Anyone can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "Public can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can view their own workflows or public templates" ON public.workflows;

CREATE POLICY "Users can view their own workflows or public templates"
ON public.workflows FOR SELECT
USING (
  auth.uid() = user_id 
  OR is_template = true
);

-- 14. DESIGN_GENERATIONS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view design generations" ON public.design_generations;
DROP POLICY IF EXISTS "Public can view design generations" ON public.design_generations;
DROP POLICY IF EXISTS "Users can view their own design generations" ON public.design_generations;

CREATE POLICY "Users can view their own design generations"
ON public.design_generations FOR SELECT
USING (auth.uid() = user_id);

-- 15. UPLOADED_ASSETS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view uploaded assets" ON public.uploaded_assets;
DROP POLICY IF EXISTS "Public can view uploaded assets" ON public.uploaded_assets;
DROP POLICY IF EXISTS "Users can view their own uploaded assets" ON public.uploaded_assets;

CREATE POLICY "Users can view their own uploaded assets"
ON public.uploaded_assets FOR SELECT
USING (auth.uid() = user_id);

-- 16. REFERENCE_IMAGES TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view reference images" ON public.reference_images;
DROP POLICY IF EXISTS "Public can view reference images" ON public.reference_images;
DROP POLICY IF EXISTS "Users can view their own reference images" ON public.reference_images;

CREATE POLICY "Users can view their own reference images"
ON public.reference_images FOR SELECT
USING (auth.uid() = user_id);

-- 17. VIDEO_GENERATION_JOBS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view video generation jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Public can view video generation jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Users can view their own video generation jobs" ON public.video_generation_jobs;

CREATE POLICY "Users can view their own video generation jobs"
ON public.video_generation_jobs FOR SELECT
USING (auth.uid() = user_id);

-- 18. PINTEREST_TOKENS TABLE - CRITICAL: Owner only (contains OAuth tokens)
DROP POLICY IF EXISTS "Anyone can view pinterest tokens" ON public.pinterest_tokens;
DROP POLICY IF EXISTS "Public can view pinterest tokens" ON public.pinterest_tokens;
DROP POLICY IF EXISTS "Users can view all Pinterest tokens" ON public.pinterest_tokens;
DROP POLICY IF EXISTS "Users can only view their own pinterest tokens" ON public.pinterest_tokens;

CREATE POLICY "Users can only view their own pinterest tokens"
ON public.pinterest_tokens FOR SELECT
USING (auth.uid() = user_id);

-- 19. NOTIFICATIONS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- 20. RUMI_CREATIVE_SESSIONS TABLE - Owner only
DROP POLICY IF EXISTS "Anyone can view rumi creative sessions" ON public.rumi_creative_sessions;
DROP POLICY IF EXISTS "Public can view rumi creative sessions" ON public.rumi_creative_sessions;
DROP POLICY IF EXISTS "Users can view their own rumi creative sessions" ON public.rumi_creative_sessions;

CREATE POLICY "Users can view their own rumi creative sessions"
ON public.rumi_creative_sessions FOR SELECT
USING (auth.uid() = user_id);