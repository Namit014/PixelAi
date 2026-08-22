import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Zap, Upload, ImageIcon, Loader2, ArrowLeftRight, Plus, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetTaggingPopup, type CanvasAsset } from './AssetTaggingPopup';
import { VideoEditingPopup, type VideoEditCommand } from './VideoEditingPopup';
import { VideoFrameTimeline, type VideoFrameData } from './VideoFrameTimeline';
import { VideoUpgradeModal } from './VideoUpgradeModal';
import { hasVideoAccess } from '@/lib/planUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VideoFrame {
  type: 'upload' | 'canvas';
  url: string;
  name: string;
}

interface VideoGeneratorChatProps {
  selectedObjects: any[];
  onClose: () => void;
  projectId: string;
  position: { x: number; y: number };
  onVideoComplete: (videoUrl: string) => void;
  canvasInstance?: any | null;
  onGenerationStateChange?: (isGenerating: boolean) => void;
  selectedFormat?: string;
  selectedDuration?: number;
  onFormatChange?: (format: string, dimensions: { width: number; height: number }) => void;
  onDurationChange?: (duration: number) => void;
  // Mode for editing existing video
  editMode?: boolean;
  existingVideoUrl?: string;
}

const VideoGeneratorChat = ({
  selectedObjects,
  onClose,
  projectId,
  position,
  onVideoComplete,
  canvasInstance = null,
  onGenerationStateChange,
  selectedFormat = '16:9',
  selectedDuration = 4,
  onFormatChange,
  onDurationChange,
  editMode = false,
  existingVideoUrl
}: VideoGeneratorChatProps) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userId, setUserId] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [showVideoUpgradeModal, setShowVideoUpgradeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'frames' | 'motion'>('frames');
  
  // Frame selection state
  const [startFrame, setStartFrame] = useState<VideoFrame | null>(null);
  const [endFrame, setEndFrame] = useState<VideoFrame | null>(null);
  const [showFrameMenu, setShowFrameMenu] = useState<'start' | 'end' | null>(null);
  const [selectingFrameType, setSelectingFrameType] = useState<'start' | 'end' | null>(null);
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [framesExpanded, setFramesExpanded] = useState(false);
  
  // @ Asset tagging state for prompt input
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [taggedAssets, setTaggedAssets] = useState<CanvasAsset[]>([]);
  const [hoveredAsset, setHoveredAsset] = useState<CanvasAsset | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPromptAssetPopup, setShowPromptAssetPopup] = useState(false);
  
  // / Slash command state for video editing
  const [showSlashPopup, setShowSlashPopup] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [editCommands, setEditCommands] = useState<VideoEditCommand[]>([]);
  
  // # Frame timeline state
  const [showFrameTimeline, setShowFrameTimeline] = useState(false);
  const [selectedTimelineFrame, setSelectedTimelineFrame] = useState<VideoFrameData | null>(null);
  const [taggedFrames, setTaggedFrames] = useState<VideoFrameData[]>([]);
  const [hoveredFrameChip, setHoveredFrameChip] = useState<VideoFrameData | null>(null);
  const [frameChipHoverPosition, setFrameChipHoverPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Generation state
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate credits needed
  const creditsNeeded = selectedDuration * 10;

  // Fetch user credits and check video access
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('credits').select('balance, subscription_tier, video_feature_access').eq('user_id', user.id).single();
        if (data) {
          setCredits(data.balance);
          setSubscriptionTier(data.subscription_tier || 'free');
          
          // Check video access - if no access, show upgrade modal immediately
          const canAccessVideo = data.video_feature_access || hasVideoAccess(data.subscription_tier);
          if (!canAccessVideo) {
            console.log('🎬 Video access blocked for tier:', data.subscription_tier);
            setShowVideoUpgradeModal(true);
          }
        }
      }
    };
    fetchUserData();
  }, [projectId]);

  // CRITICAL FIX: Add native event listener to block ALL keyboard events from bubbling
  // This stops events BEFORE they can reach window.addEventListener handlers
  useEffect(() => {
    const element = contentEditableRef.current;
    if (!element) return;
    
    const blockKeyboardShortcuts = (e: KeyboardEvent) => {
      // Block all single-key shortcuts that could trigger tool changes
      // Allow Ctrl/Cmd combinations for copy/paste/etc
      if (!e.ctrlKey && !e.metaKey) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    
    // Use capture phase to intercept before any other listener
    element.addEventListener('keydown', blockKeyboardShortcuts, true);
    element.addEventListener('keyup', blockKeyboardShortcuts, true);
    element.addEventListener('keypress', blockKeyboardShortcuts, true);
    
    element.focus();
    
    return () => {
      element.removeEventListener('keydown', blockKeyboardShortcuts, true);
      element.removeEventListener('keyup', blockKeyboardShortcuts, true);
      element.removeEventListener('keypress', blockKeyboardShortcuts, true);
    };
  }, []);

  useEffect(() => {
    onGenerationStateChange?.(isLoading);
  }, [isLoading, onGenerationStateChange]);

  // Get time estimate for progress display
  const getTimeEstimate = useCallback((currentProgress: number) => {
    const remaining = Math.max(90 - currentProgress, 5);
    const seconds = Math.ceil(remaining * 0.9); // ~80s total generation
    return seconds > 60 ? `~${Math.ceil(seconds / 60)}m left` : `~${seconds}s left`;
  }, []);

  // Poll for video status with smooth progress simulation
  useEffect(() => {
    if (!jobId || !isLoading) return;

    // Simulate smooth progress while waiting for actual updates - FASTER increments
    let simulatedProgress = progress;
    const progressInterval = setInterval(() => {
      // Increase by 1.5% every 1.5s for smoother, faster feel
      if (simulatedProgress < 90) {
        simulatedProgress = Math.min(simulatedProgress + 1.5, 90);
        setProgress(Math.floor(simulatedProgress));
      }
    }, 1500);

    const pollStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('luma-generate', {
          body: { action: 'status', predictionId: jobId }
        });

        if (error) throw error;

        console.log('📹 Video poll status:', data);

        if (data.status === 'completed' || data.status === 'succeeded') {
          clearInterval(progressInterval);
          setIsLoading(false);
          setProgress(100);
          setStatusMessage('Video ready!');
          
          const videoUrl = data.output_video_url;
          if (videoUrl) {
            console.log('📹 Video URL received:', videoUrl);
            onVideoComplete(videoUrl);
            toast.success('Video generated successfully!');
            import('@/lib/notifications/aiNotify').then(({ notifyAiComplete }) =>
              notifyAiComplete({ source: 'video', status: 'success', title: 'Video ready', message: 'Your AI video is ready.', dedupeKey: jobId ?? undefined })
            );
          }
          setJobId(null);
        } else if (data.status === 'failed') {
          clearInterval(progressInterval);
          setIsLoading(false);
          setStatusMessage('Generation failed');
          toast.error(data.error || 'Video generation failed');
          import('@/lib/notifications/aiNotify').then(({ notifyAiComplete }) =>
            notifyAiComplete({ source: 'video', status: 'error', title: 'Video failed', message: data.error || 'Generation failed.', dedupeKey: jobId ?? undefined })
          );
          setJobId(null);
        } else {
          // Update status message based on actual progress with time estimate
          const actualProgress = data.progress || 0;
          if (actualProgress > simulatedProgress) {
            setProgress(actualProgress);
            simulatedProgress = actualProgress;
          }
          
          const timeEstimate = getTimeEstimate(simulatedProgress);
          if (data.status === 'starting') {
            setStatusMessage(`Starting generation... ${timeEstimate}`);
          } else if (data.status === 'processing') {
            setStatusMessage(`Creating your video... ${timeEstimate}`);
          } else {
            setStatusMessage(`Generating video... ${timeEstimate}`);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    };

    // Poll every 2.5 seconds for faster updates
    const interval = setInterval(pollStatus, 2500);
    // Also poll immediately
    pollStatus();
    
    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [jobId, isLoading, onVideoComplete, getTimeEstimate]);

  // Get text content from contentEditable
  const getTextContent = useCallback(() => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return '';
    return contentDiv.innerText.trim();
  }, []);

  // Helper to upload base64 image to storage and get signed URL
  const uploadFrameToStorage = async (dataUrl: string, frameType: 'start' | 'end'): Promise<string | null> => {
    // If it's already an HTTP URL, return it directly
    if (dataUrl.startsWith('http')) {
      return dataUrl;
    }
    
    // Need userId for RLS-compliant path
    if (!userId) {
      console.error('No user ID available for upload');
      return null;
    }
    
    // Convert data URL to blob
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = blob.type.split('/')[1] || 'png';
      const fileName = `video-frame-${frameType}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // FIX: Include userId as first folder to satisfy RLS policy
      const filePath = `${userId}/video-frames/${fileName}`;
      
      console.log(`📤 Uploading ${frameType} frame to storage:`, filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Frame upload failed:', uploadError);
        return null;
      }
      
      // Get signed URL (1 hour expiry)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('design-assets')
        .createSignedUrl(uploadData.path, 3600);
      
      if (urlError || !urlData?.signedUrl) {
        console.error('Failed to get signed URL:', urlError);
        return null;
      }
      
      console.log(`✅ ${frameType} frame uploaded successfully`);
      return urlData.signedUrl;
    } catch (err) {
      console.error('Error uploading frame:', err);
      return null;
    }
  };

  const handleGenerate = async () => {
    const promptText = getTextContent();
    if (!promptText.trim() && !startFrame && !endFrame && editCommands.length === 0) {
      toast.error('Please enter a prompt, select frames, or add editing commands');
      return;
    }

    if (credits < creditsNeeded) {
      toast.error(`Insufficient credits. Need ${creditsNeeded}, have ${credits}`);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Starting generation...');

    try {
      // Upload frames to storage if they're data URLs (base64)
      let startImageUrl: string | undefined;
      let endImageUrl: string | undefined;
      
      if (startFrame?.url) {
        setStatusMessage('Uploading start frame...');
        const uploadedUrl = await uploadFrameToStorage(startFrame.url, 'start');
        if (uploadedUrl) {
          startImageUrl = uploadedUrl;
        } else if (startFrame.url.startsWith('data:')) {
          toast.error('Failed to upload start frame. Please try again.');
          setIsLoading(false);
          return;
        }
      }
      
      if (endFrame?.url) {
        setStatusMessage('Uploading end frame...');
        const uploadedUrl = await uploadFrameToStorage(endFrame.url, 'end');
        if (uploadedUrl) {
          endImageUrl = uploadedUrl;
        } else if (endFrame.url.startsWith('data:')) {
          toast.error('Failed to upload end frame. Please try again.');
          setIsLoading(false);
          return;
        }
      }
      
      setStatusMessage('Starting video generation...');
      
      // Build the enhanced prompt with edit commands
      let enhancedPrompt = promptText.trim();
      
      // Add edit commands to the prompt
      if (editCommands.length > 0) {
        const commandsText = editCommands.map(cmd => {
          switch (cmd.command) {
            case '/lens':
              return `Use a ${cmd.param} lens focal length`;
            case '/aperture':
              return `Set aperture to ${cmd.param} for depth of field`;
            case '/movement':
              return `Apply ${cmd.param.replace('-', ' ')} camera movement`;
            case '/lighting':
              return `Use ${cmd.param.replace('-', ' ')} lighting`;
            case '/grade':
              return `Apply ${cmd.param} color grading`;
            case '/focus':
              return `Use ${cmd.param.replace('-', ' ')} focus technique`;
            case '/speed':
              return `Set playback speed to ${cmd.param.replace('-', ' ')}`;
            case '/transition':
              return `Apply ${cmd.param} transition`;
            case '/shake':
              return `Add ${cmd.param} camera shake`;
            case '/depth':
              return `Focus on ${cmd.param} layer`;
            case '/fps':
              return `Render at ${cmd.param}fps`;
            case '/regenerate':
              return `Regenerate with ${cmd.param.replace('-', ' ')} settings`;
            default:
              return cmd.displayText;
          }
        }).join('. ');
        
        enhancedPrompt = commandsText + (enhancedPrompt ? '. ' + enhancedPrompt : '');
      }
      
      // Handle frame-only generation with smart default prompts
      if (startFrame && endFrame && !enhancedPrompt.trim()) {
        enhancedPrompt = 'Create a smooth cinematic video transition from the first image to the second image with natural motion and fluid movement.';
      } else if (startFrame && !endFrame && !enhancedPrompt.trim()) {
        enhancedPrompt = 'Animate this image with natural, cinematic motion while preserving the original composition and adding subtle life.';
      } else if (startFrame && endFrame) {
        enhancedPrompt = `Create a smooth video transition from the first image to the second image. ${enhancedPrompt}`;
      } else if (startFrame) {
        enhancedPrompt = `Animate this image with natural motion. ${enhancedPrompt}`;
      }

      console.log('📹 Video generation request:', {
        prompt: enhancedPrompt,
        startFrame: startImageUrl ? 'uploaded' : 'none',
        endFrame: endImageUrl ? 'uploaded' : 'none',
      });

      const { data, error } = await supabase.functions.invoke('luma-generate', {
        body: {
          action: 'generate',
          prompt: enhancedPrompt || 'A beautiful cinematic scene with smooth motion',
          duration: selectedDuration,
          aspectRatio: selectedFormat,
          projectId: projectId,
          loop: false,
          startImageUrl: startImageUrl,
          endImageUrl: endImageUrl
        }
      });

      if (error) throw error;

      // Check if video completed immediately (Luma is fast!)
      if (data.status === 'completed' && data.output_video_url) {
        setIsLoading(false);
        setProgress(100);
        setStatusMessage('Video ready!');
        onVideoComplete(data.output_video_url);
        toast.success('Video generated successfully!');
        setEditCommands([]);
        const { data: creditData } = await supabase.from('credits').select('balance').eq('user_id', userId).single();
        if (creditData) setCredits(creditData.balance);
        return;
      }

      if (error) throw error;

      if (data.error) {
        if (data.error === 'Insufficient credits') {
          toast.error(`Need ${data.required} credits, have ${data.available}`);
        } else {
          toast.error(data.error);
        }
        setIsLoading(false);
        return;
      }

      setJobId(data.jobId);
      setStatusMessage('Video queued...');
      
      // Clear edit commands after successful generation
      setEditCommands([]);
      
      const { data: creditData } = await supabase.from('credits').select('balance').eq('user_id', userId).single();
      if (creditData) setCredits(creditData.balance);

    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Failed to generate video');
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectingFrameType) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const frame: VideoFrame = {
        type: 'upload',
        url: dataUrl,
        name: file.name
      };
      
      if (selectingFrameType === 'start') {
        setStartFrame(frame);
      } else {
        setEndFrame(frame);
      }
      setSelectingFrameType(null);
      setShowFrameMenu(null);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectFromCanvas = (frameType: 'start' | 'end') => {
    setSelectingFrameType(frameType);
    setShowAssetPopup(true);
    setShowFrameMenu(null);
  };

  const handleAssetSelected = (asset: CanvasAsset) => {
    if (!selectingFrameType) return;

    const frame: VideoFrame = {
      type: 'canvas',
      url: asset.imageUrl || asset.thumbnailUrl || '',
      name: asset.name || 'Canvas Image'
    };

    if (selectingFrameType === 'start') {
      setStartFrame(frame);
    } else {
      setEndFrame(frame);
    }

    setShowAssetPopup(false);
    setSelectingFrameType(null);
  };

  const swapFrames = () => {
    const temp = startFrame;
    setStartFrame(endFrame);
    setEndFrame(temp);
  };

  // @ Asset tagging, / slash command, and # frame timeline handlers for prompt input
  const handleContentChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowPromptAssetPopup(false);
      setShowSlashPopup(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    const textContent = getTextContent();
    setPrompt(textContent);
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const textBeforeCursor = text.slice(0, cursorPos);
      
      // Check for # frame timeline trigger (only in edit mode with existing video)
      const lastHashIndex = textBeforeCursor.lastIndexOf('#');
      if (lastHashIndex !== -1 && editMode && existingVideoUrl) {
        const charBeforeHash = lastHashIndex > 0 ? textBeforeCursor[lastHashIndex - 1] : ' ';
        if (/\s/.test(charBeforeHash) || lastHashIndex === 0) {
          setShowFrameTimeline(true);
          setShowPromptAssetPopup(false);
          setShowSlashPopup(false);
          return;
        }
      }
      
      // Check for @ asset tagging
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      if (lastAtIndex !== -1 && canvasInstance) {
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
          setAssetSearchQuery(textBeforeCursor.slice(lastAtIndex + 1));
          setShowPromptAssetPopup(true);
          setShowSlashPopup(false);
          return;
        }
      }
      
      // Check for / slash commands
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : ' ';
        if (/\s/.test(charBeforeSlash) || lastSlashIndex === 0) {
          setSlashSearchQuery(textBeforeCursor.slice(lastSlashIndex + 1));
          setShowSlashPopup(true);
          setShowPromptAssetPopup(false);
          return;
        }
      }
    }
    setShowPromptAssetPopup(false);
    setShowSlashPopup(false);
  }, [canvasInstance, getTextContent, editMode, existingVideoUrl]);

  const handleSelectPromptAsset = useCallback((asset: CanvasAsset) => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

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
          const newText = text.slice(0, lastAtIndex) + text.slice(cursorPos);
          textNode.textContent = newText;
          
          const newRange = document.createRange();
          newRange.setStart(textNode, lastAtIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert chip HTML matching CanvasAIChat style
    const chipHtml = `<span contenteditable="false" data-asset-id="${asset.id}" class="inline-flex items-center gap-1 p-1 rounded border border-border bg-muted/50 mx-0.5 align-middle cursor-pointer hover:border-primary/30"><img src="${asset.thumbnailUrl}" class="w-4 h-4 rounded object-cover"/><span class="text-xs">Image</span></span>&nbsp;`;
    
    document.execCommand('insertHTML', false, chipHtml);
    
    if (!taggedAssets.find(a => a.id === asset.id)) {
      setTaggedAssets(prev => [...prev, asset]);
    }
    
    setPrompt(getTextContent());
    setShowPromptAssetPopup(false);
    contentDiv.focus();
  }, [taggedAssets, getTextContent]);

  // Handle mouse events for hover preview
  const handleContentMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check for asset chips
    const assetChip = target.closest('[data-asset-id]') as HTMLElement;
    if (assetChip) {
      const assetId = assetChip.getAttribute('data-asset-id');
      const asset = taggedAssets.find(a => a.id === assetId);
      if (asset) {
        const rect = assetChip.getBoundingClientRect();
        setHoveredAsset(asset);
        setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      }
    }
    
    // Check for frame chips
    const frameChip = target.closest('[data-frame-index]') as HTMLElement;
    if (frameChip) {
      const frameIndex = parseInt(frameChip.getAttribute('data-frame-index') || '0', 10);
      const frame = taggedFrames.find(f => f.index === frameIndex);
      if (frame) {
        const rect = frameChip.getBoundingClientRect();
        setHoveredFrameChip(frame);
        setFrameChipHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      }
    }
  }, [taggedAssets, taggedFrames]);

  const handleContentMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const assetChip = target.closest('[data-asset-id]');
    const frameChip = target.closest('[data-frame-index]');
    if (assetChip) {
      setHoveredAsset(null);
      setHoverPosition(null);
    }
    if (frameChip) {
      setHoveredFrameChip(null);
      setFrameChipHoverPosition(null);
    }
  }, []);

  // Handler for selecting a frame from the timeline
  const handleSelectTimelineFrame = useCallback((frame: VideoFrameData) => {
    const contentDiv = contentEditableRef.current;
    if (!contentDiv) return;

    // Remove the # trigger from input
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const textBeforeCursor = text.slice(0, cursorPos);
        const lastHashIndex = textBeforeCursor.lastIndexOf('#');
        
        if (lastHashIndex !== -1) {
          const newText = text.slice(0, lastHashIndex) + text.slice(cursorPos);
          textNode.textContent = newText;
          
          const newRange = document.createRange();
          newRange.setStart(textNode, lastHashIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert frame chip HTML
    const chipHtml = `<span contenteditable="false" data-frame-index="${frame.index}" class="inline-flex items-center gap-1 p-1 rounded border border-border bg-muted/50 mx-0.5 align-middle cursor-pointer hover:border-primary/30"><img src="${frame.dataUrl}" class="w-4 h-4 rounded object-cover"/><span class="text-xs">Frame ${frame.index + 1}</span></span>&nbsp;`;
    
    document.execCommand('insertHTML', false, chipHtml);
    
    // Track the selected frame
    if (!taggedFrames.find(f => f.index === frame.index)) {
      setTaggedFrames(prev => [...prev, frame]);
    }
    setSelectedTimelineFrame(frame);
    
    setPrompt(getTextContent());
    setShowFrameTimeline(false);
    contentDiv.focus();
  }, [taggedFrames, getTextContent]);

  // Handler for selecting video edit command
  const handleSelectEditCommand = useCallback((command: VideoEditCommand) => {
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
          const newText = text.slice(0, lastSlashIndex) + text.slice(cursorPos);
          textNode.textContent = newText;
          
          const newRange = document.createRange();
          newRange.setStart(textNode, lastSlashIndex);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    // Insert command chip HTML - matching CanvasAIChat styling (not rounded-full)
    const chipHtml = `<span contenteditable="false" data-command="${command.command}" data-param="${command.param}" class="inline-flex items-center gap-1 p-1 rounded border border-border bg-muted/50 mx-0.5 align-middle cursor-pointer hover:border-primary/30"><span class="text-xs font-medium">${command.displayText}</span></span>&nbsp;`;
    
    document.execCommand('insertHTML', false, chipHtml);
    
    // Track the command
    if (!editCommands.find(c => c.command === command.command && c.param === command.param)) {
      setEditCommands(prev => [...prev, command]);
    }
    
    setPrompt(getTextContent());
    setShowSlashPopup(false);
    setSlashSearchQuery('');
    contentDiv.focus();
  }, [editCommands, getTextContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // CRITICAL: Stop BOTH React synthetic event AND native event propagation
    // React's stopPropagation() only stops synthetic events, not native window listeners
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (e.key === 'Escape') {
      if (showFrameTimeline) {
        e.preventDefault();
        setShowFrameTimeline(false);
        return;
      }
      if (showPromptAssetPopup) {
        e.preventDefault();
        setShowPromptAssetPopup(false);
        setAssetSearchQuery('');
        return;
      }
      if (showSlashPopup) {
        e.preventDefault();
        setShowSlashPopup(false);
        setSlashSearchQuery('');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showPromptAssetPopup) {
        setShowPromptAssetPopup(false);
        return;
      }
      if (showSlashPopup) {
        setShowSlashPopup(false);
        return;
      }
      handleGenerate();
    }
  };

  const handleFrameClick = (frameType: 'start' | 'end') => {
    const currentFrame = frameType === 'start' ? startFrame : endFrame;
    if (!currentFrame) {
      setShowFrameMenu(frameType);
    }
  };

  const handleUploadClick = (frameType: 'start' | 'end') => {
    setSelectingFrameType(frameType);
    setShowFrameMenu(null);
    fileInputRef.current?.click();
  };

  // Pill toggle class helper
  const pillClasses = (tab: 'frames' | 'motion') => 
    `px-3 py-1 text-xs rounded-full transition-colors ${
      activeTab === tab 
        ? 'bg-background text-foreground' 
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <>
      <div
        className="fixed z-50 w-[350px] bg-background/95 backdrop-blur-xl rounded-2xl border border-border animate-fly-in-up-centered"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          overflow: 'visible',
        }}
      >
        {/* Loading overlay - with rounded corners to match parent */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{statusMessage}</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}% • ~{Math.max(90 - Math.floor(progress * 0.9), 5)}s remaining</p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-3 pt-3 pb-2 relative" style={{ overflow: 'visible' }}>
          {/* / Video Editing Slash Command Popup */}
          {showSlashPopup && (
            <div 
              className="absolute bg-background rounded-lg border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{
                bottom: '100%',
                marginBottom: '8px',
                maxHeight: '320px',
                width: '80%',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 999999
              }}
            >
              <VideoEditingPopup
                isOpen={showSlashPopup}
                onClose={() => {
                  setShowSlashPopup(false);
                  setSlashSearchQuery('');
                }}
                onSelectCommand={handleSelectEditCommand}
                searchQuery={slashSearchQuery}
              />
            </div>
          )}

          {/* @ Asset Tagging Popup for prompt input */}
          {showPromptAssetPopup && (
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
                isOpen={showPromptAssetPopup}
                onClose={() => {
                  setShowPromptAssetPopup(false);
                  setAssetSearchQuery('');
                }}
                onSelectAsset={handleSelectPromptAsset}
                searchQuery={assetSearchQuery}
                canvasInstance={canvasInstance}
              />
            </div>
          )}

          {/* # Video Frame Timeline */}
          {showFrameTimeline && editMode && existingVideoUrl && (
            <div 
              className="absolute bg-background rounded-xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{
                bottom: '100%',
                marginBottom: '8px',
                width: '100%',
                left: '0',
                zIndex: 999999
              }}
            >
              <VideoFrameTimeline
                videoUrl={existingVideoUrl}
                isOpen={showFrameTimeline}
                onClose={() => setShowFrameTimeline(false)}
                onSelectFrame={handleSelectTimelineFrame}
                selectedFrameIndex={selectedTimelineFrame?.index}
              />
            </div>
          )}

          {/* Hover preview for asset chips */}
          {hoveredAsset && hoverPosition && createPortal(
            <div 
              className="fixed z-[9999] bg-background rounded-lg border border-border p-2 pointer-events-none animate-fade-in"
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

          {/* Hover preview for frame chips */}
          {hoveredFrameChip && frameChipHoverPosition && createPortal(
            <div 
              className="fixed z-[9999] bg-background rounded-lg border border-border p-2 pointer-events-none animate-fade-in"
              style={{
                left: frameChipHoverPosition.x,
                top: frameChipHoverPosition.y - 12,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <img 
                src={hoveredFrameChip.dataUrl} 
                alt={`Frame ${hoveredFrameChip.index + 1}`}
                className="w-32 h-auto rounded object-cover max-h-24"
              />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Frame {hoveredFrameChip.index + 1} • {hoveredFrameChip.timestamp.toFixed(2)}s
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
            onMouseOver={handleContentMouseOver}
            onMouseOut={handleContentMouseOut}
            data-placeholder={editMode ? "Type / for commands or # for frames..." : "Describe what happens in the video..."}
            className="min-h-[40px] max-h-[80px] overflow-y-auto border-0 bg-transparent text-foreground outline-none text-sm leading-6 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50"
            suppressContentEditableWarning
          />
        </div>

        {/* Frames Selection UI - Side by side layout */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Start Frame */}
          <Popover open={showFrameMenu === 'start'} onOpenChange={(open) => !open && setShowFrameMenu(null)}>
            <PopoverTrigger asChild>
              <div 
                className="w-10 h-10 rounded-xl border-2 border-border/60 bg-muted/50 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-border transition-colors"
                onClick={() => handleFrameClick('start')}
              >
                {startFrame ? (
                  <>
                    <img src={startFrame.url} alt="Start" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setStartFrame(null); }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </>
                ) : (
                  <Plus className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" side="top" sideOffset={4}>
              <button 
                onClick={() => handleUploadClick('start')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <button 
                onClick={() => handleSelectFromCanvas('start')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
              >
                <ImageIcon className="w-3 h-3" />
                From Canvas
              </button>
            </PopoverContent>
          </Popover>

          {/* End Frame */}
          <Popover open={showFrameMenu === 'end'} onOpenChange={(open) => !open && setShowFrameMenu(null)}>
            <PopoverTrigger asChild>
              <div 
                className="w-10 h-10 rounded-xl border-2 border-border/60 bg-muted/50 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-border transition-colors"
                onClick={() => handleFrameClick('end')}
              >
                {endFrame ? (
                  <>
                    <img src={endFrame.url} alt="End" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEndFrame(null); }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </>
                ) : (
                  <Plus className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" side="top" sideOffset={4}>
              <button 
                onClick={() => handleUploadClick('end')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <button 
                onClick={() => handleSelectFromCanvas('end')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
              >
                <ImageIcon className="w-3 h-3" />
                From Canvas
              </button>
            </PopoverContent>
          </Popover>

          {/* Swap button */}
          {(startFrame || endFrame) && (
            <button
              onClick={(e) => { e.stopPropagation(); swapFrames(); }}
              className="w-6 h-6 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
              title="Swap frames"
            >
              <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-3 py-2 bg-background rounded-b-2xl">
          {/* Left: Pill Toggle */}
          <div className="flex items-center bg-muted rounded-full p-0.5 h-7">
            <button
              onClick={() => setActiveTab('frames')}
              className={pillClasses('frames')}
            >
              Frames
            </button>
            <button
              onClick={() => setActiveTab('motion')}
              className={pillClasses('motion')}
            >
              Motion
            </button>
          </div>

          {/* Right: Aspect Ratio, Duration, Generate */}
          <div className="flex items-center gap-1.5">
            {/* Aspect Ratio - compact */}
            <Select 
              value={selectedFormat} 
              onValueChange={(v) => onFormatChange?.(v, v === '16:9' ? { width: 1280, height: 720 } : { width: 720, height: 1280 })}
            >
              <SelectTrigger className="h-7 w-14 text-xs border-0 bg-muted rounded-full px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
              </SelectContent>
            </Select>

            {/* Duration - compact */}
            <Select 
              value={String(selectedDuration)} 
              onValueChange={(v) => onDurationChange?.(Number(v))}
            >
              <SelectTrigger className="h-7 w-12 text-xs border-0 bg-muted rounded-full px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4s</SelectItem>
                <SelectItem value="8">8s</SelectItem>
                <SelectItem value="12">12s</SelectItem>
              </SelectContent>
            </Select>

            {/* Generate Button - pill with credits */}
            <Button
              size="sm"
              className="h-7 px-3 gap-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleGenerate}
              disabled={isLoading || (!getTextContent().trim() && !startFrame && !endFrame && editCommands.length === 0)}
            >
              <Zap className="w-3 h-3 fill-current" />
              <span className="text-xs">{creditsNeeded}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Asset Tagging Popup for selecting from canvas (frame selection) */}
      {showAssetPopup && canvasInstance && (
        <div 
          className="fixed z-[100000] bg-background rounded-lg border border-border overflow-hidden"
          style={{
            left: `${position.x - 100}px`,
            top: `${position.y - 300}px`,
            width: '200px'
          }}
        >
          <AssetTaggingPopup
            isOpen={showAssetPopup}
            onClose={() => {
              setShowAssetPopup(false);
              setSelectingFrameType(null);
            }}
            canvasInstance={canvasInstance}
            searchQuery=""
            onSelectAsset={handleAssetSelected}
          />
        </div>
      )}

      {/* Video Upgrade Modal for Free Users */}
      <VideoUpgradeModal 
        open={showVideoUpgradeModal} 
        onOpenChange={(open) => {
          setShowVideoUpgradeModal(open);
          // If they close the modal without upgrading, close the whole video generator
          if (!open && !hasVideoAccess(subscriptionTier)) {
            onClose();
          }
        }}
        featureAttempted="Video Generation"
      />
    </>
  );
};

export default VideoGeneratorChat;
