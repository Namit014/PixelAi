
-- Create presentation_chats table for agent chat history persistence
CREATE TABLE public.presentation_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one chat per presentation per user
CREATE UNIQUE INDEX idx_presentation_chats_unique ON public.presentation_chats (presentation_id, user_id);

-- Enable RLS
ALTER TABLE public.presentation_chats ENABLE ROW LEVEL SECURITY;

-- Users can only access their own chats
CREATE POLICY "Users can view own chats" ON public.presentation_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.presentation_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON public.presentation_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.presentation_chats FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_presentation_chats_updated_at
  BEFORE UPDATE ON public.presentation_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
