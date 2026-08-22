
-- Social posts table
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content_text TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  post_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social posts" ON public.social_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own social posts" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social posts" ON public.social_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own social posts" ON public.social_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts(scheduled_at) WHERE status = 'scheduled';

-- Social post analytics table
CREATE TABLE public.social_post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post analytics" ON public.social_post_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.social_posts WHERE social_posts.id = post_id AND social_posts.user_id = auth.uid())
);
CREATE POLICY "Users can create own post analytics" ON public.social_post_analytics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.social_posts WHERE social_posts.id = post_id AND social_posts.user_id = auth.uid())
);

CREATE INDEX idx_social_post_analytics_post_id ON public.social_post_analytics(post_id);
