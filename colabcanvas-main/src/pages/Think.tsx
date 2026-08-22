import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUp, Plus, Paperclip, ImagePlus, Search, Mic, FileText, X, Check, Palette, Sparkles, ThumbsUp, ThumbsDown, Copy, GitBranch, Volume2, Square, FolderOpen, Download, Loader2, Presentation, FileDown, Globe, Brain, Lightbulb, History, ChevronDown, Phone, Rocket, MessageSquare, RefreshCw, Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBrowserSpeechRecognition } from '@/hooks/useBrowserSpeechRecognition';
import RumiBlackIcon from '@/assets/icons/rumi-black.svg?react';
import ThinkIcon from '@/assets/icons/think.svg?react';
import { AssetPickerModal } from '@/components/assets/AssetPickerModal';
import { SourcesPanel, Source } from '@/components/think/SourceCard';
import { MermaidDiagram, extractMermaidBlocks } from '@/components/think/MermaidDiagram';
import { TasteProfileIndicator } from '@/components/think/TasteProfileIndicator';
import { useCreativeIntelligence, ChatMessage, ChatResponse, ContentProposal } from '@/hooks/useCreativeIntelligence';
import { ThinkVerticalToolbar } from '@/components/think/ThinkVerticalToolbar';
import { LiveCanvasPreview } from '@/components/think/LiveCanvasPreview';
import { useAutonomousJobs } from '@/hooks/useAutonomousJobs';
import { useAgentCanvasExecutor } from '@/hooks/useAgentCanvasExecutor';
import { ThinkWorkspacePanel } from '@/components/think/ThinkWorkspacePanel';
import { RumiVoiceCall } from '@/components/think/RumiVoiceCall';
import { ActivityFeed } from '@/components/think/ActivityFeed';
import { ProposalCard } from '@/components/think/ProposalCard';
import { InlineAgentPipeline } from '@/components/think/InlineAgentPipeline';
import { useProjectMonitor, type Project, type Brand } from '@/hooks/useProjectMonitor';
import { DecisionCard } from '@/components/think/DecisionCard';
import { ThinkContextPopup } from '@/components/think/ThinkContextPopup';

import { DecisionTimeline } from '@/components/think/DecisionTimeline';
import { BrandDriftAlert } from '@/components/think/BrandDriftAlert';
import { isWebsiteJob as isWebsiteJobHelper, tagWebsiteObjective, buildSitePreviewUrl } from '@/lib/websiteJob';
import { useBrandCognition } from '@/hooks/useBrandCognition';
import { useBrandDrift, type DriftAnalysis } from '@/hooks/useBrandDrift';
import { useRumiLearning } from '@/hooks/useRumiLearning';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ThinkMode = 'research' | 'creative-intelligence';

interface FileAttachment {
  name: string;
  type: string;
  url: string;
}

interface ResearchMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: FileAttachment[];
  sources?: Source[];
}

interface ContextChip {
  type: 'project' | 'brand';
  id: string;
  name: string;
  thumbnailUrl?: string | null;
}

