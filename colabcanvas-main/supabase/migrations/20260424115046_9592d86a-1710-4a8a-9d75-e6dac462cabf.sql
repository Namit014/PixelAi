-- 1) Track completion state on profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS completion_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (completion_state IN ('pending','partial','complete'));

ALTER TABLE public.freelancer_profiles
  ADD COLUMN IF NOT EXISTS completion_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (completion_state IN ('pending','partial','complete'));

-- 2) Talent project freelancer routing (kept minimal & safe)
ALTER TABLE public.talent_projects
  ADD COLUMN IF NOT EXISTS assigned_freelancer_id UUID,
  ADD COLUMN IF NOT EXISTS freelancer_visible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_talent_projects_assigned
  ON public.talent_projects(assigned_freelancer_id)
  WHERE assigned_freelancer_id IS NOT NULL;

-- Allow assigned freelancers to view their routed projects (read-only)
DROP POLICY IF EXISTS "talent_projects assigned freelancer read"
  ON public.talent_projects;

CREATE POLICY "talent_projects assigned freelancer read"
ON public.talent_projects FOR SELECT
TO authenticated
USING (
  freelancer_visible = true
  AND assigned_freelancer_id = auth.uid()
);

-- 3) Backfill user_intent for any existing users so Talent surfaces always have a row
INSERT INTO public.user_intent (user_id, intent)
SELECT p.id, 'undecided'
FROM public.profiles p
LEFT JOIN public.user_intent ui ON ui.user_id = p.id
WHERE ui.user_id IS NULL;