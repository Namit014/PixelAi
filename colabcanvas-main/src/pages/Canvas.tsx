import { useEffect, useState, useRef, useCallback } from 'react';
import { collectAllSaveableObjects } from '@/lib/canvas/frameReparenting';
import { createBooleanGroup } from '@/lib/canvas/flattenEngine';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { refreshSignedUrlIfNeeded, isSignedUrlExpired, getSignedAssetUrl } from '@/lib/storageUtils';
import { Button } from '@/components/ui/button';
import CanvasToolbar from '@/components/canvas/CanvasToolbar';
import CanvasToolPanel from '@/components/canvas/CanvasToolPanel';
import CanvasBottomControls from '@/components/canvas/CanvasBottomControls';
import InfiniteCanvas from '@/components/canvas/InfiniteCanvas';
import type { CanvasLayer } from '@/components/canvas/InfiniteCanvas';
import { getFormatDimensions } from '@/components/canvas/FormatSelector';
import ChatInterface from '@/components/chat/ChatInterface';
import colabLogo from '@/assets/colab-logo.svg';
import { EffectsPanel } from '@/components/canvas/EffectsPanel';
import { CanvasComponentsPanel } from '@/components/canvas/CanvasComponentsPanel';
import { FontGeneratorPanel } from '@/components/canvas/FontGeneratorPanel';
// Icons are now rendered via PlaceholderIconOverlay component
import LayersPanel from '@/components/canvas/LayersPanel';
import type { Layer } from '@/components/canvas/LayersPanel';
import FloatingEditChat from '@/components/canvas/FloatingEditChat';
import TextPropertiesPanel from '@/components/canvas/TextPropertiesPanel';
import ColorPropertiesPanel from '@/components/canvas/ColorPropertiesPanel';
import PromptHistoryBar from '@/components/canvas/PromptHistoryBar';
import { FloatingSelectionToolbar } from '@/components/canvas/FloatingSelectionToolbar';
import { MultiSelectToolbar } from '@/components/canvas/MultiSelectToolbar';
import { User } from '@supabase/supabase-js';
import { generateCanvasThumbnail, setupThumbnailAutoUpdate } from '@/lib/canvasThumbnail';
import { applyWatermarkToImage } from '@/lib/clientWatermark';
import { calculateGridPositions, findNonOverlappingPosition } from '@/lib/canvasLayout';
import { findNonOverlappingSpot, type PlacementRect } from '@/lib/canvas/placement';
import { applyShaderToObject } from '@/lib/shaders/applyShaderToObject';
import type { ShaderConfig } from '@/lib/shaders/shaderDefinitions';
import type { PinTag } from '@/types/pinTag';
import { FabricImage, Rect, Group, ActiveSelection } from 'fabric';
import { AssetPickerModal } from '@/components/assets/AssetPickerModal';
import { ImportFromBrandPanel } from '@/components/assets/ImportFromBrandPanel';
import { ExportToBrandDialog } from '@/components/assets/ExportToBrandDialog';
import { ShareProjectDialog } from '@/components/canvas/ShareProjectDialog';
import { CollaboratorAvatars } from '@/components/canvas/CollaboratorAvatars';
import { RealtimeCursors } from '@/components/canvas/RealtimeCursors';
import { DesignAdaptationPanel } from '@/components/canvas/DesignAdaptationPanel';
import { TranslateTextPanel } from '@/components/canvas/TranslateTextPanel';
import { QRCodeGenerator } from '@/components/canvas/generators/QRCodeGenerator';
import { AssetGeneratorPanel } from '@/components/canvas/generators/AssetGeneratorPanel';
import VideoGeneratorChat from '@/components/canvas/VideoGeneratorChat';
import VideoPlaceholderInfoOverlay from '@/components/canvas/VideoPlaceholderInfoOverlay';
import { SvgAnimationTimeline } from '@/components/canvas/SvgAnimationTimeline';
import { SvgAnimationPropertiesPanel } from '@/components/canvas/SvgAnimationPropertiesPanel';
import { useSvgAnimationStore, createDefaultAnimationConfig } from '@/stores/svgAnimationStore';

import { toast as sonnerToast } from 'sonner';
import { useVideoJobPolling } from '@/hooks/useVideoJobPolling';
import { useCanvasRealtimeSync } from '@/hooks/useCanvasRealtimeSync';
import { RealtimeSketchPanel } from '@/components/canvas/RealtimeSketchPanel';
import { FabricImage as FabricImageImport } from 'fabric';

