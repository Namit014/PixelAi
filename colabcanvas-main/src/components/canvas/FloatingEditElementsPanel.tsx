import { useState, useEffect, useRef } from 'react';
import { X, Layers, Loader2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FabricImage, Textbox } from 'fabric';
import { removeBackgroundWithMask } from '@/lib/removeBackground';

interface FloatingEditElementsPanelProps {
  imageUrl: string;
  selectedObject: any;
  canvas: any;
  onClose: () => void;
}

/**
 * Convert an HTMLImageElement to base64 data URL
 */
const imageElementToBase64 = (img: HTMLImageElement): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png', 1.0));
    } else {
      resolve('');
    }
  });
};

/**
 * Load an image from a URL/base64
 */
const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Map AI-suggested font family to actual font
 */
const mapFontFamily = (fontFamily: string): string => {
  switch (fontFamily) {
    case 'sans-serif': return 'Arial';
    case 'serif': return 'Times New Roman';
    case 'script': return 'Brush Script MT';
    case 'monospace': return 'Courier New';
    default: return 'Arial';
  }
};

const FloatingEditElementsPanel = ({
  imageUrl,
  selectedObject,
  canvas,
  onClose,
}: FloatingEditElementsPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const hasProcessedRef = useRef(false);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleExtractSubject = async () => {
    if (hasProcessedRef.current || !canvas || !selectedObject) return;
    hasProcessedRef.current = true;
    
    setIsProcessing(true);
    const loadingToast = toast.loading('Step 1/4: Preparing...');

    try {
      // Check user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to use this feature', { id: loadingToast });
        hasProcessedRef.current = false;
        onClose();
        return;
      }

      // Get original position and dimensions
      const originalLeft = selectedObject.left || 0;
      const originalTop = selectedObject.top || 0;
      const originalScaleX = selectedObject.scaleX || 1;
      const originalScaleY = selectedObject.scaleY || 1;
      const imgWidth = selectedObject.width || 100;
      const imgHeight = selectedObject.height || 100;
      const scaledWidth = imgWidth * originalScaleX;
      const scaledHeight = imgHeight * originalScaleY;
      const layerSpacing = scaledWidth + 30;

      // Get image element
      const imgElement = selectedObject._originalElement || selectedObject._element;

      if (!imgElement) {
        toast.error('Could not access image data', { id: loadingToast });
        hasProcessedRef.current = false;
        onClose();
        return;
      }

      // ========================================
      // STEP 1: AI CLEANUP on ORIGINAL image (with background)
      // ========================================
      toast.loading('Extracting subject with AI...', { id: loadingToast });
      
      let subjectBlob: Blob;
      
      try {
        const result = await removeBackgroundWithMask(imgElement);
        subjectBlob = result.blob;
        console.log('[ExtractSubject] ✅ RMBG applied successfully');
      } catch (rmbgError) {
        console.error('[ExtractSubject] RMBG failed:', rmbgError);
        toast.error('Failed to extract subject', { id: loadingToast });
        hasProcessedRef.current = false;
        onClose();
        return;
      }

      // Add subject to canvas
      const subjectUrl = URL.createObjectURL(subjectBlob);
      
      try {
        const fgImg = await FabricImage.fromURL(subjectUrl, { crossOrigin: 'anonymous' });
        
        if (!fgImg) {
          throw new Error('Failed to create image from result');
        }
        
        const scaleX = scaledWidth / (fgImg.width || 1);
        const scaleY = scaledHeight / (fgImg.height || 1);
        
        fgImg.set({
          left: originalLeft + layerSpacing,
          top: originalTop,
          scaleX,
          scaleY,
          name: 'Extracted Subject',
        });
        
        (fgImg as any).isStandaloneObject = true;
        (fgImg as any).canvasObjectId = `subject_${Date.now()}`;
        
        canvas.add(fgImg);
        console.log('[ExtractSubject] ✅ Subject added to canvas');
        
      } catch (canvasError) {
        console.error('[ExtractSubject] Canvas error:', canvasError);
        toast.error('Failed to add subject to canvas', { id: loadingToast });
        hasProcessedRef.current = false;
        onClose();
        return;
      }

      // ========================================
      // STEP 3: OCR on ORIGINAL image
      // ========================================
      toast.loading('Step 3/4: Extracting text...', { id: loadingToast });
      
      let extractedTexts: any[] = [];
      
      try {
        const { data: textData, error: textError } = await supabase.functions.invoke('extract-text', {
          body: { imageUrl: originalBase64 }
        });
        
        if (textError) {
          console.warn('[ExtractSubject] OCR failed:', textError);
        } else if (textData?.texts?.length > 0) {
          extractedTexts = textData.texts;
          console.log('[ExtractSubject] ✅ Extracted', extractedTexts.length, 'text elements');
        }
      } catch (ocrError) {
        console.warn('[ExtractSubject] OCR error:', ocrError);
      }

      // ========================================
      // STEP 4: Create editable Textbox objects
      // ========================================
      if (extractedTexts.length > 0) {
        toast.loading('Step 4/4: Creating text layers...', { id: loadingToast });
        
        for (const textItem of extractedTexts) {
          try {
            // Convert percentage bounding box to pixel position
            const pixelX = (textItem.boundingBox.x / 100) * imgWidth;
            const pixelY = (textItem.boundingBox.y / 100) * imgHeight;
            const pixelWidth = (textItem.boundingBox.width / 100) * imgWidth * 1.2; // 20% padding
            
            // Calculate font size from image height ratio
            const fontSize = (textItem.fontSizeRatio / 100) * imgHeight;
            
            // Create editable Textbox positioned next to subject
            const textbox = new Textbox(textItem.text, {
              left: originalLeft + layerSpacing + pixelX * originalScaleX,
              top: originalTop + pixelY * originalScaleY,
              width: pixelWidth * originalScaleX,
              fontSize: fontSize * originalScaleY,
              fontFamily: mapFontFamily(textItem.fontFamily),
              fill: textItem.color || '#000000',
              fontWeight: textItem.bold ? 'bold' : 'normal',
              fontStyle: textItem.italic ? 'italic' : 'normal',
              textAlign: textItem.textAlign || 'left',
            });
            
            (textbox as any).isStandaloneObject = true;
            (textbox as any).canvasObjectId = `text_${Date.now()}_${textItem.id || Math.random().toString(36).substr(2, 9)}`;
            
            canvas.add(textbox);
          } catch (textboxError) {
            console.warn('[ExtractSubject] Failed to create textbox:', textboxError);
          }
        }
        
        console.log('[ExtractSubject] ✅ Added', extractedTexts.length, 'text layers');
      }

      // Final render
      canvas.requestRenderAll();
      
      const textCount = extractedTexts.length;
      if (textCount > 0) {
        toast.success(`Extracted subject + ${textCount} text layer${textCount > 1 ? 's' : ''}!`, { id: loadingToast });
      } else {
        toast.success('Subject extracted! No text detected.', { id: loadingToast });
      }

      // Close panel after success
      setTimeout(() => onClose(), 1000);

    } catch (error) {
      console.error('[ExtractSubject] Failed:', error);
      toast.error('Failed to extract elements', { id: loadingToast });
      hasProcessedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate position near the image
  const getPosition = () => {
    if (!canvas || !selectedObject) return { x: 100, y: 100 };
    const bounds = selectedObject.getBoundingRect();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = vpt[0];
    return {
      x: Math.min((bounds.left + bounds.width) * zoom + vpt[4] + 20, window.innerWidth - 280),
      y: Math.max(bounds.top * zoom + vpt[5], 80),
    };
  };

  const position = getPosition();

  return (
    <>
      {/* Floating panel */}
      <div
        className="fixed z-[55] w-64 bg-background/95 backdrop-blur-xl border rounded-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold">Extract Elements</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-accent text-accent-foreground rounded-full">BETA</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Extract subject with transparent background and convert text to editable layers.
          </p>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">Deep image analysis</span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">AI-powered text cleanup</span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">Precise subject extraction</span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">Text to editable layers</span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">Final compositing</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground/70">
            Uses 15 credits (10 cleanup + 5 OCR)
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExtractSubject}
            disabled={isProcessing}
            className="gap-1.5"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                Extract
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default FloatingEditElementsPanel;
