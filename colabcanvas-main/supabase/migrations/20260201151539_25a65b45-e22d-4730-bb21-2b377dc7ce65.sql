-- Create security definer function to check project ownership
-- This breaks the infinite recursion by bypassing RLS when checking ownership
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND user_id = auth.uid()
  )
$$;

-- Update project_collaborators policy to use the function instead of querying projects directly
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;
CREATE POLICY "Project owners can manage collaborators"
  ON public.project_collaborators FOR ALL
  USING (public.is_project_owner(project_id));