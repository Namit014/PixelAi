
-- USER INTENT
CREATE TABLE public.user_intent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  intent TEXT NOT NULL DEFAULT 'undecided' CHECK (intent IN ('client','freelancer','undecided')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_intent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_intent self select" ON public.user_intent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_intent self insert" ON public.user_intent FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_intent self update" ON public.user_intent FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_intent_updated BEFORE UPDATE ON public.user_intent FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLIENT PROFILES
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_type TEXT,
  industry TEXT,
  stage TEXT,
  typical_needs TEXT[] DEFAULT '{}',
  budget_range TEXT,
  taste_picks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_profiles self all" ON public.client_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_client_profiles_updated BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FREELANCER PROFILES
CREATE TABLE public.freelancer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  domain TEXT[] DEFAULT '{}',
  role_level TEXT,
  tools TEXT[] DEFAULT '{}',
  portfolio_urls TEXT[] DEFAULT '{}',
  availability TEXT,
  vetting_status TEXT NOT NULL DEFAULT 'pending' CHECK (vetting_status IN ('pending','in_review','approved','rejected')),
  evaluation_submission JSONB DEFAULT '{}'::jsonb,
  quality_score NUMERIC,
  communication_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "freelancer_profiles self select" ON public.freelancer_profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "freelancer_profiles self insert" ON public.freelancer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "freelancer_profiles self update" ON public.freelancer_profiles FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_freelancer_profiles_updated BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TALENT PROJECTS
CREATE TABLE public.talent_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  brief JSONB DEFAULT '{}'::jsonb,
  extracted JSONB DEFAULT '{}'::jsonb,
  team_composition JSONB DEFAULT '{}'::jsonb,
  timeline JSONB DEFAULT '{}'::jsonb,
  pricing JSONB DEFAULT '{}'::jsonb,
  explanation JSONB DEFAULT '{}'::jsonb,
  controls JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','proposal','locked','paid','active','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "talent_projects self all" ON public.talent_projects FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_talent_projects_user ON public.talent_projects(user_id);
CREATE TRIGGER trg_talent_projects_updated BEFORE UPDATE ON public.talent_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TALENT MESSAGES
CREATE TABLE public.talent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.talent_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','ai','system')),
  content TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','file','link','question')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "talent_messages self select" ON public.talent_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "talent_messages self insert" ON public.talent_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_talent_messages_project ON public.talent_messages(project_id);

-- TALENT MEMORY
CREATE TABLE public.talent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  past_teams JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "talent_memory self all" ON public.talent_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_talent_memory_updated BEFORE UPDATE ON public.talent_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
