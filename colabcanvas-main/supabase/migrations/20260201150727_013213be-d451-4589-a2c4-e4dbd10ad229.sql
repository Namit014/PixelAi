-- Update projects SELECT policy to include collaborator access
DROP POLICY IF EXISTS "Users can view own projects and public templates" ON public.projects;
CREATE POLICY "Users can view own projects, collaborator projects, and templates"
  ON public.projects FOR SELECT
  USING (
    user_id = auth.uid() 
    OR is_template = true
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = projects.id 
      AND pc.user_id = auth.uid()
    )
  );

-- Update artboards SELECT policy  
DROP POLICY IF EXISTS "Users can view artboards in their projects" ON public.artboards;
CREATE POLICY "Users can view artboards in owned or collaborated projects"
  ON public.artboards FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = artboards.project_id 
      AND pc.user_id = auth.uid()
    )
  );

-- Update canvas_objects SELECT policy
DROP POLICY IF EXISTS "Users can view their own canvas objects" ON public.canvas_objects;
CREATE POLICY "Users can view canvas objects in owned or collaborated projects"
  ON public.canvas_objects FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid()
    )
  );

-- Add collaborator INSERT policy for artboards
DROP POLICY IF EXISTS "Collaborators can create artboards" ON public.artboards;
CREATE POLICY "Collaborators can create artboards"
  ON public.artboards FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );

-- Add collaborator UPDATE policy for artboards
DROP POLICY IF EXISTS "Collaborators can update artboards" ON public.artboards;
CREATE POLICY "Collaborators can update artboards"
  ON public.artboards FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = artboards.project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );

-- Add collaborator INSERT policy for canvas_objects
DROP POLICY IF EXISTS "Collaborators can create canvas objects" ON public.canvas_objects;
CREATE POLICY "Collaborators can create canvas objects"
  ON public.canvas_objects FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );

-- Add collaborator UPDATE policy for canvas_objects
DROP POLICY IF EXISTS "Collaborators can update canvas objects" ON public.canvas_objects;
CREATE POLICY "Collaborators can update canvas objects"
  ON public.canvas_objects FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );