-- Add z-index for deterministic canvas stacking order
ALTER TABLE public.canvas_objects
ADD COLUMN IF NOT EXISTS z_index integer NOT NULL DEFAULT 0;

-- Backfill existing rows so current created_at order becomes stacking order per project
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.canvas_objects
)
UPDATE public.canvas_objects co
SET z_index = ranked.rn
FROM ranked
WHERE ranked.id = co.id;

-- Helpful index for fast ordered loads
CREATE INDEX IF NOT EXISTS idx_canvas_objects_project_z
ON public.canvas_objects (project_id, z_index, created_at);