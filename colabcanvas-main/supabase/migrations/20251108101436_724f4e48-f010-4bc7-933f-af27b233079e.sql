-- Add file_path column to canvas_objects for URL regeneration
ALTER TABLE canvas_objects 
ADD COLUMN file_path TEXT;