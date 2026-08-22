import { useRef, useEffect, useState, useCallback, createElement as reactCreateElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas as FabricCanvas, FabricImage, Rect, IText, Shadow, Point, Group, Circle, ActiveSelection, Object as FabricObject, Control, controlsUtils, Path } from 'fabric';
import { initAligningGuidelines } from 'fabric/extensions';
import { CursorEngine, type ToolMode } from '@/lib/canvas/CursorEngine';
import { CURSOR_ROTATE } from '@/lib/canvas/cursorSvgs';
import { createBooleanGroup, flattenSelected, flattenText, flattenGroup } from '@/lib/canvas/flattenEngine';
import { FrameContainer } from '@/lib/canvas/FrameContainer';
import { installFrameReparenting, reparentObjectsIntoFrames, collectAllSaveableObjects, getFrameChildIds, applyFrameClip } from '@/lib/canvas/frameReparenting';
import type { BooleanOperation } from '@/lib/canvas/booleanEngine';
import { rectangleToSegments } from '@/lib/penTool/shapeToPath';
import { applyCornerRadius } from '@/lib/canvas/cornerRadiusEngine';
import { renderBackgroundBlurs } from '@/lib/canvas/blurEngine';

// Rotate cursor kept as local alias for corner rotation controls
const ROTATE_CURSOR = CURSOR_ROTATE;

// Create invisible corner rotation controls positioned outside each corner
const createCornerRotationControls = () => {
  const rotateOffset = 12; // pixels outside corner
  const rotateSize = 20;   // hit zone size
  
  const createRotationControl = (x: number, y: number, offsetX: number, offsetY: number) => {
    return new Control({
      x,
      y,
      offsetX,
      offsetY,
      sizeX: rotateSize,
      sizeY: rotateSize,
      cursorStyleHandler: () => ROTATE_CURSOR,
      actionHandler: controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: () => {}, // Invisible - no visual rendering
    });
  };
  
  return {
    tlRotate: createRotationControl(-0.5, -0.5, -rotateOffset, -rotateOffset), // Top-left
    trRotate: createRotationControl(0.5, -0.5, rotateOffset, -rotateOffset),   // Top-right
    blRotate: createRotationControl(-0.5, 0.5, -rotateOffset, rotateOffset),   // Bottom-left
    brRotate: createRotationControl(0.5, 0.5, rotateOffset, rotateOffset),     // Bottom-right
  };
};

// Shared rotation controls instance
const cornerRotationControls = createCornerRotationControls();
import { supabase } from '@/integrations/supabase/client';
import { isSignedUrlExpired, extractFilePathFromSignedUrl } from '@/lib/storageUtils';
import PropertiesPanel from './PropertiesPanel';
import ArtboardDimensionsPanel from './ArtboardDimensionsPanel';
import { ArtboardExportDialog } from './ArtboardExportDialog';
import { CanvasVersionHistory, saveCanvasVersion } from './CanvasVersionHistory';
import ArtboardLoadingState from './ArtboardLoadingState';
import CanvasAIChat from './CanvasAIChat';
import ComponentIconUrl from '@/assets/icons/component.svg';
import GeneratingImageOverlay from './GeneratingImageOverlay';
import ImageInfoOverlay from './ImageInfoOverlay';
import PlaceholderInfoOverlay from './PlaceholderInfoOverlay';
import { createElement } from './ElementCreator';
import { PencilTool } from './PencilTool';
import { PencilToolEscapeHandler } from './PencilToolEscapeHandler';
import BezierPenTool from './BezierPenTool';
import CornerRadiusOverlay from './CornerRadiusOverlay';
import TextOnPathOverlay from './TextOnPathOverlay';
import TextOnPathPanel from './TextOnPathPanel';
import QuickCommentOverlay from './QuickCommentOverlay';
import { DEFAULT_TEXT_ON_PATH } from '@/lib/canvas/textOnPath';
import { usePenToolStore } from '@/stores/penToolStore';
import { generatePathD, transformSegments, generateVariableWidthOutline } from '@/lib/penTool/geometry';
import { BrushControlPanel } from './BrushControlPanel';
import { BrushCursorPreview } from './BrushCursorPreview';
import FloatingEditTextPanel from './FloatingEditTextPanel';
import FloatingEditElementsPanel from './FloatingEditElementsPanel';
 import DesignAnalysisPanel from './DesignAnalysisPanel';
