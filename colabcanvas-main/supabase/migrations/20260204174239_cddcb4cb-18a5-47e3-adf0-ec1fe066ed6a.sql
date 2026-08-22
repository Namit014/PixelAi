-- =====================================================
-- Brand Cognition Engine - Database Schema
-- Sprint 1: Foundation Tables
-- =====================================================

-- Table: brand_cognition_memory
-- Stores persistent brand reasoning vectors and patterns
CREATE TABLE public.brand_cognition_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  
  -- Visual pattern distributions
  visual_patterns jsonb DEFAULT '{}',
  
  -- Pattern vectors (for ML/similarity)
  typography_usage jsonb DEFAULT '{}',
  layout_density_patterns jsonb DEFAULT '{}',
  color_relationship_vectors jsonb DEFAULT '{}',
  
  -- Behavioral analysis
  emotional_tone_mapping jsonb DEFAULT '{}',
  campaign_style_clusters jsonb DEFAULT '[]',
  design_risk_tolerance numeric DEFAULT 0.5,
  channel_style_variations jsonb DEFAULT '{}',
  
  -- Aggregated metrics
  total_designs_analyzed integer DEFAULT 0,
  last_updated_at timestamp with time zone DEFAULT now(),
  confidence_score numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(brand_id, user_id)
);

-- Enable RLS
ALTER TABLE public.brand_cognition_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_cognition_memory
CREATE POLICY "Users can view their own brand cognition memory"
  ON public.brand_cognition_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand cognition memory"
  ON public.brand_cognition_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand cognition memory"
  ON public.brand_cognition_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand cognition memory"
  ON public.brand_cognition_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_brand_cognition_memory_updated_at
  BEFORE UPDATE ON public.brand_cognition_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Table: brand_design_events
-- Event stream for tracking design actions
-- =====================================================
CREATE TABLE public.brand_design_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Event details
  event_type text NOT NULL,
  
  -- Design snapshot at event time
  design_snapshot jsonb DEFAULT '{}',
  
  -- Extracted visual features
  visual_features jsonb DEFAULT '{}',
  
  -- Context
  channel text,
  campaign_id text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Index for efficient time-series queries
CREATE INDEX idx_brand_design_events_brand_time 
  ON public.brand_design_events(brand_id, created_at DESC);

CREATE INDEX idx_brand_design_events_user_brand
  ON public.brand_design_events(user_id, brand_id);

-- Enable RLS
ALTER TABLE public.brand_design_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_design_events
CREATE POLICY "Users can view their own brand design events"
  ON public.brand_design_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand design events"
  ON public.brand_design_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Table: project_context_intel
-- AI-inferred project context from data
-- =====================================================
CREATE TABLE public.project_context_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  
  -- AI-inferred context
  inferred_goal text,
  inferred_audience text,
  inferred_channel text,
  timeline_urgency text DEFAULT 'normal',
  
  -- Historical references
  similar_campaign_ids jsonb DEFAULT '[]',
  performance_benchmarks jsonb DEFAULT '{}',
  
  -- Auto-attached context flags
  auto_context_enabled boolean DEFAULT true,
  
  -- Confidence scores
  goal_confidence numeric DEFAULT 0,
  audience_confidence numeric DEFAULT 0,
  channel_confidence numeric DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_context_intel ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_context_intel
CREATE POLICY "Users can view their own project context intel"
  ON public.project_context_intel FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project context intel"
  ON public.project_context_intel FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project context intel"
  ON public.project_context_intel FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project context intel"
  ON public.project_context_intel FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_project_context_intel_updated_at
  BEFORE UPDATE ON public.project_context_intel
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Table: brand_drift_alerts
-- Detected brand drift events
-- =====================================================
CREATE TABLE public.brand_drift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  
  -- Drift details
  drift_type text NOT NULL,
  severity text DEFAULT 'warning',
  
  -- Deviation metrics
  deviation_score numeric NOT NULL,
  historical_variance numeric,
  current_value jsonb,
  expected_range jsonb,
  
  -- Correction suggestion
  correction_suggestion text,
  
  -- User response
  user_response text,
  responded_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_brand_drift_alerts_brand_time 
  ON public.brand_drift_alerts(brand_id, created_at DESC);

CREATE INDEX idx_brand_drift_alerts_user
  ON public.brand_drift_alerts(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.brand_drift_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_drift_alerts
CREATE POLICY "Users can view their own brand drift alerts"
  ON public.brand_drift_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand drift alerts"
  ON public.brand_drift_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand drift alerts"
  ON public.brand_drift_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- Table: rumi_learning_events
-- User behavior signals for continuous learning
-- =====================================================
CREATE TABLE public.rumi_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.rumi_creative_sessions(id) ON DELETE SET NULL,
  decision_card_id uuid REFERENCES public.rumi_decision_cards(id) ON DELETE SET NULL,
  
  -- Learning signal type
  signal_type text NOT NULL,
  
  -- Signal data
  signal_data jsonb DEFAULT '{}',
  
  -- Context at time of signal
  context_snapshot jsonb DEFAULT '{}',
  
  created_at timestamp with time zone DEFAULT now()
);

-- Index for efficient user learning queries
CREATE INDEX idx_rumi_learning_user_brand 
  ON public.rumi_learning_events(user_id, brand_id, created_at DESC);

CREATE INDEX idx_rumi_learning_session
  ON public.rumi_learning_events(session_id);

-- Enable RLS
ALTER TABLE public.rumi_learning_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rumi_learning_events
CREATE POLICY "Users can view their own learning events"
  ON public.rumi_learning_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning events"
  ON public.rumi_learning_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Table: rumi_context_fusion_log (Audit Trail)
-- Audit trail of context merging decisions
-- =====================================================
CREATE TABLE public.rumi_context_fusion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.rumi_creative_sessions(id) ON DELETE SET NULL,
  
  -- Context sources used
  brand_memory_used boolean DEFAULT false,
  tagged_assets_count integer DEFAULT 0,
  tagged_projects_count integer DEFAULT 0,
  canvas_context_used boolean DEFAULT false,
  historical_decisions_count integer DEFAULT 0,
  
  -- Fusion metadata
  fusion_weights jsonb DEFAULT '{}',
  processing_time_ms integer,
  
  -- Result summary
  result_summary jsonb DEFAULT '{}',
  
  created_at timestamp with time zone DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_rumi_context_fusion_user
  ON public.rumi_context_fusion_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.rumi_context_fusion_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rumi_context_fusion_log
CREATE POLICY "Users can view their own context fusion logs"
  ON public.rumi_context_fusion_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own context fusion logs"
  ON public.rumi_context_fusion_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);