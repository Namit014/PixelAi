-- Fix canvas_objects table for proper upsert functionality
-- Step 1: Clean up existing NULL object_ids by assigning stable IDs
UPDATE canvas_objects 
SET object_id = 'obj_' || id::text 
WHERE object_id IS NULL;

-- Step 2: Make object_id NOT NULL to prevent future issues
ALTER TABLE canvas_objects 
ALTER COLUMN object_id SET NOT NULL;

-- Step 3: Create unique constraint for upsert to work correctly
ALTER TABLE canvas_objects 
ADD CONSTRAINT canvas_objects_project_object_unique 
UNIQUE (project_id, object_id);