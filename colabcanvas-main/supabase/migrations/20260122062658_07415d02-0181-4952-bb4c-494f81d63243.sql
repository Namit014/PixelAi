-- Create think_conversations table for RUMI chat history
CREATE TABLE public.think_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create think_messages table for individual messages
CREATE TABLE public.think_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.think_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.think_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.think_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for think_conversations
CREATE POLICY "Users can view own conversations" 
ON public.think_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" 
ON public.think_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" 
ON public.think_conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" 
ON public.think_conversations 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for think_messages
CREATE POLICY "Users can view own messages" 
ON public.think_messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.think_conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own messages" 
ON public.think_messages 
FOR INSERT 
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.think_conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own messages" 
ON public.think_messages 
FOR DELETE 
USING (
  conversation_id IN (
    SELECT id FROM public.think_conversations WHERE user_id = auth.uid()
  )
);

-- Add updated_at trigger for think_conversations
CREATE TRIGGER update_think_conversations_updated_at
BEFORE UPDATE ON public.think_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_think_conversations_user_id ON public.think_conversations(user_id);
CREATE INDEX idx_think_conversations_updated_at ON public.think_conversations(updated_at DESC);
CREATE INDEX idx_think_messages_conversation_id ON public.think_messages(conversation_id);
CREATE INDEX idx_think_messages_created_at ON public.think_messages(created_at);