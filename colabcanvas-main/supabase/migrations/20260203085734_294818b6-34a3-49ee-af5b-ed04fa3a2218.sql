-- Create rumi_creative_sessions table for strategic planning sessions
CREATE TABLE public.rumi_creative_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'creative_intelligence',
  business_context JSONB DEFAULT '{}'::jsonb,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rumi_decision_cards table for generated strategic directions
CREATE TABLE public.rumi_decision_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.rumi_creative_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  business_reasoning TEXT,
  emotional_positioning TEXT,
  visual_philosophy TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  performance_probability INTEGER DEFAULT 50 CHECK (performance_probability >= 0 AND performance_probability <= 100),
  brand_alignment_score INTEGER DEFAULT 0 CHECK (brand_alignment_score >= 0 AND brand_alignment_score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'exported')),
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rumi_taste_profile table for evolving user preferences
CREATE TABLE public.rumi_taste_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preference_vectors JSONB DEFAULT '{}'::jsonb,
  decision_patterns JSONB DEFAULT '{}'::jsonb,
  brand_affinity JSONB DEFAULT '{}'::jsonb,
  total_sessions INTEGER DEFAULT 0,
  acceptance_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rumi_decision_outcomes table for learning from results
CREATE TABLE public.rumi_decision_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_card_id UUID NOT NULL REFERENCES public.rumi_decision_cards(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('design_generated', 'iteration_loop', 'stakeholder_approved', 'stakeholder_rejected', 'exported_to_canvas')),
  canvas_edits_count INTEGER DEFAULT 0,
  final_satisfaction INTEGER CHECK (final_satisfaction >= 1 AND final_satisfaction <= 5),
  outcome_metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rumi_creative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rumi_decision_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rumi_taste_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rumi_decision_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rumi_creative_sessions
CREATE POLICY "Users can view their own creative sessions"
ON public.rumi_creative_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative sessions"
ON public.rumi_creative_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creative sessions"
ON public.rumi_creative_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative sessions"
ON public.rumi_creative_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for rumi_decision_cards (via session ownership)
CREATE POLICY "Users can view decision cards from their sessions"
ON public.rumi_decision_cards FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rumi_creative_sessions 
  WHERE id = rumi_decision_cards.session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create decision cards in their sessions"
ON public.rumi_decision_cards FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rumi_creative_sessions 
  WHERE id = rumi_decision_cards.session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update decision cards in their sessions"
ON public.rumi_decision_cards FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rumi_creative_sessions 
  WHERE id = rumi_decision_cards.session_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete decision cards in their sessions"
ON public.rumi_decision_cards FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.rumi_creative_sessions 
  WHERE id = rumi_decision_cards.session_id AND user_id = auth.uid()
));

-- RLS Policies for rumi_taste_profile
CREATE POLICY "Users can view their own taste profile"
ON public.rumi_taste_profile FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own taste profile"
ON public.rumi_taste_profile FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own taste profile"
ON public.rumi_taste_profile FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for rumi_decision_outcomes (via decision card -> session ownership)
CREATE POLICY "Users can view outcomes from their decision cards"
ON public.rumi_decision_outcomes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rumi_decision_cards dc
  JOIN public.rumi_creative_sessions cs ON cs.id = dc.session_id
  WHERE dc.id = rumi_decision_outcomes.decision_card_id AND cs.user_id = auth.uid()
));

CREATE POLICY "Users can create outcomes for their decision cards"
ON public.rumi_decision_outcomes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rumi_decision_cards dc
  JOIN public.rumi_creative_sessions cs ON cs.id = dc.session_id
  WHERE dc.id = rumi_decision_outcomes.decision_card_id AND cs.user_id = auth.uid()
));

CREATE POLICY "Users can update outcomes for their decision cards"
ON public.rumi_decision_outcomes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rumi_decision_cards dc
  JOIN public.rumi_creative_sessions cs ON cs.id = dc.session_id
  WHERE dc.id = rumi_decision_outcomes.decision_card_id AND cs.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_rumi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_rumi_creative_sessions_updated_at
BEFORE UPDATE ON public.rumi_creative_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_rumi_updated_at();

CREATE TRIGGER update_rumi_taste_profile_updated_at
BEFORE UPDATE ON public.rumi_taste_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_rumi_updated_at();

-- Enable realtime for creative sessions to monitor activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.rumi_creative_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rumi_decision_cards;