const Canvas = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [canvasError, setCanvasError] = useState<Error | null>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [artboards, setArtboards] = useState<any[]>([]);
  const [canvasObjects, setCanvasObjects] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState('select');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // BUG FIX #6: Undo/Redo state — use refs to avoid stale closures
  const canvasHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [, forceHistoryRender] = useState(0);
  const MAX_HISTORY = 50;
  const loadedArtboardsRef = useRef<Set<string>>(new Set());
  const [generatingArtboards, setGeneratingArtboards] = useState<{
    id: string;
    title: string;
    width: number;
    height: number;
    position_x: number;
    position_y: number;
  }[]>([]);
  const [selectedArtboardForEdit, setSelectedArtboardForEdit] = useState<string | null>(null);
  const [editChatPosition, setEditChatPosition] = useState({
    x: 100,
    y: 100
  });
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layerRefreshKey, setLayerRefreshKey] = useState(0);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
   const [canvasBgColor, setCanvasBgColor] = useState('#FFFFFF');
   
   // Apply bg color to Fabric canvas instance
   useEffect(() => {
     if (canvasInstanceRef.current) {
       canvasInstanceRef.current.backgroundColor = canvasBgColor;
       canvasInstanceRef.current.renderAll();
     }
   }, [canvasBgColor]);
  const [isLayersPanelExpanded, setIsLayersPanelExpanded] = useState(false);
  const [selectedArtboardId, setSelectedArtboardId] = useState<string | null>(null);
  const [selectedArtboardImageUrl, setSelectedArtboardImageUrl] = useState<string | null>(null);
  const [zoomPercentage, setZoomPercentage] = useState(100);
  const [selectedCanvasObject, setSelectedCanvasObject] = useState<any>(null);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  
  // FIX #2: Track viewport transform for realtime cursors
  const [viewportTransform, setViewportTransform] = useState<number[]>([1, 0, 0, 1, 0, 0]);
  
  // SVG animation overlay ref
  const svgOverlayRef = useRef<HTMLDivElement | null>(null);
  const [svgOverlayElement, setSvgOverlayElement] = useState<SVGElement | null>(null);
  
  
  // Multi-select toolbar state
  const [multiSelectPosition, setMultiSelectPosition] = useState<{ x: number; y: number } | null>(null);
  const [multiSelectCount, setMultiSelectCount] = useState(0);
  
  // Pin tag state
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinTags, setPinTags] = useState<PinTag[]>([]);
  
  // BUG FIX #5: Brush state - managed at parent level for sidebar flyout
  const [brushWidth, setBrushWidth] = useState(4);
  const [brushStyle, setBrushStyle] = useState<any>({
    name: 'Heist',
    width: 4,
    opacity: 0.9,
    smoothness: 0.8,
    variability: 0.1,
    pressureSensitivity: 0.8,
    preset: 'heist'
  });
  
  // Realtime Sketch-to-Image state
  const [realtimeSketchMode, setRealtimeSketchMode] = useState(false);
  
  const [realtimeSketchResult, setRealtimeSketchResult] = useState<string | null>(null);
  const [realtimeSketchPrompt, setRealtimeSketchPrompt] = useState('');
  const realtimeSketchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeSketchBrushesRef = useRef<any[]>([]);
  const isSketchGeneratingRef = useRef(false);
  const pendingSketchGenerationRef = useRef(false);
  
  // BUG FIX #7: Asset picker state - moved to sidebar
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showImportFromBrand, setShowImportFromBrand] = useState(false);
  const [showExportToBrand, setShowExportToBrand] = useState(false);
  
  // New panel states for design adaptation, translation, and generators
  const [showDesignAdaptation, setShowDesignAdaptation] = useState(false);
  const [showTranslateText, setShowTranslateText] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showAssetGenerator, setShowAssetGenerator] = useState(false);
  const [assetGeneratorType, setAssetGeneratorType] = useState<string>('sticker');
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showFontGenerator, setShowFontGenerator] = useState(false);
  const [showComponentsPanel, setShowComponentsPanel] = useState(false);
  const [showSvgAnimation, setShowSvgAnimation] = useState(false);
  const [selectedSvgChildIndex, setSelectedSvgChildIndex] = useState<number | null>(null);
  // Bug 3 fix: useEffect to set up SVG overlay when animation mode toggles
  useEffect(() => {
    if (!showSvgAnimation || !selectedCanvasObject) {
      setSvgOverlayElement(null);
      return;
    }
    const svgSource = (selectedCanvasObject as any)?.svgSource;
    if (!svgSource || !svgOverlayRef.current) {
      const timer = setTimeout(() => {
        if (svgOverlayRef.current && svgSource) {
          svgOverlayRef.current.innerHTML = svgSource;
          const svgEl = svgOverlayRef.current.querySelector('svg');
          if (svgEl) setSvgOverlayElement(svgEl);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
    svgOverlayRef.current.innerHTML = svgSource;
    const svgEl = svgOverlayRef.current.querySelector('svg');
    if (svgEl) setSvgOverlayElement(svgEl);
  }, [showSvgAnimation, selectedCanvasObject]);

  // Per-path click selection in SVG overlay for animation
  useEffect(() => {
    if (!svgOverlayElement) return;
    const paths = svgOverlayElement.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse');
    const cleanups: (() => void)[] = [];
    const selectedIdx = useSvgAnimationStore.getState().selectedPathIndex;
    paths.forEach((el, idx) => {
      const htmlEl = el as SVGElement;
      // Set pointer events for clickability
      htmlEl.style.pointerEvents = 'all';
      htmlEl.style.cursor = 'pointer';
      // Highlight selected path
      if (idx === selectedIdx) {
        htmlEl.style.stroke = 'hsl(var(--primary))';
        htmlEl.style.strokeWidth = '2';
      }
      const handler = (e: Event) => {
        e.stopPropagation();
        useSvgAnimationStore.getState().setSelectedPathIndex(idx);
      };
      htmlEl.addEventListener('click', handler);
      cleanups.push(() => htmlEl.removeEventListener('click', handler));
    });
    return () => cleanups.forEach(fn => fn());
  }, [svgOverlayElement, useSvgAnimationStore.getState().selectedPathIndex]);
  const getViewportCenterRef = useRef<(() => {
    x: number;
    y: number;
  }) | null>(null);
  const focusArtboardRef = useRef<((id: string) => void) | null>(null);
  const getLayersRef = useRef<(() => CanvasLayer[]) | null>(null);
  const canvasZoomRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    getZoom: () => number;
  } | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const updatePropertiesRef = useRef<((properties: any) => void) | null>(null);
  const canvasInstanceRef = useRef<any>(null);

  // Image Generator Placeholder State with dynamic format/resolution
  const [generatorFormat, setGeneratorFormat] = useState<string>('9:16');
  const [generatorResolution, setGeneratorResolution] = useState<string>('1K');
  
  // getFormatDimensions is now imported from FormatSelector.tsx

  const [imageGeneratorPlaceholder, setImageGeneratorPlaceholder] = useState<{
    id: string;
    rect: any;
    format: string;
    dimensions: {
      width: number;
      height: number;
    };
  } | null>(null);
  const [selectedImageModel, setSelectedImageModel] = useState('google/gemini-2.5-flash-image');

  // Video Generator Placeholder State
  const [videoGeneratorFormat, setVideoGeneratorFormat] = useState<string>('16:9');
  const [videoGeneratorDuration, setVideoGeneratorDuration] = useState<number>(4);
  const [videoGeneratorPlaceholder, setVideoGeneratorPlaceholder] = useState<{
    id: string;
    rect: any;
    format: string;
    dimensions: { width: number; height: number };
    duration: number;
  } | null>(null);
  
  // Video job polling - ensures video generation completes even if chat is closed
  const { pendingJobs, refetchJobs } = useVideoJobPolling({
    projectId: currentProject?.id || '',
    onVideoComplete: (videoUrl, jobId) => {
      console.log('Background video job completed:', jobId, videoUrl);
      sonnerToast.success('Video generation completed!', {
        description: 'Your video is ready. Opening...',
        action: {
          label: 'Open',
          onClick: () => window.open(videoUrl, '_blank')
        }
      });
    },
    enabled: !!currentProject?.id
  });

  // Real-time canvas object sync for co-editing
  useCanvasRealtimeSync({
    projectId: currentProject?.id || '',
    currentUserId: user?.id || '',
    canvas: canvasInstanceRef.current,
    isEnabled: !!currentProject?.id && !!user?.id,
  });
  
  // ─── Agent Mode: postMessage handler for RUMi autonomous agent ───
  const isAgentMode = searchParams.get('agentMode') === 'true';
  
  useEffect(() => {
    if (!isAgentMode) return;
    
    // Signal parent that iframe is ready
    window.parent.postMessage({ source: 'RUMI_AGENT', type: 'READY' }, '*');
    
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (!msg || msg.source !== 'RUMI_AGENT' || !msg.command) return;
      
      const canvas = canvasInstanceRef.current;
      if (!canvas) {
        window.parent.postMessage({ source: 'RUMI_AGENT', ack: true, actionId: msg.actionId, success: false }, '*');
        return;
      }
      
      try {
        switch (msg.command) {
          case 'canvas_add_image': {
            const { imageUrl, x = 100, y = 100, width = 400, height = 400 } = msg.payload || {};
            if (imageUrl) {
              FabricImage.fromURL(imageUrl as string).then(img => {
                img.set({
                  left: x as number, top: y as number,
                  originX: 'left', originY: 'top',
                  selectable: !isAgentMode, hasControls: !isAgentMode,
                });
                const scale = Math.min((width as number) / (img.width || 1), (height as number) / (img.height || 1), 1);
                img.scale(scale);
                (img as any).isStandaloneObject = true;
                (img as any).canvasObjectId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                canvas.add(img);
                canvas.renderAll();
              });
            }
            break;
          }
          case 'canvas_add_text': {
            const { text = 'Text', x = 100, y = 100, fontSize = 24, fill = '#111111' } = msg.payload || {};
            import('fabric').then(({ IText }) => {
              const textObj = new IText(text as string, {
                left: x as number, top: y as number,
                fontSize: fontSize as number,
                fill: fill as string,
                fontFamily: 'Inter',
              });
              (textObj as any).isStandaloneObject = true;
              (textObj as any).canvasObjectId = `agent_text_${Date.now()}`;
              canvas.add(textObj);
              canvas.renderAll();
            });
            break;
          }
          case 'canvas_select_object': {
            const { objectId } = msg.payload || {};
            const target = canvas.getObjects().find((o: any) => o.canvasObjectId === objectId);
            if (target) { canvas.setActiveObject(target); canvas.renderAll(); }
            break;
          }
          case 'canvas_move_object': {
            const { objectId: moveId, x: mx, y: my } = msg.payload || {};
            const moveTarget = canvas.getObjects().find((o: any) => o.canvasObjectId === moveId);
            if (moveTarget) {
              moveTarget.set({ left: mx as number, top: my as number });
              moveTarget.setCoords();
              canvas.renderAll();
            }
            break;
          }
        }
        
        window.parent.postMessage({ source: 'RUMI_AGENT', ack: true, actionId: msg.actionId, success: true }, '*');
      } catch (err) {
        console.error('[AgentMode] Command failed:', err);
        window.parent.postMessage({ source: 'RUMI_AGENT', ack: true, actionId: msg.actionId, success: false }, '*');
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isAgentMode]);

  const handleCanvasError = useCallback((error: Error) => {
    console.error('Canvas error:', error);
    setCanvasError(error);
    toast({
      title: 'Canvas Error',
      description: 'Canvas encountered an error. Click "Reload Canvas" to recover.',
      variant: 'destructive'
    });
  }, [toast]);

  // FIX #10: Handle direct image upload from toolbar
  const handleImageUpload = useCallback((file: File) => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) {
      sonnerToast.error('Canvas not ready');
      return;
    }

    // Handle SVG files as vector groups
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      file.text().then(async (svgText) => {
        try {
          const { loadSVGFromString, Group: FabricGroup } = await import('fabric');
          const result = await loadSVGFromString(svgText);
          if (!result || !result.objects || result.objects.length === 0) {
            sonnerToast.error('Failed to parse SVG');
            console.error('SVG parse returned empty result');
            return;
          }
          const center = canvas.getVpCenter();
          const group = new FabricGroup(result.objects.filter(Boolean), {
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
          });
          (group as any).isSvgIcon = true;
          (group as any).isStandaloneObject = true;
          (group as any).canvasObjectId = `svg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          (group as any).svgPathCount = result.objects.filter(Boolean).length;
          (group as any).svgSource = svgText;
          canvas.add(group);
          canvas.setActiveObject(group);
          canvas.renderAll();
          sonnerToast.success('SVG added to canvas');
        } catch (err) {
          console.error('SVG import failed:', err);
          sonnerToast.error('Failed to import SVG');
        }
      }).catch((err) => {
        console.error('SVG file read failed:', err);
        sonnerToast.error('Failed to read SVG file');
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        const center = canvas.getVpCenter();
        img.set({
          left: center.x,
          top: center.y,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          name: 'Image',
          id: crypto.randomUUID(),
        });
        
        // Scale to reasonable size
        const maxSize = 400;
        const scale = Math.min(
          maxSize / (img.width || 1), 
          maxSize / (img.height || 1),
          1 // Don't upscale
        );
        img.scale(scale);
        
        // Mark as standalone object for layer tracking
        (img as any).isStandaloneObject = true;
        (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        
        sonnerToast.success('Image added to canvas');
      }).catch(err => {
        console.error('Failed to load image:', err);
        sonnerToast.error('Failed to load image');
      });
    };
    reader.onerror = () => {
      sonnerToast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, []);

  // BUG FIX #6: Undo/Redo functions — refs to avoid stale closures
  const isLoadingHistoryRef = useRef(false);
  
  const HISTORY_CUSTOM_PROPS = [
    'artboardId', 'isArtboard', 'isTitle', 'fullTitle', 
    'isStandaloneObject', 'object_id', 'id', 'instructionShown',
    'canvasObjectId', 'databaseUUID',
    'isSvgIcon', 'svgSource', 'svgPathCount',
    'isVideo', 'videoUrl', 'rx', 'ry',
    '__blurConfig', '__backgroundBlur', '__progressiveBlur',
    'parentFrameId',
    'fontMetadata',
  ];

  const restoreObjectFlags = (canvas: any) => {
    canvas.getObjects().forEach((obj: any) => {
      if (obj.artboardId) obj.isArtboard = true;
      if (obj.isTitle) { obj.selectable = true; obj.editable = true; }
      obj.set({
        borderColor: 'rgb(59, 130, 246)',
        cornerColor: 'rgb(255, 255, 255)',
        cornerSize: 8,
        cornerStyle: 'circle',
        transparentCorners: false,
        cornerStrokeColor: 'rgb(59, 130, 246)',
      });
    });
    canvas.requestRenderAll();
  };

  const saveCanvasState = useCallback(() => {
    if (!canvasInstanceRef.current || isLoadingHistoryRef.current) return;
    
    try {
      const canvasState = JSON.stringify(
        canvasInstanceRef.current.toJSON(HISTORY_CUSTOM_PROPS)
      );
      
      const history = canvasHistoryRef.current;
      const idx = historyIndexRef.current;
      // Truncate any future (redo) states
      const newHistory = history.slice(0, idx + 1);
      newHistory.push(canvasState);
      // Trim oldest if over limit
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      canvasHistoryRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
      forceHistoryRender(n => n + 1);
    } catch (err) {
      console.error('Failed to save canvas state:', err);
    }
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;
    
    const idx = historyIndexRef.current;
    const history = canvasHistoryRef.current;
    
    if (idx <= 0 || history.length === 0) {
      toast({ title: 'Nothing to undo' });
      return;
    }
    
    const newIndex = idx - 1;
    const state = history[newIndex];
    if (!state) return;
    
    isLoadingHistoryRef.current = true;
    canvas.loadFromJSON(JSON.parse(state)).then(() => {
      restoreObjectFlags(canvas);
      historyIndexRef.current = newIndex;
      forceHistoryRender(n => n + 1);
      canvas.requestRenderAll();
      // Keep the flag true for 600ms to swallow cascading object:added/removed events
      setTimeout(() => {
        isLoadingHistoryRef.current = false;
      }, 600);
    }).catch(() => {
      isLoadingHistoryRef.current = false;
    });
  }, [toast]);
  
  const handleRedo = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;
    
    const idx = historyIndexRef.current;
    const history = canvasHistoryRef.current;
    
    if (idx >= history.length - 1) {
      toast({ title: 'Nothing to redo' });
      return;
    }
    
    const newIndex = idx + 1;
    const state = history[newIndex];
    if (!state) return;
    
    isLoadingHistoryRef.current = true;
    canvas.loadFromJSON(JSON.parse(state)).then(() => {
      restoreObjectFlags(canvas);
      historyIndexRef.current = newIndex;
      forceHistoryRender(n => n + 1);
      canvas.requestRenderAll();
      // Keep the flag true for 600ms to swallow cascading object:added/removed events
      setTimeout(() => {
        isLoadingHistoryRef.current = false;
      }, 600);
    }).catch(() => {
      isLoadingHistoryRef.current = false;
    });
  }, [toast]);
  
  // FIX #2: Use viewport transform + canvas element offset for accurate screen-absolute positioning
  const updateFloatingToolbarPosition = useCallback((obj: any) => {
    if (!obj || !canvasInstanceRef.current) {
      setShowFloatingToolbar(false);
      return;
    }
    try {
      const canvas = canvasInstanceRef.current;
      const bounds = obj.getBoundingRect?.();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      // Get canvas element's screen offset for fixed positioning
      const canvasEl = canvas.upperCanvasEl || canvas.lowerCanvasEl;
      const canvasRect = canvasEl?.getBoundingClientRect() || { left: 0, top: 0 };
      if (!bounds || (bounds.width === 0 && bounds.height === 0)) {
        requestAnimationFrame(() => {
          try {
            const b = obj.getBoundingRect?.();
            const el = canvas.upperCanvasEl || canvas.lowerCanvasEl;
            const rect = el?.getBoundingClientRect() || { left: 0, top: 0 };
            if (b && b.width > 0) {
              setFloatingToolbarPosition({
                x: b.left * zoom + vpt[4] + rect.left + (b.width * zoom) / 2,
                y: b.top * zoom + vpt[5] + rect.top
              });
              setShowFloatingToolbar(true);
            }
          } catch { /* ignore */ }
        });
        return;
      }
      setFloatingToolbarPosition({
        x: bounds.left * zoom + vpt[4] + canvasRect.left + (bounds.width * zoom) / 2,
        y: bounds.top * zoom + vpt[5] + canvasRect.top
      });
      setShowFloatingToolbar(true);
    } catch {
      setShowFloatingToolbar(false);
    }
  }, []);
  
  const reloadCanvas = useCallback(async () => {
    setCanvasError(null);
    setIsLoading(true);

    // Clear all refs
    loadedArtboardsRef.current = new Set();

    // Reload project data
    if (user?.id) {
      await loadOrCreateProject(user.id);
    }
    setIsLoading(false);
    toast({
      title: 'Canvas Reloaded',
      description: 'Canvas has been successfully reloaded'
    });
  }, [user, toast]);

  // BUG FIX #6: Wire up canvas history - save state after modifications
  // CRITICAL: Only save initial state AFTER loading is complete and objects are on canvas
  const hasInitializedHistoryRef = useRef(false);
  
  useEffect(() => {
    if (!canvasInstanceRef.current || isLoading) return;
    const canvas = canvasInstanceRef.current;
    
    // Save initial state with custom props
    if (!hasInitializedHistoryRef.current && canvasHistoryRef.current.length === 0) {
      const timer = setTimeout(() => {
        try {
          const objectCount = canvas.getObjects().length;
          const initialState = JSON.stringify(canvas.toJSON(HISTORY_CUSTOM_PROPS));
          canvasHistoryRef.current = [initialState];
          historyIndexRef.current = 0;
          hasInitializedHistoryRef.current = true;
          forceHistoryRender(n => n + 1);
          console.log('✅ Saved initial canvas state for undo/redo with', objectCount, 'objects');
        } catch (err) {
          console.error('Failed to save initial canvas state:', err);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleModified = () => {
      if (isLoadingHistoryRef.current || !hasInitializedHistoryRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Double-check flag at execution time to prevent race conditions
        if (!isLoadingHistoryRef.current) {
          saveCanvasState();
        }
      }, 300);
    };
    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);
    canvas.on('object:moved', handleModified);
    canvas.on('object:scaled', handleModified);
    canvas.on('object:rotated', handleModified);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      canvas.off('object:modified', handleModified);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
      canvas.off('object:moved', handleModified);
      canvas.off('object:scaled', handleModified);
      canvas.off('object:rotated', handleModified);
    };
  }, [saveCanvasState, isLoading, artboards.length]);

  // Floating toolbar: Update position on selection, movement, and zoom
  // Use isCanvasReady state to guarantee canvasInstanceRef is populated
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  useEffect(() => {
    if (!isCanvasReady || !canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;

    const handleSelection = (e: any) => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && !activeObj.isArtboard) {
        updateFloatingToolbarPosition(activeObj);
      } else {
        setShowFloatingToolbar(false);
      }
    };

    const handleDeselection = () => {
      setShowFloatingToolbar(false);
      setSelectedSvgChildIndex(null);
      // Close animation mode when deselecting
      if (showSvgAnimation) {
        setShowSvgAnimation(false);
        useSvgAnimationStore.getState().setActiveAnimation(null);
        svgOverlayRef.current = null;
        setSvgOverlayElement(null);
      }
    };
    
    // Also update on zoom/pan
    const handleViewportChange = () => {
      const activeObj = canvas.getActiveObject();
      if (activeObj && !activeObj.isArtboard) {
        updateFloatingToolbarPosition(activeObj);
      }
      // FIX #2: Update viewport transform state for realtime cursors
      if (canvas.viewportTransform) {
        setViewportTransform([...canvas.viewportTransform]);
      }
    };

    // Throttled handler for continuous events (moving/scaling/rotating)
    let moveRafId = 0;
    const throttledSelection = () => {
      if (moveRafId) return;
      moveRafId = requestAnimationFrame(() => {
        moveRafId = 0;
        handleSelection({} as any);
      });
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('object:moving', throttledSelection);
    canvas.on('object:scaling', throttledSelection);
    canvas.on('object:rotating', throttledSelection);
    canvas.on('selection:cleared', handleDeselection);
    canvas.on('mouse:wheel', handleViewportChange);

    return () => {
      cancelAnimationFrame(moveRafId);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('object:moving', throttledSelection);
      canvas.off('object:scaling', throttledSelection);
      canvas.off('object:rotating', throttledSelection);
      canvas.off('selection:cleared', handleDeselection);
      canvas.off('mouse:wheel', handleViewportChange);
    };
  }, [updateFloatingToolbarPosition, isCanvasReady, showSvgAnimation]);

  // SVG child path hover/click detection for on-canvas color editing
  useEffect(() => {
    if (!isCanvasReady || !canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    let hoveredChild: any = null;
    let originalStroke: string | null = null;
    let originalStrokeWidth: number = 0;

    const handleMouseMove = (e: any) => {
      const activeObj = canvas.getActiveObject();
      if (!activeObj || !(activeObj as any).isSvgIcon || !activeObj._objects) return;
      
      const pointer = canvas.getScenePoint(e.e);
      const children = activeObj._objects;
      let found: any = null;
      let foundIdx = -1;

      // Iterate children in reverse (top-most first)
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.containsPoint && child.containsPoint(pointer)) {
          found = child;
          foundIdx = i;
          break;
        }
      }

      if (found !== hoveredChild) {
        // Restore previous
        if (hoveredChild) {
          hoveredChild.set({ stroke: originalStroke, strokeWidth: originalStrokeWidth });
        }
        if (found) {
          originalStroke = found.stroke || null;
          originalStrokeWidth = found.strokeWidth || 0;
          found.set({ stroke: 'hsl(var(--primary))', strokeWidth: 2 });
        }
        hoveredChild = found;
        canvas.renderAll();
      }
    };

    const handleMouseDown = (e: any) => {
      const activeObj = canvas.getActiveObject();
      if (!activeObj || !(activeObj as any).isSvgIcon || !activeObj._objects) return;
      
      const pointer = canvas.getScenePoint(e.e);
      const children = activeObj._objects;

      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].containsPoint && children[i].containsPoint(pointer)) {
          setSelectedSvgChildIndex(i);
          return;
        }
      }
    };

    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:down', handleMouseDown);

    return () => {
      // Restore hover state
      if (hoveredChild) {
        hoveredChild.set({ stroke: originalStroke, strokeWidth: originalStrokeWidth });
        canvas.renderAll();
      }
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [isCanvasReady]);

  // BUG FIX #6: Add keyboard shortcuts for undo/redo
  // FIXED: Don't trigger during text editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger undo/redo while editing text in the canvas
      const canvas = canvasInstanceRef.current;
      const activeObject = canvas?.getActiveObject();
      if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox') && (activeObject as any).isEditing) {
        return; // Let text editing handle its own undo/redo
      }
      
      // Don't trigger if focus is in an input/textarea element
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && ((e.key === 'y') || (e.key === 'Z' && e.shiftKey) || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Refresh layers periodically to capture canvas changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (getLayersRef.current) {
        const updatedLayers = getLayersRef.current();
        setLayers(updatedLayers);
      }
    }, 5000); // Changed from 500ms to 5000ms (5 seconds) to reduce re-renders

    return () => clearInterval(interval);
  }, []);

  // Setup automatic thumbnail generation
  useEffect(() => {
    if (!currentProject?.id) return;
    const cleanup = setupThumbnailAutoUpdate(currentProject.id, () => canvasElementRef.current, () => artboards, () => canvasObjects);
    return cleanup;
  }, [currentProject?.id, artboards, canvasObjects]);
  useEffect(() => {
    // Check authentication and load subscription tier
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[Canvas] AUTH_REDIRECT: No session found during checkAuth, redirecting to /auth');
        navigate('/auth');
        return;
      }
      setUser(session.user);

      // Load subscription tier
      const {
        data: credits
      } = await supabase.from('credits').select('subscription_tier').eq('user_id', session.user.id).single();
      setSubscriptionTier(credits?.subscription_tier || 'free');
      await loadOrCreateProject(session.user.id);
      setIsLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        console.warn('[Canvas] AUTH_REDIRECT: Auth state changed to signed out, redirecting to /auth. Event:', _event);
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // ─── Hot-reload project when projectId in URL changes ──────────────
  const urlProjectId = searchParams.get('projectId');
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 Project ID changed in URL. Loading project:', urlProjectId);
      setIsLoading(true);
      loadOrCreateProject(user.id).finally(() => {
        setIsLoading(false);
      });
    }
  }, [urlProjectId, user?.id]);

  // Load template images if template_category parameter is present
  useEffect(() => {
    const loadTemplateImages = async () => {
      const templateCategory = searchParams.get('template_category');
      if (!templateCategory || !currentProject || !user) return;
      try {
        console.log('🎨 Loading template category:', templateCategory);
        const {
          data,
          error
        } = await supabase.functions.invoke('get-template-category', {
          body: {
            category: templateCategory
          }
        });
        if (error) throw error;
        const templateImages = data?.template_images || [];
        if (templateImages.length > 0 && canvasInstanceRef.current) {
          console.log('📸 Loading', templateImages.length, 'template images');

          // Load images onto canvas as reference objects
          const fabricCanvas = canvasInstanceRef.current;
          const center = getViewportCenterRef.current?.() || {
            x: 400,
            y: 300
          };
          let xOffset = center.x - 400;
          for (const imageUrl of templateImages) {
            try {
              const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = imageUrl;
              });
              const {
                FabricImage
              } = await import('fabric');
              const fabricImage = new FabricImage(img, {
                left: xOffset,
                top: center.y - 300,
                selectable: true,
                evented: true,
                opacity: 0.8
              });
              fabricCanvas.add(fabricImage);
              fabricCanvas.sendObjectToBack(fabricImage);
              xOffset += img.naturalWidth + 20;
            } catch (imgError) {
              console.error('Error loading template image:', imgError);
            }
          }
          fabricCanvas.requestRenderAll();
          toast({
            title: 'Template Loaded',
            description: `${templateImages.length} reference image(s) added to canvas`
          });
        }
      } catch (error) {
        console.error('Error loading template category:', error);
      }
    };
    loadTemplateImages();
  }, [searchParams, currentProject, user, toast]);

  // Realtime sync for canvas objects - prevents data loss on reload
  // Realtime subscription removed to prevent race conditions
  // Objects are saved on every change and loaded on mount
  // This is more predictable and production-grade
  const loadOrCreateProject = async (userId: string) => {
    try {
      // Check if we need to force create a new project (e.g., from Think mode export or TrueVision landing)
      const forceNewProject = localStorage.getItem('forceNewProject');
      const isNewProjectQuery = searchParams.get('newProject') === 'true';
      if (forceNewProject || isNewProjectQuery) {
        if (forceNewProject) localStorage.removeItem('forceNewProject');
        console.log('📂 Creating new project (forced from Think/TrueVision)');
        
        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            title: 'Research Project',
            last_accessed_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!createError && newProject) {
          setCurrentProject(newProject);
          // Update URL with project ID
          window.history.replaceState(null, '', `/canvas?projectId=${newProject.id}`);
          await loadArtboards(newProject.id);
          await loadCanvasObjects(newProject.id);
          return;
        }
      }

      // BUG FIX #1: Check URL for specific projectId
      const urlProjectId = searchParams.get('projectId');
      if (urlProjectId) {
        // Load specific project from URL - first try as owner
        console.log('📂 Loading specific project:', urlProjectId);
        let { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', urlProjectId)
          .eq('user_id', userId)
          .single();
        
        // If not found as owner, check if user is a collaborator
        if (projectError || !project) {
          console.log('📂 Not owner, checking collaborator access...');
          const { data: collabCheck, error: collabError } = await supabase
            .from('project_collaborators')
            .select('permission, project_id')
            .eq('project_id', urlProjectId)
            .eq('user_id', userId)
            .single();
          
          if (!collabError && collabCheck) {
            console.log('📂 User is collaborator with permission:', collabCheck.permission);
            // Load project without user_id filter (RLS now allows this)
            const { data: collabProject, error: collabProjectError } = await supabase
              .from('projects')
              .select('*')
              .eq('id', urlProjectId)
              .single();
            
            if (!collabProjectError && collabProject) {
              project = collabProject;
            }
          }
        }
        
        if (project) {
          setCurrentProject(project);

          // BUG FIX #2: Update last_accessed_at timestamp (only if owner)
          if (project.user_id === userId) {
            await supabase.from('projects').update({
              last_accessed_at: new Date().toISOString()
            }).eq('id', project.id);
          }
          await loadArtboards(project.id);
          await loadCanvasObjects(project.id);
          return;
        } else {
          console.error('Error loading project - not owner or collaborator');
          toast({
            title: 'Access Denied',
            description: 'You do not have access to this project',
            variant: 'destructive'
          });
        }
      }

      // Try to load the most recent project (by last_accessed_at)
      const {
        data: projects,
        error: fetchError
      } = await supabase.from('projects').select('*').eq('user_id', userId).order('last_accessed_at', {
        ascending: false
      }).limit(1);
      if (fetchError) throw fetchError;
      if (projects && projects.length > 0) {
        setCurrentProject(projects[0]);

        // BUG FIX #2: Update last_accessed_at timestamp
        await supabase.from('projects').update({
          last_accessed_at: new Date().toISOString()
        }).eq('id', projects[0].id);
        
        // Update URL with project ID
        window.history.replaceState(null, '', `/canvas?projectId=${projects[0].id}`);
        
        await loadArtboards(projects[0].id);
        await loadCanvasObjects(projects[0].id);
      } else {
        // Create a new project if none exist
        const {
          data: newProject,
          error: createError
        } = await supabase.from('projects').insert({
          user_id: userId,
          title: 'Untitled Project',
          last_accessed_at: new Date().toISOString()
        }).select().single();
        if (createError) throw createError;
        setCurrentProject(newProject);
        
        // Update URL with project ID
        window.history.replaceState(null, '', `/canvas?projectId=${newProject.id}`);
      }
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive'
      });
    }
  };
  const loadArtboards = async (projectId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('artboards').select('*').eq('project_id', projectId).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setArtboards(data || []);
    } catch (error: any) {
      console.error('Error loading artboards:', error);
    }
  };
  const loadCanvasObjects = async (projectId: string) => {
    try {
      console.log('🔥 📦 Loading canvas objects for project:', projectId, {
        timestamp: new Date().toISOString()
      });

      // Load image objects WITH file_path and object_data to refresh expired signed URLs
      // CRITICAL: object_data contains the src for base64/data URL images
      const {
        data: imageObjects,
        error: imageError
      } = await supabase.from('canvas_objects').select('id, project_id, user_id, object_id, object_type, object_data, position_x, position_y, image_url, file_path, z_index, created_at, updated_at').eq('project_id', projectId).eq('object_type', 'image').order('created_at', {
        ascending: true
      });
      if (imageError) {
        console.error('❌ Error loading image objects:', {
          code: imageError.code,
          message: imageError.message,
          details: imageError.details,
          projectId
        });
        throw imageError;
      }
      console.log(`✅ Loaded ${imageObjects?.length || 0} image objects from DB`);

      // 🔥 FIX: Log each image object in detail
      if (imageObjects && imageObjects.length > 0) {
        console.log('🖼️ IMAGE OBJECTS DETAILS:');
        imageObjects.forEach((obj, idx) => {
          console.log(`  ${idx + 1}. Object ID: ${obj.object_id}`, {
            hasImageUrl: !!obj.image_url,
            imageUrlLength: obj.image_url?.length || 0,
            urlPreview: obj.image_url?.substring(0, 100) + '...',
            hasFilePath: !!obj.file_path,
            filePath: obj.file_path,
            isExpired: obj.image_url ? isSignedUrlExpired(obj.image_url) : null,
            position: {
              x: obj.position_x,
              y: obj.position_y
            }
          });
        });
      } else {
        console.log('⚠️ No image objects found in database for project:', projectId);
      }

      // ✅ REFRESH EXPIRED SIGNED URLS
      const refreshedImageObjects = await Promise.all((imageObjects || []).map(async obj => {
        if (obj.image_url && obj.file_path && isSignedUrlExpired(obj.image_url)) {
          console.log('🔄 Refreshing expired URL for:', obj.object_id);
          const newUrl = await refreshSignedUrlIfNeeded(obj.image_url, obj.file_path);

          // Update database with new URL
          await supabase.from('canvas_objects').update({
            image_url: newUrl
          }).eq('id', obj.id);
          return {
            ...obj,
            image_url: newUrl
          };
        }
        return obj;
      }));

      // Load non-image objects WITH object_data and file_path (needed for text, shapes, videos, etc.)
      const {
        data: nonImageObjects,
        error: nonImageError
      } = await supabase.from('canvas_objects').select('id, project_id, user_id, object_id, object_type, object_data, position_x, position_y, image_url, file_path, z_index, created_at, updated_at').eq('project_id', projectId).neq('object_type', 'image').order('created_at', {
        ascending: true
      });
      if (nonImageError) throw nonImageError;

      // Merge both arrays and sort by created_at
      const allObjects = [...refreshedImageObjects, ...(nonImageObjects || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      console.log('📦 Total canvas objects loaded:', allObjects.length);
      console.log('  - Image objects:', refreshedImageObjects.length);
      console.log('  - Non-image objects:', nonImageObjects?.length || 0);
      allObjects.forEach((obj, idx) => {
        console.log(`  ${idx + 1}. ${obj.object_type} [${obj.object_id}] - hasImageUrl: ${!!obj.image_url}`);
      });
      setCanvasObjects(allObjects);
      console.log('✅ Canvas objects state updated');

      // CRITICAL FIX: Force Fabric.js to reload images with refreshed URLs
      if (canvasInstanceRef.current) {
        console.log('🔄 Forcing Fabric.js to re-render images with new URLs');
        const canvas = canvasInstanceRef.current;
        let successCount = 0;
        let failCount = 0;
        allObjects.forEach(obj => {
          if (obj.object_type === 'image' && obj.image_url) {
            const fabricObj = canvas.getObjects().find((fObj: any) => fObj.canvasObjectId === obj.object_id);
            if (fabricObj && (fabricObj as any).setSrc) {
              console.log(`  ↳ Reloading image ${obj.object_id}`);
              (fabricObj as any).setSrc(obj.image_url, (img: any) => {
                if (img) {
                  successCount++;
                  console.log(`    ✅ Image ${obj.object_id} loaded successfully`);
                } else {
                  failCount++;
                  console.error(`    ❌ Image ${obj.object_id} failed to load`);
                }
                canvas.renderAll();
              });
            }
          }
        });
        console.log(`📊 Image reload results: ${successCount} success, ${failCount} failed`);
      }

      // Verify canvas state after load
      console.log('🎨 Canvas state after load:', {
        canvasObjectsCount: allObjects.length,
        objectTypes: allObjects.map(o => o.object_type),
        stateUpdated: true
      });
    } catch (error: any) {
      console.error('Error loading canvas objects:', error);
      // CRITICAL: Don't set empty array on error to prevent data wipe
    }
  };
  const handleNewArtboard = useCallback(async (imageUrl: string, title: string, x?: number, y?: number, artboardId?: string, isPlaceholder: boolean = false, directToCanvas: boolean = false, gridIndex?: number, filePath?: string, overrideWidth?: number, overrideHeight?: number): Promise<string | boolean> => {
    if (!currentProject || !user) return false; // FIX 1: Return false explicitly

    // If directToCanvas flag is set, add image directly without artboard
    if (directToCanvas && imageUrl && canvasInstanceRef.current) {
      try {
        console.log('🖼️ Adding image directly to canvas without artboard');
        const fabricCanvas = canvasInstanceRef.current;

        // Use grid layout if gridIndex is provided with collision detection
        let center = getViewportCenterRef.current?.() || {
          x: 400,
          y: 300
        };
        if (gridIndex !== undefined) {
          // Get existing canvas objects for collision detection
          const existingObjects = canvasObjects.map(obj => ({
            left: obj.data?.left || 0,
            top: obj.data?.top || 0,
            width: obj.data?.width,
            height: obj.data?.height
          }));

          // Calculate grid position with collision detection
          const positions = calculateGridPositions(10, center, undefined, existingObjects);
          center = positions[gridIndex] || center;
          console.log(`📍 Placing image at grid position ${gridIndex}:`, center);
        }

        // Apply watermark if free tier
        let finalImageUrl = imageUrl;
        if (subscriptionTier === 'free') {
          finalImageUrl = await applyWatermarkToImage(imageUrl);
        }

        // Load and add image to canvas
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = finalImageUrl;
        });
        const {
          FabricImage
        } = await import('fabric');

        // Generate objectId BEFORE creating the fabric object
        const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fabricImage = new FabricImage(img, {
          left: center.x - img.naturalWidth / 2,
          top: center.y - img.naturalHeight / 2,
          selectable: true,
          evented: true
        });

        // CRITICAL: Set canvasObjectId immediately to prevent duplication
        (fabricImage as any).canvasObjectId = objectId;
        (fabricImage as any).isStandaloneObject = true;

        // FIX 4: Set file_path on fabric object so it persists to database
        if (filePath) {
          (fabricImage as any).canvasFilePath = filePath;
          console.log('✅ SET canvasFilePath:', filePath);
        } else {
          console.error('❌ CRITICAL: filePath parameter is NULL - object will not persist!');
        }
        fabricCanvas.add(fabricImage);
        fabricCanvas.setActiveObject(fabricImage);
        fabricCanvas.requestRenderAll();

        // Database save will be handled by handleCanvasObjectsChange listener

        toast({
          title: 'Image Added!',
          description: 'Image added to canvas and saved'
        });
        return true;
      } catch (error) {
        console.error('Error adding image to canvas:', error);
        toast({
          title: 'Error',
          description: 'Failed to add image to canvas',
          variant: 'destructive'
        });
        return false; // Fix 3: Return false instead of ''
      }
    }
    console.log('🎨 handleNewArtboard called:', {
      imageUrl: imageUrl ? 'present' : 'EMPTY',
      title,
      x,
      y,
      artboardId,
      isPlaceholder,
      directToCanvas,
      gridIndex
    });

    // If placeholder, add to generatingArtboards state and return placeholder ID
    if (isPlaceholder) {
      const placeholderId = crypto.randomUUID();
      console.log('🔷 Creating PLACEHOLDER with ID:', placeholderId);

      // Calculate position with collision-aware placement so placeholders
      // never land on top of existing artboards or in-flight placeholders.
      const PLACEHOLDER_W = 800;
      const PLACEHOLDER_H = 600;

      const existingRects: PlacementRect[] = [
        ...artboards.map(a => ({
          position_x: a.position_x,
          position_y: a.position_y,
          width: a.width,
          height: a.height,
        })),
        ...generatingArtboards.map(g => ({
          position_x: g.position_x,
          position_y: g.position_y,
          width: g.width,
          height: g.height,
        })),
      ];

      let preferredX: number | undefined;
      let preferredY: number | undefined;
      if (x !== undefined && y !== undefined) {
        // x,y are CENTER coordinates from ChatInterface
        preferredX = x - PLACEHOLDER_W / 2;
        preferredY = y - PLACEHOLDER_H / 2;
      } else if (getViewportCenterRef.current) {
        const center = getViewportCenterRef.current();
        preferredX = center.x - PLACEHOLDER_W / 2;
        preferredY = center.y - PLACEHOLDER_H / 2;
      }

      const spot = findNonOverlappingSpot({
        width: PLACEHOLDER_W,
        height: PLACEHOLDER_H,
        preferredX,
        preferredY,
        existingRects,
      });
      const position_x = spot.x;
      const position_y = spot.y;
      console.log('📍 Placeholder placement:', { preferredX, preferredY, final: spot });
      console.log('✅ Adding placeholder to generatingArtboards state at:', {
        position_x,
        position_y
      });
      setGeneratingArtboards(prev => [...prev, {
        id: placeholderId,
        title,
        width: 800,
        height: 600,
        position_x,
        position_y
      }]);
      return placeholderId;
    }
    try {
      // Load image to get its dimensions
      let artboardWidth = overrideWidth || 800;
      let artboardHeight = overrideHeight || 600;
      if (imageUrl && !overrideWidth && !overrideHeight) {
        try {
          // Apply watermark if free tier
          let finalImageUrl = imageUrl;
          if (subscriptionTier === 'free') {
            finalImageUrl = await applyWatermarkToImage(imageUrl);
          }
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = finalImageUrl;
          });

          // Calculate dimensions while maintaining aspect ratio
          // Cap at 1200px for longest side
          const maxDimension = 1200;
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          if (img.naturalWidth > img.naturalHeight) {
            artboardWidth = Math.min(img.naturalWidth, maxDimension);
            artboardHeight = artboardWidth / aspectRatio;
          } else {
            artboardHeight = Math.min(img.naturalHeight, maxDimension);
            artboardWidth = artboardHeight * aspectRatio;
          }

          // Round to nearest integer
          artboardWidth = Math.round(artboardWidth);
          artboardHeight = Math.round(artboardHeight);
        } catch (error) {
          console.error('Error loading image for dimensions:', error);
          // Keep default dimensions if image fails to load
        }
      }
      let position_x = 100;
      let position_y = 100;

      // PHASE 3: Smart collision-aware placement
      const PADDING = 50;

      // Helper: Check if two rectangles collide
      const checkCollision = (x: number, y: number, w: number, h: number): boolean => {
        return artboards.some(existing => {
          const existingBounds = {
            left: existing.position_x - PADDING,
            right: existing.position_x + existing.width + PADDING,
            top: existing.position_y - PADDING,
            bottom: existing.position_y + existing.height + PADDING
          };
          const proposedBounds = {
            left: x,
            right: x + w,
            top: y,
            bottom: y + h
          };
          return !(proposedBounds.right < existingBounds.left || proposedBounds.left > existingBounds.right || proposedBounds.bottom < existingBounds.top || proposedBounds.top > existingBounds.bottom);
        });
      };

      // Helper: Find nearest free space using spiral search
      const findNearestFreeSpace = (startX: number, startY: number, w: number, h: number): {
        x: number;
        y: number;
      } => {
        // Try original position first
        if (!checkCollision(startX, startY, w, h)) {
          return {
            x: startX,
            y: startY
          };
        }

        // Spiral outward
        const STEP = 100;
        const MAX_RADIUS = 2000;
        for (let radius = STEP; radius <= MAX_RADIUS; radius += STEP) {
          // Try 8 positions around the circle
          for (let angle = 0; angle < 360; angle += 45) {
            const rad = angle * Math.PI / 180;
            const testX = startX + Math.cos(rad) * radius;
            const testY = startY + Math.sin(rad) * radius;
            if (!checkCollision(testX, testY, w, h)) {
              return {
                x: testX,
                y: testY
              };
            }
          }
        }

        // Fallback: place far right
        const maxX = Math.max(...artboards.map(a => a.position_x + a.width), 0);
        return {
          x: maxX + PADDING * 2,
          y: 100
        };
      };

      // Calculate initial position
      if (x !== undefined && y !== undefined) {
        // User provided coordinates (viewport center)
        const preferredX = x - artboardWidth / 2;
        const preferredY = y - artboardHeight / 2;
        const smartPos = findNearestFreeSpace(preferredX, preferredY, artboardWidth, artboardHeight);
        position_x = smartPos.x;
        position_y = smartPos.y;
      } else if (getViewportCenterRef.current) {
        // Use viewport center
        const center = getViewportCenterRef.current();
        const preferredX = center.x - artboardWidth / 2;
        const preferredY = center.y - artboardHeight / 2;
        const smartPos = findNearestFreeSpace(preferredX, preferredY, artboardWidth, artboardHeight);
        position_x = smartPos.x;
        position_y = smartPos.y;
      } else {
        // Grid layout with collision detection
        const horizontalSpacing = 250;
        const verticalSpacing = 250;
        const cols = 3;
        const col = artboards.length % cols;
        const row = Math.floor(artboards.length / cols);
        const colWidth = Math.max(artboardWidth, 800) + horizontalSpacing;
        const rowHeight = Math.max(artboardHeight, 600) + verticalSpacing;
        const gridX = 100 + col * colWidth;
        const gridY = 100 + row * rowHeight;
        const smartPos = findNearestFreeSpace(gridX, gridY, artboardWidth, artboardHeight);
        position_x = smartPos.x;
        position_y = smartPos.y;
      }

      // PHASE 1: Fix placeholder replacement - check if it's a placeholder first
      if (artboardId) {
        const placeholder = generatingArtboards.find(p => p.id === artboardId);
        if (placeholder) {
          // This is replacing a placeholder
          console.log(`🔄 Replacing placeholder ${artboardId} with actual artboard`);

          // Remove from generating placeholders state IMMEDIATELY with synchronous update
          const {
            flushSync
          } = await import('react-dom');
          flushSync(() => {
            setGeneratingArtboards(prev => prev.filter(p => p.id !== artboardId));
          });

          // Use placeholder's exact position and dimensions - NO CONVERSION NEEDED
          position_x = placeholder.position_x;
          position_y = placeholder.position_y;
          artboardWidth = placeholder.width;
          artboardHeight = placeholder.height;
          console.log(`✅ Using placeholder position: (${position_x}, ${position_y}), size: ${artboardWidth}x${artboardHeight}`);

          // Reset artboardId to undefined so we create a NEW artboard
          artboardId = undefined;
          // Fall through to create new artboard with placeholder's position
        } else {
          // Normal artboard update (not a placeholder)
          const {
            error
          } = await supabase.from('artboards').update({
            image_url: imageUrl,
            title: title,
            width: artboardWidth,
            height: artboardHeight
          }).eq('id', artboardId);
          if (error) throw error;

          // Update local state
          setArtboards(prev => prev.map(ab => ab.id === artboardId ? {
            ...ab,
            image_url: imageUrl,
            title: title,
            width: artboardWidth,
            height: artboardHeight
          } : ab));

          // Regenerate thumbnail after artboard update
          await generateCanvasThumbnail(currentProject.id, canvasElementRef.current, artboards, canvasObjects);
          toast({
            title: 'Design Generated!',
            description: 'Your design is ready'
          });
          return artboardId;
        }
      }

      // Create new artboard — optimistic: add to state immediately, persist in background
      const newId = crypto.randomUUID();
      const optimisticArtboard = {
        id: newId,
        project_id: currentProject.id,
        user_id: user.id,
        title: title,
        image_url: imageUrl || '',
        position_x,
        position_y,
        width: artboardWidth,
        height: artboardHeight,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        brand_system: null,
        deleted_at: null,
        deleted_by: null,
      };

      // Add to state IMMEDIATELY so canvas renders it
      setArtboards(prev => [...prev, optimisticArtboard]);

      // Persist to DB in background (non-blocking)
      supabase.from('artboards').insert({
        id: newId,
        project_id: currentProject.id,
        user_id: user.id,
        title: title,
        image_url: imageUrl || '',
        position_x,
        position_y,
        width: artboardWidth,
        height: artboardHeight
      }).select().single().then(({ data, error }) => {
        if (error) {
          console.error('Failed to persist artboard:', error);
          // Remove optimistic entry on failure
          setArtboards(prev => prev.filter(a => a.id !== newId));
          toast({
            title: 'Error',
            description: 'Failed to save artboard',
            variant: 'destructive'
          });
        }
      });

      // Update project thumbnail with the latest image
      if (imageUrl) {
        await supabase.from('projects').update({
          thumbnail_url: imageUrl
        }).eq('id', currentProject.id);
        setCurrentProject(prev => ({
          ...prev,
          thumbnail_url: imageUrl
        }));
      }
      toast({
        title: 'Artboard Created!',
        description: 'New artboard added to canvas'
      });
      console.log('✅ Successfully added image to canvas');
      return true;
    } catch (error: any) {
      console.error('Error creating artboard:', error);

      // CRITICAL: Remove placeholder if this was a placeholder operation that failed
      if (artboardId) {
        const placeholder = generatingArtboards.find(p => p.id === artboardId);
        if (placeholder) {
          console.log(`🧹 Cleaning up failed placeholder: ${artboardId}`);
          const {
            flushSync
          } = await import('react-dom');
          flushSync(() => {
            setGeneratingArtboards(prev => prev.filter(p => p.id !== artboardId));
          });
        }
      }
      toast({
        title: 'Error',
        description: 'Failed to create artboard',
        variant: 'destructive'
      });
      console.error('❌ Failed to add image to canvas:', error);
      return false;
    }
  }, [currentProject, user, artboards.length, toast]);
  const handleArtboardUpdate = useCallback(async (id: string, updates: Partial<any>) => {
    try {
      const {
        error
      } = await supabase.from('artboards').update(updates).eq('id', id);
      if (error) throw error;

      // Update local state without triggering re-render of unchanged artboards
      setArtboards(prev => prev.map(ab => ab.id === id ? {
        ...ab,
        ...updates
      } : ab));
    } catch (error: any) {
      console.error('Error updating artboard:', error);
    }
  }, []);
  const handleArtboardDelete = useCallback(async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('artboards').delete().eq('id', id);
      if (error) throw error;

      // Update local state
      setArtboards(prev => prev.filter(ab => ab.id !== id));
      toast({
        title: 'Artboard Deleted',
        description: 'Artboard removed from project'
      });
    } catch (error: any) {
      console.error('Error deleting artboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete artboard',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Explicit deletion handler for canvas objects
  const handleCanvasObjectDelete = useCallback(async (objectId: string) => {
    if (!currentProject || !user) return;
    console.log('🗑️ Explicitly deleting object:', objectId);
    const {
      error
    } = await supabase.from('canvas_objects').delete().eq('project_id', currentProject.id).eq('object_id', objectId);
    if (error) {
      console.error('Error deleting object:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete object from database',
        variant: 'destructive'
      });
    } else {
      console.log('✅ Object deleted from database:', objectId);
    }
  }, [currentProject, user, toast]);
  const handleLayerSelect = useCallback((id: string) => {
    if (focusArtboardRef.current) {
      focusArtboardRef.current(id);
    }
  }, []);
  const handleLayersChange = useCallback((canvasLayers: CanvasLayer[]) => {
    setLayers(canvasLayers);
  }, []);
  const handleLayerToggleVisibility = useCallback((id: string) => {
    if (!canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    const obj = canvas.getObjects().find((o: any) => o.id === id || o.name === id);
    if (obj) {
      obj.visible = !obj.visible;
      canvas.renderAll();
      // Update layers to reflect the change
      if (getLayersRef.current) {
        const updatedLayers = getLayersRef.current();
        setLayers(updatedLayers);
      }
    }
  }, []);
  const handleLayerDelete = useCallback((id: string) => {
    if (!canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    const obj = canvas.getObjects().find((o: any) => o.id === id || o.name === id);
    if (obj) {
      canvas.remove(obj);
      canvas.renderAll();
      // Update layers to reflect the change
      if (getLayersRef.current) {
        const updatedLayers = getLayersRef.current();
        setLayers(updatedLayers);
      }
    }
  }, []);
  
  const handleRotation = useCallback(() => {
    if (!selectedCanvasObject || !canvasInstanceRef.current) return;
    
    const currentAngle = selectedCanvasObject.angle || 0;
    selectedCanvasObject.rotate(currentAngle + 45);
    canvasInstanceRef.current.requestRenderAll();
  }, [selectedCanvasObject]);

  const handleLock = useCallback(() => {
    if (!selectedCanvasObject || !canvasInstanceRef.current) return;
    
    const isLocked = selectedCanvasObject.lockMovementX;
    selectedCanvasObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      selectable: isLocked,
    });
    
    canvasInstanceRef.current.requestRenderAll();
    toast({
      title: isLocked ? 'Unlocked' : 'Locked',
      description: `Object ${isLocked ? 'can now' : 'cannot'} be edited`
    });
  }, [selectedCanvasObject, toast]);

  const handleDuplicateObject = useCallback(() => {
    if (!selectedCanvasObject || !canvasInstanceRef.current) return;
    
    selectedCanvasObject.clone().then((cloned: any) => {
      cloned.set({
        left: (selectedCanvasObject.left || 0) + 20,
        top: (selectedCanvasObject.top || 0) + 20
      });
      cloned.isStandaloneObject = true;
      cloned.canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      canvasInstanceRef.current.add(cloned);
      canvasInstanceRef.current.setActiveObject(cloned);
      canvasInstanceRef.current.renderAll();
    });
  }, [selectedCanvasObject]);

  const handleDeleteObject = useCallback(() => {
    if (!selectedCanvasObject || !canvasInstanceRef.current) return;
    
    canvasInstanceRef.current.remove(selectedCanvasObject);
    setShowFloatingToolbar(false);
  }, [selectedCanvasObject]);

  // Realtime sketch-to-image: ultra-live generation with queuing
  const triggerRealtimeSketchGeneration = useCallback(async () => {
    const canvas = canvasInstanceRef.current;
    if (!canvas || !realtimeSketchMode) return;

    // If already generating, queue and return
    if (isSketchGeneratingRef.current) {
      pendingSketchGenerationRef.current = true;
      return;
    }

    const brushPaths = canvas.getObjects().filter((obj: any) =>
      obj.isBrushStroke === true || (obj.type === 'path' && !obj.isArtboard)
    );
    if (brushPaths.length === 0) return;
    realtimeSketchBrushesRef.current = brushPaths;

    isSketchGeneratingRef.current = true;

    try {
      const allBounds = brushPaths.map((p: any) => p.getBoundingRect());
      const minLeft = Math.min(...allBounds.map((b: any) => b.left));
      const minTop = Math.min(...allBounds.map((b: any) => b.top));
      const maxRight = Math.max(...allBounds.map((b: any) => b.left + b.width));
      const maxBottom = Math.max(...allBounds.map((b: any) => b.top + b.height));

      const padding = 20;
      const w = maxRight - minLeft + padding * 2;
      const h = maxBottom - minTop + padding * 2;

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = w * 2;
      tmpCanvas.height = h * 2;
      const ctx = tmpCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      ctx.scale(2, 2);

      brushPaths.forEach((obj: any) => {
        try {
          const el = obj.toCanvasElement({ multiplier: 1 });
          const objBounds = obj.getBoundingRect();
          ctx.drawImage(el, objBounds.left - minLeft + padding, objBounds.top - minTop + padding);
        } catch { /* skip */ }
      });

      const dataUrl = tmpCanvas.toDataURL('image/png');

      const { data, error } = await supabase.functions.invoke('sketch-to-image', {
        body: {
          sketch_base64: dataUrl,
          prompt: realtimeSketchPrompt || undefined,
        },
      });

      if (!error && data?.image_url) {
        setRealtimeSketchResult(data.image_url);
      }
    } catch (err) {
      console.error('Realtime sketch generation error:', err);
    } finally {
      isSketchGeneratingRef.current = false;
      // If strokes arrived while generating, immediately fire next generation
      if (pendingSketchGenerationRef.current) {
        pendingSketchGenerationRef.current = false;
        triggerRealtimeSketchGeneration();
      }
    }
  }, [realtimeSketchMode, realtimeSketchPrompt]);

  const handleStrokeComplete = useCallback(() => {
    if (!realtimeSketchMode) return;

    if (realtimeSketchTimerRef.current) {
      clearTimeout(realtimeSketchTimerRef.current);
    }
    realtimeSketchTimerRef.current = setTimeout(() => {
      triggerRealtimeSketchGeneration();
    }, 300);
  }, [realtimeSketchMode, triggerRealtimeSketchGeneration]);

  const handlePlaceSketchOnCanvas = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    if (!canvas || !realtimeSketchResult) return;

    // Remove original brush strokes
    const brushPaths = realtimeSketchBrushesRef.current;
    const allBounds = brushPaths.map((p: any) => p.getBoundingRect());
    const minLeft = Math.min(...allBounds.map((b: any) => b.left));
    const minTop = Math.min(...allBounds.map((b: any) => b.top));
    const maxRight = Math.max(...allBounds.map((b: any) => b.left + b.width));
    const maxBottom = Math.max(...allBounds.map((b: any) => b.top + b.height));

    brushPaths.forEach((stroke: any) => canvas.remove(stroke));

    FabricImageImport.fromURL(realtimeSketchResult).then((img) => {
      if (!img) return;
      img.set({
        left: minLeft,
        top: minTop,
        scaleX: (maxRight - minLeft) / (img.width || 1),
        scaleY: (maxBottom - minTop) / (img.height || 1),
      });
      (img as any).isStandaloneObject = true;
      (img as any).canvasObjectId = `sketch_img_${Date.now()}`;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });

    setRealtimeSketchResult(null);
    
    realtimeSketchBrushesRef.current = [];
    sonnerToast.success('Sketch placed on canvas!');
  }, [realtimeSketchResult]);

  const handleLayerToggleExpand = useCallback((id: string) => {
    setLayers(prev => {
      const toggleExpanded = (items: Layer[]): Layer[] => {
        return items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              isExpanded: !item.isExpanded
            };
          }
          if (item.children) {
            return {
              ...item,
              children: toggleExpanded(item.children)
            };
          }
          return item;
        });
      };
      return toggleExpanded(prev);
    });
    // Force a refresh
    setLayerRefreshKey(prev => prev + 1);
  }, []);

  const findLayerTarget = useCallback((layerId: string): {
    obj: any;
    parentArtboard?: any;
  } | null => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return null;

    // 1) Artboard group itself
    const artboardGroup = canvas.getObjects().find((o: any) => (o as any).isArtboard && (o as any).artboardId === layerId);
    if (artboardGroup) return { obj: artboardGroup };

    // 2) Standalone object
    const standalone = canvas.getObjects().find((o: any) => {
      const id = (o as any).id;
      const coid = (o as any).canvasObjectId || (o as any).object_id;
      return id === layerId || coid === layerId;
    });
    if (standalone) return { obj: standalone };

    // 3) Child inside an artboard — flat model uses parentFrameId
    const framedChild = canvas.getObjects().find((o: any) => {
      if (!(o as any).parentFrameId) return false;
      const id = (o as any).id;
      const coid = (o as any).canvasObjectId || (o as any).object_id;
      return id === layerId || coid === layerId;
    });
    if (framedChild) {
      const parentArtboard = canvas.getObjects().find((o: any) => 
        (o as any).isArtboard && (o as any).artboardId === (framedChild as any).parentFrameId
      );
      return { obj: framedChild, parentArtboard };
    }

    return null;
  }, []);

  const refreshLayersFromCanvas = useCallback(() => {
    if (!getLayersRef.current) return;
    setLayers(getLayersRef.current());
    setLayerRefreshKey(prev => prev + 1);
  }, []);

  // NOTE: handleLayerRename/handleLayerReorder are defined *after* handleCanvasObjectsChange
  // (they call it), to avoid TS2448.
  const handleArtboardSelect = useCallback((id: string | null) => {
    setSelectedArtboardId(id);
    // Update selected artboard image URL for chat context
    if (id) {
      const artboard = artboards.find(a => a.id === id);
      setSelectedArtboardImageUrl(artboard?.image_url || null);
    } else {
      setSelectedArtboardImageUrl(null);
    }
  }, [artboards]);
  const handleArtboardEditRequest = useCallback((artboardId: string, position: {
    x: number;
    y: number;
  }) => {
    // Only allow editing artboards that have images
    const artboard = artboards.find(ab => ab.id === artboardId);
    if (!artboard?.image_url) {
      toast({
        title: 'Cannot Edit',
        description: 'This artboard needs an image before it can be edited',
        variant: 'destructive'
      });
      return;
    }
    setSelectedArtboardForEdit(artboardId);
    setEditChatPosition(position);
  }, [artboards, toast]);
  const handleEditComplete = useCallback(async (artboardId: string, newImageUrl: string) => {
    try {
      const {
        error
      } = await supabase.from('artboards').update({
        image_url: newImageUrl
      }).eq('id', artboardId);
      if (error) throw error;
      setArtboards(prev => prev.map(ab => ab.id === artboardId ? {
        ...ab,
        image_url: newImageUrl
      } : ab));
      setSelectedArtboardForEdit(null);
    } catch (error: any) {
      console.error('Error updating artboard:', error);
    }
  }, []);
  const lastSavedObjectsRef = useRef<string>('');
  const saveCanvasObjects = useCallback(async (objects: any[]) => {
    if (!currentProject || !user) return;
    console.log('💾 handleCanvasObjectsChange called with', objects.length, 'objects');

    // Debounced save to prevent excessive database writes
    try {
      // CRITICAL FIX: Filter out placeholder objects BEFORE processing
      // Placeholders are temporary UI elements and should NEVER be saved to database
      const nonPlaceholderObjects = objects.filter(obj => {
        // FIX: Skip objects with active _skipAutoSave flag (freshly inserted videos)
        if ((obj as any)._skipAutoSave && Date.now() < (obj as any)._skipAutoSave) {
          console.log('⏭️ Skipping auto-save for freshly inserted object:', (obj as any).canvasObjectId || (obj as any).object_id);
          return false;
        }
        
        // Check explicit placeholder flags
        const isPlaceholder = !!(obj as any).isPlaceholder;
        const isVideoPlaceholder = !!(obj as any).isVideoPlaceholder;
        const isVideoUploadPlaceholder = !!(obj as any).isVideoUploadPlaceholder;
        const isImageGeneratorPlaceholder = !!(obj as any).isImageGeneratorPlaceholder;
        const placeholderId = (obj as any).placeholderId;
        
        // Check if it's a group with placeholder children (generator placeholders)
        const isGroupWithPlaceholder = obj.type === 'group' && (
          placeholderId?.includes('placeholder') ||
          (obj as any)._objects?.some((child: any) => 
            child.fill === '#E8F0FE' || // Image generator placeholder fill
            child.fill === '#E8F4FD' || // Video generator placeholder fill
            child.strokeDashArray // Dashed stroke = placeholder
          )
        );
        
        // Check for orphan placeholder rects by color signature
        const isOrphanPlaceholder = obj.type === 'rect' && (
          (obj.fill === '#E8F0FE' && obj.stroke === '#C8DCFF') || // Image placeholder
          (obj.fill === '#E8F4FD' && obj.stroke === '#A8D4F0') || // Video placeholder
          ((obj as any).strokeDashArray && obj.fill?.toString().includes('#E8')) // Any dashed placeholder
        );
        
        // Check for small blue rectangles (default Fabric.js rects that got saved incorrectly)
        const isDefaultSmallRect = obj.type === 'rect' && 
          obj.fill === '#3B82F6' && 
          (obj.width === 100 || !obj.width) && 
          (obj.height === 100 || !obj.height);
        
        // Check for gray fallback placeholder rects from failed image loads
        const isGrayFallbackPlaceholder = obj.type === 'rect' && 
          obj.fill === '#f3f4f6' && 
          (obj.width === 400 || obj.height === 400);
        
        // Check for video fallback placeholder (dark gray)
        const isVideoFallbackPlaceholder = obj.type === 'rect' && 
          obj.fill === '#374151';
        
        if (isPlaceholder || isVideoPlaceholder || isVideoUploadPlaceholder || isImageGeneratorPlaceholder || placeholderId || isGroupWithPlaceholder || isOrphanPlaceholder || isDefaultSmallRect || isGrayFallbackPlaceholder || isVideoFallbackPlaceholder) {
          console.log('⏭️ Skipping placeholder/orphan object from save:', {
            type: obj.type,
            fill: obj.fill,
            isPlaceholder,
            isVideoPlaceholder,
            isVideoUploadPlaceholder,
            isImageGeneratorPlaceholder,
            placeholderId,
            isGroupWithPlaceholder,
            isOrphanPlaceholder,
            isDefaultSmallRect
          });
          return false;
        }
        return true;
      });
      
      console.log(`📦 Saving ${nonPlaceholderObjects.length} objects (filtered ${objects.length - nonPlaceholderObjects.length} placeholders)`);

      // CRITICAL FIX: Use upsert pattern instead of delete-all
      if (nonPlaceholderObjects.length > 0) {
        const serializedObjects = (await Promise.all(nonPlaceholderObjects.map(async obj => {
          // Check for canvasObjectId - check direct properties FIRST
          const existingId = (obj as any).canvasObjectId || (obj as any).object_id || obj.canvasObjectId || obj.object_id || (obj as any).get?.('canvasObjectId');
          if (!existingId) {
            console.error('❌ MISSING canvasObjectId for object:', {
              type: obj.type,
              hasObjectId: !!obj.object_id,
              position: {
                x: obj.left,
                y: obj.top
              },
              allProperties: Object.keys(obj).filter(k => k.includes('id') || k.includes('Id')),
              object: obj
            });
          }

          // Generate stable object_id if not present
          const objectId = existingId || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // If we generated a fallback ID, set it on BOTH properties for persistence
          if (!existingId) {
            console.warn('⚠️ Generated fallback canvasObjectId for', obj.type, ':', objectId);
            obj.canvasObjectId = objectId;
            obj.object_id = objectId;
            // Also try to set via Fabric's set method if available
            if (typeof (obj as any).set === 'function') {
              (obj as any).set({
                canvasObjectId: objectId,
                object_id: objectId
              });
            }
          }
          let imageUrl = null;
          
          // Check if this is a video object (videos use poster images but shouldn't go through normal image upload)
          // CRITICAL: Double-check using object's stored ID prefix for bulletproof video detection
          const objectIdForCheck = (obj as any).canvasObjectId || (obj as any).object_id || obj.data?.canvasObjectId;
          const isVideoFromId = objectIdForCheck && objectIdForCheck.startsWith('video_');
          // FIX: Also check obj.data?.isVideo for pre-formatted objects from InfiniteCanvas
          const objIsVideo = !!(obj as any).isVideo || !!obj.data?.isVideo || isVideoFromId;

          // Handle image uploads to storage with retry logic (NOT for videos - they're already uploaded)
          // FIX: Double-check we're not processing a video poster using object ID prefix
          const objectIdCheck = (obj as any).canvasObjectId || (obj as any).object_id || obj.data?.canvasObjectId;
          const isVideoPoster = objectIdCheck?.startsWith('video_');
          if (isVideoPoster) {
            console.log('⏭️ Skipping image upload - this is a video poster:', objectIdCheck);
          }
          
          if (obj.type === 'image' && !objIsVideo && !isVideoPoster) {
            const imageSrc = obj._element?.src || obj.data?.src || obj.src;
            if (imageSrc && imageSrc.startsWith('data:')) {
              // Convert base64 to blob and upload to storage with retries
              const maxRetries = 3;
              let retryCount = 0;
              let uploadSuccess = false;
              while (retryCount < maxRetries && !uploadSuccess) {
                try {
                  const response = await fetch(imageSrc);
                  const blob = await response.blob();

                  // 🛡️ VALIDATE SIZE BEFORE UPLOAD (100MB storage bucket limit)
                  const MAX_SIZE_MB = 100;
                  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
                  if (blob.size > MAX_SIZE_BYTES) {
                    console.error(`⚠️ Blob too large: ${(blob.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_SIZE_MB}MB)`);
                    toast({
                      title: "Image Too Large",
                      description: `Image exceeds ${MAX_SIZE_MB}MB and will be removed. Please use smaller images.`,
                      variant: "destructive"
                    });

                    // ✅ Schedule removal AFTER serialization completes
                    setTimeout(() => {
                      if (canvasInstanceRef.current) {
                        const imgToRemove = canvasInstanceRef.current.getObjects().find((o: any) => o.canvasObjectId === objectId);
                        if (imgToRemove) {
                          canvasInstanceRef.current.remove(imgToRemove);
                          canvasInstanceRef.current.renderAll();
                        }
                      }
                    }, 100);
                    return null; // ✅ Exclude from serialization cleanly
                  }
                  const fileName = `canvas-image-${objectId}-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
                  const filePath = `${user.id}/${fileName}`;
                  const {
                    data: uploadData,
                    error: uploadError
                  } = await supabase.storage.from('design-assets').upload(filePath, blob, {
                    contentType: blob.type,
                    upsert: true
                  });
                  if (uploadError) {
                    throw uploadError;
                  }

                  // FIX 4: Extend signed URL expiry to 24 hours (86400 seconds)
                  const {
                    data: urlData,
                    error: urlError
                  } = await supabase.storage.from('design-assets').createSignedUrl(filePath, 86400);
                  if (urlError || !urlData?.signedUrl) {
                    throw new Error('Failed to generate signed URL');
                  }
                  imageUrl = urlData.signedUrl;
                  // Store file_path on the fabric object for later serialization
                  obj.canvasFilePath = filePath;
                  uploadSuccess = true;
                  console.log('✅ Image uploaded to storage with signed URL');
                } catch (error) {
                  retryCount++;
                  console.error(`Image upload attempt ${retryCount} failed:`, error);
                  if (retryCount >= maxRetries) {
                    console.error('Max retries reached for image upload');
                    toast({
                      title: "Upload Failed",
                      description: "Failed to upload image after 3 attempts. Changes may not be saved.",
                      variant: "destructive"
                    });
                  } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                  }
                }
              }
            } else if (imageSrc && imageSrc.startsWith('http')) {
              // Already a URL, use it directly
              imageUrl = imageSrc;
            }
          } else if (objIsVideo) {
            // FIX: For videos, image_url should be a storage URL for the poster
            // CRITICAL: Never save base64 data URLs - they exceed PostgreSQL index limits
            const posterUrl = (obj as any).posterUrl || (obj as any).data?.posterUrl;
            
            // Only use posterUrl if it's a valid HTTP URL (not base64, not video)
            const isValidPosterUrl = posterUrl && 
              posterUrl.startsWith('http') && 
              !posterUrl.includes('.mp4') && 
              !posterUrl.includes('.webm') && 
              !posterUrl.includes('.mov');
            
            if (isValidPosterUrl) {
              imageUrl = posterUrl;
            }
            // IMPORTANT: If no valid poster URL, leave imageUrl null
            // The load flow will extract poster on-the-fly from videoUrl
            
            console.log('📹 Video object save:', { 
              hasPoster: !!imageUrl,
              videoFilePath: (obj as any).videoFilePath 
            });
          }

          // Serialize object with ALL custom properties
          const serializedData = obj.toJSON ? obj.toJSON(['canvasObjectId', 'object_id', 'isBrushStroke', 'brushWidth', 'isVideo', 'videoUrl', 'videoFilePath', 'videoDuration', 'isSvgIcon', 'svgSource', 'svgPathCount', 'fontMetadata']) : {
            ...obj
          };

          // Check if this is a video object - FIX: Use robust objIsVideo check
          // that includes video_ prefix fallback (computed at line 1708)
          const isVideo = objIsVideo;

          // For images: COMPLETELY strip all image data, only keep essential metadata
          // For videos: Also preserve video-specific properties
          const cleanObjectData = obj.type === 'image' ? {
            // Only save essential transform metadata
            scaleX: serializedData.scaleX,
            scaleY: serializedData.scaleY,
            angle: serializedData.angle || 0,
            opacity: serializedData.opacity || 1,
            flipX: serializedData.flipX,
            flipY: serializedData.flipY,
            // Custom properties for tracking
            canvasObjectId: serializedData.canvasObjectId,
            object_id: serializedData.object_id,
            isBrushStroke: serializedData.isBrushStroke,
            brushWidth: serializedData.brushWidth,
            // Video-specific properties
            isVideo: isVideo,
            videoUrl: (obj as any).videoUrl,
            videoFilePath: (obj as any).videoFilePath,
            duration: (obj as any).videoDuration,
            title: (obj as any).title,
            // FIX: Preserve poster URL and file path for regeneration
            posterUrl: (obj as any).posterUrl,
            posterFilePath: (obj as any).posterFilePath,
            // Store poster dimensions for video
            width: serializedData.width,
            height: serializedData.height,
            // DO NOT include: src, data, objects, _element, _originalElement
          } : {
            ...serializedData,
            // CRITICAL: Preserve text content
            text: obj.type === 'i-text' || obj.type === 'text' ? obj.text || obj.data?.text : undefined,
            // CRITICAL: Preserve SVG animation properties
            isSvgIcon: (obj as any).isSvgIcon || undefined,
            svgSource: (obj as any).svgSource || undefined,
            svgPathCount: (obj as any).svgPathCount || undefined,
          };
          
          // Determine object_type: 'video' if isVideo, otherwise use obj.type
          const objectType = isVideo ? 'video' : obj.type;
          
          // FIX: Check both top-level and nested videoFilePath for pre-formatted objects
          const videoFilePath = (obj as any).videoFilePath || obj.data?.videoFilePath;
          const file_path_value = isVideo && videoFilePath
            ? videoFilePath
            : (obj.type === 'image' && obj.canvasFilePath ? obj.canvasFilePath : null);
          console.log('💾 SAVING OBJECT:', {
            object_id: objectId,
            type: obj.type,
            object_type: objectType,
            isVideo,
            hasCanvasFilePath: !!obj.canvasFilePath,
            file_path_value
          });
          return {
            project_id: currentProject.id,
            user_id: user.id,
            object_id: objectId,
            object_type: objectType,
            image_url: imageUrl,
            file_path: file_path_value,
            object_data: cleanObjectData,
            position_x: obj.left || 0,
            position_y: obj.top || 0
          };
        }))).filter(obj => obj !== null); // ✅ Filter out failed serializations

        // Check if anything actually changed
        const serializedString = JSON.stringify(serializedObjects);
        if (serializedString === lastSavedObjectsRef.current) {
          console.log('No changes detected, skipping save');
          return;
        }
        lastSavedObjectsRef.current = serializedString;
        console.log('🔍 CANVAS SAVE DEBUG:', {
          timestamp: new Date().toISOString(),
          projectId: currentProject.id,
          totalObjects: serializedObjects.length,
          objectTypes: serializedObjects.map(o => o.object_type),
          objectIds: serializedObjects.map(o => o.object_id),
          hasImageObjects: serializedObjects.some(o => o.object_type === 'image'),
          imagesWithUrls: serializedObjects.filter(o => o.object_type === 'image' && o.image_url).length,
          imagesWithoutUrls: serializedObjects.filter(o => o.object_type === 'image' && !o.image_url).length
        });

        // FIX 3: Never save canvas objects with NULL URLs - filter out incomplete uploads
        const filteredObjects = serializedObjects.filter(obj => {
          if (obj.object_type === 'image' && !obj.image_url) {
            console.warn('❌ Skipping image with null URL (not uploaded yet):', obj.object_id);
            return false; // Don't save until upload completes
          }
          return true;
        });
        
        // FIX 4: Deduplicate objects by object_id to prevent "ON CONFLICT DO UPDATE cannot affect row a second time" error
        const seenObjectIds = new Set<string>();
        const validObjects = filteredObjects.filter(obj => {
          if (seenObjectIds.has(obj.object_id)) {
            console.warn('⚠️ Duplicate object_id detected, keeping latest:', obj.object_id);
            return false;
          }
          seenObjectIds.add(obj.object_id);
          return true;
        });
        
        const objectIds = validObjects.map(o => o.object_id);

        // 🛡️ ALLOW EMPTY SAVES: Canvas might be legitimately empty
        if (objectIds.length === 0) {
          console.log('💾 Saving empty canvas state (user deleted all objects)');
          await supabase.from('canvas_objects').delete().eq('project_id', currentProject.id);
          toast({
            title: "Canvas cleared",
            duration: 1000
          });
          return;
        }

        // 🛡️ ATOMIC UPSERT: Never lose data if insert fails
        const {
          error: upsertError
        } = await supabase.from('canvas_objects').upsert(validObjects, {
          onConflict: 'project_id,object_id',
          // ✅ Use composite key constraint
          ignoreDuplicates: false
        });
        if (upsertError) {
          console.error('❌ CRITICAL: Canvas save failed:', {
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint
          });
          toast({
            title: "⚠️ Save Failed",
            description: `${upsertError.message} (Code: ${upsertError.code})`,
            variant: "destructive"
          });

          // Retry once after 2s with same objects
          setTimeout(() => {
            if (canvasInstanceRef.current) {
              const objects = collectAllSaveableObjects(canvasInstanceRef.current);
              saveCanvasObjects(objects);
            }
          }, 2000);
          return;
        }
        // Clean up orphaned DB records — delete any objects in DB
        // that are no longer on canvas
        const { error: cleanupError } = await supabase
          .from('canvas_objects')
          .delete()
          .eq('project_id', currentProject.id)
          .not('object_id', 'in', `(${objectIds.join(',')})`);

        if (cleanupError) {
          console.error('⚠️ Orphan cleanup failed:', cleanupError);
        }

        console.log('✅ Canvas saved successfully:', {
          objectCount: serializedObjects.length,
          sampleObjectIds: serializedObjects.slice(0, 2).map(o => o.object_id),
          samplePositions: serializedObjects.slice(0, 2).map(o => ({
            id: o.object_id,
            x: o.position_x,
            y: o.position_y
          }))
        });

        // Visual feedback for successful save
        toast({
          title: (
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.25 9.05C11.03 9.7 12.97 9.7 14.75 9.05"/>
                <path d="M16.82 2H7.18C5.05 2 3.32 3.74 3.32 5.86V19.95C3.32 21.75 4.61 22.51 6.19 21.64L11.07 18.93C11.59 18.64 12.43 18.64 12.94 18.93L17.82 21.64C19.4 22.52 20.69 21.76 20.69 19.95V5.86C20.68 3.74 18.95 2 16.82 2Z"/>
              </svg>
              Saved {validObjects.length} object{validObjects.length === 1 ? '' : 's'}
            </span>
          ) as unknown as string,
          duration: 2000
        });

        // 📊 Health check logging for monitoring
        if (import.meta.env.DEV) {
          console.log('📊 Save Stats:', {
            totalObjects: objects.length,
            validObjects: serializedObjects.length,
            filtered: objects.length - serializedObjects.length,
            imageCount: serializedObjects.filter(o => o.object_type === 'image').length,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Save viewport state PROPERLY (merge with existing data)
      if (canvasInstanceRef.current) {
        const viewport = canvasInstanceRef.current.viewportTransform;

        // Fetch existing canvas_data first
        const {
          data: projectData
        } = await supabase.from('projects').select('canvas_data').eq('id', currentProject.id).single();

        // Merge viewport into existing canvas_data
        const existingCanvasData = projectData?.canvas_data as Record<string, any> || {};
        await supabase.from('projects').update({
          canvas_data: {
            ...existingCanvasData,
            viewport
          }
        }).eq('id', currentProject.id);
      }
    } catch (error: any) {
      console.error('Failed to save canvas:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save project. Please try again.',
        variant: 'destructive'
      });
    }
  }, [currentProject, user, toast]);

  // Debounced handler with 500ms delay
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);
  const handleCanvasObjectsChange = useCallback((objects: any[]) => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    debouncedSaveRef.current = setTimeout(() => {
      saveCanvasObjects(objects);
    }, 500);
  }, [saveCanvasObjects]);

  // ===== Layers panel actions (require handleCanvasObjectsChange) =====
  const handleLayerRename = useCallback((id: string, name: string) => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;
    const target = findLayerTarget(id);
    if (!target) return;

    const obj = target.obj;
    if (typeof (obj as any).set === 'function') {
      (obj as any).set({ layerName: name });
    }
    (obj as any).layerName = name;
    canvas.requestRenderAll();

    refreshLayersFromCanvas();

    handleCanvasObjectsChange(collectAllSaveableObjects(canvas));
  }, [findLayerTarget, refreshLayersFromCanvas, handleCanvasObjectsChange]);

  const handleLayerReorder = useCallback((parentId: string | null, orderedIds: string[]) => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;

    if (parentId) {
      // Flat model: reorder top-level objects that belong to this artboard
      const children = canvas.getObjects().filter(
        (o: any) => (o as any).parentFrameId === parentId && !(o as any).isArtboard && !(o as any).isArtboardImage
      );
      if (children.length === 0) return;

      const byId = new Map<string, any>();
      children.forEach((c: any) => {
        const key = (c as any).canvasObjectId || (c as any).object_id || (c as any).id;
        if (key) byId.set(String(key), c);
      });

      // Reorder by moving objects in canvas z-order
      const reordered = orderedIds.map(id => byId.get(String(id))).filter(Boolean);
      // Find the artboard frame to position children above it
      const frame = canvas.getObjects().find((o: any) => (o as any).isArtboard && (o as any).artboardId === parentId);
      if (frame) {
        const frameIdx = canvas.getObjects().indexOf(frame);
        for (let i = 0; i < reordered.length; i++) {
          canvas.moveTo(reordered[i], frameIdx + 1 + i);
        }
      }
      canvas.requestRenderAll();
      refreshLayersFromCanvas();
      return;
    }

    const idToObj = new Map<string, any>();
    canvas.getObjects().forEach((o: any, idx: number) => {
      if ((o as any).isTitle) return;
      const key = String((o as any).isArtboard ? (o as any).artboardId : ((o as any).canvasObjectId || (o as any).object_id || (o as any).id || `idx-${idx}`));
      idToObj.set(key, o);
    });

    const bottomFirst = [...orderedIds].reverse();
    bottomFirst.forEach((id, z) => {
      const obj = idToObj.get(String(id));
      if (obj) canvas.moveObjectTo(obj, z);
    });

    canvas.requestRenderAll();
    refreshLayersFromCanvas();

    handleCanvasObjectsChange(collectAllSaveableObjects(canvas));
  }, [handleCanvasObjectsChange, refreshLayersFromCanvas]);

  // Image Generator Handlers
  const handleImageGenerator = useCallback(() => {
    if (!canvasInstanceRef.current || !currentProject) return;

    // NOTE: Credit check moved to CanvasAIChat.tsx when user actually generates
    // This allows instant placeholder creation without blocking database calls
    
    const fabricCanvas = canvasInstanceRef.current;
    const center = getViewportCenterRef.current?.() || {
      x: 400,
      y: 300
    };

    // Use dynamic format dimensions based on selected format/resolution
    const formatDims = getFormatDimensions(generatorFormat, generatorResolution);
    const placeholderWidth = formatDims.width;
    const placeholderHeight = formatDims.height;
    const displayScale = 0.3; // Scale factor for viewport display
    
    // Get existing objects' bounding rects for overlap detection
    const existingObjects = fabricCanvas.getObjects()
      .filter(obj => !(obj as any).isPlaceholder)
      .map(obj => {
        const bounds = obj.getBoundingRect();
        return {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height
        };
      });
    
    // Find non-overlapping position
    const scaledWidth = placeholderWidth * displayScale;
    const scaledHeight = placeholderHeight * displayScale;
    const position = findNonOverlappingPosition(
      existingObjects,
      center,
      scaledWidth,
      scaledHeight,
      40 // gap
    );

    // Create clean placeholder with just rect and icon (labels handled by overlay)
    // Use center-origin for both so they align correctly in the group
    const rect = new Rect({
      left: 0,
      top: 0,
      width: placeholderWidth,
      height: placeholderHeight,
      originX: 'center',
      originY: 'center',
      fill: '#E8F0FE',
      stroke: '#C8DCFF',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      rx: 12,
      ry: 12,
      selectable: false,
      evented: false
    });

    // Note: Icon is now rendered as HTML overlay via PlaceholderIconOverlay
    // This avoids Fabric.js clipping/masking issues with scaled groups

    // Group: rect only (icon handled by PlaceholderIconOverlay)
    const group = new Group([rect], {
      left: position.x,
      top: position.y,
      scaleX: displayScale,
      scaleY: displayScale,
      selectable: true,
      evented: true
    });
    const placeholderId = `placeholder-${Date.now()}`;
    (group as any).placeholderId = placeholderId;
    (group as any).isPlaceholder = true;
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    
    // Smooth auto-zoom to fit the placeholder and prompt box in view
    const PROMPT_BOX_HEIGHT = 200;
    const PADDING = 100;
    const bounds = group.getBoundingRect();
    
    const totalHeight = bounds.height + PROMPT_BOX_HEIGHT + PADDING * 2;
    const totalWidth = Math.max(bounds.width, 500) + PADDING * 2;
    
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    
    // Calculate optimal zoom to fit 100%
    const zoomX = canvasWidth / totalWidth;
    const zoomY = canvasHeight / totalHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 1.5); // Cap at 1.5x to not over-zoom
    
    // Calculate center point for panning
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2 + (PROMPT_BOX_HEIGHT / 4);
    
    // Animate zoom and pan smoothly
    const startZoom = fabricCanvas.getZoom();
    const startVpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const startPanX = startVpt[4];
    const startPanY = startVpt[5];
    
    const targetPanX = -(centerX * optimalZoom - canvasWidth / 2);
    const targetPanY = -(centerY * optimalZoom - canvasHeight / 2);
    
    const duration = 400; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentZoom = startZoom + (optimalZoom - startZoom) * easeOut;
      const currentPanX = startPanX + (targetPanX - startPanX) * easeOut;
      const currentPanY = startPanY + (targetPanY - startPanY) * easeOut;
      
      fabricCanvas.setZoom(currentZoom);
      fabricCanvas.viewportTransform![4] = currentPanX;
      fabricCanvas.viewportTransform![5] = currentPanY;
      fabricCanvas.requestRenderAll();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
    setImageGeneratorPlaceholder({
      id: placeholderId,
      rect: group,
      format: generatorFormat,
      dimensions: formatDims
    });
    setActiveTool('chat');
    toast({
      title: 'Image Generator Ready',
      description: 'Enter a prompt in the chat to generate an image'
    });
  }, [currentProject, user, toast, generatorFormat, generatorResolution]);
  const handleImageGeneratorComplete = useCallback(async (imageUrl: string) => {
    if (!canvasInstanceRef.current || !imageGeneratorPlaceholder || !currentProject || !user) return;
    try {
      const fabricCanvas = canvasInstanceRef.current;
      const placeholder = imageGeneratorPlaceholder.rect;
      const placeholderLeft = placeholder.left || 0;
      const placeholderTop = placeholder.top || 0;
      const placeholderWidth = (placeholder.width || 512) * (placeholder.scaleX || 1);
      const placeholderHeight = (placeholder.height || 512) * (placeholder.scaleY || 1);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });
      const {
        FabricImage
      } = await import('fabric');
      const scaleX = placeholderWidth / img.naturalWidth;
      const scaleY = placeholderHeight / img.naturalHeight;
      const scale = Math.min(scaleX, scaleY);
      const fabricImage = new FabricImage(img, {
        left: placeholderLeft,
        top: placeholderTop,
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true
      });
      fabricCanvas.remove(placeholder);
      fabricCanvas.add(fabricImage);
      fabricCanvas.setActiveObject(fabricImage);
      fabricCanvas.requestRenderAll();
      const {
        error: dbError
      } = await supabase.from('canvas_objects').insert({
        project_id: currentProject.id,
        user_id: user.id,
        object_id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        object_type: 'image',
        object_data: {
          src: imageUrl,
          type: 'image',
          originX: 'left',
          originY: 'top',
          width: img.naturalWidth,
          height: img.naturalHeight,
          scaleX: scale,
          scaleY: scale
        },
        position_x: placeholderLeft,
        position_y: placeholderTop
      });
      if (dbError) {
        console.error('Failed to save image:', dbError);
      } else {
        await loadCanvasObjects(currentProject.id);
      }
      setImageGeneratorPlaceholder(null);
      toast({
        title: 'Image Generated!',
        description: 'Your AI-generated image has been added to the canvas'
      });
    } catch (error) {
      console.error('Error replacing placeholder:', error);
      toast({
        title: 'Error',
        description: 'Failed to add generated image',
        variant: 'destructive'
      });
    }
  }, [imageGeneratorPlaceholder, currentProject, user, toast, loadCanvasObjects]);

  // Handler for format change - updates placeholder by recreating the group
  const handleGeneratorFormatChange = useCallback(async (format: string, _dimensions?: { width: number; height: number }) => {
    setGeneratorFormat(format);
    
    // Always recalculate dimensions using the shared function to ensure consistency
    const dimensions = getFormatDimensions(format, generatorResolution);
    
    // If placeholder exists, recreate it with new dimensions
    if (imageGeneratorPlaceholder && canvasInstanceRef.current) {
      const placeholder = imageGeneratorPlaceholder.rect;
      const fabricCanvas = canvasInstanceRef.current;
      
      // Get current center position before removing
      const currentCenter = placeholder.getCenterPoint();
      const displayScale = placeholder.scaleX || 0.3;
      
      // Remove old placeholder
      fabricCanvas.remove(placeholder);
      
      // Import fabric classes
      const { Rect, Group } = await import('fabric');
      
      // Create new placeholder elements with updated dimensions
      // Use center-origin for both so they align correctly in the group
      const rect = new Rect({
        left: 0,
        top: 0,
        width: dimensions.width,
        height: dimensions.height,
        originX: 'center',
        originY: 'center',
        fill: '#E8F0FE',
        stroke: '#C8DCFF',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        rx: 12,
        ry: 12,
        selectable: false,
        evented: false
      });
      
      // Note: Icon is rendered via PlaceholderIconOverlay component (HTML overlay)
      
      // Create new group at same center position
      const newGroup = new Group([rect], {
        left: currentCenter.x - (dimensions.width * displayScale) / 2,
        top: currentCenter.y - (dimensions.height * displayScale) / 2,
        scaleX: displayScale,
        scaleY: displayScale,
        selectable: true,
        evented: true
      });
      
      // Preserve placeholder properties
      (newGroup as any).placeholderId = imageGeneratorPlaceholder.id;
      (newGroup as any).isPlaceholder = true;
      
      fabricCanvas.add(newGroup);
      fabricCanvas.setActiveObject(newGroup);
      fabricCanvas.requestRenderAll();
      
      // Update state with new group reference
      setImageGeneratorPlaceholder({
        ...imageGeneratorPlaceholder,
        rect: newGroup,
        format,
        dimensions
      });
    }
  }, [imageGeneratorPlaceholder, generatorResolution]);

  // Handler for resolution change
  const handleGeneratorResolutionChange = useCallback((resolution: string) => {
    setGeneratorResolution(resolution);
    
    // Recalculate dimensions with new resolution
    const newDimensions = getFormatDimensions(generatorFormat, resolution);
    
    // Update placeholder if exists
    if (imageGeneratorPlaceholder && canvasInstanceRef.current) {
      handleGeneratorFormatChange(generatorFormat, newDimensions);
    }
  }, [generatorFormat, imageGeneratorPlaceholder, handleGeneratorFormatChange]);

  // Video Generator Handlers
  const handleVideoGenerator = useCallback(() => {
    if (!canvasInstanceRef.current || !currentProject) return;

    // NOTE: Credit check moved to VideoGeneratorChat.tsx when user actually generates
    // This allows instant placeholder creation without blocking database calls

    const fabricCanvas = canvasInstanceRef.current;
    const center = getViewportCenterRef.current?.() || { x: 400, y: 300 };

    // Video dimensions based on aspect ratio
    const videoDims = videoGeneratorFormat === '16:9' 
      ? { width: 1280, height: 720 } 
      : { width: 720, height: 1280 };
    
    const displayScale = 0.3;

    // Get existing objects for overlap detection
    const existingObjects = fabricCanvas.getObjects()
      .filter((obj: any) => !(obj as any).isPlaceholder)
      .map((obj: any) => {
        const bounds = obj.getBoundingRect();
        return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
      });

    const scaledWidth = videoDims.width * displayScale;
    const scaledHeight = videoDims.height * displayScale;
    const position = findNonOverlappingPosition(existingObjects, center, scaledWidth, scaledHeight, 20);

    // Create placeholder with video icon
    const rect = new Rect({
      left: 0,
      top: 0,
      width: videoDims.width,
      height: videoDims.height,
      originX: 'center',
      originY: 'center',
      fill: '#E8F4FD',
      stroke: '#A8D4F0',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      rx: 12,
      ry: 12,
      selectable: false,
      evented: false
    });

    // Note: Icon is now rendered as HTML overlay via PlaceholderIconOverlay
    // This avoids Fabric.js clipping/masking issues with scaled groups

    const group = new Group([rect], {
      left: position.x,
      top: position.y,
      scaleX: displayScale,
      scaleY: displayScale,
      selectable: true,
      evented: true
    });

    const placeholderId = `video-placeholder-${Date.now()}`;
    (group as any).placeholderId = placeholderId;
    (group as any).isVideoPlaceholder = true;
    (group as any).isPlaceholder = true;

    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);

    // Smooth auto-zoom animation
    const PROMPT_BOX_HEIGHT = 250;
    const PADDING = 100;
    const bounds = group.getBoundingRect();
    const totalHeight = bounds.height + PROMPT_BOX_HEIGHT + PADDING * 2;
    const totalWidth = Math.max(bounds.width, 500) + PADDING * 2;
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    const zoomX = canvasWidth / totalWidth;
    const zoomY = canvasHeight / totalHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 1.5);
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2 + (PROMPT_BOX_HEIGHT / 4);
    const startZoom = fabricCanvas.getZoom();
    const startVpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const targetPanX = -(centerX * optimalZoom - canvasWidth / 2);
    const targetPanY = -(centerY * optimalZoom - canvasHeight / 2);
    const duration = 400;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentZoom = startZoom + (optimalZoom - startZoom) * easeOut;
      const currentPanX = startVpt[4] + (targetPanX - startVpt[4]) * easeOut;
      const currentPanY = startVpt[5] + (targetPanY - startVpt[5]) * easeOut;
      fabricCanvas.setZoom(currentZoom);
      fabricCanvas.viewportTransform![4] = currentPanX;
      fabricCanvas.viewportTransform![5] = currentPanY;
      fabricCanvas.requestRenderAll();
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    setVideoGeneratorPlaceholder({
      id: placeholderId,
      rect: group,
      format: videoGeneratorFormat,
      dimensions: videoDims,
      duration: videoGeneratorDuration
    });
    setActiveTool('video-chat');
    toast({
      title: 'Video Generator Ready',
      description: 'Enter a prompt and optionally select frames to generate a video'
    });
  }, [currentProject, user, toast, videoGeneratorFormat, videoGeneratorDuration]);

  const handleVideoGeneratorComplete = useCallback(async (videoUrl: string) => {
    console.log('🎬 handleVideoGeneratorComplete called with:', videoUrl);
    console.log('🎬 videoGeneratorPlaceholder:', videoGeneratorPlaceholder);
    console.log('🎬 canvasInstanceRef.current:', !!canvasInstanceRef.current);
    console.log('🎬 currentProject:', currentProject?.id);
    console.log('🎬 user:', user?.id);
    
    if (!canvasInstanceRef.current || !videoGeneratorPlaceholder || !currentProject || !user) {
      console.error('🎬 Missing required data for video placement:', {
        hasCanvas: !!canvasInstanceRef.current,
        hasPlaceholder: !!videoGeneratorPlaceholder,
        hasProject: !!currentProject,
        hasUser: !!user
      });
      return;
    }
    
    const fabricCanvas = canvasInstanceRef.current;
    const placeholder = videoGeneratorPlaceholder.rect;
    const placeholderLeft = placeholder.left || 0;
    const placeholderTop = placeholder.top || 0;
    const placeholderWidth = (placeholder.width || 512) * (placeholder.scaleX || 1);
    const placeholderHeight = (placeholder.height || 512) * (placeholder.scaleY || 1);

    console.log('🎬 Placeholder position:', { placeholderLeft, placeholderTop, placeholderWidth, placeholderHeight });

    try {
      console.log('📹 Starting video placement, URL:', videoUrl);
      
      // 1. Download video through edge function to bypass CORS and store in Supabase
      const { data: downloadData, error: downloadError } = await supabase.functions.invoke('download-video', {
        body: { 
          videoUrl: videoUrl,
          projectId: currentProject.id
        }
      });

      if (downloadError || !downloadData?.success) {
        console.error('Video download failed:', downloadError || downloadData?.error);
        throw new Error(downloadData?.error || 'Failed to download video');
      }

      console.log('📹 Video downloaded and stored:', downloadData.filePath);
      
      const permanentVideoUrl = downloadData.signedUrl;
      const videoFilePath = downloadData.filePath;
      
      // 2. Extract poster (first frame) from video
      const { extractVideoPoster, getVideoDuration } = await import('@/lib/videoDownloader');
      let posterDataUrl: string;
      let videoDuration: number;
      
      try {
        posterDataUrl = await extractVideoPoster(videoUrl);
        videoDuration = await getVideoDuration(videoUrl);
      } catch (posterError) {
        console.warn('Poster extraction failed, using placeholder:', posterError);
        // Fallback to a grey placeholder if poster extraction fails
        const canvas = document.createElement('canvas');
        canvas.width = videoGeneratorPlaceholder.dimensions.width;
        canvas.height = videoGeneratorPlaceholder.dimensions.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#374151';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw play icon
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          ctx.moveTo(cx - 30, cy - 40);
          ctx.lineTo(cx - 30, cy + 40);
          ctx.lineTo(cx + 40, cy);
          ctx.closePath();
          ctx.fill();
        }
        posterDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        videoDuration = videoGeneratorPlaceholder.duration;
      }
      
      // 3. Create Fabric.js Image with the poster
      const posterImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = posterDataUrl;
      });
      
      const { FabricImage } = await import('fabric');
      const scaleX = placeholderWidth / posterImg.naturalWidth;
      const scaleY = placeholderHeight / posterImg.naturalHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const fabricImage = new FabricImage(posterImg, {
        left: placeholderLeft,
        top: placeholderTop,
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true
      });
      
      // 4. Attach video metadata
      const objectId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      (fabricImage as any).isVideo = true;
      (fabricImage as any).videoUrl = permanentVideoUrl;
      (fabricImage as any).videoDuration = videoDuration;
      (fabricImage as any).videoFilePath = videoFilePath;
      (fabricImage as any).isStandaloneObject = true;
      (fabricImage as any).canvasObjectId = objectId;
      (fabricImage as any).title = `Video ${new Date().toLocaleTimeString()}`;
      
      // Remove placeholder and add video object
      // FIX: Block auto-save from overwriting this freshly inserted video for 1 second
      (fabricImage as any)._skipAutoSave = Date.now() + 1000;
      
      fabricCanvas.remove(placeholder);
      fabricCanvas.add(fabricImage);
      fabricCanvas.setActiveObject(fabricImage);
      fabricCanvas.requestRenderAll();
      
      // 5. Save to canvas_objects table with object_type: 'video'
      // FIX: Upload poster to storage instead of truncating base64
      let savedPosterUrl = '';
      let posterFilePath = '';
      try {
        const posterBlob = await (await fetch(posterDataUrl)).blob();
        const posterFileName = `video-poster-${objectId}.png`;
        posterFilePath = `${user.id}/${posterFileName}`;
        
        const { error: posterUploadError } = await supabase.storage
          .from('design-assets')
          .upload(posterFilePath, posterBlob, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!posterUploadError) {
          const { data: posterUrlData } = await supabase.storage
            .from('design-assets')
            .createSignedUrl(posterFilePath, 86400);
          savedPosterUrl = posterUrlData?.signedUrl || '';
          console.log('✅ Video poster uploaded to storage:', posterFilePath);
        }
      } catch (posterError) {
        console.warn('Failed to upload poster, video will use fallback:', posterError);
      }
      
      // Store poster URL in fabric object for auto-save
      (fabricImage as any).posterUrl = savedPosterUrl;
      (fabricImage as any).posterFilePath = posterFilePath;
      
      const { error: dbError } = await supabase.from('canvas_objects').insert({
        project_id: currentProject.id,
        user_id: user.id,
        object_id: objectId,
        object_type: 'video',
        file_path: videoFilePath,
        image_url: savedPosterUrl,  // FIX: Proper URL, not truncated base64
        object_data: {
          isVideo: true,
          videoUrl: permanentVideoUrl,
          videoFilePath: videoFilePath,
          posterUrl: savedPosterUrl,
          posterFilePath: posterFilePath,  // For URL regeneration on reload
          duration: videoDuration,
          width: posterImg.naturalWidth,
          height: posterImg.naturalHeight,
          scaleX: scale,
          scaleY: scale,
          prompt: '' // Could be passed from VideoGeneratorChat
        },
        position_x: placeholderLeft,
        position_y: placeholderTop
      });
      
      if (dbError) {
        console.error('Failed to save video to database:', dbError);
      } else {
        console.log('✅ Video saved to canvas_objects');
      }
      
      setVideoGeneratorPlaceholder(null);
      
      toast({
        title: 'Video Generated!',
        description: 'Your AI-generated video has been added to the canvas. Hover to preview, select to download.'
      });
    } catch (error) {
      console.error('Error adding video to canvas:', error);
      
      // Fallback: remove placeholder and show error
      fabricCanvas.remove(placeholder);
      setVideoGeneratorPlaceholder(null);
      
      toast({
        title: 'Error',
        description: 'Failed to add video to canvas. Opening in new tab instead.',
        variant: 'destructive'
      });
      
      // Open in new tab as fallback
      window.open(videoUrl, '_blank');
    }
  }, [videoGeneratorPlaceholder, currentProject, user, toast]);

  const handleVideoFormatChange = useCallback((format: string, dimensions: { width: number; height: number }) => {
    setVideoGeneratorFormat(format);
    // Update placeholder if exists
    if (videoGeneratorPlaceholder && canvasInstanceRef.current) {
      setVideoGeneratorPlaceholder(prev => prev ? { ...prev, format, dimensions } : null);
    }
  }, [videoGeneratorPlaceholder]);

  const handleVideoDurationChange = useCallback((duration: number) => {
    setVideoGeneratorDuration(duration);
    if (videoGeneratorPlaceholder) {
      setVideoGeneratorPlaceholder(prev => prev ? { ...prev, duration } : null);
    }
  }, [videoGeneratorPlaceholder]);

  // Cleanup abandoned placeholder after 5 minutes
  useEffect(() => {
    if (!imageGeneratorPlaceholder) return;
    const timeoutId = setTimeout(() => {
      if (imageGeneratorPlaceholder.rect && canvasInstanceRef.current) {
        canvasInstanceRef.current.remove(imageGeneratorPlaceholder.rect);
        canvasInstanceRef.current.requestRenderAll();
        setImageGeneratorPlaceholder(null);
        toast({
          title: 'Placeholder Removed',
          description: 'Image generator placeholder was removed due to inactivity'
        });
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(timeoutId);
  }, [imageGeneratorPlaceholder, toast]);

  // Cleanup video generator placeholder after 10 minutes (video generation takes 2-5 min)
  useEffect(() => {
    if (!videoGeneratorPlaceholder) return;
    const timeoutId = setTimeout(() => {
      if (videoGeneratorPlaceholder.rect && canvasInstanceRef.current) {
        canvasInstanceRef.current.remove(videoGeneratorPlaceholder.rect);
        canvasInstanceRef.current.requestRenderAll();
        setVideoGeneratorPlaceholder(null);
        toast({
          title: 'Placeholder Removed',
          description: 'Video generator placeholder was removed due to inactivity'
        });
      }
    }, 10 * 60 * 1000); // Extended to 10 minutes for video generation
    return () => clearTimeout(timeoutId);
  }, [videoGeneratorPlaceholder, toast]);
  // Pin placement handler - called when user clicks on image in pin mode
  const handlePinPlaced = useCallback(async (imageId: string, normalizedX: number, normalizedY: number, cropDataUrl: string) => {
    const imageObj = canvasInstanceRef.current?.getObjects().find((o: any) => 
      o.id === imageId || o.object_id === imageId || o.canvasObjectId === imageId
    );
    if (!imageObj) {
      console.error('Could not find image object for pin');
      return;
    }
    
    // Get full image URL
    const imageUrl = (imageObj as any).getSrc?.() || (imageObj as any)._originalElement?.src;
    
    // Create new pin with loading state
    const newPin: PinTag = {
      id: crypto.randomUUID(),
      number: pinTags.length + 1,
      x: normalizedX,
      y: normalizedY,
      label: 'Identifying...',
      aiSuggestions: [],
      thumbnailUrl: cropDataUrl,
      imageObjectId: imageId,
      isIdentifying: true
    };
    
    setPinTags(prev => [...prev, newPin]);
    setIsPinMode(false); // Exit pin mode after placement
    
    // Call edge function to identify object
    try {
      const { data, error } = await supabase.functions.invoke('identify-pin-object', {
        body: { imageUrl, normalizedX, normalizedY, cropDataUrl }
      });
      
      if (error) throw error;
      
      if (data) {
        setPinTags(prev => prev.map(p => 
          p.id === newPin.id 
            ? { 
                ...p, 
                label: data.primary || 'object', 
                aiSuggestions: [data.primary, ...(data.alternatives || [])].filter(Boolean),
                isIdentifying: false
              }
            : p
        ));
        toast({ description: `Tagged: ${data.primary}` });
      }
    } catch (err) {
      console.error('Pin identification failed:', err);
      setPinTags(prev => prev.map(p => 
        p.id === newPin.id ? { ...p, label: 'object', isIdentifying: false } : p
      ));
    }
  }, [pinTags, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={colabLogo} alt="Loading" className="h-16 w-16 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Loading your workspace...</p>
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-full" />
          </div>
        </div>
      </div>;
  }

  // Show error UI if canvas crashes
  if (canvasError) {
    return <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 border rounded-lg bg-white shadow-lg">
          <h2 className="text-xl font-bold mb-4">Canvas Error</h2>
          <p className="text-muted-foreground mb-4">
            The canvas encountered an error. You can reload the canvas to recover.
          </p>
          <Button onClick={reloadCanvas}>
            Reload Canvas
          </Button>
        </div>
      </div>;
  }
  return <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: canvasBgColor }}>
        <CanvasToolbar 
          projectTitle={currentProject?.title || 'Untitled Project'} 
          projectId={currentProject?.id || ''} 
          onSignOut={handleSignOut} 
          user={user} 
          onRefreshCredits={() => {}} 
          isSaving={isSaving} 
          lastSaved={lastSaved}
          selectedObject={selectedCanvasObject}
          canvasInstance={canvasInstanceRef.current}
          canvasElement={canvasElementRef.current}
          
        />
      
      <div className="flex-1 relative overflow-hidden">
        {/* Left tool panel (moves with Layers panel when expanded) */}
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-transform duration-300 ease-out"
          style={{
            transform: isLayersPanelOpen && isLayersPanelExpanded
              ? 'translateX(calc(420px + 1rem))'
              : 'translateX(0px)'
          }}
        >
          <div className="relative w-full h-full pointer-events-none">
            <CanvasToolPanel 
              activeTool={activeTool} 
              onToolSelect={setActiveTool} 
              onAddArtboard={() => setActiveTool('artboard')} 
              onImageGenerator={handleImageGenerator}
              onVideoGenerator={handleVideoGenerator}
              brushWidth={brushWidth}
              onBrushWidthChange={setBrushWidth}
              brushStyle={brushStyle}
              onBrushStyleChange={setBrushStyle}
              onOpenAssetPicker={() => setShowAssetPicker(true)}
              onOpenImportFromBrand={() => setShowImportFromBrand(true)}
              onOpenExportToBrand={() => setShowExportToBrand(true)}
              onOpenDesignAdaptation={() => {
                // Close other panels first (mutual exclusivity)
                setShowTranslateText(false);
                setShowQRGenerator(false);
                setShowAssetGenerator(false);
                setShowDesignAdaptation(true);
              }}
              onOpenTranslateText={() => {
                // Close other panels first (mutual exclusivity)
                setShowDesignAdaptation(false);
                setShowQRGenerator(false);
                setShowAssetGenerator(false);
                setShowTranslateText(true);
              }}
              onOpenQRGenerator={() => {
                // Close other panels first (mutual exclusivity)
                setShowDesignAdaptation(false);
                setShowTranslateText(false);
                setShowAssetGenerator(false);
                setShowQRGenerator(true);
              }}
              onOpenAssetGenerator={(type) => {
                // Close other panels first (mutual exclusivity)
                setShowDesignAdaptation(false);
                setShowTranslateText(false);
                setShowQRGenerator(false);
                setAssetGeneratorType(type || 'sticker');
                setShowAssetGenerator(true);
              }}
              onImageUpload={handleImageUpload}
              onOpenEffects={() => {
                setShowDesignAdaptation(false);
                setShowTranslateText(false);
                setShowQRGenerator(false);
                setShowAssetGenerator(false);
                setShowEffectsPanel(prev => !prev);
              }}
              isEffectsOpen={showEffectsPanel}
              isLiveSketchActive={realtimeSketchMode}
              onToggleLiveSketch={() => setRealtimeSketchMode(prev => !prev)}
              onOpenFontGenerator={() => setShowFontGenerator(true)}
              onOpenComponentsPanel={() => setShowComponentsPanel(true)}
            />
            {showEffectsPanel && (
              <EffectsPanel
                selectedObject={selectedCanvasObject}
                fabricCanvas={canvasInstanceRef.current}
                onClose={() => setShowEffectsPanel(false)}
              />
            )}
          </div>
        </div>
        
        {/* Double-click instruction removed — objects work directly */}
        
        <div className="absolute inset-0" style={{ backgroundColor: canvasBgColor }}>
          <InfiniteCanvas
            artboards={artboards} 
            canvasObjects={canvasObjects} 
            activeTool={activeTool} 
            projectId={currentProject?.id} 
            canvasInstanceRef={canvasInstanceRef} 
            placeholderMode={!!imageGeneratorPlaceholder} 
            onPlaceholderComplete={handleImageGeneratorComplete} 
            selectedImageModel={selectedImageModel} 
            onImageModelChange={setSelectedImageModel} 
            onToolSelect={setActiveTool} 
            onArtboardUpdate={handleArtboardUpdate} 
            onArtboardDelete={handleArtboardDelete} 
            onNewArtboard={handleNewArtboard} 
            onCanvasObjectsChange={handleCanvasObjectsChange} 
            onCanvasObjectDelete={handleCanvasObjectDelete} 
            generatingArtboards={generatingArtboards} 
            onGeneratingArtboardsChange={setGeneratingArtboards} 
            isPinMode={isPinMode} 
            onPinPlaced={handlePinPlaced} 
            pinTags={pinTags} 
            onPinTagsChange={setPinTags} 
            onPinModeChange={setIsPinMode}
            // Aspect ratio control props
            selectedFormat={generatorFormat}
            selectedResolution={generatorResolution}
            onFormatChange={handleGeneratorFormatChange}
            onResolutionChange={handleGeneratorResolutionChange}
            // BUG FIX #6: Pass brush props to InfiniteCanvas
            brushWidth={brushWidth}
            brushStyle={brushStyle}
            onBrushWidthChange={setBrushWidth}
            onBrushStyleChange={setBrushStyle}
            onStrokeComplete={handleStrokeComplete}
            onOpenComponentsPanel={() => setShowComponentsPanel(true)}
            // Pass placeholder for info overlay
            imageGeneratorPlaceholder={imageGeneratorPlaceholder}
            onCanvasReady={(getCenter, focusArtboard, getLayers, zoomControls, canvasElement, updateProperties) => {
              getViewportCenterRef.current = getCenter;
              focusArtboardRef.current = focusArtboard;
              getLayersRef.current = getLayers;
              canvasZoomRef.current = zoomControls;
              canvasElementRef.current = canvasElement;
              updatePropertiesRef.current = updateProperties;
              setIsCanvasReady(true);

              // Initial layer load
              setTimeout(() => {
                const initialLayers = getLayers();
                setLayers(initialLayers);
                setZoomPercentage(zoomControls.getZoom() * 100);

                // Auto-focus on the first artboard after canvas is ready
                if (artboards.length > 0) {
                  focusArtboard(artboards[0].id);
                }

                // Generate initial thumbnail
                if (currentProject?.id) {
                  generateCanvasThumbnail(currentProject.id, canvasElement, artboards, canvasObjects);
                }
              }, 100);
            }} 
            onLayersChange={handleLayersChange} 
            onArtboardEditRequest={handleArtboardEditRequest} 
            onArtboardSelected={handleArtboardSelect} 
            onZoomChange={zoom => setZoomPercentage(zoom * 100)} 
            onObjectSelected={obj => {
              setSelectedCanvasObject(obj);
              if (obj && !obj.isArtboard) {
                updateFloatingToolbarPosition(obj);
              } else {
                setShowFloatingToolbar(false);
              }
            }} 
            onShowColorPanel={show => setShowColorPanel(show)} 
            onViewportChange={() => {
              if (canvasInstanceRef.current && currentProject) {
                handleCanvasObjectsChange(collectAllSaveableObjects(canvasInstanceRef.current));
              }
            }}
            onMultiSelectChange={(count, position) => {
              setMultiSelectCount(count);
              setMultiSelectPosition(position);
            }} 
          />
          
          {/* Realtime Cursors Overlay - FIX #2: Use tracked viewportTransform state */}
          {currentProject?.id && user?.id && (
            <RealtimeCursors 
              projectId={currentProject.id}
              currentUserId={user.id}
              canvasRef={canvasElementRef}
              viewportTransform={viewportTransform}
            />
          )}
        </div>

        {/* Layers Panel (floating modal) */}
        {isLayersPanelOpen && (
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedArtboardForEdit || undefined}
            onLayerSelect={handleLayerSelect}
            onLayerToggleVisibility={handleLayerToggleVisibility}
            onLayerDelete={handleArtboardDelete}
            onLayerToggleExpand={handleLayerToggleExpand}
            expanded={isLayersPanelExpanded}
            onExpandedChange={setIsLayersPanelExpanded}
            onLayerRename={handleLayerRename}
            onLayerReorder={handleLayerReorder}
            onClose={() => {
              setIsLayersPanelOpen(false);
              setIsLayersPanelExpanded(false);
            }}
          />
        )}

        {/* Bottom Controls */}
        <CanvasBottomControls isLayersPanelOpen={isLayersPanelOpen} onToggleLayers={() => setIsLayersPanelOpen(!isLayersPanelOpen)} onUndo={handleUndo} onRedo={handleRedo} onZoomIn={() => canvasZoomRef.current?.zoomIn()} onZoomOut={() => canvasZoomRef.current?.zoomOut()} zoomPercentage={zoomPercentage} canvasInstanceRef={canvasInstanceRef} canvasBgColor={canvasBgColor} onCanvasBgColorChange={setCanvasBgColor} />

        {/* Floating Edit Chat */}
        {selectedArtboardForEdit && <FloatingEditChat artboardId={selectedArtboardForEdit} artboardTitle={artboards.find(ab => ab.id === selectedArtboardForEdit)?.title || ''} imageUrl={artboards.find(ab => ab.id === selectedArtboardForEdit)?.image_url || ''} originalWidth={artboards.find(ab => ab.id === selectedArtboardForEdit)?.width} originalHeight={artboards.find(ab => ab.id === selectedArtboardForEdit)?.height} projectId={currentProject?.id} onClose={() => setSelectedArtboardForEdit(null)} onEditComplete={newImageUrl => handleEditComplete(selectedArtboardForEdit, newImageUrl)} position={editChatPosition} />}

        {/* Text Properties Panel */}
        {selectedCanvasObject && (selectedCanvasObject.type === 'text' || selectedCanvasObject.type === 'i-text' || selectedCanvasObject.type === 'textbox') && <TextPropertiesPanel selectedObject={selectedCanvasObject} onUpdate={props => updatePropertiesRef.current?.(props)} />}

        {/* Color Properties Panel (never show for images) */}
        {selectedCanvasObject && showColorPanel && selectedCanvasObject.type !== 'image' && selectedCanvasObject.type !== 'Image' && (
          <ColorPropertiesPanel 
            selectedObject={selectedCanvasObject} 
            selectedChildIndex={selectedSvgChildIndex}
            canvas={canvasInstanceRef.current}
            onUpdate={props => {
              // If editing a child path, update the child + svgSource
              if (selectedSvgChildIndex != null && (selectedCanvasObject as any)?.isSvgIcon && selectedCanvasObject._objects?.[selectedSvgChildIndex]) {
                const child = selectedCanvasObject._objects[selectedSvgChildIndex];
                if (props.fill !== undefined) {
                  child.set('fill', props.fill);
                }
                if (props.stroke !== undefined) {
                  child.set('stroke', props.stroke);
                }
                if (props.opacity !== undefined) {
                  child.set('opacity', props.opacity);
                }
                const canvas = canvasInstanceRef.current;
                if (canvas) canvas.renderAll();
                // Update svgSource
                if ((selectedCanvasObject as any).svgSource) {
                  try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString((selectedCanvasObject as any).svgSource, 'image/svg+xml');
                    const paths = doc.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse');
                    if (paths[selectedSvgChildIndex] && props.fill !== undefined) {
                      paths[selectedSvgChildIndex].setAttribute('fill', typeof props.fill === 'string' ? props.fill : '');
                    }
                    (selectedCanvasObject as any).svgSource = new XMLSerializer().serializeToString(doc.documentElement);
                  } catch {}
                }
              } else {
                updatePropertiesRef.current?.(props);
              }
            }} 
          />
        )}

        {/* Floating Selection Toolbar - hide for raster images (ImageActionToolbar handles those) */}
        {showFloatingToolbar && floatingToolbarPosition && selectedCanvasObject && selectedCanvasObject.type !== 'image' && (
          <FloatingSelectionToolbar
            selectedObject={selectedCanvasObject}
            position={floatingToolbarPosition}
            onRotate={handleRotation}
            onDuplicate={handleDuplicateObject}
            onDelete={handleDeleteObject}
            onLock={handleLock}
            onAnimateToggle={(selectedCanvasObject as any)?.isSvgIcon ? () => {
              const objId = (selectedCanvasObject as any)?.canvasObjectId || 'svg-default';
              if (showSvgAnimation) {
                setShowSvgAnimation(false);
                useSvgAnimationStore.getState().setActiveAnimation(null);
                svgOverlayRef.current = null;
                setSvgOverlayElement(null);
              } else {
                setShowSvgAnimation(true);
                const store = useSvgAnimationStore.getState();
                if (!store.animationConfigs.has(objId)) {
                  const pathCount = (selectedCanvasObject as any)?.svgPathCount || 1;
                  store.setConfig(objId, createDefaultAnimationConfig(pathCount));
                }
                store.setActiveAnimation(objId);
              }
            } : undefined}
            isAnimating={showSvgAnimation}
          />
        )}

        {/* SVG Animation Container - centered overlay with SVG preview + timeline */}
        {showSvgAnimation && (selectedCanvasObject as any)?.isSvgIcon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-center gap-4">
              {/* SVG Preview Container */}
              <div
                className="relative bg-background border-2 border-dashed border-border rounded-xl p-8"
                style={{
                  width: Math.max(300, Math.min(600, (selectedCanvasObject?.width || 200) * (selectedCanvasObject?.scaleX || 1))),
                  height: Math.max(300, Math.min(600, (selectedCanvasObject?.height || 200) * (selectedCanvasObject?.scaleY || 1))),
                  backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <div
                  ref={svgOverlayRef}
                  className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_path]:cursor-pointer [&_circle]:cursor-pointer [&_rect]:cursor-pointer [&_ellipse]:cursor-pointer [&_line]:cursor-pointer [&_polyline]:cursor-pointer [&_polygon]:cursor-pointer [&_path]:hover:stroke-primary [&_circle]:hover:stroke-primary [&_rect]:hover:stroke-primary [&_ellipse]:hover:stroke-primary"
                />
              </div>
              {/* Timeline below */}
              <SvgAnimationTimeline svgElement={svgOverlayElement} />
            </div>
          </div>
        )}

        {/* SVG Animation Properties Panel */}
        {showSvgAnimation && (
          <SvgAnimationPropertiesPanel onClose={() => {
            setShowSvgAnimation(false);
            useSvgAnimationStore.getState().setActiveAnimation(null);
            svgOverlayRef.current = null;
            setSvgOverlayElement(null);
          }} />
        )}

        {/* Multi-Select Toolbar */}
        {multiSelectCount >= 2 && multiSelectPosition && (
          <MultiSelectToolbar
            position={multiSelectPosition}
            selectedCount={multiSelectCount}
            onAutoLayout={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection') return;
              
              // Get selection bounds for starting position
              const bounds = activeObj.getBoundingRect();
              const objects = [...(activeObj as any)._objects];
              const cols = Math.ceil(Math.sqrt(objects.length));
              const gap = 20;
              
              // Calculate sizes
              const sizes = objects.map((obj: any) => ({
                obj,
                width: (obj.width || 100) * (obj.scaleX || 1),
                height: (obj.height || 100) * (obj.scaleY || 1)
              }));
              
              let currentX = bounds.left;
              let currentY = bounds.top;
              let maxRowHeight = 0;
              
              sizes.forEach((item, i) => {
                if (i > 0 && i % cols === 0) {
                  currentX = bounds.left;
                  currentY += maxRowHeight + gap;
                  maxRowHeight = 0;
                }
                
                // Convert to absolute position accounting for object origin
                const offsetX = item.obj.originX === 'center' ? item.width / 2 : 0;
                const offsetY = item.obj.originY === 'center' ? item.height / 2 : 0;
                
                item.obj.set({ 
                  left: currentX + offsetX,
                  top: currentY + offsetY 
                });
                item.obj.setCoords();
                
                currentX += item.width + gap;
                maxRowHeight = Math.max(maxRowHeight, item.height);
              });
              
              // Recalculate selection bounds
              canvas.discardActiveObject();
              const newSelection = new ActiveSelection(objects, { canvas });
              canvas.setActiveObject(newSelection);
              canvas.requestRenderAll();
              toast({ description: 'Auto layout applied' });
            }}
            onGroup={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              let activeObj = canvas.getActiveObject();
              if (!activeObj || (activeObj.type !== 'activeselection' && activeObj.type !== 'activeSelection')) {
                const selectedObjects = canvas.getActiveObjects?.() || [];
                if (selectedObjects.length >= 2) {
                  activeObj = new ActiveSelection(selectedObjects, { canvas });
                  canvas.setActiveObject(activeObj);
                } else {
                  toast({ description: 'Select at least two objects to group' });
                  return;
                }
              }
              
              const objects = (activeObj as any).getObjects?.() || (activeObj as any)._objects || [];
              if (objects.length < 2) return;
              
              // Collect old IDs for database cleanup
              const oldObjectIds = objects.map((obj: any) => obj.canvasObjectId).filter(Boolean);
              
              // Create group using Fabric.js v6 pattern
              const group = new Group(objects, {
                left: activeObj.left,
                top: activeObj.top,
              });
              
              (group as any).isStandaloneObject = true;
              (group as any).canvasObjectId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              canvas.discardActiveObject();
              objects.forEach((obj: any) => canvas.remove(obj));
              canvas.add(group);
              canvas.setActiveObject(group);
              canvas.requestRenderAll();
              
              // Update multi-select state
              setMultiSelectCount(0);
              setMultiSelectPosition(null);
              
              toast({ description: 'Objects grouped' });
            }}
            onMerge={async () => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || !canvas) return;
              
              // Get bounds BEFORE modifications
              const bounds = activeObj.getBoundingRect();
              
              // Generate high-res PNG
              const dataUrl = activeObj.toDataURL({ format: 'png', multiplier: 2 });
              
              // Load as HTML Image first
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = async () => {
                // Create Fabric image using imported FabricImage
                const fabricImg = new FabricImage(img, {
                  left: bounds.left,
                  top: bounds.top,
                  selectable: true,
                  evented: true,
                });
                
                // Remove original objects from canvas
                const objects = (activeObj as any)._objects || [];
                objects.forEach((o: any) => canvas.remove(o));
                
                // Discard selection and add merged image
                canvas.discardActiveObject();
                canvas.add(fabricImg);
                canvas.setActiveObject(fabricImg);
                canvas.requestRenderAll();
                
                // Update multi-select state
                setMultiSelectCount(0);
                setMultiSelectPosition(null);
                
                toast({ description: 'Objects merged into image' });
              };
              
              img.src = dataUrl;
            }}
            onAlignLeft={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ left: o.left + (bounds.left - objBounds.left) });
              });
              canvas.requestRenderAll();
            }}
            onAlignCenterH={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              const centerX = bounds.left + bounds.width / 2;
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ left: o.left + (centerX - (objBounds.left + objBounds.width / 2)) });
              });
              canvas.requestRenderAll();
            }}
            onAlignRight={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              const rightEdge = bounds.left + bounds.width;
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ left: o.left + (rightEdge - (objBounds.left + objBounds.width)) });
              });
              canvas.requestRenderAll();
            }}
            onAlignTop={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ top: o.top + (bounds.top - objBounds.top) });
              });
              canvas.requestRenderAll();
            }}
            onAlignCenterV={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              const centerY = bounds.top + bounds.height / 2;
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ top: o.top + (centerY - (objBounds.top + objBounds.height / 2)) });
              });
              canvas.requestRenderAll();
            }}
            onAlignBottom={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = (activeObj as any)._objects || [];
              const bounds = activeObj.getBoundingRect();
              const bottomEdge = bounds.top + bounds.height;
              objects.forEach((o: any) => {
                const objBounds = o.getBoundingRect();
                o.set({ top: o.top + (bottomEdge - (objBounds.top + objBounds.height)) });
              });
              canvas.requestRenderAll();
            }}
            onDistributeH={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = [...(activeObj as any)._objects].sort((a: any, b: any) => {
                const aB = a.getBoundingRect();
                const bB = b.getBoundingRect();
                return aB.left - bB.left;
              });
              if (objects.length < 3) return;
              
              const first = objects[0].getBoundingRect();
              const last = objects[objects.length - 1].getBoundingRect();
              const totalWidth = (last.left + last.width) - first.left;
              const objWidths = objects.reduce((sum: number, o: any) => sum + o.getBoundingRect().width, 0);
              const spacing = (totalWidth - objWidths) / (objects.length - 1);
              
              let currentX = first.left;
              objects.forEach((obj: any) => {
                const b = obj.getBoundingRect();
                obj.set({ left: obj.left + (currentX - b.left) });
                currentX += b.width + spacing;
              });
              canvas.requestRenderAll();
            }}
            onDistributeV={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj || activeObj.type !== 'activeselection' || !canvas) return;
              
              const objects = [...(activeObj as any)._objects].sort((a: any, b: any) => {
                const aB = a.getBoundingRect();
                const bB = b.getBoundingRect();
                return aB.top - bB.top;
              });
              if (objects.length < 3) return;
              
              const first = objects[0].getBoundingRect();
              const last = objects[objects.length - 1].getBoundingRect();
              const totalHeight = (last.top + last.height) - first.top;
              const objHeights = objects.reduce((sum: number, o: any) => sum + o.getBoundingRect().height, 0);
              const spacing = (totalHeight - objHeights) / (objects.length - 1);
              
              let currentY = first.top;
              objects.forEach((obj: any) => {
                const b = obj.getBoundingRect();
                obj.set({ top: obj.top + (currentY - b.top) });
                currentY += b.height + spacing;
              });
              canvas.requestRenderAll();
            }}
            onDownload={() => {
              const canvas = canvasInstanceRef.current;
              const activeObj = canvas?.getActiveObject();
              if (!activeObj) return;
              
              const dataUrl = activeObj.toDataURL({ format: 'png', multiplier: 2 });
              const link = document.createElement('a');
              link.download = `selection-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
              toast({ description: 'Selection downloaded' });
            }}
            onBooleanUnion={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (!activeObj || (activeObj.type !== 'activeSelection' && activeObj.type !== 'activeselection')) return;
              const objects = (activeObj as any).getObjects();
              if (objects.length < 2) return;
              try {
                const result = createBooleanGroup(canvas, objects, 'union');
                if (result) toast({ description: 'Boolean union applied' });
                else toast({ description: 'Boolean union failed', variant: 'destructive' });
              } catch (e) { console.error(e); }
              setMultiSelectCount(0);
              setMultiSelectPosition(null);
            }}
            onBooleanSubtract={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (!activeObj || (activeObj.type !== 'activeSelection' && activeObj.type !== 'activeselection')) return;
              const objects = (activeObj as any).getObjects();
              if (objects.length < 2) return;
              try {
                const result = createBooleanGroup(canvas, objects, 'subtract');
                if (result) toast({ description: 'Boolean subtract applied' });
                else toast({ description: 'Boolean subtract failed', variant: 'destructive' });
              } catch (e) { console.error(e); }
              setMultiSelectCount(0);
              setMultiSelectPosition(null);
            }}
            onBooleanIntersect={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (!activeObj || (activeObj.type !== 'activeSelection' && activeObj.type !== 'activeselection')) return;
              const objects = (activeObj as any).getObjects();
              if (objects.length < 2) return;
              try {
                const result = createBooleanGroup(canvas, objects, 'intersect');
                if (result) toast({ description: 'Boolean intersect applied' });
                else toast({ description: 'Boolean intersect failed', variant: 'destructive' });
              } catch (e) { console.error(e); }
              setMultiSelectCount(0);
              setMultiSelectPosition(null);
            }}
            onBooleanExclude={() => {
              const canvas = canvasInstanceRef.current;
              if (!canvas) return;
              const activeObj = canvas.getActiveObject();
              if (!activeObj || (activeObj.type !== 'activeSelection' && activeObj.type !== 'activeselection')) return;
              const objects = (activeObj as any).getObjects();
              if (objects.length < 2) return;
              try {
                const result = createBooleanGroup(canvas, objects, 'exclude');
                if (result) toast({ description: 'Boolean exclude applied' });
                else toast({ description: 'Boolean exclude failed', variant: 'destructive' });
              } catch (e) { console.error(e); }
              setMultiSelectCount(0);
              setMultiSelectPosition(null);
            }}
          />
        )}

        <ChatInterface 
          userId={user?.id || ''} 
          projectId={currentProject?.id || ''} 
          onDesignGenerated={async (imageUrl, title, x, y, artboardId, isPlaceholder, directToCanvas, gridIndex, filePath) => {
            const result = await handleNewArtboard(imageUrl, title, x, y, artboardId, isPlaceholder, directToCanvas || false, gridIndex, filePath);
            return result;
          }} 
          userName={user?.user_metadata?.full_name} 
          selectedArtboardImage={selectedArtboardImageUrl} 
          artboards={artboards}
          canvasInstance={canvasInstanceRef.current}
          selectedFormat={generatorFormat}
        />

        {/* Prompt History Bar */}
        <PromptHistoryBar projectId={currentProject?.id || ''} />
        
        {/* Asset Picker Modal - BUG FIX #7 */}
        <AssetPickerModal
          open={showAssetPicker}
          onOpenChange={setShowAssetPicker}
          onSelect={(asset) => {
            // Add image to canvas
            if (canvasInstanceRef.current && asset.signed_url) {
              FabricImage.fromURL(asset.signed_url).then((img) => {
                if (img && canvasInstanceRef.current) {
                  const center = getViewportCenterRef.current?.() || { x: 400, y: 300 };
                  img.set({ left: center.x, top: center.y });
                  canvasInstanceRef.current.add(img);
                  canvasInstanceRef.current.setActiveObject(img);
                  canvasInstanceRef.current.requestRenderAll();
                }
              });
            }
          }}
        />
        
        {/* Import from Brand Panel */}
        <ImportFromBrandPanel
          open={showImportFromBrand}
          onOpenChange={setShowImportFromBrand}
          onImport={(asset) => {
            if (canvasInstanceRef.current && asset.storage_url) {
              FabricImage.fromURL(asset.storage_url).then((img) => {
                if (img && canvasInstanceRef.current) {
                  const center = getViewportCenterRef.current?.() || { x: 400, y: 300 };
                  img.set({ left: center.x, top: center.y });
                  canvasInstanceRef.current.add(img);
                  canvasInstanceRef.current.setActiveObject(img);
                  canvasInstanceRef.current.requestRenderAll();
                }
              });
            }
          }}
        />
        
        {/* Design Adaptation Panel */}
        <DesignAdaptationPanel
          isOpen={showDesignAdaptation}
          onClose={() => setShowDesignAdaptation(false)}
          onAdaptDesign={async (adaptedImageUrl, width, height, formatName) => {
            // Add the adapted image as a new artboard
            const canvas = canvasInstanceRef.current;
            if (!canvas) return;
            
            const center = getViewportCenterRef.current?.() || { x: 500, y: 300 };
            
            // FIX #6: Add the adapted design at NATURAL size - don't scale down!
            // The AI has already regenerated at the correct dimensions
            const img = await FabricImage.fromURL(adaptedImageUrl);
            if (img) {
              // Position centered, but DON'T apply scaleX/scaleY - use 1:1 natural size
              img.set({ 
                left: center.x - (img.width || 0) / 2, 
                top: center.y - (img.height || 0) / 2,
                // NO scaling - the image is already at the correct size from AI
              });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
            }
            setShowDesignAdaptation(false);
          }}
          currentWidth={selectedCanvasObject?.width || 1080}
          currentHeight={selectedCanvasObject?.height || 1080}
          sourceImageUrl={(() => {
            // FIX #5: Improved image source extraction for Design Adaptation
            const canvas = canvasInstanceRef.current;
            if (!canvas) return null;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return null;
            
            // Get image URL from active object - handle FabricImage properly
            if (activeObj.type === 'image') {
              const fabricImg = activeObj as FabricImage;
              // Try getSrc() method first
              const src = (fabricImg as any).getSrc?.();
              if (src && (src.startsWith('http') || src.startsWith('data:'))) return src;
              // Try _originalElement
              const origSrc = (fabricImg as any)._originalElement?.src;
              if (origSrc && (origSrc.startsWith('http') || origSrc.startsWith('data:'))) return origSrc;
              // Try _element
              const elemSrc = (fabricImg as any)._element?.src;
              if (elemSrc && (elemSrc.startsWith('http') || elemSrc.startsWith('data:'))) return elemSrc;
              return null;
            }
            if ((activeObj as any).isArtboard) {
              const artboardId = (activeObj as any).artboardId;
              const artboard = artboards.find(a => a.id === artboardId);
              return artboard?.image_url || null;
            }
            return null;
          })()}
        />
        
        {/* Translate Text Panel */}
        <TranslateTextPanel
          isOpen={showTranslateText}
          onClose={() => setShowTranslateText(false)}
          selectedTexts={(() => {
            const canvas = canvasInstanceRef.current;
            if (!canvas) return [];
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return [];
            
            // Handle single text object
            if (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') {
              return [{
                id: (activeObj as any).canvasObjectId || 'text-1',
                text: (activeObj as any).text || '',
                fontFamily: (activeObj as any).fontFamily
              }];
            }
            
            // Handle selection of multiple objects
            if (activeObj.type === 'activeselection') {
              const textObjects = ((activeObj as any)._objects || [])
                .filter((o: any) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox')
                .map((o: any, i: number) => ({
                  id: o.canvasObjectId || `text-${i}`,
                  text: o.text || '',
                  fontFamily: o.fontFamily
                }));
              return textObjects;
            }
            
            return [];
          })()}
          onTranslateComplete={(translations) => {
            const canvas = canvasInstanceRef.current;
            if (!canvas) return;
            
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;
            
            // Handle single text object
            if (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') {
              const translation = translations[0];
              if (translation) {
                (activeObj as any).set('text', translation.translatedText);
                // Apply regional font if specified
                if (translation.fontFamily) {
                  (activeObj as any).set('fontFamily', translation.fontFamily);
                }
                canvas.requestRenderAll();
              }
              return;
            }
            
            // Handle selection
            if (activeObj.type === 'activeselection') {
              const textObjects = ((activeObj as any)._objects || [])
                .filter((o: any) => o.type === 'i-text' || o.type === 'text' || o.type === 'textbox');
              
              translations.forEach((t) => {
                const obj = textObjects.find((o: any) => (o.canvasObjectId || '') === t.id);
                if (obj) {
                  obj.set('text', t.translatedText);
                  if (t.fontFamily) {
                    obj.set('fontFamily', t.fontFamily);
                  }
                }
              });
              canvas.requestRenderAll();
            }
          }}
          selectedImageUrl={(() => {
            // FIX #4: Improved image source extraction for Translation
            // Handle blob URLs by converting to data URL
            const canvas = canvasInstanceRef.current;
            if (!canvas) return null;
            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'image') return null;
            
            const fabricImg = activeObj as FabricImage;
            
            // Try multiple sources
            let src = (fabricImg as any).getSrc?.();
            if (!src) src = (fabricImg as any)._originalElement?.src;
            if (!src) src = (fabricImg as any)._element?.src;
            
            // If it's a valid http or data URL, return it directly
            if (src && (src.startsWith('http') || src.startsWith('data:'))) {
              return src;
            }
            
            // If it's a blob URL, we need to convert it to data URL
            // This is handled asynchronously in TranslateTextPanel instead
            // For now, try to get the canvas element src
            if (src && src.startsWith('blob:')) {
              // Return a special marker that TranslateTextPanel can handle
              // The component will need to export the image to data URL
              try {
                const dataUrl = fabricImg.toDataURL({ format: 'png', quality: 1 });
                return dataUrl;
              } catch {
                return null;
              }
            }
            
            // Fallback: Try to export directly from fabric object
            try {
              const dataUrl = fabricImg.toDataURL({ format: 'png', quality: 1 });
              return dataUrl;
            } catch {
              return null;
            }
          })()}
          onImageTranslateComplete={async (translatedImageUrl) => {
            const canvas = canvasInstanceRef.current;
            if (!canvas) return;
            
            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'image') return;
            
            // Replace the current image with the translated one
            const left = activeObj.left || 0;
            const top = activeObj.top || 0;
            const scaleX = activeObj.scaleX || 1;
            const scaleY = activeObj.scaleY || 1;
            const angle = activeObj.angle || 0;
            
            const newImg = await FabricImage.fromURL(translatedImageUrl);
            if (newImg) {
              newImg.set({ left, top, scaleX, scaleY, angle });
              canvas.remove(activeObj);
              canvas.add(newImg);
              canvas.setActiveObject(newImg);
              canvas.requestRenderAll();
            }
          }}
        />
        
        {/* QR Code Generator */}
        <QRCodeGenerator
          isOpen={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          onGenerate={async (dataUrl) => {
            // Add QR code to canvas
            const canvas = canvasInstanceRef.current;
            if (!canvas) return;
            
            const img = await FabricImage.fromURL(dataUrl);
            if (img) {
              const center = getViewportCenterRef.current?.() || { x: 400, y: 300 };
              img.set({ left: center.x - 100, top: center.y - 100, scaleX: 0.5, scaleY: 0.5 });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              sonnerToast.success('QR code added to canvas');
            }
            setShowQRGenerator(false);
          }}
        />
        
        {/* Asset Generator Panel */}
        <AssetGeneratorPanel
          isOpen={showAssetGenerator}
          onClose={() => setShowAssetGenerator(false)}
          onGenerate={async (imageUrl) => {
            // Add generated asset to canvas
            const canvas = canvasInstanceRef.current;
            if (!canvas) return;
            
            const img = await FabricImage.fromURL(imageUrl);
            if (img) {
              const center = getViewportCenterRef.current?.() || { x: 400, y: 300 };
              img.set({ left: center.x - 100, top: center.y - 100 });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              sonnerToast.success('Asset added to canvas');
            }
            setShowAssetGenerator(false);
          }}
          initialType={assetGeneratorType as any}
        />
        
        {/* Video Generator Chat */}
        {videoGeneratorPlaceholder && activeTool === 'video-chat' && (
          <VideoGeneratorChat
            selectedObjects={[videoGeneratorPlaceholder.rect]}
            onClose={() => {
              if (videoGeneratorPlaceholder.rect && canvasInstanceRef.current) {
                canvasInstanceRef.current.remove(videoGeneratorPlaceholder.rect);
                canvasInstanceRef.current.requestRenderAll();
              }
              setVideoGeneratorPlaceholder(null);
              setActiveTool('select');
            }}
            projectId={currentProject?.id || ''}
            position={{
              x: (() => {
                if (!videoGeneratorPlaceholder.rect || !canvasInstanceRef.current) return 400;
                const bounds = videoGeneratorPlaceholder.rect.getBoundingRect();
                const vpt = canvasInstanceRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];
                return (bounds.left + bounds.width / 2) * vpt[0] + vpt[4];
              })(),
              y: (() => {
                if (!videoGeneratorPlaceholder.rect || !canvasInstanceRef.current) return 300;
                const bounds = videoGeneratorPlaceholder.rect.getBoundingRect();
                const vpt = canvasInstanceRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];
                return (bounds.top + bounds.height) * vpt[0] + vpt[5] + 24;
              })()
            }}
            onVideoComplete={handleVideoGeneratorComplete}
            canvasInstance={canvasInstanceRef.current}
            onGenerationStateChange={(isGenerating) => {}}
            selectedFormat={videoGeneratorFormat}
            selectedDuration={videoGeneratorDuration}
            onFormatChange={handleVideoFormatChange}
            onDurationChange={handleVideoDurationChange}
          />
        )}
        
        {/* Video Placeholder Info Overlay */}
        <VideoPlaceholderInfoOverlay
          canvas={canvasInstanceRef.current}
          placeholder={videoGeneratorPlaceholder}
        />
        
        
        {/* Realtime Sketch Panel */}
        <RealtimeSketchPanel
          isOpen={realtimeSketchMode}
          onClose={() => {
            setRealtimeSketchMode(false);
            setRealtimeSketchResult(null);
            if (realtimeSketchTimerRef.current) clearTimeout(realtimeSketchTimerRef.current);
          }}
          previewImageUrl={realtimeSketchResult}
          onPlaceOnCanvas={handlePlaceSketchOnCanvas}
          prompt={realtimeSketchPrompt}
          onPromptChange={setRealtimeSketchPrompt}
        />

        {/* Reusable Components Library */}
        <CanvasComponentsPanel
          open={showComponentsPanel}
          onClose={() => setShowComponentsPanel(false)}
          canvas={canvasInstanceRef.current}
        />

        {/* AI Font / Typography Generator */}
        <FontGeneratorPanel
          open={showFontGenerator}
          onClose={() => setShowFontGenerator(false)}
          canvas={canvasInstanceRef.current}
        />

        {/* Export to Brand - handled via toolbar */}

        {/* Effects Panel - now rendered via CanvasToolPanel area */}
      </div>
    </div>;
};
export default Canvas;