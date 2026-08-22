import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ChatMessage } from '@/stores/presentationStore';
import { supabase } from '@/integrations/supabase/client';
import { SlideToolbar } from '@/components/presentation/SlideToolbar';
import { SlideToolRail } from '@/components/presentation/SlideToolRail';
import { SlideWorkspace } from '@/components/presentation/SlideWorkspace';
import { SlideGridOverview } from '@/components/presentation/SlideGridOverview';
import { SlideAIPanel } from '@/components/presentation/SlideAIPanel';
import { SlideThumbnailPanel } from '@/components/presentation/SlideThumbnailPanel';

import { SlideBottomControls } from '@/components/presentation/SlideBottomControls';
import { SlideTimeline } from '@/components/presentation/SlideTimeline';

export default function CosmoPresentation() {
  const isEmpty = usePresentationStore((s) => s.isEmpty);
  const viewMode = usePresentationStore((s) => s.viewMode);
  const addSlide = usePresentationStore((s) => s.addSlide);
  const [searchParams] = useSearchParams();
  const presentationId = searchParams.get('presentationId');
  const storeId = usePresentationStore((s) => s.id);
  const chatMessages = usePresentationStore((s) => s.chatMessages);
  const chatLoadedRef = useRef(false);

  // Auto-add a blank slide if deck is empty
  useEffect(() => {
    if (isEmpty) {
      addSlide({
        id: crypto.randomUUID(),
        layout: 'blank' as any,
        contentBlocks: [],
        background: {},
      } as any);
    }
  }, [isEmpty, addSlide]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load presentation + chat history
  useEffect(() => {
    if (!presentationId) return;
    if (storeId === presentationId) return;

    chatLoadedRef.current = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', presentationId)
        .single();
      if (error || !data) return;

      const store = usePresentationStore.getState();
      store.setTitle(data.title || 'Untitled Presentation');
      if (data.theme_id) store.setTheme(data.theme_id);
      if (data.design_tokens) store.setDesignTokens(data.design_tokens as any);
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        store.setSlides(data.slides as any);
      }
      usePresentationStore.setState({ id: presentationId, isEmpty: !(data.slides && (data.slides as any[]).length > 0) });

      // Load chat history
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (userId) {
        const { data: chatData } = await supabase
          .from('presentation_chats')
          .select('messages')
          .eq('presentation_id', presentationId)
          .eq('user_id', userId)
          .maybeSingle();
        if (chatData?.messages && Array.isArray(chatData.messages)) {
          usePresentationStore.setState({ chatMessages: chatData.messages as unknown as ChatMessage[] });
        }
      }
      chatLoadedRef.current = true;
    };
    load();
  }, [presentationId, storeId]);

  // Debounce-save chat messages
  const saveChat = useCallback(async (msgs: ChatMessage[]) => {
    if (!presentationId) return;
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    await supabase.from('presentation_chats').upsert(
      { presentation_id: presentationId, user_id: userId, messages: msgs as any },
      { onConflict: 'presentation_id,user_id' }
    );
  }, [presentationId]);

  useEffect(() => {
    if (!chatLoadedRef.current || !presentationId || chatMessages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveChat(chatMessages), 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [chatMessages, presentationId, saveChat]);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <SlideToolbar />

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto bg-white">
          {viewMode === 'grid' ? <SlideGridOverview /> : <SlideWorkspace />}
        </div>

        <SlideToolRail onOpenDiagram={() => usePresentationStore.getState().setDiagramOpen(true)} />
        {!isEmpty && <SlideThumbnailPanel />}
        <SlideAIPanel />

        {/* Floating bottom-left controls */}
        {!isEmpty && <SlideBottomControls />}
        {!isEmpty && <SlideTimeline />}
      </div>
    </div>
  );
}
