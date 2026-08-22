-- Drop ALL existing policies on canvas_objects
DROP POLICY IF EXISTS "Collaborators can create canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Collaborators can delete canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Collaborators can update canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Users can view canvas objects in owned or collaborated projects" ON canvas_objects;
DROP POLICY IF EXISTS "Project members can update canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Project members can manage canvas objects" ON canvas_objects;

-- Create single consolidated policy for all operations
CREATE POLICY "Project members can manage canvas objects"
  ON canvas_objects 
  FOR ALL
  TO authenticated
  USING (
    -- Can access if: project owner OR collaborator
    EXISTS (SELECT 1 FROM projects WHERE id = canvas_objects.project_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can modify if: project owner OR collaborator with edit permission
    EXISTS (SELECT 1 FROM projects WHERE id = canvas_objects.project_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid() 
      AND pc.permission = 'edit'
    )
  );