import MotionStudioPanel from './MotionStudioPanel';
import ArtboardInfoOverlay from './ArtboardInfoOverlay';
import GradientOverlay from './GradientOverlay';
import MockupModeOverlay from './MockupModeOverlay';
import { translateOverlaysWithBase } from '@/lib/canvas/smartMockupLayer';
import ImageActionToolbar from './ImageActionToolbar';
import AdjustPanel from './AdjustPanel';
import MultiAnglesPanel from './MultiAnglesPanel';
import EraserOverlay from './EraserOverlay';
import FlipRotatePanel from './FlipRotatePanel';
import MoveObjectDialog from './MoveObjectDialog';
import VideoActionToolbar, { shouldShowVideoToolbar, getVideoToolbarPosition } from './VideoActionToolbar';
import VideoHoverOverlay from './VideoHoverOverlay';
import VideoInfoOverlay from './VideoInfoOverlay';
import VideoGeneratorChat from './VideoGeneratorChat';
import { VideoUploadProgressOverlay } from './VideoUploadProgressOverlay';
import { SaveCanvasComponentDialog } from './SaveCanvasComponentDialog';
import { serializeSelection } from '@/lib/canvas/componentSerializer';
import { snapshotSelection, snapshotSingleImageOrSource } from '@/lib/canvas/safeSnapshot';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Columns3,
  Rows3,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  Zap,
  FlipHorizontal2,
  FlipVertical2,
  Merge,
  Minus,
  Maximize2,
  X,
  Layers,
  Type,
  Scissors,
  Clipboard,
  ClipboardPaste,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  PackagePlus,
  Pencil,
  Maximize,
  Download as DownloadIcon,
  MessageSquarePlus,
  FileImage,
  FileCode,
} from 'lucide-react';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
interface Artboard {
  id: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  image_url: string | null;
}
export interface CanvasLayer {
  id: string;
  title: string;
  type: 'artboard' | 'image' | 'video' | 'text' | 'rectangle' | 'circle' | 'group';
  visible: boolean;
  thumbnail?: string;
  children?: CanvasLayer[];
  isExpanded?: boolean;
  parentId?: string;
}
interface InfiniteCanvasProps {
  artboards: Artboard[];
  canvasObjects?: any[];
  activeTool?: string;
  projectId?: string;
  canvasInstanceRef?: React.MutableRefObject<FabricCanvas | null>;
  onArtboardUpdate?: (id: string, updates: Partial<Artboard>) => void;
  onArtboardDelete?: (id: string) => void;
  onNewArtboard?: (imageUrl: string, title: string, x?: number, y?: number, artboardId?: string, isPlaceholder?: boolean, directToCanvas?: boolean, gridIndex?: number, filePath?: string, overrideWidth?: number, overrideHeight?: number) => void;
  onCanvasObjectsChange?: (objects: any[]) => void;
  onCanvasObjectDelete?: (objectId: string) => void;
  onCanvasReady?: (getViewportCenter: () => {
    x: number;
    y: number;
  }, focusArtboard: (id: string) => void, getLayers: () => CanvasLayer[], zoomControls: {
    zoomIn: () => void;
    zoomOut: () => void;
    getZoom: () => number;
  }, canvasElement: HTMLCanvasElement | null, updateProperties: (properties: any) => void) => void;
  onArtboardEditRequest?: (artboardId: string, position: {
    x: number;
    y: number;
  }) => void;
  onLayersChange?: (layers: CanvasLayer[]) => void;
  onArtboardSelected?: (artboardId: string | null) => void;
  onZoomChange?: (zoom: number) => void;
  onObjectSelected?: (object: any | null) => void;
  onShowColorPanel?: (show: boolean) => void;
  onToolSelect?: (tool: string) => void;
  generatingArtboards?: {
    id: string;
    title: string;
    width: number;
    height: number;
    position_x: number;
    position_y: number;
  }[];
  onGeneratingArtboardsChange?: (artboards: any[]) => void;
  placeholderMode?: boolean;
  onPlaceholderComplete?: (imageUrl: string) => void;
  selectedImageModel?: string;
  onImageModelChange?: (model: string) => void;
  onViewportChange?: () => void;
  onMultiSelectChange?: (count: number, position: { x: number; y: number } | null) => void;
  isPinMode?: boolean;
  onPinPlaced?: (imageId: string, normalizedX: number, normalizedY: number, cropDataUrl: string) => void;
  pinTags?: import('@/types/pinTag').PinTag[];
  onPinTagsChange?: (tags: import('@/types/pinTag').PinTag[]) => void;
  onPinModeChange?: (enabled: boolean) => void;
  // Aspect ratio control props for Image Generator
  selectedFormat?: string;
  selectedResolution?: string;
  onFormatChange?: (format: string, dimensions: { width: number; height: number }) => void;
  onResolutionChange?: (resolution: string) => void;
  // BUG FIX #6: Brush props from parent
  brushWidth?: number;
  brushStyle?: any;
  onBrushWidthChange?: (width: number) => void;
  onBrushStyleChange?: (style: any) => void;
  onStrokeComplete?: () => void;
  // BUG FIX #10: Direct file open for image tool
  onOpenFilePicker?: () => void;
  // Placeholder info overlay
  imageGeneratorPlaceholder?: {
    id: string;
    rect: any;
    format: string;
    dimensions: { width: number; height: number };
  } | null;
  // Components panel trigger (right-click → Save as Component opens its own dialog,
  // and the parent panel can be opened from elsewhere).
  onOpenComponentsPanel?: () => void;
}
const InfiniteCanvas = ({
  artboards,
  canvasObjects = [],
  activeTool = 'select',
  projectId,
  canvasInstanceRef,
  onArtboardUpdate,
  onCanvasObjectDelete,
  onArtboardDelete,
  onNewArtboard,
  onCanvasObjectsChange,
  onCanvasReady,
  onArtboardEditRequest,
  onLayersChange,
  onArtboardSelected,
  onZoomChange,
  onObjectSelected,
  onShowColorPanel,
  onToolSelect,
  generatingArtboards = [],
  onGeneratingArtboardsChange,
  placeholderMode = false,
  onPlaceholderComplete,
  selectedImageModel = 'google/gemini-3-pro-image-preview',
  onImageModelChange,
  onViewportChange,
  onMultiSelectChange,
  isPinMode = false,
  onPinPlaced,
  pinTags = [],
  onPinTagsChange,
  onPinModeChange,
  // Aspect ratio control props
  selectedFormat = '9:16',
  selectedResolution = '1K',
  onFormatChange,
  onResolutionChange,
  // BUG FIX #6: Brush props from parent
  brushWidth: propBrushWidth = 4,
  brushStyle: propBrushStyle,
  onBrushWidthChange,
  onBrushStyleChange,
  onStrokeComplete,
  // BUG FIX #10: Direct file open for image tool
  onOpenFilePicker,
  // Placeholder info overlay
  imageGeneratorPlaceholder,
  onOpenComponentsPanel,
}: InfiniteCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const activeToolRef = useRef(activeTool);
  const isSpacePressedRef = useRef(false);
  const isLoadingViewport = useRef(false);
  const contextMenuSelectionRef = useRef<any[]>([]);
  const internalClipboardRef = useRef<any[] | null>(null);
  const lastContextMenuPosRef = useRef<{ x: number; y: number } | null>(null);
  const [showSaveComponentDialog, setShowSaveComponentDialog] = useState(false);
  const [saveComponentObjects, setSaveComponentObjects] = useState<any[]>([]);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [contextMenuObjects, setContextMenuObjects] = useState<any[]>([]);
  const [isMultipleSelected, setIsMultipleSelected] = useState(false);
  const [isLoadingArtboards, setIsLoadingArtboards] = useState(false);
  // editModeArtboards removed — objects are top-level, no edit mode needed
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [selectedArtboard, setSelectedArtboard] = useState<any>(null);
  const [showArtboardExport, setShowArtboardExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showProjectVersionHistory, setShowProjectVersionHistory] = useState(false);
  const isInitialLoadCompleteRef = useRef(false);
  const lastRenderTime = useRef(0);
  const pendingRender = useRef(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showChatButton, setShowChatButton] = useState(false);
  const [chatButtonPosition, setChatButtonPosition] = useState({
    x: 0,
    y: 0
  });
  const [aiChatPosition, setAIChatPosition] = useState({
    x: 0,
    y: 0
  });
  const [chatSelectedObjects, setChatSelectedObjects] = useState<any[]>([]);
  const [placeholderObject, setPlaceholderObject] = useState<any>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  // BUG FIX #6: Use props for brush width/style instead of local state
  const defaultBrushStyle = {
    name: 'Heist',
    width: 4,
    opacity: 0.9,
    smoothness: 0.8,
    variability: 0.1,
    preset: 'heist'
  };
  const brushStyle = propBrushStyle || defaultBrushStyle;
  const brushWidth = propBrushWidth;
  const loadedArtboardsRef = useRef<Set<string>>(new Set());
  const layerExpandedState = useRef<Map<string, boolean>>(new Map());
  const getLayersRef = useRef<(() => CanvasLayer[]) | null>(null);
  const isLoadingFromDatabase = useRef(false);
  const imageAddCounter = useRef(0);
  const lastImageAddTime = useRef(0);
  const cursorEngineRef = useRef<CursorEngine | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
   const [quickCommentPos, setQuickCommentPos] = useState<{ x: number; y: number } | null>(null);
   const [liveCursorPos, setLiveCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Edit Text mode state
  const [editTextMode, setEditTextMode] = useState<{
    imageId: string;
    imageUrl: string;
    panelPosition: { x: number; y: number };
  } | null>(null);

  // Mockup mode state
  const [mockupMode, setMockupMode] = useState<{
    imageId: string;
    imageUrl: string;
    imageBounds: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Edit Elements mode state (replaces mockup for element extraction)
  const [editElementsMode, setEditElementsMode] = useState<{
    imageUrl: string;
    selectedObject: any;
  } | null>(null);

   // Design Analysis mode state
   const [designAnalysisMode, setDesignAnalysisMode] = useState<{
     imageUrl: string;
     selectedObject: any;
   } | null>(null);

   // Motion Studio mode state
  const [motionStudioMode, setMotionStudioMode] = useState<{
    imageUrl: string;
    selectedObject: any;
    position: { x: number; y: number };
  } | null>(null);

  // New tool panel states
  const [adjustMode, setAdjustMode] = useState<{ position: { x: number; y: number } } | null>(null);
  const [multiAnglesMode, setMultiAnglesMode] = useState<{ imageUrl: string; position: { x: number; y: number } } | null>(null);
  const [eraserMode, setEraserMode] = useState(false);
  const [flipRotateMode, setFlipRotateMode] = useState<{ position: { x: number; y: number } } | null>(null);
  const [moveObjectMode, setMoveObjectMode] = useState<{ imageUrl: string; position: { x: number; y: number } } | null>(null);
 
  // Video editing mode state
  const [videoEditMode, setVideoEditMode] = useState<{
    videoUrl: string;
    videoObject: any;
    position: { x: number; y: number };
  } | null>(null);

  // Video upload progress state
  const [videoUploadProgress, setVideoUploadProgress] = useState<{
    visible: boolean;
    progress: number;
    position: { x: number; y: number };
  }>({ visible: false, progress: 0, position: { x: 0, y: 0 } });

  // Update overlay position when viewport changes
  const updateOverlayPosition = useCallback(() => {
    if (!placeholderObject || !fabricCanvasRef.current) {
      setOverlayPosition(null);
      return;
    }
    
    const canvas = fabricCanvasRef.current;
    const bounds = placeholderObject.getBoundingRect();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];
    
    setOverlayPosition({
      x: bounds.left * zoom + vpt[4],
      y: bounds.top * zoom + vpt[5],
      width: bounds.width * zoom,
      height: bounds.height * zoom
    });
  }, [placeholderObject]);

  // FIX #6: Update AI chat position in real-time when object moves/viewport changes
  const updateAIChatPositionFromSelection = useCallback(() => {
    if (!fabricCanvasRef.current || chatSelectedObjects.length === 0 || !showAIChat) return;
    
    const canvas = fabricCanvasRef.current;
    const selection = canvas.getActiveObject();
    if (!selection) return;
    
    const bounds = selection.getBoundingRect();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];
    const PROMPT_BOX_WIDTH = 350; // Updated width to match CanvasAIChat
    
    const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
    const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
    
    // FIX: Pass center X directly - CSS translateX(-50%) handles centering
    setAIChatPosition({
      x: selectedCenterX,
      y: selectedBottomY + 24
    });
  }, [chatSelectedObjects.length, showAIChat]);

  // Update overlay position when generating and viewport changes
  useEffect(() => {
    if (isGeneratingImage && placeholderObject) {
      updateOverlayPosition();
    }
  }, [isGeneratingImage, placeholderObject, updateOverlayPosition]);

  // FIX #6: Listen for viewport changes to keep overlay in sync during zoom/pan
  useEffect(() => {
    if (!fabricCanvasRef.current || !isGeneratingImage) return;
    
    const canvas = fabricCanvasRef.current;
    const handleViewportChange = () => updateOverlayPosition();
    
    canvas.on('mouse:wheel', handleViewportChange);
    canvas.on('after:render', handleViewportChange);
    canvas.on('object:modified', handleViewportChange);
    
    return () => {
      canvas.off('mouse:wheel', handleViewportChange);
      canvas.off('after:render', handleViewportChange);
      canvas.off('object:modified', handleViewportChange);
    };
  }, [isGeneratingImage, updateOverlayPosition]);

  // Project-wide version control: save & restore via global window events from the toolbar
  useEffect(() => {
    if (!projectId) return;

    const PROJECT_HISTORY_PROPS = [
      'artboardId', 'isArtboard', 'isTitle', 'fullTitle',
      'isStandaloneObject', 'object_id', 'id', 'instructionShown',
      'canvasObjectId', 'databaseUUID',
      'isSvgIcon', 'svgSource', 'svgPathCount',
      'isVideo', 'videoUrl', 'rx', 'ry',
      '__blurConfig', '__backgroundBlur', '__progressiveBlur',
      'parentFrameId',
    ];

    const handleSave = async (e: Event) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        toast.error('Canvas not ready');
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Not signed in');
          return;
        }
        const detail = (e as CustomEvent).detail || {};
        const snapshot = (canvas as any).toJSON(PROJECT_HISTORY_PROPS);
        const id = await saveCanvasVersion({
          projectId,
          userId: user.id,
          artboardId: null,
          source: 'manual',
          label: detail.label || `Manual save · ${new Date().toLocaleString()}`,
          snapshot: { kind: 'project', canvas: snapshot },
        });
        if (id) toast.success('Version saved');
        else toast.error('Could not save version');
      } catch (err: any) {
        toast.error(err?.message ?? 'Save failed');
      }
    };

    const handleOpen = () => setShowProjectVersionHistory(true);

    window.addEventListener('colab:save-version', handleSave as EventListener);
    window.addEventListener('colab:open-version-history', handleOpen);
    return () => {
      window.removeEventListener('colab:save-version', handleSave as EventListener);
      window.removeEventListener('colab:open-version-history', handleOpen);
    };
  }, [projectId]);

  // AI timeout feedback - show reassuring toast if generation takes > 30s
  const generationStartTimeRef = useRef<number | null>(null);
  const timeoutToastShownRef = useRef(false);
  
  useEffect(() => {
    if (isGeneratingImage) {
      generationStartTimeRef.current = Date.now();
      timeoutToastShownRef.current = false;
      
      // Check every 5s if we've exceeded 30s
      const checkInterval = setInterval(() => {
        if (generationStartTimeRef.current && !timeoutToastShownRef.current) {
          const elapsed = Date.now() - generationStartTimeRef.current;
          if (elapsed > 30000) { // 30 seconds
            toast.info('AI is still working on your design. Complex prompts may take up to 2 minutes.', {
              duration: 5000,
            });
            timeoutToastShownRef.current = true;
          }
        }
      }, 5000);
      
      return () => clearInterval(checkInterval);
    } else {
      generationStartTimeRef.current = null;
      timeoutToastShownRef.current = false;
    }
  }, [isGeneratingImage]);

  // Auto-zoom to show element and prompt box
  const focusOnElementWithPrompt = (selectedObject: FabricObject, canvas: FabricCanvas) => {
    if (!canvas) return;
    
    const bounds = selectedObject.getBoundingRect();
    const PROMPT_BOX_HEIGHT = 150;
    const PADDING = 80;
    
    const totalHeight = bounds.height + PROMPT_BOX_HEIGHT + PADDING * 2;
    const totalWidth = Math.max(bounds.width, 500) + PADDING * 2;
    
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 600;
    
    // Calculate optimal zoom (cap at current zoom or 1.2x to not over-zoom)
    const zoomX = canvasWidth / totalWidth;
    const zoomY = canvasHeight / totalHeight;
    const currentZoom = canvas.getZoom();
    const optimalZoom = Math.min(zoomX, zoomY, 1.2, currentZoom);
    
    // Only adjust if we need to zoom out to fit
    if (optimalZoom < currentZoom) {
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2 + (PROMPT_BOX_HEIGHT / 4);
      
      canvas.zoomToPoint(
        new Point(canvasWidth / 2, canvasHeight / 2),
        optimalZoom
      );
      canvas.absolutePan(new Point(
        centerX * optimalZoom - canvasWidth / 2,
        centerY * optimalZoom - canvasHeight / 2
      ));
      canvas.renderAll();
    }
  };
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || fabricCanvasRef.current) return;
    
    // CRITICAL: Configure Fabric.js to preserve custom properties during serialization
    const originalToObject = FabricObject.prototype.toObject;
    FabricObject.prototype.toObject = function(propertiesToInclude = []) {
      return originalToObject.call(this, [
        'canvasObjectId', 'isStandaloneObject', 'databaseUUID',
        'isSvgIcon', 'svgSource', 'svgPathCount', 'penToolData', 'textOnPath',
        'isMockupSmartLayer', 'mockupBaseId', 'mockupSurfaceId',
        'mockupDesignSrc', 'mockupSurface',
        'fontMetadata',
        ...propertiesToInclude
      ]);
    };
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      selectionColor: 'rgba(59, 130, 246, 0.1)',
      selectionBorderColor: 'rgb(59, 130, 246)',
      selectionLineWidth: 1,
      fireRightClick: true,
    });
    fabricCanvasRef.current = canvas;
    
    // Modern thin blue selection controls (Figma/Canva style)
    // Set default control styling for all objects
    const defaultControls = {
      borderColor: 'rgb(59, 130, 246)',
      cornerColor: 'rgb(255, 255, 255)',
      cornerSize: 8,
      cornerStyle: 'circle' as const,
      transparentCorners: false,
      borderScaleFactor: 1.5,
      borderOpacityWhenMoving: 1,
      cornerStrokeColor: 'rgb(59, 130, 246)',
      padding: 0,
    };
    
    // Apply to canvas default settings
    canvas.set(defaultControls);
    
    // Set defaults on FabricObject prototype
    Object.assign(FabricObject.prototype, defaultControls);
    
    // CRITICAL: Also apply to ActiveSelection prototype for consistent multi-select styling
    Object.assign(ActiveSelection.prototype, defaultControls);
    
    // Apply corner rotation controls to prototypes (hides mtr, adds corner zones)
    // Only assign if controls exist on the prototype
    if (FabricObject.prototype.controls) {
      Object.assign(FabricObject.prototype.controls, cornerRotationControls);
      if (FabricObject.prototype.controls.mtr) {
        FabricObject.prototype.controls.mtr.visible = false;
      }
    }
    if (ActiveSelection.prototype.controls) {
      Object.assign(ActiveSelection.prototype.controls, cornerRotationControls);
      if (ActiveSelection.prototype.controls.mtr) {
        ActiveSelection.prototype.controls.mtr.visible = false;
      }
    }
    
    // Apply rotation controls when objects are added
    canvas.on('object:added', (e: any) => {
      const obj = e.target;
      if (obj) {
        obj.set(defaultControls);
        // Hide default rotation handle, use corner rotation zones instead
        if (obj.controls) {
          if (obj.controls.mtr) {
            obj.controls.mtr.visible = false;
          }
          Object.assign(obj.controls, cornerRotationControls);
          obj.setCoords();
        }
      }
    });
    
    // Apply to existing objects
    canvas.getObjects().forEach(obj => {
      obj.set(defaultControls);
      if (obj.controls) {
        if (obj.controls.mtr) {
          obj.controls.mtr.visible = false;
        }
        Object.assign(obj.controls, cornerRotationControls);
        obj.setCoords();
      }
    });
    
    canvas.requestRenderAll();
    
    // Initialize alignment guidelines with blue color
    const alignConfig = {
      margin: 8,
      width: 1, // Thin Figma-like guide lines
      color: 'rgb(59, 130, 246, 0.9)'
    };
    const deactivateAlignment = initAligningGuidelines(canvas, alignConfig);
    cleanupFunctionsRef.current.push(deactivateAlignment);
    
    // Expose canvas instance to parent component
    if (canvasInstanceRef) {
      canvasInstanceRef.current = canvas;
    }

    // Instantiate CursorEngine — manages all cursor logic via Fabric's cursor properties
    const engine = new CursorEngine(canvas);
    engine.setTool(activeTool as ToolMode);
    cursorEngineRef.current = engine;
    cleanupFunctionsRef.current.push(() => engine.destroy());

    // Fallback: if nothing loads, mark complete after short delay
    setTimeout(() => {
      if (!isInitialLoadCompleteRef.current) {
        console.log('✅ Fallback: marking load complete for empty canvas');
        isInitialLoadCompleteRef.current = true;
      }
    }, 200);

    // Generate layers hierarchy from canvas objects
    const getLayers = (): CanvasLayer[] => {
      const layers: CanvasLayer[] = [];
      
      // Track which objects are part of artboards
      const artboardObjectIds = new Set<any>();
      
      // Add artboards with their children (flat model: parentFrameId lookup)
      artboards.forEach(artboard => {
        const artboardGroup = canvas.getObjects().find(obj => (obj as any).artboardId === artboard.id && (obj as any).isArtboard);
        if (!artboardGroup) return;

        artboardObjectIds.add(artboardGroup);

        // Find children via parentFrameId (flat model)
        const artboardChildren: CanvasLayer[] = [];
        const childObjects = canvas.getObjects().filter(
          (o: any) => (o as any).parentFrameId === artboard.id && !(o as any).isArtboard && !(o as any).isArtboardImage
        );
        
        // Also track artboard images
        canvas.getObjects().forEach(o => {
          if ((o as any).isArtboardImage && (o as any).artboardId === artboard.id) {
            artboardObjectIds.add(o);
          }
        });

        for (const obj of childObjects) {
          artboardObjectIds.add(obj);
          
          let type: CanvasLayer['type'] = 'rectangle';
          let title = 'Object';
          const isVideo = (obj as any).isVideo === true;
          if (isVideo) {
            type = 'video';
            title = (obj as any).title || 'Video';
          } else if (obj.type === 'image') {
            type = 'image';
            title = 'Image';
          } else if (obj.type === 'i-text' || obj.type === 'text') {
            type = 'text';
            title = 'Text';
          } else if (obj.type === 'rect') {
            type = 'rectangle';
            title = 'Rectangle';
          } else if (obj.type === 'circle') {
            type = 'circle';
            title = 'Circle';
          } else if (obj.type === 'group') {
            type = 'group';
            title = 'Group';
          } else if (obj.type === 'path') {
            type = 'rectangle';
            title = 'Shape';
          }
          const objId = (obj as any).id || (obj as any).canvasObjectId || `obj-${artboard.id}-${Math.random().toString(36).substr(2,6)}`;
          (obj as any).id = objId;
          artboardChildren.push({
            id: objId,
            title,
            type,
            visible: obj.visible !== false,
            parentId: artboard.id
          });
        }
        const isExpanded = layerExpandedState.current.get(artboard.id) ?? true;
        layers.push({
          id: artboard.id,
          title: artboard.title,
          type: 'artboard',
          visible: artboardGroup.visible !== false,
          thumbnail: artboard.image_url || undefined,
          children: artboardChildren,
          isExpanded
        });
      });
      
      // Add standalone objects (not part of any artboard)
      canvas.getObjects().forEach((obj, index) => {
        if (artboardObjectIds.has(obj) || (obj as any).isTitle) return;
        
        let type: CanvasLayer['type'] = 'rectangle';
        let title = 'Object';
        let thumbnail: string | undefined;
        
        // Check for video objects first (videos are stored as image type with isVideo flag)
        const isVideo = (obj as any).isVideo === true;
        
        if (isVideo) {
          type = 'video';
          title = (obj as any).title || 'Video';
          // Get video thumbnail (poster frame)
          try {
            thumbnail = (obj as any).getSrc?.() || (obj as any)._originalElement?.src;
          } catch (e) {
            // Ignore error
          }
        } else if (obj.type === 'image') {
          type = 'image';
          title = (obj as any).layerName || (obj as any).title || 'Image';
          // Get image thumbnail
          try {
            thumbnail = (obj as any).getSrc?.() || (obj as any)._originalElement?.src;
          } catch (e) {
            // Ignore error
          }
        } else if (obj.type === 'i-text' || obj.type === 'text') {
          type = 'text';
          title = (obj as any).text || 'Text';
        } else if (obj.type === 'rect') {
          type = 'rectangle';
          title = 'Rectangle';
        } else if (obj.type === 'circle') {
          type = 'circle';
          title = 'Circle';
        } else if (obj.type === 'group') {
          type = 'group';
          title = 'Group';
          // Generate thumbnail for groups
          try {
            thumbnail = (obj as any).toDataURL({
              format: 'png',
              multiplier: 0.2
            });
          } catch (e) {
            console.warn('Failed to generate group thumbnail:', e);
          }
        }
        
        const objId = (obj as any).id || `standalone-${index}`;
        (obj as any).id = objId;
        
        layers.push({
          id: objId,
          title,
          type,
          visible: obj.visible !== false,
          thumbnail
        });
      });
      
      return layers;
    };

    // Provide viewport center function and focus artboard function
    if (onCanvasReady) {
      const getViewportCenter = () => {
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = canvas.getZoom();
        const centerX = (canvas.width! / 2 - vpt[4]) / zoom;
        const centerY = (canvas.height! / 2 - vpt[5]) / zoom;
        return {
          x: centerX,
          y: centerY
        };
      };
      const focusArtboard = (id: string) => {
        // All objects are top-level — find by artboardId, object id, or canvasObjectId
        let targetObj: any = null;

        const artboardObj = canvas.getObjects().find(obj => (obj as any).artboardId === id && (obj as any).isArtboard);
        if (artboardObj) {
          targetObj = artboardObj;
        } else {
          // Search by id, canvasObjectId, or databaseUUID
          const standaloneObj = canvas.getObjects().find(obj =>
            (obj as any).id === id ||
            (obj as any).canvasObjectId === id ||
            (obj as any).databaseUUID === id
          );
          if (standaloneObj) targetObj = standaloneObj;
        }
        if (targetObj) {
          canvas.setActiveObject(targetObj);

          // Pan to center
          const objCenterX = (targetObj.left || 0) + (targetObj.width || 0) * (targetObj.scaleX || 1) / 2;
          const objCenterY = (targetObj.top || 0) + (targetObj.height || 0) * (targetObj.scaleY || 1) / 2;
          const zoom = canvas.getZoom();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          vpt[4] = canvas.width! / 2 - objCenterX * zoom;
          vpt[5] = canvas.height! / 2 - objCenterY * zoom;
          canvas.requestRenderAll();
        }
      };
      const zoomControls = {
        zoomIn: () => {
          const zoom = canvas.getZoom();
          const newZoom = Math.min(zoom * 1.1, 5); // Max 500%
          canvas.setZoom(newZoom);
          if (onZoomChange) onZoomChange(newZoom);
          canvas.requestRenderAll();
        },
        zoomOut: () => {
          const zoom = canvas.getZoom();
          const newZoom = Math.max(zoom * 0.9, 0.01); // Min 1%
          canvas.setZoom(newZoom);
          if (onZoomChange) onZoomChange(newZoom);
          canvas.requestRenderAll();
        },
        getZoom: () => canvas.getZoom()
      };
      getLayersRef.current = getLayers;
      onCanvasReady(getViewportCenter, focusArtboard, getLayers, zoomControls, canvasRef.current, handleUpdateProperties);
      
      // Auto-focus on first element when canvas loads
      setTimeout(() => {
        const allObjects = canvas.getObjects().filter(obj => !(obj as any).isTitle);
        if (allObjects.length > 0) {
          // Calculate bounding box of all objects
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          allObjects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.left + bounds.width);
            maxY = Math.max(maxY, bounds.top + bounds.height);
          });
          
          // Center viewport on all objects
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const zoom = canvas.getZoom();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          vpt[4] = canvas.width! / 2 - centerX * zoom;
          vpt[5] = canvas.height! / 2 - centerY * zoom;
          canvas.requestRenderAll();
        }
      }, 100);
    }

    // Pan with spacebar or hand tool
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let isSpacePressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      // BUG FIX #9: Don't capture space key when editing text (i-text OR textbox)
      const activeObj = canvas.getActiveObject();
      const isTextEditing = activeObj && 
        (activeObj.type === 'i-text' || activeObj.type === 'textbox') && 
        (activeObj as any).isEditing === true;
      
      // Also check if focus is in an input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isContentEditable = target?.isContentEditable === true || 
                                (target?.isContentEditable as any) === 'true' ||
                                target?.getAttribute?.('contenteditable') === 'true';
      const isInInputField = target?.tagName === 'INPUT' || 
                             target?.tagName === 'TEXTAREA' || 
                             isContentEditable;
      
      if (e.code === 'Space' && !isSpacePressed && !isTextEditing && !isInInputField) {
        isSpacePressed = true;
        isSpacePressedRef.current = true;
        canvas.defaultCursor = 'default'; // CursorEngine handles grab
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Only reset if we weren't editing text
        const activeObj = canvas.getActiveObject();
        const isTextEditing = activeObj && 
          (activeObj.type === 'i-text' || activeObj.type === 'textbox') && 
          (activeObj as any).isEditing === true;
        
        if (!isTextEditing) {
          isSpacePressed = false;
          isSpacePressedRef.current = false;
          canvas.defaultCursor = 'default';
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.on('mouse:down', opt => {
      const evt = opt.e as MouseEvent;

      // Capture selection state for context menu BEFORE Fabric can modify it
      if (evt.button === 2) {
        evt.preventDefault();
        opt.e.preventDefault();
        const activeObj = canvas.getActiveObject();
        const objects = activeObj?.type === 'activeSelection' 
          ? (activeObj as ActiveSelection).getObjects()
          : (activeObj ? [activeObj] : []);
        contextMenuSelectionRef.current = objects;
        setContextMenuObjects(objects);
        setIsMultipleSelected(objects.length >= 2);
        // Also set selectedObject for context menu rendering
        if (activeObj) {
          setSelectedObject(activeObj);
        }
      }

      // Double-click handling — only for text editing
      if (evt.detail === 2 && activeToolRef.current === 'select') {
        const activeObj = canvas.getActiveObject();
        
        // Double-click on text to enter text editing
        if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'textbox')) {
          (activeObj as any).enterEditing();
          (activeObj as any).selectAll();
          canvas.renderAll();
          return;
        }
        // No artboard edit mode — objects are top-level
      }

      // Cmd/Ctrl+Click for deep select into groups (Figma-style)
      // Skip FrameContainer — those are passive artboard backgrounds, not interactive groups
      if ((evt.metaKey || evt.ctrlKey) && activeToolRef.current === 'select' && !evt.shiftKey) {
        const target = canvas.findTarget(evt);
        if (target && target.type === 'group' && !(target as any).isArtboard) {
          const group = target as Group;
          const pointer = canvas.getPointer(evt);
          const children = group.getObjects();
          
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child.containsPoint(new Point(pointer.x, pointer.y))) {
              canvas.setActiveObject(child);
              canvas.requestRenderAll();
              evt.preventDefault();
              return;
            }
          }
        }
      }

      // Alt+Click for duplication
      if (evt.altKey && activeToolRef.current === 'select') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !(activeObj as any).isArtboard && !(activeObj as any).isTitle) {
          evt.preventDefault();
          activeObj.clone().then((cloned: any) => {
            cloned.set({
              left: (activeObj.left || 0) + 20,
              top: (activeObj.top || 0) + 20
            });
            // CRITICAL: Set new canvasObjectId for cloned object
            cloned.isStandaloneObject = true;
            cloned.canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
          });
          return;
        }
      }
      if (activeToolRef.current === 'hand' || isSpacePressedRef.current || (evt as any).button === 1) {
        isPanning = true;
        canvas.selection = false;
        canvas.defaultCursor = 'default';
        cursorEngineRef.current?.setPanning(true);
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });
    canvas.on('mouse:move', opt => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      }
    });

    // Removed redundant object:moving requestRenderAll — Fabric already renders during moves
    canvas.on('mouse:up', () => {
      if (isPanning) {
        canvas.defaultCursor = 'default';
        cursorEngineRef.current?.setPanning(false);
      }
      isPanning = false;
      if (activeToolRef.current === 'select' || activeToolRef.current === 'edit') {
        canvas.selection = true;
      }
    });

    // Zoom with mouse wheel - zoom to cursor position
    canvas.on('mouse:wheel', opt => {
      const evt = opt.e;
      evt.preventDefault();
      evt.stopPropagation();
      const delta = evt.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;      // 500% max
      if (zoom < 0.01) zoom = 0.01; // 1% min

      // Zoom to cursor position using offsetX and offsetY
      canvas.zoomToPoint(new Point(evt.offsetX, evt.offsetY), zoom);
      if (onZoomChange) onZoomChange(zoom);
      return false;
    });

    // ============= TOUCH GESTURES FOR iPAD =============
    canvas.allowTouchScrolling = false;
    
    let touchStartDistance = 0;
    let touchStartZoom = 1;
    let isTouchPanning = false;
    let isPinchZooming = false;
    let lastTouchCenter = { x: 0, y: 0 };
    let renderThrottleId: number | null = null;

    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const screenToCanvas = (x: number, y: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x, y };
      return { x: x - rect.left, y: y - rect.top };
    };

    const throttledRender = () => {
      if (renderThrottleId) return;
      renderThrottleId = requestAnimationFrame(() => {
        canvas.requestRenderAll();
        renderThrottleId = null;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers — always pinch zoom, even in pencil mode
        e.preventDefault();
        e.stopPropagation();
        isPinchZooming = true;
        const t1 = e.touches[0], t2 = e.touches[1];
        touchStartDistance = getTouchDistance(t1, t2);
        touchStartZoom = canvas.getZoom();
        lastTouchCenter = screenToCanvas(...Object.values(getTouchCenter(t1, t2)) as [number, number]);
        canvas.selection = false;
        canvas.discardActiveObject();
        // If in drawing mode, temporarily disable so fingers can pan/zoom
        if (canvas.isDrawingMode) {
          canvas.isDrawingMode = false;
          (canvas as any).__drawingPausedByPinch = true;
        }
        throttledRender();
      } else if (e.touches.length === 1) {
        // Single finger: pan in hand mode, or when space pressed, or finger touch in pencil mode with stylus detected
        const tool = activeToolRef.current;
        const shouldPan = tool === 'hand' || isSpacePressedRef.current;
        if (shouldPan) {
          e.preventDefault();
          e.stopPropagation();
          isTouchPanning = true;
          const t = e.touches[0];
          lastTouchCenter = { x: t.clientX, y: t.clientY };
          canvas.selection = false;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinchZooming) {
        e.preventDefault();
        e.stopPropagation();
        const t1 = e.touches[0], t2 = e.touches[1];
        const currentDist = getTouchDistance(t1, t2);
        const scale = currentDist / touchStartDistance;
        let newZoom = Math.max(0.01, Math.min(5, touchStartZoom * scale));
        const center = getTouchCenter(t1, t2);
        const cp = screenToCanvas(center.x, center.y);
        
        // Simultaneous pan + zoom
        const vpt = canvas.viewportTransform;
        if (vpt) {
          const dx = cp.x - lastTouchCenter.x;
          const dy = cp.y - lastTouchCenter.y;
          vpt[4] += dx;
          vpt[5] += dy;
        }
        canvas.zoomToPoint(new Point(cp.x, cp.y), newZoom);
        lastTouchCenter = cp;
        if (onZoomChange) onZoomChange(newZoom);
      } else if (e.touches.length === 1 && isTouchPanning) {
        e.preventDefault();
        e.stopPropagation();
        const t = e.touches[0];
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += t.clientX - lastTouchCenter.x;
          vpt[5] += t.clientY - lastTouchCenter.y;
          throttledRender();
          lastTouchCenter = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchZooming = false;
        touchStartDistance = 0;
        touchStartZoom = 1;
        // Re-enable drawing mode if it was paused by pinch
        if ((canvas as any).__drawingPausedByPinch) {
          canvas.isDrawingMode = true;
          (canvas as any).__drawingPausedByPinch = false;
        }
        if (activeToolRef.current === 'select') canvas.selection = true;
      }
      if (e.touches.length === 0) {
        isTouchPanning = false;
        isPinchZooming = false;
      }
    };

    if (containerRef.current) {
      containerRef.current.style.touchAction = 'none';
      containerRef.current.style.webkitUserSelect = 'none';
      containerRef.current.style.overscrollBehavior = 'none';
      
      containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
      containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
      containerRef.current.addEventListener('touchend', handleTouchEnd, { passive: false });
      containerRef.current.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      
      const containerElement = containerRef.current;
      cleanupFunctionsRef.current.push(() => {
        containerElement?.removeEventListener('touchstart', handleTouchStart);
        containerElement?.removeEventListener('touchmove', handleTouchMove);
        containerElement?.removeEventListener('touchend', handleTouchEnd);
        containerElement?.removeEventListener('touchcancel', handleTouchEnd);
        if (renderThrottleId) cancelAnimationFrame(renderThrottleId);
      });
    }
    // ============= END TOUCH GESTURES =============

    // Selection handlers
    canvas.on('selection:created', e => {
      const selectedCount = e.selected?.length || 0;
      const activeObj = canvas.getActiveObject();

      // CRITICAL: Apply defaultControls to ActiveSelection instances at runtime
      if (activeObj?.type === 'activeselection') {
        activeObj.set({
          borderColor: 'rgb(59, 130, 246)',
          cornerColor: 'rgb(255, 255, 255)',
          cornerSize: 8,
          cornerStyle: 'circle' as const,
          transparentCorners: false,
          borderScaleFactor: 1.5,
          cornerStrokeColor: 'rgb(59, 130, 246)',
        });
        // Hide default mtr rotation handle, use corner rotation zones instead
        if (activeObj.controls?.mtr) {
          activeObj.controls.mtr.visible = false;
        }
        Object.assign(activeObj.controls, cornerRotationControls);
        activeObj.setCoords();
        canvas.requestRenderAll();
        
        // MULTI-SELECT TOOLBAR: Also notify on selection:created for 2+ objects
        const objects = (activeObj as any)._objects || [];
        const multiCount = objects.length;
        if (multiCount >= 2 && onMultiSelectChange) {
          const bounds = activeObj.getBoundingRect();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];
          const toolbarX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
          const toolbarY = bounds.top * zoom + vpt[5] - 60;
          onMultiSelectChange(multiCount, { x: toolbarX, y: toolbarY });
        }
      }

      // Check if selection contains at least one image (but NOT video objects)
      const hasImage = e.selected?.some((obj: any) => 
        (obj.type === 'image' || obj.type === 'Image') && !(obj as any).isVideo
      );
      
      // Check if it's a video (videos have their own Quick Edit in VideoActionToolbar)
      const isVideo = e.selected?.some((obj: any) => (obj as any).isVideo === true);

      // Show "Quick Edit" button when 1+ images are selected (NOT for videos)
      if (selectedCount >= 1 && hasImage && !isVideo) {
        const selection = canvas.getActiveObject();
        if (selection) {
          const bounds = selection.getBoundingRect();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];

          // Position button BELOW and centered to selection
          setChatButtonPosition({
            x: (bounds.left + bounds.width / 2) * zoom + vpt[4],
            y: (bounds.top + bounds.height) * zoom + vpt[5] + 16
          });
          setShowChatButton(true);
          setChatSelectedObjects(e.selected || []);
        }
      } else {
        setShowChatButton(false);
      }

      // Objects are top-level — no group.isArtboard check needed
      if ((activeObj as any)?.isPlaceholder && placeholderMode) {
        // Selected placeholder - show chat
        setPlaceholderObject(activeObj);
        setShowAIChat(true);
        setChatSelectedObjects([activeObj]);
        setSelectedObject(null);
        setSelectedArtboard(null);
        if (onArtboardSelected) onArtboardSelected(null);
        if (onObjectSelected) onObjectSelected(null);
        if (onShowColorPanel) onShowColorPanel(false);
        
        // Position chat below and centered to placeholder
        const bounds = activeObj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const PROMPT_BOX_WIDTH = 350;
        const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
        const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
        // FIX: Pass center X directly - CSS translateX(-50%) handles centering
        setAIChatPosition({
          x: selectedCenterX,
          y: selectedBottomY + 24
        });
        
        // Auto-zoom to show element and prompt box
        focusOnElementWithPrompt(activeObj, canvas);
      } else if ((activeObj as any)?.isArtboard) {
        setSelectedArtboard(activeObj);
        setSelectedObject(null);
        if (onArtboardSelected) onArtboardSelected((activeObj as any).artboardId);
        if (onObjectSelected) onObjectSelected(null);
        if (onShowColorPanel) onShowColorPanel(false);

        // If in edit mode, open the edit chat
        if (activeTool === 'edit' && onArtboardEditRequest) {
          const artboardId = (activeObj as any).artboardId;
          if (artboardId) {
            // Calculate screen position
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = vpt[0];
            const left = (activeObj.left || 0) * zoom + vpt[4];
            const top = (activeObj.top || 0) * zoom + vpt[5];
            const width = (activeObj.width || 0) * zoom;
            onArtboardEditRequest(artboardId, {
              x: left + width + 20,
              y: top
            });
          }
        }
      } else if (!(activeObj as any)?.isTitle) {
        // Handle both single objects and ActiveSelection (multiple objects)
        setSelectedObject(activeObj);
        setSelectedArtboard(null);
        if (onArtboardSelected) onArtboardSelected(null);
        if (onObjectSelected) onObjectSelected(activeObj);
        // Only show color panel for shapes and text when single selection (not for images or multiple)
        const isMultipleSelection = activeObj?.type === 'activeselection';
        if (!isMultipleSelection && onShowColorPanel && activeObj?.type !== 'image' && activeObj?.type !== 'Image') {
          onShowColorPanel(true);
        } else if (onShowColorPanel) {
          onShowColorPanel(false);
        }
      }
    });
    canvas.on('selection:updated', e => {
      const selectedCount = e.selected?.length || 0;
      const activeObj = canvas.getActiveObject();

      // CRITICAL: Apply defaultControls to ActiveSelection instances at runtime
      if (activeObj?.type === 'activeselection') {
        activeObj.set({
          borderColor: 'rgb(59, 130, 246)',
          cornerColor: 'rgb(255, 255, 255)',
          cornerSize: 8,
          cornerStyle: 'circle' as const,
          transparentCorners: false,
          borderScaleFactor: 1.5,
          cornerStrokeColor: 'rgb(59, 130, 246)',
        });
        // Hide default mtr rotation handle, use corner rotation zones instead
        if (activeObj.controls?.mtr) {
          activeObj.controls.mtr.visible = false;
        }
        Object.assign(activeObj.controls, cornerRotationControls);
        activeObj.setCoords();
        canvas.requestRenderAll();
      }

      // Show chat button when 2+ objects are selected
      // Check if selection contains at least one image (but NOT video objects)
      const hasImage = e.selected?.some((obj: any) => 
        (obj.type === 'image' || obj.type === 'Image') && !(obj as any).isVideo
      );
      
      // Check if it's a video (videos have their own Quick Edit in VideoActionToolbar)
      const isVideo = e.selected?.some((obj: any) => (obj as any).isVideo === true);

      // Show "Quick Edit" button when 1+ images are selected (NOT for videos)
      if (selectedCount >= 1 && hasImage && !isVideo) {
        const selection = canvas.getActiveObject();
        if (selection) {
          const bounds = selection.getBoundingRect();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];

          // Position button BELOW and centered to selection
          setChatButtonPosition({
            x: (bounds.left + bounds.width / 2) * zoom + vpt[4],
            y: (bounds.top + bounds.height) * zoom + vpt[5] + 16
          });
          setShowChatButton(true);
          setChatSelectedObjects(e.selected || []);
        }
      } else {
        setShowChatButton(false);
      }
      
      // MULTI-SELECT TOOLBAR: Notify parent when 2+ objects are selected
      if (selectedCount >= 2 && activeObj?.type === 'activeselection') {
        const bounds = activeObj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        
        // Position toolbar 60px ABOVE selection center
        const toolbarX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
        const toolbarY = bounds.top * zoom + vpt[5] - 60;
        
        if (onMultiSelectChange) {
          onMultiSelectChange(selectedCount, { x: toolbarX, y: toolbarY });
        }
      } else {
        if (onMultiSelectChange) {
          onMultiSelectChange(0, null);
        }
      }

      // Objects are top-level — no group.isArtboard check needed
      if ((activeObj as any)?.isPlaceholder && placeholderMode) {
        // Selected placeholder - show chat
        setPlaceholderObject(activeObj);
        setShowAIChat(true);
        setChatSelectedObjects([activeObj]);
        setSelectedObject(null);
        setSelectedArtboard(null);
        if (onArtboardSelected) onArtboardSelected(null);
        if (onObjectSelected) onObjectSelected(null);
        if (onShowColorPanel) onShowColorPanel(false);
        
        // Position chat below and centered to placeholder
        const bounds = activeObj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const PROMPT_BOX_WIDTH = 350;
        const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
        const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
        // FIX: Pass center X directly - CSS translateX(-50%) handles centering
        setAIChatPosition({
          x: selectedCenterX,
          y: selectedBottomY + 24
        });
        
        // Auto-zoom to show element and prompt box
        focusOnElementWithPrompt(activeObj, canvas);
      } else if ((activeObj as any)?.isArtboard) {
        setSelectedArtboard(activeObj);
        setSelectedObject(null);
        if (onArtboardSelected) onArtboardSelected((activeObj as any).artboardId);
        if (onObjectSelected) onObjectSelected(null);
        if (onShowColorPanel) onShowColorPanel(false);

        // If in edit mode, open the edit chat
        if (activeTool === 'edit' && onArtboardEditRequest) {
          const artboardId = (activeObj as any).artboardId;
          if (artboardId) {
            // Calculate screen position
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = vpt[0];
            const left = (activeObj.left || 0) * zoom + vpt[4];
            const top = (activeObj.top || 0) * zoom + vpt[5];
            const width = (activeObj.width || 0) * zoom;
            onArtboardEditRequest(artboardId, {
              x: left + width + 20,
              y: top
            });
          }
        }
      } else if (!(activeObj as any)?.isTitle) {
        // Handle both single objects and ActiveSelection (multiple objects)
        setSelectedObject(activeObj);
        setSelectedArtboard(null);
        if (onArtboardSelected) onArtboardSelected(null);
        if (onObjectSelected) onObjectSelected(activeObj);
        // Only show color panel for shapes and text when single selection (not for images or multiple)
        const isMultipleSelection = activeObj?.type === 'activeselection';
        if (!isMultipleSelection && onShowColorPanel && activeObj?.type !== 'image' && activeObj?.type !== 'Image') {
          onShowColorPanel(true);
        } else if (onShowColorPanel) {
          onShowColorPanel(false);
        }
      }
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setSelectedArtboard(null);
      setShowChatButton(false);
      if (!placeholderMode) {
        setPlaceholderObject(null);
        setChatSelectedObjects([]);
      }
      if (onArtboardSelected) onArtboardSelected(null);
      if (onObjectSelected) onObjectSelected(null);
      if (onShowColorPanel) onShowColorPanel(false);
      if (onMultiSelectChange) onMultiSelectChange(0, null);
      
      // FrameContainer is now a passive Rect — no group interaction needed.
      
      canvas.requestRenderAll();
    });

    // Frame reparenting is handled by installFrameReparenting (see cleanup below)
    const cleanupReparenting = installFrameReparenting(canvas);

    // Throttled AI chat position update during drag
    let chatRafId = 0;
    const throttledChatUpdate = () => {
      if (chatRafId) return;
      chatRafId = requestAnimationFrame(() => {
        chatRafId = 0;
        updateAIChatPositionFromSelection();
      });
    };
    canvas.on('object:moving', throttledChatUpdate);
    canvas.on('object:scaling', throttledChatUpdate);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        canvas.setWidth(containerRef.current.offsetWidth);
        canvas.setHeight(containerRef.current.offsetHeight);
        canvas.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Auto-save viewport on pan/zoom changes (only on actual user interaction)
    let viewportSaveTimeout: NodeJS.Timeout;
    let isPanningForSave = false;

    // Save on mouse wheel (zoom) and update overlay + AI chat positions
    canvas.on('mouse:wheel', () => {
      if (onViewportChange && !isLoadingViewport.current) {
        clearTimeout(viewportSaveTimeout);
        viewportSaveTimeout = setTimeout(() => {
          onViewportChange();
        }, 1000);
      }
      // Update overlay position after zoom
      updateOverlayPosition();
      // FIX #6: Update AI chat position during zoom
      updateAIChatPositionFromSelection();
    });

    // === Image fill mask-adjust mode (Alt + drag) ===
    let maskAdjustActive = false;
    let maskAdjustStartX = 0;
    let maskAdjustStartY = 0;
    let maskAdjustObj: any = null;
    let maskAdjustInitTx = 0;
    let maskAdjustInitTy = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e as MouseEvent;
      if (!evt.altKey) return;
      const activeObj = canvas.getActiveObject();
      if (!activeObj) return;
      const fill = activeObj.fill;
      // Check if fill is a Pattern (has 'source' property)
      if (fill && typeof fill === 'object' && 'source' in fill) {
        maskAdjustActive = true;
        maskAdjustObj = activeObj;
        maskAdjustStartX = evt.clientX;
        maskAdjustStartY = evt.clientY;
        // Read existing patternTransform translation
        const pt = (fill as any).patternTransform;
        maskAdjustInitTx = pt ? pt[4] : 0;
        maskAdjustInitTy = pt ? pt[5] : 0;
        // Prevent object from moving
        activeObj.set('lockMovementX', true);
        activeObj.set('lockMovementY', true);
        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (!maskAdjustActive || !maskAdjustObj) return;
      const evt = opt.e as MouseEvent;
      const zoom = canvas.getZoom();
      const dx = (evt.clientX - maskAdjustStartX) / zoom;
      const dy = (evt.clientY - maskAdjustStartY) / zoom;
      const fill = maskAdjustObj.fill;
      if (fill && typeof fill === 'object') {
        // Update pattern position via patternTransform matrix [scaleX, 0, 0, scaleY, tx, ty]
        const existing = (fill as any).patternTransform || [1, 0, 0, 1, 0, 0];
        (fill as any).patternTransform = [existing[0], existing[1], existing[2], existing[3], maskAdjustInitTx + dx, maskAdjustInitTy + dy];
        maskAdjustObj.set('dirty', true);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (maskAdjustActive && maskAdjustObj) {
        // Unlock object movement
        maskAdjustObj.set('lockMovementX', false);
        maskAdjustObj.set('lockMovementY', false);
        maskAdjustActive = false;
        maskAdjustObj = null;
      }
    });

    canvas.on('mouse:down', (e) => {
      const evt = e.e as any;
      if (evt.altKey || evt.button === 1 || activeToolRef.current === 'hand') {
        isPanningForSave = true;
      }
    });

    // Save on pan end and update overlay + AI chat positions
    canvas.on('mouse:up', () => {
      if (isPanningForSave && onViewportChange && !isLoadingViewport.current) {
        clearTimeout(viewportSaveTimeout);
        viewportSaveTimeout = setTimeout(() => {
          onViewportChange();
        }, 1000);
        isPanningForSave = false;
      }
      // Update overlay position after panning
      updateOverlayPosition();
      // FIX #6: Update AI chat position after panning
      updateAIChatPositionFromSelection();
    });
    
    // Signal that canvas is ready for save system
    console.log('✅ Canvas initialization complete, setting isCanvasReady=true');
    setIsCanvasReady(true);
    
    // BUG FIX #11: Add drag & drop support for images
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || !canvas) return;
      
      const pointer = canvas.getPointer(e);
      
      for (const file of Array.from(files)) {
        // Handle SVG files as vector objects (not raster)
        if (file.type === 'image/svg+xml') {
          const text = await file.text();
          try {
            const { loadSVGFromString } = await import('fabric');
            const result = await loadSVGFromString(text);
            if (!result || !result.objects || result.objects.length === 0) {
              console.error('SVG parse returned empty result');
              toast.error('Failed to parse SVG');
              continue;
            }
            const group = new Group(result.objects.filter(Boolean), {
              left: pointer.x - 50,
              top: pointer.y - 50,
              selectable: true,
              hasControls: true,
            });
            (group as any).isSvgIcon = true;
            (group as any).isStandaloneObject = true;
            (group as any).canvasObjectId = `svg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            (group as any).svgPathCount = result.objects.filter(Boolean).length;
            (group as any).svgSource = text;
            canvas.add(group);
            canvas.setActiveObject(group);
            canvas.requestRenderAll();
            toast.success('SVG added to canvas');
          } catch (err) {
            console.error('SVG import failed:', err);
            toast.error('Failed to import SVG');
          }
          continue;
        }
        
        // Handle image files
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const imgUrl = evt.target?.result as string;
            FabricImage.fromURL(imgUrl).then((img) => {
              if (!img) return;
              img.set({
                left: pointer.x - 100,
                top: pointer.y - 100,
                scaleX: 0.5,
                scaleY: 0.5,
                selectable: true,
                hasControls: true,
              });
              (img as any).isStandaloneObject = true;
              (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
              toast.success('Image added to canvas');
            });
          };
          reader.readAsDataURL(file);
        }
        
        // Handle video files
        if (file.type.startsWith('video/')) {
          try {
            // Get current user ID for storage path (required by RLS policy)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              toast.error('Please sign in to upload videos');
              continue;
            }
            
            // IMMEDIATELY show placeholder at drop position for instant feedback
            const placeholderId = `video-upload-${Date.now()}`;
            const placeholderWidth = 400;
            const placeholderHeight = 225; // 16:9 aspect ratio
            
            // Calculate screen position for the overlay
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const screenX = pointer.x * vpt[0] + vpt[4];
            const screenY = pointer.y * vpt[3] + vpt[5];
            
            // Show progress overlay immediately
            setVideoUploadProgress({
              visible: true,
              progress: 0,
              position: { x: screenX, y: screenY }
            });
            
            const placeholderRect = new Rect({
              left: pointer.x - placeholderWidth / 2,
              top: pointer.y - placeholderHeight / 2,
              width: placeholderWidth,
              height: placeholderHeight,
              fill: 'transparent',
              stroke: 'transparent',
              strokeWidth: 0,
              rx: 8,
              ry: 8,
              selectable: false,
              evented: false,
            });
            
            (placeholderRect as any).isVideoUploadPlaceholder = true;
            (placeholderRect as any).placeholderId = placeholderId;
            canvas.add(placeholderRect);
            canvas.requestRenderAll();
            
            // Upload video to Supabase storage with progress tracking
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.id}/canvas-videos/${fileName}`;
            
            // Use XMLHttpRequest for upload progress
            const { data: { session } } = await supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            
            const uploadPromise = new Promise<{ path: string } | null>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              
              xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                  const percent = Math.round((e.loaded / e.total) * 100);
                  setVideoUploadProgress(prev => ({ ...prev, progress: percent }));
                }
              });
              
              xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve({ path: filePath });
                } else {
                  reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
              });
              
              xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
              });
              
              xhr.open('POST', `${supabaseUrl}/storage/v1/object/design-assets/${filePath}`);
              xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);
              xhr.setRequestHeader('Content-Type', file.type);
              xhr.setRequestHeader('x-upsert', 'false');
              xhr.send(file);
            });
            
            let uploadData: { path: string } | null = null;
            try {
              uploadData = await uploadPromise;
            } catch (uploadError: any) {
              // Remove placeholder on error
              const placeholderToRemove = canvas.getObjects().find(
                (o: any) => o.placeholderId === placeholderId
              );
              if (placeholderToRemove) canvas.remove(placeholderToRemove);
              canvas.requestRenderAll();
              setVideoUploadProgress({ visible: false, progress: 0, position: { x: 0, y: 0 } });
              toast.error(`Failed to upload video: ${uploadError.message}`, { id: 'video-upload' });
              continue;
            }
            
            if (!uploadData) {
              setVideoUploadProgress({ visible: false, progress: 0, position: { x: 0, y: 0 } });
              continue;
            }
            
            // Get signed URL
            const { data: urlData, error: urlError } = await supabase
              .storage
              .from('design-assets')
              .createSignedUrl(uploadData.path, 86400); // 24 hours
            
            if (urlError || !urlData?.signedUrl) {
              // Remove placeholder on error
              const placeholderToRemove = canvas.getObjects().find(
                (o: any) => o.placeholderId === placeholderId
              );
              if (placeholderToRemove) canvas.remove(placeholderToRemove);
              canvas.requestRenderAll();
              setVideoUploadProgress({ visible: false, progress: 0, position: { x: 0, y: 0 } });
              toast.error('Failed to get video URL', { id: 'video-upload' });
              continue;
            }
            
            // Create video element to get dimensions and first frame
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = urlData.signedUrl;
            video.muted = true;
            
            await new Promise<void>((resolve) => {
              video.onloadedmetadata = () => {
                video.currentTime = 0;
                resolve();
              };
              video.onerror = () => resolve();
            });
            
            // Wait for first frame
            await new Promise<void>((resolve) => {
              video.onseeked = () => resolve();
              video.onerror = () => resolve();
              setTimeout(resolve, 1000);
            });
            
            // Capture first frame as poster
            const posterCanvas = document.createElement('canvas');
            posterCanvas.width = video.videoWidth || 640;
            posterCanvas.height = video.videoHeight || 360;
            const ctx = posterCanvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, posterCanvas.width, posterCanvas.height);
            const posterUrl = posterCanvas.toDataURL('image/jpeg', 0.8);
            
            // Get video duration
            const duration = video.duration || 0;
            
            // Create fabric image from poster frame
            const img = await FabricImage.fromURL(posterUrl);
            if (!img) {
              // Remove placeholder if image creation fails
              const placeholderToRemove = canvas.getObjects().find(
                (o: any) => o.placeholderId === placeholderId
              );
              if (placeholderToRemove) canvas.remove(placeholderToRemove);
              canvas.requestRenderAll();
              setVideoUploadProgress({ visible: false, progress: 0, position: { x: 0, y: 0 } });
              continue;
            }
            
            // Scale to reasonable size
            const maxWidth = 400;
            const maxHeight = 300;
            const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1), 1);
            
            // Remove placeholder and add video at same position
            const placeholderToRemove = canvas.getObjects().find(
              (o: any) => o.placeholderId === placeholderId
            );
            if (placeholderToRemove) {
              canvas.remove(placeholderToRemove);
            }
            
            // Hide progress overlay
            setVideoUploadProgress({ visible: false, progress: 0, position: { x: 0, y: 0 } });
            
            img.set({
              left: pointer.x - (img.width || 200) * scale / 2,
              top: pointer.y - (img.height || 150) * scale / 2,
              scaleX: scale,
              scaleY: scale,
              selectable: true,
              hasControls: true,
            });
            
            // Mark as video object with persistence data
            (img as any).isVideo = true;
            (img as any).videoUrl = urlData.signedUrl;
            (img as any).videoFilePath = uploadData.path; // CRITICAL: For persistence on reload
            (img as any).videoDuration = duration;
            (img as any).isStandaloneObject = true;
            (img as any).canvasObjectId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // CRITICAL: Block auto-save from overwriting the video for 1 second
            (img as any)._skipAutoSave = Date.now() + 1000;
            
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            toast.success('Video added to canvas', { id: 'video-upload' });
            
          } catch (err) {
            console.error('Error handling video drop:', err);
            toast.error('Failed to add video', { id: 'video-upload' });
          }
        }
      }
    };
    
    // BUG FIX #12: Add paste support for images
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !canvas) return;
      
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (evt) => {
              const imgUrl = evt.target?.result as string;
              FabricImage.fromURL(imgUrl).then((img) => {
                if (!img) return;
                // Place at viewport center
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                const centerX = (canvas.width! / 2 - vpt[4]) / vpt[0];
                const centerY = (canvas.height! / 2 - vpt[5]) / vpt[3];
                
                img.set({
                  left: centerX - (img.width || 100) * 0.25,
                  top: centerY - (img.height || 100) * 0.25,
                  scaleX: 0.5,
                  scaleY: 0.5,
                  selectable: true,
                  hasControls: true,
                });
                (img as any).isStandaloneObject = true;
                (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.requestRenderAll();
                toast.success('Image pasted to canvas');
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    
    // Attach drag & drop handlers to container
    const container = containerRef.current;
    if (container) {
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
    }
    
    // Attach paste handler to window
    window.addEventListener('paste', handlePaste);
    
    return () => {
      cleanupReparenting();
      cleanupFunctionsRef.current.forEach(fn => fn());
      cleanupFunctionsRef.current = [];
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      if (container) {
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
      }
      canvas.dispose();
    };
  }, []);

  // Pin mode click handler - detects clicks on images and calculates normalized coordinates
  // BUG FIX #13: Custom pin cursor only on images, no toast
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isPinMode) return;
    
    // Custom pin cursor SVG (blue location pin)
    const PIN_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='32' viewBox='0 0 24 32'><path d='M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z' fill='%233b82f6'/><circle cx='12' cy='12' r='4' fill='white'/></svg>") 12 32, auto`;
    
    // Default cursor for non-image areas
    canvas.defaultCursor = 'default';
    
    // Handle mouse over to show pin cursor only on images
    const handleMouseOver = (e: any) => {
      if (e.target?.type === 'image') {
        canvas.hoverCursor = PIN_CURSOR;
      } else {
        canvas.hoverCursor = 'default';
      }
    };
    
    const handleMouseOut = () => {
      canvas.hoverCursor = 'default';
    };
    
    const handlePinClick = (opt: any) => {
      const target = opt.target;
      
      // Must click on an image - silently ignore non-image clicks (no toast)
      if (!target || target.type !== 'image') {
        return;
      }
      
      // Get click position relative to image (normalized 0-1)
      const pointer = canvas.getPointer(opt.e);
      const imageLeft = target.left || 0;
      const imageTop = target.top || 0;
      const imageWidth = (target.width || 100) * (target.scaleX || 1);
      const imageHeight = (target.height || 100) * (target.scaleY || 1);
      
      const normalizedX = Math.max(0, Math.min(1, (pointer.x - imageLeft) / imageWidth));
      const normalizedY = Math.max(0, Math.min(1, (pointer.y - imageTop) / imageHeight));
      
      // Create crop around click point (128x128px from original image for better identification)
      const cropSize = 128;
      const halfCrop = cropSize / 2;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropSize;
      cropCanvas.height = cropSize;
      const ctx = cropCanvas.getContext('2d');
      
      if (ctx && target._originalElement) {
        const imgEl = target._originalElement;
        const srcX = normalizedX * imgEl.naturalWidth - halfCrop;
        const srcY = normalizedY * imgEl.naturalHeight - halfCrop;
        
        try {
          ctx.drawImage(
            imgEl,
            Math.max(0, srcX), Math.max(0, srcY),
            cropSize, cropSize,
            0, 0,
            cropSize, cropSize
          );
        } catch (e) {
          ctx.fillStyle = '#888';
          ctx.fillRect(0, 0, cropSize, cropSize);
        }
      } else {
        if (ctx) {
          ctx.fillStyle = '#888';
          ctx.fillRect(0, 0, cropSize, cropSize);
        }
      }
      
      const cropDataUrl = cropCanvas.toDataURL('image/jpeg', 0.7);
      const objectId = target.id || target.object_id || target.canvasObjectId || `img_${Date.now()}`;
      
      console.log('📍 Pin placed at:', { normalizedX, normalizedY, objectId });
      
      onPinPlaced?.(objectId, normalizedX, normalizedY, cropDataUrl);
    };
    
    canvas.on('mouse:over', handleMouseOver);
    canvas.on('mouse:out', handleMouseOut);
    canvas.on('mouse:down', handlePinClick);
    
    return () => {
      canvas.off('mouse:over', handleMouseOver);
      canvas.off('mouse:out', handleMouseOut);
      canvas.off('mouse:down', handlePinClick);
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
    };
  }, [isPinMode, onPinPlaced]);

  // Add/remove artboards
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    setIsLoadingArtboards(true);
    const currentIds = new Set(artboards.map(ab => ab.id));

    // Clean up orphaned artboard objects
    const orphanedObjects = canvas.getObjects().filter(obj => {
      const isArtboardRelated = (obj as any).isArtboard || (obj as any).isTitle;
      if (!isArtboardRelated) return false;
      
      const artboardId = (obj as any).artboardId;
      return !currentIds.has(artboardId);
    });

    if (orphanedObjects.length > 0) {
      console.log('🧹 Removing', orphanedObjects.length, 'orphaned artboard objects');
      orphanedObjects.forEach(obj => canvas.remove(obj));
    }

    // Remove deleted artboards
    loadedArtboardsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        canvas.getObjects().forEach(obj => {
          if ((obj as any).artboardId === id) {
            canvas.remove(obj);
          }
        });
        loadedArtboardsRef.current.delete(id);
      }
    });

    // Add new artboards or show loading states
    console.log(`🎨 [CANVAS UPDATE] Processing ${artboards.length} artboards`);
    (async () => {
      for (const artboard of artboards) {
        console.log(`🔍 [ARTBOARD ${artboard.id}] Checking if already loaded...`);
        if (loadedArtboardsRef.current.has(artboard.id)) {
          // Update existing artboard if image changed
          if (artboard.image_url) {
            const group = canvas.getObjects().find(obj => (obj as any).artboardId === artboard.id && (obj as any).isArtboard);
            if (group) {
              // Update the image in the group
              const existingObjects = (group as any)._objects || [];
              if (existingObjects.length > 1) {
                // Remove old image
                (group as any).remove(existingObjects[1]);
              }

              // Add new image
              try {
                const img = await FabricImage.fromURL(artboard.image_url, {
                  crossOrigin: 'anonymous'
                });
                img.set({
                  left: 0,
                  top: 0,
                  scaleX: artboard.width / (img.width || 1),
                  scaleY: artboard.height / (img.height || 1)
                });
                (group as any).add(img);
                group.setCoords();
                group.dirty = true;
                canvas.renderAll();
              } catch (error) {
                console.error('Error updating image:', error);
              }
            }
          }
          continue;
        }

        console.log(`✨ [NEW ARTBOARD ${artboard.id}] Starting to add to canvas...`);

        // Load image FIRST to get actual dimensions
        let artboardImage: FabricImage | null = null;
        let imageLoadError = false;
        let actualWidth = 1024; // Default fallback
        let actualHeight = 1024; // Default fallback
        
        if (artboard.image_url) {
          try {
            console.log(`🖼️ [ADD TO CANVAS] Loading image for artboard ${artboard.id}...`);
            console.log(`📍 Image URL: ${artboard.image_url.substring(0, 100)}...`);
            
            const loadPromise = FabricImage.fromURL(artboard.image_url, {
              crossOrigin: 'anonymous'
            });
            
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Image load timeout')), 10000)
            );
            
            artboardImage = await Promise.race([loadPromise, timeoutPromise]);
            
            // CRITICAL FIX: Use ONLY actual image dimensions
            if (artboardImage) {
              actualWidth = artboardImage.width || 1024;
              actualHeight = artboardImage.height || 1024;
              
              // Scale down if too large (max 1500px on either dimension)
              const maxDim = 1500;
              if (actualWidth > maxDim || actualHeight > maxDim) {
                const scale = Math.min(maxDim / actualWidth, maxDim / actualHeight);
                actualWidth = Math.floor(actualWidth * scale);
                actualHeight = Math.floor(actualHeight * scale);
                artboardImage.scaleToWidth(actualWidth);
                artboardImage.scaleToHeight(actualHeight);
              }
            }
            
            console.log(`✅ Image loaded: ${actualWidth}x${actualHeight} for ${artboard.id}`);
          } catch (error) {
            console.error(`❌ Failed to load image for artboard ${artboard.id}:`, error);
            imageLoadError = true;
            actualWidth = 800;
            actualHeight = 600;
          }
        } else {
          // No image URL, use database dimensions or defaults
          actualWidth = artboard.width || 800;
          actualHeight = artboard.height || 600;
        }
        
        console.log('Rendering new artboard:', artboard.id, 'at position:', artboard.position_x, artboard.position_y, 'size:', actualWidth, actualHeight);

        // Create FrameContainer (passive Rect — no children)
        const group = new FrameContainer({
          id: artboard.id,
          title: artboard.title,
          width: actualWidth,
          height: actualHeight,
          left: artboard.position_x,
          top: artboard.position_y,
        });

        canvas.add(group);
        group.setCoords();

        // Add artboard image as separate top-level non-interactive object
        if (artboardImage && !imageLoadError) {
          artboardImage.set({
            left: artboard.position_x, top: artboard.position_y,
            originX: 'left', originY: 'top',
            scaleX: actualWidth / (artboardImage.width || 1),
            scaleY: actualHeight / (artboardImage.height || 1),
            selectable: false, evented: false,
          });
          (artboardImage as any).isArtboardImage = true;
          (artboardImage as any).artboardId = artboard.id;
          canvas.add(artboardImage);
          // Layer image just above frame, both at back
          canvas.sendObjectToBack(artboardImage);
        }

        // Send frame to back so it doesn't block selection of top-level objects
        canvas.sendObjectToBack(group);

        canvas.requestRenderAll();

        // Debounced position save
        let moveTimeout: any = null;
        group.on('modified', () => {
          if (moveTimeout) clearTimeout(moveTimeout);
          moveTimeout = setTimeout(() => {
            if (onArtboardUpdate) {
              onArtboardUpdate(artboard.id, {
                position_x: group.left || 0,
                position_y: group.top || 0,
                width: group.width || artboard.width,
                height: group.height || artboard.height,
              });
            }
          }, 1000);
        });

        loadedArtboardsRef.current.add(artboard.id);
        canvas.renderAll();
      }
      
      // Mark initial load as complete
      if (!isInitialLoadCompleteRef.current && artboards.length > 0) {
        isInitialLoadCompleteRef.current = true;
        console.log('✅ Initial artboard load complete');
        // Reparent synchronously — no setTimeout race conditions
        if (canvas) reparentObjectsIntoFrames(canvas);
      }
      setIsLoadingArtboards(false);
    })();
  }, [artboards, onArtboardUpdate, onLayersChange]);

  // Load canvas objects (elements outside artboards)
  useEffect(() => {
    console.log('🎨 Canvas objects useEffect triggered. canvasObjects:', canvasObjects?.length || 0);
    const canvas = fabricCanvasRef.current;
    console.log('🎨 Canvas ready?', !!canvas);
    
    if (!canvas || !canvasObjects) {
      console.log('❌ Skipping load - canvas or canvasObjects missing');
      return;
    }

    // Object removal logic removed - objects are only deleted via explicit user action
    // This prevents race conditions where partial loads would wipe the canvas
    console.log('🧹 Loading canvas objects without automatic removal');

    if (canvasObjects.length === 0) {
      console.log('📥 No canvas objects to load (empty state)');
      // CRITICAL: Set ref to true even for empty state!
      if (!isInitialLoadCompleteRef.current) {
        isInitialLoadCompleteRef.current = true;
        console.log('✅ Initial load complete (empty canvas)');
      }
      // Don't clear canvas - keep any existing objects
      return;
    }

    console.log('📥 Loading', canvasObjects.length, 'canvas objects from database');

    // Get existing object IDs to prevent duplicates
    // Build set that includes BOTH canvasObjectId and databaseUUID from existing objects
    // Build dedup set from BOTH standalone objects AND children inside frames
    const frameChildIds = getFrameChildIds(canvas);
    const existingIds = new Set([
      ...frameChildIds,
      ...canvas.getObjects()
        .filter((obj: any) => obj.isStandaloneObject)
        .flatMap((obj: any) => [obj.canvasObjectId, obj.databaseUUID].filter(Boolean))
    ]);

    (async () => {
      // CRITICAL: Block saves during entire load sequence
      isLoadingFromDatabase.current = true;
      console.log('🔒 Loading objects - saves BLOCKED');
      
      let loadedCount = 0;
      
      // PERFORMANCE FIX: Pre-fetch all signed URLs in parallel before loading
      const objectsToLoad = canvasObjects.filter(obj => {
        // Skip if either identifier already exists
        if (existingIds.has(obj.id) || existingIds.has(obj.object_id)) {
          return false;
        }
        
        // Skip orphan placeholders
        const objData = obj.object_data;
        const isOrphanPlaceholder = (
          (obj.object_type === 'rect' && 
           (objData?.fill === '#3B82F6' || !objData?.fill) && 
           (objData?.width === 100 || !objData?.width) && 
           (objData?.height === 100 || !objData?.height)) ||
          (obj.object_type === 'rect' && objData?.fill === '#f3f4f6' && objData?.width === 400) ||
          (obj.object_type === 'rect' && objData?.fill === '#374151') ||
          objData?.fill === '#E8F0FE' || objData?.fill === '#E8F4FD' ||
          (obj.object_type === 'group' && obj.object_id?.includes('placeholder'))
        );
        return !isOrphanPlaceholder;
      });
      
      console.log(`🚀 Loading ${objectsToLoad.length} objects (filtered from ${canvasObjects.length})`);
      
      // PERFORMANCE: Generate ALL signed URLs in parallel using Promise.allSettled
      const refreshedUrls = new Map<string, string>();
      
      // Pre-filter objects that need URL refresh
      const objectsNeedingUrls = objectsToLoad.filter(obj => 
        obj.file_path || obj.object_data?.videoFilePath
      );
      
      // Process ALL URLs at once for maximum parallelism (no batching)
      const urlPromises = objectsNeedingUrls.map(async (obj) => {
        const filePath = obj.file_path || obj.object_data?.videoFilePath;
        try {
          const { data } = await supabase.storage
            .from('design-assets')
            .createSignedUrl(filePath, 86400);
          return { objectId: obj.object_id, url: data?.signedUrl || null };
        } catch (e) {
          console.warn('Failed to refresh URL for', obj.object_id);
          return { objectId: obj.object_id, url: null };
        }
      });
      
      const results = await Promise.allSettled(urlPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.url) {
          refreshedUrls.set(result.value.objectId, result.value.url);
        }
      });
      
      console.log(`✅ Pre-fetched ${refreshedUrls.size} signed URLs`);
      
      for (const obj of objectsToLoad) {
        const objData = obj.object_data;
        
        try {
          let fabricObj;

          console.log('Loading object type:', obj.object_type, 'at', obj.position_x, obj.position_y);

          if (obj.object_type === 'image') {
            // Use pre-fetched URL if available, otherwise fall back to existing
            const activeUrl = refreshedUrls.get(obj.object_id) || obj.image_url || objData?.src;
            
            if (!activeUrl && !obj.file_path) {
              console.warn('⚠️ Image has no URL or file_path, skipping:', obj.object_id);
              continue;
            }
            
            try {
              // Use pre-fetched URL - no additional network call needed
              const urlToUse = refreshedUrls.get(obj.object_id) || activeUrl;
              
              fabricObj = await FabricImage.fromURL(urlToUse, {
                crossOrigin: 'anonymous'
              });
              
              fabricObj.set({
                left: obj.position_x,
                top: obj.position_y,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                angle: objData?.angle || 0,
                opacity: objData?.opacity !== undefined ? objData.opacity : 1,
                // CRITICAL: must be the stable object_id, not the DB row UUID
                canvasObjectId: obj.object_id,
                databaseUUID: obj.id,
                object_id: obj.object_id,
                isStandaloneObject: true,
                canvasFilePath: obj.file_path
              });

              console.log('✅ Image loaded successfully');
            } catch (loadError) {
              console.error('❌ Failed to load image:', loadError, 'object_id:', obj.object_id);
              // DO NOT create placeholder rect - just skip this object
              // Database record stays intact for retry on refresh
              continue;
            }
          } else if (obj.object_type === 'text' || obj.object_type === 'i-text' || obj.object_type === 'textbox') {
            // Preload custom compiled font (if any) before constructing the text layer
            const fontMeta = objData?.fontMetadata;
            if (fontMeta?.customCompiledFont && fontMeta?.familyName) {
              try {
                const { ensureCustomFont } = await import('@/lib/canvas/customFontRegistry');
                await ensureCustomFont({
                  familyName: fontMeta.familyName,
                  fontDataBase64: fontMeta.fontDataBase64,
                  fontUrl: fontMeta.fontUrl,
                  fontMime: fontMeta.fontMime,
                });
              } catch (e) {
                console.warn('Failed to preload custom font for text layer', e);
              }
            }
            // Use Textbox for editable wrapped text (matches what FontGeneratorPanel inserts)
            if (obj.object_type === 'textbox') {
              const { Textbox } = await import('fabric');
              fabricObj = new Textbox(objData?.text || 'Text', {
                left: obj.position_x,
                top: obj.position_y,
                width: objData?.width || 300,
                fontSize: objData?.fontSize || 24,
                fill: objData?.fill || '#000000',
                fontFamily: objData?.fontFamily || 'system-ui',
                fontWeight: objData?.fontWeight || 'normal',
                fontStyle: objData?.fontStyle || 'normal',
                textAlign: objData?.textAlign || 'left',
                angle: objData?.angle || 0,
                opacity: objData?.opacity !== undefined ? objData.opacity : 1,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                editable: true,
              });
            } else {
              fabricObj = new IText(objData?.text || 'Text', {
                left: obj.position_x,
                top: obj.position_y,
                fontSize: objData?.fontSize || 24,
                fill: objData?.fill || '#000000',
                fontFamily: objData?.fontFamily || 'system-ui',
                fontWeight: objData?.fontWeight || 'normal',
                fontStyle: objData?.fontStyle || 'normal',
                textAlign: objData?.textAlign || 'left',
                angle: objData?.angle || 0,
                opacity: objData?.opacity !== undefined ? objData.opacity : 1,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
              });
            }
            if (fontMeta) (fabricObj as any).fontMetadata = fontMeta;
          } else if (obj.object_type === 'rect') {
            fabricObj = new Rect({
              left: obj.position_x,
              top: obj.position_y,
              width: objData?.width || 100,
              height: objData?.height || 100,
              fill: objData?.fill || '#3B82F6',
              stroke: objData?.stroke,
              strokeWidth: objData?.strokeWidth || 0,
              rx: objData?.rx || 0,
              ry: objData?.ry || 0,
              angle: objData?.angle || 0,
              opacity: objData?.opacity !== undefined ? objData.opacity : 1,
              scaleX: objData?.scaleX || 1,
              scaleY: objData?.scaleY || 1,
            });
          } else if (obj.object_type === 'circle') {
            fabricObj = new Circle({
              left: obj.position_x,
              top: obj.position_y,
              radius: objData?.radius || 50,
              fill: objData?.fill || '#EC4899',
              stroke: objData?.stroke,
              strokeWidth: objData?.strokeWidth || 0,
              angle: objData?.angle || 0,
              opacity: objData?.opacity !== undefined ? objData.opacity : 1,
              scaleX: objData?.scaleX || 1,
              scaleY: objData?.scaleY || 1,
            });
          } else if (obj.object_type === 'video') {
            // Load video object - display poster image with video metadata attached
            const rawVideoFilePath = objData?.videoFilePath || obj.file_path;
            
            // Validate that file path is actually a video (not JPEG from corruption)
            const isValidVideoPath = rawVideoFilePath && 
              (rawVideoFilePath.endsWith('.mp4') || rawVideoFilePath.endsWith('.webm') || rawVideoFilePath.endsWith('.mov'));
            const effectiveVideoFilePath = isValidVideoPath ? rawVideoFilePath : null;
            
            // Get video URL (refreshed or stored)
            const videoUrl = effectiveVideoFilePath 
              ? (refreshedUrls.get(obj.object_id) || objData?.videoUrl)
              : objData?.videoUrl;
            
            if (!videoUrl) {
              console.warn('⚠️ Video has no valid URL, skipping:', obj.object_id);
              continue;
            }
            
            // CRITICAL FIX: Check if we have a REAL poster image (not an MP4 URL)
            let posterSrc = obj.image_url || objData?.posterUrl;
            const isPosterActuallyMp4 = posterSrc && 
              (posterSrc.includes('.mp4') || posterSrc.includes('.webm') || posterSrc.includes('.mov'));
            
            // If poster is missing or is actually an MP4, extract from video on-the-fly
            if (!posterSrc || isPosterActuallyMp4) {
              console.log('🎬 No valid poster found, extracting from video...', obj.object_id);
              try {
                const { extractVideoPoster } = await import('@/lib/videoDownloader');
                posterSrc = await extractVideoPoster(videoUrl);
                console.log('✅ Poster extracted from video successfully');
              } catch (extractError) {
                console.error('❌ Failed to extract poster from video:', extractError);
                continue; // Skip this video - we have no way to display it
              }
            }
            
            try {
              fabricObj = await FabricImage.fromURL(posterSrc, {
                crossOrigin: 'anonymous'
              });
              
              fabricObj.set({
                left: obj.position_x,
                top: obj.position_y,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                angle: objData?.angle || 0,
                opacity: objData?.opacity !== undefined ? objData.opacity : 1,
              });
              
              // Attach video metadata for hover overlay and toolbar
              (fabricObj as any).isVideo = true;
              (fabricObj as any).videoUrl = videoUrl;
              (fabricObj as any).videoDuration = objData?.duration || 4;
              (fabricObj as any).videoFilePath = effectiveVideoFilePath || undefined;
              (fabricObj as any).title = objData?.title || 'Video';
              (fabricObj as any).canvasObjectId = obj.object_id;
              (fabricObj as any).databaseUUID = obj.id;
              (fabricObj as any).isStandaloneObject = true;
              
              console.log('✅ Video object loaded with extracted poster');
            } catch (loadError) {
              console.error('❌ Failed to create video object:', loadError, 'object_id:', obj.object_id);
              continue;
            }
          } else if (obj.object_type === 'group') {
            // Load group objects using Fabric.js deserialization
            try {
              const { util, Group } = await import('fabric');
              const childObjects = objData?.objects || [];
              
              if (childObjects.length === 0) {
                console.warn('⚠️ Empty group, skipping:', obj.object_id);
                continue;
              }
              
              // Deserialize child objects using Fabric's utility
              const enlivenedObjects = await util.enlivenObjects(childObjects);
              
              fabricObj = new Group(enlivenedObjects as any[], {
                left: obj.position_x,
                top: obj.position_y,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                angle: objData?.angle || 0,
                opacity: objData?.opacity ?? 1,
              });
              
              // Restore SVG animation properties from saved data
              (fabricObj as any).isSvgIcon = objData?.isSvgIcon || false;
              (fabricObj as any).svgSource = objData?.svgSource || null;
              (fabricObj as any).svgPathCount = objData?.svgPathCount || 0;
              
              console.log('✅ Group loaded with', enlivenedObjects.length, 'children', objData?.isSvgIcon ? '(SVG icon)' : '');
            } catch (err) {
              console.error('❌ Failed to load group:', err, 'object_id:', obj.object_id);
              continue;
            }
          } else if (obj.object_type === 'path') {
            // Load path objects using FabricPath
            try {
              const { Path: FabricPath } = await import('fabric');
              fabricObj = new FabricPath(objData?.path || objData?.pathData || [], {
                left: obj.position_x,
                top: obj.position_y,
                fill: objData?.fill || null,
                stroke: objData?.stroke || '#000000',
                strokeWidth: objData?.strokeWidth || 1,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                angle: objData?.angle || 0,
                opacity: objData?.opacity ?? 1,
                objectCaching: false,
                strokeUniform: true,
              });
              // Restore penToolData for double-click re-editing
              if (objData?.penToolData) {
                (fabricObj as any).penToolData = objData.penToolData;
              }
              console.log('✅ Path loaded:', obj.object_id, objData?.penToolData ? '(with penToolData)' : '');
            } catch (err) {
              console.error('❌ Failed to load path:', err, 'object_id:', obj.object_id);
              continue;
            }
          } else if (obj.object_type === 'polygon') {
            // Load polygon objects
            try {
              const { Polygon } = await import('fabric');
              fabricObj = new Polygon(objData?.points || [], {
                left: obj.position_x,
                top: obj.position_y,
                fill: objData?.fill || '#000000',
                stroke: objData?.stroke,
                strokeWidth: objData?.strokeWidth || 0,
                scaleX: objData?.scaleX || 1,
                scaleY: objData?.scaleY || 1,
                angle: objData?.angle || 0,
                opacity: objData?.opacity ?? 1,
              });
              console.log('✅ Polygon loaded:', obj.object_id);
            } catch (err) {
              console.error('❌ Failed to load polygon:', err, 'object_id:', obj.object_id);
              continue;
            }
          } else {
            console.warn('⚠️ Unknown object type:', obj.object_type, 'skipping:', obj.object_id);
            continue;
          }

          if (fabricObj) {
            (fabricObj as any).isStandaloneObject = true;
            // CRITICAL: Always use object_id (will no longer be NULL after migration)
            (fabricObj as any).canvasObjectId = obj.object_id;
            (fabricObj as any).databaseUUID = obj.id; // Store UUID for fallback matching
            
            // Add validation
            if (!obj.object_id) {
              console.error('❌ CRITICAL: Loaded object missing object_id:', obj);
            }
            
            canvas.add(fabricObj);
            loadedCount++;
            console.log('✅ Loaded standalone object:', obj.object_type, 'with ID:', obj.object_id);
          }
        } catch (error) {
          console.error('❌ Error loading canvas object:', error, obj);
        }
      }
      
      canvas.renderAll();
      console.log('✅ Canvas objects loaded:', {
        total: canvasObjects.length,
        loaded: loadedCount,
        skipped: canvasObjects.length - loadedCount,
        sampleIds: canvasObjects.slice(0, 3).map(o => o.object_id)
      });
      
    // Release loading flag
    isLoadingFromDatabase.current = false;
    console.log('🔓 Loading complete - saves ENABLED');

    // Reparent synchronously after all objects are on canvas
    if (canvas) {
      reparentObjectsIntoFrames(canvas);
    }
    })();

    // Mark initial load complete for canvas objects case
    if (!isInitialLoadCompleteRef.current && canvasObjects !== null && canvasObjects !== undefined) {
      isInitialLoadCompleteRef.current = true;
      console.log('✅ Initial canvas objects load complete');
    }
  }, [canvasObjects]);

  // Restore viewport AFTER objects are loaded
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !projectId || !isInitialLoadCompleteRef.current) return;
    
    isLoadingViewport.current = true;
    
    (async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('canvas_data')
          .eq('id', projectId)
          .single();
          
        if (data?.canvas_data && typeof data.canvas_data === 'object' && 'viewport' in data.canvas_data) {
          const viewport = (data.canvas_data as any).viewport;
          if (Array.isArray(viewport) && viewport.length === 6) {
            canvas.setViewportTransform(viewport as [number, number, number, number, number, number]);
            canvas.renderAll();
            console.log('🎯 Viewport restored AFTER objects loaded:', viewport);
          }
        }
      } catch (error) {
        console.log('No saved viewport, using default');
      } finally {
        isLoadingViewport.current = false;
      }
    })();
  }, [projectId]);

  // Save canvas objects when they change - MUST run after canvas is ready
  useEffect(() => {
    console.log('🎯 SAVE SETUP - isCanvasReady:', isCanvasReady, 
                'isLoadingArtboards:', isLoadingArtboards,
                'initialLoadComplete:', isInitialLoadCompleteRef.current);
    
    const canvas = fabricCanvasRef.current;
    
    // Wait for both canvas ready AND initial load complete AND not currently loading
    if (!isCanvasReady || !canvas || !onCanvasObjectsChange || 
        !isInitialLoadCompleteRef.current || isLoadingArtboards || isLoadingFromDatabase.current) {
      console.log('❌ Not ready for save system yet');
      return;
    }

    console.log('✅✅✅ SETTING UP SAVE SYSTEM NOW ✅✅✅');
    console.log('Current objects on canvas:', canvas.getObjects().length);

    const saveCanvasState = () => {
      const allObjects = canvas.getObjects();
      console.log('💾💾💾 SAVE TRIGGERED 💾💾💾');
      console.log('Total objects on canvas:', allObjects.length);
      
      // 🛡️ SAFETY: Don't save if no objects and we're still loading
      if (allObjects.length === 0 && isLoadingFromDatabase.current) {
        console.log('⚠️ Skipping save - canvas is empty during load');
        return;
      }
      
      // Log EVERY object with ALL properties
      allObjects.forEach((obj, i) => {
        console.log(`Object [${i}]:`, {
          type: obj.type,
          left: obj.left,
          top: obj.top,
          isArtboard: !!(obj as any).isArtboard,
          isTitle: !!(obj as any).isTitle,
          group: !!(obj as any).group,
          isStandaloneObject: !!(obj as any).isStandaloneObject,
          visible: obj.visible,
          selectable: obj.selectable,
        });
      });
      
      // FIX: Use collectAllSaveableObjects to include children inside FrameContainers
      const allSaveableObjects = collectAllSaveableObjects(canvas);
      
      const standaloneObjects = allSaveableObjects.filter(obj => {
        // FIX: Respect _skipAutoSave flag for freshly inserted objects (prevents race condition)
        if ((obj as any)._skipAutoSave && Date.now() < (obj as any)._skipAutoSave) {
          console.log('⏭️ InfiniteCanvas: Skipping auto-save for:', (obj as any).canvasObjectId);
          return false;
        }
        
        const isArtboard = (obj as any).isArtboard;
        const isTitle = (obj as any).isTitle;
        const keep = !isArtboard && !isTitle;
        
        return keep;
      });

      console.log(`💾 Saveable objects (including frame children): ${standaloneObjects.length}`);

      const objectsToSave = standaloneObjects.map((obj, index) => {
        // CRITICAL: Generate or preserve stable object ID
        let objectId = (obj as any).canvasObjectId;
        if (!objectId) {
          objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          (obj as any).canvasObjectId = objectId;
        }
        
        let src;
        // FIX: Don't extract src for video posters - they already have proper video paths
        const isVideoObject = !!(obj as any).isVideo || 
          (obj as any).canvasObjectId?.startsWith('video_');
        
        if (obj.type === 'image' && !isVideoObject) {
          // CRITICAL: Try ALL possible ways to get image src (but NOT for videos)
          const imgElement = (obj as any)._element || (obj as any)._originalElement;
          src = (obj as any).getSrc?.() || 
                (obj as any).src ||
                imgElement?.src || 
                imgElement?.currentSrc ||
                imgElement?.getAttribute?.('src') ||
                (obj as any)._originalElement?.src;
          
          console.log(`  🖼️ Image ${index + 1}: src=${src ? 'FOUND' : 'MISSING'} (length: ${src?.length || 0})`);
          
          if (!src) {
            console.error('❌ CRITICAL: Image missing src!', obj);
          }
        } else if (isVideoObject) {
          console.log(`  🎬 Video ${index + 1}: skipping src extraction (using videoFilePath instead)`);
        }

        return {
          object_id: objectId, // ✅ Correct key for database
          type: obj.type,
          object_type: isVideoObject ? 'video' : obj.type, // Mark videos explicitly
          left: obj.left || 0,
          top: obj.top || 0,
          data: {
            // FIX: Don't include src for videos (prevents poster base64 from corrupting save)
            src: isVideoObject ? undefined : src,
            text: (obj as any).text,
            fontSize: (obj as any).fontSize,
            fontFamily: (obj as any).fontFamily,
            fontWeight: (obj as any).fontWeight,
            fontStyle: (obj as any).fontStyle,
            textAlign: (obj as any).textAlign,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            width: obj.width,
            height: obj.height,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            angle: obj.angle,
            opacity: obj.opacity,
            radius: (obj as any).radius,
            // Image persistence
            file_path: (obj as any).canvasFilePath || undefined,
            image_url: (obj as any).imageUrl || undefined,
            // Pen tool data persistence
            penToolData: (obj as any).penToolData || undefined,
            // Save Fabric path data for reload
            pathData: obj.type === 'path' ? (obj as any).path : undefined,
            // Video-specific properties for persistence
            isVideo: isVideoObject,
            videoUrl: (obj as any).videoUrl,
            videoFilePath: (obj as any).videoFilePath,
            videoDuration: (obj as any).videoDuration,
            title: (obj as any).title,
            // SVG animation properties
            isSvgIcon: !!(obj as any).isSvgIcon,
            svgSource: (obj as any).svgSource || '',
            svgPathCount: (obj as any).svgPathCount || 0,
            // Group child objects for deserialization
            objects: obj.type === 'group' ? (obj as any).toObject?.()?.objects : undefined,
          }
        };
      });

      console.log('✅ Calling onCanvasObjectsChange with', objectsToSave.length, 'objects');
      onCanvasObjectsChange(objectsToSave);
    };

    let saveTimeout: any;
    const debouncedSave = (immediate = false) => {
      if (immediate) {
        console.log('💾 INSTANT SAVE at', new Date().toISOString());
        clearTimeout(saveTimeout);
        saveCanvasState();
        return;
      }
      
      console.log('⏰ Scheduling debounced save (100ms)...');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        console.log('⏰ Executing scheduled save at', new Date().toISOString());
        saveCanvasState();
      }, 100); // Reduced to 100ms for modifications
    };

    // Event handlers
    const onModified = (e: any) => {
      console.log('📝 EVENT: object:modified -', e.target?.type);
      // Don't save if we're updating font (prevents duplication)
      if (e.target && (e.target as any)._isUpdatingFont) {
        console.log('⏸️ Skipping save - font update in progress');
        return;
      }
      // Sync penToolData when user changes properties via panel
      if (e.target && (e.target as any).penToolData) {
        const pd = (e.target as any).penToolData;
        if (e.target.strokeWidth != null) pd.strokeWidth = e.target.strokeWidth;
        if (e.target.stroke != null) pd.strokeColor = e.target.stroke;
        if (e.target.fill != null) pd.fillColor = e.target.fill;
      }
      debouncedSave(false); // Use 100ms debounce for modifications
    };
    const onAdded = (e: any) => {
      console.log('📝 EVENT: object:added -', e.target?.type);
      // CRITICAL: Only block saves during loading
      if (!isLoadingFromDatabase.current) {
        console.log('💾 Triggering INSTANT save after object added');
        debouncedSave(true); // INSTANT save (0ms delay)
      } else {
        console.log('⏭️ Skipping save - loading in progress');
      }
    };
    const onRemoved = (e: any) => {
      console.log('📝 EVENT: object:removed -', e.target?.type);
      
      // Get the object's ID and trigger explicit deletion
      const objectId = (e.target as any)?.canvasObjectId 
        || (e.target as any)?.object_id 
        || (e.target as any)?.databaseUUID;
      if (objectId && onCanvasObjectDelete) {
        console.log('🗑️ Triggering explicit delete for:', objectId);
        onCanvasObjectDelete(objectId);
      }
      
      // Still save to update remaining objects
      debouncedSave();
    };

    console.log('🔧 Attaching event listeners...');
    canvas.on('object:modified', onModified);
    canvas.on('object:added', onAdded);
    canvas.on('object:removed', onRemoved);

    // Shift+Rotate snap to 15° increments (registered once, not inside save)
    const onRotating = (e: any) => {
      if (e.e?.shiftKey && e.target) {
        e.target.angle = Math.round(e.target.angle / 15) * 15;
      }
    };
    canvas.on('object:rotating', onRotating);
    console.log('✅ Event listeners attached!');

    // Save on page unload
    const beforeUnload = () => {
      console.log('🚪 Page unloading - final save');
      clearTimeout(saveTimeout);
      saveCanvasState();
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      console.log('🧹 Cleanup - removing listeners ONLY (no save)');
      canvas.off('object:modified', onModified);
      canvas.off('object:added', onAdded);
      canvas.off('object:removed', onRemoved);
      canvas.off('object:rotating', onRotating);
      window.removeEventListener('beforeunload', beforeUnload);
      clearTimeout(saveTimeout);
      // REMOVED: saveCanvasState(); - This was causing premature saves during state transitions!
    };
  }, [isCanvasReady, isLoadingArtboards, onCanvasObjectsChange]);

  // Rule 4: No path regeneration during scaling — Fabric handles it via scaleX/scaleY


  // Edit mode is no longer needed — objects are top-level

  // Convert pen tool paths to Fabric Path objects when switching away from pen tool
  const prevActiveToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
    
    const prevTool = prevActiveToolRef.current;
    prevActiveToolRef.current = activeTool;

    if (prevTool === 'pen' && activeTool !== 'pen') {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const penState = usePenToolStore.getState();
      const { paths, strokeColor, strokeWidth, originalStrokeColor, originalFillColor, clearAll } = penState;

      if (paths.length > 0) {
        (async () => {
          const { Path: FabricPath } = await import('fabric');

          // Group paths by editGroupId — paths sharing a group commit as ONE compound Fabric object
          const groupMap = new Map<string, typeof paths>();
          const ungrouped: typeof paths = [];
          for (const path of paths) {
            if (path.editGroupId) {
              const existing = groupMap.get(path.editGroupId) || [];
              existing.push(path);
              groupMap.set(path.editGroupId, existing);
            } else {
              ungrouped.push(path);
            }
          }

          // Helper: commit a list of paths as one Fabric object (compound path)
          const commitPathGroup = async (pathGroup: typeof paths) => {
            // Compute shared bounding box across all paths in group
            const segsBbox = { minX: Infinity, minY: Infinity };
            for (const path of pathGroup) {
              for (const seg of path.segments) {
                segsBbox.minX = Math.min(segsBbox.minX, seg.anchor.x);
                segsBbox.minY = Math.min(segsBbox.minY, seg.anchor.y);
                if (seg.handleIn) { segsBbox.minX = Math.min(segsBbox.minX, seg.handleIn.x); segsBbox.minY = Math.min(segsBbox.minY, seg.handleIn.y); }
                if (seg.handleOut) { segsBbox.minX = Math.min(segsBbox.minX, seg.handleOut.x); segsBbox.minY = Math.min(segsBbox.minY, seg.handleOut.y); }
              }
            }
            if (!isFinite(segsBbox.minX)) segsBbox.minX = 0;
            if (!isFinite(segsBbox.minY)) segsBbox.minY = 0;

            // Build compound path string — each path becomes a subpath
            const contourData: { segments: any[]; closed: boolean }[] = [];
            let compoundD = '';
            for (const path of pathGroup) {
              const localSegs = path.segments.map((seg: any) => ({
                ...seg,
                anchor: { x: seg.anchor.x - segsBbox.minX, y: seg.anchor.y - segsBbox.minY },
                handleIn: seg.handleIn ? { x: seg.handleIn.x - segsBbox.minX, y: seg.handleIn.y - segsBbox.minY } : null,
                handleOut: seg.handleOut ? { x: seg.handleOut.x - segsBbox.minX, y: seg.handleOut.y - segsBbox.minY } : null,
              }));
              contourData.push({ segments: localSegs, closed: path.closed });
              const subD = generatePathD({ ...path, segments: localSegs });
              if (subD) compoundD += (compoundD ? ' ' : '') + subD;
            }
            if (!compoundD) return;

            const hasVarWidth = pathGroup.some(p => p.segments.some(s => s.width !== undefined));
            const commitStroke = originalStrokeColor || strokeColor;
            const commitFill = originalFillColor || (pathGroup.some(p => p.closed) ? 'rgba(59,130,246,0.1)' : 'transparent');
            const allWidths = pathGroup.flatMap(p => p.segments.map((s: any) => s.width ?? strokeWidth));
            const commitWidth = hasVarWidth ? allWidths.reduce((a: number, b: number) => a + b, 0) / allWidths.length : strokeWidth;

            let fabricPath = new FabricPath(compoundD, {
              fill: commitFill,
              stroke: commitStroke,
              strokeWidth: commitWidth,
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
              selectable: true,
              evented: true,
              objectCaching: false,
              strokeUniform: true,
            });

            fabricPath.set({ left: segsBbox.minX, top: segsBbox.minY });
            fabricPath.setCoords();
            canvas.add(fabricPath);

            // Store contour-aware penToolData for clean re-edit
            (fabricPath as any).penToolData = {
              segments: contourData[0]?.segments || [],
              closed: contourData[0]?.closed || false,
              contours: contourData,
              originalLeft: 0,
              originalTop: 0,
              strokeColor: commitStroke,
              fillColor: commitFill,
              strokeWidth: commitWidth,
              strokeConfig: pathGroup[0]?.strokeConfig ? JSON.parse(JSON.stringify(pathGroup[0].strokeConfig)) : undefined,
            };

            // Stroke mesh support
            if (pathGroup[0]?.strokeConfig) {
              const { needsExpansion: needsExp, generateStrokeMesh: genMesh } = await import('@/lib/strokeEngine/strokeRenderer');
              if (needsExp(pathGroup[0].strokeConfig)) {
                const { Path: MeshPath } = await import('fabric');
                const mesh = genMesh(pathGroup[0].segments, pathGroup[0].closed, pathGroup[0].strokeConfig, (fabricPath as any).canvasObjectId || pathGroup[0].id);
                if (mesh) {
                  const meshPath = new MeshPath(mesh.pathData, {
                    fill: commitStroke, stroke: 'transparent', strokeWidth: 0,
                    selectable: false, evented: false, objectCaching: false,
                  });
                  (meshPath as any).isStrokeMesh = true;
                  (meshPath as any).parentObjectId = (fabricPath as any).canvasObjectId;
                  canvas.add(meshPath);
                  fabricPath.set('strokeWidth', 0);
                }
              }
            }

            (fabricPath as any).isStandaloneObject = true;
            (fabricPath as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          };

          // Commit grouped paths (compound objects)
          for (const [, group] of groupMap) {
            await commitPathGroup(group);
          }
          // Commit ungrouped paths individually
          for (const path of ungrouped) {
            await commitPathGroup([path]);
          }

          canvas.requestRenderAll();
          clearAll();
        })();
      }
    }
  }, [activeTool]);

  // Double-click on Fabric pen paths to re-edit them
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleDblClick = async (opt: any) => {
      const target = opt.target;
      if (!target || !(target as any).penToolData) return;
      if (activeTool !== 'select') return;
      // Skip compound text outlines — they distort when edited as single path
      if ((target as any).isTextOutline) return;

      let penData = (target as any).penToolData;

      // Always rebuild from actual Fabric path data for compound/boolean paths
      // to avoid stale penToolData causing distortion
      const isBooleanOrCompound = (target as any).isBooleanResult || penData.contours;
      const fabricPathArr = (target as any).path;

      let contours: { segments: any[]; closed: boolean }[] | null = null;

      if (fabricPathArr) {
        try {
          const { parseSvgPathToContours } = await import('@/lib/penTool/pathParser');
          const fabricPathStr = fabricPathArr.map((cmd: any[]) => cmd.join(' ')).join(' ');
          const parsed = parseSvgPathToContours(fabricPathStr);
          if (parsed.contours.length > 0) {
            contours = parsed.contours;
          }
        } catch (err) {
          console.warn('Failed to parse contours from Fabric path:', err);
        }
      }

      // Fallback: use stored penToolData segments as single contour
      if (!contours) {
        contours = [{ segments: penData.segments, closed: penData.closed }];
      }

      // Transform matrix for local→world
      const matrix = target.calcTransformMatrix();
      const pathOffset = (target as any).pathOffset || { x: 0, y: 0 };

      const applyTransform = (pt: { x: number; y: number } | null) => {
        if (!pt) return null;
        const px = pt.x - pathOffset.x;
        const py = pt.y - pathOffset.y;
        return {
          x: matrix[0] * px + matrix[2] * py + matrix[4],
          y: matrix[1] * px + matrix[3] * py + matrix[5],
        };
      };

      // Remove the Fabric object
      canvas.remove(target);
      canvas.requestRenderAll();

      const penState = usePenToolStore.getState();
      const editGroupId = `editGroup_${Date.now()}`;
      const origStroke = (target.stroke as string) || penData.strokeColor || '#000000';
      const origFill = (target.fill as string) || penData.fillColor || 'transparent';
      const origStrokeWidth = (target.strokeWidth as number) ?? penData.strokeWidth ?? 2;

      // Add each contour as a linked path
      let firstPathId: string | null = null;
      for (let ci = 0; ci < contours.length; ci++) {
        const contour = contours[ci];
        const cloned = JSON.parse(JSON.stringify(contour.segments));
        const transformed = cloned.map((seg: any) => ({
          ...seg,
          anchor: applyTransform(seg.anchor),
          handleIn: applyTransform(seg.handleIn),
          handleOut: applyTransform(seg.handleOut),
        }));
        const pathId = `pen_path_${Date.now()}_contour_${ci}`;
        if (ci === 0) firstPathId = pathId;
        penState.addPath({
          id: pathId,
          closed: contour.closed,
          segments: transformed,
          editGroupId,
          strokeConfig: penData.strokeConfig ? JSON.parse(JSON.stringify(penData.strokeConfig)) : undefined,
        });
      }

      if (firstPathId) {
        penState.setActivePath(firstPathId);
      }
      penState.setMode('editing');
      penState.setSelectedAnchor(null);
      penState.setOriginalColors(origStroke, origFill);
      penState.setStrokeColor(origStroke);
      penState.setFillColor(origFill);
      penState.setStrokeWidth(origStrokeWidth);

      if (penData.strokeConfig) {
        penState.setActiveStrokeConfig(JSON.parse(JSON.stringify(penData.strokeConfig)));
      }

      // Switch to pen tool
      if (onToolSelect) onToolSelect('pen');
    };

    canvas.on('mouse:dblclick', handleDblClick);
    return () => {
      canvas.off('mouse:dblclick', handleDblClick);
    };
  }, [activeTool, onToolSelect]);

  // Edit mode visual indicator removed — objects are top-level now

  // Track placeholder movement and update chat position
  useEffect(() => {
    if (!fabricCanvasRef.current || !placeholderMode || !placeholderObject || !showAIChat) return;
    
    const canvas = fabricCanvasRef.current;
    
    const updateChatPosition = () => {
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const zoom = vpt[0];
      const bounds = placeholderObject.getBoundingRect();
      
      const PROMPT_BOX_WIDTH = 350;
      const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
      const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
      // FIX: Pass center X directly - CSS translateX(-50%) handles centering
      setAIChatPosition({
        x: selectedCenterX,
        y: selectedBottomY + 24
      });
    };
    
    const handleObjectMoving = (e: any) => {
      if (e.target === placeholderObject) {
        updateChatPosition();
      }
    };
    
    const handleObjectModified = (e: any) => {
      if (e.target === placeholderObject) {
        updateChatPosition();
      }
    };
    
    const handleObjectScaling = (e: any) => {
      if (e.target === placeholderObject) {
        updateChatPosition();
      }
    };
    
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    
    return () => {
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
    };
  }, [placeholderMode, placeholderObject, showAIChat]);

  // ---- Smart Mockup: keep design overlays glued to their base image ----
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const lastPos = new WeakMap<any, { left: number; top: number }>();

    const onMove = (e: any) => {
      const t = e?.target;
      if (!t) return;
      const prev = lastPos.get(t);
      const left = t.left || 0;
      const top = t.top || 0;
      if (prev) {
        const dx = left - prev.left;
        const dy = top - prev.top;
        if (dx || dy) translateOverlaysWithBase(canvas, t, dx, dy);
      }
      lastPos.set(t, { left, top });
    };
    const onModified = (e: any) => {
      const t = e?.target;
      if (t) lastPos.delete(t);
    };
    canvas.on('object:moving', onMove);
    canvas.on('object:modified', onModified);
    return () => {
      canvas.off('object:moving', onMove);
      canvas.off('object:modified', onModified);
    };
  }, [fabricCanvasRef.current]);

  // Handle click detection for showing/hiding chat in placeholder mode
  useEffect(() => {
    if (!fabricCanvasRef.current || !placeholderMode) return;
    
    const canvas = fabricCanvasRef.current;
    
    const handleMouseDown = (e: any) => {
      const target = canvas.findTarget(e.e);
      
      if (target && (target as any).isPlaceholder) {
        // Clicked on placeholder - show chat if not already visible
        if (!showAIChat) {
          setPlaceholderObject(target);
          setShowAIChat(true);
          setChatSelectedObjects([target]);
          
          // Position chat next to placeholder
          const bounds = target.getBoundingRect();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];
          const PROMPT_BOX_WIDTH = 350;
          const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
          const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
          // FIX: Pass center X directly - CSS translateX(-50%) handles centering
          setAIChatPosition({
            x: selectedCenterX,
            y: selectedBottomY + 24
          });
          
          // Auto-zoom to show element and prompt box
          focusOnElementWithPrompt(target, canvas);
        }
      } else if (showAIChat) {
        // Clicked outside - check if it's outside chat DOM element
        const chatElement = document.querySelector('[data-canvas-ai-chat]');
        const isBrushMode = chatElement?.getAttribute('data-brush-mode') === 'true';
        
        // DON'T close chat if user is drawing with brush selection
        if (!isBrushMode && chatElement && !chatElement.contains(e.e.target as Node)) {
          setShowAIChat(false);
          setChatSelectedObjects([]);
          setPlaceholderObject(null);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };
    
    canvas.on('mouse:down', handleMouseDown);
    
    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [placeholderMode, showAIChat]);

  // Tool switching
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Sync CursorEngine tool
    cursorEngineRef.current?.setTool(activeTool as ToolMode);

    if (activeTool === 'select' || activeTool === 'edit') {
      canvas.selection = true;
      // CursorEngine handles cursor — set Fabric defaults as fallback
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.forEachObject(obj => {
        // Allow selecting artboards and their children
        if ((obj as any).isArtboard) {
          obj.selectable = true;
          obj.evented = true;
          // Make sure children are also selectable
          if ((obj as any)._objects) {
            (obj as any)._objects.forEach((child: any) => {
              child.selectable = true;
              child.evented = true;
            });
          }
        } else if ((obj as any).isTitle) {
          obj.selectable = true;
          obj.evented = true;
        } else {
          obj.selectable = true;
          obj.evented = true;
        }
      });
    } else if (activeTool === 'hand') {
      canvas.selection = false;
      canvas.defaultCursor = 'default'; // CursorEngine handles grab/grabbing
      canvas.hoverCursor = 'default';
      canvas.moveCursor = 'default';
      
      // CRITICAL: Disable ALL object events AND set cursor override for ALL objects
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
        obj.hoverCursor = 'default';
      });
      
      // Force immediate render to apply changes
      canvas.requestRenderAll();
      
      // CRITICAL FIX: Use high-priority event handlers for panning
      let isPanningLocal = false;
      let panLastX = 0;
      let panLastY = 0;
      
      // Use mouse:down:before for highest priority — but ONLY when hand tool is active
      const handleHandMouseDownBefore = (opt: any) => {
        // CRITICAL: Guard with ref to prevent blocking selection in other modes
        if (activeToolRef.current !== 'hand') return;
        canvas.discardActiveObject();
        isPanningLocal = true;
        canvas.defaultCursor = 'default';
        cursorEngineRef.current?.setPanning(true);
        const evt = opt.e as MouseEvent;
        panLastX = evt.clientX;
        panLastY = evt.clientY;
      };
      
      const handleHandMouseMove = (opt: any) => {
        if (!isPanningLocal) return;
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - panLastX;
          vpt[5] += evt.clientY - panLastY;
          canvas.requestRenderAll();
          panLastX = evt.clientX;
          panLastY = evt.clientY;
        }
      };
      
      const handleHandMouseUp = () => {
        isPanningLocal = false;
        cursorEngineRef.current?.setPanning(false);
        canvas.defaultCursor = 'default';
      };
      
      // Use before event for priority
      canvas.on('mouse:down:before', handleHandMouseDownBefore);
      canvas.on('mouse:move', handleHandMouseMove);
      canvas.on('mouse:up', handleHandMouseUp);
      
      // ALSO bind to DOM directly as fallback for reliability
      const canvasEl = canvas.upperCanvasEl;
      const domMouseDown = (e: MouseEvent) => {
        if (activeToolRef.current !== 'hand') return;
        isPanningLocal = true;
        panLastX = e.clientX;
        panLastY = e.clientY;
        canvas.defaultCursor = 'default';
        cursorEngineRef.current?.setPanning(true);
      };
      const domMouseUp = () => {
        isPanningLocal = false;
        cursorEngineRef.current?.setPanning(false);
        canvas.defaultCursor = 'default';
      };
      canvasEl?.addEventListener('mousedown', domMouseDown);
      window.addEventListener('mouseup', domMouseUp);
      
      return () => {
        canvas.off('mouse:down:before', handleHandMouseDownBefore);
        canvas.off('mouse:move', handleHandMouseMove);
        canvas.off('mouse:up', handleHandMouseUp);
        canvasEl?.removeEventListener('mousedown', domMouseDown);
        window.removeEventListener('mouseup', domMouseUp);
      };
    } else if (activeTool === 'chat') {
      // Chat mode - allow box selection
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';

      // Make all objects selectable in chat mode
      canvas.forEachObject(obj => {
        if (!(obj as any).isArtboard && !(obj as any).isTitle) {
          obj.selectable = true;
          obj.evented = true;
        }
      });
      const handleSelectionCreated = (e: any) => {
        const selected = e.selected || [];
        if (selected.length > 0) {
          // Get canvas center position for chat
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const centerX = (canvas.width || 800) / 2;
          const centerY = (canvas.height || 600) / 2;
          setChatSelectedObjects(selected);
          setAIChatPosition({
            x: centerX + 20,
            y: centerY - 200
          });
          setShowAIChat(true);
        }
      };
      canvas.on('selection:created', handleSelectionCreated);
      canvas.on('selection:updated', handleSelectionCreated);
      return () => {
        canvas.off('selection:created', handleSelectionCreated);
        canvas.off('selection:updated', handleSelectionCreated);
      };
    } else if (activeTool === 'pencil') {
      // Pencil mode - PencilTool component handles isDrawingMode
      canvas.selection = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === 'pen') {
      // Pen tool mode — SVG overlay handles everything
      canvas.selection = false;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'default';
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (['rectangle', 'circle', 'text', 'image', 'star', 'triangle', 'hexagon', 'polygon', 'arrow', 'artboard'].includes(activeTool)) {
      const isShapeTool = ['rectangle', 'circle', 'star', 'triangle', 'hexagon', 'polygon', 'arrow', 'artboard'].includes(activeTool);
      
      let dragStart: { x: number; y: number } | null = null;
      let dimOverlay: HTMLDivElement | null = null;
      let previewRect: HTMLDivElement | null = null;
      let startScreenPos: { x: number; y: number } | null = null;
      
      const createDimOverlay = () => {
        const container = containerRef.current;
        if (!container) return;
        previewRect = document.createElement('div');
        previewRect.style.cssText = 'position:absolute;border:2px dashed #3b82f6;pointer-events:none;z-index:9999;background:rgba(59,130,246,0.05);';
        container.appendChild(previewRect);
        dimOverlay = document.createElement('div');
        dimOverlay.style.cssText = 'position:absolute;pointer-events:none;z-index:10000;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:11px;padding:2px 6px;border-radius:4px;white-space:nowrap;font-family:system-ui;';
        container.appendChild(dimOverlay);
      };
      
      const updateDimOverlay = (sScreen: { x: number; y: number }, eScreen: { x: number; y: number }, w: number, h: number) => {
        if (!previewRect || !dimOverlay) return;
        const left = Math.min(sScreen.x, eScreen.x);
        const top = Math.min(sScreen.y, eScreen.y);
        previewRect.style.left = `${left}px`;
        previewRect.style.top = `${top}px`;
        previewRect.style.width = `${Math.abs(eScreen.x - sScreen.x)}px`;
        previewRect.style.height = `${Math.abs(eScreen.y - sScreen.y)}px`;
        dimOverlay.textContent = `${Math.round(w)} × ${Math.round(h)}`;
        dimOverlay.style.left = `${left + Math.abs(eScreen.x - sScreen.x) / 2 - 30}px`;
        dimOverlay.style.top = `${top + Math.abs(eScreen.y - sScreen.y) + 8}px`;
      };
      
      const removeDimOverlay = () => { previewRect?.remove(); dimOverlay?.remove(); previewRect = null; dimOverlay = null; };

      const handleMouseDown = async (e: any) => {
        const pointer = canvas.getPointer(e.e);
        
        if (activeTool === 'text') {
          const target = canvas.findTarget(e.e);
          if (target && (target as any).penToolData && !(target as any).textOnPath) {
            (target as any)._originalFill = (target as any).fill;
            (target as any).fill = 'transparent';
            if (!(target as any).stroke) (target as any).stroke = '#000000';
            (target as any).textOnPath = { ...DEFAULT_TEXT_ON_PATH };
            canvas.setActiveObject(target);
            canvas.fire('object:modified', { target });
            canvas.renderAll();
            if (onToolSelect) onToolSelect('select');
            return;
          }
          const { Textbox } = await import('fabric');
          const text = new Textbox('Double-click to edit', {
            left: pointer.x, top: pointer.y, fontSize: 32, fill: '#000000', fontFamily: 'Inter',
            editable: true, selectable: true, hasControls: true, hasBorders: true, width: 300,
            splitByGrapheme: false, dynamicMinWidth: 10,
          });
          (text as any).isStandaloneObject = true;
          (text as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          canvas.add(text); canvas.setActiveObject(text); text.enterEditing(); text.selectAll(); canvas.renderAll();
          if (onToolSelect) onToolSelect('select');
          return;
        }
        
        if (activeTool === 'image') {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/*';
          input.onchange = (event: any) => {
            const file = event.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                FabricImage.fromURL(ev.target?.result as string).then((img) => {
                  img.set({ left: pointer.x - 100, top: pointer.y - 100, scaleX: 0.5, scaleY: 0.5, selectable: true, hasControls: true, name: 'Image', id: crypto.randomUUID() });
                  (img as any).isStandaloneObject = true;
                  (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
                  setTimeout(() => { if (onLayersChange && getLayersRef.current) onLayersChange(getLayersRef.current()); }, 100);
                });
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
          if (onToolSelect) onToolSelect('select');
          return;
        }
        
        if (isShapeTool) {
          dragStart = { x: pointer.x, y: pointer.y };
          const canvasEl = canvas.getSelectionElement();
          const rect = canvasEl.getBoundingClientRect();
          const evt = e.e as MouseEvent;
          startScreenPos = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
          createDimOverlay();
        }
      };
      
      const handleMouseMove = (e: any) => {
        if (!dragStart || !isShapeTool || !startScreenPos) return;
        const pointer = canvas.getPointer(e.e);
        const canvasEl = canvas.getSelectionElement();
        const rect = canvasEl.getBoundingClientRect();
        const evt = e.e as MouseEvent;
        updateDimOverlay(startScreenPos, { x: evt.clientX - rect.left, y: evt.clientY - rect.top },
          Math.abs(pointer.x - dragStart.x), Math.abs(pointer.y - dragStart.y));
      };
      
      const handleMouseUp = (e: any) => {
        if (!dragStart || !isShapeTool) return;
        const pointer = canvas.getPointer(e.e);
        const w = Math.abs(pointer.x - dragStart.x);
        const h = Math.abs(pointer.y - dragStart.y);
        const minX = Math.min(pointer.x, dragStart.x);
        const minY = Math.min(pointer.y, dragStart.y);
        removeDimOverlay();
        
        const MIN_DRAG = 5;
        
        // Handle artboard tool separately
        if (activeTool === 'artboard') {
          const useCustomSize = w > MIN_DRAG && h > MIN_DRAG;
          const artboardW = useCustomSize ? Math.round(w) : 800;
          const artboardH = useCustomSize ? Math.round(h) : 600;
          const artboardX = useCustomSize ? minX : dragStart.x;
          const artboardY = useCustomSize ? minY : dragStart.y;
          
          if (onNewArtboard) {
            // Pass x,y as top-left + center offset so handleNewArtboard positions correctly
            const centerX = artboardX + artboardW / 2;
            const centerY = artboardY + artboardH / 2;
            onNewArtboard('', `Artboard ${(artboards?.length || 0) + 1}`, centerX, centerY, undefined, false, false, undefined, undefined, artboardW, artboardH);
          }
          if (onToolSelect) onToolSelect('select');
          dragStart = null; startScreenPos = null;
          return;
        }
        
        const useCustomSize = w > MIN_DRAG && h > MIN_DRAG;
        const obj = createElement(activeTool, canvas, '#000000', useCustomSize ? { width: w, height: h } : undefined);
        if (obj) {
          if (useCustomSize) {
            obj.set({ left: minX, top: minY, strokeUniform: true });
          } else {
            // Use known shape dimensions from shapeMeta for precise centering
            const meta = (obj as any).penToolData?.shapeMeta;
            let shapeW = obj.width || 100;
            let shapeH = obj.height || 100;
            if (meta) {
              if (meta.width) shapeW = meta.width;
              else if (meta.outerRadius) shapeW = meta.outerRadius * 2;
              if (meta.height) shapeH = meta.height;
              else if (meta.outerRadius) shapeH = meta.outerRadius * 2;
            }
            obj.set({
              left: dragStart.x - shapeW / 2,
              top: dragStart.y - shapeH / 2,
              strokeUniform: true,
            });
          }
          obj.setCoords();
          (obj as any).isStandaloneObject = true;
          (obj as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Auto-parent into frame if shape landed inside one
          const allFrames = canvas.getObjects().filter((o: any) => o.isArtboard && o instanceof FrameContainer) as FrameContainer[];
          const objCenter = obj.getCenterPoint();
          const landedFrame = allFrames.find(f => f.containsWorldPoint(objCenter.x, objCenter.y));
          if (landedFrame) {
            applyFrameClip(obj, landedFrame);
          }

          canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll();
          if (onToolSelect) onToolSelect('select');
        }
        dragStart = null; startScreenPos = null;
        setTimeout(() => { if (onLayersChange && getLayersRef.current) onLayersChange(getLayersRef.current()); }, 100);
      };
      
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.selection = false;
      return () => {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        removeDimOverlay();
      };
    }
    canvas.renderAll();
  }, [activeTool, artboards, onLayersChange, onToolSelect]);

  // Hover outline effect (Figma-style feedback)
  const hoveredObjectRef = useRef<FabricObject | null>(null);
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const HOVER_COLOR = '#0D99FF';

    const drawHoverOutline = (opt: any) => {
      const ctx = opt?.ctx || canvas.getContext();
      if (!ctx) return;
      const hovered = hoveredObjectRef.current;
      if (!hovered || !hovered.canvas) return;
      // Skip if selected
      const active = canvas.getActiveObject();
      if (active === hovered) return;
      if (active && (active as any)._objects?.includes(hovered)) return;
      // Skip if dragging
      if ((canvas as any)._currentTransform) return;
      // Skip locked objects
      if (hovered.selectable === false) return;

      const coords = (hovered as any).aCoords;
      if (!coords) return;
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const retina = canvas.getRetinaScaling();

      const toScreen = (p: any) => ({
        x: (vpt[0] * p.x + vpt[2] * p.y + vpt[4]) * retina,
        y: (vpt[1] * p.x + vpt[3] * p.y + vpt[5]) * retina,
      });

      const tl = toScreen(coords.tl);
      const tr = toScreen(coords.tr);
      const br = toScreen(coords.br);
      const bl = toScreen(coords.bl);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = HOVER_COLOR;
      ctx.lineWidth = retina;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const handleMouseMove = (opt: any) => {
      if (activeToolRef.current !== 'select' && activeToolRef.current !== 'edit') return;
      // Don't trigger requestRenderAll during active selection drag — it interferes with marquee
      if ((canvas as any)._groupSelector) return;
      const target = opt.target as FabricObject | undefined;
      if (target === hoveredObjectRef.current) return;
      if (target && (target as any).isTitle) return;
      hoveredObjectRef.current = target || null;
      canvas.requestRenderAll();
    };

    const handleMouseOut = () => {
      if (hoveredObjectRef.current) {
        hoveredObjectRef.current = null;
        canvas.requestRenderAll();
      }
    };

    const clearOnSelect = () => {
      hoveredObjectRef.current = null;
    };

    // Background blur rendering pass
    const renderBgBlur = (opt: any) => {
      const ctx = opt?.ctx || canvas.getContext();
      if (ctx) {
        renderBackgroundBlurs(canvas, ctx);
      }
    };

    canvas.on('after:render', renderBgBlur);
    canvas.on('after:render', drawHoverOutline);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:out', handleMouseOut);
    canvas.on('selection:created', clearOnSelect);
    canvas.on('selection:updated', clearOnSelect);

    return () => {
      hoveredObjectRef.current = null;
      canvas.off('after:render', renderBgBlur);
      canvas.off('after:render', drawHoverOutline);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:out', handleMouseOut);
      canvas.off('selection:created', clearOnSelect);
      canvas.off('selection:updated', clearOnSelect);
    };
  }, [activeTool]);

  // Delete handler
  const handleDeleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    
    // Handle artboard deletion
    if ((activeObj as any).isArtboard && (activeObj as any).artboardId) {
      if (onArtboardDelete) {
        onArtboardDelete((activeObj as any).artboardId);
        setSelectedArtboard(null);
      }
    } 
    // Handle ActiveSelection (multiple objects selected)
    else if (activeObj.type === 'activeselection') {
      const objects = (activeObj as ActiveSelection).getObjects();
      const validObjects = objects.filter(obj => !(obj as any).isTitle && !(obj as any).isArtboard);
      
      canvas.discardActiveObject();
      validObjects.forEach(obj => canvas.remove(obj));
      setSelectedObject(null);
      toast.success(`Deleted ${validObjects.length} objects`);
    }
    // Handle single object
    else if (!(activeObj as any).isTitle) {
      canvas.remove(activeObj);
      setSelectedObject(null);
      toast('Object removed');
    }
    
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [onArtboardDelete]);

  // Duplicate handler
  const handleDuplicateSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = selectedObject || selectedArtboard;
    if (!activeObj) return;
    activeObj.clone().then((cloned: any) => {
      cloned.set({
        left: (activeObj.left || 0) + 20,
        top: (activeObj.top || 0) + 20
      });
      // CRITICAL: Set new canvasObjectId for cloned object
      cloned.isStandaloneObject = true;
      cloned.canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  }, [selectedObject, selectedArtboard]);

  // Group handler
  const handleGroupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    let activeObj = canvas.getActiveObject();
    let objects: FabricObject[] = [];

    if (activeObj?.type === 'activeselection') {
      objects = (activeObj as ActiveSelection).getObjects();
    } else {
      // Fallback: floating toolbar click can drop the activeselection.
      // Rebuild from getActiveObjects() if we still have 2+ targets.
      const fallback = canvas.getActiveObjects();
      if (fallback && fallback.length >= 2) {
        objects = fallback;
        const rebuilt = new ActiveSelection(objects, { canvas });
        canvas.setActiveObject(rebuilt);
        activeObj = rebuilt;
      }
    }

    if (objects.length < 2) {
      toast.error('Select at least 2 objects to group');
      return;
    }
    
    try {
      // Collect IDs of individual objects to delete from DB
      const oldObjectIds = objects.map(obj => (obj as any).canvasObjectId).filter(Boolean);
      
      // Create group from selection
      const group = new Group(objects, {
        left: activeObj.left,
        top: activeObj.top,
      });
      
      // Mark as standalone object
      (group as any).isStandaloneObject = true;
      (group as any).canvasObjectId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove individual objects and add group
      canvas.discardActiveObject();
      objects.forEach(obj => canvas.remove(obj));
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      
      // Delete old individual objects from database
      if (onCanvasObjectDelete) {
        oldObjectIds.forEach(id => onCanvasObjectDelete(id));
      }
      
      toast.success(`Grouped ${objects.length} objects`);
    } catch (error) {
      console.error('Group failed:', error);
      toast.error('Failed to group objects');
    }
  }, [onCanvasObjectDelete]);

  // Ungroup handler
  const handleUngroupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const activeObj = canvas.getActiveObject();
    if (activeObj?.type !== 'group') {
      toast.error('Select a group to ungroup');
      return;
    }
    
    try {
      const groupId = (activeObj as any).canvasObjectId;
      
      // Fabric v6: remove group first, then use removeAll() to properly detach children
      canvas.discardActiveObject();
      canvas.remove(activeObj);
      const items = (activeObj as Group).removeAll();
      
      items.forEach(item => {
        (item as any).isStandaloneObject = true;
        (item as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        item.selectable = true;
        item.evented = true;
      });
      
      canvas.add(...items);
      
      // Delete group from database
      if (groupId && onCanvasObjectDelete) {
        onCanvasObjectDelete(groupId);
      }
      
      // Select all ungrouped items
      if (items.length > 1) {
        canvas.setActiveObject(new ActiveSelection(items, { canvas }));
      } else if (items.length === 1) {
        canvas.setActiveObject(items[0]);
      }
      canvas.requestRenderAll();
      
      toast.success('Group ungrouped');
    } catch (error) {
      console.error('Ungroup failed:', error);
      toast.error('Failed to ungroup');
    }
  }, [onCanvasObjectDelete]);

  // ── Boolean Operations ──────────────────────────────────────
  const handleBooleanOperation = useCallback((operation: BooleanOperation) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Use contextMenuSelectionRef to get objects captured at right-click time
    let objects: any[] = [];
    if (contextMenuSelectionRef.current.length >= 2) {
      objects = contextMenuSelectionRef.current;
    } else {
      // Fallback to active selection
      const active = canvas.getActiveObject();
      if (active && active.type === 'activeSelection') {
        objects = (active as ActiveSelection).getObjects();
      }
    }

    if (objects.length < 2) {
      toast.error('Select at least 2 objects for boolean operations');
      return;
    }

    try {
      const result = createBooleanGroup(canvas, objects, operation, onCanvasObjectDelete);
      if (result) {
        toast.success(`Boolean ${operation} applied`);
      } else {
        toast.error('Boolean operation failed — shapes may not overlap');
      }
    } catch (e) {
      console.error('Boolean operation error:', e);
      toast.error('Boolean operation failed');
    }
  }, [onCanvasObjectDelete]);

  // ── Flatten ─────────────────────────────────────────────────
  const handleFlatten = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Use contextMenuSelectionRef to get the object(s) captured at right-click time
    const capturedObjects = contextMenuSelectionRef.current;

    try {
      let success = false;

      if (capturedObjects.length === 1) {
        const obj = capturedObjects[0];
        if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
          const result = await flattenText(canvas, obj, onCanvasObjectDelete);
          success = result !== null;
        } else if (obj.type === 'group') {
          const result = flattenGroup(canvas, obj, onCanvasObjectDelete);
          success = result !== null;
        }
      } else if (capturedObjects.length >= 2) {
        // Multiple objects — flatten via flattenSelected with direct objects
        success = await flattenSelected(canvas, onCanvasObjectDelete, capturedObjects);
      } else {
        // No captured objects — fallback to canvas active object
        success = await flattenSelected(canvas, onCanvasObjectDelete);
      }

      if (success) {
        toast.success('Flattened to path');
      } else {
        toast.error('Nothing to flatten');
      }
    } catch (e) {
      console.error('Flatten error:', e);
      toast.error('Flatten failed');
    }
  }, [onCanvasObjectDelete]);

  // Artboard dimension update
  const handleArtboardDimensionUpdate = useCallback((width: number, height: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedArtboard) return;
    
    // FrameContainer is now a Rect — update directly
    (selectedArtboard as any).set({ width, height });
    
    // Update artboard image if it exists (separate top-level object)
    const artboardId = (selectedArtboard as any).artboardId;
    if (artboardId) {
      const artboardImg = canvas.getObjects().find(
        (o: any) => (o as any).isArtboardImage && (o as any).artboardId === artboardId
      );
      if (artboardImg) {
        const imgAspectRatio = (artboardImg.width || 1) / (artboardImg.height || 1);
        const artboardAspectRatio = width / height;
        let scaleX, scaleY;
        if (imgAspectRatio > artboardAspectRatio) {
          scaleY = height / (artboardImg.height || 1);
          scaleX = scaleY;
        } else {
          scaleX = width / (artboardImg.width || 1);
          scaleY = scaleX;
        }
        artboardImg.set({ scaleX, scaleY });
      }
    }
    
    (selectedArtboard as any).setCoords();
    (selectedArtboard as any).dirty = true;
    canvas.renderAll();
    if (artboardId && onArtboardUpdate) {
      onArtboardUpdate(artboardId, { width, height });
    }
  }, [selectedArtboard, onArtboardUpdate]);
  const handleUpdateProperties = useCallback((properties: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Get the currently active object from canvas directly (not from stale state)
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    
    // FIX: For text objects, handle width auto-expansion to prevent clipping
    if (activeObj.type === 'textbox' || activeObj.type === 'i-text' || activeObj.type === 'text') {
      const textObj = activeObj as any;
      
      // If changing fontSize or fontFamily, auto-expand width to fit content
      if (properties.fontSize || properties.fontFamily) {
        activeObj.set(properties);
        
        // Force recalculation of text dimensions
        textObj.initDimensions();
        
        // Expand width if text is clipped (calcTextWidth > current width)
        const calcWidth = textObj.calcTextWidth?.() || textObj.width;
        if (calcWidth > textObj.width) {
          textObj.set({ width: calcWidth + 20 }); // Add padding
        }
      } else {
        activeObj.set(properties);
      }
      
      // For textAlign changes, ensure width accommodates content
      if (properties.textAlign) {
        textObj.initDimensions();
      }
    } else {
      activeObj.set(properties);
    }
    
    // Special handling for text objects entering edit mode
    if (activeObj.type === 'i-text' && properties.enterEdit) {
      (activeObj as any).enterEditing();
    }
    
    canvas.fire('object:modified', { target: activeObj });
    canvas.renderAll();
  }, []); // No dependencies - always fresh!

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: handleDeleteSelected,
    onDuplicate: handleDuplicateSelected,
    onUndo: undefined,
    onRedo: undefined,
    onZoomIn: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const zoom = canvas.getZoom();
        canvas.setZoom(Math.min(zoom * 1.1, 3));
      }
    },
    onZoomOut: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const zoom = canvas.getZoom();
        canvas.setZoom(Math.max(zoom * 0.9, 0.1));
      }
    },
    onZoomReset: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.setZoom(1);
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      }
    },
    onSelectTool: () => {
      onToolSelect?.('select');
    },
    onPanTool: () => {
      onToolSelect?.('pan');
    },
    onEscape: () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.discardActiveObject();
        canvas.renderAll();
        setSelectedObject(null);
        setSelectedArtboard(null);
        setShowAIChat(false);
        setChatSelectedObjects([]);
      }
    },
    onGroup: handleGroupSelected,
    onUngroup: handleUngroupSelected,
    // Copy/Paste/Cut
    onCopy: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.clone().then((cloned: any) => {
          (window as any).__fabricClipboard = cloned;
          toast.success('Copied to clipboard');
        });
      }
    },
    onPaste: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const clipboard = (window as any).__fabricClipboard;
      if (clipboard) {
        clipboard.clone().then((cloned: any) => {
          canvas.discardActiveObject();
          cloned.set({
            left: cloned.left + 20,
            top: cloned.top + 20,
            evented: true,
          });
          if (cloned.type === 'activeselection') {
            cloned.canvas = canvas;
            cloned.forEachObject((obj: any) => {
              (obj as any).isStandaloneObject = true;
              (obj as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              canvas.add(obj);
            });
            cloned.setCoords();
          } else {
            (cloned as any).isStandaloneObject = true;
            (cloned as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            canvas.add(cloned);
          }
          (window as any).__fabricClipboard.top += 20;
          (window as any).__fabricClipboard.left += 20;
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          toast.success('Pasted');
        });
      }
    },
    onCut: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.clone().then((cloned: any) => {
          (window as any).__fabricClipboard = cloned;
          canvas.remove(activeObj);
          canvas.requestRenderAll();
          toast.success('Cut to clipboard');
        });
      }
    },
    // Tool shortcuts
    onTextTool: () => {
      onToolSelect?.('text');
    },
    onShapeTool: () => {
      onToolSelect?.('rectangle');
    },
    onFrameTool: () => {
      onToolSelect?.('artboard');
    },
    onImageTool: () => {
      onToolSelect?.('image');
    },
    onImageGenerator: () => {
      onToolSelect?.('generator');
    },
    onVideoGenerator: () => {
      onToolSelect?.('video');
    },
    onPenTool: () => {
      onToolSelect?.('pen');
    },
    onQuickComment: (pos) => {
      // If already open, ignore
      if (quickCommentPos) return;
      setQuickCommentPos({ x: mousePosRef.current.x, y: mousePosRef.current.y });
    },
    canvasRef: fabricCanvasRef
  });

  // Track mouse position for quick comment (no re-renders)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (quickCommentPos) {
        setLiveCursorPos({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [quickCommentPos]);

  // Handle adding AI generated images
  const handleAddImage = useCallback(async (imageUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    try {
      const img = await FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      });

      console.log(`📸 Image loaded: ${img.width}x${img.height} (aspect: ${(img.width / img.height).toFixed(2)})`);
      console.log(`🔢 Current grid counter: ${imageAddCounter.current}, last add: ${Date.now() - lastImageAddTime.current}ms ago`);

      // Reset counter if more than 30 seconds since last image (ensures full generation sequences use same grid)
      const now = Date.now();
      if (now - lastImageAddTime.current > 30000) {
        imageAddCounter.current = 0;
      }
      lastImageAddTime.current = now;

      // GRID LAYOUT CALCULATION - FIXED VERSION
      const cols = 3; // 3 images per row
      const spacing = 500; // Space between images

      const row = Math.floor(imageAddCounter.current / cols);
      const col = imageAddCounter.current % cols;

      // Calculate TOTAL grid dimensions (including the current image being added)
      const totalRows = Math.ceil((imageAddCounter.current + 1) / cols);
      const totalWidth = cols * spacing;
      const totalHeight = totalRows * spacing;

      // Get viewport center
      const center = canvas.getVpCenter();

      // Center the ENTIRE grid, then position this image within it
      const gridStartX = center.x - totalWidth / 2 + spacing / 2; // +spacing/2 to center first image
      const gridStartY = center.y - totalHeight / 2 + spacing / 2;

      console.log(`🎯 Grid placement [${imageAddCounter.current}]: row=${row}, col=${col}, totalRows=${totalRows}`);
      console.log(`📐 Position: x=${gridStartX + col * spacing}, y=${gridStartY + row * spacing}`);

      img.set({
        left: gridStartX + col * spacing,
        top: gridStartY + row * spacing,
        originX: 'center',
        originY: 'center',
        name: 'Image',
        id: crypto.randomUUID()
      });

      // Scale to reasonable size
      const maxSize = 400;
      const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
      img.scale(scale);
      
      // Mark as standalone object so it gets saved
      (img as any).isStandaloneObject = true;
      (img as any).name = 'Image';
      (img as any).id = (img as any).id || crypto.randomUUID();
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      
      // Increment counter for next image
      imageAddCounter.current++;

      // Refresh layers
      if (onLayersChange && getLayersRef.current) {
        const updatedLayers = getLayersRef.current();
        onLayersChange(updatedLayers);
      }
    } catch (error) {
      console.error('Failed to add generated image:', error);
      toast.error('Failed to add image to canvas');
    }
  }, [onLayersChange]);
  // Context menu handlers
  const getSelectedObjects = () => {
    const activeObj = fabricCanvasRef.current?.getActiveObject();
    console.log('🔍 getSelectedObjects called:', {
      hasCanvas: !!fabricCanvasRef.current,
      hasActiveObj: !!activeObj,
      activeObjType: activeObj?.type,
      has_objects: activeObj ? '_objects' in activeObj : false,
      _objectsLength: activeObj ? (activeObj as any)._objects?.length : 'N/A'
    });
    
    if (!activeObj) return [];
    
    if (activeObj.type === 'activeselection') {
      // Always prefer _objects first (matches PropertiesPanel approach)
      const objects = (activeObj as any)._objects || 
                     (activeObj as any).getObjects?.() || 
                     [];
      console.log('✅ Extracted objects from activeSelection:', objects.length, objects.map((o: any) => o.type));
      return objects;
    }
    console.log('📌 Single object selected:', activeObj.type);
    return [activeObj];
  };

  const handleAlignLeft = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    // Use the ref captured at context menu open time
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignLeft called:', {
      objectCount: objects.length,
      usingRef: contextMenuSelectionRef.current.length > 0,
      objects: objects.map(o => ({ type: o.type, left: o.left, width: o.getScaledWidth?.() || o.width }))
    });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const minLeft = Math.min(...objects.map(obj => obj.left || 0));
      console.log('Aligning to left position:', minLeft);
      
      objects.forEach(obj => {
        const before = obj.left;
        obj.set({ left: minLeft });
        obj.setCoords();
        console.log(`Object moved from ${before} to ${obj.left}`);
      });
      
      // Update activeSelection if multiple objects selected
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned left');
    } catch (error) {
      console.error('Align left failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleAlignCenter = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignCenter called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const avgLeft = objects.reduce((sum, obj) => sum + (obj.left || 0) + (obj.getScaledWidth?.() || obj.width || 0) / 2, 0) / objects.length;
      console.log('Aligning to center position:', avgLeft);
      
      objects.forEach(obj => {
        obj.set({ left: avgLeft - (obj.getScaledWidth?.() || obj.width || 0) / 2 });
        obj.setCoords();
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned center');
    } catch (error) {
      console.error('Align center failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleAlignRight = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignRight called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const maxRight = Math.max(...objects.map(obj => (obj.left || 0) + (obj.getScaledWidth?.() || obj.width || 0)));
      console.log('Aligning to right position:', maxRight);
      
      objects.forEach(obj => {
        obj.set({ left: maxRight - (obj.getScaledWidth?.() || obj.width || 0) });
        obj.setCoords();
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned right');
    } catch (error) {
      console.error('Align right failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleAlignTop = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignTop called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const minTop = Math.min(...objects.map(obj => obj.top || 0));
      console.log('Aligning to top position:', minTop);
      
      objects.forEach(obj => {
        obj.set({ top: minTop });
        obj.setCoords();
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned top');
    } catch (error) {
      console.error('Align top failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleAlignMiddle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignMiddle called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const avgTop = objects.reduce((sum, obj) => sum + (obj.top || 0) + (obj.getScaledHeight?.() || obj.height || 0) / 2, 0) / objects.length;
      console.log('Aligning to middle position:', avgTop);
      
      objects.forEach(obj => {
        obj.set({ top: avgTop - (obj.getScaledHeight?.() || obj.height || 0) / 2 });
        obj.setCoords();
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned middle');
    } catch (error) {
      console.error('Align middle failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleAlignBottom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleAlignBottom called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 2) {
      toast.error(`Select at least 2 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const maxBottom = Math.max(...objects.map(obj => (obj.top || 0) + (obj.getScaledHeight?.() || obj.height || 0)));
      console.log('Aligning to bottom position:', maxBottom);
      
      objects.forEach(obj => {
        obj.set({ top: maxBottom - (obj.getScaledHeight?.() || obj.height || 0) });
        obj.setCoords();
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Aligned bottom');
    } catch (error) {
      console.error('Align bottom failed:', error);
      toast.error('Failed to align objects');
    }
  };

  const handleDistributeHorizontally = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleDistributeHorizontally called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 3) {
      toast.error(`Select at least 3 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0));
      const first = sorted[0].left || 0;
      const last = (sorted[sorted.length - 1].left || 0) + (sorted[sorted.length - 1].getScaledWidth?.() || sorted[sorted.length - 1].width || 0);
      const totalWidth = sorted.reduce((sum, obj) => sum + (obj.getScaledWidth?.() || obj.width || 0), 0);
      const gap = (last - first - totalWidth) / (sorted.length - 1);
      console.log('Distribution gap:', gap);
      
      let currentX = first;
      sorted.forEach(obj => {
        obj.set({ left: currentX });
        obj.setCoords();
        currentX += (obj.getScaledWidth?.() || obj.width || 0) + gap;
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Distributed horizontally');
    } catch (error) {
      console.error('Distribute horizontally failed:', error);
      toast.error('Failed to distribute objects');
    }
  };

  const handleDistributeVertically = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleDistributeVertically called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length < 3) {
      toast.error(`Select at least 3 objects (currently: ${objects.length})`);
      return;
    }
    
    try {
      const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0));
      const first = sorted[0].top || 0;
      const last = (sorted[sorted.length - 1].top || 0) + (sorted[sorted.length - 1].getScaledHeight?.() || sorted[sorted.length - 1].height || 0);
      const totalHeight = sorted.reduce((sum, obj) => sum + (obj.getScaledHeight?.() || obj.height || 0), 0);
      const gap = (last - first - totalHeight) / (sorted.length - 1);
      console.log('Distribution gap:', gap);
      
      let currentY = first;
      sorted.forEach(obj => {
        obj.set({ top: currentY });
        obj.setCoords();
        currentY += (obj.getScaledHeight?.() || obj.height || 0) + gap;
      });
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'activeselection') {
        activeObj.setCoords();
      }
      
      canvas.renderAll();
      toast.success('Distributed vertically');
    } catch (error) {
      console.error('Distribute vertically failed:', error);
      toast.error('Failed to distribute objects');
    }
  };

  const handleBringToFront = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleBringToFront called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => canvas.bringObjectToFront(obj));
      canvas.renderAll();
      toast.success('Brought to front');
    } catch (error) {
      console.error('Bring to front failed:', error);
      toast.error('Failed to bring objects to front');
    }
  };

  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleBringForward called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => canvas.bringObjectForward(obj));
      canvas.renderAll();
      toast.success('Brought forward');
    } catch (error) {
      console.error('Bring forward failed:', error);
      toast.error('Failed to bring objects forward');
    }
  };

  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleSendBackward called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => canvas.sendObjectBackwards(obj));
      canvas.renderAll();
      toast.success('Sent backward');
    } catch (error) {
      console.error('Send backward failed:', error);
      toast.error('Failed to send objects backward');
    }
  };

  const handleSendToBack = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleSendToBack called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => canvas.sendObjectToBack(obj));
      canvas.renderAll();
      toast.success('Sent to back');
    } catch (error) {
      console.error('Send to back failed:', error);
      toast.error('Failed to send objects to back');
    }
  };

  // ===== Copy / Cut / Paste (internal clipboard, works for any object) =====
  const getContextObjects = () => {
    const objs = contextMenuSelectionRef.current.length > 0
      ? contextMenuSelectionRef.current
      : getSelectedObjects();
    return objs.filter((o: any) => !o?.isTitle && !o?.isArtboard);
  };

  const handleCopySelection = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = getContextObjects();
    if (objects.length === 0) {
      toast.error('Nothing to copy');
      return;
    }
    try {
      const clones: any[] = await Promise.all(
        objects.map((obj: any) =>
          new Promise((resolve) => obj.clone((c: any) => resolve(c))),
        ),
      );
      internalClipboardRef.current = clones;
      toast.success(`Copied ${objects.length} object(s)`);
    } catch (e) {
      console.error('Copy failed', e);
      toast.error('Copy failed');
    }
  };

  const handleCutSelection = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = getContextObjects();
    if (objects.length === 0) {
      toast.error('Nothing to cut');
      return;
    }
    await handleCopySelection();
    objects.forEach((o: any) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const handlePasteSelection = async () => {
    const canvas = fabricCanvasRef.current;
    const clipboard = internalClipboardRef.current;
    if (!canvas || !clipboard?.length) {
      toast.error('Clipboard is empty');
      return;
    }
    const target = lastContextMenuPosRef.current;
    try {
      // Compute current bbox of clipboard so we can shift to pointer if available.
      const rects = clipboard.map((o: any) => o.getBoundingRect?.()).filter(Boolean);
      const offsetX = target && rects.length
        ? target.x - (Math.min(...rects.map((r: any) => r.left)) + (Math.max(...rects.map((r: any) => r.left + r.width)) - Math.min(...rects.map((r: any) => r.left))) / 2)
        : 20;
      const offsetY = target && rects.length
        ? target.y - (Math.min(...rects.map((r: any) => r.top)) + (Math.max(...rects.map((r: any) => r.top + r.height)) - Math.min(...rects.map((r: any) => r.top))) / 2)
        : 20;
      const newClones: any[] = await Promise.all(
        clipboard.map((obj: any) => new Promise((resolve) => obj.clone((c: any) => resolve(c)))),
      );
      newClones.forEach((c: any) => {
        c.set({
          left: (c.left || 0) + offsetX,
          top: (c.top || 0) + offsetY,
        });
        c.isStandaloneObject = true;
        c.canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        canvas.add(c);
      });
      canvas.requestRenderAll();
      toast.success(`Pasted ${newClones.length} object(s)`);
    } catch (e) {
      console.error('Paste failed', e);
      toast.error('Paste failed');
    }
  };

  // ===== Lock / Unlock / Hide / Show =====
  const handleToggleLock = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = getContextObjects();
    if (!objects.length) return;
    const allLocked = objects.every((o: any) => o.lockMovementX && o.lockMovementY);
    const next = !allLocked;
    objects.forEach((o: any) => {
      o.set({
        lockMovementX: next,
        lockMovementY: next,
        lockScalingX: next,
        lockScalingY: next,
        lockRotation: next,
        hasControls: !next,
        selectable: true,
      });
    });
    canvas.requestRenderAll();
    toast.success(next ? 'Locked' : 'Unlocked');
  };

  const handleToggleVisibility = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = getContextObjects();
    if (!objects.length) return;
    const allVisible = objects.every((o: any) => o.visible !== false);
    const next = !allVisible;
    objects.forEach((o: any) => o.set('visible', next));
    canvas.requestRenderAll();
    toast.success(next ? 'Shown' : 'Hidden');
  };

  // ===== Save current selection as a reusable component =====
  const handleSaveAsComponent = () => {
    const objects = getContextObjects();
    if (!objects.length) {
      toast.error('Select something to save');
      return;
    }
    setSaveComponentObjects(objects);
    setShowSaveComponentDialog(true);
  };

  // ===== Add to Chat =====
  // Dispatches the selected object as a tagged asset to the AI chat
  // (mirrors the @-mention asset chip flow exactly).
  const handleAddSelectionToChat = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const objects = contextMenuSelectionRef.current.length > 0
      ? contextMenuSelectionRef.current
      : (canvas?.getActiveObject() ? [canvas.getActiveObject()!] : []);
    if (!canvas || !objects.length) {
      toast.error('Select something to add');
      return;
    }

    try {
      // Use the safe offscreen-canvas snapshot helper to avoid Fabric's live
      // canvas `clearRect` race when the live canvas is mid-render or being
      // torn down by React.
      let dataUrl: string;
      try {
        const snap = await snapshotSelection(canvas, objects as any[], {
          format: 'png',
          multiplier: 2,
        });
        dataUrl = snap.dataUrl;
      } catch (snapErr) {
        // Last-resort fallback: if it's a single image-like object, use its source URL directly.
        if (objects.length === 1) {
          dataUrl = await snapshotSingleImageOrSource(objects[0]);
        } else {
          throw snapErr;
        }
      }

      const first: any = objects[0];
      const id = first?.canvasObjectId || first?.id || `sel_${Date.now()}`;
      const name =
        first?.name ||
        first?.customName ||
        first?.artboardTitle ||
        (objects.length > 1 ? `Selection (${objects.length})` : 'Selection');

      const payload = {
        id,
        name,
        thumbnailUrl: dataUrl,
        imageUrl: dataUrl,
      };

      // Ensure the AI chat is mounted (it only renders when showAIChat is true).
      // Seed it with the right-clicked selection so the gating predicate passes,
      // then dispatch after React has committed and the listener is registered.
      const centerX = (canvas.getWidth?.() ?? canvas.width ?? 800) / 2;
      const centerY = (canvas.getHeight?.() ?? canvas.height ?? 600) / 2;
      setChatSelectedObjects(objects as any);
      setAIChatPosition({ x: centerX + 20, y: centerY - 200 });
      setShowAIChat(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('canvas:add-to-chat', { detail: payload }));
        });
      });
      toast.success('Added to chat');
    } catch (e: any) {
      console.error('Add to chat failed:', e);
      toast.error('Could not add selection — try again');
    }
  }, []);

  // ===== Export Selection =====
  const exportSelection = useCallback(async (format: 'png' | 'jpg' | 'svg') => {
    const canvas = fabricCanvasRef.current;
    const objects = contextMenuSelectionRef.current.length > 0
      ? contextMenuSelectionRef.current
      : (canvas?.getActiveObject() ? [canvas.getActiveObject()!] : []);
    if (!canvas || !objects.length) {
      toast.error('Select something to export');
      return;
    }

    try {
      const first: any = objects[0];
      const baseName = (first?.name || first?.customName || 'export').toString().replace(/[^a-z0-9-_]+/gi, '-');
      const ts = Date.now();

      if (format === 'svg') {
        // Use Fabric's SVG export scoped to the selection's bounding box
        const rects = objects.map((o: any) => o.getBoundingRect());
        const left = Math.min(...rects.map((r: any) => r.left));
        const top = Math.min(...rects.map((r: any) => r.top));
        const right = Math.max(...rects.map((r: any) => r.left + r.width));
        const bottom = Math.max(...rects.map((r: any) => r.top + r.height));
        const width = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);

        const inner = objects.map((o: any) => {
          try { return o.toSVG?.() ?? ''; } catch { return ''; }
        }).join('\n');
        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}">\n${inner}\n</svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}-${ts}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const snap = await snapshotSelection(canvas, objects as any[], {
          format: format === 'jpg' ? 'jpeg' : 'png',
          multiplier: 2,
        });
        const a = document.createElement('a');
        a.href = snap.dataUrl;
        a.download = `${baseName}-${ts}.${format}`;
        a.click();
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e: any) {
      console.error('Export failed:', e);
      toast.error(e?.message || 'Export failed');
    }
  }, []);


  // ===== Artboard right-click actions =====
  const handleArtboardRename = () => {
    const ab = selectedArtboard as any;
    if (!ab) return;
    const current = ab.artboardTitle || 'Untitled frame';
    const next = window.prompt('Frame name', current);
    if (!next || next.trim() === current) return;
    ab.artboardTitle = next.trim();
    ab.dirty = true;
    fabricCanvasRef.current?.requestRenderAll();
    if (ab.artboardId && onArtboardUpdate) {
      onArtboardUpdate(ab.artboardId, { title: next.trim() });
    }
    toast.success('Frame renamed');
  };

  const handleArtboardDuplicate = () => {
    const ab = selectedArtboard as any;
    const canvas = fabricCanvasRef.current;
    if (!ab || !canvas || !onNewArtboard) return;
    const offset = 40;
    onNewArtboard(
      '',
      `${(ab.artboardTitle || 'Frame')} copy`,
      (ab.left || 0) + (ab.width || 800) + offset,
      ab.top || 0,
      undefined,
      false,
      true,
      undefined,
      undefined,
      ab.width,
      ab.height,
    );
    toast.success('Frame duplicated');
  };

  const handleArtboardDelete = () => {
    const ab = selectedArtboard as any;
    if (!ab?.artboardId || !onArtboardDelete) return;
    onArtboardDelete(ab.artboardId);
    setSelectedArtboard(null);
  };

  const handleDuplicate = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleDuplicate called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => {
        obj.clone((cloned: any) => {
          cloned.set({
            left: (cloned.left || 0) + 10,
            top: (cloned.top || 0) + 10,
          });
          // CRITICAL: Set new canvasObjectId for cloned object
          cloned.isStandaloneObject = true;
          cloned.canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          canvas.add(cloned);
        });
      });
      
      canvas.renderAll();
      toast.success(`Duplicated ${objects.length} object(s)`);
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast.error('Failed to duplicate objects');
    }
  };

  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }
    
    const objects = contextMenuSelectionRef.current.length > 0 
      ? contextMenuSelectionRef.current 
      : getSelectedObjects();
    console.log('handleDelete called:', { objectCount: objects.length, usingRef: contextMenuSelectionRef.current.length > 0 });
    
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }
    
    try {
      objects.forEach(obj => {
        if (!(obj as any).isTitle && !(obj as any).isArtboard) {
          canvas.remove(obj);
        }
      });
      
      canvas.discardActiveObject();
      canvas.renderAll();
      toast.success(`Deleted ${objects.length} object(s)`);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete objects');
    }
  };


  return <ContextMenu>
    <ContextMenuTrigger asChild onContextMenu={(e: any) => {
      const canvas = fabricCanvasRef.current;
      // Capture pointer position in canvas (untransformed) coordinates for paste-at-cursor.
      try {
        if (canvas && e?.nativeEvent) {
          const pointer = canvas.getPointer(e.nativeEvent);
          lastContextMenuPosRef.current = { x: pointer.x, y: pointer.y };
        }
      } catch { /* ignore */ }

      // ARTBOARD FIX: detect right-click on a frame even when the user hasn't
      // selected it yet. Hit-test through Fabric's findTarget.
      try {
        if (canvas && e?.nativeEvent) {
          const target: any = canvas.findTarget(e.nativeEvent);
          if (target && (target.isArtboard || target.isTitle)) {
            const frame = target.isTitle
              ? canvas.getObjects().find((o: any) => o.isArtboard && o.artboardId === target.artboardId)
              : target;
            if (frame) {
              canvas.setActiveObject(frame);
              canvas.requestRenderAll();
              setSelectedArtboard(frame);
              setSelectedObject(null);
              contextMenuSelectionRef.current = [];
              setContextMenuObjects([]);
              setIsMultipleSelected(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('artboard right-click hit-test failed', err);
      }

      // Always use the pre-captured selection from mouse:down (before Fabric modifies it)
      const captured = contextMenuSelectionRef.current;
      if (captured.length > 0) {
        const activeObj = canvas?.getActiveObject();
        setSelectedArtboard(null);
        setSelectedObject(captured.length === 1 ? captured[0] : (activeObj || captured[0]));
        setIsMultipleSelected(captured.length >= 2);
        setContextMenuObjects(captured);
        return;
      }
      // Fallback: read current selection
      const activeObj = canvas?.getActiveObject();
      const objects = activeObj?.type === 'activeSelection'
        ? (activeObj as ActiveSelection).getObjects()
        : (activeObj ? [activeObj] : []);

      contextMenuSelectionRef.current = objects;
      setContextMenuObjects(objects);
      setIsMultipleSelected(objects.length >= 2);
      if (activeObj) setSelectedObject(activeObj);
    }}>
      <div ref={containerRef} className="w-full h-full relative" style={{
        backgroundColor: '#ffffff',
        touchAction: 'none'
      }}>
        <canvas ref={canvasRef} className="w-full h-full" />

        <ContextMenuContent
          className="w-60"
          onCloseAutoFocus={() => {
            contextMenuSelectionRef.current = [];
            setContextMenuObjects([]);
            setIsMultipleSelected(false);
          }}
        >
          {/* ===== ARTBOARD / FRAME RIGHT-CLICK MENU ===== */}
          {selectedArtboard && (
            <>
              <ContextMenuItem onClick={handleArtboardRename}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename frame
              </ContextMenuItem>
              <ContextMenuItem onClick={handleArtboardDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate frame
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => setShowArtboardExport(true)}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export frame…
              </ContextMenuItem>
              <ContextMenuItem
                onClick={async () => {
                  const ab = selectedArtboard as any;
                  if (!ab) return;
                  const title = ab.artboardTitle || 'frame';
                  const { downloadArtboardPNG } = await import('@/lib/canvas/artboardExport');
                  downloadArtboardPNG(
                    fabricCanvasRef.current!,
                    ab,
                    `${title}-${Date.now()}.png`,
                    2,
                  );
                }}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Quick export PNG
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleArtboardDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete frame
              </ContextMenuItem>
            </>
          )}

          {/* ===== OBJECT RIGHT-CLICK MENU ===== */}
          {selectedObject && !selectedArtboard && (
            <>
              {/* Clipboard */}
              <ContextMenuItem onClick={handleCutSelection}>
                <Scissors className="mr-2 h-4 w-4" />
                Cut
                <span className="ml-auto text-xs text-muted-foreground">⌘X</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopySelection}>
                <Clipboard className="mr-2 h-4 w-4" />
                Copy
                <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={handlePasteSelection}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Paste
                <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
                <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
              </ContextMenuItem>

              <ContextMenuSeparator />

              {/* Layer Order Submenu */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ChevronsUp className="mr-2 h-4 w-4" />
                  Layer Order
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={handleBringToFront}>
                    <ChevronsUp className="mr-2 h-4 w-4" />
                    Bring to Front
                  </ContextMenuItem>
                  <ContextMenuItem onClick={handleBringForward}>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Bring Forward
                  </ContextMenuItem>
                  <ContextMenuItem onClick={handleSendBackward}>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Send Backward
                  </ContextMenuItem>
                  <ContextMenuItem onClick={handleSendToBack}>
                    <ChevronsDown className="mr-2 h-4 w-4" />
                    Send to Back
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              {/* Flip submenu */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <FlipHorizontal2 className="mr-2 h-4 w-4" />
                  Flip
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => {
                    const canvas = fabricCanvasRef.current;
                    const active = canvas?.getActiveObject();
                    if (active) { active.set('flipX', !active.flipX); canvas?.requestRenderAll(); }
                  }}>
                    <FlipHorizontal2 className="mr-2 h-4 w-4" />
                    Flip Horizontal
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const canvas = fabricCanvasRef.current;
                    const active = canvas?.getActiveObject();
                    if (active) { active.set('flipY', !active.flipY); canvas?.requestRenderAll(); }
                  }}>
                    <FlipVertical2 className="mr-2 h-4 w-4" />
                    Flip Vertical
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSeparator />

              {/* Alignment and Distribute - Only show when multiple objects selected */}
              {isMultipleSelected && (
                <>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <AlignLeft className="mr-2 h-4 w-4" />
                      Align
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem onClick={handleAlignLeft}>
                        <AlignLeft className="mr-2 h-4 w-4" />Align Left
                      </ContextMenuItem>
                      <ContextMenuItem onClick={handleAlignCenter}>
                        <AlignCenter className="mr-2 h-4 w-4" />Align Center
                      </ContextMenuItem>
                      <ContextMenuItem onClick={handleAlignRight}>
                        <AlignRight className="mr-2 h-4 w-4" />Align Right
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={handleAlignTop}>
                        <AlignStartVertical className="mr-2 h-4 w-4" />Align Top
                      </ContextMenuItem>
                      <ContextMenuItem onClick={handleAlignMiddle}>
                        <AlignCenterVertical className="mr-2 h-4 w-4" />Align Middle
                      </ContextMenuItem>
                      <ContextMenuItem onClick={handleAlignBottom}>
                        <AlignEndVertical className="mr-2 h-4 w-4" />Align Bottom
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Columns3 className="mr-2 h-4 w-4" />
                      Distribute
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ContextMenuItem onClick={handleDistributeHorizontally}>
                        <Columns3 className="mr-2 h-4 w-4" />Distribute Horizontally
                      </ContextMenuItem>
                      <ContextMenuItem onClick={handleDistributeVertically}>
                        <Rows3 className="mr-2 h-4 w-4" />Distribute Vertically
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>

                  <ContextMenuSeparator />
                </>
              )}

              {/* Group/Ungroup Options */}
              {isMultipleSelected && (
                <ContextMenuItem onClick={handleGroupSelected}>
                  <Layers className="mr-2 h-4 w-4" />
                  Group
                  <span className="ml-auto text-xs text-muted-foreground">⌘G</span>
                </ContextMenuItem>
              )}
              {selectedObject?.type === 'group' && (
                <ContextMenuItem onClick={handleUngroupSelected}>
                  <Layers className="mr-2 h-4 w-4" />
                  Ungroup
                  <span className="ml-auto text-xs text-muted-foreground">⌘⇧G</span>
                </ContextMenuItem>
              )}

              {(isMultipleSelected || selectedObject?.type === 'group') && <ContextMenuSeparator />}

              {/* Boolean Operations */}
              {isMultipleSelected && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Merge className="mr-2 h-4 w-4" />
                    Boolean
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem onClick={() => handleBooleanOperation('union')}>
                      <Merge className="mr-2 h-4 w-4" />Union
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleBooleanOperation('subtract')}>
                      <Minus className="mr-2 h-4 w-4" />Subtract
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleBooleanOperation('intersect')}>
                      <Maximize2 className="mr-2 h-4 w-4" />Intersect
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleBooleanOperation('exclude')}>
                      <X className="mr-2 h-4 w-4" />Exclude
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}

              {/* Flatten */}
              {(selectedObject?.type === 'group' || selectedObject?.type === 'i-text' || selectedObject?.type === 'textbox' || selectedObject?.type === 'text' || isMultipleSelected) && (
                <ContextMenuItem onClick={handleFlatten}>
                  <Layers className="mr-2 h-4 w-4" />
                  Flatten
                </ContextMenuItem>
              )}

              {(isMultipleSelected || selectedObject?.type === 'group' || selectedObject?.type === 'i-text' || selectedObject?.type === 'textbox') && <ContextMenuSeparator />}

              {/* Save as Component */}
              <ContextMenuItem onClick={handleSaveAsComponent}>
                <img src={ComponentIconUrl} alt="" className="mr-2 h-4 w-4 [filter:var(--icon-filter,none)]" />
                Save as Component
              </ContextMenuItem>

              {/* Add to Chat */}
              <ContextMenuItem onClick={handleAddSelectionToChat}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Add to chat
              </ContextMenuItem>

              <ContextMenuSeparator />

              {/* Lock + Hide */}
              <ContextMenuItem onClick={handleToggleLock}>
                {(selectedObject as any)?.lockMovementX ? (
                  <><Unlock className="mr-2 h-4 w-4" />Unlock</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" />Lock</>
                )}
                <span className="ml-auto text-xs text-muted-foreground">⌘L</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={handleToggleVisibility}>
                {(selectedObject as any)?.visible === false ? (
                  <><Eye className="mr-2 h-4 w-4" />Show</>
                ) : (
                  <><EyeOff className="mr-2 h-4 w-4" />Hide</>
                )}
                <span className="ml-auto text-xs text-muted-foreground">⌘⇧H</span>
              </ContextMenuItem>

              <ContextMenuSeparator />

              {/* Export submenu */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => exportSelection('png')}>
                    <FileImage className="mr-2 h-4 w-4" />
                    PNG
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => exportSelection('jpg')}>
                    <FileImage className="mr-2 h-4 w-4" />
                    JPG
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => exportSelection('svg')}>
                    <FileCode className="mr-2 h-4 w-4" />
                    SVG
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSeparator />

              <ContextMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
                <span className="ml-auto text-xs text-muted-foreground">⌫</span>
              </ContextMenuItem>
            </>
          )}

          {/* ===== EMPTY-CANVAS RIGHT-CLICK MENU ===== */}
          {!selectedObject && !selectedArtboard && (
            <>
              <ContextMenuItem
                onClick={handlePasteSelection}
                disabled={!internalClipboardRef.current?.length}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Paste here
                <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
              </ContextMenuItem>
              {onOpenComponentsPanel && (
                <ContextMenuItem onClick={() => onOpenComponentsPanel()}>
                  <img src={ComponentIconUrl} alt="" className="mr-2 h-4 w-4 [filter:var(--icon-filter,none)]" />
                  Open Components…
                </ContextMenuItem>
              )}
            </>
          )}
        </ContextMenuContent>

      {/* Render generating artboard placeholders */}
      {generatingArtboards.map(placeholder => {
        // Calculate position with current viewport transform
        const canvas = fabricCanvasRef.current;
        const vpt = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        
        return (
          <div
            key={`placeholder-${placeholder.id}-${Date.now()}`}
            style={{
              position: 'absolute',
              left: `${placeholder.position_x * zoom + vpt[4]}px`,
              top: `${placeholder.position_y * zoom + vpt[5]}px`,
              width: `${placeholder.width * zoom}px`,
              height: `${placeholder.height * zoom}px`,
              pointerEvents: 'none',
              zIndex: 0  // PHASE 2: Changed from 1 to 0 (AI Designer has z-50)
            }}
          >
            <ArtboardLoadingState 
              width={placeholder.width}
              height={placeholder.height}
              zoom={zoom}
              title={placeholder.title}
            />
          </div>
        );
      })}
      
      {/* Pin Mode Indicator - REMOVED: Toast notification removed as per user request */}
      {/* The pin cursor on image hover is sufficient UX feedback */}
      
      {/* Visual Pin Markers on Canvas */}
      {pinTags.map(tag => {
        // Find the image object
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;
        
        const imageObj = canvas.getObjects().find((o: any) => 
          o.id === tag.imageObjectId || o.object_id === tag.imageObjectId || o.canvasObjectId === tag.imageObjectId
        );
        if (!imageObj) return null;
        
        // Calculate screen position from normalized coordinates
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const imageLeft = imageObj.left || 0;
        const imageTop = imageObj.top || 0;
        const imageWidth = (imageObj.width || 100) * (imageObj.scaleX || 1);
        const imageHeight = (imageObj.height || 100) * (imageObj.scaleY || 1);
        
        const worldX = imageLeft + tag.x * imageWidth;
        const worldY = imageTop + tag.y * imageHeight;
        
        const screenX = worldX * zoom + vpt[4];
        const screenY = worldY * zoom + vpt[5];
        
        return (
          <div
            key={tag.id}
            className="absolute pointer-events-none z-30"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {/* Pin SVG marker */}
            <svg width="28" height="36" viewBox="0 0 28 36" className="drop-shadow-md">
              <defs>
                <filter id={`shadow-${tag.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>
              <path 
                d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                fill="#3B82F6"
                filter={`url(#shadow-${tag.id})`}
              />
              <circle cx="14" cy="12" r="8" fill="white" />
              <text 
                x="14" 
                y="16" 
                textAnchor="middle" 
                fontSize="10" 
                fontWeight="600" 
                fill="#3B82F6"
              >
                {tag.number}
              </text>
            </svg>
            {/* Label tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 bg-zinc-900/90 text-white text-[10px] rounded whitespace-nowrap">
              {tag.isIdentifying ? 'Identifying...' : tag.label}
            </div>
          </div>
        );
      })}
      
      {/* PencilTool Component with dynamic width */}
      {isCanvasReady && <PencilTool 
        canvas={fabricCanvasRef.current} 
        isActive={activeTool === 'pencil'} 
        color="#000000"
        width={brushWidth}
        brushStyle={brushStyle}
        onStrokeComplete={onStrokeComplete}
      />}
      
      {/* Pen path outline when selected in select mode */}
      {isCanvasReady && activeTool === 'select' && selectedObject && (selectedObject as any).penToolData && (() => {
        const penData = (selectedObject as any).penToolData;
        const target = selectedObject;
        const originalLeft = penData.originalLeft ?? 0;
        const originalTop = penData.originalTop ?? 0;
        const deltaX = (target.left || 0) - originalLeft;
        const deltaY = (target.top || 0) - originalTop;
        const scaleX = target.scaleX || 1;
        const scaleY = target.scaleY || 1;
        const angleDeg = target.angle || 0;
        const angleRad = (angleDeg * Math.PI) / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        // Compute object center for rotation using Fabric's method (handles all originX/Y)
        const centerPt = target.getCenterPoint?.() || { x: (target.left || 0) + ((target.width || 0) * scaleX) / 2, y: (target.top || 0) + ((target.height || 0) * scaleY) / 2 };
        const objCenterX = centerPt.x;
        const objCenterY = centerPt.y;

        // Use Fabric's calcTransformMatrix for exact alignment
        const transformMatrix = target.calcTransformMatrix();
        const segs = JSON.parse(JSON.stringify(penData.segments)).map((seg: any) => {
          const tx = (pt: any) => {
            if (!pt) return null;
            // Transform from original path-local coords to world coords using Fabric's matrix
            // Path-local coords are relative to the path's original bounding box
            const localX = pt.x - originalLeft;
            const localY = pt.y - originalTop;
            // Fabric's transform matrix maps from object-local (centered) to world
            const objW = target.width || 1;
            const objH = target.height || 1;
            // Convert from top-left-origin local to center-origin local
            const centeredX = localX - objW / 2;
            const centeredY = localY - objH / 2;
            const localPt = new Point(centeredX, centeredY);
            const worldPt = localPt.transform(transformMatrix);
            return { x: worldPt.x, y: worldPt.y };
          };
          return { ...seg, anchor: tx(seg.anchor), handleIn: tx(seg.handleIn), handleOut: tx(seg.handleOut) };
        });
        const pathModel = { id: 'sel', closed: penData.closed, segments: segs };
        const d = generatePathD(pathModel);
        const canvas = fabricCanvasRef.current;
        const zoom = canvas?.getZoom() ?? 1;
        const vptX = canvas?.viewportTransform?.[4] ?? 0;
        const vptY = canvas?.viewportTransform?.[5] ?? 0;
        const invS = 1 / zoom;
        return (
          <svg
            width={containerRef.current?.offsetWidth ?? 0}
            height={containerRef.current?.offsetHeight ?? 0}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 25 }}
          >
            <g transform={`matrix(${zoom},0,0,${zoom},${vptX},${vptY})`}>
              <path d={d} fill="none" stroke="#0F8EFF" strokeWidth={1.5 * invS} strokeDasharray={`${4 * invS} ${3 * invS}`} />
              {segs.map((seg: any, i: number) => (
                <rect
                  key={i}
                  x={seg.anchor.x - 3 * invS}
                  y={seg.anchor.y - 3 * invS}
                  width={6 * invS}
                  height={6 * invS}
                  fill="white"
                  stroke="#0F8EFF"
                  strokeWidth={1.5 * invS}
                />
              ))}
            </g>
          </svg>
        );
      })()}

      {/* Corner Radius Overlay */}
      {isCanvasReady && activeTool === 'select' && selectedObject && (selectedObject as any).penToolData && (
        <CornerRadiusOverlay
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          containerWidth={containerRef.current?.offsetWidth ?? 0}
          containerHeight={containerRef.current?.offsetHeight ?? 0}
        />
      )}

      {/* Text on Path Overlay — renders ALL objects with textOnPath */}
      {isCanvasReady && (
        <TextOnPathOverlay
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          containerWidth={containerRef.current?.offsetWidth ?? 0}
          containerHeight={containerRef.current?.offsetHeight ?? 0}
        />
      )}

      {/* Text on Path Floating Panel — next to left toolbar */}
      {isCanvasReady && selectedObject && (selectedObject as any).textOnPath && (
        <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-50">
          <div className="bg-background rounded-2xl border border-border w-[280px] overflow-hidden animate-slide-in-left">
            <TextOnPathPanel
              selectedObject={selectedObject}
              canvas={fabricCanvasRef.current}
              onUpdate={handleUpdateProperties}
            />
          </div>
        </div>
      )}

      {/* Bézier Pen Tool SVG Overlay */}
      {isCanvasReady && (
        <BezierPenTool
          isActive={activeTool === 'pen'}
          viewport={{
            scale: fabricCanvasRef.current?.getZoom() ?? 1,
            offsetX: fabricCanvasRef.current?.viewportTransform?.[4] ?? 0,
            offsetY: fabricCanvasRef.current?.viewportTransform?.[5] ?? 0,
          }}
          containerWidth={containerRef.current?.offsetWidth ?? 0}
          containerHeight={containerRef.current?.offsetHeight ?? 0}
          onWheel={(e: WheelEvent) => {
            // Forward wheel events to canvas for zoom while drawing
            const canvas = fabricCanvasRef.current;
            if (canvas) {
              const canvasEl = canvas.getSelectionElement?.() || canvas.upperCanvasEl;
              if (canvasEl) {
                canvasEl.dispatchEvent(new WheelEvent('wheel', e));
              }
            }
          }}
        />
      )}

      {/* BUG FIX #5: Brush Control Panel moved to CanvasToolPanel sidebar flyout */}
      {isCanvasReady && activeTool === 'pencil' && (
        <BrushCursorPreview brushWidth={brushWidth} isActive={true} />
      )}
      
      {/* BUG FIX #6: Removed PencilToolEscapeHandler toast - ESC still works via keyboard handler */}
      
      {/* Color Properties Panel is rendered at the page level (Canvas.tsx) to avoid duplicate/incorrect visibility */}
      
      {/* Main Properties Panel - z-50 to appear above color panel */}
      {selectedObject && !selectedArtboard && !editTextMode && !mockupMode && (
        <div onContextMenu={(e) => e.stopPropagation()}>
          <PropertiesPanel 
            selectedObject={selectedObject} 
            canvas={fabricCanvasRef.current} 
            onDelete={handleDeleteSelected} 
            onDuplicate={handleDuplicateSelected} 
            onUpdate={handleUpdateProperties} 
            onNewArtboard={onNewArtboard}
            onEnterEditTextMode={() => {
              if (!selectedObject || !fabricCanvasRef.current) return;
              
              const canvas = fabricCanvasRef.current;
              const bounds = selectedObject.getBoundingRect();
              const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
              const zoom = vpt[0];
              
              // Get image URL
              const imageUrl = selectedObject.getSrc?.() || 
                selectedObject.toDataURL?.({ format: 'png', quality: 1 }) || '';
              
              // Position panel to the RIGHT of the image
              const panelX = (bounds.left + bounds.width) * zoom + vpt[4] + 20;
              const panelY = bounds.top * zoom + vpt[5];
              
              setEditTextMode({
                imageId: selectedObject.data?.object_id || selectedObject.id || 'temp',
                imageUrl,
                panelPosition: { x: panelX, y: panelY },
              });
            }}
            onEnterMockupMode={() => {
              if (!selectedObject || !fabricCanvasRef.current) return;
              
              const canvas = fabricCanvasRef.current;
              const bounds = selectedObject.getBoundingRect();
              const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
              const zoom = vpt[0];
              
              // Get image URL
              const imageUrl = selectedObject.getSrc?.() || 
                selectedObject.toDataURL?.({ format: 'png', quality: 1 }) || '';
              
              // Calculate screen position of image
              const imageBounds = {
                x: bounds.left * zoom + vpt[4],
                y: bounds.top * zoom + vpt[5],
                width: bounds.width * zoom,
                height: bounds.height * zoom,
              };
              
              setMockupMode({
                imageId: selectedObject.data?.object_id || selectedObject.id || 'temp',
                imageUrl,
                imageBounds,
              });
            }}
          />
        </div>
      )}
      
      {selectedArtboard && <div onContextMenu={(e) => e.stopPropagation()}><ArtboardDimensionsPanel width={(selectedArtboard as any).width || 800} height={(selectedArtboard as any).height || 600} onUpdate={handleArtboardDimensionUpdate} onDelete={handleDeleteSelected} onExport={() => setShowArtboardExport(true)} onExportPNG={async () => {
        try {
          const { downloadArtboardPNG } = await import('@/lib/canvas/artboardExport');
          const title = (selectedArtboard as any).artboardTitle || 'artboard';
          downloadArtboardPNG(fabricCanvasRef.current!, selectedArtboard as any, `${title}-${Date.now()}.png`, 2);
          toast.success('PNG downloaded');
        } catch (e: any) { toast.error(e?.message ?? 'PNG export failed'); }
      }} onExportSVG={async () => {
        try {
          const { exportArtboardAsSVG, downloadSVG } = await import('@/lib/canvas/artboardExport');
          const title = (selectedArtboard as any).artboardTitle || 'artboard';
          const svg = await exportArtboardAsSVG(fabricCanvasRef.current!, selectedArtboard as any);
          downloadSVG(svg, `${title}-${Date.now()}.svg`);
          toast.success('SVG downloaded');
        } catch (e: any) { toast.error(e?.message ?? 'SVG export failed'); }
      }} onOpenHistory={() => setShowVersionHistory(true)} backgroundColor={typeof (selectedArtboard as any).fill === 'string' ? (selectedArtboard as any).fill : '#ffffff'} onBackgroundColorChange={(color: string) => { (selectedArtboard as any).set({ fill: color }); (selectedArtboard as any).dirty = true; fabricCanvasRef.current?.requestRenderAll(); }} autoLayoutConfig={(selectedArtboard as any).autoLayoutConfig || null} onAutoLayoutChange={(config) => { const frame = selectedArtboard as any; frame.autoLayoutConfig = config; if (config?.enabled && fabricCanvasRef.current) { import('@/lib/canvas/autoLayout').then(({ applyAutoLayout }) => { applyAutoLayout(fabricCanvasRef.current!, frame); }); } fabricCanvasRef.current?.requestRenderAll(); }} /></div>}
      <ArtboardExportDialog open={showArtboardExport} onOpenChange={setShowArtboardExport} canvas={fabricCanvasRef.current} artboard={selectedArtboard} />
      <SaveCanvasComponentDialog
        open={showSaveComponentDialog}
        onOpenChange={setShowSaveComponentDialog}
        canvas={fabricCanvasRef.current}
        objects={saveComponentObjects}
        onSaved={() => {
          setSaveComponentObjects([]);
          onOpenComponentsPanel?.();
        }}
      />
      {projectId && (
        <CanvasVersionHistory
          projectId={projectId}
          artboardId={(selectedArtboard as any)?.id || (selectedArtboard as any)?.artboardId || null}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
          onRestore={async (snapshot) => {
            try {
              const ab = selectedArtboard as any;
              const artboardId = ab?.id || ab?.artboardId;
              const newImageUrl = snapshot?.image_url;
              if (!artboardId || !newImageUrl) {
                toast.error('Snapshot is missing image data');
                return;
              }
              const { error } = await supabase.from('artboards').update({ image_url: newImageUrl }).eq('id', artboardId);
              if (error) throw error;
              // Update fabric image in place
              if (ab && typeof ab.setSrc === 'function') {
                ab.setSrc(newImageUrl, () => fabricCanvasRef.current?.requestRenderAll());
              } else {
                fabricCanvasRef.current?.requestRenderAll();
              }
              toast.success('Artboard restored');
            } catch (e: any) {
              toast.error(e?.message ?? 'Restore failed');
            }
          }}
        />
      )}

      {projectId && (
        <CanvasVersionHistory
          projectId={projectId}
          artboardId={null}
          open={showProjectVersionHistory}
          onOpenChange={setShowProjectVersionHistory}
          onRestore={async (snapshot) => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) {
              toast.error('Canvas not ready');
              return;
            }
            try {
              const payload = snapshot?.kind === 'project' ? snapshot.canvas : snapshot;
              if (!payload) {
                toast.error('Snapshot has no canvas data');
                return;
              }
              await canvas.loadFromJSON(payload);
              canvas.requestRenderAll();
              toast.success('Project restored');
            } catch (e: any) {
              toast.error(e?.message ?? 'Restore failed');
            }
          }}
        />
      )}

      {/* Image Info Overlay - shows label and dimensions for standalone images */}
      {isCanvasReady && selectedObject && !(selectedObject as any).isVideo && (
        <ImageInfoOverlay 
          canvas={fabricCanvasRef.current} 
          selectedObject={selectedObject} 
        />
      )}

      {/* Video Info Overlay - shows label, dimensions, and duration badge for video objects */}
      {isCanvasReady && selectedObject && (selectedObject as any).isVideo && (
        <VideoInfoOverlay 
          canvas={fabricCanvasRef.current} 
          selectedObject={selectedObject} 
        />
      )}

      {/* Video Hover Overlay - HTML5 video that plays on hover over video objects */}
      {isCanvasReady && (
        <VideoHoverOverlay 
          canvas={fabricCanvasRef.current} 
          containerRef={containerRef}
        />
      )}

      {/* Image Action Toolbar - Full customizable toolbar above selected image */}
      {isCanvasReady && selectedObject && !editTextMode && !editElementsMode && !designAnalysisMode && !mockupMode && !motionStudioMode && !eraserMode && !adjustMode && !multiAnglesMode && !flipRotateMode && !moveObjectMode && (() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;
        
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;
        if ((activeObj as any).isVideo === true) return null;
        
        const objType = activeObj.type?.toLowerCase();
        const isFabricImage = objType === 'image' && !(activeObj as any).isSvgIcon;
        const isPlaceholder = (activeObj as any).isPlaceholder === true;
        const isMultiSelect = objType === 'activeselection';
        
        if (!isFabricImage || isPlaceholder || isMultiSelect) return null;
        
        const bounds = activeObj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const x = (bounds.left + bounds.width / 2) * zoom + vpt[4];
        const y = bounds.top * zoom + vpt[5] - 80;
        
        const getImageUrl = () => {
          const currentObj = canvas.getActiveObject();
          return currentObj ? ((currentObj as any).getSrc?.() || (currentObj as any).toDataURL?.({ format: 'png', quality: 1 }) || '') : '';
        };
        const getPanelPos = () => {
          const currentObj = canvas.getActiveObject();
          if (!currentObj) return { x: 0, y: 0 };
          const b = currentObj.getBoundingRect();
          const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const z = v[0];
          return {
            x: (b.left + b.width) * z + v[4] + 20,
            y: b.top * z + v[5],
          };
        };
        
        return (
          <ImageActionToolbar
            position={{ x, y }}
            onToolAction={(toolId) => {
              const currentObj = canvas.getActiveObject();
              if (!currentObj) return;
              const imageUrl = getImageUrl();
              const panelPos = getPanelPos();
              
              switch (toolId) {
                case 'edit-text':
                  setEditTextMode({ imageId: (currentObj as any).data?.object_id || 'temp', imageUrl, panelPosition: panelPos });
                  break;
                case 'edit-elements':
                  setEditElementsMode({ imageUrl, selectedObject: currentObj });
                  break;
                case 'analyse':
                  setDesignAnalysisMode({ imageUrl, selectedObject: currentObj });
                  break;
                case 'motion': {
                  const b = currentObj.getBoundingRect();
                  const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                  const z = v[0];
                  setMotionStudioMode({ imageUrl, selectedObject: currentObj, position: { x: (b.left + b.width / 2) * z + v[4], y: (b.top + b.height) * z + v[5] + 20 } });
                  break;
                }
                case 'adjust':
                  setAdjustMode({ position: panelPos });
                  break;
                case 'multi-angles':
                  setMultiAnglesMode({ imageUrl, position: panelPos });
                  break;
                case 'eraser':
                  setEraserMode(true);
                  break;
                case 'flip-rotate':
                  setFlipRotateMode({ position: panelPos });
                  break;
                case 'move-object':
                  setMoveObjectMode({ imageUrl, position: { x, y: y + 60 } });
                  break;
                case 'quick-edit':
                  // Trigger the floating edit chat (already handled by selection)
                  break;
                case 'mockup': {
                  const imgUrl = (currentObj as any).getSrc?.()
                    || (currentObj as any)._originalElement?.src
                    || (currentObj as any)._element?.src
                    || imageUrl;
                  if (imgUrl) {
                    const b = currentObj.getBoundingRect();
                    const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                    const z = v[0];
                    setMockupMode({
                      imageId: (currentObj as any).data?.object_id || 'temp',
                      imageUrl: imgUrl,
                      imageBounds: { x: b.left * z + v[4], y: b.top * z + v[5], width: b.width * z, height: b.height * z }
                    });
                  } else {
                    toast.error('Cannot open Mockup — image source unavailable');
                  }
                  break;
                }
                default:
                  // upscale, remove-bg, expand, crop, vector are handled in PropertiesPanel
                  // Dispatch a custom event so PropertiesPanel can pick it up
                  window.dispatchEvent(new CustomEvent('toolbar-action', { detail: { toolId } }));
                  break;
              }
            }}
            onDownload={() => {
              const currentObj = canvas.getActiveObject();
              if (!currentObj) return;
              const dataUrl = (currentObj as any).toDataURL?.({ format: 'png', quality: 1 });
              if (dataUrl) {
                const link = document.createElement('a');
                link.download = 'image.png';
                link.href = dataUrl;
                link.click();
              }
            }}
          />
        );
      })()}

      {/* Video Action Toolbar - Play & Download buttons above selected video */}
      {isCanvasReady && selectedObject && (selectedObject as any).isVideo && !videoEditMode && (() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;
        
        const activeObj = canvas.getActiveObject();
        if (!activeObj || !(activeObj as any).isVideo) return null;
        
        const bounds = activeObj.getBoundingRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = vpt[0];
        const x = (bounds.left + bounds.width / 2) * zoom + vpt[4];
        const y = bounds.top * zoom + vpt[5] - 48;
        
        return (
          <VideoActionToolbar
            position={{ x, y }}
            videoUrl={(activeObj as any).videoUrl || ''}
            videoTitle={(activeObj as any).title || 'video'}
            onQuickEdit={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              // Get position below the video for the chat
              const bounds = activeObj.getBoundingRect();
              const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
              const zoom = vpt[0];
              const chatX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
              const chatY = (bounds.top + bounds.height) * zoom + vpt[5] + 24;
              
              setVideoEditMode({
                videoUrl: (activeObj as any).videoUrl || '',
                videoObject: activeObj,
                position: { x: chatX, y: chatY }
              });
            }}
            onPlayFullscreen={() => {
              const videoUrl = (activeObj as any).videoUrl;
              if (videoUrl) {
                window.open(videoUrl, '_blank');
              }
            }}
          />
        );
      })()}

      {showChatButton && <button onClick={() => {
      // Calculate position near selected objects
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const selection = canvas.getActiveObject();
        if (selection) {
          const bounds = selection.getBoundingRect();
          const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
          const zoom = vpt[0];

          // Position chat below and centered to selection
          const PROMPT_BOX_WIDTH = 350;
          const selectedCenterX = (bounds.left + bounds.width / 2) * zoom + vpt[4];
          const selectedBottomY = (bounds.top + bounds.height) * zoom + vpt[5];
          // FIX: Pass center X directly - CSS translateX(-50%) handles centering
          setAIChatPosition({
            x: selectedCenterX,
            y: selectedBottomY + 24
          });
          
          // Auto-zoom to show element and prompt box
          focusOnElementWithPrompt(selection, canvas);
        }
      }
      setShowAIChat(true);
      setShowChatButton(false);
    }} style={{
      left: `${chatButtonPosition.x}px`,
      top: `${chatButtonPosition.y}px`,
      transform: 'translateX(-50%)',
      zIndex: 999
    }} className="absolute flex items-center gap-1.5 text-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm transition-colors bg-white/95 backdrop-blur-md font-medium hover:bg-zinc-50">
          <Zap className="w-3.5 h-3.5 text-blue-500" />
          Quick Edit
        </button>}

      {showAIChat && chatSelectedObjects.length > 0 && <CanvasAIChat 
        selectedObjects={chatSelectedObjects} 
        position={aiChatPosition} 
        projectId={projectId || ''} 
        placeholderMode={placeholderMode}
        onPlaceholderComplete={onPlaceholderComplete}
        selectedImageModel={selectedImageModel}
        onImageModelChange={onImageModelChange}
        canvasInstance={fabricCanvasRef.current}
        onAddImage={handleAddImage}
        onGenerationStateChange={setIsGeneratingImage}
        isPinMode={isPinMode}
        onPinModeChange={onPinModeChange}
        pinTags={pinTags}
        onPinTagsChange={onPinTagsChange}
        selectedFormat={selectedFormat}
        selectedResolution={selectedResolution}
        onFormatChange={onFormatChange}
        onResolutionChange={onResolutionChange}
        onClose={() => {
          setShowAIChat(false);
          setChatSelectedObjects([]);
          // DON'T clear isGeneratingImage - let generation continue even if chat is closed
          const canvas = fabricCanvasRef.current;
          if (canvas) {
            canvas.discardActiveObject();
            canvas.renderAll();
          }
        }} 
      />}

      {/* Generating Image Overlay - blur reveal effect during generation */}
      {isGeneratingImage && placeholderObject && overlayPosition && (
        <GeneratingImageOverlay
          isGenerating={isGeneratingImage}
          position={{
            x: overlayPosition.x,
            y: overlayPosition.y
          }}
          width={overlayPosition.width}
          height={overlayPosition.height}
          onComplete={() => setIsGeneratingImage(false)}
        />
      )}

      {/* Edit Text Mode - Floating Panel beside image */}
      {editTextMode && selectedObject && (
        <FloatingEditTextPanel
          position={editTextMode.panelPosition}
          imageUrl={editTextMode.imageUrl}
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          onApply={(newImageUrl) => {
            // Replace the image on canvas with the new one
            if (fabricCanvasRef.current && selectedObject) {
              FabricImage.fromURL(newImageUrl).then((img) => {
                if (!img || !fabricCanvasRef.current) return;
                
                img.set({
                  left: selectedObject.left,
                  top: selectedObject.top,
                  scaleX: selectedObject.scaleX,
                  scaleY: selectedObject.scaleY,
                  angle: selectedObject.angle,
                  data: selectedObject.data,
                });
                
                fabricCanvasRef.current.remove(selectedObject);
                fabricCanvasRef.current.add(img);
                fabricCanvasRef.current.setActiveObject(img);
                fabricCanvasRef.current.requestRenderAll();
                
                setSelectedObject(img);
              });
            }
            setEditTextMode(null);
          }}
          onCancel={() => setEditTextMode(null)}
        />
      )}

      {/* Mockup Mode - Surface overlay on image */}
      {mockupMode && (() => {
        // Locate the LOCKED base object by id (selection may have moved on).
        const baseId = mockupMode.imageId;
        const baseObj = (() => {
          const objs = fabricCanvasRef.current?.getObjects?.() || [];
          return objs.find((o: any) =>
            (o?.data?.object_id || o?.id) === baseId
          ) || selectedObject;
        })();
        if (!baseObj) return null;
        return (
          <MockupModeOverlay
            imageUrl={mockupMode.imageUrl}
            imageBounds={mockupMode.imageBounds}
            selectedObject={baseObj}
            canvas={fabricCanvasRef.current}
            onApply={() => {
              // Smart Layer flow only: createSmartMockupLayer adds a separate
              // editable FabricImage. We never replace the base mockup image.
              setMockupMode(null);
            }}
            onCancel={() => setMockupMode(null)}
          />
        );
      })()}

      {/* Edit Elements Panel - extract foreground + text */}
      {editElementsMode && selectedObject && (
        <FloatingEditElementsPanel
          imageUrl={editElementsMode.imageUrl}
          selectedObject={editElementsMode.selectedObject}
          canvas={fabricCanvasRef.current}
          onClose={() => setEditElementsMode(null)}
        />
      )}

       {/* Design Analysis Panel */}
       {designAnalysisMode && selectedObject && (
         <DesignAnalysisPanel
           imageUrl={designAnalysisMode.imageUrl}
           selectedObject={designAnalysisMode.selectedObject}
           canvas={fabricCanvasRef.current}
           onClose={() => setDesignAnalysisMode(null)}
         />
       )}

      {/* Motion Studio Panel */}
      {motionStudioMode && (
        <MotionStudioPanel
          imageUrl={motionStudioMode.imageUrl}
          selectedObject={motionStudioMode.selectedObject}
          position={motionStudioMode.position}
          onClose={() => setMotionStudioMode(null)}
        />
      )}

      {/* Adjust Panel */}
      {adjustMode && selectedObject && (
        <AdjustPanel
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          position={adjustMode.position}
          onClose={() => setAdjustMode(null)}
        />
      )}

      {/* Multi-Angles Panel */}
      {multiAnglesMode && selectedObject && (
        <MultiAnglesPanel
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          position={multiAnglesMode.position}
          imageUrl={multiAnglesMode.imageUrl}
          onClose={() => setMultiAnglesMode(null)}
        />
      )}

      {/* Eraser Overlay */}
      {eraserMode && selectedObject && (
        <EraserOverlay
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          onClose={() => setEraserMode(false)}
        />
      )}

      {/* Flip & Rotate Panel */}
      {flipRotateMode && selectedObject && (
        <FlipRotatePanel
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          position={flipRotateMode.position}
          onClose={() => setFlipRotateMode(null)}
        />
      )}

      {/* Move Object Dialog */}
      {moveObjectMode && selectedObject && (
        <MoveObjectDialog
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current}
          imageUrl={moveObjectMode.imageUrl}
          position={moveObjectMode.position}
          onClose={() => setMoveObjectMode(null)}
        />
      )}
 
      {/* Video Edit Mode - AI chat for regenerating/editing video */}
      {videoEditMode && (
        <VideoGeneratorChat
          selectedObjects={videoEditMode.videoObject ? [videoEditMode.videoObject] : []}
          onClose={() => setVideoEditMode(null)}
          position={videoEditMode.position}
          projectId={projectId || ''}
          canvasInstance={fabricCanvasRef.current}
          onVideoComplete={(videoUrl) => {
            // The VideoGeneratorChat already handles placing the video on canvas
            // Just close the edit mode
            setVideoEditMode(null);
          }}
          editMode={true}
          existingVideoUrl={videoEditMode.videoUrl}
        />
      )}

      {/* Artboard Info Overlay - shows label and dimensions for all frames */}
      {isCanvasReady && (
        <ArtboardInfoOverlay canvas={fabricCanvasRef.current} />
      )}

      {/* Gradient On-Canvas Overlay */}
      {isCanvasReady && selectedObject && (
        <GradientOverlay
          canvas={fabricCanvasRef.current}
          selectedObject={selectedObject}
        />
      )}

      {/* Placeholder Info Overlay - shows label and dimensions for Image Generator placeholder */}
      {isCanvasReady && imageGeneratorPlaceholder && (
        <PlaceholderInfoOverlay 
          canvas={fabricCanvasRef.current} 
          placeholder={imageGeneratorPlaceholder}
        />
      )}

      {/* Video Upload Progress Overlay */}
      <VideoUploadProgressOverlay 
        position={videoUploadProgress.position}
        progress={videoUploadProgress.progress}
        visible={videoUploadProgress.visible}
      />
      {/* Quick Comment Overlay */}
      {quickCommentPos && (
        <QuickCommentOverlay
          screenPosition={quickCommentPos}
          liveCursorPosition={liveCursorPos}
          canvas={fabricCanvasRef.current}
          onPost={(worldPos, text) => {
            setQuickCommentPos(null);
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;
            // Create comment pin: yellow circle + text label
            const pin = new Circle({
              radius: 10,
              fill: '#FBBF24',
              stroke: '#F59E0B',
              strokeWidth: 2,
              originX: 'center',
              originY: 'center',
            });
            const label = new IText(text, {
              fontSize: 12,
              fill: '#1F2937',
              fontFamily: 'Inter, sans-serif',
              left: 16,
              top: -8,
              backgroundColor: '#FEF3C7',
              padding: 4,
              editable: false,
              selectable: false,
            });
            const commentGroup = new Group([pin, label], {
              left: worldPos.x,
              top: worldPos.y,
              originX: 'center',
              originY: 'center',
              selectable: true,
              evented: true,
              hasControls: false,
              hasBorders: false,
              lockMovementX: false,
              lockMovementY: false,
            });
            (commentGroup as any).isComment = true;
            (commentGroup as any).commentText = text;
            (commentGroup as any).canvasObjectId = `comment_${Date.now()}`;
            canvas.add(commentGroup);
            canvas.requestRenderAll();
          }}
          onDismiss={() => setQuickCommentPos(null)}
        />
      )}
      </div>
    </ContextMenuTrigger>
  </ContextMenu>;
};
export default InfiniteCanvas;