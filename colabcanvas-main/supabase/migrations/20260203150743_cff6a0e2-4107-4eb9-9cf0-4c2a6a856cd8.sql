-- Fix RLS policies for collaborators on canvas_objects

-- Drop the owner-only policies that conflict with collaborator policies
DROP POLICY IF EXISTS "Users can create their own canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Users can delete their own canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Users can update their own canvas objects" ON canvas_objects;

-- Add DELETE policy for collaborators with edit permission
CREATE POLICY "Collaborators can delete canvas objects"
  ON canvas_objects FOR DELETE
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = canvas_objects.project_id 
      AND pc.user_id = auth.uid() 
      AND pc.permission = 'edit'
    )
  );