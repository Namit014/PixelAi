import { useState, useRef, useCallback, useEffect } from 'react';
import { usePresentationStore, type ChatMessage } from '@/stores/presentationStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Sparkles, FileText, Lightbulb, ImagePlus, List,
  Minimize2, Maximize2, StickyNote,
  ArrowUp, Paperclip, Zap, Brain, Loader2, X } from
'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';
import ReactMarkdown from 'react-markdown';
import { ThemeEditorTab } from './ThemeEditorTab';
import { PropertiesTab } from './PropertiesTab';
import { PublishSettings } from './PublishSettings';
import { AssetBrowserDialog } from './AssetBrowserDialog';
import { AIQuickActions } from './AIQuickActions';
import type { AIAction } from '@/types/presentation';
import agentSvg from '@/assets/icons/agent.svg';

const COSMO_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cosmo-agent`;

const aiActions: {id: AIAction;label: string;icon: React.ElementType;description: string;}[] = [
{ id: 'generate-deck', label: 'Generate Full Deck', icon: Sparkles, description: 'Create entire presentation from topic' },
{ id: 'add-section', label: 'Add Section', icon: FileText, description: 'Add new slides for a subtopic' },
{ id: 'rewrite-slide', label: 'Rewrite Slide', icon: FileText, description: 'Regenerate current slide content' },
{ id: 'improve-clarity', label: 'Improve Clarity', icon: Lightbulb, description: 'Make content clearer' },
{ id: 'add-visual', label: 'Add Visual', icon: ImagePlus, description: 'Suggest visuals for slide' },
{ id: 'to-bullets', label: 'Convert to Bullets', icon: List, description: 'Turn paragraphs into bullets' },
{ id: 'shorten', label: 'Shorten Content', icon: Minimize2, description: 'Reduce content' },
{ id: 'expand', label: 'Expand Idea', icon: Maximize2, description: 'Add more detail' },
{ id: 'add-notes', label: 'Speaker Notes', icon: StickyNote, description: 'Generate speaker notes' }];


// Rotating status messages for the thinking state
const THINKING_STEPS = [
'Analyzing your request...',
'Understanding context...',
'Planning slide structure...',
'Choosing optimal layouts...',
'Crafting design approach...'];


function ThinkingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => setStepIdx((i) => (i + 1) % THINKING_STEPS.length), 2500);
    const clockTimer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => {clearInterval(stepTimer);clearInterval(clockTimer);};
  }, []);

  return (
    <div className="flex items-start gap-2 bg-muted rounded-xl px-3 py-2.5 max-w-[85%]">
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-[11px] text-foreground font-medium transition-all duration-300">
            {THINKING_STEPS[stepIdx]}
          </span>
        </div>
        <div className="text-[9px] text-muted-foreground tabular-nums">
          {elapsed}s elapsed
        </div>
      </div>
    </div>);

}

function ExecutionStep({ label, status }: {label: string;status: 'running' | 'done';}) {
  return (
    <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 bg-muted/50 rounded-lg">
      {status === 'running' ?
      <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" /> :

      <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      }
      <span className={cn("text-foreground", status === 'done' && "text-muted-foreground")}>{label}</span>
    </div>);

}

function mapBlock(block: any): any {
  const base: any = { id: crypto.randomUUID(), regionId: block.regionId, type: block.type };
  switch (block.type) {
    case 'title':return { ...base, text: block.text || '', level: block.level || 1 };
    case 'subtitle':return { ...base, text: block.text || '' };
    case 'bullets':return { ...base, items: block.items || [] };
    case 'callout':return { ...base, text: block.text || '', icon: block.icon, variant: block.variant || 'accent' };
    case 'quote':return { ...base, text: block.text || '', attribution: block.attribution };
    case 'metric':return { ...base, value: block.value || '0', label: block.label || '', suffix: block.suffix, trend: block.trend };
    case 'icon-list':return { ...base, items: block.iconListItems || block.items || [] };
    case 'timeline':return { ...base, items: block.timelineItems || [] };
    case 'comparison':return { ...base, left: block.leftSide || { title: '', items: [] }, right: block.rightSide || { title: '', items: [] } };
    case 'numbered-list':return { ...base, items: block.numberedItems || [] };
    case 'progress':return { ...base, items: block.progressItems || [] };
    case 'card-grid':return { ...base, cards: block.cards || [] };
    case 'chart':return { ...base, chartType: block.chartType || 'bar', data: block.chartData || [], title: block.chartTitle };
    case 'table':return { ...base, rows: block.tableRows || [['', '']], hasHeader: block.hasHeader ?? true };
    case 'todo-list':return { ...base, items: block.todoItems || [] };
    case 'stats':return { ...base, variant: block.statsVariant || 'plain', items: block.statsItems || [] };
    case 'steps':return { ...base, variant: block.stepsVariant || 'box', items: block.stepsItems || [] };
    case 'process-flow':return { ...base, variant: block.flowVariant || 'arrows', items: block.flowItems || [] };
    case 'icon-grid':return { ...base, variant: block.gridVariant || 'solid-boxes', items: block.gridItems || [] };
    case 'quote-box':return { ...base, variant: block.quoteBoxVariant || 'quote-box', text: block.text || '', attribution: block.attribution };
    case 'cycle-diagram':return { ...base, variant: block.cycleVariant || 'cycle', items: block.cycleItems || [] };
    case 'venn-diagram':return { ...base, items: block.vennItems || [] };
    case 'button-block':return { ...base, text: block.buttonText || 'Click', url: block.buttonUrl || '#', variant: block.buttonVariant || 'primary' };
    case 'code':return { ...base, language: block.language || 'javascript', code: block.codeText || '' };
    case 'divider':return { ...base, dividerStyle: block.dividerStyle || 'solid' };
    case 'image':return { ...base, src: block.src || '', alt: block.alt || '', fit: block.fit || 'cover' };
    default:return { ...base, text: block.text || '' };
  }
}

function processToolCalls(toolCalls: any[]): string[] {
  const actionLogs: string[] = [];
  for (const tc of toolCalls) {
    if (tc.name === 'create_slides' && tc.arguments?.slides) {
      const slides = tc.arguments.slides;
      const layouts = [...new Set(slides.map((s: any) => s.layoutId))];
      actionLogs.push(`Creating ${slides.length} slides — layouts: ${layouts.join(', ')}`);
      const mapped = slides.map((s: any) => ({
        id: crypto.randomUUID(),
        layoutId: s.layoutId,
        speakerNotes: s.speakerNotes || '',
        animationConfig: { transition: 'fade', elementAnimations: [] },
        background: s.background || undefined,
        decorations: s.decorations || undefined,
        contentBlocks: (s.contentBlocks || []).map(mapBlock)
      }));
      usePresentationStore.getState().setSlides(mapped);
      actionLogs.push(`Generated ${mapped.length} slides successfully`);
      toast.success(`Generated ${mapped.length} slides`);
    }
    if (tc.name === 'set_theme' && tc.arguments) {
      const changedKeys = Object.keys(tc.arguments);
      actionLogs.push(`Updating theme — ${changedKeys.join(', ')}`);
      usePresentationStore.getState().setDesignTokens(tc.arguments);
      actionLogs.push(`Theme updated — ${changedKeys.length} properties changed`);
      toast.success('Theme updated');
    }
    if (tc.name === 'update_slide' && tc.arguments) {
      actionLogs.push(`Editing slide content`);
    }
  }
  return actionLogs;
}

async function callAgent(messages: {role: string;content: string;}[], action: string | undefined, context: any, brandContext: any) {
  const resp = await fetch(COSMO_AGENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ messages, action, context, brandContext })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  return await resp.json();
}

export function SlideAIPanel() {
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);
  const slides = usePresentationStore((s) => s.slides);
  const chatMessages = usePresentationStore((s) => s.chatMessages);
  const isChatLoading = usePresentationStore((s) => s.isChatLoading);
  const addChatMessage = usePresentationStore((s) => s.addChatMessage);
  const setIsChatLoading = usePresentationStore((s) => s.setIsChatLoading);
  const activeAITab = usePresentationStore((s) => s.activeAITab);
  const setActiveAITab = usePresentationStore((s) => s.setActiveAITab);
  const activeBrandContext = usePresentationStore((s) => s.activeBrandContext);
  const setActiveBrand = usePresentationStore((s) => s.setActiveBrand);
  const designTokens = usePresentationStore((s) => s.designTokens);

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thinkMode, setThinkMode] = useState(false);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<{label: string;status: 'running' | 'done';}[]>([]);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, isThinking, executionSteps]);

  const getContext = useCallback(() => {
    const slide = slides.find((s) => s.id === activeSlideId);
    const ctx: any = {
      totalSlides: slides.length,
      currentSlideIndex: slides.findIndex((s) => s.id === activeSlideId) + 1,
      designTokens: {
        headingFont: designTokens.headingFont,
        bodyFont: designTokens.bodyFont,
        primaryColor: designTokens.primaryColor,
        accentColor: designTokens.accentColor,
        backgroundColor: designTokens.backgroundColor,
        surfaceColor: designTokens.surfaceColor,
        textColor: designTokens.textColor,
        mutedTextColor: designTokens.mutedTextColor,
        gradientStart: designTokens.gradientStart,
        gradientEnd: designTokens.gradientEnd,
        borderRadius: designTokens.borderRadius
      }
    };
    if (slide) {
      ctx.currentSlide = {
        layoutId: slide.layoutId,
        blocks: slide.contentBlocks.map((b) => ({ type: b.type, ...(b as any) }))
      };
    }
    return ctx;
  }, [slides, activeSlideId, designTokens]);

  const handleSend = useCallback(async () => {
    const div = contentEditableRef.current;
    if (!div) return;
    const text = div.innerText.trim();
    if (!text || isChatLoading) return;
    div.innerHTML = '';

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
    addChatMessage(userMsg);
    setIsChatLoading(true);
    setIsThinking(true);
    setExecutionSteps([]);

    try {
      const historyMsgs = [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const result = await callAgent(historyMsgs, undefined, getContext(), activeBrandContext);
      setIsThinking(false);

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolNames = result.tool_calls.map((tc: any) => tc.name);
        const steps: {label: string;status: 'running' | 'done';}[] = [];
        for (const name of toolNames) {
          const label = name === 'create_slides' ? 'Generating slides...' :
          name === 'set_theme' ? 'Applying theme...' :
          `Running ${name}...`;
          steps.push({ label, status: 'running' });
        }
        setExecutionSteps([...steps]);
        const actionLogs = processToolCalls(result.tool_calls);
        setExecutionSteps(steps.map((s) => ({ ...s, status: 'done' as const })));
        for (const log of actionLogs) {
          addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: log, timestamp: Date.now() });
        }
      }

      const assistantText = result.content || (result.tool_calls?.length ? 'Done — your presentation has been updated.' : 'Done.');
      addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: assistantText, timestamp: Date.now() });
      setExecutionSteps([]);
      notifyAiComplete({
        source: 'cosmo',
        status: 'success',
        title: result.tool_calls?.length ? 'Slides updated' : 'Response ready',
        message: assistantText.slice(0, 120),
      });
    } catch (e: any) {
      setIsThinking(false);
      setExecutionSteps([]);
      toast.error(e.message || 'Failed to get response');
      notifyAiComplete({
        source: 'cosmo',
        status: 'error',
        title: 'Cosmo failed',
        message: e.message || 'Failed to get response',
      });
    }
    setIsChatLoading(false);
  }, [chatMessages, isChatLoading, addChatMessage, setIsChatLoading, getContext, activeBrandContext]);

  const handleAIAction = useCallback(async (actionId: AIAction) => {
    const actionLabels: Record<string, string> = {
      'generate-deck': 'Generate a complete presentation deck. What topic should I create?',
      'add-section': 'Add a new section of slides.',
      'rewrite-slide': 'Rewrite the current slide to be more impactful.',
      'improve-clarity': 'Improve the clarity of the current slide.',
      'add-visual': 'Suggest visuals or charts for the current slide.',
      'to-bullets': 'Convert the current slide text into bullet points.',
      'shorten': 'Shorten the current slide content.',
      'expand': 'Expand the current slide with more detail.',
      'add-notes': 'Generate speaker notes for the current slide.'
    };

    const prompt = actionLabels[actionId] || `Perform action: ${actionId}`;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: `[${actionId}] ${prompt}`, timestamp: Date.now() };
    addChatMessage(userMsg);
    setIsChatLoading(true);
    setActiveAITab('agent');
    setIsThinking(true);
    setExecutionSteps([]);
    setQuickEditOpen(false);

    try {
      const result = await callAgent([{ role: 'user', content: prompt }], actionId, getContext(), activeBrandContext);
      setIsThinking(false);

      if (result.tool_calls && result.tool_calls.length > 0) {
        const actionLogs = processToolCalls(result.tool_calls);
        for (const log of actionLogs) {
          addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: log, timestamp: Date.now() });
        }
      }

      const assistantText = result.content || (result.tool_calls?.length ? 'Done!' : 'Done.');
      addChatMessage({ id: crypto.randomUUID(), role: 'assistant', content: assistantText, timestamp: Date.now() });
      notifyAiComplete({
        source: 'cosmo',
        status: 'success',
        title: 'Action complete',
        message: assistantText.slice(0, 120),
      });
    } catch (e: any) {
      setIsThinking(false);
      toast.error(e.message || 'Action failed');
      notifyAiComplete({
        source: 'cosmo',
        status: 'error',
        title: 'Action failed',
        message: e.message || 'Action failed',
      });
    }
    setExecutionSteps([]);
    setIsChatLoading(false);
  }, [addChatMessage, setIsChatLoading, setActiveAITab, getContext, activeBrandContext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ') e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault();e.stopPropagation();handleSend();}
  }, [handleSend]);

  const handleAssetSelect = useCallback((url: string) => {
    if (!activeSlideId) return;
    const block = {
      id: crypto.randomUUID(),
      regionId: '',
      type: 'image' as const,
      src: url,
      alt: 'Imported asset',
      fit: 'contain' as const
    };
    usePresentationStore.getState().addBlockToSlide(activeSlideId, block as any);
    toast.success('Image added to slide');
  }, [activeSlideId]);

  return (
    <>
      <div className="absolute top-4 bottom-4 right-4 w-[400px] z-40 pointer-events-auto flex flex-col rounded-2xl border border-border bg-background overflow-hidden">
        <Tabs value={activeAITab} onValueChange={setActiveAITab} className="flex-1 flex flex-col min-h-0">
          {/* Header with Cosmo on left, tabs right-aligned */}
          <div className="flex items-center mx-2 mt-2 my-[9px] py-0 pb-[10px]">
            <span className="tracking-tight text-foreground text-xl mx-[13px] font-medium">Cosmo</span>
            <TabsList className="ml-auto h-7 bg-muted/50 rounded-lg p-0.5 w-auto">
              <TabsTrigger value="agent" className="text-[10px] px-3 py-1 rounded-md data-[state=active]:bg-background">Agent</TabsTrigger>
              <TabsTrigger value="theme" className="text-[10px] px-3 py-1 rounded-md data-[state=active]:bg-background">Theme</TabsTrigger>
              <TabsTrigger value="properties" className="text-[10px] px-3 py-1 rounded-md data-[state=active]:bg-background">Props</TabsTrigger>
              <TabsTrigger value="publish" className="text-[10px] px-3 py-1 rounded-md data-[state=active]:bg-background">Publish</TabsTrigger>
            </TabsList>
          </div>

          {/* Agent Tab */}
          <TabsContent value="agent" className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {chatMessages.length === 0 && !isThinking ?
              <div className="flex flex-col items-center justify-center p-4 pt-8 gap-6">
                  <img src={agentSvg} alt="Cosmo Agent" className="w-36 h-36 opacity-80" />
                  <div className="w-full px-1">
                    <p className="text-[10px] text-muted-foreground text-center mb-3">Quick actions for your current slide</p>
                    <AIQuickActions />
                  </div>
                </div> :

              <div className="flex flex-col gap-3 p-3">
                  {chatMessages.map((msg) =>
                <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                    msg.role === 'user' ? "bg-foreground text-background" : "bg-muted"
                  )}>
                        {msg.role === 'assistant' ?
                    <div className="prose prose-xs prose-zinc dark:prose-invert max-w-none [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:my-1 [&_ul]:text-[12px] [&_li]:text-[12px] [&_h1]:text-[14px] [&_h2]:text-[13px] [&_h3]:text-[12px] [&_code]:text-[10px]">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div> :
                    msg.content}
                      </div>
                    </div>
                )}

                  {executionSteps.length > 0 &&
                <div className="flex flex-col gap-1">
                      {executionSteps.map((step, i) =>
                  <ExecutionStep key={i} label={step.label} status={step.status} />
                  )}
                    </div>
                }

                  {isThinking &&
                <div className="flex justify-start">
                      <ThinkingIndicator />
                    </div>
                }
                </div>
              }
            </div>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto">
            <ThemeEditorTab />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto">
            <PropertiesTab />
          </TabsContent>

          {/* Publish Tab */}
          <TabsContent value="publish" className="flex-1 m-0 p-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto">
            <PublishSettings />
          </TabsContent>
        </Tabs>

        {/* Brand chip above prompt */}
        {activeBrandContext &&
        <div className="px-3 pt-2">
            <div className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              {activeBrandContext.name}
              <button
              onClick={() => setActiveBrand(null, null)}
              className="ml-0.5 hover:bg-foreground/10 rounded-full p-0.5 transition-colors">

                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        }

        {/* Bottom chat input */}
        <div className="p-2 bg-background">
          <div className="bg-background p-3 border border-border/50 relative rounded-xl">
            <div className="relative mb-3">
              <div
                ref={contentEditableRef}
                contentEditable
                onKeyDown={handleKeyDown}
                className="min-h-[24px] outline-none text-sm leading-6"
                data-placeholder='Ask Cosmo to edit, create or style...'
                suppressContentEditableWarning />

            </div>

            <div className="flex gap-1 items-center justify-between pt-2">
              <div className="flex gap-1 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setShowAssetBrowser(true)}>

                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Quick Edit popover */}
                <Popover open={quickEditOpen} onOpenChange={setQuickEditOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">

                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="start" side="top" sideOffset={8}>
                    <div className="flex flex-col">
                      {aiActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            disabled={isChatLoading}
                            onClick={() => handleAIAction(action.id)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted text-left transition-colors duration-150 disabled:opacity-50">

                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-medium text-foreground">{action.label}</span>
                          </button>);

                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2 items-center">
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center bg-muted rounded-full p-0.5 border border-border h-8">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => setThinkMode(false)} className={cn("flex items-center justify-center w-7 h-7 rounded-full transition-all", !thinkMode ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground")}>
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Fast Mode</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => setThinkMode(true)} className={cn("flex items-center justify-center w-7 h-7 rounded-full transition-all", thinkMode ? "bg-amber-100 text-amber-600" : "text-muted-foreground hover:text-foreground")}>
                          <Brain className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Think Mode</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={isChatLoading}
                  className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50">

                  {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssetBrowserDialog
        open={showAssetBrowser}
        onOpenChange={setShowAssetBrowser}
        onSelect={handleAssetSelect} />

    </>);

}