
ALTER TABLE public.projects
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_brand_id ON public.projects(brand_id);
