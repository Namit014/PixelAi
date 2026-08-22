-- Create table for canvas objects (elements outside artboards)
CREATE TABLE IF NOT EXISTS public.canvas_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  object_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.canvas_objects ENABLE ROW LEVEL SECURITY;

-- Create policies for canvas objects
CREATE POLICY "Users can view their own canvas objects"
  ON public.canvas_objects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own canvas objects"
  ON public.canvas_objects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas objects"
  ON public.canvas_objects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas objects"
  ON public.canvas_objects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_canvas_objects_updated_at
  BEFORE UPDATE ON public.canvas_objects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();