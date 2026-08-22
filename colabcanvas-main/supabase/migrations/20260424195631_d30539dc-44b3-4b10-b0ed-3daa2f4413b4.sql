-- 1) talent_messages: extend kind + recipient + read_at, replace RLS with project-participant model
ALTER TABLE public.talent_messages
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE public.talent_messages DROP CONSTRAINT IF EXISTS talent_messages_kind_check;
ALTER TABLE public.talent_messages
  ADD CONSTRAINT talent_messages_kind_check
  CHECK (kind = ANY (ARRAY['text','file','link','question','meeting','system_link','ai_note']));

DROP POLICY IF EXISTS "talent_messages self insert" ON public.talent_messages;
DROP POLICY IF EXISTS "talent_messages self select" ON public.talent_messages;

CREATE OR REPLACE FUNCTION public.is_talent_project_participant(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.talent_projects p
    WHERE p.id = _project_id
      AND (
        p.user_id = _user_id
        OR (p.assigned_freelancer_id = _user_id AND p.freelancer_visible = true)
      )
  ) OR public.has_role(_user_id, 'admin'::app_role)
$$;

CREATE POLICY "talent_messages participants select" ON public.talent_messages
  FOR SELECT USING (public.is_talent_project_participant(project_id, auth.uid()));

CREATE POLICY "talent_messages participants insert" ON public.talent_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_talent_project_participant(project_id, auth.uid())
  );

CREATE POLICY "talent_messages own update" ON public.talent_messages
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.talent_messages REPLICA IDENTITY FULL;

-- 2) talent_meetings
CREATE TABLE IF NOT EXISTS public.talent_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.talent_projects(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Project call',
  scheduled_for timestamptz,
  duration_min int NOT NULL DEFAULT 30,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  recording_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talent_meetings_project ON public.talent_meetings (project_id);

ALTER TABLE public.talent_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_meetings participants select" ON public.talent_meetings
  FOR SELECT USING (public.is_talent_project_participant(project_id, auth.uid()));
CREATE POLICY "talent_meetings participants insert" ON public.talent_meetings
  FOR INSERT WITH CHECK (
    auth.uid() = host_user_id
    AND public.is_talent_project_participant(project_id, auth.uid())
  );
CREATE POLICY "talent_meetings participants update" ON public.talent_meetings
  FOR UPDATE USING (public.is_talent_project_participant(project_id, auth.uid()));

ALTER TABLE public.talent_meetings REPLICA IDENTITY FULL;

-- 3) talent_meeting_participants
CREATE TABLE IF NOT EXISTS public.talent_meeting_participants (
  meeting_id uuid NOT NULL REFERENCES public.talent_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('client','freelancer','rumi','guest','admin')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (meeting_id, user_id)
);
ALTER TABLE public.talent_meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_meeting_participants select" ON public.talent_meeting_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.talent_meetings m
      WHERE m.id = talent_meeting_participants.meeting_id
        AND public.is_talent_project_participant(m.project_id, auth.uid())
    )
  );
CREATE POLICY "talent_meeting_participants self insert" ON public.talent_meeting_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "talent_meeting_participants self update" ON public.talent_meeting_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- 4) talent_call_notes
CREATE TABLE IF NOT EXISTS public.talent_call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.talent_meetings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.talent_projects(id) ON DELETE CASCADE,
  transcript_md text,
  summary_md text,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talent_call_notes_project ON public.talent_call_notes (project_id);

ALTER TABLE public.talent_call_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_call_notes participants select" ON public.talent_call_notes
  FOR SELECT USING (public.is_talent_project_participant(project_id, auth.uid()));
CREATE POLICY "talent_call_notes participants insert" ON public.talent_call_notes
  FOR INSERT WITH CHECK (public.is_talent_project_participant(project_id, auth.uid()));

ALTER TABLE public.talent_call_notes REPLICA IDENTITY FULL;

-- 5) talent_projects: add link columns + reproposing status
ALTER TABLE public.talent_projects
  ADD COLUMN IF NOT EXISTS linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_cosmo_id uuid;

ALTER TABLE public.talent_projects DROP CONSTRAINT IF EXISTS talent_projects_status_check;
ALTER TABLE public.talent_projects
  ADD CONSTRAINT talent_projects_status_check
  CHECK (status = ANY (ARRAY['intake','proposal','contracted','locked','paid','active','completed','reproposing']));

-- 6) Allow assigned freelancer (collaborator) to read/write linked Canvas project
-- The freelancer is granted edit access through project_collaborators (already exists).
-- Extend public.projects RLS so collaborators can SELECT and UPDATE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Collaborators can view projects') THEN
    CREATE POLICY "Collaborators can view projects" ON public.projects
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = id AND pc.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Collaborators with edit can update projects') THEN
    CREATE POLICY "Collaborators with edit can update projects" ON public.projects
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc
          WHERE pc.project_id = id AND pc.user_id = auth.uid() AND pc.permission IN ('edit','admin')
        )
      );
  END IF;
END$$;

-- 7) Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_call_notes;