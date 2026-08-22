import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Zap, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePromptHistory } from '@/stores/promptHistoryStore';
import { UploadSelectMenu } from './UploadSelectMenu';
import { UploadedAssetPreview } from './UploadedAssetPreview';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import ModelSelector from '@/components/chat/ModelSelector';
import { FormatSelector } from './FormatSelector';
import { ResolutionSelector } from './ResolutionSelector';
import type { UploadedAsset } from '@/types/uploadedAsset';
import type { PinTag } from '@/types/pinTag';
import { PinTag as PinTagComponent } from './PinTag';
import { PinTagChip } from './PinTagChip';
import { ObjectMarkedPopover } from './ObjectMarkedPopover';
import { AssetTaggingPopup, type CanvasAsset } from './AssetTaggingPopup';
import { ImageEditingPopup, type ImageEditCommand } from './ImageEditingPopup';
import { useAiAccess } from '@/contexts/AiAccessContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CanvasAIChatProps {
  selectedObjects: any[];
  onClose: () => void;
  onAddImage: (imageUrl: string) => void;
  projectId: string;
  position: {
    x: number;
    y: number;
  };
  placeholderMode?: boolean;
  onPlaceholderComplete?: (imageUrl: string) => void;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
  canvasInstance?: any | null;
  onGenerationStateChange?: (isGenerating: boolean) => void;
  isPinMode?: boolean;
  onPinModeChange?: (enabled: boolean) => void;
  pinTags?: PinTag[];
  onPinTagsChange?: (tags: PinTag[]) => void;
  // Aspect ratio control props
  selectedFormat?: string;
  selectedResolution?: string;
  onFormatChange?: (format: string, dimensions: { width: number; height: number }) => void;
  onResolutionChange?: (resolution: string) => void;
}

