import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, ArrowUp, Loader2, Brain, Lightbulb, Rocket, Info, Phone, ChevronDown, Check, X, RefreshCw, MessageSquare, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreativeIntelligence, ChatMessage, ChatResponse, ContentProposal } from '@/hooks/useCreativeIntelligence';
import { ActivityFeed } from './ActivityFeed';
import { ProposalCard } from './ProposalCard';
import { useAutonomousJobs } from '@/hooks/useAutonomousJobs';
import { InlineAgentPipeline } from './InlineAgentPipeline';
import { useAgentCanvasExecutor } from '@/hooks/useAgentCanvasExecutor';
import { LiveCanvasPreview } from './LiveCanvasPreview';
import { useProjectMonitor, type Project, type Brand } from '@/hooks/useProjectMonitor';
import { useBrandCognition } from '@/hooks/useBrandCognition';
import { useBrandDrift, type DriftAnalysis } from '@/hooks/useBrandDrift';
import { useRumiLearning } from '@/hooks/useRumiLearning';
import { DecisionCard } from './DecisionCard';
import { ThinkContextPopup } from './ThinkContextPopup';
import { JobHistoryStrip } from './JobHistoryStrip';
import { BrandInsightPanels } from './BrandInsightPanels';
import { DecisionTimeline } from './DecisionTimeline';
import { BrandDriftAlert } from './BrandDriftAlert';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RumiBlackIcon from '@/assets/icons/rumi-black.svg?react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import { RumiVoiceCall } from './RumiVoiceCall';
import { isWebsiteJob as isWebsiteJobHelper, tagWebsiteObjective } from '@/lib/websiteJob';

interface CreativeIntelligenceModeProps {
  onExportToCanvas?: (cardId: string, context: Record<string, unknown>) => void;
  onSwitchToResearch?: () => void;
  onNavigateToProject?: (projectId: string) => void;
  onToolbarSwitch?: (tool: string) => void;
}

interface ContextChip {
  type: 'project' | 'brand';
  id: string;
  name: string;
  thumbnailUrl?: string | null;
}

