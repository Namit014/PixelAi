-- Fix the collaborator INSERT policy - it has a typo (pc.project_id = pc.project_id instead of project_id)
DROP POLICY IF EXISTS "Collaborators can create canvas objects" ON public.canvas_objects;
CREATE POLICY "Collaborators can create canvas objects"
  ON public.canvas_objects FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );

-- Also fix same issue in artboards policy
DROP POLICY IF EXISTS "Collaborators can create artboards" ON public.artboards;
CREATE POLICY "Collaborators can create artboards"
  ON public.artboards FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc 
      WHERE pc.project_id = artboards.project_id 
      AND pc.user_id = auth.uid()
      AND pc.permission = 'edit'
    )
  );