const CanvasAIChat = ({
  selectedObjects,
  onClose,
  onAddImage,
  projectId,
  position,
  placeholderMode = false,
  onPlaceholderComplete,
  selectedImageModel = 'google/gemini-3-pro-image-preview',
  onImageModelChange,
  canvasInstance = null,
  onGenerationStateChange,
  isPinMode = false,
  onPinModeChange,
  pinTags = [],
  onPinTagsChange,
  selectedFormat = '9:16',
  selectedResolution = '1K',
  onFormatChange,
  onResolutionChange
}: CanvasAIChatProps) => {
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userId, setUserId] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  // Removed textareaRef - using contentEditableRef instead
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Error deduplication state
  const [lastError, setLastError] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);

  // Conversation history state
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
  }>>([]);

  // Pin tag state (local if not controlled)
  const [localPinTags, setLocalPinTags] = useState<PinTag[]>([]);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [hasImageSelected, setHasImageSelected] = useState(false);

  // @ Asset tagging state
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [taggedAssets, setTaggedAssets] = useState<CanvasAsset[]>([]);
  const [hoveredAsset, setHoveredAsset] = useState<CanvasAsset | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // / Image editing command state (only for Canvas AI Chat, not Image Generator)
  const [showSlashPopup, setShowSlashPopup] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [editCommands, setEditCommands] = useState<ImageEditCommand[]>([]);

  // Use controlled or local state for pin tags
  const currentPinTags = onPinTagsChange ? pinTags : localPinTags;
  const setPinTags = onPinTagsChange || setLocalPinTags;

  const {
    uploadMultiple,
    deleteAsset,
    uploading,
    uploadProgress
  } = useAssetUpload(projectId, userId);

  // Fetch credits and user info
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const {
          data
        } = await supabase.from('credits').select('balance').eq('user_id', user.id).single();
        if (data) setCredits(data.balance);

        // Load existing uploaded assets for this project
        const {
          data: assets
        } = await supabase.from('uploaded_assets').select('*').eq('project_id', projectId).eq('user_id', user.id).order('created_at', {
          ascending: false
        });
        if (assets) setUploadedAssets(assets);
      }
    };
    fetchUserData();
  }, [projectId]);

  // Track selected image for pin tool and filtering pins
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!canvasInstance) return;
    const checkSelection = () => {
      const activeObj = canvasInstance.getActiveObject();
      const isImage = activeObj && activeObj.type === 'image';
      setHasImageSelected(isImage);
      setSelectedImageId(isImage ? (activeObj.objectId || activeObj.id || null) : null);
    };

    checkSelection();
    canvasInstance.on('selection:created', checkSelection);
    canvasInstance.on('selection:updated', checkSelection);
    canvasInstance.on('selection:cleared', () => {
      setHasImageSelected(false);
      setSelectedImageId(null);
    });
    return () => {
      canvasInstance.off('selection:created', checkSelection);
      canvasInstance.off('selection:updated', checkSelection);
      canvasInstance.off('selection:cleared', checkSelection);
    };
  }, [canvasInstance]);

  useEffect(() => {
    contentEditableRef.current?.focus();
    return () => {
      if (abortControllerRef.current) {
        console.log('🛑 Component unmounting - aborting generation');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Notify parent when generation state changes
  useEffect(() => {
    onGenerationStateChange?.(isLoading);
  }, [isLoading, onGenerationStateChange]);

  // Fetch suggestion when prompt changes
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    if (prompt.trim().length > 10 && !isLoading) {
      suggestionTimeoutRef.current = setTimeout(() => {
        fetchSuggestion();
      }, 500);
    } else {
      setSuggestion('');
    }
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [prompt, isLoading]);

  // Retry helper with exponential backoff
  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 2) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        console.log(`🔄 Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
        if (error.message?.includes('insufficient_credits') || error.message?.includes('402') || error.message?.includes('401') || error.message?.includes('Session expired')) {
          throw error;
        }
        if (attempt === maxRetries - 1) {
          throw error;
        }
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  const fetchSuggestion = async () => {
    if (isLoadingSuggestion) return;
    setIsLoadingSuggestion(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const selectedImages = selectedObjects.filter(obj => obj.type === 'image');
      const {
        data,
        error
      } = await supabase.functions.invoke('prompt-suggest', {
        body: {
          currentPrompt: prompt,
          selectedImages: selectedImages.length > 0 ? selectedImages.map(img => ({
            src: img.getSrc?.() || img._originalElement?.src
          })) : null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      if (data?.suggestion) {
        setSuggestion(' ' + data.suggestion);
      }
    } catch (error) {
      console.error('Error fetching suggestion:', error);
      setSuggestion('');
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Format prompt with pin tag context
  const formatPromptWithTags = (userPrompt: string, tags: PinTag[]) => {
    if (tags.length === 0) return userPrompt;

    const tagDescriptions = tags.map(t => 
      `Pin ${t.number} at (${Math.round(t.x * 100)}%, ${Math.round(t.y * 100)}%): "${t.label}"`
    ).join('\n');

    return `The user has marked these objects in the image:\n${tagDescriptions}\n\nUser request: ${userPrompt}`;
  };

  const { requireAi } = useAiAccess();
  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    if (!(await requireAi())) return;

    // Format prompt with pin tags if any
    const formattedPrompt = formatPromptWithTags(prompt.trim(), currentPinTags);
    const userPrompt = prompt.trim();
    
    // Include width/height from fabric.js objects for aspect ratio preservation
    const selectedFabricImages = selectedObjects.filter(obj => obj.type === 'image').map(img => {
      const naturalW = (img as any)._originalElement?.naturalWidth || (img as any).width || 0;
      const naturalH = (img as any)._originalElement?.naturalHeight || (img as any).height || 0;
      return {
        src: (img as any).getSrc?.() || (img as any)._originalElement?.src,
        width: Math.round(naturalW),
        height: Math.round(naturalH)
      };
    }).filter(i => i.src);
    const allImages = [
      ...selectedFabricImages,
      ...uploadedAssets.map(asset => ({ src: asset.storage_url, uploaded: true }))
    ];

    // Derive selected image's true aspect ratio for edit mode
    const primarySelected = selectedFabricImages[0];
    const editAspectRatio = primarySelected && primarySelected.width && primarySelected.height
      ? `${primarySelected.width}:${primarySelected.height}`
      : undefined;
    const isEditingSelected = selectedFabricImages.length === 1;

    if (abortControllerRef.current) {
      console.log('🛑 Cancelling previous generation');
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const {
      addItem,
      updateItem
    } = usePromptHistory.getState();

    const newMessages = [...messages, {
      role: 'user',
      content: userPrompt
    }];

    // In placeholder mode, always generate single image
    if (placeholderMode && onPlaceholderComplete) {
      const historyId = addItem({
        projectId: projectId,
        prompt: userPrompt,
        status: 'queued',
        imageCount: 1
      });
      setPrompt('');
      setSuggestion('');
      setIsLoading(true);
      updateItem(historyId, {
        status: 'generating'
      });
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please log in again.');
        }
        const filteredImages = allImages.filter(img => {
          if (!img.src) return false;
          if (typeof img.src !== 'string') return false;
          return img.src.startsWith('http://') || img.src.startsWith('https://') || img.src.startsWith('data:');
        });

        const {
          data: {
            session: freshSession
          },
          error: refreshError
        } = await supabase.auth.refreshSession();
        if (refreshError || !freshSession) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        const token = freshSession.access_token;

        const {
          data,
          error
        } = await retryWithBackoff(async () => {
          const response = await supabase.functions.invoke('canvas-ai-chat', {
            body: {
              prompt: formattedPrompt,
              selectedImages: filteredImages.length > 0 ? filteredImages : null,
              aspectRatio: isEditingSelected && editAspectRatio ? editAspectRatio : selectedFormat,
              resolution: selectedResolution,
              originalWidth: primarySelected?.width,
              originalHeight: primarySelected?.height,
              isEditingSelected
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.error) throw response.error;
          return response;
        });

        // Enhanced error detection for AI limits and credit issues
        if (data?.error === 'ai_limit_reached' || 
            data?.message?.includes('limit reached') ||
            data?.message?.includes('service limit')) {
          throw new Error('ai_limit_reached');
        }
        if (data?.error === 'insufficient_credits' || error?.message?.includes('402')) {
          throw new Error('insufficient_credits');
        }
        if (error) throw error;
        if (data.images && data.images.length > 0) {
          const firstImageUrl = data.images[0];
          updateItem(historyId, {
            status: 'success',
            imageUrls: [firstImageUrl],
            imageCount: 1
          });
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Image generated successfully'
          }]);
          onPlaceholderComplete(firstImageUrl);
          onClose();
          return;
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          updateItem(historyId, {
            status: 'error',
            error: 'Cancelled'
          });
          return;
        }
        console.error('🔴 AI generation error:', error);
        let errorMessage = 'Failed to generate image';
        let toastMessage = errorMessage;

        const now = Date.now();
        const shouldShowError = !lastError || lastError.message !== errorMessage || now - lastError.timestamp > 5000;

        if (error.message?.includes('429')) {
          errorMessage = 'Rate limit exceeded';
          toastMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.message?.includes('ai_limit_reached')) {
          errorMessage = 'AI service limit reached';
          toastMessage = `AI generation limit reached. Please try again later.`;
        } else if (error.message?.includes('402') || error.message?.includes('insufficient_credits')) {
          errorMessage = 'Insufficient credits';
          toastMessage = 'Insufficient credits. Please add more credits to continue.';
        } else if (error.message?.includes('Session expired')) {
          errorMessage = 'Session expired';
          toastMessage = 'Session expired. Please refresh the page and log in again.';
        }
        updateItem(historyId, {
          status: 'error',
          error: errorMessage
        });

        if (shouldShowError) {
          setLastError({
            message: errorMessage,
            timestamp: now
          });
          toast.error(toastMessage, { duration: 8000 });
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal mode
    const isBrandGuideline = /\bbrand\s*(guidelines?|book|manual|identity\s*manual|identity\s*guide)\b|\bidentity\s*manual\b|\bstyle\s*guide\b|\bbrand\s*deck\b/i.test(userPrompt);

    // 12-page brand guideline blueprint — each page is an INDEPENDENT 16:9 image (1456x816).
    const BRAND_GUIDELINE_PAGES: { title: string; brief: string }[] = [
      { title: 'Cover', brief: 'BRAND GUIDELINE COVER PAGE. Editorial cover layout. Large brand name as the hero, small subtitle "Brand Guidelines / 2026". Generous whitespace. Premium magazine art direction.' },
      { title: 'Brand Essence', brief: 'Brand essence page: short brand statement on left, supporting visual on right. Two-column editorial layout. Calm, premium typography hierarchy.' },
      { title: 'Primary Logo', brief: 'PRIMARY LOGO showcase page. Single logo perfectly centered on a clean background, with tiny labels for "Primary Mark" beneath. NO duplicate logos, NO grid.' },
      { title: 'Logo Clearspace & Min Size', brief: 'Logo clearspace and minimum size diagram page. Logo with surrounding clearspace markers (X-height ticks) on the left, scaled minimum size variants labelled in pixels on the right. Technical, schematic look.' },
      { title: 'Logo Variations', brief: 'Logo variation page: exactly THREE versions side-by-side in a single row — full-color, monochrome black, monochrome white-on-dark. Labelled "Primary / Mono / Reverse" beneath each.' },
      { title: 'Incorrect Logo Usage', brief: 'Incorrect logo usage page. 4 do-not examples in a 2x2 grid — stretched, recolored wrong, drop shadow, on busy photo. Each marked with a small red cross. Clean editorial layout.' },
      { title: 'Color Palette', brief: 'Color palette page. Exactly 5 large swatches in one row across the page, each with HEX, RGB, and CMYK values labelled below. Minimal flat layout, ample whitespace. NO 3D, NO gradients.' },
      { title: 'Typography', brief: 'Typography specimen page. Two typefaces (Display + Text). Show name, sample uppercase ABC, lowercase abc, numerals 0-9, and one paragraph specimen for each. Two-column editorial layout.' },
      { title: 'Grid & Layout', brief: 'Grid and layout system page. 12-column grid overlay on left, an example layout using the grid on the right. Clean, technical wireframe presentation.' },
      { title: 'Imagery & Photography', brief: 'Imagery & photography style page. 4-6 photographic examples in a clean grid demonstrating lighting, mood, and subject treatment that match the brand. Each captioned with a short style cue.' },
      { title: 'Applications', brief: 'Brand applications page. Mockup showcase: business card, app screen, product packaging, and storefront sign — arranged in a clean 4-quadrant editorial grid. Realistic, premium mockups.' },
      { title: 'Brand Voice & Closing', brief: 'Brand voice & closing page. Left: 3 short voice principles with labels (e.g. Clear, Warm, Confident). Right: closing brand mark + tagline. Editorial, calm, premium.' },
    ];

    const historyId = addItem({
      projectId: projectId,
      prompt: userPrompt,
      status: 'queued',
      imageCount: isBrandGuideline ? BRAND_GUIDELINE_PAGES.length : 1
    });
    setPrompt('');
    setSuggestion('');
    onClose();
    setIsLoading(true);

    updateItem(historyId, {
      status: 'generating'
    });
    
    try {
      const filteredImages = allImages.filter(img => {
        if (!img.src) return false;
        if (typeof img.src !== 'string') return false;
        return img.src.startsWith('http://') || img.src.startsWith('https://') || img.src.startsWith('data:');
      });

      if (isBrandGuideline) {
        const imageUrls: string[] = [];

        const {
          data: {
            session: freshSession
          },
          error: refreshError
        } = await supabase.auth.refreshSession();
        if (refreshError || !freshSession) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        const token = freshSession.access_token;

        for (let i = 0; i < BRAND_GUIDELINE_PAGES.length; i++) {
          const page = BRAND_GUIDELINE_PAGES[i];
          const pageBrief = `BRAND GUIDELINE — Page ${i + 1} of ${BRAND_GUIDELINE_PAGES.length}: ${page.title}.\n\n${page.brief}\n\nUser brand brief: ${userPrompt}.\n\nMandatory: 16:9 horizontal layout filling the entire canvas. ONE single, complete, standalone page. NEVER a collage, grid of pages, or multi-page mosaic. Premium editorial brand-book art direction. No watermarks, no borders.`;
          try {
            const {
              data,
              error
            } = await retryWithBackoff(async () => {
              const response = await supabase.functions.invoke('canvas-ai-chat', {
                body: {
                  prompt: pageBrief,
                  // Force 16:9 regardless of canvas selection
                  aspectRatio: '16:9',
                  resolution: '1K',
                  // Brand guideline pages are pure generation — never attach selected images
                  selectedImages: null,
                  isEditingSelected: false,
                  messages: messages
                },
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              if (response.error) throw response.error;
              return response;
            });

            if (data?.error === 'ai_limit_reached' ||
                data?.message?.includes('limit reached') ||
                data?.message?.includes('service limit')) {
              throw new Error('ai_limit_reached');
            }
            if (data?.error === 'insufficient_credits' || error?.message?.includes('402')) {
              throw new Error('insufficient_credits');
            }
            if (error) throw error;

            if (data.images && data.images.length > 0) {
              data.images.forEach((url: string) => {
                onAddImage(url);
                imageUrls.push(url);
              });
            } else if (data.imageUrl) {
              onAddImage(data.imageUrl);
              imageUrls.push(data.imageUrl);
            }
            updateItem(historyId, { status: 'generating', imageUrls: [...imageUrls] });
          } catch (pageError: any) {
            if (pageError.name === 'AbortError' || pageError.message?.includes('aborted')) {
              throw new Error('Generation cancelled');
            }
            throw pageError;
          }
        }
        updateItem(historyId, {
          status: 'success',
          imageUrls,
          imageCount: imageUrls.length
        });
        toast.success(`Generated ${imageUrls.length}-page brand guideline`);
      } else {
        const {
          data: {
            session: freshSession
          },
          error: refreshError
        } = await supabase.auth.refreshSession();
        if (refreshError || !freshSession) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        const token = freshSession.access_token;

        const {
          data,
          error
        } = await retryWithBackoff(async () => {
          const response = await supabase.functions.invoke('canvas-ai-chat', {
            body: {
              prompt: formattedPrompt,
              selectedImages: allImages.length > 0 ? allImages : null,
              messages: messages,
              aspectRatio: isEditingSelected && editAspectRatio ? editAspectRatio : selectedFormat,
              resolution: selectedResolution,
              originalWidth: primarySelected?.width,
              originalHeight: primarySelected?.height,
              isEditingSelected
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.error) throw response.error;
          return response;
        });

        // Enhanced error detection for AI limits and credit issues
        if (data?.error === 'ai_limit_reached' || 
            data?.message?.includes('limit reached') ||
            data?.message?.includes('service limit')) {
          throw new Error('ai_limit_reached');
        }
        if (data?.error === 'insufficient_credits' || error?.message?.includes('402')) {
          throw new Error('insufficient_credits');
        }
        if (error) throw error;

        const imageUrls: string[] = [];
        if (data.images && data.images.length > 0) {
          data.images.forEach((url: string) => {
            onAddImage(url);
            imageUrls.push(url);
          });

          if (data.count > 1) {
            toast.success(`Generated ${data.count} images successfully!`);
          }
          updateItem(historyId, {
            status: 'success',
            imageUrls,
            imageCount: data.count
          });

          setMessages(prev => [...prev, {
            role: 'user',
            content: userPrompt
          }, {
            role: 'assistant',
            content: `Generated ${data.count} image(s) successfully`
          }]);
        } else if (data.imageUrl) {
          onAddImage(data.imageUrl);
          updateItem(historyId, {
            status: 'success',
            imageUrls: [data.imageUrl]
          });
          setMessages(prev => [...prev, {
            role: 'user',
            content: userPrompt
          }, {
            role: 'assistant',
            content: 'Generated image successfully'
          }]);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        updateItem(historyId, {
          status: 'error',
          error: 'Generation cancelled'
        });
        return;
      }
      
      console.error('🔴 AI generation error:', error);
      let errorMessage = 'Failed to generate image';
      let toastMessage = errorMessage;
      let toastDuration = 5000;

      // Enhanced error handling with specific messages
      if (error.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded';
        toastMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
        toastDuration = 8000;
      } else if (error.message?.includes('ai_limit_reached') || error.message?.includes('service limit')) {
        errorMessage = 'AI service limit reached';
        toastMessage = 'AI generation limit reached. Please try again later.';
        toastDuration = 10000;
      } else if (error.message?.includes('402') || error.message?.includes('insufficient_credits')) {
        errorMessage = 'Insufficient credits';
        toastMessage = 'You\'ve run out of credits. Please upgrade your plan to continue generating.';
        toastDuration = 10000;
      } else if (error.message?.includes('Session expired') || error.message?.includes('401')) {
        errorMessage = 'Session expired';
        toastMessage = 'Your session has expired. Please refresh the page and log in again.';
        toastDuration = 8000;
      } else if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
        errorMessage = 'Request timed out';
        toastMessage = 'The generation took too long. Please try again with a simpler prompt.';
        toastDuration = 8000;
      } else if (error.message?.includes('503') || error.message?.includes('Service unavailable')) {
        errorMessage = 'Service unavailable';
        toastMessage = 'Our AI service is temporarily busy. Please try again in a few moments.';
        toastDuration = 8000;
      } else if (error.message?.includes('Invalid response') || error.message?.includes('malformed')) {
        errorMessage = 'Invalid response';
        toastMessage = 'Received an invalid response. Please try again.';
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorMessage = 'Network error';
        toastMessage = 'Network connection issue. Please check your internet and try again.';
        toastDuration = 8000;
      }
      
      // Deduplicate error toasts
      const now = Date.now();
      const shouldShowError = !lastError || 
        lastError.message !== errorMessage || 
        now - lastError.timestamp > 5000;

      if (shouldShowError) {
        setLastError({ message: errorMessage, timestamp: now });
        toast.error(toastMessage, { duration: toastDuration });
      }
      
      updateItem(historyId, {
        status: 'error',
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const assets = await uploadMultiple([file]);
      if (assets.length > 0) {
        setUploadedAssets(prev => [...assets, ...prev]);
        toast.success(`${file.name} uploaded successfully!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDeleteAsset = async (assetId: string, filePath: string) => {
    try {
      await deleteAsset(assetId, filePath);
      setUploadedAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (error) {
      toast.error('Failed to delete asset');
    }
  };

  const handleSelectFromCanvas = useCallback(async () => {
    if (!canvasInstance) {
      toast.error('Canvas not available');
      return;
    }
    
    // Get all image objects on canvas (including nested in groups)
    const canvasImages = canvasInstance.getObjects().filter((obj: any) => {
      const objType = obj.type?.toLowerCase();
      return objType === 'image' || obj._element;
    });
    
    if (canvasImages.length === 0) {
      toast.info('No images found on canvas');
      return;
    }
    
    // Show the AssetTaggingPopup for selection
    setShowAssetPopup(true);
    setAssetSearchQuery('');
  }, [canvasInstance]);

  // Handler for selecting canvas asset as reference (Image Generator mode)
  const handleSelectCanvasAssetForReference = useCallback(async (asset: CanvasAsset) => {
    if (!canvasInstance) return;
    
    // Find all objects recursively to locate the image
    const findImageObject = (objects: any[], targetId: string): any => {
      for (const obj of objects) {
        if (obj.objectId === targetId || obj.id === targetId || obj.canvasObjectId === targetId) {
          return obj;
        }
        // Check nested objects in groups
        if (obj._objects && Array.isArray(obj._objects)) {
          const found = findImageObject(obj._objects, targetId);
          if (found) return found;
        }
        if (obj.getObjects && typeof obj.getObjects === 'function') {
          try {
            const children = obj.getObjects();
            if (Array.isArray(children)) {
              const found = findImageObject(children, targetId);
              if (found) return found;
            }
          } catch {}
        }
      }
      return null;
    };
    
    const fabricObj = findImageObject(canvasInstance.getObjects(), asset.id);
    
    if (!fabricObj || !fabricObj.toDataURL) {
      // Fallback: use the asset's existing URLs
      const newAsset: UploadedAsset = {
        id: `canvas-${Date.now()}`,
        file_name: asset.name,
        file_path: '',
        storage_url: asset.imageUrl || asset.thumbnailUrl,
        user_id: userId,
        project_id: projectId,
        file_size: 0,
        mime_type: 'image/png',
        created_at: new Date().toISOString()
      };
      
      setUploadedAssets(prev => [...prev, newAsset]);
      toast.success(`Added "${asset.name}" as reference`);
      setShowAssetPopup(false);
      return;
    }
    
    try {
      // Export to data URL for high quality
      const dataUrl = fabricObj.toDataURL({ format: 'png', quality: 0.9, multiplier: 1 });
      
      const newAsset: UploadedAsset = {
        id: `canvas-${Date.now()}`,
        file_name: asset.name,
        file_path: '',
        storage_url: dataUrl,
        user_id: userId,
        project_id: projectId,
        file_size: 0,
        mime_type: 'image/png',
        created_at: new Date().toISOString()
      };
      
      setUploadedAssets(prev => [...prev, newAsset]);
      toast.success(`Added "${asset.name}" as reference`);
      setShowAssetPopup(false);
    } catch (error) {
      console.error('Error exporting canvas asset:', error);
      toast.error('Failed to export image');
    }
  }, [canvasInstance, userId, projectId]);

  // Pin tag handlers
  const handlePinModeToggle = () => {
    if (!canvasInstance) {
      toast.error('Canvas not ready');
      return;
    }
    const activeObj = canvasInstance.getActiveObject();
    if (!activeObj || activeObj.type !== 'image') {
      toast.error('Please select an image first');
      return;
    }
    
    const newPinMode = !isPinMode;
    onPinModeChange?.(newPinMode);
  };

  const handleUpdatePinLabel = (tagId: string, newLabel: string) => {
    setPinTags(currentPinTags.map(t => 
      t.id === tagId 
        ? { ...t, label: newLabel, aiSuggestions: t.aiSuggestions.includes(newLabel) ? t.aiSuggestions : [newLabel, ...t.aiSuggestions] }
        : t
    ));
    setActivePinId(null);
  };

  const handleRemovePin = (tagId: string) => {
    setPinTags(currentPinTags.filter(t => t.id !== tagId));
    setActivePinId(null);
  };

  // Get text content from contentEditable
  const getTextContent = useCallback(() => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return '';
    return contentDiv.innerText.trim();
  }, []);

  // @ Asset tagging and / slash command handlers - contentEditable version
  const handleContentChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowAssetPopup(false);
      setShowSlashPopup(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    // Update prompt state from contentEditable
    const textContent = getTextContent();
    setPrompt(textContent);
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const textBeforeCursor = text.slice(0, cursorPos);
      
      // Check for @ asset tagging (both modes)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      if (lastAtIndex !== -1 && canvasInstance) {
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
          setAssetSearchQuery(textBeforeCursor.slice(lastAtIndex + 1));
          setShowAssetPopup(true);
          setShowSlashPopup(false);
          return;
        }
      }
      
      // Check for / slash commands (only in Canvas AI Chat mode, not Image Generator)
      if (!placeholderMode) {
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : ' ';
          if (/\s/.test(charBeforeSlash) || lastSlashIndex === 0) {
            setSlashSearchQuery(textBeforeCursor.slice(lastSlashIndex + 1));
            setShowSlashPopup(true);
            setShowAssetPopup(false);
            return;
          }
        }
      }
    }
    setShowAssetPopup(false);
    setShowSlashPopup(false);
  }, [canvasInstance, getTextContent, placeholderMode]);

  const handleSelectAsset = useCallback((asset: CanvasAsset) => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

    // Remove the @ and search text
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const textBeforeCursor = text.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
          // Delete from @ to cursor
          const newText = text.slice(0, lastAtIndex) + text.slice(cursorPos);
          textNode.textContent = newText;
          
          // Position cursor at the @ position
          const newRange = document.createRange();
          newRange.setStart(textNode, lastAtIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert chip HTML at current cursor position
    const chipHtml = `<span contenteditable="false" data-asset-id="${asset.id}" class="inline-flex items-center gap-1 p-1 rounded border border-border bg-muted/50 mx-0.5 align-middle cursor-pointer hover:border-primary/30"><img src="${asset.thumbnailUrl}" class="w-4 h-4 rounded object-cover"/><span class="text-xs">Image</span></span>&nbsp;`;
    
    document.execCommand('insertHTML', false, chipHtml);
    
    // Track the asset
    if (!taggedAssets.find(a => a.id === asset.id)) {
      setTaggedAssets(prev => [...prev, asset]);
    }
    
    // Update prompt state
    setPrompt(getTextContent());
    
    setShowAssetPopup(false);
    contentDiv.focus();
  }, [taggedAssets, getTextContent]);

  // Listen for "Add to chat" events fired from the canvas right-click menu.
  // The event delivers an asset payload identical to what @-mention produces,
  // so we forward it through the existing handleSelectAsset flow to keep the
  // chip rendering, deduping, and prompt-update behaviour consistent.
  useEffect(() => {
    const onAddToChat = (e: Event) => {
      const ce = e as CustomEvent<CanvasAsset>;
      if (!ce.detail) return;
      // Ensure the contentEditable has focus + a caret so insertHTML works.
      const el = contentEditableRef.current;
      if (el) {
        el.focus();
        const sel = window.getSelection();
        if (sel && (sel.rangeCount === 0 || !el.contains(sel.anchorNode))) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      handleSelectAsset(ce.detail);
    };
    window.addEventListener('canvas:add-to-chat', onAddToChat as EventListener);
    return () => window.removeEventListener('canvas:add-to-chat', onAddToChat as EventListener);
  }, [handleSelectAsset]);

  // Navigate to asset on canvas when chip is clicked
  const navigateToAsset = useCallback((asset: CanvasAsset) => {
    if (!canvasInstance) return;
    
    const objects = canvasInstance.getObjects();
    const targetObject = objects.find((obj: any) => 
      obj.objectId === asset.id || obj.id === asset.id
    );
    
    if (targetObject) {
      canvasInstance.setActiveObject(targetObject);
      const objCenter = targetObject.getCenterPoint();
      const vpt = [...canvasInstance.viewportTransform];
      const zoom = canvasInstance.getZoom();
      
      vpt[4] = canvasInstance.width / 2 - objCenter.x * zoom;
      vpt[5] = canvasInstance.height / 2 - objCenter.y * zoom;
      
      canvasInstance.setViewportTransform(vpt);
      canvasInstance.requestRenderAll();
    }
  }, [canvasInstance]);

  // Handle click on inline chips for canvas navigation
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]') as HTMLElement;
    
    if (chip && canvasInstance) {
      const assetId = chip.getAttribute('data-asset-id');
      const asset = taggedAssets.find(a => a.id === assetId);
      if (asset) {
        navigateToAsset(asset);
      }
    }
  }, [canvasInstance, taggedAssets, navigateToAsset]);

  // Handle mouse events for hover preview
  const handleContentMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]') as HTMLElement;
    
    if (chip) {
      const assetId = chip.getAttribute('data-asset-id');
      const asset = taggedAssets.find(a => a.id === assetId);
      if (asset) {
        const rect = chip.getBoundingClientRect();
        setHoveredAsset(asset);
        setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      }
    }
  }, [taggedAssets]);

  const handleContentMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('[data-asset-id]');
    if (chip) {
      setHoveredAsset(null);
      setHoverPosition(null);
    }
  }, []);

  // Handle slash command selection
  const handleSelectSlashCommand = useCallback((command: ImageEditCommand) => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

    // Remove the / and search text
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const textBeforeCursor = text.slice(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
        
        if (lastSlashIndex !== -1) {
          // Delete from / to cursor
          const newText = text.slice(0, lastSlashIndex) + text.slice(cursorPos);
          textNode.textContent = newText;
          
          // Position cursor at the / position
          const newRange = document.createRange();
          newRange.setStart(textNode, lastSlashIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert command chip HTML at current cursor position (matching asset chip styling)
    // Add color swatch for hex color commands
    const isHexColor = command.param.startsWith('#');
    const colorSwatch = isHexColor 
      ? `<span class="w-3 h-3 rounded-sm border border-border/50 flex-shrink-0" style="background-color: ${command.param}"></span>` 
      : '';
    const chipHtml = `<span contenteditable="false" data-command="${command.command}" data-param="${command.param}" class="inline-flex items-center gap-1 p-1 rounded border border-border bg-muted/50 mx-0.5 align-middle cursor-pointer hover:border-primary/30">${colorSwatch}<span class="text-xs font-medium">${command.displayText}</span></span>&nbsp;`;
    
    document.execCommand('insertHTML', false, chipHtml);
    
    // Track the command
    if (!editCommands.find(c => c.command === command.command && c.param === command.param)) {
      setEditCommands(prev => [...prev, command]);
    }
    
    // Update prompt state
    setPrompt(getTextContent());
    
    setShowSlashPopup(false);
    setSlashSearchQuery('');
    contentDiv.focus();
  }, [editCommands, getTextContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
    
    // Close popups on Escape
    if (e.key === 'Escape' && (showAssetPopup || showSlashPopup)) {
      e.preventDefault();
      setShowAssetPopup(false);
      setShowSlashPopup(false);
      setAssetSearchQuery('');
      setSlashSearchQuery('');
      return;
    }

    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      e.stopPropagation();
      setPrompt(prompt + suggestion);
      setSuggestion('');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (showAssetPopup || showSlashPopup) {
        setShowAssetPopup(false);
        setShowSlashPopup(false);
        return;
      }
      handleGenerate();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isPinMode) {
        onPinModeChange?.(false);
      } else {
        onClose();
      }
      return;
    }
  };

  return (
    <div 
      data-canvas-ai-chat="true" 
      // FIX #10: Reduced width by 30% (from 500px to 350px)
      className={`absolute bg-background/95 backdrop-blur-xl rounded-2xl border border-border animate-fly-in-up-centered w-[350px] transition-all duration-150`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1100,
        overflow: 'visible',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          if (prompt.trim()) {
            if (!confirm('Close without saving?')) return;
          }
          onClose();
        }}
        className="absolute top-2 right-2 p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Pin Tags Display - Only show pins for currently selected image, hide in image generator mode */}
      {(() => {
        // Don't show pins in image generator mode
        if (placeholderMode) return null;
        
        const visiblePinTags = selectedImageId 
          ? currentPinTags.filter(tag => tag.imageObjectId === selectedImageId)
          : [];
        
        if (visiblePinTags.length === 0) return null;
        
        return (
          <div className="px-3 pt-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {visiblePinTags.map(tag => {
                // Get full image URL from canvas object
                const imageObject = canvasInstance?.getObjects?.().find(
                  (obj: any) => (obj.objectId || obj.id) === tag.imageObjectId
                );
                const fullImageUrl = imageObject?.getSrc?.() || imageObject?._originalElement?.src || undefined;
                
                return (
                <Popover key={tag.id} open={activePinId === tag.id} onOpenChange={(open) => setActivePinId(open ? tag.id : null)}>
                  <PopoverTrigger asChild>
                    <div>
                      <PinTagChip 
                        tag={tag} 
                        isActive={activePinId === tag.id}
                        onClick={() => setActivePinId(activePinId === tag.id ? null : tag.id)}
                        fullImageUrl={fullImageUrl}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto" align="start" side="top" sideOffset={8}>
                    <ObjectMarkedPopover
                      tag={tag}
                      onSelectSuggestion={(label) => handleUpdatePinLabel(tag.id, label)}
                      onCustomLabel={(label) => handleUpdatePinLabel(tag.id, label)}
                      onRemove={() => handleRemovePin(tag.id)}
                      onClose={() => setActivePinId(null)}
                    />
                  </PopoverContent>
                </Popover>
              );
              })}
            </div>
          </div>
        );
      })()}

      {/* Textarea */}
      <div className="px-3 pt-3 pb-2 relative" style={{ overflow: 'visible' }}>
        {/* @ Asset Tagging Popup - Absolute position above input */}
        {showAssetPopup && (
          <div 
            className="absolute bg-background rounded-lg border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              bottom: '100%',
              marginBottom: '8px',
              maxHeight: '240px',
              width: '60%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999999
            }}
          >
            <AssetTaggingPopup
              isOpen={showAssetPopup}
              onClose={() => {
                setShowAssetPopup(false);
                setAssetSearchQuery('');
              }}
              onSelectAsset={placeholderMode ? handleSelectCanvasAssetForReference : handleSelectAsset}
              searchQuery={assetSearchQuery}
              canvasInstance={canvasInstance}
            />
          </div>
        )}
        
        {/* / Slash Command Popup - Only in Canvas AI Chat mode */}
        {showSlashPopup && !placeholderMode && (
          <div 
            className="absolute bg-background rounded-lg border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              bottom: '100%',
              marginBottom: '8px',
              maxHeight: '320px',
              width: '70%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999999
            }}
          >
            <ImageEditingPopup
              isOpen={showSlashPopup}
              onClose={() => {
                setShowSlashPopup(false);
                setSlashSearchQuery('');
              }}
              onSelectCommand={handleSelectSlashCommand}
              searchQuery={slashSearchQuery}
            />
          </div>
        )}
        
        <div className="relative">
          
          {/* Hover preview for asset chips - rendered via Portal */}
          {hoveredAsset && hoverPosition && createPortal(
            <div 
              className="fixed z-[9999] bg-background rounded-lg shadow-xl border border-border p-2 pointer-events-none animate-fade-in"
              style={{
                left: hoverPosition.x,
                top: hoverPosition.y - 12,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <img 
                src={hoveredAsset.imageUrl || hoveredAsset.thumbnailUrl} 
                alt={hoveredAsset.name} 
                className="w-32 h-auto rounded object-cover max-h-24"
              />
              <p className="text-xs text-muted-foreground mt-1 text-center truncate max-w-[128px]">
                {hoveredAsset.name}
              </p>
            </div>,
            document.body
          )}
          
          {/* ContentEditable input with inline chips */}
          <div
            ref={contentEditableRef}
            contentEditable={!isLoading}
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
            onClick={handleContentClick}
            onMouseOver={handleContentMouseOver}
            onMouseOut={handleContentMouseOut}
            className="min-h-[40px] max-h-[80px] overflow-y-auto border-0 bg-transparent text-foreground outline-none text-sm leading-6"
            data-placeholder={(() => {
              if (placeholderMode) return "Describe the image you want to generate...";
              const visiblePinTags = selectedImageId 
                ? currentPinTags.filter(tag => tag.imageObjectId === selectedImageId)
                : [];
              if (visiblePinTags.length > 0) return "Describe how to edit the tagged objects...";
              if (hasImageSelected) return "Describe how to edit this image...";
              return "Type @ to tag assets, / for edit commands...";
            })()}
            suppressContentEditableWarning
          />
        </div>
        
        {/* Uploaded Assets Preview - Compact Chips (only in Image Generator mode) */}
        {placeholderMode && uploadedAssets.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {uploadedAssets.map(asset => (
              <div 
                key={asset.id}
                className="flex items-center gap-1 bg-muted/50 rounded-full pl-1 pr-2 py-0.5"
              >
                <img 
                  src={asset.storage_url} 
                  alt="" 
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                  {asset.file_name}
                </span>
                <button 
                  onClick={() => handleDeleteAsset(asset.id, asset.file_path)}
                  className="p-0.5 hover:bg-muted rounded-full"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-background rounded-b-2xl">
        {/* Left icons */}
        <div className="flex items-center gap-1.5">
          {placeholderMode ? (
            <>
              <UploadSelectMenu onUpload={handleUpload} onSelectFromCanvas={handleSelectFromCanvas} />
              {/* Format and Resolution selectors */}
              {onResolutionChange && (
                <ResolutionSelector 
                  selectedResolution={selectedResolution}
                  onResolutionChange={onResolutionChange}
                />
              )}
              {onFormatChange && (
                <FormatSelector 
                  selectedFormat={selectedFormat}
                  selectedResolution={selectedResolution}
                  onFormatChange={onFormatChange}
                />
              )}
            </>
          ) : (
            <>
              {/* Pin Tag button only - removed UploadSelectMenu from Canvas AI Chat */}
              <button 
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isPinMode 
                    ? 'bg-primary/10 text-primary' 
                    : !hasImageSelected 
                      ? 'text-muted-foreground/50 cursor-not-allowed' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`} 
                onClick={handlePinModeToggle} 
                disabled={!hasImageSelected} 
                title={hasImageSelected ? "Add pin tag to mark objects" : "Select an image first"}
              >
                <MapPin className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Right side - Generate button */}
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="h-8 px-3 gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span className="text-sm">10</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CanvasAIChat;