const Think = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // ──── Shared state ────
  const [thinkMode, setThinkMode] = useState<ThinkMode>('creative-intelligence');
  const [sendMode, setSendMode] = useState<'chat' | 'execute'>('chat');
  const [activeToolbarItem, setActiveToolbarItem] = useState('magic-cursor');
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ──── Research-specific state ────
  const [researchMessages, setResearchMessages] = useState<ResearchMessage[]>([]);
  const [researchInput, setResearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [deepResearchMode, setDeepResearchMode] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'elevenlabs' | 'browser' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);

  // ──── CI-specific state ────
  const [ciMessages, setCiMessages] = useState<ChatMessage[]>([]);
  const [ciInputValue, setCiInputValue] = useState('');
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [showContextPopup, setShowContextPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [pendingBrief, setPendingBrief] = useState<ChatResponse['briefData'] | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [currentDriftAnalysis, setCurrentDriftAnalysis] = useState<DriftAnalysis | null>(null);

  // ──── Refs ────
  const contentQueueRef = useRef<string[]>([]);
  const typewriterTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ciInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ──── CI Hooks ────
  const {
    isAnalyzing: ciIsAnalyzing,
    isChatting,
    isGeneratingProposal,
    decisionCards,
    cardsLoading,
    analyzeStrategicDirection,
    updateCardStatus,
    startNewSession: startCINewSession,
    tasteProfile,
    sendChatMessage,
    generateProposal,
    iterateProposal,
    updateProposalStatus,
    activitySteps,
    streamingContent: ciStreamingContent,
    persistedMessages,
    getOrCreateConversation,
    persistMessage,
    sessions: ciSessions,
    sessionsLoading,
    currentSessionId,
    loadSession: loadCISession,
  } = useCreativeIntelligence();

  const { projects, brands, projectStats } = useProjectMonitor();

  const selectedBrandId = useMemo(() => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    return brandChip?.id;
  }, [contextChips]);

  const { cognitionMemory, isLoading: cognitionLoading, getConfidenceLevel, hasSufficientData } = useBrandCognition(selectedBrandId);
  const { showAlert: showDriftAlert, setShowAlert: setShowDriftAlert, handleAcknowledge, handleOverride, handleCorrection } = useBrandDrift();
  const { recordAcceptance, recordIgnored, recordSignal } = useRumiLearning();

  // ──── Autonomous jobs ────
  const {
    jobs: autonomousJobs,
    activeJob,
    jobLogs,
    isSubmitting: isSubmittingJob,
    submitJob,
    resumeJob,
    cancelJob,
    deleteJob,
    selectJob,
    detachJob,
  } = useAutonomousJobs();

  const {
    cursor: agentCursor,
    previewUrl: agentPreviewUrl,
    statusText: agentStatusText,
    registerSendCommand,
    isWorking: agentIsWorking,
  } = useAgentCanvasExecutor(activeJob?.id || null);

  const isWebsiteJob = useMemo(() => isWebsiteJobHelper(activeJob), [activeJob]);

  // Auto-switch toolbar to landing-page when a website job is active — runs BEFORE preview logic.
  // This is the strict isolation guard: website jobs must NEVER render in magic-cursor.
  useEffect(() => {
    if (isWebsiteJob && activeJob && activeToolbarItem !== 'landing-page') {
      setActiveToolbarItem('landing-page');
    }
  }, [isWebsiteJob, activeJob, activeToolbarItem]);

  const livePreviewUrl = useMemo(() => {
    // Magic Cursor is canvas/cosmo only — never website jobs.
    if (activeToolbarItem !== 'magic-cursor') return null;
    if (isWebsiteJob) return null;
    // Ignore website preview URLs that may have leaked into agentPreviewUrl
    if (agentPreviewUrl && !agentPreviewUrl.includes('/site-preview')) return agentPreviewUrl;
    if (!activeJob) return null;
    if (activeJob.project_id) return `/canvas?projectId=${encodeURIComponent(activeJob.project_id)}&agentMode=true`;
    return null;
  }, [agentPreviewUrl, activeJob, isWebsiteJob, activeToolbarItem]);

  // ──── Voice ────

  const browserStt = useBrowserSpeechRecognition({
    onPartial: (text) => { if (thinkMode === 'research') setResearchInput(text); },
    onFinal: (text) => { if (thinkMode === 'research') setResearchInput((prev) => prev + (prev ? ' ' : '') + text); }
  });

  const stopAllVoice = useCallback(() => {
    browserStt.stop();
    setVoiceMode(null);
  }, [browserStt]);

  const handleVoiceToggle = useCallback(async () => {
    if (browserStt.status === 'listening') { stopAllVoice(); return; }
    if (!browserStt.isSupported) { toast({ title: 'Voice input not supported', variant: 'destructive' }); return; }
    browserStt.start();
    setVoiceMode('browser');
  }, [browserStt, stopAllVoice, toast]);

  // ──── CI conversation init ────
  useEffect(() => { getOrCreateConversation(); }, [getOrCreateConversation]);

  const hasLoadedPersistedRef = useRef(false);
  useEffect(() => {
    if (persistedMessages.length > 0 && !hasLoadedPersistedRef.current) {
      hasLoadedPersistedRef.current = true;
      setCiMessages(persistedMessages);
    }
  }, [persistedMessages]);

  // ──── Research conversations ────
  useEffect(() => { if (user?.id) loadConversations(); }, [user?.id]);
  useEffect(() => {
    const savedPrompt = localStorage.getItem('thinkPrompt');
    if (savedPrompt) { localStorage.removeItem('thinkPrompt'); setResearchInput(savedPrompt); }
  }, []);

  // Scroll on message change
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [researchMessages, ciMessages, displayedContent]);

  // Typewriter
  useEffect(() => {
    if (contentQueueRef.current.length > 0 && isStreaming) {
      const processQueue = () => {
        if (contentQueueRef.current.length > 0) {
          const nextChars = contentQueueRef.current.splice(0, 3).join('');
          setDisplayedContent((prev) => prev + nextChars);
          typewriterTimerRef.current = window.setTimeout(processQueue, 12);
        }
      };
      if (!typewriterTimerRef.current) processQueue();
    }
    return () => { if (typewriterTimerRef.current) { clearTimeout(typewriterTimerRef.current); typewriterTimerRef.current = null; } };
  }, [streamingContent, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [researchInput]);

  // ──── Research methods ────
  const loadConversations = async () => {
    try {
      const response = await supabase.functions.invoke('think-chat', { body: { action: 'list_conversations', userId: user?.id } });
      if (response.data?.conversations) setConversations(response.data.conversations);
    } catch (error) { console.error('Error loading conversations:', error); }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await supabase.functions.invoke('think-chat', { body: { action: 'load_conversation', conversationId } });
      if (response.data?.messages) {
        setResearchMessages(response.data.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
        setCurrentConversationId(conversationId);
      }
    } catch (error) { console.error('Error loading conversation:', error); }
  };

  const startNewResearchConversation = () => { setResearchMessages([]); setCurrentConversationId(null); setResearchInput(''); };

  // Load conversation from URL ?conversationId= (from Think landing page)
  useEffect(() => {
    const cid = searchParams.get('conversationId');
    if (cid && cid !== currentConversationId) {
      setThinkMode('research');
      loadConversation(cid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const uploadFilesToStorage = async (files: File[]) => {
    const uploaded: Array<{url: string; name: string; type: string;}> = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `think/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('design-tool-uploads').upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (uploadError) continue;
        const { data: signedData } = await supabase.storage.from('design-tool-uploads').createSignedUrl(fileName, 3600);
        if (signedData?.signedUrl) uploaded.push({ url: signedData.signedUrl, name: file.name, type: file.type });
      } catch { }
    }
    return uploaded;
  };

  const handleResearchSubmit = async () => {
    if (!researchInput.trim() && attachedFiles.length === 0 || isLoading) return;
    if (browserStt.status === 'listening') stopAllVoice();
    const isAutoAnalysis = attachedFiles.length > 0 && !researchInput.trim();
    let uploadedAttachments: Array<{url: string; name: string; type: string;}> = [];
    if (attachedFiles.length > 0) {
      setIsAnalyzing(true);
      uploadedAttachments = await uploadFilesToStorage(attachedFiles);
    }
    const messageAttachments: FileAttachment[] = uploadedAttachments.map((f) => ({ name: f.name, type: f.type, url: f.url }));
    const displayContent = isAutoAnalysis ? `📎 Shared ${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} for analysis` : researchInput.trim();
    const userMessage: ResearchMessage = { role: 'user', content: displayContent, attachments: messageAttachments.length > 0 ? messageAttachments : undefined };
    setResearchMessages((prev) => [...prev, userMessage]);
    setResearchInput(''); setAttachedFiles([]); setFilePreviewUrls([]); setIsLoading(true); setIsAnalyzing(false);
    try {
      setIsStreaming(true); setStreamingContent(''); setDisplayedContent('');
      contentQueueRef.current = [];
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/think-chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: [...researchMessages, { role: userMessage.role, content: isAutoAnalysis ? '' : researchInput.trim() }], userId: user?.id, conversationId: currentConversationId, deepResearch: deepResearchMode, analysisMode: isAutoAnalysis ? 'auto' : undefined, attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined, stream: true })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let receivedConversationId: string | null = null;
      let receivedSources: Source[] = [];
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.conversationId) receivedConversationId = parsed.conversationId;
                if (parsed.sources && Array.isArray(parsed.sources)) receivedSources = parsed.sources;
                if (parsed.choices?.[0]?.delta?.content) {
                  const delta = parsed.choices[0].delta.content;
                  fullContent += delta; setStreamingContent(fullContent);
                  contentQueueRef.current.push(...delta.split(''));
                }
                if (parsed.message) { fullContent = parsed.message; setStreamingContent(fullContent); setDisplayedContent(fullContent); }
              } catch { }
            }
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      setIsStreaming(false); setStreamingContent(''); setDisplayedContent('');
      const assistantMessage: ResearchMessage = { role: 'assistant', content: fullContent || 'I apologize, but I encountered an issue.', sources: receivedSources.length > 0 ? receivedSources : undefined };
      setResearchMessages((prev) => [...prev, assistantMessage]);
      if (receivedConversationId && !currentConversationId) { setCurrentConversationId(receivedConversationId); loadConversations(); }
    } catch (error: any) {
      setIsStreaming(false); setStreamingContent('');
      setResearchMessages((prev) => [...prev, { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }]);
    } finally { setIsLoading(false); }
  };

  // ──── CI methods ────
  const handleCiInput = (e: React.FormEvent<HTMLDivElement>) => {
    const div = e.currentTarget;
    const text = div.innerText || '';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBefore = text.slice(0, range.startOffset);
      if (textBefore.endsWith('!') && (textBefore.length === 1 || /\s$/.test(textBefore.slice(-2, -1)))) {
        if (ciInputRef.current) {
          const rect = ciInputRef.current.getBoundingClientRect();
          setPopupPosition({ x: rect.left + 20, y: rect.top - 10 });
        }
        setShowContextPopup(true);
      }
    }
    setCiInputValue(text);
  };

  const insertChip = (item: Project | Brand, type: 'project' | 'brand') => {
    const inputEl = ciInputRef.current;
    if (!inputEl) return;
    const name = type === 'project' ? (item as Project).title : (item as Brand).name;
    const thumbnailUrl = type === 'project' ? (item as Project).thumbnail_url : (item as Brand).logo_primary_url;
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset[type === 'project' ? 'projectId' : 'brandId'] = item.id;
    chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/50 mx-0.5 text-xs align-middle';
    if (thumbnailUrl) { const img = document.createElement('img'); img.src = thumbnailUrl; img.className = 'w-4 h-4 rounded object-cover'; chip.appendChild(img); }
    const nameSpan = document.createElement('span'); nameSpan.textContent = name; chip.appendChild(nameSpan);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const html = inputEl.innerHTML;
      inputEl.innerHTML = html.replace(/!\s*$/, '');
      const range = document.createRange();
      range.selectNodeContents(inputEl); range.collapse(false);
      selection.removeAllRanges(); selection.addRange(range);
      range.insertNode(chip);
      const space = document.createTextNode(' ');
      chip.after(space);
      range.setStartAfter(space); range.setEndAfter(space);
      selection.removeAllRanges(); selection.addRange(range);
    }
    setContextChips(prev => [...prev.filter(c => !(c.type === type && c.id === item.id)), { type, id: item.id, name, thumbnailUrl }]);
    setShowContextPopup(false);
    inputEl.focus();
  };

  const parseChipsFromInput = (): { text: string; chips: ContextChip[] } => {
    const inputEl = ciInputRef.current;
    if (!inputEl) return { text: '', chips: [] };
    const chips: ContextChip[] = [];
    const chipElements = inputEl.querySelectorAll('[data-project-id], [data-brand-id]');
    chipElements.forEach(el => {
      const projectId = (el as HTMLElement).dataset.projectId;
      const brandId = (el as HTMLElement).dataset.brandId;
      const name = el.textContent || '';
      if (projectId) chips.push({ type: 'project', id: projectId, name, thumbnailUrl: null });
      else if (brandId) chips.push({ type: 'brand', id: brandId, name, thumbnailUrl: null });
    });
    return { text: inputEl.innerText?.trim() || '', chips };
  };

  const handleCiSubmit = async () => {
    const { text, chips } = parseChipsFromInput();
    if (!text && chips.length === 0) return;
    if (ciInputRef.current) ciInputRef.current.innerHTML = '';
    setCiInputValue('');
    const userMessage: ChatMessage = { role: 'user', content: text };
    setCiMessages(prev => [...prev, userMessage]);
    persistMessage('user', text);
    const response = await sendChatMessage(text, ciMessages, { existingChips: chips.map(c => ({ type: c.type, id: c.id, name: c.name })) });
    const assistantMessage: ChatMessage = { role: 'assistant', content: response.content };
    setCiMessages(prev => [...prev, assistantMessage]);
    if (response.content) persistMessage('assistant', response.content);
    if (response.type === 'ready_to_analyze' && response.briefData) setPendingBrief(response.briefData);

    // ─── Generate social/blog content proposals when AI signals readiness ───
    if (response.type === 'ready_to_generate' && response.contentPreferences) {
      const brandChip = contextChips.find(c => c.type === 'brand') || chips.find(c => c.type === 'brand');
      if (!brandChip) {
        const guard: ChatMessage = {
          role: 'assistant',
          content: 'To generate on-brand posts I need a brand selected. Tag a brand using the dropdown at the top, or type `!` to mention one — then ask again.',
        };
        setCiMessages(prev => [...prev, guard]);
        persistMessage('assistant', guard.content);
      } else {
        const cType = response.contentPreferences.contentType || 'social_media';
        const proposals = await generateProposal(brandChip.id, cType, currentSessionId || undefined);
        if (proposals.length > 0) {
          const cards: ChatMessage = {
            role: 'assistant',
            content: `Here ${proposals.length === 1 ? 'is your first post' : `are ${proposals.length} concepts`}. Click any card to accept, refine, or iterate.`,
            proposals,
          };
          setCiMessages(prev => [...prev, cards]);
          persistMessage('assistant', cards.content);
        } else {
          const fail: ChatMessage = {
            role: 'assistant',
            content: 'I couldn\'t generate any proposals right now. This usually means the AI service is rate-limited or the brand needs more context (colors, voice, audience). Try again or enrich the brand.',
          };
          setCiMessages(prev => [...prev, fail]);
          persistMessage('assistant', fail.content);
        }
      }
    }

    if (response.type === 'ready_to_generate_website' && response.websitePreferences) {
      const brandChip = contextChips.find(c => c.type === 'brand');
      const objective = tagWebsiteObjective({
        goal: `Generate landing page: ${response.websitePreferences.audience}`,
        brand_id: brandChip?.id || null,
        websitePreferences: response.websitePreferences,
        timestamp: new Date().toISOString(),
      });
      try {
        const jobId = await submitJob(objective, brandChip?.id);
        if (jobId) {
          setActiveToolbarItem('landing-page');
          toast({ title: 'Landing page generation started' });
        } else {
          toast({ title: 'Could not start generation', description: 'Please try again.', variant: 'destructive' });
        }
      } catch (err) {
        toast({
          title: 'Could not start generation',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }
    if (response.type === 'edit_section' && response.editSection) {
      try {
        await supabase.functions.invoke('edit-landing-section', { body: response.editSection });
        const editResult: ChatMessage = { role: 'assistant', content: '✅ Section updated!' };
        setCiMessages(prev => [...prev, editResult]);
        persistMessage('assistant', editResult.content);
      } catch { }
    }
  };

  const handleGenerateDirections = async () => {
    if (!pendingBrief) return;
    const selectedBrand = contextChips.find(c => c.type === 'brand');
    await analyzeStrategicDirection({
      goal: pendingBrief.goal, audience: pendingBrief.audience, platform: pendingBrief.platform,
      riskTolerance: pendingBrief.riskTolerance, successMetrics: pendingBrief.successMetrics,
      brandId: selectedBrand?.id || pendingBrief.brandId,
    });
    setPendingBrief(null); setContextChips([]);
  };

  const handleExecuteAutonomously = async () => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    const objectiveText = ciMessages.length > 0
      ? ciMessages.filter(m => m.role === 'user').map(m => m.content).join('. ')
      : ciInputValue.trim();
    if (!objectiveText) { toast({ title: 'Describe your objective first', variant: 'destructive' }); return; }
    const objective = { goal: objectiveText, brand_id: brandChip?.id || null, timestamp: new Date().toISOString() };
    const jobId = await submitJob(objective, brandChip?.id);
    if (jobId) toast({ title: 'Autonomous execution started' });
  };

  const handleNewCISession = () => {
    setCiMessages([]); setPendingBrief(null); startCINewSession(); detachJob();
  };

  // ──── Card handlers ────
  const handleAccept = async (cardId: string) => {
    updateCardStatus({ cardId, status: 'accepted' });
    const card = decisionCards.find(c => c.id === cardId);
    if (card) await recordAcceptance(cardId, card.session_id, selectedBrandId, { cardTitle: card.title });
    toast({ title: 'Direction accepted' });
  };
  const handleReject = async (cardId: string, feedback?: string) => {
    updateCardStatus({ cardId, status: 'rejected', feedback });
    const card = decisionCards.find(c => c.id === cardId);
    if (card) await recordIgnored(cardId, card.session_id, feedback, selectedBrandId);
  };
  const handleExport = async (cardId: string) => {
    updateCardStatus({ cardId, status: 'exported' });
    toast({ title: 'Exported to Canvas' });
  };
  const handleProposalAccept = async (proposalId: string) => {
    await updateProposalStatus(proposalId, 'accepted');
    setCiMessages(prev => prev.map(msg => ({ ...msg, proposals: msg.proposals?.map(p => p.id === proposalId ? { ...p, status: 'accepted' as const } : p) })));
  };
  const handleProposalReject = async (proposalId: string, feedback?: string) => {
    await updateProposalStatus(proposalId, 'rejected', feedback);
    setCiMessages(prev => prev.map(msg => ({ ...msg, proposals: msg.proposals?.map(p => p.id === proposalId ? { ...p, status: 'rejected' as const } : p) })));
  };
  const handleProposalIterate = async (proposalId: string, feedback: string) => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    if (!brandChip) return;
    const newProposals = await iterateProposal(proposalId, feedback, brandChip.id);
    if (newProposals.length > 0) {
      setCiMessages(prev => [...prev, { role: 'assistant', content: 'Here\'s the updated version based on your feedback:', proposals: newProposals }]);
    }
  };

  // ──── Drift handlers ────
  const handleDriftCorrect = async () => { if (currentDriftAnalysis && selectedBrandId) { await handleCorrection('drift-' + Date.now(), selectedBrandId); setCurrentDriftAnalysis(null); } };
  const handleDriftOverride = async () => { if (currentDriftAnalysis && selectedBrandId) { await handleOverride('drift-' + Date.now(), selectedBrandId, 'Intentional creative choice'); setCurrentDriftAnalysis(null); } };
  const handleDriftAcknowledge = async () => { if (selectedBrandId) { await handleAcknowledge('drift-' + Date.now(), selectedBrandId); setCurrentDriftAnalysis(null); } };

  // ──── File handling ────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const oversized = selectedFiles.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) { toast({ title: 'File too large', variant: 'destructive' }); return; }
    const newFiles = [...attachedFiles, ...selectedFiles].slice(0, 5);
    setAttachedFiles(newFiles);
    setFilePreviewUrls((prev) => [...prev, ...selectedFiles.map(f => URL.createObjectURL(f))].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPlusMenuOpen(false);
  };
  const removeFile = (index: number) => { URL.revokeObjectURL(filePreviewUrls[index]); setAttachedFiles(prev => prev.filter((_, i) => i !== index)); setFilePreviewUrls(prev => prev.filter((_, i) => i !== index)); };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validTypes = ['image/', 'application/pdf', 'text/'];
    const validFiles = droppedFiles.filter(f => validTypes.some(t => f.type.startsWith(t)));
    if (validFiles.length === 0) return;
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5));
    setFilePreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))].slice(0, 5));
  }, []);

  const toggleDeepResearch = () => { setDeepResearchMode(!deepResearchMode); setPlusMenuOpen(false); };

  const handleAssetSelect = async (asset: any) => {
    try {
      const assetUrl = asset.signed_url || asset.storage_url;
      const assetName = asset.metadata?.name || asset.file_name || 'imported-asset';
      const response = await fetch(assetUrl);
      const blob = await response.blob();
      const file = new File([blob], assetName, { type: 'image/png' });
      setAttachedFiles(prev => [...prev, file].slice(0, 5));
      setFilePreviewUrls(prev => [...prev, URL.createObjectURL(blob)].slice(0, 5));
    } catch { }
  };

  const handleGenerateContent = async (type: 'image' | 'document' | 'pdf' | 'presentation') => {
    if (!researchInput.trim()) return;
    setPlusMenuOpen(false); setGeneratingContent(type);
    const userPrompt = researchInput.trim();
    setResearchMessages(prev => [...prev, { role: 'user', content: `🎨 Create ${type}: ${userPrompt}` }]);
    setResearchInput(''); setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('think-generate-content', { body: { type, prompt: userPrompt, conversationId: currentConversationId, userId: user?.id } });
      if (error) throw error;
      setResearchMessages(prev => [...prev, { role: 'assistant', content: data.message || `Here's your generated ${type}!`, attachments: data.attachments }]);
    } catch { setResearchMessages(prev => [...prev, { role: 'assistant', content: `I couldn't generate the ${type}. Please try again.` }]); }
    finally { setIsLoading(false); setGeneratingContent(null); }
  };

  // Research message renderer
  const renderResearchContent = (message: ResearchMessage) => {
    const blocks = extractMermaidBlocks(message.content);
    return (
      <>
        {blocks.map((block, i) => block.type === 'mermaid' ? <MermaidDiagram key={i} code={block.content} /> : (
          <div key={i} className="prose prose-sm max-w-none break-words prose-p:my-2 prose-li:my-1 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:bg-transparent prose-pre:p-0 prose-pre:font-sans prose-pre:text-inherit prose-code:font-sans prose-code:bg-transparent prose-code:px-0 prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown></div>
        ))}
        {message.sources && message.sources.length > 0 && <SourcesPanel sources={message.sources} />}
      </>
    );
  };

  // ──── History ────
  const ciSessionsAsConversations = useMemo(() =>
    ciSessions.map((s) => ({ id: s.id, title: (s.business_context as any)?.goal || 'Creative Intelligence Session', created_at: s.created_at, updated_at: s.updated_at })),
    [ciSessions]
  );
  const allConversations = useMemo(() => thinkMode === 'creative-intelligence' ? ciSessionsAsConversations : conversations, [thinkMode, conversations, ciSessionsAsConversations]);

  // Decision card timeline data
  const timelineDecisions = useMemo(() => decisionCards.map(card => ({
    id: card.id, title: card.title, reasoning: card.business_reasoning || '',
    status: card.status === 'accepted' ? 'accepted' as const : card.status === 'rejected' ? 'rejected' as const : 'pending' as const,
    createdAt: card.created_at, influences: [], riskLevel: card.risk_level, performanceProbability: card.performance_probability,
  })), [decisionCards]);

  const hasCards = decisionCards.length > 0;
  const hasCiMessages = ciMessages.length > 0;

  // ──── Unified send handler ────
  const handleUnifiedSend = () => {
    if (thinkMode === 'research') {
      handleResearchSubmit();
    } else {
      if (sendMode === 'execute') handleExecuteAutonomously();
      else handleCiSubmit();
    }
  };

  const handleUnifiedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUnifiedSend(); }
    if (e.key === 'Escape') setShowContextPopup(false);
  };

  // Voice call end handler
  const handleVoiceCallEnd = (callNotes: string[], callTranscript: Array<{ role: string; content: string }>) => {
    if (callNotes.length === 0 && callTranscript.length === 0) return;
    const briefSummary = callNotes.length > 0
      ? `**Voice Call Brief Notes:**\n\n${callNotes.map(n => `• ${n}`).join('\n')}`
      : `**Voice call completed** — ${callTranscript.length} exchanges recorded.`;
    if (thinkMode === 'creative-intelligence') {
      setCiMessages(prev => [...prev, { role: 'assistant', content: briefSummary }]);
      persistMessage('assistant', briefSummary);
    } else {
      setResearchMessages(prev => [...prev, { role: 'assistant', content: briefSummary }]);
    }
  };

  // Quick prompt for CI
  const handleQuickPrompt = (prompt: string) => {
    if (ciInputRef.current) {
      ciInputRef.current.innerText = prompt;
      ciInputRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ciInputRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges(); sel?.addRange(range);
    }
    setCiInputValue(prompt);
  };

  // ──── Can-send logic ────
  const canSend = thinkMode === 'research'
    ? (researchInput.trim() || attachedFiles.length > 0) && !isLoading
    : sendMode === 'execute'
      ? !isSubmittingJob && (hasCiMessages || ciInputValue.trim())
      : (ciInputValue.trim() || contextChips.length > 0) && !ciIsAnalyzing && !isChatting;

  const isBusy = thinkMode === 'research' ? isLoading : (isChatting || isSubmittingJob);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* Left Floating Toolbar */}
      <ThinkVerticalToolbar activeItem={activeToolbarItem} onItemChange={setActiveToolbarItem} />

      {/* Center Canvas Workspace — floating between toolbar and chat */}
      <main className="absolute top-5 bottom-5 left-[72px] right-[365px] z-20">
        <div className="h-full bg-white rounded-2xl border border-zinc-200 shadow-lg overflow-hidden">
          <ThinkWorkspacePanel
            activeItem={activeToolbarItem}
            livePreviewUrl={livePreviewUrl}
            activeJob={activeJob}
            agentCursor={agentCursor}
            agentIsWorking={agentIsWorking}
            agentStatusText={agentStatusText}
            registerSendCommand={registerSendCommand}
            isWebsiteJob={isWebsiteJob}
            LiveCanvasPreviewComponent={LiveCanvasPreview}
            selectedBrand={selectedBrandId ? brands.find(b => b.id === selectedBrandId) : undefined}
          />
        </div>
      </main>

      {/* ═══════ Right Floating Chat Panel — UNIFIED ═══════ */}
      <aside
        ref={dropZoneRef}
        className="absolute right-5 top-5 bottom-5 w-[340px] bg-white rounded-3xl shadow-xl border border-zinc-200 flex flex-col z-30"
        style={{ overflow: 'clip' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white/95 flex items-center justify-center rounded-3xl">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="text-sm font-medium mb-1">Drop to analyze</h3>
                <p className="text-xs text-zinc-500">RUMI will automatically understand your files</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

       {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:text-zinc-700 transition-colors">
                {selectedBrandId ? (brands.find(b => b.id === selectedBrandId)?.name || 'Brand') : 'Select Brand'}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {brands.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => insertChip(b, 'brand')} className="gap-2">
                  {b.logo_primary_url ? (
                    <img src={b.logo_primary_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-zinc-200 shrink-0" />
                  )}
                  <span className="truncate">{b.name}</span>
                  {selectedBrandId === b.id && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                </DropdownMenuItem>
              ))}
              {brands.length > 0 && <div className="h-px bg-zinc-100 my-1" />}
              <DropdownMenuItem onClick={() => navigate('/brands')} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Brand</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHistoryOverlay(!showHistoryOverlay)} className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1">History</button>
            <button onClick={() => navigate('/')} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* History Overlay */}
        <AnimatePresence>
          {showHistoryOverlay && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-12 left-2 right-2 z-40 bg-white border border-zinc-200 rounded-2xl shadow-lg max-h-72 overflow-y-auto">
              <div className="p-2">
                {/* New Chat button */}
                <button
                  onClick={() => {
                    if (thinkMode === 'creative-intelligence') { handleNewCISession(); selectJob(null); }
                    else { setResearchMessages([]); setResearchInput(''); }
                    setShowHistoryOverlay(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors text-zinc-700 mb-1"
                >
                  <Plus className="h-3.5 w-3.5" /> New Chat
                </button>

                <div className="h-px bg-zinc-100 my-1" />

                {/* Conversations */}
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider px-2 py-1">Conversations</p>
                {allConversations.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-3">No history yet</p>
                ) : (
                  allConversations.slice(0, 8).map((conv) => (
                    <button key={conv.id} onClick={() => {
                      if (thinkMode === 'creative-intelligence') loadCISession(conv.id);
                      else loadConversation(conv.id);
                      setShowHistoryOverlay(false);
                    }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors truncate text-zinc-600">
                      {conv.title || 'Untitled'}
                    </button>
                  ))
                )}

                {/* Autonomous Jobs */}
                {autonomousJobs.length > 0 && (
                  <>
                    <div className="h-px bg-zinc-100 my-1" />
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider px-2 py-1">Jobs</p>
                    {autonomousJobs.slice(0, 5).map((job) => (
                      <button
                        key={job.id}
                        onClick={() => { handleNewCISession(); selectJob(job); setShowHistoryOverlay(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors group"
                      >
                        <span className="truncate text-zinc-600 mr-2">
                          {(job.objective as any)?.goal?.slice(0, 30) || 'Job'}
                        </span>
                        <span className={cn(
                          "shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          job.state === 'COMPLETE' && 'bg-green-100 text-green-700',
                          job.state === 'FAILED' && 'bg-red-100 text-red-600',
                          job.state !== 'COMPLETE' && job.state !== 'FAILED' && 'bg-blue-100 text-blue-600',
                        )}>
                          {job.state === 'COMPLETE' ? '✓ Done' : job.state === 'FAILED' ? '✗ Failed' : 'Running'}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ Unified Message Area ═══════ */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="py-6 px-4">
            {thinkMode === 'creative-intelligence' ? (
              <>
                {/* CI Empty State */}
                {!hasCiMessages && !hasCards && !ciIsAnalyzing && !cardsLoading && !activeJob && (
                  <div className="text-center py-16">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 mb-4">
                      <RumiBlackIcon className="h-8 w-8" />
                    </motion.div>
                    <h2 className="text-lg font-medium text-zinc-900 mb-2 font-instrument-serif flex items-center justify-center gap-2">
                      Welcome to RUMI
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900 text-white">
                        Creative Intelligence <Sparkles className="h-2.5 w-2.5" />
                      </span>
                    </h2>
                    <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-[240px] mx-auto">
                      I'm your creative strategy partner. Tell me about your project and I'll help you develop strategic directions.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["Say hello", "Social media campaign", "Product launch strategy", "Curate Content"].map((s) => (
                        <button key={s} onClick={() => handleQuickPrompt(s)} className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors">{s}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-4">Type <kbd className="px-1 py-0.5 rounded bg-zinc-100 font-mono text-[10px]">!</kbd> to tag projects or brands</p>
                  </div>
                )}

                {/* Inline Agent Pipeline in empty state */}
                {!hasCiMessages && activeJob && (
                  <InlineAgentPipeline activeJob={activeJob} jobLogs={jobLogs} onCancel={cancelJob} onResume={resumeJob} onViewFullReport={() => selectJob(null)}
                    onOpenProject={(projectId) => {
                      if (isWebsiteJob) window.open(`/site-preview?projectId=${encodeURIComponent(projectId)}&jobId=${activeJob.id}`, '_blank');
                      else window.open(`/canvas?projectId=${encodeURIComponent(projectId)}`, '_blank');
                    }}
                  />
                )}

                {/* CI Messages */}
                {hasCiMessages && (
                  <div className="space-y-4 mb-6">
                    {ciMessages.map((message, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2", message.role === 'user' ? "justify-end" : "justify-start")}>
                        {message.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Brain className="h-4 w-4 text-zinc-700" />
                          </div>
                        )}
                        <div className="max-w-[85%] space-y-3">
                          <div className={cn("rounded-xl px-3 py-2.5 text-sm overflow-hidden", message.role === 'user' ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900")} style={{ wordBreak: 'break-word' }}>
                            {message.role === 'assistant' ? (
                              <div className="prose prose-sm max-w-none overflow-hidden break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:bg-transparent prose-pre:p-0 prose-pre:font-sans prose-pre:text-inherit prose-code:font-sans prose-code:bg-transparent prose-code:px-0 prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                          </div>
                          {message.proposals && message.proposals.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
                              {message.proposals.map((proposal) => (
                                <div key={proposal.id} className="snap-start shrink-0 max-w-[240px] w-[240px]">
                                  <ProposalCard proposal={proposal} onAccept={handleProposalAccept} onReject={handleProposalReject} onIterate={handleProposalIterate} isIterating={isGeneratingProposal} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Activity feed while chatting */}
                    {isChatting && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                        <motion.div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                          <Brain className="h-4 w-4 text-zinc-700" />
                        </motion.div>
                        <div className="bg-zinc-100 rounded-xl px-3 py-2.5 flex-1 max-w-[85%]">
                          <ActivityFeed steps={activitySteps} streamingContent={ciStreamingContent} isComplete={false} />
                        </div>
                      </motion.div>
                    )}

                    {isGeneratingProposal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0"><Brain className="h-4 w-4 text-zinc-700" /></div>
                        <div className="bg-zinc-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" /><span className="text-xs text-zinc-500">Generating proposals...</span>
                        </div>
                      </motion.div>
                    )}

                    {pendingBrief && !ciIsAnalyzing && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                        <Button onClick={handleGenerateDirections} size="sm" className="gap-2"><Sparkles className="w-3.5 h-3.5" />Generate Strategic Directions</Button>
                      </motion.div>
                    )}

                    {activeJob && (
                      <InlineAgentPipeline activeJob={activeJob} jobLogs={jobLogs} onCancel={cancelJob} onResume={resumeJob} onViewFullReport={() => selectJob(null)}
                        onOpenProject={(projectId) => {
                          if (isWebsiteJob) window.open(`/site-preview?projectId=${encodeURIComponent(projectId)}&jobId=${activeJob.id}`, '_blank');
                          else window.open(`/canvas?projectId=${encodeURIComponent(projectId)}`, '_blank');
                        }}
                      />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Decision Cards */}
                {hasCards && (
                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-900">Strategic Directions</h2>
                        <p className="text-xs text-zinc-500">{decisionCards.length} creative paths</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setShowTimeline(!showTimeline)} className="text-xs h-7 px-2">History</Button>
                        <Button variant="outline" size="sm" onClick={handleNewCISession} className="text-xs h-7 px-2 gap-1"><Plus className="w-3 h-3" />New</Button>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory -mx-2 px-2">
                      {decisionCards.map((card) => (
                        <div key={card.id} className="snap-start shrink-0 max-w-[240px] w-[240px]">
                          <DecisionCard card={card} onAccept={handleAccept} onReject={handleReject} onExport={handleExport} compact />
                        </div>
                      ))}
                    </div>
                    <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
                      <CollapsibleContent>
                        <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50">
                          <h3 className="text-xs font-medium text-zinc-900 mb-2">Decision Timeline</h3>
                          <DecisionTimeline decisions={timelineDecisions} onDecisionClick={() => {}} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* Loading state */}
                {(ciIsAnalyzing || cardsLoading) && !hasCards && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-zinc-500 animate-spin" />
                    </div>
                    <p className="text-xs text-zinc-500">Analyzing strategic directions...</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Research Empty State */}
                {researchMessages.length === 0 && (
                  <div className="text-center py-16">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 mb-4">
                      <RumiBlackIcon className="h-8 w-8" />
                    </motion.div>
                    <h2 className="text-lg font-medium text-zinc-900 mb-2 font-instrument-serif">Welcome to RUMI</h2>
                    <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-[240px] mx-auto">
                      I'm your creative strategy partner. Let's build something extraordinary together.
                    </p>
                    <div className="flex flex-col gap-2 px-4">
                      {["Say hello to RUMI", "Social media campaign", "Product launch strategy", "Curate Content"].map((s) => (
                        <button key={s} onClick={() => setResearchInput(s)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left">{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Research Messages */}
                <AnimatePresence>
                  {researchMessages.map((message, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                      <div className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                            <ThinkIcon className="h-4 w-4 text-zinc-700" />
                          </div>
                        )}
                        <div className={cn("max-w-[85%] py-2.5 px-3 rounded-xl text-sm", message.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900')}>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {message.attachments.map((att, i) => att.type.startsWith('image/') ? (
                                <img key={i} src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                              ) : (
                                <a key={i} href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-2 py-1.5 rounded-lg text-xs"><FileText className="h-3.5 w-3.5" /><span className="truncate max-w-[120px]">{att.name}</span></a>
                              ))}
                            </div>
                          )}
                          {message.role === 'assistant' ? renderResearchContent(message) : <p className="whitespace-pre-wrap text-right">{message.content}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isStreaming && (displayedContent || streamingContent) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5"><ThinkIcon className="h-4 w-4 text-zinc-700" /></div>
                      <div className="max-w-[85%] rounded-xl px-3 py-2.5 bg-zinc-100 text-zinc-900">
                        <div className="prose prose-sm max-w-none text-sm break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:bg-transparent prose-pre:p-0 prose-pre:font-sans prose-pre:text-inherit prose-code:font-sans prose-code:bg-transparent prose-code:px-0 prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-p:my-1.5 prose-li:my-0.5"><ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent || streamingContent}</ReactMarkdown></div>
                        <span className="inline-block w-1.5 h-4 bg-zinc-900 rounded-sm ml-0.5 animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {(isLoading || isAnalyzing) && !isStreaming && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                    <div className="bg-zinc-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <ThinkIcon className="h-3.5 w-3.5 text-zinc-500 animate-pulse" />
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ═══════ Unified Input Footer ═══════ */}
        <div className="shrink-0 p-3 pb-3">
          {/* Research file attachments */}
          {thinkMode === 'research' && deepResearchMode && (
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setDeepResearchMode(false)} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-full text-[10px] hover:bg-zinc-200 transition-colors">
                <Search className="h-2.5 w-2.5" />Deep Research<X className="h-2.5 w-2.5 ml-0.5" />
              </button>
            </div>
          )}

          <div className={cn(
            "bg-zinc-50 rounded-[22px] border border-zinc-200 overflow-hidden transition-all",
            inputFocused && "border-zinc-400"
          )}>
            {/* File previews */}
            {thinkMode === 'research' && attachedFiles.length > 0 && (
              <div className="flex gap-1.5 px-3 pt-2">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="relative group">
                    {file.type.startsWith('image/') ? (
                      <img src={filePreviewUrls[i]} alt={file.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-100 flex flex-col items-center justify-center gap-0.5">
                        <FileText className="h-4 w-4 text-zinc-400" /><span className="text-[7px] text-zinc-400 truncate w-10 text-center">{file.name.split('.').pop()}</span>
                      </div>
                    )}
                    <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 h-4 w-4 bg-zinc-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="px-3 pt-3 pb-1">
              {thinkMode === 'research' ? (
                <textarea
                  ref={textareaRef}
                  value={researchInput}
                  onChange={(e) => setResearchInput(e.target.value)}
                  onKeyDown={handleUnifiedKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask me anything or drop files to analyze..."
                  disabled={isLoading || isAnalyzing}
                  className={cn("w-full bg-transparent border-none outline-none resize-none text-zinc-900 placeholder:text-zinc-400 text-sm", inputFocused ? "min-h-[60px]" : "min-h-[20px]", "max-h-[160px] transition-all")}
                  rows={1}
                />
              ) : (
                <div
                  ref={ciInputRef}
                  contentEditable
                  onInput={handleCiInput}
                  onKeyDown={handleUnifiedKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  data-placeholder="Chat with RUMI about your creative goals..."
                  className={cn(
                    "w-full bg-transparent border-none outline-none text-zinc-900 text-sm",
                    inputFocused ? "min-h-[60px]" : "min-h-[20px]",
                    "max-h-[160px] overflow-y-auto transition-all",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none"
                  )}
                  style={{ wordBreak: 'break-word' }}
                />
              )}
            </div>

            {/* Bottom toolbar row — IDENTICAL for both modes */}
            <div className="flex items-center gap-1 px-2 pb-2">
              {/* Plus button */}
              <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
                <PopoverTrigger asChild>
                  <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors" disabled={isBusy}>
                    <Plus className="h-4 w-4 text-zinc-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1.5" align="start" side="top">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => { fileInputRef.current?.click(); setPlusMenuOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs"><Paperclip className="h-3.5 w-3.5 text-zinc-400" />Upload files</button>
                    <button onClick={() => { setAssetPickerOpen(true); setPlusMenuOpen(false); }} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs"><FolderOpen className="h-3.5 w-3.5 text-zinc-400" />Import from library</button>
                    {thinkMode === 'research' && (
                      <>
                        <div className="h-px bg-zinc-200 my-0.5" />
                        <button onClick={toggleDeepResearch} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs"><Globe className="h-3.5 w-3.5 text-zinc-400" />Deep research{deepResearchMode && <Check className="ml-auto h-3.5 w-3.5 text-zinc-700" />}</button>
                      </>
                    )}
                    {thinkMode === 'creative-intelligence' && (
                      <>
                        <div className="h-px bg-zinc-200 my-0.5" />
                        <button onClick={() => {
                          setPlusMenuOpen(false);
                          if (ciInputRef.current) { ciInputRef.current.focus(); document.execCommand('insertText', false, '!'); }
                          const rect = ciInputRef.current?.getBoundingClientRect();
                          if (rect) setPopupPosition({ x: rect.left + 20, y: rect.top - 10 });
                          setShowContextPopup(true);
                        }} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-left text-xs"><Sparkles className="h-3.5 w-3.5 text-zinc-400" />Tag project or brand</button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Mode Toggle — Globe & Lightbulb */}
              <TooltipProvider delayDuration={0}>
                <div className="flex items-center h-7 rounded-full bg-white border border-zinc-200 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn("flex items-center justify-center w-7 h-full rounded-full transition-all", thinkMode === 'research' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700")}
                        onClick={() => setThinkMode('research')}
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px]">Research</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setThinkMode('creative-intelligence')}
                        className={cn("flex items-center justify-center w-7 h-full rounded-full transition-all", thinkMode === 'creative-intelligence' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700")}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px]">Creative Intelligence</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Chat / Execute Autonomously dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 h-7 px-2 rounded-full text-xs text-zinc-500 hover:bg-zinc-200 transition-colors">
                    {sendMode === 'chat' ? 'Chat' : 'Execute'}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-48">
                  <DropdownMenuItem onClick={() => setSendMode('chat')} className="gap-2">
                    <MessageSquare className="h-3.5 w-3.5" /><span className="text-xs">Chat & Plan</span>
                    {sendMode === 'chat' && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSendMode('execute')} className="gap-2">
                    <Rocket className="h-3.5 w-3.5" /><span className="text-xs">Execute Autonomously</span>
                    {sendMode === 'execute' && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex-1" />

              {/* Voice button — Mic for research, Phone for CI */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {thinkMode === 'research' ? (
                      <button
                        onClick={handleVoiceToggle}
                        className={cn("w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors", (voiceMode || isConnectingVoice) && "bg-zinc-900 text-white hover:bg-zinc-800")}
                        disabled={isConnectingVoice}
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => setShowVoiceCall(true)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors text-zinc-400">
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">{thinkMode === 'research' ? 'Voice Input' : 'Call RUMI'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Send button */}
              <button
                onClick={handleUnifiedSend}
                disabled={!canSend}
                className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : sendMode === 'execute' ? <Rocket className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

        </div>

        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.md" className="hidden" onChange={handleFileSelect} />
        <AssetPickerModal open={assetPickerOpen} onOpenChange={setAssetPickerOpen} onSelect={handleAssetSelect} />

        {/* RUMI Voice Call */}
        <RumiVoiceCall
          open={showVoiceCall}
          onClose={() => setShowVoiceCall(false)}
          onCallEnd={handleVoiceCallEnd}
          brandContext={selectedBrandId ? (brands.find(b => b.id === selectedBrandId) as any) : null}
        />
      </aside>

      {/* Context Popup (CI mode) */}
      <ThinkContextPopup
        open={showContextPopup}
        onClose={() => setShowContextPopup(false)}
        onSelectProject={(project) => insertChip(project, 'project')}
        onSelectBrand={(brand) => insertChip(brand, 'brand')}
        projects={projects}
        brands={brands}
        projectStats={projectStats}
        position={popupPosition}
      />

      {/* Brand Drift Alert */}
      <BrandDriftAlert
        open={showDriftAlert}
        onOpenChange={setShowDriftAlert}
        driftAnalysis={currentDriftAnalysis}
        onCorrect={handleDriftCorrect}
        onOverride={handleDriftOverride}
        onAcknowledge={handleDriftAcknowledge}
      />
    </div>
  );
};

export default Think;
