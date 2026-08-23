import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, ChevronLeft, ChevronRight, X, Check, Plus, Sparkles, Image as ImageIcon, Megaphone, Palette as PaletteIcon, Users, Upload, ImagePlus } from 'lucide-react';
import { RumiWhiteIcon, ReferenceFoundIcon, GeneratedDesignsIcon, ClickInspirationIcon } from '@/components/icons/CustomIcons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import OptionButtons from './OptionButtons';
import InputFieldsCard from './InputFieldsCard';
import ChatHistoryPanel from './ChatHistoryPanel';
import AssetsPanel from './AssetsPanel';
import ModelSelector from './ModelSelector';
import VideoGenerationControls from './VideoGenerationControls';
import VideoMessage from './VideoMessage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AgentPlan } from '@/components/ui/agent-plan';
import { useGenerationPlan } from '@/hooks/useGenerationPlan';
import { DynamicThinkingIndicator, ThinkingContext } from './DynamicThinkingIndicator';
import { SkillsPanel } from './SkillsPanel';
import { SkillExecutionPlan } from './SkillExecutionPlan';
import { Skill, RUMI_SKILLS, analyzePromptCompleteness } from '@/lib/rumiSkillsConfig';
import colabLogo from '@/assets/colab-logo.svg';
import { ProductAnalysisCard } from './ProductAnalysisCard';
import { GenerationTimer } from './GenerationTimer';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { notifyAiComplete } from '@/lib/notifications/aiNotify';
interface TaggedAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  imageUrl?: string;
}

interface SelectedSkillData {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isThinking?: boolean;
  id?: number;
  options?: string[];
  inputFields?: Array<{
    label: string;
    placeholder: string;
    value: string;
  }>;
  
  inspirations?: Array<{
    url: string;
    title?: string;
    tags?: string[];
    style_keywords?: string[];
  }>;
  designType?: string;
  selectedImageUrl?: string;
  designIterations?: {
    url: string;
    prompt: string;
    type?: string;
  }[];
  pendingApproval?: boolean;
  brandInfo?: any;
  isLogoPackage?: boolean;
  researchSources?: Array<{
    title: string;
    url: string;
    description: string;
    favicon: string;
  }>;
  uploadedImages?: string[];
  researchData?: any;
  videoUrl?: string;
  videoStatus?: 'queued' | 'processing' | 'completed' | 'failed';
  videoJobId?: string;
  videoDuration?: number;
  videoAspectRatio?: string;
  videoError?: string;
  styleKeywords?: string | string[];
  taggedAssets?: TaggedAsset[];
  selectedSkill?: SelectedSkillData;
  // Product analysis fields for smart briefing flow
  imageAnalysis?: {
    design: { packaging_shape: string; color_zones: string; layout_elements: string };
    colors: Array<{ color: string; hex_estimate: string; purpose: string }>;
    branding: { brand_name: string; product_name: string; identity_elements: string };
    product_details: Array<{ label: string; value: string }>;
    summary: string;
  };
  executionPlan?: Array<{ imageNumber: number; title: string; description: string; model: string }>;
}

const normalizeStrArray = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(v => String(v).toLowerCase()).filter(Boolean);
};

const tokenizeKeywords = (keywords?: string): string[] => {
  if (!keywords) return [];
  return keywords
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3)
    .slice(0, 12);
};

// Helper to format design types for user display
const formatDesignTypeDisplay = (type: string): string => {
  const displayMap: Record<string, string> = {
    'logo_only': 'logo',
    'brand_guidelines': 'brand guidelines',
    'brand_identity': 'brand identity'
  };
  return displayMap[type] || type.replace(/_/g, ' ');
};