export function CreativeIntelligenceMode({ onExportToCanvas, onSwitchToResearch, onNavigateToProject, onToolbarSwitch }: CreativeIntelligenceModeProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [showContextPopup, setShowContextPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  // showInsightsPanel removed — replaced by hover card
  const [showTimeline, setShowTimeline] = useState(false);
  const [currentDriftAnalysis, setCurrentDriftAnalysis] = useState<DriftAnalysis | null>(null);
  
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [sendMode, setSendMode] = useState<'chat' | 'execute'>('chat');
  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingBrief, setPendingBrief] = useState<ChatResponse['briefData'] | null>(null);
  
  const inputRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isAnalyzing,
    isChatting,
    isGeneratingProposal,
    decisionCards,
    cardsLoading,
    analyzeStrategicDirection,
    updateCardStatus,
    startNewSession,
    tasteProfile,
    sendChatMessage,
    generateProposal,
    iterateProposal,
    updateProposalStatus,
    activitySteps,
    streamingContent,
    persistedMessages,
    getOrCreateConversation,
    persistMessage,
  } = useCreativeIntelligence();

  const {
    projects,
    brands,
    projectStats,
  } = useProjectMonitor();

  // Get selected brand from context chips
  const selectedBrandId = useMemo(() => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    return brandChip?.id;
  }, [contextChips]);

  // Brand cognition hook
  const {
    cognitionMemory,
    isLoading: cognitionLoading,
    getConfidenceLevel,
    hasSufficientData,
  } = useBrandCognition(selectedBrandId);

  // Brand drift hook
  const {
    showAlert: showDriftAlert,
    setShowAlert: setShowDriftAlert,
    handleAcknowledge,
    handleOverride,
    handleCorrection,
  } = useBrandDrift();

  // Learning signals hook
  const {
    recordAcceptance,
    recordIgnored,
    recordSignal,
  } = useRumiLearning();

  // Autonomous jobs hook
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

  // Agent canvas executor for transparent tool-use + live preview
  const {
    actions: agentActions,
    currentAction,
    cursor: agentCursor,
    previewUrl: agentPreviewUrl,
    statusText: agentStatusText,
    registerSendCommand,
    isWorking: agentIsWorking,
  } = useAgentCanvasExecutor(activeJob?.id || null);

  const [showLivePreview, setShowLivePreview] = useState(true);

  const isWebsiteJob = useMemo(() => isWebsiteJobHelper(activeJob), [activeJob]);

  // Derive preview URL: from agent commands, active job's project_id, or show canvas as soon as project is created.
  // Website jobs never produce a preview URL here — they live in the LandingPagePanel via toolbar switch.
  const livePreviewUrl = useMemo(() => {
    if (isWebsiteJob) return null;
    if (agentPreviewUrl && !agentPreviewUrl.includes('/site-preview')) return agentPreviewUrl;
    if (!activeJob) return null;
    if (activeJob.project_id) return `/canvas?projectId=${encodeURIComponent(activeJob.project_id)}&agentMode=true`;
    return null;
  }, [agentPreviewUrl, activeJob, isWebsiteJob]);

  // No longer auto-show full dashboard — pipeline is inline in chat

  // Load persisted messages on mount
  useEffect(() => {
    getOrCreateConversation();
  }, [getOrCreateConversation]);

  // Merge persisted messages into local state (only once)
  const hasLoadedPersistedRef = useRef(false);
  useEffect(() => {
    if (persistedMessages.length > 0 && !hasLoadedPersistedRef.current) {
      hasLoadedPersistedRef.current = true;
      setMessages(persistedMessages);
    }
  }, [persistedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Compute insight panel data
  const insightData = useMemo(() => {
    if (!cognitionMemory) {
      return {
        consistencyScore: 0,
        riskLevel: 'low' as const,
        confidenceScore: 0,
        performanceDirection: 'stable' as const,
        totalDesignsAnalyzed: 0,
        learningProgress: 0,
      };
    }

    const confidenceLevel = getConfidenceLevel();
    const riskLevel: 'low' | 'medium' | 'high' = cognitionMemory.design_risk_tolerance > 70 ? 'high' : 
                      cognitionMemory.design_risk_tolerance > 40 ? 'medium' : 'low';

    return {
      consistencyScore: Math.round(cognitionMemory.confidence_score * 100),
      riskLevel,
      confidenceScore: Math.round(cognitionMemory.confidence_score * 100),
      performanceDirection: hasSufficientData() ? 'up' as const : 'stable' as const,
      performanceExplanation: hasSufficientData() ? 'Based on historical patterns' : 'Gathering more data',
      totalDesignsAnalyzed: cognitionMemory.total_designs_analyzed,
      learningProgress: Math.min(100, cognitionMemory.total_designs_analyzed * 10),
    };
  }, [cognitionMemory, getConfidenceLevel, hasSufficientData]);

  // Map decision cards to timeline format
  const timelineDecisions = useMemo(() => {
    return decisionCards.map(card => ({
      id: card.id,
      title: card.title,
      reasoning: card.business_reasoning || '',
      status: card.status === 'accepted' ? 'accepted' as const :
              card.status === 'rejected' ? 'rejected' as const :
              card.status === 'exported' ? 'accepted' as const : 'pending' as const,
      createdAt: card.created_at,
      influences: [
        ...(selectedBrandId ? [{ type: 'brand_memory' as const, label: 'Brand Memory' }] : []),
        ...(card.performance_probability > 70 ? [{ type: 'market_trend' as const, label: 'High Success Signal' }] : []),
      ],
      riskLevel: card.risk_level,
      performanceProbability: card.performance_probability,
    }));
  }, [decisionCards, selectedBrandId]);

  // Handle input changes and detect ! trigger
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const div = e.currentTarget;
    const text = div.innerText || '';
    
    // Check if user just typed !
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBefore = text.slice(0, range.startOffset);
      
      if (textBefore.endsWith('!') && (textBefore.length === 1 || /\s$/.test(textBefore.slice(-2, -1)))) {
        // Calculate popup position
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setPopupPosition({ 
            x: rect.left + 20, 
            y: rect.top - 10 
          });
        }
        setShowContextPopup(true);
      }
    }
    
    setInputValue(text);
  };

  // Insert chip into contentEditable
  const insertChip = (item: Project | Brand, type: 'project' | 'brand') => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    
    const name = type === 'project' ? (item as Project).title : (item as Brand).name;
    const thumbnailUrl = type === 'project' ? (item as Project).thumbnail_url : (item as Brand).logo_primary_url;
    
    // Create chip element
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset[type === 'project' ? 'projectId' : 'brandId'] = item.id;
    chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/50 mx-0.5 text-xs align-middle';
    
    if (thumbnailUrl) {
      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.className = 'w-4 h-4 rounded object-cover';
      chip.appendChild(img);
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    chip.appendChild(nameSpan);
    
    // Remove the ! trigger and insert chip
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // Find and remove the ! character
      const html = inputEl.innerHTML;
      inputEl.innerHTML = html.replace(/!\s*$/, '');
      
      // Move cursor to end and insert chip
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      range.insertNode(chip);
      
      // Add space after chip
      const space = document.createTextNode(' ');
      chip.after(space);
      
      // Move cursor after space
      range.setStartAfter(space);
      range.setEndAfter(space);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Track chip in state
    const newChip: ContextChip = {
      type,
      id: item.id,
      name,
      thumbnailUrl,
    };
    setContextChips(prev => [...prev.filter(c => !(c.type === type && c.id === item.id)), newChip]);
    setShowContextPopup(false);
    inputEl.focus();
  };

  // Handle context selection from popup
  const handleContextSelect = (item: Project | Brand, type: 'project' | 'brand') => {
    insertChip(item, type);
  };

  // Parse chips from contentEditable before submit
  const parseChipsFromInput = (): { text: string; chips: ContextChip[] } => {
    const inputEl = inputRef.current;
    if (!inputEl) return { text: '', chips: [] };
    
    const chips: ContextChip[] = [];
    const chipElements = inputEl.querySelectorAll('[data-project-id], [data-brand-id]');
    
    chipElements.forEach(el => {
      const projectId = (el as HTMLElement).dataset.projectId;
      const brandId = (el as HTMLElement).dataset.brandId;
      const name = el.textContent || '';
      
      if (projectId) {
        chips.push({ type: 'project', id: projectId, name, thumbnailUrl: null });
      } else if (brandId) {
        chips.push({ type: 'brand', id: brandId, name, thumbnailUrl: null });
      }
    });
    
    // Get plain text without chips
    const text = inputEl.innerText?.trim() || '';
    
    return { text, chips };
  };

  // Handle chat message submission
  const handleSubmit = async () => {
    const { text, chips } = parseChipsFromInput();
    if (!text && chips.length === 0) return;

    // Clear input immediately
    if (inputRef.current) {
      inputRef.current.innerHTML = '';
    }
    setInputValue('');

    // Add user message to history
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);

    // Send to conversational AI
    const response = await sendChatMessage(
      text,
      messages,
      { existingChips: chips.map(c => ({ type: c.type, id: c.id, name: c.name })) }
    );

    // Add assistant response to history and persist
    const assistantMessage: ChatMessage = { role: 'assistant', content: response.content };
    setMessages(prev => [...prev, assistantMessage]);
    if (response.content) {
      persistMessage('assistant', response.content);
    }

    // Handle response type
    if (response.type === 'ready_to_analyze' && response.briefData) {
      setPendingBrief(response.briefData);
    }

    // Handle website generation request — trigger autonomous execution
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
          // Switch toolbar AFTER successful submit so blank panel never shows
          onToolbarSwitch?.('landing-page');
          toast({ title: 'Landing page generation started', description: 'Watch the AI build your page in real-time.' });
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

    // Handle section edit
    if (response.type === 'edit_section' && response.editSection) {
      try {
        const { data, error } = await supabase.functions.invoke('edit-landing-section', {
          body: response.editSection,
        });
        if (error) throw error;
        const editResult: ChatMessage = {
          role: 'assistant',
          content: `✅ Section updated! The changes have been applied to your landing page.`,
        };
        setMessages(prev => [...prev, editResult]);
        persistMessage('assistant', editResult.content);
        const { notifyAiComplete } = await import('@/lib/notifications/aiNotify');
        notifyAiComplete({
          source: 'edit',
          status: 'success',
          title: 'Section updated',
          message: 'Your landing page section is ready.',
        });
      } catch (err) {
        console.error('Section edit failed:', err);
        const { notifyAiComplete } = await import('@/lib/notifications/aiNotify');
        notifyAiComplete({
          source: 'edit',
          status: 'error',
          title: 'Edit failed',
          message: (err as Error)?.message || 'Could not update section.',
        });
      }
    }

    // Handle content generation request — show confirmation instead of auto-generating
    if (response.type === 'ready_to_generate') {
      const brandChip = contextChips.find(c => c.type === 'brand');
      if (!brandChip) {
        const noBrandMsg: ChatMessage = {
          role: 'assistant',
          content: "I'd love to generate content for you! Please tag a brand first using the **!** shortcut so I can align everything with your brand identity.",
        };
        setMessages(prev => [...prev, noBrandMsg]);
      }
    }
  };

  // Trigger strategic analysis with pending brief
  const handleGenerateDirections = async () => {
    if (!pendingBrief) return;

    const selectedBrand = contextChips.find(c => c.type === 'brand');
    
    await analyzeStrategicDirection({
      goal: pendingBrief.goal,
      audience: pendingBrief.audience,
      platform: pendingBrief.platform,
      riskTolerance: pendingBrief.riskTolerance,
      successMetrics: pendingBrief.successMetrics,
      brandId: selectedBrand?.id || pendingBrief.brandId,
    });

    setPendingBrief(null);
    setContextChips([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowContextPopup(false);
    }
  };

  const handleAccept = async (cardId: string) => {
    updateCardStatus({ cardId, status: 'accepted' });
    
    // Record learning signal
    const card = decisionCards.find(c => c.id === cardId);
    if (card) {
      await recordAcceptance(cardId, card.session_id, selectedBrandId, {
        cardTitle: card.title,
        riskLevel: card.risk_level,
        performanceProbability: card.performance_probability,
      });
    }
    
    toast({ title: 'Direction accepted', description: 'This will inform future recommendations.' });
  };

  const handleReject = async (cardId: string, feedback?: string) => {
    updateCardStatus({ cardId, status: 'rejected', feedback });
    
    // Record learning signal
    const card = decisionCards.find(c => c.id === cardId);
    if (card) {
      await recordIgnored(cardId, card.session_id, feedback, selectedBrandId);
    }
    
    toast({ title: 'Direction rejected', description: 'Thanks for the feedback.' });
  };

  const handleExport = async (cardId: string) => {
    updateCardStatus({ cardId, status: 'exported' });
    const card = decisionCards.find(c => c.id === cardId);
    if (card) {
      // Record export signal
      await recordSignal({
        type: 'design_exported',
        cardId,
        sessionId: card.session_id,
        brandId: selectedBrandId,
        data: {
          cardTitle: card.title,
          destination: 'canvas',
          exportedAt: new Date().toISOString(),
        },
      });

      if (onExportToCanvas) {
        onExportToCanvas(cardId, {
          title: card.title,
          businessReasoning: card.business_reasoning,
          emotionalPositioning: card.emotional_positioning,
          visualPhilosophy: card.visual_philosophy,
          riskLevel: card.risk_level,
        });
      }
    }
    toast({ 
      title: 'Exported to Canvas', 
      description: 'Strategic context will guide your design generation.' 
    });
  };

  // Proposal action handlers
  const handleProposalAccept = async (proposalId: string) => {
    await updateProposalStatus(proposalId, 'accepted');
    // Update local state
    setMessages(prev => prev.map(msg => ({
      ...msg,
      proposals: msg.proposals?.map(p => p.id === proposalId ? { ...p, status: 'accepted' as const } : p),
    })));
    toast({ title: 'Proposal accepted', description: 'You can download the asset.' });
  };

  const handleProposalReject = async (proposalId: string, feedback?: string) => {
    await updateProposalStatus(proposalId, 'rejected', feedback);
    setMessages(prev => prev.map(msg => ({
      ...msg,
      proposals: msg.proposals?.map(p => p.id === proposalId ? { ...p, status: 'rejected' as const } : p),
    })));
    toast({ title: 'Proposal rejected', description: 'Thanks for the feedback.' });
  };

  const handleProposalIterate = async (proposalId: string, feedback: string) => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    if (!brandChip) return;

    const newProposals = await iterateProposal(proposalId, feedback, brandChip.id);
    if (newProposals.length > 0) {
      const iterationMsg: ChatMessage = {
        role: 'assistant',
        content: `Here's the updated version based on your feedback:`,
        proposals: newProposals,
      };
      setMessages(prev => [...prev, iterationMsg]);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (inputRef.current) {
      inputRef.current.innerText = prompt;
      inputRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setInputValue(prompt);
  };

  // Handle drift alert actions
  const handleDriftCorrect = async () => {
    if (currentDriftAnalysis && selectedBrandId) {
      await handleCorrection('drift-' + Date.now(), selectedBrandId);
      setCurrentDriftAnalysis(null);
    }
  };

  const handleDriftOverride = async () => {
    if (currentDriftAnalysis && selectedBrandId) {
      await handleOverride('drift-' + Date.now(), selectedBrandId, 'Intentional creative choice');
      setCurrentDriftAnalysis(null);
    }
  };

  const handleDriftAcknowledge = async () => {
    if (selectedBrandId) {
      await handleAcknowledge('drift-' + Date.now(), selectedBrandId);
      setCurrentDriftAnalysis(null);
    }
  };

  // Start new conversation
  const handleNewSession = () => {
    setMessages([]);
    setPendingBrief(null);
    startNewSession();
    detachJob(); // Clear active job and disable auto-attach
  };

  // Handle voice call end — inject notes into chat
  const handleVoiceCallEnd = async (callNotes: string[], callTranscript: Array<{ role: string; content: string }>) => {
    if (callNotes.length === 0 && callTranscript.length === 0) return;
    
    const briefSummary = callNotes.length > 0
      ? `**Voice Call Brief Notes:**\n\n${callNotes.map(n => `• ${n}`).join('\n')}`
      : `**Voice call completed** — ${callTranscript.length} exchanges recorded.`;

    const noteMessage: ChatMessage = {
      role: 'assistant',
      content: briefSummary,
    };
    setMessages(prev => [...prev, noteMessage]);
    persistMessage('assistant', briefSummary);
  };

  // Handle autonomous execution
  const handleExecuteAutonomously = async () => {
    const brandChip = contextChips.find(c => c.type === 'brand');
    const objectiveText = messages.length > 0
      ? messages.filter(m => m.role === 'user').map(m => m.content).join('. ')
      : inputValue.trim();

    if (!objectiveText) {
      toast({ title: 'Describe your objective first', variant: 'destructive' });
      return;
    }

    const objective = {
      goal: objectiveText,
      brand_id: brandChip?.id || null,
      timestamp: new Date().toISOString(),
    };

    const jobId = await submitJob(objective, brandChip?.id);
    if (jobId) {
      toast({ title: 'Autonomous execution started', description: 'You can close this and come back later.' });
    }
  };

  const hasCards = decisionCards.length > 0;
  const hasMessages = messages.length > 0;
  const showBrandInsights = !!selectedBrandId;

    return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Main Chat Panel — fills the parent panel */}
      <div className="flex flex-col min-w-0 flex-1">
        <ScrollArea className="flex-1">
          <div className="py-6 px-4">
            {/* Empty State - Only show when no messages AND no cards AND no active job */}
            {!hasMessages && !hasCards && !isAnalyzing && !cardsLoading && !activeJob && (
              <div className="text-center py-20">
                {/* Icon Container */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6"
                >
                  <RumiBlackIcon className="h-10 w-10" />
                </motion.div>
                
                {/* Title */}
                <h2 className="text-xl font-medium text-foreground mb-2 font-instrument-serif flex items-center justify-center gap-2">
                  Welcome to RUMI
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                    Creative Intelligence
                    <Sparkles className="h-3 w-3" />
                  </span>
                </h2>
                
                {/* Description */}
                <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed mb-6">
                  I'm your creative strategy partner. Tell me about your project and I'll help you develop strategic directions with business reasoning and success predictions.
                </p>
                
                {/* Quick action buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => handleQuickPrompt("Hi! I'm working on ")}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Say hello
                  </button>
                  <button
                    onClick={() => handleQuickPrompt("I need help planning a social media campaign")}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Social media
                  </button>
                  <button
                    onClick={() => handleQuickPrompt("I'm launching a new product and need creative directions")}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Product launch
                  </button>
                  <button
                    onClick={() => handleQuickPrompt("Generate social media posts for my brand")}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Curate content
                  </button>
                </div>
                
                {/* Hint for tagging */}
                <p className="text-xs text-muted-foreground mt-4">
                  Type <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">!</kbd> to tag projects or brands
                </p>
              </div>
            )}

            {/* Inline Agent Pipeline in empty state */}
            {!hasMessages && activeJob && (
              <InlineAgentPipeline
                activeJob={activeJob}
                jobLogs={jobLogs}
                onCancel={cancelJob}
                onResume={resumeJob}
                onViewFullReport={() => selectJob(null)}
                 onOpenProject={(projectId) => {
                   if (isWebsiteJob) {
                     window.open(`/site-preview?projectId=${encodeURIComponent(projectId)}&jobId=${activeJob.id}`, '_blank');
                   } else if (onNavigateToProject) onNavigateToProject(projectId);
                   else window.open(`/canvas?projectId=${encodeURIComponent(projectId)}`, '_blank');
                }}
              />
            )}


            {/* Conversation Messages */}
            {hasMessages && (
              <div className="space-y-4 mb-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Brain className="h-5 w-5 text-foreground" />
                      </div>
                    )}
                    <div className="max-w-[80%] space-y-3">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-foreground"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:bg-transparent prose-pre:p-0 prose-pre:font-sans prose-pre:text-inherit prose-code:font-sans prose-code:bg-transparent prose-code:px-0 prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5">
                            <ReactMarkdown>{(() => {
                              try {
                                const match = message.content.match(/\{[\s\S]*"type"[\s\S]*\}/);
                                if (match) {
                                  const parsed = JSON.parse(match[0]);
                                  if (parsed.type) {
                                    return message.content.replace(match[0], '').trim() || parsed.content || message.content;
                                  }
                                }
                              } catch (e) {}
                              return message.content;
                            })()}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {/* Render proposal cards inline */}
                      {message.proposals && message.proposals.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                          {message.proposals.map((proposal) => (
                            <div key={proposal.id} className="snap-start shrink-0" style={{ width: '320px' }}>
                              <ProposalCard
                                proposal={proposal}
                                onAccept={handleProposalAccept}
                                onReject={handleProposalReject}
                                onIterate={handleProposalIterate}
                                isIterating={isGeneratingProposal}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">You</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Activity feed — replaces bouncing dots */}
                {isChatting && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-3"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Brain className="h-5 w-5 text-foreground" />
                    </motion.div>
                    <div className="bg-muted/50 rounded-2xl px-4 py-3 flex-1 max-w-[85%]">
                      <ActivityFeed 
                        steps={activitySteps}
                        streamingContent={streamingContent}
                        isComplete={false}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Generating proposals indicator */}
                {isGeneratingProposal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Brain className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Generating content proposals...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Ready to analyze prompt */}
                {pendingBrief && !isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <Button
                      onClick={handleGenerateDirections}
                      className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Strategic Directions
                    </Button>
                  </motion.div>
                )}

                {/* Inline Agent Pipeline — shown in chat when job is active */}
                {activeJob && (
                  <InlineAgentPipeline
                    activeJob={activeJob}
                    jobLogs={jobLogs}
                    onCancel={cancelJob}
                    onResume={resumeJob}
                    onViewFullReport={() => selectJob(null)}
                    onOpenProject={(projectId) => {
                      if (isWebsiteJob) {
                        window.open(`/site-preview?projectId=${encodeURIComponent(projectId)}&jobId=${activeJob.id}`, '_blank');
                      } else if (onNavigateToProject) onNavigateToProject(projectId);
                      else window.open(`/canvas?projectId=${encodeURIComponent(projectId)}`, '_blank');
                    }}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Loading State for Analysis */}
            {(isAnalyzing || cardsLoading) && !hasCards && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Analyzing strategic directions...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Evaluating business context, market signals, and brand alignment
                  </p>
                </div>
              </div>
            )}

            {/* Decision Cards - Horizontal Scrolling */}
            {hasCards && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Strategic Directions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {decisionCards.length} creative paths identified
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTimeline(!showTimeline)}
                      className={cn("gap-2", showTimeline && "bg-muted")}
                    >
                      History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewSession}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Session
                    </Button>
                  </div>
                </div>

                {/* Horizontal Scrolling Cards Container */}
                <div className="relative -mx-6 px-6">
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {decisionCards.map((card) => (
                      <div key={card.id} className="snap-start shrink-0" style={{ width: '280px' }}>
                        <DecisionCard
                          card={card}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          onExport={handleExport}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Timeline - Collapsible */}
                <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
                  <CollapsibleContent className="pt-4">
                    <div className="border border-border rounded-xl p-4 bg-card/50">
                      <h3 className="text-sm font-medium text-foreground mb-3">Decision Timeline</h3>
                      <DecisionTimeline
                        decisions={timelineDecisions}
                        onDecisionClick={(id) => {
                          const card = decisionCards.find(c => c.id === id);
                          if (card) {
                            toast({ title: card.title, description: card.business_reasoning });
                          }
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Feedback tip */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Accept directions that resonate, reject those that don't. Your feedback 
                    helps RUMI learn your preferences for better future recommendations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Sticky Bottom */}
        <div className="sticky bottom-0 z-20 bg-background/80 backdrop-blur p-3 pb-4">
          <div>
            {/* Main Input Container */}
            <div className={cn(
              "bg-background rounded-[28px] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all",
              inputFocused && "ring-2 ring-primary/20"
            )}>
              <div className="flex items-start gap-2 p-2 pl-3">
                {/* Plus Button - Add context */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shrink-0"
                  disabled={isAnalyzing || isChatting}
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.focus();
                      document.execCommand('insertText', false, '!');
                      const rect = inputRef.current.getBoundingClientRect();
                      setPopupPosition({ x: rect.left + 20, y: rect.top - 10 });
                    }
                    setShowContextPopup(true);
                  }}
                  title="Add project or brand context"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                
                {/* Mode Toggle - icon only with tooltips */}
                <TooltipProvider delayDuration={0}>
                  <div className="flex items-center h-8 rounded-full bg-muted/50 border border-border/50 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onSwitchToResearch}
                          className="flex items-center justify-center w-8 h-full rounded-full transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Brain className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Research
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center justify-center w-8 h-full rounded-full transition-all bg-background text-foreground"
                        >
                          <Lightbulb className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Creative Intelligence
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {/* Call RUMI Button */}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowVoiceCall(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Call RUMI
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* ContentEditable Input */}
                <div
                  ref={inputRef}
                  contentEditable
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  data-placeholder="Chat with RUMI about your creative goals..."
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none text-foreground text-sm pt-1.5",
                    inputFocused ? "min-h-[80px]" : "min-h-[24px]",
                    "max-h-[200px] overflow-y-auto transition-all",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
                  )}
                  style={{ 
                    wordBreak: 'break-word', 
                    textAlign: 'left',
                    padding: 0,
                    paddingTop: '6px',
                    margin: 0,
                    verticalAlign: 'top'
                  }}
                />
                
                {/* Split Send Button with Mode Dropdown */}
                <div className="flex items-center shrink-0">
                  <Button
                    size="icon"
                    onClick={sendMode === 'chat' ? handleSubmit : handleExecuteAutonomously}
                    disabled={
                      sendMode === 'chat'
                        ? ((!inputValue.trim() && contextChips.length === 0) || isAnalyzing || isChatting)
                        : (isSubmittingJob || (!hasMessages && !inputValue.trim()))
                    }
                    className="rounded-l-full rounded-r-none h-8 w-8 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isChatting || isSubmittingJob ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : sendMode === 'execute' ? (
                      <Rocket className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        className="rounded-r-full rounded-l-none h-8 w-5 bg-foreground text-background hover:bg-foreground/90 border-l border-background/20"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setSendMode('chat')} className="gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-xs">Chat & Plan</span>
                        {sendMode === 'chat' && <Check className="h-3.5 w-3.5 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSendMode('execute')} className="gap-2">
                        <Rocket className="h-3.5 w-3.5" />
                        <span className="text-xs">Execute Autonomously</span>
                        {sendMode === 'execute' && <Check className="h-3.5 w-3.5 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            {/* Mode hint + Job History */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                {sendMode === 'execute' 
                  ? "Execute Autonomously mode — RUMI will run the full pipeline"
                  : hasMessages ? "Continue the conversation or ask RUMI to generate directions" : "Start a conversation—RUMI will guide you to the right creative brief"}
              </p>
            </div>

            {/* Job History + New Chat with arrow navigation */}
            <JobHistoryStrip
              jobs={autonomousJobs}
              onNewChat={() => { handleNewSession(); selectJob(null); }}
              onSelectJob={(job) => { handleNewSession(); selectJob(job); }}
              onDeleteJob={deleteJob}
            />
          </div>
        </div>
      </div>

      {/* Canvas preview moved to parent Think.tsx center workspace */}

      {/* Context Popup */}
      <ThinkContextPopup
        open={showContextPopup}
        onClose={() => setShowContextPopup(false)}
        onSelectProject={(project) => handleContextSelect(project, 'project')}
        onSelectBrand={(brand) => handleContextSelect(brand, 'brand')}
        projects={projects}
        brands={brands}
        projectStats={projectStats}
        position={popupPosition}
      />

      {/* Brand Drift Alert Modal */}
      <BrandDriftAlert
        open={showDriftAlert}
        onOpenChange={setShowDriftAlert}
        driftAnalysis={currentDriftAnalysis}
        onCorrect={handleDriftCorrect}
        onOverride={handleDriftOverride}
        onAcknowledge={handleDriftAcknowledge}
      />

      {/* RUMI Voice Call */}
      <RumiVoiceCall
        open={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        onCallEnd={handleVoiceCallEnd}
        brandContext={selectedBrandId ? (brands.find(b => b.id === selectedBrandId) as any) : null}
      />
    </div>
  );
}
