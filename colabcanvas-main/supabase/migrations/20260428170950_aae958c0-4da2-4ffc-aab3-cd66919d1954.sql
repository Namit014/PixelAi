
-- 1. Fix style_guide_exports: remove unauthenticated public read
DROP POLICY IF EXISTS "Public can view exports by URL" ON public.style_guide_exports;

-- 2. Fix project_collaborators self-reference bug in projects policies
DROP POLICY IF EXISTS "Collaborators can view projects" ON public.projects;
DROP POLICY IF EXISTS "Collaborators with edit can update projects" ON public.projects;

CREATE POLICY "Collaborators can view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = projects.id
      AND pc.user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators with edit can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = projects.id
      AND pc.user_id = auth.uid()
      AND pc.permission = ANY (ARRAY['edit'::text, 'admin'::text])
  )
);

-- 3. Restrict realtime.messages so authenticated users can only subscribe/broadcast on
-- topics they own (topic must start with their auth.uid()).
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can broadcast realtime" ON realtime.messages;

CREATE POLICY "Users can subscribe to own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE (auth.uid()::text || ':%')
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
);

CREATE POLICY "Users can broadcast to own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE (auth.uid()::text || ':%')
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
);