const isLogoStrictMatch = (img: any, tokens: string[]): boolean => {
  const tags = normalizeStrArray(img?.semantic_tags || img?.tags);
  const styleKeywords = normalizeStrArray(img?.style_keywords);
  const title = String(img?.title || '').toLowerCase();
  const desc = String(img?.description || '').toLowerCase();
  const fileName = String(img?.file_name || '').toLowerCase();

  // Hard exclude: poster/identity/layout/print etc
  const nonLogoAssets = ['poster', 'identity', 'flyer', 'print', 'brochure', 'menu', 'packaging', 'layout', 'typography poster', 'campaign'];
  if (tags.some(t => nonLogoAssets.includes(t))) return false;

  // Hard exclude: obvious non-logo reference sets
  if (tags.includes('mockup') && !tags.some(t => ['logo', 'wordmark', 'logomark', 'monogram', 'mark'].includes(t))) {
    // allow mockups only if they are explicitly logo-related
    return false;
  }

  // Hard include: must have a logo signal (tag OR metadata text)
  const logoSignals = ['logo', 'logomark', 'wordmark', 'monogram', 'combination', 'brandmark', 'brand mark', 'mark'];
  const hasLogoSignal =
    tags.some(t => logoSignals.includes(t)) ||
    logoSignals.some(s => title.includes(s) || desc.includes(s) || fileName.includes(s));
  if (!hasLogoSignal) return false;

  // Keyword match (if provided): must match at least one token in tags/style/metadata
  if (tokens.length > 0) {
    const hay = new Set([...tags, ...styleKeywords]);
    const matched = tokens.some(tok => hay.has(tok) || title.includes(tok) || desc.includes(tok) || fileName.includes(tok));
    if (!matched) return false;
  }

  return true;
};
interface ChatInterfaceProps {
  userId: string;
  projectId: string;
  onDesignGenerated: (imageUrl: string, title: string, x?: number, y?: number, artboardId?: string, isPlaceholder?: boolean, directToCanvas?: boolean, gridIndex?: number, filePath?: string) => Promise<string | boolean | undefined>;
  userName?: string;
  selectedArtboardImage?: string | null;
  artboards?: any[];
  canvasInstance?: any | null;
  selectedFormat?: string;
}
const ChatInterface = ({
  userId,
  projectId,
  onDesignGenerated,
  userName,
  selectedArtboardImage,
  artboards,
  canvasInstance,
  selectedFormat
}: ChatInterfaceProps) => {
  const {
    toast
  } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlan, setShowPlan] = useState(false); // Keep plan visible after generation
  const [thinkingContext, setThinkingContext] = useState<ThinkingContext>('general');
  const isSavingRef = useRef(false);
  const thinkingMessageIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  // Keep ref in sync with state so long-running async closures always read the latest value
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [selectedImageModel, setSelectedImageModel] = useState('google/gemini-3-pro-image-preview');
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  
  // Think/Fast mode and Web Search toggles - PRODUCTION READY
  const [thinkModeEnabled, setThinkModeEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Skill mode state for structured workflows
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [isSkillMode, setIsSkillMode] = useState(false);
  const [skillStepIndex, setSkillStepIndex] = useState(0);
  const [skillFieldValues, setSkillFieldValues] = useState<Record<string, string>>({});

  // Generation plan state for showing RUMI's progress
  const { 
    tasks: generationTasks, 
    completedSnapshot,
    initializePlan, 
    startStep, 
    completeStep, 
    updateIterationProgress, 
    snapshotCompleted,
    resetPlan,
    clearSnapshot,
    getExpandedTaskIds 
  } = useGenerationPlan();

  const addThinkingMessage = useCallback(() => {
    // Remove any existing thinking message first
    setMessages(prev => prev.filter(m => !m.isThinking));
    const thinkingId = Date.now();
    thinkingMessageIdRef.current = thinkingId;
    setMessages(prev => [...prev, {
      role: 'assistant' as const,
      content: 'Thinking...',
      isThinking: true,
      id: thinkingId
    }]);
  }, []);
  const removeThinkingMessage = useCallback(() => {
    setMessages(prev => prev.filter(m => !m.isThinking));
    thinkingMessageIdRef.current = null;
  }, []);

  // Load conversation messages (moved outside useEffect for stability)
  const loadConversationMessages = useCallback(async (convId: string) => {
    console.log('🔄 Loading messages for conversation:', convId);
    const {
      data: historyMessages,
      error
    } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', {
      ascending: true
    }).limit(10000);
    if (error) {
      console.error('❌ Failed to load conversation messages:', error);
      toast({
        title: "Failed to load chat history",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    if (historyMessages && historyMessages.length > 0) {
      console.log(`✅ Loaded ${historyMessages.length} messages for conversation ${convId}`);
      const parsedMessages = await Promise.all(historyMessages.filter((msg, index, array) => {
        try {
          const parsed = JSON.parse(msg.content);
          // Only filter out pure internal action payloads — NOT messages with readable text
          if ((parsed.action || parsed.design_type) && !parsed.message) {
            return false;
          }
          // If it has a message field, we'll extract the text below — keep it
        } catch {}

        // FIX #8: Deduplicate identical user messages (30 second window + content hash)
        if (msg.role === 'user') {
          const normalizedContent = msg.content.trim().toLowerCase();
          const firstIndex = array.findIndex(m => {
            if (m.role !== 'user') return false;
            const mNormalized = m.content.trim().toLowerCase();
            const timeDiff = Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime());
            // Match if same content within 30 seconds
            return mNormalized === normalizedContent && timeDiff < 30000;
          });
          return firstIndex === index;
        }
        return true;
      }).map(async msg => {
        const metadata = msg.metadata as any;
        let designIterations = metadata?.designIterations || metadata?.design_iterations;
        
        // Refresh expired signed URLs for design iterations
        if (designIterations && Array.isArray(designIterations)) {
          console.log('🔄 Refreshing signed URLs for', designIterations.length, 'iterations');
          designIterations = await Promise.all(designIterations.map(async (it: any) => {
            if (it.filePath) {
              const { data: urlData } = await supabase.storage
                .from('design-assets')
                .createSignedUrl(it.filePath, 86400);
              
              if (urlData?.signedUrl) {
                console.log('✅ Refreshed URL for iteration');
                return { ...it, url: urlData.signedUrl };
              }
            }
            return it;
          }));
        }
        
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
          designIterations,
          inspirations: metadata?.inspirations,
          inputFields: metadata?.inputFields || metadata?.input_fields,
          isThinking: metadata?.isThinking,
          videoStatus: metadata?.videoStatus || metadata?.video_status,
          videoUrl: metadata?.videoUrl || metadata?.video_url,
          options: metadata?.options,
          
          pendingApproval: metadata?.pending_approval,
          uploadedImages: metadata?.uploaded_images || metadata?.uploadedImages,
          selectedImageUrl: metadata?.selected_image_url || metadata?.selectedImageUrl,
          // Restore skill and asset data
          selectedSkill: metadata?.selected_skill,
          taggedAssets: metadata?.tagged_assets,
          // Restore analysis and plan data
          imageAnalysis: metadata?.image_analysis || metadata?.imageAnalysis,
          executionPlan: metadata?.execution_plan || metadata?.executionPlan,
          researchSources: metadata?.research_sources || metadata?.researchSources,
        };
      }));
      setMessages(parsedMessages);
      console.log(`✅ Set ${parsedMessages.length} parsed messages with refreshed URLs`);
    }
  }, []);
  const [fullViewImage, setFullViewImage] = useState<{
    url: string;
    index: number;
    iterations: any[];
  } | null>(null);
  const [brandSystem, setBrandSystem] = useState<any>(null);
  const [conversationContext, setConversationContext] = useState<{
    designType?: string;
    brandInfo?: {
      name?: string;
      industry?: string;
      audience?: string;
      location?: string;
    };
    styleKeywords?: string[] | string;
    visualDescriptors?: string[];
    lastDesignPrompt?: string;
    referenceImageUrl?: string;
    requestType?: string;
    autoGeneratePrompt?: {
      brandName: string;
      designType?: string;
      requestType?: string;
      isLogoOnly?: boolean;
      isBrandGuidelines?: boolean;
    };
  }>({});
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    step: string;
    brandName?: string;
  } | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState(10);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [showGenerationConfirmation, setShowGenerationConfirmation] = useState(false);
  const [pendingInspirationGeneration, setPendingInspirationGeneration] = useState<{
    inspirationUrl: string;
    designType: string;
    projectName: string;
    styleKeywords: string;
  } | null>(null);
  const [userCredits, setUserCredits] = useState({
    balance: 0,
    max_credits: 0
  });
  const [addedImagesCount, setAddedImagesCount] = useState(0);
  const [shownReferenceIds, setShownReferenceIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // PERFORMANCE: Cache session to eliminate redundant auth calls
  const sessionRef = useRef<Session | null>(null);

  // Keep session cached and updated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Deduplication tracking for messages with timestamps
  const recentlySavedMessages = useRef<Map<string, number>>(new Map());

  // Helper to create message hash for deduplication (uses content + time bucket)
  const getMessageHash = (content: string, role: string) => {
    return `${role}:${content}:${Math.floor(Date.now() / 5000)}`; // Allow same content if 5+ seconds apart
  };

  // FIX #8: Helper to check if message was recently saved (extended to 60 seconds)
  const wasRecentlySaved = (content: string, role: string) => {
    const hash = getMessageHash(content, role);
    const now = Date.now();

    // Check if saved within last 60 seconds (increased from 30)
    const lastSaveTime = recentlySavedMessages.current.get(hash);
    if (lastSaveTime && now - lastSaveTime < 60000) {
      console.log('⏭️ Skipping duplicate (saved', Math.round((now - lastSaveTime) / 1000), 'seconds ago)');
      return true;
    }

    // Record this save
    recentlySavedMessages.current.set(hash, now);

    // Clean up old entries (>60 seconds)
    for (const [key, time] of recentlySavedMessages.current.entries()) {
      if (now - time > 60000) {
        recentlySavedMessages.current.delete(key);
      }
    }
    return false;
  };

  // Universal helper: fire-and-forget save for ANY assistant message
  // CRITICAL FIX: Uses ref instead of closure to always read the latest conversationId
  const saveAssistantMsg = useCallback((content: string, metadata: Record<string, any> = {}) => {
    const convId = conversationIdRef.current;
    if (!convId || wasRecentlySaved(content, 'assistant')) {
      console.log('⏭️ saveAssistantMsg skipped: convId=', convId, 'content=', content?.substring(0, 40));
      return;
    }
    supabase.from('messages').insert({
      conversation_id: convId,
      user_id: userId,
      role: 'assistant',
      content,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    }).then(({ error }) => {
      if (error) console.error('❌ saveAssistantMsg failed:', error.message);
      else console.log('💾 saveAssistantMsg saved:', content.substring(0, 60));
    });
  }, [userId]); // No conversationId dependency - reads from ref

  const quickActions = ['Create a Logo', 'Create an Identity', 'Create a Campaign', 'Create an Illustration', 'Create a Concept'];

  // Quick action cards with colored icons for non-designer users
  const quickActionsWithPreviews = [
    { label: 'Create a Logo', icon: Sparkles, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { label: 'Create an Identity', icon: ImageIcon, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { label: 'Create a Campaign', icon: Megaphone, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { label: 'Create an Illustration', icon: PaletteIcon, color: 'text-pink-500', bgColor: 'bg-pink-50' },
    { label: 'Create a Concept', icon: Users, color: 'text-green-500', bgColor: 'bg-green-50' },
  ];

  // SMART DYNAMIC QUESTIONING: Generate context-aware questions based on what we know
  const generateSmartQuestions = useCallback((
    designType: string,
    context: typeof conversationContext,
    previousMessages: Message[]
  ): { label: string; placeholder: string; value: string }[] => {
    const questions: { label: string; placeholder: string; value: string }[] = [];
    
    // Extract what we already know
    const knownInfo = {
      brandName: context.brandInfo?.name || '',
      industry: context.brandInfo?.industry || '',
      audience: context.brandInfo?.audience || '',
      style: Array.isArray(context.styleKeywords) ? context.styleKeywords.join(' ') : (context.styleKeywords || ''),
      hasUploadedImages: previousMessages.some(m => m.uploadedImages?.length),
    };
    
    // Dynamic questions based on design type and known context
    switch (designType) {
      case 'logo':
        // Essential questions for logos
        if (!knownInfo.brandName) {
          questions.push({ label: 'Brand name', placeholder: 'e.g., Colab, Nike, Apple', value: '' });
        }
        if (!knownInfo.industry) {
          questions.push({ label: 'Industry or niche', placeholder: 'e.g., tech, fashion, healthcare, food', value: '' });
        }
        // Always ask for style and type
        questions.push({ label: 'Visual style', placeholder: 'e.g., minimal, bold, playful, luxury, geometric', value: knownInfo.style });
        questions.push({ label: 'Logo type preference', placeholder: 'wordmark / symbol / monogram / lettermark / combination', value: '' });
        // Contextual question based on having uploads
        if (!knownInfo.hasUploadedImages) {
          questions.push({ label: 'Symbols or imagery', placeholder: 'e.g., include a leaf, abstract shapes, avoid animals', value: '' });
        }
        break;

      case 'identity':
        questions.push({ label: 'Main headline or message', placeholder: 'e.g., Brand Strategy, 50% OFF, Product Launch', value: '' });
        questions.push({ label: 'Purpose or event', placeholder: 'e.g., awareness campaign, movie promotion, corporate identity', value: '' });
        if (!knownInfo.audience) {
          questions.push({ label: 'Target audience', placeholder: 'e.g., young adults, families, professionals', value: '' });
        }
        questions.push({ label: 'Visual style & mood', placeholder: 'e.g., bold & colorful, minimal, retro, futuristic, dramatic', value: knownInfo.style });
        break;

      case 'campaign':
        if (!knownInfo.brandName) {
          questions.push({ label: 'Brand or product name', placeholder: 'e.g., Nike, iPhone 16, Summer Collection', value: '' });
        }
        questions.push({ label: 'Campaign objective', placeholder: 'e.g., product launch, brand awareness, seasonal sale', value: '' });
        questions.push({ label: 'Key message or tagline', placeholder: 'e.g., Just Do It, Think Different, Sale ends Sunday', value: '' });
        if (!knownInfo.audience) {
          questions.push({ label: 'Target audience', placeholder: 'e.g., Gen Z, working professionals, parents', value: '' });
        }
        questions.push({ label: 'Visual approach', placeholder: 'e.g., lifestyle photography, illustrated, bold typography', value: knownInfo.style });
        break;

      case 'illustration':
        questions.push({ label: 'Subject or concept', placeholder: 'e.g., cozy coffee shop, astronaut on Mars, city skyline', value: '' });
        questions.push({ label: 'Art style', placeholder: 'e.g., flat vector, painterly, line art, 3D render, watercolor', value: '' });
        questions.push({ label: 'Mood & atmosphere', placeholder: 'e.g., warm & cozy, dramatic, playful, mysterious', value: '' });
        questions.push({ label: 'Purpose', placeholder: 'e.g., book cover, website hero, social media, editorial', value: '' });
        break;

      case 'concept':
        questions.push({ label: 'Concept idea', placeholder: 'e.g., friendly robot mascot, adventurous fox, wise owl mentor', value: '' });
        questions.push({ label: 'Personality traits', placeholder: 'e.g., brave, playful, wise, mischievous, friendly', value: '' });
        questions.push({ label: 'Art style', placeholder: 'e.g., 2D cartoon, 3D Pixar-style, anime, chibi, realistic', value: '' });
        questions.push({ label: 'Special features', placeholder: 'e.g., wears a cape, has wings, robot parts, magical staff', value: '' });
        break;

      default:
        questions.push({ label: 'What do you want to create?', placeholder: 'Describe your vision...', value: '' });
        questions.push({ label: 'Visual style', placeholder: 'e.g., modern, minimal, bold, retro', value: '' });
    }
    
    return questions.slice(0, 5); // Max 5 questions
  }, []);

  const fetchReferences = useCallback(async (designType: string, keywords: string) => {
    const { data: referenceData, error: refError } = await supabase.functions.invoke('reference-curator-agent', {
      body: {
        category: designType,
        keywords,
        exclude_ids: Array.from(shownReferenceIds),
        limit: 6,
      },
    });

    if (referenceData?.updated_exclude_ids) {
      setShownReferenceIds(new Set(referenceData.updated_exclude_ids));
    }

    if (refError) {
      console.error('❌ reference-curator-agent error:', refError);
      return [];
    }

    return (referenceData?.references || []).map((img: any) => ({
      url: img.image_url,
      title: img.title,
    }));
  }, [shownReferenceIds]);

  const buildReferenceKeywords = (designType: string, brandInfo?: any, styleKeywords?: string) => {
    const parts = [
      designType,
      brandInfo?.name,
      brandInfo?.industry,
      brandInfo?.audience,
      styleKeywords,
      'professional reference',
    ].filter(Boolean);
    return parts.join(' ');
  };
  useEffect(() => {
    // Create or load conversation for this specific project
    const initConversation = async () => {
      // First check if conversation exists for this project
      const {
        data: existingConv,
        error: fetchError
      } = await supabase.from('conversations').select('id').eq('user_id', userId).eq('project_id', projectId).order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existingConv && !fetchError) {
        setConversationId(existingConv.id);

        // Load existing messages for this conversation
        console.log('🔄 Loading chat history for conversation:', existingConv.id);
        const {
          data: historyMessages,
          error: loadError
        } = await supabase.from('messages').select('*').eq('conversation_id', existingConv.id).order('created_at', {
          ascending: true
        }).limit(10000);
        if (loadError) {
          console.error('❌ Failed to load chat history:', loadError);
          toast({
            title: "Failed to load chat history",
            description: loadError.message,
            variant: "destructive"
          });
        } else if (historyMessages && historyMessages.length > 0) {
          console.log('✅ Loaded', historyMessages.length, 'messages from history');
          const parsedMessages = await Promise.all(historyMessages.filter((msg, index, array) => {
            try {
              const parsed = JSON.parse(msg.content);
              // Only filter out pure internal action payloads — NOT messages with readable text
              if ((parsed.action || parsed.design_type) && !parsed.message) {
                console.log('⏭️ Skipping internal JSON message:', parsed.action || parsed.design_type);
                return false;
              }
            } catch {}
            
            // Deduplicate identical user messages (5 second window)
            if (msg.role === 'user') {
              const firstIndex = array.findIndex(m => 
                m.role === 'user' && 
                m.content === msg.content && 
                Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000
              );
              return firstIndex === index;
            }
            return true;
          }).map(async msg => {
            const metadata = msg.metadata as any;
            let designIterations = metadata?.design_iterations || metadata?.designIterations;
            
            // Refresh expired signed URLs for design iterations
            if (designIterations && Array.isArray(designIterations)) {
              console.log('🔄 Refreshing signed URLs for', designIterations.length, 'iterations');
              designIterations = await Promise.all(designIterations.map(async (it: any) => {
                if (it.filePath) {
                  const { data: urlData } = await supabase.storage
                    .from('design-assets')
                    .createSignedUrl(it.filePath, 86400);
                  
                  if (urlData?.signedUrl) {
                    console.log('✅ Refreshed URL for iteration');
                    return { ...it, url: urlData.signedUrl };
                  }
                }
                return it;
              }));
            }
            
            return {
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              options: metadata?.options,
              inputFields: metadata?.input_fields || metadata?.inputFields,
              
              inspirations: metadata?.inspirations,
              designIterations,
              pendingApproval: metadata?.pending_approval || metadata?.pendingApproval,
              uploadedImages: metadata?.uploaded_images || metadata?.uploadedImages || (metadata?.uploaded_image ? [metadata.uploaded_image] : undefined),
              selectedSkill: metadata?.selected_skill || metadata?.selectedSkill,
              taggedAssets: metadata?.tagged_assets || metadata?.taggedAssets
            };
            }));
          setMessages(parsedMessages);

          // PHASE 2: Reconstruct conversationContext from loaded messages
          const lastSkill = parsedMessages.filter(m => m.selectedSkill).pop()?.selectedSkill;
          
          // Find most recent context clues from skill
          let restoredDesignType: string | undefined;
          if (lastSkill) {
            const skill = RUMI_SKILLS.find(s => s.id === lastSkill.id);
            if (skill) restoredDesignType = skill.designType;
          }
          
          if (restoredDesignType) {
            setConversationContext(prev => ({
              ...prev,
              designType: restoredDesignType,
            }));
            console.log('✅ Reconstructed context from history:', { restoredDesignType });
          }
        } else {
          console.log('ℹ️ No chat history found for this conversation');
        }
      } else {
        // Create new conversation for this project with timestamped title
        const {
          data,
          error
        } = await supabase.from('conversations').insert({
          user_id: userId,
          project_id: projectId,
          title: `New ${new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}`
        }).select().single();
        if (!error && data) {
          setConversationId(data.id);
        }
      }
    };
    initConversation();
  }, [userId, projectId]);

  // Restore in-progress generation jobs on mount / conversation change
  const activeJobIdRef = useRef<string | null>(null);
  const failedJobsNotifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;

    const restoreActiveJob = async () => {
      const { data: activeJobs } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .eq('status', 'processing')
        .order('started_at', { ascending: false })
        .limit(1);

      if (cancelled || !activeJobs?.length) return;
      const job = activeJobs[0];
      activeJobIdRef.current = job.id;

      // Restore progress UI
      setIsGenerating(true);
      setGenerationStartTime(new Date(job.started_at).getTime());
      setGenerationProgress({
        current: job.completed_variations || 0,
        total: job.total_variations || 1,
        step: `Resuming... ${job.completed_variations || 0}/${job.total_variations || 1} designs`,
      });

      // If there are already completed results, show them
      const results = (job.results as any[]) || [];
      if (results.length > 0) {
        // Refresh signed URLs for results
        const refreshed = await Promise.all(results.map(async (r: any) => {
          if (r.filePath) {
            const { data: urlData } = await supabase.storage
              .from('design-assets')
              .createSignedUrl(r.filePath, 86400);
            if (urlData?.signedUrl) return { ...r, url: urlData.signedUrl };
          }
          return r;
        }));

        setMessages(prev => {
          const hasDesignMsg = prev.some(m => m.designIterations?.length);
          if (hasDesignMsg) return prev;
          return [...prev, {
            role: 'assistant' as const,
            content: `Generating designs... (${refreshed.length}/${job.total_variations})`,
            designIterations: refreshed,
          }];
        });
      }

      // Poll for updates every 5 seconds
      const pollInterval = setInterval(async () => {
        if (cancelled) { clearInterval(pollInterval); return; }
        const { data: updated } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', job.id)
          .single();

        if (!updated || cancelled) { clearInterval(pollInterval); return; }

        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollInterval);
          activeJobIdRef.current = null;
          setIsGenerating(false);
          setGenerationProgress(null);
          setGenerationStartTime(null);

          if (updated.status === 'completed') {
            const finalResults = (updated.results as any[]) || [];
            const refreshed = await Promise.all(finalResults.map(async (r: any) => {
              if (r.filePath) {
                const { data: urlData } = await supabase.storage
                  .from('design-assets')
                  .createSignedUrl(r.filePath, 86400);
                if (urlData?.signedUrl) return { ...r, url: urlData.signedUrl };
              }
              return r;
            }));

            setMessages(prev => {
              const idx = prev.findIndex(m => m.designIterations !== undefined);
              if (idx === -1) {
                return [...prev, {
                  role: 'assistant' as const,
                  content: `Here are your ${refreshed.length} designs:`,
                  designIterations: refreshed,
                }];
              }
              return prev.map((m, i) => i === idx ? {
                ...m,
                content: `Here are your ${refreshed.length} designs:`,
                designIterations: refreshed,
              } : m);
            });
          } else {
            if (!failedJobsNotifiedRef.current.has(job.id)) {
              failedJobsNotifiedRef.current.add(job.id);
              const partialCount = ((updated.results as any[]) || []).length;
              if (partialCount > 0) {
                toast({ title: 'Some designs ready', description: `${partialCount} succeeded. Tap a design to use it.` });
              } else {
                toast({ title: 'Generation failed', description: updated.error || 'Please try again.', variant: 'destructive' });
              }
            }
          }
          return;
        }

        // Still processing — update progress
        const updatedResults = (updated.results as any[]) || [];
        setGenerationProgress({
          current: updated.completed_variations || 0,
          total: updated.total_variations || 1,
          step: `Generating ${updated.completed_variations || 0}/${updated.total_variations || 1} designs...`,
        });

        if (updatedResults.length > 0) {
          const refreshed = await Promise.all(updatedResults.map(async (r: any) => {
            if (r.filePath) {
              const { data: urlData } = await supabase.storage
                .from('design-assets')
                .createSignedUrl(r.filePath, 86400);
              if (urlData?.signedUrl) return { ...r, url: urlData.signedUrl };
            }
            return r;
          }));

          setMessages(prev => {
            const idx = prev.findIndex(m => m.designIterations !== undefined && !m.pendingApproval);
            if (idx === -1) return prev;
            return prev.map((m, i) => i === idx ? {
              ...m,
              content: `Generating designs... (${refreshed.length}/${updated.total_variations})`,
              designIterations: refreshed,
            } : m);
          });
        }
      }, 5000);

      return () => clearInterval(pollInterval);
    };

    restoreActiveJob();
    return () => { cancelled = true; };
  }, [conversationId, userId]);

  // REMOVED: Double-loading useEffect that raced with initConversation
  // History panel switches now call loadConversationMessages directly via onConversationSelect

  // Load saved prompt if passed via routing or landing page
  useEffect(() => {
    // 1. Check for text prompt (from Cogent landing)
    const savedPrompt = localStorage.getItem('thinkPrompt');
    if (savedPrompt) {
      localStorage.removeItem('thinkPrompt');
      handleSend(savedPrompt);
    }
    
    // 2. Check for uploaded image (from TrueVision landing)
    const trueVisionImage = localStorage.getItem('trueVisionImage');
    if (trueVisionImage) {
      localStorage.removeItem('trueVisionImage');
      
      const trueVisionMode = localStorage.getItem('trueVisionMode') || 'critique';
      const trueVisionSpec = localStorage.getItem('trueVisionSpec');
      
      localStorage.removeItem('trueVisionMode');
      localStorage.removeItem('trueVisionSpec');

      // Convert base64 to File object to reuse handleSend seamlessly
      fetch(trueVisionImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "truevision_upload.png", { type: blob.type || "image/png" });
          
          let initialMessage = "Please analyze this design and tell me if it's correct or what needs enhancement.";
          if (trueVisionMode === 'comparison' && trueVisionSpec) {
            initialMessage = `Please compare this design against the following specifications from my Excel sheet:\n\n${trueVisionSpec}\n\nList all mismatches, incorrect details, or deviations. Be specific about what is wrong and explain how to fix it.`;
          }
          
          handleSend(initialMessage, [file]);
        })
        .catch(err => console.error("Error processing TrueVision image:", err));
    }
  }, []);

  // Check for initial prompt from Dashboard
  useEffect(() => {
    const initialPrompt = localStorage.getItem('initialPrompt');
    if (initialPrompt) {
      localStorage.removeItem('initialPrompt');
      // Send the initial prompt after a short delay to allow conversation to initialize
      setTimeout(() => {
        handleSend(initialPrompt);
      }, 500);
    }
  }, []);

  // Fetch user credits
  useEffect(() => {
    const fetchCredits = async () => {
      const {
        data,
        error
      } = await supabase.from('credits').select('balance, subscription_tier').eq('user_id', userId).single();
      if (!error && data) {
        setUserCredits({
          balance: data.balance,
          max_credits: data.subscription_tier === 'free' ? 100 : 1000000
        });
      }
    };
    fetchCredits();
  }, [userId]);
  useEffect(() => {
    if (scrollRef.current) {
      // Smooth scroll to bottom
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Force scroll on new message
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Keyboard navigation for expanded image view
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!fullViewImage) return;
      if (e.key === 'ArrowLeft' && fullViewImage.index > 0) {
        e.preventDefault();
        const newIndex = fullViewImage.index - 1;
        setFullViewImage({
          url: fullViewImage.iterations[newIndex].url,
          index: newIndex,
          iterations: fullViewImage.iterations
        });
      } else if (e.key === 'ArrowRight' && fullViewImage.index < fullViewImage.iterations.length - 1) {
        e.preventDefault();
        const newIndex = fullViewImage.index + 1;
        setFullViewImage({
          url: fullViewImage.iterations[newIndex].url,
          index: newIndex,
          iterations: fullViewImage.iterations
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFullViewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [fullViewImage]);

  // Handle skill selection - sets chip in ChatInput (no message added)
  const handleSkillSelect = useCallback((skill: Skill) => {
    setActiveSkill(skill);
    setIsSkillMode(true);
    setSkillStepIndex(0);
    setSkillFieldValues({});
    
    // Update conversation context with skill info
    // Note: NO message is added here - the chip appears in ChatInput instead
    setConversationContext(prev => ({
      ...prev,
      designType: skill.designType,
      requestType: skill.requestType,
      isSkillMode: true,
      activeSkillId: skill.id
    }));
  }, []);

  // Handle skill removal - clears the skill chip
  const handleSkillRemove = useCallback(() => {
    setActiveSkill(null);
    setIsSkillMode(false);
    setSkillStepIndex(0);
    setSkillFieldValues({});
    setConversationContext(prev => ({
      ...prev,
      isSkillMode: false,
      activeSkillId: undefined
    }));
  }, []);

  // Helper function to detect variation requests
  const isVariationRequest = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();

    // CRITICAL FIX: If text contains detailed modifications, it's NOT a simple variation request
    const hasDetailedModifications = lowerText.includes('older') || lowerText.includes('younger') || lowerText.includes('add ') || lowerText.includes('remove ') || lowerText.includes('change ') || lowerText.includes('make it ') || lowerText.includes('specs') || lowerText.includes('glasses') || lowerText.includes('hair') || lowerText.includes('color') || lowerText.includes('bigger') || lowerText.includes('smaller') || lowerText.length > 30; // Detailed prompts are usually longer

    if (hasDetailedModifications) {
      console.log('🔧 Detected detailed modification request, routing to AI');
      return false; // Let AI handle detailed modifications
    }

    // Direct match phrases (highest priority) - ONLY for generic requests
    const directMatches = ['more', 'another', 'different', 'again', 'continue', 'keep going', 'next', 'more options', 'other options', 'something else', 'new ones', 'variation', 'try again'];

    // STRICT matching: must be ONLY these phrases, not part of longer text
    const isExactMatch = directMatches.some(phrase => {
      // Match if text is exactly the phrase or starts with it followed by space/punctuation
      return lowerText === phrase || lowerText.startsWith(phrase + ' ') || lowerText.startsWith(phrase + ',');
    });
    return isExactMatch || lowerText.length < 10 && lowerText.includes('more');
  };
  const handleSend = async (messageText: string, files?: File[], taggedAssets?: Array<{ id: string; name: string; thumbnailUrl: string; imageUrl?: string }>, selectedSkillData?: SelectedSkillData) => {
    if (!messageText.trim() && !files?.length) return;
    if (isLoading) return;

    // FIX: Capture FULL skill data (including designType, requiredFields) BEFORE clearing
    let capturedSkillData = activeSkill ? { ...activeSkill } : selectedSkillData || null;
    if (capturedSkillData) {
      // Enrich with full skill config from RUMI_SKILLS
      const fullSkill = RUMI_SKILLS.find(s => s.id === capturedSkillData!.id);
      if (fullSkill) {
        capturedSkillData = {
          ...capturedSkillData,
          designType: fullSkill.designType,
          requestType: fullSkill.requestType,
          iterationCount: fullSkill.iterationCount,
          requiredFields: fullSkill.requiredFields,
        } as any;
      }
    }
    // Persist skill context into conversationContext so it survives across messages
    if (capturedSkillData) {
      const skillDesignType = (capturedSkillData as any).designType;
      const skillRequestType = (capturedSkillData as any).requestType;
      if (skillDesignType) {
        setConversationContext(prev => ({
          ...prev,
          designType: skillDesignType,
          requestType: skillRequestType || prev.requestType,
          activeSkillName: (capturedSkillData as any).name,
        }));
      }
    }
    if (activeSkill) {
      handleSkillRemove();
    }

    // Handle video generation separately
    if (selectedModel === 'azure/sora') {
      await handleVideoGeneration(messageText, files);
      return;
    }

    // COMPREHENSIVE PROMPT DETECTION - Skip questions if prompt is detailed enough
    if (!isSkillMode && !conversationContext.designType && !files?.length) {
      const analysis = analyzePromptCompleteness(messageText);
      
      if (analysis.isComplete && analysis.designType) {
        console.log('[RUMI] Comprehensive prompt detected, skipping questions:', analysis);
        
        // Set context from extracted fields
        setConversationContext(prev => ({
          ...prev,
          designType: analysis.designType,
          brandInfo: {
            name: analysis.extractedFields.brandName,
            industry: analysis.extractedFields.industry,
          },
          styleKeywords: analysis.extractedFields.styleKeywords?.split(', ') || [],
          skipQuestions: true
        }));
        
        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: messageText }]);
        
        // Show execution-style message and start generation
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Got it! I have all the info I need. Generating ${analysis.designType} designs for ${analysis.extractedFields.brandName || 'your project'}...`,
          isThinking: true
        }]);
        
        setIsLoading(true);
        
        try {
          // Trigger immediate generation
          const prompt = `Professional ${analysis.designType} design for ${analysis.extractedFields.brandName || 'brand'}${analysis.extractedFields.industry ? `, ${analysis.extractedFields.industry} industry` : ''}. Style: ${analysis.extractedFields.styleKeywords || 'modern professional'}`;
          
          const iterations = await generateIterations(prompt, 5, undefined, false, {
            brandName: analysis.extractedFields.brandName,
            industry: analysis.extractedFields.industry,
            designType: analysis.designType
          });
          
          // Remove thinking message and show results
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            if (iterations.length > 0) {
              return [...filtered, {
                role: 'assistant',
                content: `I've created ${iterations.length} ${formatDesignTypeDisplay(analysis.designType)} designs. Select your favorites!`,
                designIterations: iterations,
                pendingApproval: true
              }];
            }
            return [...filtered, {
              role: 'assistant',
              content: 'Design generation encountered an issue. Please try again.'
            }];
          });
          
          // Save to database
          if (conversationIdRef.current && iterations.length > 0) {
            await supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: `I've created ${iterations.length} ${formatDesignTypeDisplay(analysis.designType)} designs. Select your favorites!`,
              metadata: {
                design_iterations: iterations,
                design_type: analysis.designType,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (error) {
          console.error('Comprehensive prompt generation failed:', error);
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant',
              content: 'Something went wrong during generation. Please try again.'
            }];
          });
        } finally {
          setIsLoading(false);
        }
        
        return;
      }
    }

    // Process uploaded files FIRST
    let uploadedImageUrl: string | undefined;
    if (files && files.length > 0) {
      console.log('📤 Uploading file:', files[0].name);
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('design-assets').upload(filePath, file);
      if (!uploadError) {
        const {
          data: urlData,
          error: urlError
        } = await supabase.storage.from('design-assets').createSignedUrl(filePath, 3600);
        if (urlError || !urlData?.signedUrl) {
          console.error('Failed to generate signed URL:', urlError);
          toast({
            title: 'Upload failed',
            description: 'Failed to generate access URL',
            variant: 'destructive'
          });
          return;
        }
        uploadedImageUrl = urlData.signedUrl;
        console.log('✅ File uploaded with signed URL');
        
        // Auto-add to canvas if it's a TrueVision flow
        const isTrueVisionInitialMessage = messageText === "Please analyze this design and tell me if it's correct or what needs enhancement." || 
                                           messageText.includes("Please compare this design against the following specifications");
                                           
        if (canvasInstance && isTrueVisionInitialMessage) {
          // Import fabric dynamically just in case, or use existing methods
          // ChatInterface receives onDesignGenerated which handles putting things on canvas!
          try {
             // We can just call onDesignGenerated as if it was a generated design to put it on canvas
             onDesignGenerated(uploadedImageUrl, "Uploaded Image", 0, 0, crypto.randomUUID(), false, true, 0, filePath);
          } catch (e) {
             console.error("Failed to add uploaded image to canvas", e);
          }
        }
      } else {
        console.error('Upload failed:', uploadError);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload image. Please try again.',
          variant: 'destructive'
        });
      }
    }

    // Update context with uploaded image or selected artboard image
    const currentContext = {
      ...conversationContext,
      referenceImageUrl: uploadedImageUrl || selectedArtboardImage || conversationContext.referenceImageUrl,
      hasUploadedImage: !!(uploadedImageUrl || selectedArtboardImage)
    };
    console.log('📤 User message details:', {
      hasText: !!messageText,
      textLength: messageText?.length,
      isJSON: messageText?.startsWith('{'),
      conversationId,
      willCallAI: true
    });
    const userMessage: Message = {
      role: 'user',
      content: messageText || 'Create something based on this image',
      uploadedImages: uploadedImageUrl ? [uploadedImageUrl] : undefined,
      taggedAssets: taggedAssets?.map(a => ({
        id: a.id,
        name: a.name,
        thumbnailUrl: a.thumbnailUrl,
        imageUrl: a.imageUrl
      })),
      selectedSkill: selectedSkillData
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to database
    // FIX: Acquire lock IMMEDIATELY before any checks
    if (isSavingRef.current) {
      console.log('⚠️ Already saving message, blocking duplicate');
      return;
    }
    isSavingRef.current = true;
    if (conversationIdRef.current) {
      // Don't save if content is JSON
      const contentToSave = messageText || 'Create something based on this image';
      
      // PERFORMANCE FIX: Fire-and-forget database save (non-blocking)
      // Skip internal JSON messages and duplicates synchronously, but save in background
      if (contentToSave.startsWith('{')) {
        console.log('⏭️ Skipping save of internal JSON message');
        isSavingRef.current = false;
      } else if (wasRecentlySaved(contentToSave, 'user')) {
        console.log('⏭️ Skipping duplicate user message save');
        isSavingRef.current = false;
      } else {
        // Non-blocking background save - don't await!
        (async () => {
          try {
            // Database-level duplicate check
            const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
            const { data: recentMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conversationIdRef.current)
              .eq('role', 'user')
              .eq('content', contentToSave)
              .gte('created_at', fiveSecondsAgo)
              .limit(1);
            
            if (recentMessages && recentMessages.length > 0) {
              console.log('⚠️ Duplicate message detected in database, skipping save');
              return;
            }
            
            console.log('💾 Background save: user message');
            const { error: saveError } = await supabase.from('messages').insert({
              conversation_id: conversationIdRef.current!,
              user_id: userId,
              role: 'user',
              content: contentToSave,
              metadata: {
                uploaded_image: uploadedImageUrl,
                selected_artboard: selectedArtboardImage,
                timestamp: new Date().toISOString(),
                selected_skill: selectedSkillData ? {
                  id: selectedSkillData.id,
                  name: selectedSkillData.name,
                  iconName: selectedSkillData.iconName,
                  color: selectedSkillData.color
                } : undefined,
                tagged_assets: taggedAssets?.map(a => ({
                  id: a.id,
                  name: a.name,
                  thumbnailUrl: a.thumbnailUrl,
                  imageUrl: a.imageUrl
                }))
              }
            });
            
            if (saveError) {
              console.error('❌ Background save failed:', saveError.message);
              // Retry once after 2s
              setTimeout(async () => {
                const { error: retryErr } = await supabase.from('messages').insert({
                  conversation_id: conversationIdRef.current!,
                  user_id: userId,
                  role: 'user',
                  content: contentToSave,
                  metadata: { timestamp: new Date().toISOString() }
                });
                if (retryErr) console.error('❌ Retry save also failed:', retryErr.message);
                else console.log('✅ User message saved on retry');
              }, 2000);
            } else {
              console.log('✅ User message saved (background)');
            }
          } catch (err) {
            console.error('❌ Background save error:', err);
          } finally {
            isSavingRef.current = false;
          }
        })();
      }
      
      // Lock released in finally block of background save
    } else {
      isSavingRef.current = false;
    }

    // Smart variation detection - handle directly without AI if context exists
    if (isVariationRequest(messageText) && conversationContext.designType && conversationContext.brandInfo) {
      console.log('🔄 Detected variation request with existing context');

      // CRITICAL: Remove ALL thinking messages before starting
      setMessages(prev => prev.filter(m => !m.isThinking));
      const styleKeywordsArray = Array.isArray(conversationContext.styleKeywords) ? conversationContext.styleKeywords : conversationContext.styleKeywords ? conversationContext.styleKeywords.split(' ').filter(Boolean) : [];

      // FIX: Parse user's modification request
      const userModifications = messageText.toLowerCase().includes('older') ? 'older' : messageText.toLowerCase().includes('younger') ? 'younger' : messageText.toLowerCase().includes('different style') ? 'completely different style' : messageText.toLowerCase().includes('similar') ? 'similar style' : '';

      // FIX: Build prompt that includes user's actual request
      const basePrompt = `${conversationContext.brandInfo.name || 'character'} ${conversationContext.designType} design ${styleKeywordsArray.join(' ')} ${messageText}`.trim();

      // FIX: Only use reference image if user wants to keep the style
      const shouldUseReference = messageText.toLowerCase().includes('similar') || messageText.toLowerCase().includes('like this') || messageText.toLowerCase().includes('same style');
      console.log('🎨 Generating with:', {
        basePrompt: basePrompt.substring(0, 100),
        useReference: shouldUseReference,
        userMessage: messageText.substring(0, 50)
      });

      // FIX 2: Remove existing thinking messages BEFORE adding new one
      // Fix 5: Ensure consistent thinking message cleanup
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: '✨ Generating more variations...',
          isThinking: true
        }];
      });
      setIsLoading(true);
      try {
        const iterations = await generateIterations(basePrompt, 5, shouldUseReference ? conversationContext.referenceImageUrl : undefined);
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isThinking);

          // CRITICAL FIX: Hash-based deduplication to prevent ANY duplicate messages
          const messageHash = JSON.stringify({
            iterations: iterations.map(i => i.url).sort().join('|'),
            count: iterations.length
          });
          const alreadyExists = filtered.some(m => {
            if (!m.designIterations || m.designIterations.length === 0) return false;
            const existingHash = JSON.stringify({
              iterations: m.designIterations.map(i => i.url).sort().join('|'),
              count: m.designIterations.length
            });
            return existingHash === messageHash;
          });
          if (alreadyExists) {
            console.log('⏭️ Iterations already in UI (hash match), skipping duplicate');
            setIsLoading(false);
            return filtered;
          }
          setIsLoading(false);
          return [...filtered, {
            role: 'assistant',
            content: `I've created ${iterations.length} more ${conversationContext.designType} variations. Select your favorites!`,
            designIterations: iterations,
            pendingApproval: true
          }];
        });

        // CRITICAL: Save iterations to database with deduplication
        if (conversationIdRef.current && iterations.length > 0 && !wasRecentlySaved(JSON.stringify(iterations.map(i => i.url)), 'assistant')) {
          console.log('💾 Saving design iterations to database:', iterations.length);

          // CRITICAL FIX: Save only URLs, never base64 images
          const urlOnlyIterations = iterations.map(iter => ({
            url: iter.url,
            prompt: iter.prompt,
            // Remove any base64 data if present
            ...(iter.filePath ? {
              filePath: iter.filePath
            } : {})
          }));
          await supabase.from('messages').insert({
            conversation_id: conversationIdRef.current!,
            user_id: userId,
            role: 'assistant',
            content: `I've created ${iterations.length} more ${conversationContext.designType} variations. Select your favorites!`,
            metadata: {
              design_iterations: urlOnlyIterations,
              design_type: conversationContext.designType,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Add follow-up options after a brief delay
        setTimeout(() => {
          const followUpContent = '💬 **Want to explore more?**';
          const followUpOptions = ['Generate more variations', 'Try a completely different style', 'Edit one of these designs', 'I\'m satisfied with these!'];
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: followUpContent,
            options: followUpOptions
          }]);
          saveAssistantMsg(followUpContent, { options: followUpOptions });
        }, 1000);
      } catch (error) {
        console.error('Error generating variations:', error);
        toast({
          title: 'Generation Failed',
          description: 'Failed to generate variations. Please try again.',
          variant: 'destructive'
        });
        setMessages(prev => prev.filter(m => !m.isThinking));
        setIsLoading(false); // Ensure loading cleared on error
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    setThinkingContext('general'); // Reset to general for new messages
    setMessages(prev => prev.filter(m => !m.isThinking));

    // Add thinking message with auto-remove timeout
    const thinkingMessageId = Date.now();
    setMessages(prev => [...prev, {
      role: 'assistant' as const,
      content: '',
      isThinking: true,
      id: thinkingMessageId
    }]);

    // Safety timer: Force remove thinking after 60 seconds
    const thinkingTimeout = setTimeout(() => {
      setMessages(prev => prev.filter(m => !m.isThinking));
      toast({
        title: '⏱️ Request Timeout',
        description: 'AI is taking too long to respond. Please try again with a simpler request.',
        variant: 'destructive'
      });
      setIsLoading(false);
    }, 60000);

    // NOTE: Removed 90-second blanket failsafe — it killed `isLoading` /
    // `isGenerating` while real generations were still in flight (each
    // variation can legitimately take up to 120s). The per-variation timeout
    // and the longer `failsafeMs` inside `generateIterations` already cover
    // the stuck-state case, without false-failing successful designs.
    const failsafeTimeout = setTimeout(() => {
      // Only sweep dangling thinking placeholders — never reset generation flags here.
      setMessages(prev => prev.filter(m => !m.isThinking || m.designIterations !== undefined));
    }, 180000);

    // Set timeout for request (120 seconds — complex prompts need more time)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    // Show "still working" message at 45s so user knows it hasn't frozen
    const stillWorkingId = setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.isThinking ? { ...m, content: '⏳ Still analyzing your brief — complex prompts take a moment...' } : m
      ));
    }, 45000);
    try {
      // PERFORMANCE: Use cached session instead of fetching each time
      const session = sessionRef.current;
      if (!session) {
        // Try to fetch session as fallback
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (!freshSession) {
          throw new Error('Not authenticated');
        }
        sessionRef.current = freshSession;
      }
      const currentSession = sessionRef.current!;

      // Build context-aware messages
      const contextualMessages = [...messages, userMessage];

      // PERFORMANCE: Start web search in background (non-blocking)
      let webResearchData: { summary?: string; results?: any[] } | null = null;
      let enhancedPromptWithWeb = messageText;
      let webResearchPromise: Promise<any> | null = null;
      
      if (webSearchEnabled && messageText.trim().length > 10) {
        console.log('🌐 Starting web search in background (non-blocking)...');
        // Start promise but don't await - let AI call proceed immediately
        webResearchPromise = supabase.functions.invoke('web-research', {
          body: { 
            query: messageText,
            research_type: 'design_inspiration'
          }
        }).catch(err => {
          console.warn('Web research failed:', err);
          return { data: null };
        });
      }

      // PHASE 4: Build context for AI with brand system data
      // Helper to extract recent generation history for AI memory
      const getRecentGenerations = (): any[] => {
        return messages
          .filter(m => m.designIterations?.length > 0)
          .slice(-3)
          .flatMap(m => m.designIterations?.map((iter, idx) => ({
            batchIndex: idx + 1,
            prompt: iter.prompt?.substring(0, 200),
            designType: m.designType || 'design'
          })) || []);
      };

      const contextForAI = {
        ...currentContext,
        brand_system: brandSystem,
        brandInfo: currentContext.brandInfo,
        designType: currentContext.designType,
        requestType: currentContext.requestType,
        lastDesignPrompt: currentContext.lastDesignPrompt,
        styleKeywords: Array.isArray(currentContext.styleKeywords) ? currentContext.styleKeywords : currentContext.styleKeywords ? currentContext.styleKeywords.split(' ').filter(Boolean) : [],
        uploadedImageUrl: uploadedImageUrl || selectedArtboardImage,
        hasUploadedImage: !!(uploadedImageUrl || selectedArtboardImage || taggedAssets?.length),
        taggedAssetImageUrls: taggedAssets?.map(a => a.imageUrl || a.thumbnailUrl).filter(Boolean) || [],
        webResearchContext: webResearchData?.summary || null,
        hasWebResearch: !!webResearchData,
        recentGenerations: getRecentGenerations(),
        hasGeneratedDesigns: messages.some(m => m.designIterations?.length > 0)
      };
      console.log('📤 Sending to AI:', {
        messageCount: contextualMessages.length,
        lastUserMessage: userMessage.content.substring(0, 100),
        hasUploadedImage: !!uploadedImageUrl,
        context: contextForAI,
        hasSelectedArtboard: !!selectedArtboardImage,
        contextReferenceImage: !!conversationContext.referenceImageUrl,
        fullContext: contextForAI,
        contextKeys: Object.keys(contextForAI)
      });

      // CRITICAL FIX: ADD thinking message, don't remove it
      setIsLoading(true);
      // Fix 5: Filter thinking messages before adding
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: '',
          isThinking: true
        }];
      });
      console.log('🔄 Calling AI chat endpoint...');
      const apiBase = import.meta.env.VITE_LOCAL_SERVER_URL || import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${apiBase}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          messages: contextualMessages,
          conversationId,
          projectId,
          model: thinkModeEnabled ? 'google/gemini-3-pro-image-preview' : selectedModel,
          thinkMode: thinkModeEnabled,
          aspectRatio: selectedFormat || '1:1',
          context: {
            ...contextForAI,
            // ALWAYS include full conversation context
            ...conversationContext,
            designType: conversationContext.designType,
            brandInfo: conversationContext.brandInfo,
            requestType: conversationContext.requestType,
            styleKeywords: conversationContext.styleKeywords,
            lastDesignPrompt: conversationContext.lastDesignPrompt,
            referenceImageUrl: conversationContext.referenceImageUrl,
            // Pass tagged canvas assets so AI can see them
            taggedAssets: userMessage.taggedAssets?.map((asset: TaggedAsset) => ({
              id: asset.id,
              name: asset.name,
              imageUrl: asset.imageUrl || asset.thumbnailUrl,
            })) || [],
            // Pass selected artboard image if available
            selectedArtboardImage: selectedArtboardImage || undefined,
            // Pass FULL captured skill data so AI knows which skill workflow to follow
            selectedSkill: capturedSkillData ? {
              id: capturedSkillData.id,
              name: capturedSkillData.name,
              description: (capturedSkillData as any).description || '',
              designType: (capturedSkillData as any).designType || '',
              requestType: (capturedSkillData as any).requestType || '',
              iterationCount: (capturedSkillData as any).iterationCount || 5,
            } : undefined
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      clearTimeout(stillWorkingId);

      // PERFORMANCE: Now await web research with 5s max wait (race condition)
      if (webResearchPromise) {
        try {
          const webResult = await Promise.race([
            webResearchPromise,
            new Promise(resolve => setTimeout(() => resolve({ data: null }), 5000))
          ]) as any;
          
          if (webResult?.data?.summary) {
            webResearchData = webResult.data;
            console.log('[RUMI] Web research completed with', webResult.data.results?.length || 0, 'sources');
          }
        } catch (err) {
          console.warn('Web research timeout/error:', err);
        }
      }

      console.log('✅ AI response received:', {
        status: response.status,
        ok: response.ok
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      let data = await response.json();
      console.log('🔍 AI RESPONSE DEBUG:', {
        status: response.status,
        ok: response.ok,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        dataPreview: JSON.stringify(data).substring(0, 200),
        hasMessage: !!data?.message,
        hasAction: !!data?.action,
        rawData: data
      });
      console.log('✅ AI data parsed:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasMessage: !!data.message,
        hasAction: !!data.action
      });

      // Check if backend returned natural conversation (has message field)
      if (data.message && !data.action) {
        console.log('💬 Natural conversation response detected');
        clearTimeout(thinkingTimeout);
        // FIX 5: Clear ALL thinking messages to prevent duplicates
        setMessages(prev => prev.filter(m => !m.isThinking));

        // ── IMAGE GENERATED: Place on canvas ──────────────────────────────────
        if (data.designGenerated && data.imageUrl) {
          console.log('🖼️ Design generated! Placing image on canvas...', data.imageUrl.substring(0, 60));
          try {
            await onDesignGenerated(data.imageUrl, 'AI Generated Design', 0, 0, crypto.randomUUID(), false, true, 0);
            console.log('✅ Image placed on canvas successfully');
          } catch (e) {
            console.error('❌ Failed to place image on canvas:', e);
          }
        }

        // CRITICAL FIX: Extract plain text from JSON wrapper
        let messageContent = data.message;
        if (typeof data.message === 'string') {
          try {
            const trimmed = data.message.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === 'object') {
                // Extract from any common text field
                const textField = parsed.content || parsed.message || parsed.text ||
                  parsed.analysis || parsed.response || parsed.output || parsed.reply || parsed.result;
                if (textField && typeof textField === 'string') {
                  messageContent = textField.trim();
                } else {
                  // Fallback: strip type/action/briefData keys, use first long string value
                  const { type, action: _a, briefData, ...rest } = parsed;
                  const mainVal = Object.values(rest).find((v: any) => typeof v === 'string' && v.length > 20) as string | undefined;
                  if (mainVal) messageContent = mainVal.trim();
                }
              }
            } else {
              // Strip orphaned JSON block appended after the text
              const jsonStart = trimmed.search(/\n?\s*\{[\s\S]*"type"[\s\S]*\}[\s]*$/);
              if (jsonStart > 0) messageContent = trimmed.slice(0, jsonStart).trim();
            }
          } catch {
            // Not JSON — use as-is
          }
        }

        // Save natural conversation to database
        if (conversationIdRef.current && !wasRecentlySaved(messageContent, 'assistant')) {
          console.log('💾 Saving natural conversation to database:', {
            contentPreview: messageContent.substring(0, 50),
            hasOptions: !!data.options,
            conversationId
          });

          // Save assistant message to database
          if (conversationIdRef.current) {
            supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: messageContent,
              metadata: {
                options: data.options || [],
                research_sources: webResearchData?.results?.map((r: any) => ({
                  title: r.title,
                  url: r.link,
                })) || [],
                timestamp: new Date().toISOString()
              }
            }).then(({ error }) => {
              if (error) console.error('❌ Failed to save assistant message:', error);
              else console.log('✅ Assistant message saved to database');
            });
          }
        }
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isThinking);
          return [...filtered, {
            role: 'assistant',
            content: messageContent,
            options: data.options,
            // Include web research sources if available
            researchSources: webResearchData?.results?.map((r: any) => ({
              title: r.title,
              url: r.link,
              description: r.snippet,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.link).hostname}`
            }))
          }];
        });
        setIsLoading(false);
        return;
      }

      // If data has an action, it's a JSON action from backend
      if (!data.action) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid AI response: no action or message found');
      }
      console.log('✅ JSON action detected:', data.action);

      // CATCH-ALL: Map unknown actions — ONLY auto-generate if AI explicitly said auto_generate: true
      const KNOWN_ACTIONS = ['image_question', 'web_research',
        'comprehensive_generate', 'generate_iterations', 'generate_design',
        'generate_logo_variations'];
      
      if (data.action && !KNOWN_ACTIONS.includes(data.action)) {
        if (data.auto_generate === true && (data.design_type || data.brand_info)) {
          // AI explicitly wants to generate
          console.log('🔄 Frontend mapping unknown action to comprehensive_generate (auto_generate=true):', data.action);
          data.action = 'comprehensive_generate';
        } else if (data.message) {
          // AI sent a message with unknown action - show the message conversationally
          console.log('💬 Frontend: unknown action with message, showing conversationally:', data.action);
          clearTimeout(thinkingTimeout);
          const unknownActionMsg = data.message;
          setMessages(prev => [...prev.filter(m => !m.isThinking), {
            role: 'assistant',
            content: unknownActionMsg,
            options: data.options || []
          }]);
          if (conversationIdRef.current) {
            supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: unknownActionMsg,
              metadata: { options: data.options || [], timestamp: new Date().toISOString() }
            }).then(({ error }) => {
              if (error) console.error('❌ Failed to save assistant message:', error);
              else console.log('✅ Assistant message saved (unknown action)');
            });
          }
          setIsLoading(false);
          return;
        } else if (!data.design_type && !data.brand_info) {
          // No design context at all - show design type picker
          clearTimeout(thinkingTimeout);
          const pickerMsg = data.message || "What type of design would you like to create?";
          const pickerOptions = ["Logo Design", "Social Media Post", "Amazon Listing", "Identity", "Campaign", "Concept", "Illustration"];
          setMessages(prev => [...prev.filter(m => !m.isThinking), {
            role: 'assistant',
            content: pickerMsg,
            options: pickerOptions
          }]);
          if (conversationIdRef.current) {
            supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: pickerMsg,
              metadata: { options: pickerOptions, timestamp: new Date().toISOString() }
            }).then(({ error }) => {
              if (error) console.error('❌ Failed to save assistant message:', error);
              else console.log('✅ Assistant message saved (design picker)');
            });
          }
          setIsLoading(false);
          return;
        } else {
          // Has design context but no auto_generate - ask for more info
          console.log('💬 Frontend: design context exists but no auto_generate, showing message');
          clearTimeout(thinkingTimeout);
          const contextMsg = data.message || `I can help with ${data.design_type} design. Tell me more about the brand or product!`;
          const contextOptions = data.options || ["Provide brand details", "Upload a reference image", "Go ahead and generate"];
          setMessages(prev => [...prev.filter(m => !m.isThinking), {
            role: 'assistant',
            content: contextMsg,
            options: contextOptions
          }]);
          if (conversationIdRef.current) {
            supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: contextMsg,
              metadata: { options: contextOptions, timestamp: new Date().toISOString() }
            }).then(({ error }) => {
              if (error) console.error('❌ Failed to save assistant message:', error);
              else console.log('✅ Assistant message saved (design context)');
            });
          }
          setIsLoading(false);
          return;
        }
      }

      // If JSON, continue with existing action handling...
      
      
      // Handle image upload question action
      if (data.action === 'image_question') {
        // If skill is active, use image as reference and go to generation
        if ((capturedSkillData && 'designType' in capturedSkillData) || conversationContext.designType) {
          const dt = conversationContext.designType || (capturedSkillData && 'designType' in capturedSkillData ? (capturedSkillData as any).designType : undefined);
          console.log('🔄 Skill-aware image handler: routing to comprehensive_generate with type:', dt);
          data.action = 'comprehensive_generate';
          data.design_type = dt;
          data.brand_info = conversationContext.brandInfo || { name: '' };
          data.auto_generate = true;
          // Fall through to comprehensive_generate handler below
        } else {
          // No skill context - show image options as before
          clearTimeout(thinkingTimeout);
          const imgContent = data.message || 'What would you like me to do with this image?';
          const imgOptions = data.options || ['Use as inspiration', 'Edit this image', 'Extract colors'];
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant',
              content: imgContent,
              options: imgOptions
            }];
          });
          saveAssistantMsg(imgContent, { options: imgOptions });
          setIsLoading(false);
          return;
        }
      }

     // Handle web research action
     if (data.action === 'web_research') {
       clearTimeout(thinkingTimeout);
       setMessages(prev => prev.filter(m => !m.isThinking));
       setThinkingContext('researching');
       
       const brandQuery = data.query || data.brand_info?.name || messageText;
       
       setMessages(prev => [...prev.filter(m => !m.isThinking), {
         role: 'assistant',
         content: '🔍 Researching on the web...',
         isThinking: true
       }]);
       
       try {
         const { data: researchData, error: researchError } = await supabase.functions.invoke('web-research', {
           body: { 
             query: `${brandQuery} brand company information`,
             research_type: 'brand_research'
           }
         });
         
         if (researchError) throw researchError;
         
         const results = researchData?.results || [];
         const formattedResults = results.map((r: any) => 
           `**[${r.title}](${r.link})**\n${r.snippet}`
         ).join('\n\n');
         
          const researchContent = `# Web Research: ${brandQuery}\n\n${formattedResults || 'No results found.'}\n\nWould you like me to create a design based on this research?`;
          const researchOptions = ['Create a logo', 'Create branding', 'Search for more'];
          const researchSources = results.map((r: any) => {
            try {
              return {
                title: r.title,
                url: r.link,
                description: r.snippet,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.link).hostname}`
              };
            } catch {
              return {
                title: r.title,
                url: r.link,
                description: r.snippet,
                favicon: ''
              };
            }
          });
          setMessages(prev => [...prev.filter(m => !m.isThinking), {
            role: 'assistant',
            content: researchContent,
            options: researchOptions,
            researchSources
          }]);
          saveAssistantMsg(researchContent, { options: researchOptions, research_sources: researchSources });
        } catch (err) {
          console.error('Web research error:', err);
          const errContent = 'Web research encountered an issue. Would you like to proceed with design generation instead?';
          const errOptions = ['Generate design', 'Try again'];
          setMessages(prev => [...prev.filter(m => !m.isThinking), {
            role: 'assistant',
            content: errContent,
            options: errOptions
          }]);
          saveAssistantMsg(errContent, { options: errOptions });
        }
       
       setIsLoading(false);
       return;
     }

      // search_inspiration removed - all generation goes through comprehensive_generate

      // Check if comprehensive generate requested (new flow)
      if (data.action === 'comprehensive_generate') {
        clearTimeout(thinkingTimeout);
        setMessages(prev => prev.filter(m => !m.isThinking));
        setThinkingContext('analyzing'); // Set context for analyzing
        console.log(`🎨 Comprehensive ${data.design_type} generation starting...`);
        setIsLoading(true);

        // Update context with all extracted info
        const fullContext = {
          designType: data.design_type,
          brandInfo: data.brand_info,
          styleKeywords: (data.style_keywords || '').split(' ').filter(Boolean),
          lastDesignPrompt: data.search_query,
          referenceImageUrl: uploadedImageUrl || selectedArtboardImage || conversationContext.referenceImageUrl
        };
        setConversationContext(prev => ({
          ...prev,
          ...fullContext
        }));

        // ZERO-FRICTION: Skip inspiration search, go straight to generation
        let brandName = data.brand_info?.name || 'your design';
        const features = data.brand_info?.features || [];
        const industry = data.brand_info?.industry || '';
        const styleKw = data.style_keywords || '';
        
        // Smart iteration count based on design type
        const iterationCountMap: Record<string, number> = {
          'ecommerce': 1,
          'logo': 1,
          'branding': 1,
          'social_media': 1,
          'campaign': 1,
          'poster': 1,
          'illustration': 1,
          'character': 1,
          'app_poster': 1,
          'brand_guidelines': 1,
        };
        const iterationCount = iterationCountMap[data.design_type] || 1;

        // Build rich prompt from extracted context
        const featuresStr = features.length > 0 ? `. Key features: ${features.join(', ')}` : '';
        const industryStr = industry ? `, ${industry} industry` : '';
        let basePrompt = `Professional ${data.design_type} design for ${brandName}${industryStr}${featuresStr}. Style: ${styleKw || 'modern professional'}`;

        // === SMART BRIEFING: Image Analysis Step ===
        const taggedImageUrl = taggedAssets?.find(a => a.imageUrl)?.imageUrl || taggedAssets?.[0]?.thumbnailUrl;
        const referenceForAnalysis = uploadedImageUrl || selectedArtboardImage || taggedImageUrl || conversationContext.referenceImageUrl;
        
        if (referenceForAnalysis) {
          // Single status message
          setThinkingContext('analyzing');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: activeSkill 
              ? `Applying **${activeSkill.name}** skill and analyzing your image...`
              : `Analyzing your image and planning the design process...`,
            isThinking: true,
          }]);

          try {
            console.log('🔍 Starting image analysis...');
            const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-product-image', {
              body: { imageUrl: referenceForAnalysis, designType: data.design_type }
            });

            // Remove thinking indicator
            setMessages(prev => prev.filter(m => !m.isThinking));

            if (!analysisError && analysisResult?.analysis) {
              console.log('✅ Image analysis complete:', analysisResult.analysis.branding?.brand_name);
              
              // Show analysis card
              const analysisContent = `Here's my visual analysis and execution plan:`;
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: analysisContent,
                imageAnalysis: analysisResult.analysis,
                executionPlan: analysisResult.executionPlan,
              }]);
              saveAssistantMsg(analysisContent, { image_analysis: analysisResult.analysis, execution_plan: analysisResult.executionPlan });

              // Enrich brand info from analysis
              const detectedBrand = analysisResult.analysis.branding?.brand_name;
              if (detectedBrand && detectedBrand !== 'Not detected' && detectedBrand !== 'Unknown') {
                data.brand_info = {
                  ...data.brand_info,
                  name: data.brand_info?.name || detectedBrand,
                  features: [
                    ...(data.brand_info?.features || []),
                    ...(analysisResult.analysis.details
                      ?.filter((d: any) => d.value && d.value !== 'Not visible' && d.label === 'Key Elements')
                      .map((d: any) => d.value) || [])
                  ]
                };
              }

              // CRITICAL: Rebuild basePrompt with REAL extracted info from analysis
              const enrichedBrandName = data.brand_info?.name && data.brand_info.name !== 'from image' ? data.brand_info.name : analysisResult.analysis.branding?.brand_name || 'design';
              const enrichedSubject = analysisResult.analysis.branding?.subject_name || '';
              const enrichedFeatures = data.brand_info?.features || [];
              const enrichedFeaturesStr = enrichedFeatures.length > 0 ? `. Key features: ${enrichedFeatures.join(', ')}` : '';
              const analysisSummary = analysisResult.analysis.summary || '';

              basePrompt = `Professional ${data.design_type} design for ${enrichedBrandName}${enrichedSubject ? ' ' + enrichedSubject : ''}${industryStr}${enrichedFeaturesStr}. ${analysisSummary}. Style: ${styleKw || 'modern professional'}`;
              brandName = enrichedBrandName + (enrichedSubject ? ' ' + enrichedSubject : '');
            } else {
              console.warn('⚠️ Image analysis failed, continuing without:', analysisError);
            }
          } catch (analysisErr) {
            console.warn('⚠️ Image analysis error, continuing:', analysisErr);
            setMessages(prev => prev.filter(m => !m.isThinking));
          }

          // Start generation immediately
          const genStartMsg = `Starting generation of ${iterationCount} ${formatDesignTypeDisplay(data.design_type)} designs...`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: genStartMsg,
          }]);
          saveAssistantMsg(genStartMsg);
        } else {
          // No reference image or not a multi-image type - simple message
          const genStartMsg2 = `Generating ${iterationCount} ${formatDesignTypeDisplay(data.design_type)} designs for ${brandName}...`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: genStartMsg2,
          }]);
          saveAssistantMsg(genStartMsg2);
        }

        // Update conversation title
        if (conversationIdRef.current) {
          const title = `${brandName} - ${data.design_type || 'Project'}`;
          await supabase.from('conversations').update({
            title,
            updated_at: new Date().toISOString()
          }).eq('id', conversationIdRef.current);
          if (messages.length <= 5) {
            updateConversationTitle(conversationIdRef.current, data.design_type, brandName);
          }
        }

        // Store full context
        setConversationContext(prev => ({
          ...prev,
          brandInfo: data.brand_info,
          designType: data.design_type,
          requestType: data.request_type,
          styleKeywords: (styleKw || '').split(' ').filter(Boolean),
          referenceImageUrl: uploadedImageUrl || selectedArtboardImage,
        }));

        // Go straight to generation - no inspiration step
        const refUrl = uploadedImageUrl || selectedArtboardImage || taggedImageUrl || undefined;
        const isBrandGuidelines = data.design_type === 'brand_guidelines' || (data.design_type === 'branding' && data.request_type === 'brand_guidelines');
        const iterations = await generateIterations(basePrompt, iterationCount, refUrl, isBrandGuidelines, {
          brandName,
          industry,
          features,
          designType: data.design_type,
        });

        if (iterations.length > 0) {
          const resultContent = `Here are your ${iterations.length} ${formatDesignTypeDisplay(data.design_type)} concepts for ${brandName}!`;
          const resultOptions = ['Generate more variations', 'Refine these designs', 'Try a different style'];
          const urlOnlyIters = iterations.map(iter => ({
            url: iter.url,
            prompt: iter.prompt,
            ...(iter.filePath ? { filePath: iter.filePath } : {})
          }));
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant' as const,
              content: resultContent,
              designIterations: iterations,
              options: resultOptions,
            }];
          });
          saveAssistantMsg(resultContent, { design_iterations: urlOnlyIters, design_type: data.design_type, options: resultOptions });
        } else {
          const failContent = `Generation didn't produce results. Let's try again with adjusted parameters.`;
          const failOptions = ['Try again', 'Describe the style you want', 'Try a different design type'];
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: failContent,
            options: failOptions,
          }]);
          saveAssistantMsg(failContent, { options: failOptions });
        }
        setIsLoading(false);
        return;
      }
      const assistantMessage = data.message;

      // Remove thinking message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);

        // Check if backend sent options separately
        let messageOptions: string[] | undefined;
        let messageInputFields: Array<{
          label: string;
          placeholder: string;
          value: string;
        }> | undefined;
        if (data.options && Array.isArray(data.options)) {
          // STRICT: Only convert if option EXACTLY matches "Label: [placeholder]" format
          const inputFieldPattern = /^[^:]+:\s*\[[^\]]+\]$/;
          const hasInputFieldFormat = data.options.some((opt: string) => inputFieldPattern.test(opt.trim()));
          if (hasInputFieldFormat) {
            // Convert options matching the pattern to input fields
            messageInputFields = data.options.map((opt: string) => {
              const match = opt.match(/^([^:]+):\s*\[([^\]]+)\]$/);
              if (match) {
                return {
                  label: match[1].trim(),
                  placeholder: match[2].trim(),
                  value: ''
                };
              }
              // If no match, create generic input (shouldn't happen with strict check)
              return {
                label: opt,
                placeholder: 'Enter value',
                value: ''
              };
            });
          } else {
            // Keep as option buttons
            messageOptions = data.options;
          }
        }

        // CRITICAL PHASE 2: Parse JSON responses and extract actual content
        let displayMessage = assistantMessage;
        let parsedOptions: string[] | undefined = messageOptions;
        let parsedInputFields: any[] | undefined = messageInputFields;

        if (assistantMessage.trim().startsWith('{') || assistantMessage.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(assistantMessage);
            if (typeof parsed === 'object') {
              // Extract text from any common field name
              const textField = (parsed as any).content || (parsed as any).message || (parsed as any).text ||
                (parsed as any).analysis || (parsed as any).response || (parsed as any).output ||
                (parsed as any).reply || (parsed as any).result;

              if (textField && typeof textField === 'string') {
                displayMessage = textField.trim();
              } else if ((parsed as any).action && !textField) {
                // Action-only JSON with no message — block from display
                console.log('⏭️ Blocking action-only JSON from UI');
                clearTimeout(thinkingTimeout);
                setIsLoading(false);
                return;
              } else if (!textField) {
                // JSON with no text field — use fallback
                const { type, action: _a, briefData, ...rest } = parsed as any;
                const mainVal = Object.values(rest).find((v: any) => typeof v === 'string' && v.length > 20) as string | undefined;
                displayMessage = mainVal?.trim() || "I'm working on your design request. Let me help you with that!";
              }
              // Extract options if present
              if (parsed.options && Array.isArray(parsed.options)) {
                parsedOptions = parsed.options;
                console.log('📦 Extracted options from JSON:', parsedOptions?.length);
              }
            }
          } catch {
            // Not valid JSON, use as-is
          }
        }
        // SAFETY NET: If displayMessage still looks like raw JSON, strip it
        if (displayMessage.trim().startsWith('{') && displayMessage.includes('"action"')) {
          try {
            const emergency = JSON.parse(displayMessage);
            displayMessage = emergency.message || "Let me help you with your design!";
          } catch {
            displayMessage = "Let me help you with your design!";
          }
        }
        
        const newMessage: Message = {
          role: 'assistant',
          content: displayMessage,
          options: parsedOptions,
          inputFields: parsedInputFields
        };

        // Save assistant message to database (skip internal JSON payloads)
        if (conversationIdRef.current) {
          // Check if this is an internal JSON action message
          const isInternalJSON = assistantMessage.trim().startsWith('{') && (assistantMessage.includes('"action"') || assistantMessage.includes('"design_type"'));
          if (isInternalJSON) {
            console.log('⏭️ Skipping save of internal JSON assistant message');
          } else if (wasRecentlySaved(assistantMessage, 'assistant')) {
            console.log('⏭️ Skipping duplicate assistant message save');
          } else {
            console.log('💾 Saving assistant message to database:', {
              contentPreview: assistantMessage.substring(0, 50),
              hasOptions: !!messageOptions,
              hasInputFields: !!messageInputFields,
              hasDesignIterations: !!newMessage.designIterations,
              iterationsCount: newMessage.designIterations?.length,
              hasInspirations: !!newMessage.inspirations,
              inspirationsCount: newMessage.inspirations?.length,
              hasUploadedImages: !!newMessage.uploadedImages,
              uploadedImagesCount: newMessage.uploadedImages?.length,
              hasVideoUrl: !!newMessage.videoUrl,
              conversationId
            });
            supabase.from('messages').insert({
              conversation_id: conversationIdRef.current!,
              user_id: userId,
              role: 'assistant',
              content: assistantMessage,
              metadata: {
                options: messageOptions,
                input_fields: messageInputFields,
                design_iterations: newMessage.designIterations,
                inspirations: newMessage.inspirations,
                
                uploaded_images: newMessage.uploadedImages,
                selected_image_url: newMessage.selectedImageUrl,
                video_url: newMessage.videoUrl,
                video_status: newMessage.videoStatus,
                timestamp: new Date().toISOString()
              }
            }).then(({
              error
            }) => {
              if (error) {
                console.error('❌ CRITICAL: Assistant message save failed:', {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint,
                  conversationId,
                  userId
                });
                toast({
                  title: "⚠️ Message Not Saved",
                  description: `${error.message} (${error.code})`,
                  variant: "destructive"
                });
              } else {
                console.log('✅ Assistant message saved successfully');
              }
            });
          }
        }
        return [...filtered, newMessage];
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      clearTimeout(timeoutId);
      clearTimeout(stillWorkingId);
      clearTimeout(thinkingTimeout);

      // Remove thinking message
      setMessages(prev => prev.filter(m => !m.isThinking));

      // Show user-friendly error message
      let errorMessage = 'Failed to send message. Please try again.';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The AI is taking too long. Please try a simpler request.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Connection error. Please check your internet and try again.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        options: ['Try Again', 'Start Over']
      }]);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      clearTimeout(thinkingTimeout);
      clearTimeout(failsafeTimeout);
      setIsLoading(false);
    }
  };

  // Helper function to update conversation title
  const updateConversationTitle = async (convId: string, designType: string, brandName?: string) => {
    let title = 'Design Project';
    if (designType?.toLowerCase().includes('logo')) {
      title = 'Logo Design';
    } else if (designType?.toLowerCase().includes('branding')) {
      title = 'Branding Project';
    } else if (designType?.toLowerCase().includes('identity')) {
      title = 'Identity Design';
    } else if (designType?.toLowerCase().includes('concept')) {
      title = 'Concept Design';
    } else if (designType?.toLowerCase().includes('illustration')) {
      title = 'Illustration';
    }
    if (brandName) {
      title = `${brandName} - ${title}`;
    }
    await supabase.from('conversations').update({
      title
    }).eq('id', convId);
  };
  const generateDesign = async (prompt: string, referenceImageUrl?: string, brandSystemData?: any, skipEnhancer?: boolean): Promise<{
    url: string;
    prompt: string;
    type?: string;
    filePath?: string;
    enhanced_prompt?: string;
  } | null> => {
    // Validate and sanitize inputs
    if (!prompt || prompt.length === 0) {
      console.error('❌ Empty prompt');
      toast({
        title: 'Invalid Prompt',
        description: 'Please provide a design description',
        variant: 'destructive'
      });
      return null;
    }

    // Truncate extremely long prompts to prevent 400 errors
    if (prompt.length > 5000) {
      console.warn('⚠️ Prompt too long, truncating:', prompt.length);
      prompt = prompt.substring(0, 4500) + '\n\n[Prompt truncated for length]';
    }

    // Validate reference URL format
    if (referenceImageUrl) {
      try {
        new URL(referenceImageUrl);
      } catch {
        console.warn('⚠️ Invalid reference URL, removing:', referenceImageUrl.substring(0, 50));
        referenceImageUrl = undefined;
      }
    }
    console.log('✅ Validated inputs:', {
      promptLength: prompt.length,
      hasReference: !!referenceImageUrl,
      referenceType: referenceImageUrl?.startsWith('data:') ? 'base64' : referenceImageUrl?.startsWith('http') ? 'url' : 'unknown'
    });
    try {
      // PHASE 5: Image validation - track generation attempts
      let generationAttempt = 0;
      const maxAttempts = 2;
      let finalDesign = null;

      // FIXED: Apply brand system to prompt before sending
      let enhancedPrompt = '';
      const activeBrandSystem = brandSystemData || brandSystem;

      // FIX 5: START with research insights (MOST IMPORTANT)
      if (activeBrandSystem?.research_insights) {
        enhancedPrompt = `🎨 2025 DESIGN CONTEXT (MUST FOLLOW):
${activeBrandSystem.research_insights}

DESIGN BRIEF:
${prompt}

CRITICAL: Your design MUST reflect the 2025 trends above. Use bold, modern aesthetics that match current ${activeBrandSystem.industry || 'industry'} standards.`;
      } else {
        enhancedPrompt = prompt;
      }

      // Add brand system colors if available
      if (activeBrandSystem?.colors?.primary?.hex) {
        enhancedPrompt += `\n\nBRAND COLORS:
• Primary: ${activeBrandSystem.colors.primary.hex}
• Secondary: ${activeBrandSystem.colors.secondary?.hex || 'not specified'}
• Font: ${activeBrandSystem.typography?.primary_font || 'Modern sans-serif'}`;
      }

      // Reference analysis removed - product image is passed directly to generate-design
      // which lets the AI model SEE the product rather than describing it in text
      let finalPrompt = enhancedPrompt;
      console.log('🎨 Calling generate-design with final prompt:', finalPrompt.substring(0, 150));

      // PHASE 5: Generation loop with validation for brand guidelines
      while (generationAttempt < maxAttempts) {
        generationAttempt++;
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please log in again.');
        }
        const apiBase = import.meta.env.VITE_LOCAL_SERVER_URL || import.meta.env.VITE_SUPABASE_URL;
        
        const response = await fetch(`${apiBase}/functions/v1/generate-design`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            design_type: brandSystemData?.designType || conversationContext?.designType || 'design',
            model: selectedImageModel,
            referenceImageUrl: referenceImageUrl || null,
            brandSystem: activeBrandSystem
          })
        });

        const rawData = await response.text();
        let data;
        let error = null;
        try {
          data = JSON.parse(rawData);
          if (!response.ok) {
            error = data.error || data.details || 'Unknown error';
          }
        } catch (e) {
          error = rawData || 'Failed to parse response';
          data = null;
        }

        console.log('🎨 generate-design response:', {
          data,
          error
        });
        if (error) {
          console.error('❌ Generate design error:', error);
          throw new Error(error);
        }
        if (data?.error) {
          console.error('Backend error:', data.error, 'Details:', data.details);
          throw new Error(data.details || data.error);
        }
        if (!data?.imageUrl) {
          console.error('No image URL in response:', data);
          throw new Error('No image generated');
        }

        // Store enhanced_prompt for variations to reuse design DNA
        if (data?.enhanced_prompt) {
          setConversationContext(prev => ({
            ...prev,
            lastEnhancedPrompt: data.enhanced_prompt
          }));
        }

        // FIX 4: Extract file_path from response for persistence
        const extractedFilePath = data?.filePath || data?.file_path || null;
        console.log('🔍 BACKEND RESPONSE:', {
          hasFilePath: !!data?.filePath,
          hasFile_path: !!data?.file_path,
          extractedFilePath,
          allKeys: Object.keys(data || {})
        });
        if (!extractedFilePath) {
          console.error('❌ CRITICAL: Backend did not return filePath!');
        }
        console.log(`✅ Design generated (attempt ${generationAttempt}):`, {
          imageUrl: data.imageUrl.substring(0, 100),
          filePath: extractedFilePath
        });

        // PHASE 5: Validate aspect ratio for brand guidelines only
        const isBrandGuideline = prompt.includes('Brand Page') || prompt.includes('brand guideline') || prompt.includes('PRIMARY LOGO') || prompt.includes('LOGO VARIATIONS');
        if (isBrandGuideline) {
          try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.crossOrigin = 'anonymous';
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = data.imageUrl;
            });
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            console.log(`📐 Image aspect ratio: ${aspectRatio.toFixed(2)} (${img.naturalWidth}x${img.naturalHeight})`);

            // Accept if close to 1:1 (±8% tolerance for flexibility)
            if (aspectRatio > 0.92 && aspectRatio < 1.08) {
              finalDesign = {
                url: data.imageUrl,
                prompt: prompt,
                type: data.design_type,
                filePath: extractedFilePath // FIX 4: Include file_path
              };
              break; // Success!
            } else if (generationAttempt < maxAttempts) {
              console.warn(`⚠️ Wrong aspect ratio ${aspectRatio.toFixed(2)}, retrying with stricter prompt...`);
              enhancedPrompt += '\n\nCRITICAL: Output MUST be exactly 1:1 square aspect ratio (1024x1024px). NO OTHER DIMENSIONS ALLOWED.';
              continue;
            }
          } catch (imgError) {
            console.warn('Could not validate image aspect ratio:', imgError);
            // If validation fails, accept the image anyway on last attempt
            if (generationAttempt >= maxAttempts) {
              finalDesign = {
                url: data.imageUrl,
                prompt: prompt,
                type: data.design_type,
                filePath: extractedFilePath // FIX 4: Include file_path
              };
              break;
            }
          }
        } else {
          // Not brand guidelines, accept immediately
          finalDesign = {
            url: data.imageUrl,
            prompt: prompt,
            type: data.design_type,
            filePath: extractedFilePath // FIX 4: Include file_path
          };
          break;
        }
      }
      if (!finalDesign) {
        throw new Error('Failed to generate valid design after multiple attempts');
      }
      return finalDesign;
    } catch (error: any) {
      console.error('❌ Generate design error:', error);

      // Parse error response for better user feedback
      let errorMessage = 'Failed to generate design';
      let errorTitle = 'Generation Error';

      // IMPROVED: Check if error came from edge function with structured response
      if (error?.context?.body) {
        const errorBody = error.context.body;
        console.log('📋 Parsed error body:', errorBody);

        // Use userMessage if available (most user-friendly), fallback to message, then error code
        errorMessage = errorBody.userMessage || errorBody.message || errorBody.error || errorMessage;

        // Handle specific error codes
        if (errorBody.error === 'CONFIGURATION_ERROR' || errorBody.error === 'MISSING_API_KEYS') {
          errorTitle = '⚙️ Configuration Error';
          errorMessage = errorBody.userMessage || 'Image generation service needs configuration. Please contact support.';
        } else if (errorBody.error === 'RATE_LIMIT_EXCEEDED') {
          errorTitle = '⏳ Rate Limited';
          errorMessage = errorBody.userMessage || 'Too many requests. Please wait 60 seconds and try again.';
        } else if (errorBody.error === 'PAYMENT_REQUIRED' || errorBody.error === 'SERVICE_LIMIT_REACHED') {
          errorTitle = '💳 Service Temporarily Unavailable';
          errorMessage = errorBody.userMessage || 'AI generation service is temporarily unavailable. Your credits have been refunded. Please try again in a few minutes.';
        } else if (errorMessage.toLowerCase().includes('insufficient_credits')) {
          errorTitle = '💳 Insufficient Credits';
          errorMessage = 'Not enough credits to generate. Please upgrade your plan.';
        }
      }

      // Fallback: Check raw error message for common patterns
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        errorTitle = '⏳ Rate Limited';
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('402') || error.message?.toLowerCase().includes('insufficient credits')) {
        errorTitle = '💳 Insufficient Credits';
        errorMessage = 'Not enough credits. Please add more to continue.';
      } else if (error.message?.toLowerCase().includes('session')) {
        errorTitle = '🔐 Session Expired';
        errorMessage = 'Your session expired. Please refresh and log in again.';
      } else if (error.message) {
        // Use the error message directly if no better message found
        errorMessage = error.message;
      }
      console.error('🚨 Final error to show user:', {
        errorTitle,
        errorMessage
      });
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    }
  };
  const handleVideoGeneration = async (prompt: string, files?: File[]) => {
    setIsLoading(true);

    // Process uploaded reference image
    let referenceImageUrl: string | undefined;
    if (files && files.length > 0) {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('design-assets').upload(filePath, file);
      if (!uploadError) {
        const {
          data: urlData,
          error: urlError
        } = await supabase.storage.from('design-assets').createSignedUrl(filePath, 3600);
        if (urlData?.signedUrl) {
          referenceImageUrl = urlData.signedUrl;
        }
      }
    }
    const userMessage: Message = {
      role: 'user',
      content: prompt
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(false);

    // Add video generation message
    const videoMessage: Message = {
      role: 'assistant',
      content: '🎬 Generating your video...',
      videoStatus: 'queued',
      videoDuration: videoDuration,
      videoAspectRatio: videoAspectRatio
    };
    setMessages(prev => [...prev, videoMessage]);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('sora-generate', {
        body: {
          prompt,
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
          referenceImageUrl: referenceImageUrl || selectedReferenceImage
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      if (data.error) {
        throw new Error(data.error);
      }

      // Update message with job ID and processing status
      setMessages(prev => prev.map((msg, idx) => idx === prev.length - 1 ? {
        ...msg,
        videoJobId: data.jobId,
        videoStatus: 'processing' as const
      } : msg));

      // Refresh credits
      const {
        data: creditData
      } = await supabase.from('credits').select('balance').eq('user_id', userId).single();
      if (creditData) {
        setUserCredits(prev => ({
          ...prev,
          balance: creditData.balance
        }));
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      let errorMessage = 'Failed to generate video';
      if (error.message?.includes('402') || error.message?.toLowerCase().includes('insufficient')) {
        errorMessage = `Insufficient credits. Need ${videoDuration * 10} credits for ${videoDuration}s video.`;
      } else if (error.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
      }
      setMessages(prev => prev.map((msg, idx) => idx === prev.length - 1 ? {
        ...msg,
        videoStatus: 'failed' as const,
        videoError: errorMessage
      } : msg));
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };
  const handleVideoStatusUpdate = (messageIndex: number, status: string, videoUrl?: string, error?: string) => {
    setMessages(prev => prev.map((msg, idx) => idx === messageIndex ? {
      ...msg,
      videoStatus: status as any,
      videoUrl,
      videoError: error,
      content: status === 'completed' ? '✅ Your video is ready!' : msg.content
    } : msg));
  };
  const generateIterations = async (basePrompt: string, count: number, referenceImageUrl?: string, isBrandGuidelines: boolean = false, brandInfoForPrompt?: any) => {
    if (isGenerating) {
      console.log('⏸️ Generation already in progress, skipping duplicate request');
      return [];
    }

    // Dynamic failsafe timeout — longer for brand guidelines (15 min vs 5 min)
    const failsafeMs = isBrandGuidelines ? 900000 : 300000;
    const resetTimeout = setTimeout(() => {
      console.warn(`⚠️ Force-resetting isGenerating flag after ${failsafeMs / 1000}s timeout`);
      setIsGenerating(false);
      setGenerationProgress(null);
      setGenerationStartTime(null);
      setShowPlan(false);
      resetPlan();
      setThinkingContext('general');
      // Finalize partial results in messages before clearing thinking
      setMessages(prev => prev.map(m => {
        if (m.role === 'assistant' && m.designIterations !== undefined && !m.pendingApproval) {
          const actualCount = m.designIterations?.length || 0;
          if (actualCount > 0) {
            return {
              ...m,
              isThinking: false,
              pendingApproval: true,
              content: `Here are ${actualCount} design${actualCount !== 1 ? 's' : ''} (some timed out). Select your favorites!`,
            };
          }
        }
        return m;
      }).filter(m => !m.isThinking));
    }, failsafeMs);
    try {
      setIsGenerating(true);
      setGenerationStartTime(Date.now());
      setShowPlan(true);
      setThinkingContext('generating');
      setGenerationProgress({
        current: 0,
        total: count,
        step: 'Generating designs...'
      });

      // Create a generation job in the database for persistence across reloads
      let jobId: string | null = null;
      if (conversationIdRef.current) {
        const { data: jobData } = await supabase
          .from('generation_jobs')
          .insert({
            user_id: userId,
            conversation_id: conversationIdRef.current,
            status: 'processing',
            design_type: brandInfoForPrompt?.designType || 'design',
            prompt: basePrompt.substring(0, 2000),
            total_variations: count,
            completed_variations: 0,
            results: [],
          })
          .select('id')
          .single();
        jobId = jobData?.id || null;
        activeJobIdRef.current = jobId;
      }

      // Initialize the generation plan for RUMI visualization
      initializePlan({
        designType: isBrandGuidelines ? 'brand-guidelines' : (brandInfoForPrompt?.designType || 'design'),
        iterationCount: count,
        hasReference: !!referenceImageUrl
      });
      startStep('analyzing');
      
      // No artificial delays

      console.log(`🔄 Starting generateIterations: ${count} iterations, brand guidelines: ${isBrandGuidelines}`);
      const iterations = [];
      let failedCount = 0;
      if (isBrandGuidelines) {
        // ULTRA-AGGRESSIVE PROMPTS - ONE ELEMENT PER PAGE WITH EXTREME NEGATIVE PROMPTS
        const brandName = brandInfoForPrompt?.brandName || 'your brand';
        const industry = brandInfoForPrompt?.industry || 'business';
        const styleKeywords = brandInfoForPrompt?.styleKeywords || 'modern professional';
        const pageFormat = '9:16 portrait format (768x1365px)';
        const logoInstruction = 'Use EXACTLY the logo from the reference image provided — replicate it precisely, do not generate or invent a new logo.';
        const brandGuidelinePages = [{
          name: 'COVER PAGE',
          prompt: `BRAND GUIDELINES COVER PAGE for ${brandName}. Large centered logo on premium background. ${styleKeywords} style. Brand name "${brandName}" as elegant title. Subtitle "Brand Guidelines". Clean, executive presentation cover. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'TABLE OF CONTENTS',
          prompt: `TABLE OF CONTENTS page for ${brandName} brand guidelines. Clean numbered list: 1. Brand Story, 2. Logo, 3. Color Palette, 4. Typography, 5. Brand Voice, 6. Applications. ${styleKeywords} style. Minimal layout, generous whitespace. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'BRAND STORY',
          prompt: `BRAND STORY page for ${brandName}. Elegant editorial layout with placeholder text blocks showing brand narrative structure. Section header "Our Story". ${styleKeywords} style for ${industry}. Premium magazine-style typography layout. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'LOGO CONCEPT',
          prompt: `LOGO CONCEPT page for ${brandName}. Show the main logo large and centered with brief design rationale annotations. Explain the symbolism. ${styleKeywords} style. Clean white background. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'PRIMARY LOGO',
          prompt: `PRIMARY LOGO page for ${brandName}. The brand logo centered on pure white background with professional spacing. ${styleKeywords} style for ${industry}. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'SECONDARY LOGO',
          prompt: `SECONDARY LOGO VARIATIONS for ${brandName}. Show 3 variants: horizontal, stacked, and icon-only. Equal spacing in clean grid. ${styleKeywords} style. White background. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'LOGO CLEAR SPACE',
          prompt: `LOGO CLEAR SPACE & MINIMUM SIZE guide for ${brandName}. Show logo with measured clear space zone marked with dotted lines and "X" measurements. Minimum size specifications. Technical diagram style. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'COLOR PALETTE',
          prompt: `COLOR PALETTE page for ${brandName}. Primary and secondary colors as large swatches with HEX, RGB, and CMYK codes below each. ${styleKeywords} color scheme. 5-8 colors. Clean grid layout. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'COLOR USAGE',
          prompt: `COLOR USAGE GUIDELINES for ${brandName}. Show correct color combinations and incorrect ones. Color hierarchy: primary, secondary, accent, neutral. Do's and Don'ts with green checks and red X marks. ${pageFormat}.`
        }, {
          name: 'TYPOGRAPHY SYSTEM',
          prompt: `TYPOGRAPHY SYSTEM for ${brandName}. Show primary and secondary fonts with full alphabets, weights (Light, Regular, Medium, Bold), and heading/body hierarchy. ${styleKeywords} typography. Clean specimen layout. ${pageFormat}.`
        }, {
          name: 'BRAND VOICE & TONE',
          prompt: `BRAND VOICE & TONE page for ${brandName}. Visual representation of brand personality: "We are..." / "We are not..." columns. Tone spectrum from formal to casual with ${brandName}'s position marked. ${styleKeywords} style. ${pageFormat}.`
        }, {
          name: 'BRAND ARCHETYPE',
          prompt: `BRAND ARCHETYPE page for ${brandName}. Visual archetype wheel or diagram showing the brand's personality archetype for ${industry}. Core values and personality traits listed. ${styleKeywords} style. ${pageFormat}.`
        }, {
          name: 'LOGO APPLICATIONS',
          prompt: `LOGO APPLICATION MOCKUPS for ${brandName}. Show logo on business card, letterhead, and envelope in realistic mockup style. ${styleKeywords} professional presentation. Premium materials look. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'BRAND ASSETS & PATTERNS',
          prompt: `BRAND PATTERN & TEXTURE page for ${brandName}. Show 4-6 brand patterns, textures, and graphic elements that complement the identity. ${styleKeywords} style. Grid layout on white background. ${pageFormat}.`
        }, {
          name: 'MOCKUPS',
          prompt: `BRAND MOCKUP SHOWCASE for ${brandName}. Show logo on merchandise: t-shirt, tote bag, mug, phone case. Photorealistic mockups in lifestyle setting. ${styleKeywords} style for ${industry}. ${pageFormat}. ${logoInstruction}`
        }, {
          name: 'DOS AND DONTS',
          prompt: `LOGO DO'S AND DON'TS for ${brandName}. Left: 4 correct usages with green ✓. Right: 4 incorrect usages with red ✗ (stretched, wrong colors, cluttered background, rotated). Clean comparison grid. ${pageFormat}. ${logoInstruction}`
        }];
        const totalPages = brandGuidelinePages.length;
        const BG_TIMEOUT_MS = 120000; // 120s per page
        
        // Shared helpers for timeout + retry (same as regular designs)
        const bgGenerateWithTimeout = async (prompt: string, ref: string | undefined, brandInfo: any) => {
          return Promise.race([
            generateDesign(prompt, ref, brandInfo, true),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('PAGE_TIMEOUT')), BG_TIMEOUT_MS))
          ]);
        };
        const bgGenerateWithRetry = async (prompt: string, ref: string | undefined, brandInfo: any) => {
          try {
            return await bgGenerateWithTimeout(prompt, ref, brandInfo);
          } catch (err: any) {
            console.warn(`⚠️ First attempt failed, retrying once...`, err?.message);
            return await bgGenerateWithTimeout(prompt, ref, brandInfo);
          }
        };

        // Show assistant message immediately so user sees progress
        setMessages(prev => [...prev.filter(m => !m.isThinking), {
          role: 'assistant' as const,
          content: `Generating brand guidelines (0/${totalPages})...`,
          designIterations: [],
        }]);

        for (let i = 0; i < totalPages; i++) {
          const page = brandGuidelinePages[i];
          setGenerationProgress({
            current: i + 1,
            total: totalPages,
            step: `Creating ${page.name} (${i + 1}/${totalPages})...`,
            brandName: brandInfoForPrompt?.name || 'Brand'
          });
          console.log(`📄 Generating page ${i + 1}/${totalPages}: ${page.name}`);
          
          try {
            const design = await bgGenerateWithRetry(page.prompt, referenceImageUrl || undefined, brandInfoForPrompt);
            if (design) {
              console.log(`✅ Brand guideline page ${i + 1} (${page.name}) generated`);
              const iterationEntry = { url: design.url, prompt: `Page ${i + 1}: ${page.name}`, filePath: design.filePath };
              iterations.push(iterationEntry);
              
              // INCREMENTAL: Stream completed page to UI immediately
              setMessages(prev => {
                const existingIdx = prev.findIndex(m => m.role === 'assistant' && m.designIterations !== undefined && !m.pendingApproval);
                if (existingIdx === -1) {
                  return [...prev.filter(m => !m.isThinking), {
                    role: 'assistant' as const,
                    content: `Brand guidelines (${iterations.length}/${totalPages})... ${iterations.length} pages ready`,
                    designIterations: [design],
                  }];
                }
                return prev.map((m, idx) => {
                  if (idx === existingIdx) {
                    return {
                      ...m,
                      content: `Brand guidelines (${iterations.length}/${totalPages})... ${iterations.length} pages ready`,
                      designIterations: [...(m.designIterations || []), design],
                    };
                  }
                  return m;
                });
              });

              // Persist progress to DB
              if (jobId) {
                supabase.from('generation_jobs').update({
                  completed_variations: iterations.length,
                  results: iterations.map(it => ({ url: it.url, prompt: it.prompt, filePath: it.filePath })),
                }).eq('id', jobId).then(({ error }) => {
                  if (error) console.error('❌ Job progress update failed:', error.message);
                });
              }
            } else {
              console.warn(`⚠️ Page ${i + 1} (${page.name}) returned null`);
              failedCount++;
            }
          } catch (err: any) {
            console.error(`❌ Page ${i + 1} (${page.name}) ${err?.message === 'PAGE_TIMEOUT' ? 'TIMED OUT' : 'failed'}:`, err?.message);
            failedCount++;
          }
        }
      } else {
        // All variations generated in parallel with incremental streaming + timeouts
        completeStep('analyzing');
        startStep('generating');
        // Design-type-aware variation modifiers
        const designTypeFromBrand = brandInfoForPrompt?.designType || conversationContext?.designType || '';
        const isLogoDesign = designTypeFromBrand === 'logo' || basePrompt.toLowerCase().includes('logo');
        const isEcommerce = designTypeFromBrand === 'ecommerce';
        const isSocialMedia = designTypeFromBrand === 'social_media';

        let variationModifiers: string[];
        if (isLogoDesign) {
          variationModifiers = [
            'VARIATION 1: Primary logo concept — clean, professional wordmark or lettermark. Use the brand colors from the design brief.',
          ];
        } else if (isEcommerce) {
          variationModifiers = [
            'IMAGE 1: HERO SHOT - Clean product photography on white background. The definitive product image.',
          ];
        } else if (isSocialMedia) {
          variationModifiers = [
            'VARIATION 1: Primary social media post design — bold, eye-catching layout with strong visual hierarchy. Keep brand name, colors, and style prominent.',
          ];
        } else {
          variationModifiers = [
            'VARIATION 1: Primary design concept — the strongest interpretation of the brief with optimal composition and color balance.',
          ];
        }

        // SEQUENTIAL GENERATION with INCREMENTAL STREAMING
        const VARIATION_TIMEOUT_MS = 180000; // 180s per variation — backend can take 90-120s
        const BATCH_SIZE = 1; // Sequential: one at a time
        const BATCH_DELAY_MS = 500; // 500ms between variations

        const variationsToGenerate = [];
        for (let i = 0; i < Math.min(count, variationModifiers.length); i++) {
          const modifier = variationModifiers[i];
          const variationPrompt = isEcommerce
            ? `CRITICAL: Generate an image of the EXACT SAME product as the main hero shot. Do NOT change the product, brand name, or packaging design. Do NOT invent new products. ${basePrompt}. ${modifier}`
            : `${basePrompt}. Style variation: ${modifier}`;
          variationsToGenerate.push({ index: i, prompt: variationPrompt, modifier });
        }

        console.log(`🚀 STAGGERED GENERATION: ${variationsToGenerate.length} variations in batches of ${BATCH_SIZE}, ${VARIATION_TIMEOUT_MS/1000}s timeout each`);
        
        // Mark all as in-progress
        variationsToGenerate.forEach(v => updateIterationProgress(v.index, 'in-progress'));
        setGenerationProgress({
          current: 1,
          total: count,
          step: `Generating ${variationsToGenerate.length} variations...`
        });

        const referenceForVariations = referenceImageUrl || selectedReferenceImage || null;
        console.log(`🎨 Reference for ALL variations: ${referenceForVariations ? 'YES' : 'NONE'}`);

        // Show assistant message immediately before generation starts
        setMessages(prev => [...prev.filter(m => !m.isThinking), {
          role: 'assistant' as const,
          content: `Generating ${count} ${formatDesignTypeDisplay(brandInfoForPrompt?.designType || 'design')} designs...`,
          designIterations: [],
        }]);

        // Helper: wrap generateDesign with per-variation timeout
        const generateWithTimeout = async (prompt: string, ref: string | null, brandInfo: any) => {
          return Promise.race([
            generateDesign(prompt, ref || undefined, brandInfo, true),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('VARIATION_TIMEOUT')), VARIATION_TIMEOUT_MS))
          ]);
        };

        // Helper: retry once on failure, but NOT on timeout (server overloaded)
        const generateWithRetry = async (prompt: string, ref: string | null, brandInfo: any) => {
          try {
            return await generateWithTimeout(prompt, ref, brandInfo);
          } catch (err: any) {
            if (err?.message === 'VARIATION_TIMEOUT') throw err; // Don't retry timeouts
            console.warn('⚠️ First attempt failed, retrying once...', err?.message);
            return await generateWithTimeout(prompt, ref, brandInfo);
          }
        };

        let completedCount = 0;

        // Helper to handle a single variation result
        const handleVariationResult = (index: number, design: any) => {
          completedCount++;
          if (design) {
            console.log(`✅ Variation ${index + 1} completed (${completedCount}/${count})`);
            iterations.push(design);
            updateIterationProgress(index, 'completed');
            setGenerationProgress({
              current: completedCount,
              total: count,
              step: `Generated ${completedCount}/${count} designs...`
            });

            // Persist progress to DB so it survives page reload
            if (jobId) {
              supabase.from('generation_jobs').update({
                completed_variations: iterations.length,
                results: iterations.map(it => ({ url: it.url, prompt: it.prompt, filePath: it.filePath })),
              }).eq('id', jobId).then(({ error }) => {
                if (error) console.error('❌ Job progress update failed:', error.message);
              });
            }

            // INCREMENTAL: Stream this image to chat immediately
            setMessages(prev => {
              // Find the existing assistant message with designIterations (the one we created above)
              const existingIdx = prev.findIndex(m => m.role === 'assistant' && m.designIterations !== undefined && !m.pendingApproval);
              if (existingIdx === -1) {
                return [...prev.filter(m => !m.isThinking), {
                  role: 'assistant' as const,
                  content: `Generating ${formatDesignTypeDisplay(brandInfoForPrompt?.designType || 'design')} designs... (${completedCount}/${count})`,
                  designIterations: [design],
                }];
              }
              return prev.map((m, i) => {
                if (i === existingIdx) {
                  return {
                    ...m,
                    content: `Generating ${formatDesignTypeDisplay(brandInfoForPrompt?.designType || 'design')} designs... (${completedCount}/${count})`,
                    designIterations: [...(m.designIterations || []), design],
                  };
                }
                return m;
              });
            });
          } else {
            console.warn(`⚠️ Variation ${index + 1} returned null`);
            updateIterationProgress(index, 'failed');
            failedCount++;
          }
        };

        const handleVariationError = (index: number, err: any) => {
          completedCount++;
          const isTimeout = err?.message === 'VARIATION_TIMEOUT';
          console.error(`❌ Variation ${index + 1} ${isTimeout ? 'TIMED OUT' : 'failed'}:`, err?.message);
          updateIterationProgress(index, 'failed');
          failedCount++;
          setGenerationProgress({
            current: completedCount,
            total: count,
            step: `Generated ${iterations.length}/${count} designs... (${failedCount} failed)`
          });
        };

        // SEQUENTIAL GENERATION: one at a time with retry
        for (let i = 0; i < variationsToGenerate.length; i++) {
          const { index, prompt } = variationsToGenerate[i];
          console.log(`🎯 Generating variation ${index + 1}/${variationsToGenerate.length}...`);
          
          // Mark current variation as in-progress
          updateIterationProgress(index, 'in-progress');

          try {
            const design = await generateWithRetry(prompt, referenceForVariations, brandInfoForPrompt);
            handleVariationResult(index, design);
          } catch (err: any) {
            handleVariationError(index, err);
          }

          // Short delay before next variation (skip after last)
          if (i < variationsToGenerate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        console.log(`🏁 STAGGERED GENERATION COMPLETE: ${iterations.length}/${count} succeeded, ${failedCount} failed`);
      }

      // Update the streaming message with ACTUAL count
      if (iterations.length > 0) {
        console.log(`🏁 Generated ${iterations.length}/${count} designs successfully (${failedCount} failed)`);
        setMessages(prev => prev.map(m => {
          if (m.role === 'assistant' && m.designIterations !== undefined && !m.pendingApproval) {
            return {
              ...m,
              content: `Here are ${iterations.length} design${iterations.length !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}. Select your favorites!`,
              pendingApproval: true,
            };
          }
          return m;
        }));
      } else if (failedCount > 0) {
        console.error(`❌ All ${failedCount} design generations failed`);
        setMessages(prev => prev.map(m => {
          if (m.role === 'assistant' && m.designIterations !== undefined && !m.pendingApproval) {
            return {
              ...m,
              content: 'All design generations failed. Please try again.',
              designIterations: [],
            };
          }
          return m;
        }));
      }

      // Mark generation job as completed/failed in DB
      if (jobId) {
        const finalStatus = iterations.length > 0 ? 'completed' : 'failed';
        supabase.from('generation_jobs').update({
          status: finalStatus,
          completed_variations: iterations.length,
          results: iterations.map(it => ({ url: it.url, prompt: it.prompt, filePath: it.filePath })),
          completed_at: new Date().toISOString(),
          error: failedCount > 0 ? `${failedCount} variations failed` : null,
        }).eq('id', jobId).then(({ error }) => {
          if (error) console.error('❌ Job completion update failed:', error.message);
          else console.log(`✅ Job ${jobId} marked as ${finalStatus}`);
        });
        activeJobIdRef.current = null;
      }

      // Clear timeout and hide progress
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
      
      // Complete generation plan
      completeStep('generating');
      startStep('quality-check');
      
      // Small delay to show quality check step
      await new Promise(r => setTimeout(r, 500));
      completeStep('quality-check');
      
      // PHASE 3: Snapshot completed plan before resetting (keeps it visible)
      snapshotCompleted();
      
      // Clear generation state but keep plan snapshot visible
      setGenerationProgress(null);
      setGenerationStartTime(null);
      setIsGenerating(false);
      setThinkingContext('general');
      resetPlan();
      
      // Remove thinking messages immediately from the array
      setMessages(prev => prev.filter(m => !m.isThinking));

      // Notify completion
      notifyAiComplete({
        source: 'canvas',
        status: 'success',
        title: 'Design ready',
        message: `${iterations.length} variation${iterations.length === 1 ? '' : 's'} generated.`,
        dedupeKey: conversationIdRef.current ?? undefined,
      });

      // 🔥 FIX: FORCE conversation title update with verification
      if (conversationIdRef.current && iterations.length > 0) {
        const designTypeLabel = conversationContext?.designType || (basePrompt.toLowerCase().includes('logo') ? 'Logo' : basePrompt.toLowerCase().includes('identity') ? 'Identity' : basePrompt.toLowerCase().includes('concept') ? 'Concept' : basePrompt.toLowerCase().includes('illustration') ? 'Illustration' : 'Design');
        const brandName = brandInfoForPrompt?.brandName || conversationContext?.brandInfo?.name || 'Project';
        const newTitle = `${brandName} - ${designTypeLabel}`;
        console.log('💾 FORCING conversation title update:', {
          conversationId,
          newTitle,
          currentMessagesCount: messages.length,
          timestamp: new Date().toISOString()
        });
        const {
          data: updateResult,
          error: titleError
        } = await supabase.from('conversations').update({
          title: newTitle,
          updated_at: new Date().toISOString()
        }).eq('id', conversationIdRef.current).select();
        if (titleError) {
          console.error('❌ CRITICAL: Title update failed:', {
            code: titleError.code,
            message: titleError.message,
            details: titleError.details,
            hint: titleError.hint,
            conversationId,
            attemptedTitle: newTitle
          });

          // Retry once after 1 second
          setTimeout(async () => {
            console.log('🔄 Retrying title update...');
            const {
              error: retryError
            } = await supabase.from('conversations').update({
              title: newTitle
            }).eq('id', conversationIdRef.current);
            if (retryError) {
              console.error('❌ Title update retry failed:', retryError);
            } else {
              console.log('✅ Title updated on retry:', newTitle);
            }
          }, 1000);
        } else {
          console.log('✅ Title updated successfully:', {
            newTitle,
            updateResult,
            timestamp: new Date().toISOString()
          });

          // Verify the update actually persisted
          const {
            data: verifyData
          } = await supabase.from('conversations').select('title').eq('id', conversationIdRef.current).single();
          console.log('🔍 Verified title in database:', verifyData?.title);
        }
      }
      return iterations;
    } catch (error) {
      console.error('❌ Error in generateIterations:', error);
      // Mark job as failed
      if (activeJobIdRef.current) {
        supabase.from('generation_jobs').update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', activeJobIdRef.current).then(() => {});
        activeJobIdRef.current = null;
      }
      // Reset plan on error
      setShowPlan(false);
      resetPlan();
      return [];
    } finally {
      clearTimeout(resetTimeout);
      setIsGenerating(false);
      setThinkingContext('general'); // Reset context
      setGenerationProgress(null);
    }
  };
  const handleIterationSelect = async (iteration: {
    url: string;
    prompt: string;
    filePath?: string; // FIX 4: Accept filePath
  }, batchIndex?: number) => {
    // Fix 2: Log filePath before adding to canvas
    console.log('🎯 ITERATION SELECTED FOR CANVAS:', {
      hasFilePath: !!iteration.filePath,
      filePath: iteration.filePath,
      prompt: iteration.prompt?.substring(0, 80),
      urlExists: !!iteration.url
    });
    if (!iteration.filePath) {
      console.error('❌ CRITICAL: iteration.filePath is NULL - image will not persist!', {
        iteration
      });
    }
    console.log('🎯 ADD TO CANVAS CLICKED:', {
      url: iteration.url ? 'present' : 'MISSING',
      prompt: iteration.prompt,
      hasOnDesignGenerated: !!onDesignGenerated,
      artboardsProp: artboards,
      artboardsLength: artboards?.length,
      batchIndex,
      currentAddedCount: addedImagesCount
    });
    if (!iteration.url) {
      console.error('❌ No URL provided for iteration');
      toast({
        title: 'Error',
        description: 'Invalid design URL',
        variant: 'destructive'
      });
      return;
    }
    if (!onDesignGenerated) {
      console.error('❌ onDesignGenerated callback not provided');
      toast({
        title: 'Error',
        description: 'Canvas integration not available',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    try {
      // Calculate gridIndex: use batchIndex if provided, otherwise use counter
      const gridIndex = batchIndex !== undefined ? batchIndex : addedImagesCount;
      console.log('✨ Adding image to canvas with gridIndex:', gridIndex);
      const result = await onDesignGenerated(iteration.url, iteration.prompt || 'Selected Design', undefined,
      // Let Canvas calculate position with gridIndex
      undefined, undefined,
      // No artboard ID
      false,
      // Not a placeholder
      true,
      // Direct to canvas - no artboard wrapper
      gridIndex,
      // Pass grid index for proper positioning
      iteration.filePath // FIX 4: Pass file_path for persistence
      );
      if (!result) {
        throw new Error('Failed to add image to canvas');
      }

      // Only increment counter if not part of batch operation
      if (batchIndex === undefined) {
        setAddedImagesCount(prev => prev + 1);
      }
      console.log('✅ Image successfully added to canvas at grid position:', gridIndex);

      // Only show message if not batch operation
      if (batchIndex === undefined) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✨ Perfect! I\'ve added your selected design directly to the canvas.'
        }]);
      }
      toast({
        title: 'Success!',
        description: 'Image added to canvas!'
      });
    } catch (error) {
      console.error('❌ Error adding image to canvas:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add image to canvas.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleGenerateDesign = async (prompt: string, rationale: string) => {
    setIsGenerating(true);

    // Add a message showing the AI is generating
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Great! I'm generating your design now based on: ${rationale}\n\nThis may take a moment...`
    }]);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-design', {
        body: {
          prompt
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      const imageUrl = data.imageUrl;

      // Add the design to canvas
      await onDesignGenerated(imageUrl, 'Generated Design');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✨ Your design is ready! I\'ve added it to the canvas. What do you think? Would you like me to iterate on it or create something else?'
      }]);
      notifyAiComplete({
        source: 'canvas',
        status: 'success',
        title: 'Design ready',
        message: 'Added to canvas.',
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate design. Please try again.',
        variant: 'destructive'
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating the design. Could you try again?'
      }]);
      notifyAiComplete({
        source: 'canvas',
        status: 'error',
        title: 'Design failed',
        message: error?.message || 'Failed to generate design.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleReset = () => {
    console.log('🔄 Resetting chat - instant UI clear');

    // Clear UI state FIRST (instant)
    setMessages([]);
    setConversationContext({});
    setShownReferenceIds(new Set());
    setActiveSkill(null);
    setIsSkillMode(false);
    setSkillStepIndex(0);
    setSkillFieldValues({});
    setIsGenerating(false);
    setGenerationProgress(null);
    setGenerationStartTime(null);
    resetPlan();
    
    toast({
      title: 'Chat reset',
      description: 'Started fresh conversation'
    });

    // DB insert in background (non-blocking)
    supabase.from('conversations').insert({
      user_id: userId,
      project_id: projectId,
      title: `New ${new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    }).select().single().then(({ data: newConv, error }) => {
      if (error) {
        console.error('❌ Failed to create new conversation:', error);
        return;
      }
      console.log('✅ Created new conversation:', newConv.id);
      setConversationId(newConv.id);
    });
  };
  const handleAutoGenerate = async (designType: string, brandInfo: any, styleKeywords: string, referenceImageUrl?: string) => {
    try {
      // FIX: Build comprehensive prompt with all available context
      const brandName = brandInfo?.name || 'design';
      const industry = brandInfo?.industry || '';
      const audience = brandInfo?.audience || '';

      // Build rich, detailed prompt
      const basePrompt = [`${designType} design for ${brandName}`, industry && `${industry} industry`, audience && `targeting ${audience}`, styleKeywords, 'professional high-quality modern 2025 design'].filter(Boolean).join(', ');
      const iterations = 1;
      console.log('🎨 Auto-generating with:', {
        basePrompt,
        referenceImageUrl: !!referenceImageUrl
      });
      const results = await generateIterations(basePrompt, iterations, referenceImageUrl);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: `✨ Here are ${results.length} ${designType} concepts based on your style!`,
          designIterations: results,
          pendingApproval: true
        }];
      });

      // CRITICAL: Save iterations to database
      if (conversationIdRef.current && results.length > 0) {
        console.log('💾 Saving auto-generated iterations to database:', results.length);
        await supabase.from('messages').insert({
          conversation_id: conversationIdRef.current,
          user_id: userId,
          role: 'assistant',
          content: `✨ Here are ${results.length} ${designType} concepts based on your style!`,
          metadata: {
            design_iterations: results,
            design_type: designType,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Add follow-up options
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '💬 **What would you like to do next?**',
          options: ['Generate more variations', 'Try a different style', 'Edit one of these', 'I love these!']
        }]);
      }, 1000);
    } catch (error) {
      console.error('Auto-generation error:', error);
      setMessages(prev => prev.filter(m => !m.isThinking));
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate designs. Please try again.',
        variant: 'destructive'
      });
    }
  };
  const handleQuickAction = async (action: string) => {
    
    // Handle "Start over" - reset conversation
    if (action.toLowerCase() === 'start over') {
      setConversationContext({});
      setMessages([{
        role: 'assistant',
        content: '🔄 Let\'s start fresh! What would you like to create today?',
        options: quickActions
      }]);
      return;
    }
    
    // Handle satisfaction / exit
    if (action.toLowerCase().includes('satisfied') || action.toLowerCase().includes('perfect') || action.toLowerCase().includes('these are great') || action.toLowerCase().includes("i'm satisfied")) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: action
      }, {
        role: 'assistant',
        content: '🎉 **Awesome!** Your designs are ready on the canvas.\n\n**Next steps:**\n• Use canvas tools to refine and edit\n• Export your designs\n• Start a new project anytime!\n\nNeed anything else?',
        options: ['Start a new design project', 'Export these designs', 'Teach me canvas tools']
      }]);

      // Clear generation context to allow fresh start
      setConversationContext(prev => ({
        ...prev,
        autoGeneratePrompt: undefined,
        designType: undefined,
        requestType: undefined,
        styleKeywords: []
      }));
      return;
    }

    // Handle "Generate without references" option (from fallback when no refs found)
    if (action.toLowerCase().includes('generate without references') || action.toLowerCase().includes('generate logo without references')) {
      const designType = conversationContext.designType || 'design';
      const brandInfo = conversationContext.brandInfo;
      const brandName = brandInfo?.name || 'your brand';
      const styleKeywords = Array.isArray(conversationContext.styleKeywords) 
        ? conversationContext.styleKeywords.join(' ') 
        : conversationContext.styleKeywords || '';
      
      let basePrompt = '';
      let iterationCount = 1;
      
      switch (designType.toLowerCase()) {
        case 'logo':
          basePrompt = `Professional, modern logo design for "${brandName}"${brandInfo?.industry ? ` in the ${brandInfo.industry} industry` : ''}. Clean, versatile, memorable logomark suitable for digital and print applications.`;
          break;
        case 'branding':
          basePrompt = `Complete brand identity system for "${brandName}"${brandInfo?.industry ? ` in the ${brandInfo.industry} industry` : ''}. Include logo variations, color palette, and typography.`;
          break;
        case 'identity':
          basePrompt = `Creative identity design for "${brandName}"${styleKeywords ? `. Style: ${styleKeywords}` : ''}. Bold typography, striking visuals, professional composition.`;
          break;
        case 'concept':
          basePrompt = `Original concept design for "${brandName}"${styleKeywords ? `. Style: ${styleKeywords}` : ''}. Expressive, memorable, suitable for branding.`;
          break;
        case 'illustration':
          basePrompt = `Professional illustration for "${brandName}"${styleKeywords ? `. Style: ${styleKeywords}` : ''}. High-quality, detailed artwork.`;
          break;
        case 'campaign':
          basePrompt = `Marketing campaign visuals for "${brandName}"${brandInfo?.industry ? ` in the ${brandInfo.industry} industry` : ''}. Cohesive, impactful, conversion-focused design.`;
          break;
        default:
          basePrompt = `Professional ${designType} design for "${brandName}"${styleKeywords ? `. Style: ${styleKeywords}` : ''}`;
      }

      setMessages(prev => [...prev, {
        role: 'user',
        content: action
      }]);

      // Show thinking indicator
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: `✨ Generating ${iterationCount} ${designType} designs for ${brandName} (using AI knowledge)...`,
          isThinking: true
        }];
      });

      try {
        const iterations = await generateIterations(basePrompt, iterationCount, undefined, false, {
          brandName,
          industry: brandInfo?.industry,
          audience: brandInfo?.audience,
          styleKeywords: styleKeywords
        });

        if (iterations.length > 0) {
          const resultMessage = `Created ${iterations.length} ${designType} design${iterations.length > 1 ? 's' : ''} for ${brandName}!\n\nSelect your favorites to add to canvas:`;
          
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant',
              content: resultMessage,
              designIterations: iterations,
              pendingApproval: true
            }];
          });

          // Save to database
          if (conversationIdRef.current) {
            await supabase.from('messages').insert({
              conversation_id: conversationIdRef.current,
              user_id: userId,
              role: 'assistant',
              content: resultMessage,
              metadata: {
                design_iterations: iterations,
                design_type: designType,
                brand_name: brandName,
                generated_without_references: true,
                timestamp: new Date().toISOString()
              }
            });
          }
        } else {
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant',
              content: '❌ Failed to generate designs. Please try again.',
              options: ['Retry generation', 'Try a different design type']
            }];
          });
        }
      } catch (error) {
        console.error('Generate without references error:', error);
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isThinking);
          return [...filtered, {
            role: 'assistant',
            content: '❌ An error occurred during generation. Please try again.',
            options: ['Retry generation', 'Try a different design type']
          }];
        });
      }
      
      // Clear pending flag
      setConversationContext(prev => ({
        ...prev,
        pendingGenerateWithoutRefs: false
      }));
      return;
    }

    // Handle "Upload my own references" option
    if (action.toLowerCase().includes('upload my own references') || action.toLowerCase().includes('upload my own logo references')) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: action
      }, {
        role: 'assistant',
        content: '📤 **Upload your reference images**\n\nDrag and drop or click to upload 1-5 images that represent your desired style. I\'ll analyze them and generate designs inspired by your references.',
        options: ['I\'ve uploaded my references', 'Skip and generate without references']
      }]);
      // The upload functionality is already available in the chat input
      return;
    }

    // Handle "Try a different design type" option
    if (action.toLowerCase().includes('try a different design type') || action.toLowerCase().includes('try branding instead')) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: action
      }, {
        role: 'assistant',
        content: 'Sure! What type of design would you like to create?',
        options: quickActions
      }]);
      return;
    }
    if (action === 'Generate without specific style' && conversationContext.autoGeneratePrompt) {
      const {
        brandName,
        designType,
        requestType
      } = conversationContext.autoGeneratePrompt;
      const data = conversationContext;
      let basePrompt = '';
      let iterationCount = 1;
      switch (designType) {
        case 'logo':
          basePrompt = `Professional logo design for ${brandName}`;
          break;
        case 'branding':
          basePrompt = requestType === 'brand_guidelines' ? `Complete brand guidelines for ${brandName} with logo, colors, typography` : `Professional logo variations for ${brandName}`;
          break;
        case 'identity':
          basePrompt = `${brandName} identity design`;
          break;
        case 'concept':
          basePrompt = `${brandName} concept design`;
          break;
        case 'illustration':
          basePrompt = `${brandName} illustration`;
          break;
        default:
          basePrompt = `${brandName} design`;
      }

      // Fix 5: Filter thinking messages before adding
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: `✨ Generating ${iterationCount} ${designType} variations for ${brandName}...`,
          isThinking: true
        }];
      });
      setTimeout(async () => {
        try {
          const iterations = await generateIterations(basePrompt, iterationCount, data.referenceImageUrl, requestType === 'brand_guidelines', {
            brandName,
            industry: data.brandInfo?.industry,
            audience: data.brandInfo?.audience,
            styleKeywords: data.styleKeywords
          });
          const requestedCount = 1;
          const failedCount = requestedCount - iterations.length;
          if (iterations.length > 0) {
            const resultMessage = failedCount > 0 ? `I've created ${iterations.length} out of ${requestedCount} ${data.designType} variations for ${brandName} (${failedCount} failed). Select your favorites to add to canvas!` : `I've created ${iterations.length} ${data.designType} variations for ${brandName}. Select your favorites to add to canvas!`;
            setMessages(prev => {
              const filtered = prev.filter(m => !m.isThinking);
              return [...filtered, {
                role: 'assistant',
                content: resultMessage,
                designIterations: iterations,
                pendingApproval: true,
                ...(failedCount > 0 && {
                  options: ['Retry Failed Variations', 'Continue with These']
                })
              }];
            });

            // CRITICAL: Save iterations to database
            if (conversationIdRef.current) {
              console.log('💾 Saving brand design iterations to database:', iterations.length);
              await supabase.from('messages').insert({
                conversation_id: conversationIdRef.current,
                user_id: userId,
                role: 'assistant',
                content: resultMessage,
                metadata: {
                  design_iterations: iterations,
                  design_type: data.designType,
                  brand_name: brandName,
                  timestamp: new Date().toISOString()
                }
              });
            }
          } else {
            throw new Error('All design generations failed. This might be due to rate limits or AI service issues. Please try again in a moment.');
          }
        } catch (error) {
          console.error('❌ Error generating iterations:', error);
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isThinking);
            return [...filtered, {
              role: 'assistant',
              content: 'Sorry, I encountered an error while generating designs. This might be due to rate limits or AI service issues. Please try again in a moment.'
            }];
          });
        }
      }, 500);
      return;
    }

    // Handle "Generate Designs Now" button
    if (action === 'Generate Designs Now' && conversationContext.designType && conversationContext.brandInfo) {
      const brandName = conversationContext.brandInfo.name || 'your brand';
      const industry = conversationContext.brandInfo.industry || 'business';
      const audience = conversationContext.brandInfo.audience || 'customers';
      const location = conversationContext.brandInfo.location || '';
      const styleKeywordsArray = Array.isArray(conversationContext.styleKeywords) ? conversationContext.styleKeywords : conversationContext.styleKeywords ? conversationContext.styleKeywords.split(' ').filter(Boolean) : [];
      const style = styleKeywordsArray.join(' ') || conversationContext.lastDesignPrompt || 'modern professional';
      const designPrompt = `Create professional ${conversationContext.designType} for ${brandName}, a ${industry} targeting ${audience}. Style: ${style}. ${location ? `Location: ${location}.` : ''} Modern, high-quality, visually striking design.`;
      setMessages(prev => [...prev, {
        role: 'user',
        content: 'Generate designs now'
      }]);

      // Fix 5: Filter thinking messages before adding
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: `Creating ${conversationContext.designType} for ${brandName}...`,
          isThinking: true
        }];
      });
      const iterations = await generateIterations(designPrompt, 1, conversationContext.referenceImageUrl);

      // Calculate failed count
      const requestedCount = 1;
      const failedCount = requestedCount - iterations.length;
      if (iterations.length > 0) {
        const resultMessage = failedCount > 0 ? `I've created ${iterations.length} out of ${requestedCount} ${conversationContext.designType} variations for ${brandName} (${failedCount} failed). Select your favorites!` : `I've created ${iterations.length} ${conversationContext.designType} variations for ${brandName}. Select your favorites!`;
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isThinking);
          return [...filtered, {
            role: 'assistant',
            content: resultMessage,
            designIterations: iterations,
            pendingApproval: true,
            ...(failedCount > 0 && {
              options: ['Retry Failed Variations', 'Continue with These']
            })
          }];
        });

        // CRITICAL: Save iterations to database
        if (conversationIdRef.current) {
          console.log('💾 Saving more variations to database:', iterations.length);
          await supabase.from('messages').insert({
            conversation_id: conversationIdRef.current,
            user_id: userId,
            role: 'assistant',
            content: resultMessage,
            metadata: {
              design_iterations: iterations,
              design_type: conversationContext.designType,
              brand_name: brandName,
              timestamp: new Date().toISOString()
            }
          });
        }
      } else {
        // All failed
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isThinking);
          return [...filtered, {
            role: 'assistant',
            content: 'All design generations failed. This might be due to rate limits or AI service issues. Please try again in a moment.'
          }];
        });
      }
      return;
    }

    // Quick Actions
    if (action === 'Create a Logo') {
      // Guided logo flow
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Tell me a bit about the logo you want — then I’ll show 6 references and generate options.',
          inputFields: [
            { label: 'Brand name', placeholder: 'e.g., Colab', value: conversationContext.brandInfo?.name || '' },
            { label: 'Industry', placeholder: 'e.g., beauty, fintech, fashion', value: conversationContext.brandInfo?.industry || '' },
            { label: 'Target audience', placeholder: 'e.g., Gen Z creators, enterprise teams', value: conversationContext.brandInfo?.audience || '' },
            { label: 'Style keywords', placeholder: 'e.g., minimal, bold, geometric, luxury', value: Array.isArray(conversationContext.styleKeywords) ? conversationContext.styleKeywords.join(' ') : (conversationContext.styleKeywords || '') },
            { label: 'Logo type', placeholder: 'wordmark / monogram / symbol / combination', value: '' },
          ],
        },
      ]));

      setConversationContext(prev => ({
        ...prev,
        designType: 'logo',
        requestType: 'logo',
      }));
      return;
    }

    // Smart questioning flows for all design types
    if (action === 'Create an Identity') {
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Let me gather some details to create the perfect identity for you:',
          inputFields: [
            { label: 'Identity title/headline', placeholder: 'e.g., Brand Strategy 2026', value: '' },
            { label: 'Event or purpose', placeholder: 'e.g., concert, product launch, awareness campaign', value: '' },
            { label: 'Target audience', placeholder: 'e.g., young adults, professionals, families', value: '' },
            { label: 'Style preferences', placeholder: 'e.g., bold & colorful, minimal, vintage, futuristic', value: '' },
            { label: 'Key visual element', placeholder: 'e.g., photo of band, abstract shapes, product image', value: '' },
          ],
        },
      ]));
      setConversationContext(prev => ({ ...prev, designType: 'identity', requestType: 'identity' }));
      return;
    }

    if (action === 'Create a Campaign') {
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Let me understand your campaign needs:',
          inputFields: [
            { label: 'Brand/Product name', placeholder: 'e.g., Nike, iPhone 16, Summer Sale', value: conversationContext.brandInfo?.name || '' },
            { label: 'Campaign objective', placeholder: 'e.g., product launch, brand awareness, seasonal promotion', value: '' },
            { label: 'Target audience', placeholder: 'e.g., Gen Z, working professionals, parents', value: conversationContext.brandInfo?.audience || '' },
            { label: 'Key message/tagline', placeholder: 'e.g., Just Do It, Think Different', value: '' },
            { label: 'Visual style', placeholder: 'e.g., bold, minimal, lifestyle photography, illustrated', value: '' },
          ],
        },
      ]));
      setConversationContext(prev => ({ ...prev, designType: 'campaign', requestType: 'campaign' }));
      return;
    }

    if (action === 'Create an Illustration') {
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Tell me about the illustration you have in mind:',
          inputFields: [
            { label: 'Subject/concept', placeholder: 'e.g., a cozy coffee shop, astronaut on Mars, city skyline', value: '' },
            { label: 'Purpose', placeholder: 'e.g., book cover, editorial, website hero, social media', value: '' },
            { label: 'Art style', placeholder: 'e.g., flat vector, painterly, line art, 3D render, watercolor', value: '' },
            { label: 'Mood/atmosphere', placeholder: 'e.g., warm & cozy, dramatic, playful, mysterious', value: '' },
            { label: 'Color palette', placeholder: 'e.g., warm earth tones, neon colors, monochrome, pastel', value: '' },
          ],
        },
      ]));
      setConversationContext(prev => ({ ...prev, designType: 'illustration', requestType: 'illustration' }));
      return;
    }

    if (action === 'Create an Amazon Listing') {
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Let me set up your Amazon listing design:',
          inputFields: [
            { label: 'Product Name', placeholder: 'e.g., Wireless Earbuds Pro', value: '' },
            { label: 'Category', placeholder: 'e.g., Electronics, Home & Kitchen', value: '' },
            { label: 'Key Selling Points', placeholder: 'e.g., noise cancelling, 24hr battery, waterproof', value: '' },
          ],
        },
      ]));
      setConversationContext(prev => ({ ...prev, designType: 'ecommerce', requestType: 'ecommerce' }));
      return;
    }

    if (action === 'Create a Concept') {
      setMessages(prev => ([
        ...prev,
        { role: 'user', content: action },
        {
          role: 'assistant',
          content: 'Let me understand your concept:',
          inputFields: [
            { label: 'Concept name', placeholder: 'e.g., Max the Explorer, Luna', value: '' },
            { label: 'Concept type', placeholder: 'e.g., mascot, hero, sidekick, villain, cute creature', value: '' },
            { label: 'Personality traits', placeholder: 'e.g., friendly, brave, mischievous, wise, playful', value: '' },
            { label: 'Art style', placeholder: 'e.g., 2D cartoon, 3D Pixar-style, anime, realistic, chibi', value: '' },
            { label: 'Special features', placeholder: 'e.g., wears a cape, has wings, holds a wand, robot parts', value: '' },
          ],
        },
      ]));
      setConversationContext(prev => ({ ...prev, designType: 'concept', requestType: 'concept' }));
      return;
    }

    // CATCH-ALL: Map generic AI-returned options to actionable flows
    const lowerAction = action.toLowerCase().trim();
    
    // "Create a design" / "Create a Design" -> show design type picker
    if (lowerAction === 'create a design' || lowerAction === 'start a new design' || lowerAction === 'new design') {
      setMessages(prev => [...prev, { role: 'user', content: action }, {
        role: 'assistant',
        content: 'What type of design would you like to create?',
        options: quickActions
      }]);
      return;
    }
    
    // "Browse inspiration" -> show inspiration categories
    if (lowerAction.includes('browse inspiration') || lowerAction.includes('get inspired') || lowerAction.includes('show inspiration')) {
      setMessages(prev => [...prev, { role: 'user', content: action }, {
        role: 'assistant',
        content: "I'm TrueVision, your AI product design checker. You can upload an image of a design or product and I will analyze it for you, give you a professional critique, and help you enhance it!",
        isWelcome: true
      }]);
      return;
    }
    
    // "Tell me more" -> explain capabilities
    if (lowerAction === 'tell me more' || lowerAction === 'what can you do' || lowerAction === 'help') {
      setMessages(prev => [...prev, { role: 'user', content: action }, {
        role: 'assistant',
        content: "I'm TrueVision, your AI product design checker. You can upload an image of a design or product and I will analyze it for you, give you a professional critique, and help you enhance it!",
        options: quickActions
      }]);
      return;
    }
    
    // Map partial matches to design types (e.g., "Logo Design" -> "Create a Logo")
    const designTypeMap: Record<string, string> = {
      'logo': 'Create a Logo', 'brand': 'Create a Logo', 'branding': 'Create a Logo',
      'identity': 'Create an Identity', 'flyer': 'Create an Identity', 'banner': 'Create an Identity',
      'campaign': 'Create a Campaign', 'marketing': 'Create a Campaign', 'ad': 'Create a Campaign',
      'illustration': 'Create an Illustration', 'artwork': 'Create an Illustration',
      'concept': 'Create a Concept', 'mascot': 'Create a Concept',
      'social media': 'Create a Campaign', 'instagram': 'Create a Campaign', 'facebook': 'Create a Campaign',
      'amazon': 'Create an Amazon Listing', 'product listing': 'Create an Amazon Listing', 'ecommerce': 'Create an Amazon Listing',
      'app': 'Create an Identity', 'screenshot': 'Create an Identity',
    };
    
    for (const [keyword, mappedAction] of Object.entries(designTypeMap)) {
      if (lowerAction.includes(keyword) && lowerAction !== mappedAction.toLowerCase()) {
        // Recursively handle the mapped action
        handleQuickAction(mappedAction);
        return;
      }
    }

    handleSend(action);
  };

  // Cancel handler for stopping generation
  const handleCancelGeneration = useCallback(() => {
    console.log('🛑 User cancelled generation');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsGenerating(false);
    setGenerationProgress(null);
    setGenerationStartTime(null);
    setThinkingContext('general');
    resetPlan();
    setMessages(prev => {
      const filtered = prev.filter(m => !m.isThinking);
      return [...filtered, {
        role: 'assistant' as const,
        content: '⏹️ Generation cancelled.'
      }];
    });
    toast({ title: 'Generation stopped', description: 'You can start a new request anytime.' });
  }, [resetPlan, toast]);
  if (isMinimized) {
    return <Button onClick={() => setIsMinimized(false)} className="fixed bottom-4 right-4 h-10 w-10 rounded-xl bg-black text-white hover:bg-gray-800">
        <RumiWhiteIcon className="w-6 h-6" />
      </Button>;
  }
  return <div className="fixed bottom-6 right-6 w-[440px] h-[700px] flex flex-col overflow-hidden rounded-3xl bg-white border border-zinc-200">
      <ChatHeader onMinimize={() => setIsMinimized(true)} onHistoryClick={() => setShowHistory(true)} onResetClick={handleReset} onAssetsClick={() => setShowAssets(true)} />

      {showHistory && <ChatHistoryPanel userId={userId} projectId={projectId} currentConversationId={conversationId} onConversationSelect={(convId) => { setConversationId(convId); loadConversationMessages(convId); }} onClose={() => setShowHistory(false)} />}

      {showAssets && <AssetsPanel projectId={projectId} onClose={() => setShowAssets(false)} />}

      <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-white">
        <div className="space-y-4">
          
          {messages.map((message, index) => {
          // Hide thinking indicator when generation plan is showing
          if (message.isThinking && (isGenerating || showPlan) && generationTasks.length > 0) {
            return null;
          }
          if (message.isThinking) {
            return <DynamicThinkingIndicator key={index} context={thinkingContext} isGenerating={isGenerating} modelName={selectedImageModel} startTime={generationStartTime} />;
          }
          return <div key={index}>
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] overflow-hidden rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-zinc-100 text-zinc-900' : 'bg-white text-gray-900'}`}>
                    {/* Show contextual icon ONLY for messages with design iterations, inspirations, or references */}
                    {message.role === 'assistant' && (
                      <>
                        <div className="flex items-start gap-2">
                          {message.designIterations && message.designIterations.length > 0 && (
                            <GeneratedDesignsIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                          )}
                          {message.inspirations && message.inspirations.length > 0 && !message.designIterations?.length && (
                            <ClickInspirationIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                          )}
                          {(message.content.includes('style references') || message.content.includes('Found') || message.content.includes('references for')) && !message.designIterations?.length && !message.inspirations?.length && (
                            <ReferenceFoundIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                          )}
                          
                          <div className="text-sm leading-relaxed font-normal text-gray-900 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-1 prose-strong:font-semibold">
                            <ReactMarkdown>{message.content.replace(/^✅\s*/, '')}</ReactMarkdown>
                          </div>
                        </div>
                        {message.imageAnalysis && (
                          <ProductAnalysisCard 
                            analysis={message.imageAnalysis} 
                            executionPlan={message.executionPlan} 
                          />
                        )}
                      </>
                    )}

                    {/* Research Citations */}
                    {message.researchSources && message.researchSources.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.researchSources.map((source, sIdx) => (
                            <a
                              key={sIdx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors text-xs text-foreground no-underline"
                            >
                              <img src={source.favicon} alt="" className="w-3 h-3 rounded-sm" />
                              <span className="truncate max-w-[140px]">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Think Mode Badge */}
                    {message.role === 'assistant' && thinkModeEnabled && message.designIterations && message.designIterations.length > 0 && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                          🧠 Think mode
                        </span>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="text-sm leading-relaxed font-normal text-zinc-900">
                        {/* Render skill chip + content with asset chips inline */}
                        <span className="inline">
                          {message.selectedSkill && (
                            <>
                              <span className="text-zinc-500">Use </span>
                              <span className="inline-flex items-center gap-1 p-1 rounded border border-zinc-300 bg-white mx-0.5 align-middle">
                                <span className={`text-xs ${message.selectedSkill.color}`}>●</span>
                                <span className="text-xs text-zinc-900">{message.selectedSkill.name}</span>
                              </span>
                              <span className="text-zinc-500"> to create: </span>
                            </>
                          )}
                          {message.taggedAssets && message.taggedAssets.length > 0 ? (
                            (() => {
                              // Replace "Image" placeholders with chips inline
                              const parts = message.content.split(/(Image)/g);
                              let assetIndex = 0;
                              return parts.map((part, idx) => {
                                if (part === 'Image' && assetIndex < message.taggedAssets!.length) {
                                  const asset = message.taggedAssets![assetIndex];
                                  assetIndex++;
                                  return (
                                    <span key={idx} className="inline-flex items-center gap-1 p-1 rounded border border-zinc-300 bg-white mx-0.5 align-middle">
                                      <img src={asset.thumbnailUrl} className="w-4 h-4 rounded object-cover" alt={asset.name} />
                                      <span className="text-xs text-zinc-900">Image</span>
                                    </span>
                                  );
                                }
                                return <span key={idx}>{part}</span>;
                              });
                            })()
                          ) : message.content}
                        </span>
                      </div>
                    )}
                    
                    {/* Video Message */}
                    {message.videoStatus && <div className="mt-3">
                        <VideoMessage videoUrl={message.videoUrl} videoStatus={message.videoStatus} videoJobId={message.videoJobId} videoDuration={message.videoDuration} videoError={message.videoError} onStatusUpdate={(status, videoUrl, error) => handleVideoStatusUpdate(index, status, videoUrl, error)} />
                      </div>}

                    {/* Combined Inspirations - Image Grid with Click Handlers */}
                    {message.inspirations && message.inspirations.length > 0 && <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <ClickInspirationIcon className="w-6 h-6 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground font-medium">Click any image to generate designs in that style</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {message.inspirations.map((inspiration: any, idx: number) => <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary hover:shadow-md cursor-pointer group" style={{
                      borderColor: selectedReferenceImage === inspiration.url ? 'hsl(var(--primary))' : '#e5e7eb'
                    }} onClick={() => {
                      setSelectedReferenceImage(inspiration.url);
                      const designType = message.designType || conversationContext.designType;
                      const projectName = message.brandInfo?.name || conversationContext.brandInfo?.name || 'your project';
                      const styleKeywords = conversationContext.styleKeywords || message.styleKeywords || '';

                      // Show confirmation dialog instead of immediate generation
                      setPendingInspirationGeneration({
                        inspirationUrl: inspiration.url,
                        designType,
                        projectName,
                        styleKeywords: Array.isArray(styleKeywords) ? styleKeywords.join(', ') : styleKeywords
                      });
                      setShowGenerationConfirmation(true);
                    }}>
                              <img src={inspiration.url} alt={inspiration.title || 'Inspiration'} className="w-full h-full object-cover transition-transform group-hover:scale-105" crossOrigin="anonymous" onError={e => {
                        const target = e.target as HTMLImageElement;
                        if (target.crossOrigin) {
                          target.crossOrigin = '';
                          target.src = inspiration.url;
                        }
                      }} />
                              {/* Tag chips removed (per request) */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                <div className={`w-6 h-6 rounded-full border-2 border-white transition-all ${selectedReferenceImage === inspiration.url ? 'bg-primary scale-110' : 'bg-transparent scale-0 group-hover:scale-100'}`} />
                              </div>
                            </div>)}
                        </div>
                      </div>}
                    
                    {/* Pinterest carousel removed */}

                    {/* Uploaded images preview */}
                    {message.uploadedImages && message.uploadedImages.length > 0 && <div className="flex gap-2 mt-3 flex-wrap">
                        {message.uploadedImages.map((url: string, idx: number) => <img key={idx} src={url} alt={`Uploaded ${idx + 1}`} className="w-32 h-32 object-cover rounded-lg border border-gray-200" />)}
                      </div>}

                    {/* Design iterations - Carousel with view/select controls */}
                    {message.designIterations && message.designIterations.length > 0 && <div className="mt-3 w-full">
                        <div className="relative w-full">
                          <Carousel className="w-full" opts={{
                      align: "start",
                      loop: false
                    }}>
                            <CarouselContent className="-ml-2">
                              {message.designIterations.map((iteration, iterIndex) => <CarouselItem key={iterIndex} className="pl-2 basis-full md:basis-1/2 lg:basis-1/3">
                                  <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden transition-all border-2 border-border hover:border-primary hover:shadow-lg group bg-white">
                                    {iteration.type && <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                                        {iteration.type}
                                      </div>}
                                    <img src={iteration.url} alt={iteration.prompt || `Design ${iterIndex + 1}`} className="w-full h-full object-cover" />
                                    
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <div className="flex gap-2">
                                        <button onClick={() => setFullViewImage({
                                  url: iteration.url,
                                  index: iterIndex,
                                  iterations: message.designIterations || []
                                })} className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all">
                                          <Eye className="w-4 h-4 text-gray-900" />
                                        </button>
                                        <button onClick={() => handleIterationSelect(iteration)} className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all">
                                          <Check className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {iteration.prompt && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                        <p className="text-white text-[10px] line-clamp-2">
                                          {iteration.prompt}
                                        </p>
                                      </div>}
                                  </div>
                                </CarouselItem>)}
                            </CarouselContent>
                            <CarouselPrevious className="left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/95 hover:bg-white shadow-lg border-2" />
                            <CarouselNext className="right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/95 hover:bg-white shadow-lg border-2" />
                          </Carousel>
                          
                          {/* Add All to Canvas Button */}
                          <div className="mt-3 flex justify-center">
                            <Button onClick={async () => {
                        const iterations = message.designIterations || [];
                        if (iterations.length === 0) return;
                        setIsLoading(true);
                        for (let i = 0; i < iterations.length; i++) {
                          await handleIterationSelect(iterations[i], i);
                        }

                        // Update counter for batch
                        setAddedImagesCount(prev => prev + iterations.length);
                        setMessages(prev => [...prev, {
                          role: 'assistant',
                          content: `✨ Perfect! I've added all ${iterations.length} designs to your canvas in a neat grid layout.`
                        }]);
                        setIsLoading(false);
                      }} variant="outline" size="sm" disabled={isLoading} className="gap-2">
                              <Check className="w-4 h-4" />
                              Add All {message.designIterations?.length || 0} to Canvas
                            </Button>
                          </div>
                        </div>
                      </div>}
                  </div>
                </div>

                {message.inputFields && message.role === 'assistant' && <InputFieldsCard fields={message.inputFields} onSubmit={answers => {
              // Combine all answers into one message
              const combinedAnswer = answers.map((answer, idx) => `${message.inputFields![idx].label}: ${answer}`).filter(a => a.includes(':') && a.split(':')[1].trim()).join(', ');
              if (combinedAnswer) {
                handleSend(combinedAnswer);
              }
            }} disabled={isLoading || isGenerating} />}
                
                {message.options && message.role === 'assistant' && <div className="max-w-full overflow-hidden">
                    <OptionButtons options={message.options} onSelect={handleQuickAction} disabled={isLoading || isGenerating} />
                  </div>}
              </div>;
        })}
          
          {/* TrueVision Empty State - Upload Button */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to TrueVision</h2>
              <p className="text-muted-foreground mb-8 max-w-md">Upload an image of your product or design to get an instant professional critique and AI enhancement.</p>
              
              <label className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-medium shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl flex items-center gap-3">
                <ImagePlus className="w-5 h-5" />
                Upload Image for TrueVision Check
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleSend("Please analyze this design and tell me if it's correct or what needs enhancement.", [file]);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {/* Completed Plan Snapshot - persistent collapsible container after generation */}
          {completedSnapshot && completedSnapshot.length > 0 && !isGenerating && (
            <div className="w-full">
              <Collapsible defaultOpen={false}>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">Workflow Complete — {completedSnapshot.length} Steps</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); clearSnapshot(); }} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-3 space-y-1">
                      {completedSnapshot.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 py-1">
                          <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs text-muted-foreground">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          )}

          {/* Active Generation Plan - collapsible container with real ETA countdown */}
          {(isGenerating || showPlan) && generationTasks.length > 0 && (
            <div className="w-full">
              <Collapsible defaultOpen={true}>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      <span className="text-xs font-semibold text-foreground">Execution Plan</span>
                    </div>
                    {isGenerating && generationStartTime && (
                      <GenerationTimer startTime={generationStartTime} deadlineMs={180000} progress={generationProgress} />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2">
                      <AgentPlan 
                        tasks={generationTasks} 
                        compact={true}
                        defaultExpandedTasks={getExpandedTaskIds()}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Video Generation Controls */}
      {selectedModel === 'azure/sora' && <div className="mb-4">
          <VideoGenerationControls duration={videoDuration} onDurationChange={setVideoDuration} aspectRatio={videoAspectRatio} onAspectRatioChange={setVideoAspectRatio} estimatedCredits={videoDuration * 10} userCredits={videoCredits.balance} />
        </div>}

      <ChatInput onSend={handleSend} disabled={isLoading || isGenerating} placeholder={selectedModel === 'azure/sora' ? "Describe the video you want to generate..." : "Describe your idea or ask a question... (@ to tag canvas assets)"} selectedModel={selectedModel} onModelChange={setSelectedModel} selectedImageModel={selectedImageModel} onImageModelChange={setSelectedImageModel} selectedBrandSystem={brandSystem} onBrandSystemChange={setBrandSystem} canvasInstance={canvasInstance} thinkMode={thinkModeEnabled} onThinkModeChange={setThinkModeEnabled} webSearchEnabled={webSearchEnabled} onWebSearchChange={setWebSearchEnabled} selectedSkill={activeSkill} onSkillRemove={handleSkillRemove} onCancel={(isLoading || isGenerating) ? handleCancelGeneration : undefined} />
      
      {/* Full View Dialog with Navigation */}
      <Dialog open={!!fullViewImage} onOpenChange={() => setFullViewImage(null)}>
        <DialogContent className="max-w-6xl p-0 bg-black">
          <div className="relative">
            {/* Close Button */}
            <Button variant="ghost" size="sm" className="absolute top-4 right-4 z-20 h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white rounded-full" onClick={() => setFullViewImage(null)}>
              <X className="h-5 w-5" />
            </Button>
            
            {fullViewImage && <>
                {/* Main Image */}
                <img src={fullViewImage.url} alt="Full view" className="w-full h-auto max-h-[85vh] object-contain" />
                
                {/* Previous Button */}
                {fullViewImage.index > 0 && <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white rounded-full" onClick={() => {
              const newIndex = fullViewImage.index - 1;
              setFullViewImage({
                url: fullViewImage.iterations[newIndex].url,
                index: newIndex,
                iterations: fullViewImage.iterations
              });
            }}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>}
                
                {/* Next Button */}
                {fullViewImage.index < fullViewImage.iterations.length - 1 && <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-white/10 hover:bg-white/20 text-white rounded-full" onClick={() => {
              const newIndex = fullViewImage.index + 1;
              setFullViewImage({
                url: fullViewImage.iterations[newIndex].url,
                index: newIndex,
                iterations: fullViewImage.iterations
              });
            }}>
                    <ChevronRight className="h-6 w-6" />
                  </Button>}
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {fullViewImage.index + 1} / {fullViewImage.iterations.length}
                </div>
              </>}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Generation Confirmation Dialog */}
      {showGenerationConfirmation && pendingInspirationGeneration && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Confirm Generation</h3>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Selected Style Reference:</p>
              <img src={pendingInspirationGeneration.inspirationUrl} alt="Selected style" className="w-full h-32 object-cover rounded-lg border border-border" />
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Design Type:</p>
              <p className="text-sm font-medium text-foreground">{pendingInspirationGeneration.designType}</p>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                <strong>Cost:</strong> This will generate 1 variation and deduct 10 credits
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
            setShowGenerationConfirmation(false);
            setPendingInspirationGeneration(null);
          }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={async () => {
            setShowGenerationConfirmation(false);
            const {
              inspirationUrl,
              designType,
              projectName,
              styleKeywords
            } = pendingInspirationGeneration;
            setIsGenerating(true);
            let basePrompt = `Professional ${designType || 'design'} for ${projectName}, ${styleKeywords}`;

            // Fix 5: Filter thinking messages before adding
            setMessages(prev => {
              const filtered = prev.filter(m => !m.isThinking);
              return [...filtered, {
                role: 'assistant',
                content: `✨ Generating ${designType || 'design'} variations based on your selected style...`,
                isThinking: true
              }];
            });
            const iterations = await generateIterations(basePrompt, 5, inspirationUrl);
            if (iterations.length > 0) {
              setMessages(prev => {
                const filtered = prev.filter(m => !m.isThinking);
                return [...filtered, {
                  role: 'assistant',
                  content: `I've created ${iterations.length} ${designType} variations. Select your favorites!`,
                  designIterations: iterations,
                  pendingApproval: true
                }];
              });

              // CRITICAL: Save iterations to database
              if (conversationIdRef.current && iterations.length > 0) {
                console.log('💾 Saving pending inspiration iterations to database:', iterations.length);
                await supabase.from('messages').insert({
                  conversation_id: conversationIdRef.current,
                  user_id: userId,
                  role: 'assistant',
                  content: `I've created ${iterations.length} ${designType} variations. Select your favorites!`,
                  metadata: {
                    design_iterations: iterations,
                    design_type: designType,
                    timestamp: new Date().toISOString()
                  }
                });
              }
            } else {
              setMessages(prev => {
                const filtered = prev.filter(m => !m.isThinking);
                return [...filtered, {
                  role: 'assistant',
                  content: 'Design generation failed. Please try again.'
                }];
              });
            }
            setIsGenerating(false);
            setPendingInspirationGeneration(null);
          }} className="flex-1">
                Generate (50 credits)
              </Button>
            </div>
          </div>
        </div>}
    </div>;
};
export default ChatInterface;