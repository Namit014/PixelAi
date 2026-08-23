import { useEffect, useRef, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, ImagePlus, Download, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlideToolbar } from '@/components/presentation/SlideToolbar';
import { SlideToolRail } from '@/components/presentation/SlideToolRail';
import { SlideAIPanel } from '@/components/presentation/SlideAIPanel';
import { SlideThumbnailPanel } from '@/components/presentation/SlideThumbnailPanel';
import { SlideBottomControls } from '@/components/presentation/SlideBottomControls';
import { SlideTimeline } from '@/components/presentation/SlideTimeline';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ChatMessage } from '@/stores/presentationStore';

const LOCAL_SERVER = import.meta.env.VITE_LOCAL_SERVER_URL || 'http://localhost:3001';

const QUICK_PROMPTS = [
  'Studio white background, soft shadows',
  'Luxury dark marble with spotlights',
  'Outdoor lifestyle, natural bokeh',
  'Minimalist flat-lay, clean shadows',
  'High-fashion editorial, dramatic light',
  'E-commerce hero, pure white',
];

export default function CosmoPresentation() {
  const [searchParams] = useSearchParams();
  const presentationId = searchParams.get('presentationId');
  const storeId = usePresentationStore((s) => s.id);
  const chatMessages = usePresentationStore((s) => s.chatMessages);
  const chatLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product Image State ──────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState('image/jpeg');
  const [prompt, setPrompt] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const [enhancedImages, setEnhancedImages] = useState<string[]>([]);
  const [selectedEnhanced, setSelectedEnhanced] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // ── Load presentation data ───────────────────────────────────────
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
      store.setTitle(data.title || 'Untitled');
      if (data.theme_id) store.setTheme(data.theme_id);
      if (data.design_tokens) store.setDesignTokens(data.design_tokens as any);

      usePresentationStore.setState({ id: presentationId });

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

  // ── File handling ────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    setUploadedMime(file.type);
    setEnhancedImages([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setUploadedBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── Enhance ──────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!uploadedBase64) { toast.error('Upload a product image first'); return; }
    setIsEnhancing(true);
    try {
      const finalPrompt = [selectedQuick, prompt.trim()].filter(Boolean).join('. ') || 'Professional product photo';
      const res = await fetch(`${LOCAL_SERVER}/functions/v1/enhance-product-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: uploadedBase64, mimeType: uploadedMime, userPrompt: finalPrompt }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      setEnhancedImages(prev => [data.imageUrl, ...prev]);
      setSelectedEnhanced(0);
      toast.success('✨ Enhanced!');
    } catch (e: any) {
      toast.error(e.message || 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDownload = () => {
    const img = enhancedImages[selectedEnhanced];
    if (!img) return;
    const a = document.createElement('a');
    a.href = img; a.download = `cosmo-${Date.now()}.jpg`; a.click();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* ── Top toolbar (same as canvas) ─────────────────────────── */}
      <SlideToolbar />

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden flex">

        {/* Left: Tool rail (same icons as canvas) */}
        <SlideToolRail onOpenDiagram={() => {}} />

        {/* Center: Product image workspace (replaces slide workspace) */}
        <div className="flex-1 relative overflow-hidden bg-[#f0f0f0]" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>

          {/* Upload prompt when no image */}
          {!uploadedImage && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-dashed border-zinc-300">
                <ImagePlus className="w-8 h-8 text-zinc-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-500">Drop a product image here</p>
                <p className="text-xs text-zinc-400 mt-1">or click to browse · PNG, JPG, WEBP</p>
              </div>
            </div>
          )}

          {/* Original uploaded image preview */}
          {uploadedImage && enhancedImages.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative max-w-full max-h-full">
                <img
                  src={uploadedImage}
                  alt="Original"
                  className="max-h-[calc(100vh-180px)] max-w-full object-contain rounded-xl shadow-xl"
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full">
                  Original
                </div>
                <button
                  onClick={() => { setUploadedImage(null); setUploadedBase64(null); }}
                  className="absolute top-3 right-3 bg-black/50 backdrop-blur rounded-full p-1 text-white hover:bg-black/70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Enhanced images */}
          {enhancedImages.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative">
                <img
                  src={enhancedImages[selectedEnhanced]}
                  alt="Enhanced"
                  className="max-h-[calc(100vh-180px)] max-w-full object-contain rounded-xl shadow-2xl"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3 h-3 text-yellow-400" /> AI Enhanced · 4K
                </div>
                <button
                  onClick={handleDownload}
                  className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white shadow-sm"
                >
                  <Download className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          )}

          {/* Enhancement history strip at bottom */}
          {enhancedImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-md">
              {enhancedImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEnhanced(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === selectedEnhanced ? 'border-violet-500 scale-105' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
        </div>

        {/* Right: AI Chat panel (same position as Canvas chat panel) */}
        <div className="w-[340px] flex-shrink-0 border-l border-border bg-white flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium">Product Studio</span>
          </div>

          {/* Upload section */}
          <div className="p-4 border-b border-border/40">
            {!uploadedImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-200 rounded-xl py-5 flex flex-col items-center gap-2 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
              >
                <Upload className="w-5 h-5 text-zinc-300" />
                <span className="text-xs text-zinc-400">Upload product image</span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-zinc-100">
                <img src={uploadedImage} alt="" className="w-full h-full object-contain" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100 text-white text-xs"
                >
                  Change Image
                </button>
              </div>
            )}
          </div>

          {/* Quick styles */}
          <div className="p-4 border-b border-border/40 flex-shrink-0">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Quick Styles</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuick(selectedQuick === q ? null : q)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    selectedQuick === q
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div className="p-4 flex-1 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Instructions</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Add studio lighting, remove background, make it look luxury..."
              className="flex-1 min-h-[80px] text-sm text-zinc-700 placeholder:text-zinc-300 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
              rows={4}
            />
            <Button
              onClick={handleEnhance}
              disabled={!uploadedImage || isEnhancing}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 text-sm font-medium gap-2 disabled:opacity-40"
            >
              {isEnhancing ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enhancing…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" />Enhance to 4K</>
              )}
            </Button>

            {enhancedImages.length > 0 && (
              <Button onClick={handleDownload} variant="outline" className="w-full rounded-xl h-9 text-sm gap-2">
                <Download className="w-3.5 h-3.5" /> Download Enhanced
              </Button>
            )}
          </div>
        </div>

        {/* Thumbnail panel + bottom controls (same as canvas) */}
        <SlideThumbnailPanel />
        <SlideAIPanel />
        <SlideBottomControls />
        <SlideTimeline />
      </div>
    </div>
  );
}
