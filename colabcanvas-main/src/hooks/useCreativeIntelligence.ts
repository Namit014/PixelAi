import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ActivityStep } from '@/components/think/ActivityFeed';

export interface DecisionCard {
  id: string;
  session_id: string;
  title: string;
  business_reasoning: string | null;
  emotional_positioning: string | null;
  visual_philosophy: string | null;
  risk_level: 'low' | 'medium' | 'high';
  performance_probability: number;
  brand_alignment_score: number;
  metadata: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected' | 'exported';
  user_feedback: string | null;
  created_at: string;
}

export interface CreativeSession {
  id: string;
  user_id: string;
  session_type: string;
  business_context: {
    goal?: string;
    audience?: string;
    platform?: string;
    riskTolerance?: number;
    successMetrics?: string;
  };
  brand_id: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface TasteProfile {
  id: string;
  user_id: string;
  preference_vectors: Record<string, unknown>;
  decision_patterns: Record<string, unknown>;
  brand_affinity: Record<string, unknown>;
  total_sessions: number;
  acceptance_rate: number;
  updated_at: string;
}

export interface StrategicInput {
  goal: string;
  audience: string;
  platform: string;
  riskTolerance: number;
  successMetrics?: string;
  brandId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  proposals?: ContentProposal[];
}

export interface ContentProposal {
  id: string;
  user_id: string;
  brand_id: string | null;
  session_id: string | null;
  content_type: string;
  title: string;
  copy_text: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  image_prompt: string | null;
  platform_specs: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected' | 'iterating';
  user_feedback: string | null;
  iteration_count: number;
  created_at: string;
}

export interface ChatResponse {
  type: 'chat' | 'clarify' | 'ready_to_analyze' | 'ready_to_generate' | 'ready_to_generate_website' | 'edit_section';
  content: string;
  briefData?: StrategicInput;
  contentPreferences?: {
    contentType: string | null;
    platform: string | null;
    quantity: number;
  };
  websitePreferences?: {
    pageType: string;
    sections: string[];
    audience: string;
    tone: string;
    cta_goal: string;
  };
  editSection?: {
    presentationId: string;
    sectionIndex: number;
    instruction: string;
  };
}

export interface ContextChip {
  type: 'project' | 'brand';
  id: string;
  name: string;
}

export function useCreativeIntelligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const pendingConvRef = useRef<Promise<string | null> | null>(null);

  // Helper to set both state and ref in sync
  const setConversationIdSynced = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  // Load or create a conversation for message persistence (deduped)
  const getOrCreateConversation = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    if (conversationIdRef.current) return conversationIdRef.current;

    // Dedup: if already fetching, return same promise
    if (pendingConvRef.current) return pendingConvRef.current;

    const promise = (async () => {
      // Try to find existing recent conversation
      const { data: existing } = await supabase
        .from('think_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        setConversationIdSynced(existing.id);
        return existing.id;
      }

      // Create new
      const { data: newConv, error } = await supabase
        .from('think_conversations')
        .insert({ user_id: user.id, title: 'Creative Chat' })
        .select('id')
        .single();

      if (error || !newConv) return null;
      setConversationIdSynced(newConv.id);
      return newConv.id;
    })();

    pendingConvRef.current = promise;
    try {
      return await promise;
    } finally {
      pendingConvRef.current = null;
    }
  }, [user?.id, setConversationIdSynced]);

  // Load persisted messages
  const { data: persistedMessages = [] } = useQuery({
    queryKey: ['think-messages', user?.id, conversationId],
    queryFn: async () => {
      if (!user?.id || !conversationId) return [];
      const { data, error } = await supabase
        .from('think_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) return [];
      return (data || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) as ChatMessage[];
    },
    enabled: !!user?.id && !!conversationId,
    staleTime: 30 * 1000,
  });

  // Persist a message to the database (fire-and-forget with error logging)
  const persistMessage = useCallback(async (role: string, content: string) => {
    try {
      const convId = await getOrCreateConversation();
      if (!convId || !content) {
        console.warn('[persistMessage] Skipped: convId=', convId, 'content length=', content?.length);
        return;
      }
      
      const { error: insertError } = await supabase.from('think_messages').insert({
        conversation_id: convId,
        role,
        content,
      });
      if (insertError) {
        console.error('[persistMessage] Insert failed:', insertError);
        return;
      }
      // Update conversation timestamp
      await supabase.from('think_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
      // Invalidate query so messages survive reload
      queryClient.invalidateQueries({ queryKey: ['think-messages'] });
    } catch (err) {
      console.error('[persistMessage] Unexpected error:', err);
    }
  }, [getOrCreateConversation, queryClient]);

  // Fetch user's creative sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['creative-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('rumi_creative_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as CreativeSession[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch decision cards for current session
  const { data: decisionCards = [], isLoading: cardsLoading, refetch: refetchCards } = useQuery({
    queryKey: ['decision-cards', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const { data, error } = await supabase
        .from('rumi_decision_cards')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('performance_probability', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DecisionCard[];
    },
    enabled: !!currentSessionId,
  });

  // Fetch user's taste profile
  const { data: tasteProfile } = useQuery({
    queryKey: ['taste-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('rumi_taste_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as TasteProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Create new strategic session and generate decisions
  const analyzeStrategicDirection = useCallback(async (input: StrategicInput) => {
    if (!user?.id) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return null;
    }

    setIsAnalyzing(true);

    try {
      // Create session first
      const { data: session, error: sessionError } = await supabase
        .from('rumi_creative_sessions')
        .insert({
          user_id: user.id,
          session_type: 'creative_intelligence',
          business_context: {
            goal: input.goal,
            audience: input.audience,
            platform: input.platform,
            riskTolerance: input.riskTolerance,
            successMetrics: input.successMetrics,
          },
          brand_id: input.brandId || null,
          status: 'active',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setCurrentSessionId(session.id);

      // Call edge function to generate decision cards
      const response = await supabase.functions.invoke(
        'creative-intelligence-analyze',
        {
          body: {
            sessionId: session.id,
            businessContext: input,
            brandId: input.brandId,
            userId: user.id,
          },
        }
      );

      // Handle credit/rate limit errors with clear messages
      if (response.error) {
        const errorBody = response.data;
        if (errorBody?.error) {
          throw new Error(errorBody.error);
        }
        throw response.error;
      }

      const analysisResult = response.data;

      // Refresh cards
      await refetchCards();
      queryClient.invalidateQueries({ queryKey: ['creative-sessions', user.id] });

      toast({ title: 'Strategic directions generated', description: `${analysisResult?.cardsCount || 0} creative paths identified` });

      return session;
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not generate strategic directions',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user?.id, toast, refetchCards, queryClient]);

  // Update decision card status (accept/reject) and recalculate acceptance rate
  const updateCardStatus = useMutation({
    mutationFn: async ({ cardId, status, feedback }: { cardId: string; status: 'accepted' | 'rejected' | 'exported'; feedback?: string }) => {
      const { error } = await supabase
        .from('rumi_decision_cards')
        .update({ status, user_feedback: feedback || null })
        .eq('id', cardId);
      
      if (error) throw error;

      // Record outcome for learning
      await supabase.from('rumi_decision_outcomes').insert({
        decision_card_id: cardId,
        outcome_type: status === 'exported' ? 'exported_to_canvas' : status === 'accepted' ? 'design_generated' : 'iteration_loop',
      });

      // Recalculate acceptance rate for taste profile
      if (user?.id && (status === 'accepted' || status === 'rejected')) {
        // Get all cards for this user to calculate acceptance rate
        const { data: allCards } = await supabase
          .from('rumi_decision_cards')
          .select('status, session:rumi_creative_sessions!inner(user_id)')
          .eq('session.user_id', user.id)
          .in('status', ['accepted', 'rejected', 'exported']);

        if (allCards && allCards.length > 0) {
          const acceptedCount = allCards.filter(c => c.status === 'accepted' || c.status === 'exported').length;
          const totalDecided = allCards.length;
          const newAcceptanceRate = totalDecided > 0 ? (acceptedCount / totalDecided) * 100 : 0;

          // Update taste profile with new acceptance rate
          await supabase
            .from('rumi_taste_profile')
            .upsert({
              user_id: user.id,
              acceptance_rate: newAcceptanceRate,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
      }
    },
    onSuccess: () => {
      refetchCards();
      // Invalidate taste profile to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['taste-profile', user?.id] });
    },
  });

  // Load a specific session
  const loadSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Start new session (clear current)
  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
  }, []);

  // Send chat message for conversational flow — now with SSE streaming + activity events
  const sendChatMessage = useCallback(async (
    message: string,
    conversationHistory: ChatMessage[],
    context?: { existingChips?: ContextChip[] }
  ): Promise<ChatResponse> => {
    setIsChatting(true);
    setActivitySteps([{ step: 'thinking', message: 'Processing your message...', timestamp: Date.now() }]);
    setStreamingContent('');

    // Abort any previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const allMessages: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user' as const, content: message },
      ];

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Fetch full brand details if a brand chip is tagged
      let brandDetails: Record<string, unknown> | undefined;
      const brandChip = context?.existingChips?.find(c => c.type === 'brand');
      if (brandChip?.id) {
        try {
          const { data: brandData } = await supabase
            .from('brands')
            .select('*, brand_sections(*, brand_content_blocks(*)), brand_assets(file_name, asset_type, semantic_tags, mime_type, storage_url, asset_category)')
            .eq('id', brandChip.id)
            .single();
          if (brandData) {
            // Extract colors from content blocks
            const colors: { name: string; hex: string; usage?: string }[] = [];
            const typography: { font_family: string; weights?: string[]; usage?: string }[] = [];
            const brandStory: string[] = [];

            (brandData.brand_sections || []).forEach((section: any) => {
              (section.brand_content_blocks || []).forEach((block: any) => {
                if (block.block_type === 'colours' && block.content?.colors) {
                  block.content.colors.forEach((c: any) => colors.push({ name: c.name, hex: c.hex, usage: c.usage }));
                }
                if ((block.block_type === 'typography' || block.block_type === 'typography_specimen') && block.content?.font_family) {
                  typography.push({ font_family: block.content.font_family, weights: block.content.weights || block.content.font_weights, usage: block.content.usage_notes || block.content.usage });
                }
                if (block.block_type === 'text' && block.content?.text) {
                  brandStory.push(block.content.text);
                }
              });
            });

            // Extract imagery keywords from assets
            const imageryKeywords = new Set<string>();
            (brandData.brand_assets || []).forEach((asset: any) => {
              if (asset.semantic_tags) asset.semantic_tags.forEach((t: string) => imageryKeywords.add(t));
            });

            brandDetails = {
              name: brandData.name,
              industry: brandData.industry,
              description: brandData.description,
              target_audience: brandData.target_audience,
              brand_voice: brandData.brand_voice,
              logo_primary_url: brandData.logo_primary_url,
              logo_secondary_url: brandData.logo_secondary_url,
              website_url: brandData.website_url,
              colors,
              typography,
              brand_story: brandStory.join('\n'),
              imagery_keywords: Array.from(imageryKeywords),
              brand_system_snapshot: brandData.brand_system_snapshot,
            };
          }
        } catch (e) {
          console.warn('Failed to fetch brand details for CI context:', e);
        }
      }

      // Use creative-intelligence-chat for ask-first conversational flow
      const { data: ciData, error: ciError } = await supabase.functions.invoke('creative-intelligence-chat', {
        body: {
          messages: allMessages,
          userId: user?.id,
          context: context ? {
            existingChips: context.existingChips?.map(c => ({ type: c.type, id: c.id, name: c.name })),
            brandDetails,
          } : undefined,
        },
      });

      if (ciError) throw new Error(ciError.message || 'Chat failed');

      // Persist user message
      persistMessage('user', message);
      
      const response = ciData as ChatResponse;
      return {
        type: response.type || 'chat',
        content: response.content || "I'm here to help with your creative strategy.",
        briefData: response.briefData,
        contentPreferences: response.contentPreferences,
        websitePreferences: response.websitePreferences,
        editSection: response.editSection,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { type: 'chat', content: '' };
      }
      console.error('Chat error:', error);
      toast({
        title: 'Chat failed',
        description: 'Could not process your message',
        variant: 'destructive',
      });
      return {
        type: 'chat',
        content: "I encountered an issue. Could you try again?",
      };
    } finally {
      setIsChatting(false);
      setActivitySteps([]);
      setStreamingContent('');
    }
  }, [user?.id, toast, persistMessage]);

  // Generate content proposals
  const generateProposal = useCallback(async (
    brandId: string,
    contentType?: string,
    sessionId?: string,
  ): Promise<ContentProposal[]> => {
    if (!user?.id) return [];
    setIsGeneratingProposal(true);

    try {
      const { data, error } = await supabase.functions.invoke('rumi-proactive-agent', {
        body: {
          brandId,
          userId: user.id,
          sessionId,
          contentType,
        },
      });

      if (error) throw error;
      return data?.proposals || [];
    } catch (error) {
      console.error('Proposal generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Could not generate proposals',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [user?.id, toast]);

  // Iterate on a proposal
  const iterateProposal = useCallback(async (
    proposalId: string,
    feedback: string,
    brandId: string,
  ): Promise<ContentProposal[]> => {
    if (!user?.id) return [];
    setIsGeneratingProposal(true);

    try {
      // Get original proposal for context
      const { data: original } = await supabase
        .from('rumi_content_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      // Mark original as iterating
      await supabase
        .from('rumi_content_proposals')
        .update({ status: 'iterating', user_feedback: feedback })
        .eq('id', proposalId);

      const { data, error } = await supabase.functions.invoke('rumi-proactive-agent', {
        body: {
          brandId,
          userId: user.id,
          iteration: true,
          proposalId,
          feedback,
          previousPrompt: original?.image_prompt,
          contentType: original?.content_type,
        },
      });

      if (error) throw error;
      return data?.proposals || [];
    } catch (error) {
      console.error('Iteration error:', error);
      toast({
        title: 'Iteration failed',
        description: 'Could not iterate on proposal',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [user?.id, toast]);

  // Update proposal status
  const updateProposalStatus = useCallback(async (
    proposalId: string,
    status: 'accepted' | 'rejected',
    feedback?: string,
  ) => {
    const { error } = await supabase
      .from('rumi_content_proposals')
      .update({ status, user_feedback: feedback || null })
      .eq('id', proposalId);

    if (error) {
      console.error('Update proposal status error:', error);
    }
  }, []);

  return {
    // State
    isAnalyzing,
    isChatting,
    isGeneratingProposal,
    currentSessionId,
    sessions,
    sessionsLoading,
    decisionCards,
    cardsLoading,
    tasteProfile,
    activitySteps,
    streamingContent,
    persistedMessages,
    conversationId,

    // Actions
    analyzeStrategicDirection,
    updateCardStatus: updateCardStatus.mutate,
    loadSession,
    startNewSession,
    sendChatMessage,
    generateProposal,
    iterateProposal,
    updateProposalStatus,
    getOrCreateConversation,
    persistMessage,
  };
}
