import { useState, useEffect, useRef } from 'react';
import { X, Type, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FabricImage } from 'fabric';

interface ExtractedText {
  id: string;
  originalText: string;
  newText: string;
  confidence: number;
}

interface FloatingEditTextPanelProps {
  position: { x: number; y: number };
  imageUrl: string;
  selectedObject: any;
  canvas?: any;
  onApply: (newImageUrl: string) => void;
  onCancel: () => void;
}

const FloatingEditTextPanel = ({
  position,
  imageUrl,
  selectedObject,
  canvas,
  onApply,
  onCancel,
}: FloatingEditTextPanelProps) => {
  const [extractedTexts, setExtractedTexts] = useState<ExtractedText[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  
  // CRITICAL: Use ref to prevent looping API calls
  const hasAnalyzedRef = useRef(false);
  const imageUrlRef = useRef(imageUrl);
  const onCancelRef = useRef(onCancel);

  // Keep refs updated
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Extract text on mount - ONLY ONCE
  useEffect(() => {
    // Guard: only analyze once per component lifecycle
    if (hasAnalyzedRef.current) {
      console.log('[EditText] Skipping - already analyzed');
      return;
    }
    
    if (!imageUrl) {
      console.log('[EditText] No image URL');
      return;
    }

    // Mark as analyzed immediately to prevent re-runs
    hasAnalyzedRef.current = true;
    imageUrlRef.current = imageUrl;

    const extractText = async () => {
      try {
        setIsAnalyzing(true);
        console.log('[EditText] Starting text extraction...');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to use this feature');
          onCancelRef.current();
          return;
        }

        // Credit check only (no frontend deduction - backend handles it)
        const { data: creditData } = await supabase
          .from('credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!creditData || creditData.balance < 5) {
          toast.error('Not enough credits (5 required)');
          onCancelRef.current();
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('extract-text', {
          body: { imageUrl: imageUrlRef.current },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });

        if (error) throw error;

        const texts = (data?.texts || []).map((t: any, i: number) => ({
          id: `text-${i}`,
          originalText: t.text,
          newText: t.text,
          confidence: t.confidence || 0.9,
        }));

        console.log('[EditText] Extracted texts:', texts.length);
        setExtractedTexts(texts);
        
        if (texts.length === 0) {
          toast.info('No text detected in this image');
        }
      } catch (error) {
        console.error('[EditText] Failed to extract text:', error);
        toast.error('Failed to extract text from image');
      } finally {
        setIsAnalyzing(false);
      }
    };

    extractText();
  }, []); // Empty deps - only run once on mount

  const handleTextChange = (id: string, newText: string) => {
    setExtractedTexts(prev =>
      prev.map(t => (t.id === id ? { ...t, newText } : t))
    );
  };

  // PRODUCTION-READY: Use replace-text edge function for proper text replacement
  const handleApply = async () => {
    const changes = extractedTexts.filter(t => t.originalText !== t.newText);
    if (changes.length === 0) {
      toast.info('No changes to apply');
      return;
    }

    try {
      setIsApplying(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      console.log('[EditText] Calling replace-text with', changes.length, 'changes');

      // Use the dedicated replace-text edge function
      const { data, error } = await supabase.functions.invoke('replace-text', {
        body: { 
          imageUrl: imageUrlRef.current,
          replacements: extractedTexts.map(t => ({
            id: t.id,
            originalText: t.originalText,
            newText: t.newText,
          }))
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error('[EditText] replace-text error:', error);
        throw error;
      }

      console.log('[EditText] Response data:', data);

      // replace-text returns { imageUrl: string, creditsUsed: number, replacementsApplied: number }
      const newImageUrl = data?.imageUrl;
      
      if (!newImageUrl) {
        console.error('[EditText] No image URL in response:', data);
        throw new Error('No image returned from text replacement');
      }

      console.log('[EditText] Received new image URL, length:', newImageUrl.length);

      // Add new image to canvas as standalone object
      if (canvas && selectedObject) {
        console.log('[EditText] Loading image from URL...');
        
        try {
          const img = await FabricImage.fromURL(newImageUrl, { crossOrigin: 'anonymous' });
          
          if (img) {
            console.log('[EditText] Image loaded successfully, dimensions:', img.width, 'x', img.height);
            
            img.set({
              left: (selectedObject.left || 0) + 30,
              top: (selectedObject.top || 0) + 30,
              scaleX: selectedObject.scaleX,
              scaleY: selectedObject.scaleY,
            });
            (img as any).isStandaloneObject = true;
            (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            canvas.add(img);
            canvas.requestRenderAll();
            
            console.log('[EditText] Image added to canvas successfully');
            
            // Update the texts to reflect the changes (user can continue editing)
            setExtractedTexts(prev => 
              prev.map(t => ({ ...t, originalText: t.newText }))
            );
            
            // Update internal reference for future edits
            imageUrlRef.current = newImageUrl;
            
            toast.success(`Text updated! ${data.replacementsApplied || changes.length} change(s) applied.`);
          } else {
            throw new Error('FabricImage.fromURL returned null');
          }
        } catch (imgError) {
          console.error('[EditText] Failed to load image:', imgError);
          throw new Error('Failed to load generated image onto canvas');
        }
      } else {
        console.warn('[EditText] No canvas or selectedObject available');
        toast.success('Text updated! (Canvas not available for display)');
      }
    } catch (error) {
      console.error('[EditText] Failed to replace text:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update text');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRetry = () => {
    hasAnalyzedRef.current = false;
    setExtractedTexts([]);
    setIsAnalyzing(true);
    
    // Re-run extraction
    const extractText = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('extract-text', {
          body: { imageUrl: imageUrlRef.current },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });

        if (error) throw error;

        const texts = (data?.texts || []).map((t: any, i: number) => ({
          id: `text-${i}`,
          originalText: t.text,
          newText: t.text,
          confidence: t.confidence || 0.9,
        }));

        setExtractedTexts(texts);
        if (texts.length === 0) {
          toast.info('No text detected in this image');
        }
      } catch (error) {
        console.error('[EditText] Retry failed:', error);
        toast.error('Failed to extract text');
      } finally {
        setIsAnalyzing(false);
        hasAnalyzedRef.current = true;
      }
    };

    extractText();
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate safe position
  const safeX = Math.min(position.x, window.innerWidth - 320);
  const safeY = Math.max(position.y, 80);

  const hasChanges = extractedTexts.some(t => t.originalText !== t.newText);

  return (
    <>
      {/* Top notification bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur-sm rounded-lg border animate-in fade-in slide-in-from-top-4 duration-200">
        <Type className="w-4 h-4 text-primary" />
        <span className="text-sm text-foreground">Edit text from the image.</span>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground">Esc</kbd>
        <span className="text-sm text-muted-foreground">to exit.</span>
      </div>

      {/* Floating panel beside the image */}
      <div
        className="fixed z-[55] w-72 bg-background/95 backdrop-blur-xl border rounded-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200"
        style={{
          left: `${safeX}px`,
          top: `${safeY}px`,
        }}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold">Edit Text</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-accent text-accent-foreground rounded-full">BETA</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="max-h-72 overflow-y-auto p-3">
          <div className="space-y-2">
            {isAnalyzing ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2.5 bg-muted rounded-lg border"
                  >
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    <div className="flex-1 h-4 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                ))}
                <p className="text-xs text-center text-muted-foreground mt-2">5 credits</p>
              </>
            ) : extractedTexts.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground text-sm">No text detected in this image</p>
                <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            ) : (
              extractedTexts.map((text, index) => (
                <div key={text.id} className="space-y-1">
                  <label className="text-xs text-muted-foreground truncate block max-w-full">
                    {text.originalText.length > 35 ? text.originalText.substring(0, 35) + '...' : text.originalText}
                  </label>
                  <Input
                    value={text.newText}
                    onChange={(e) => handleTextChange(text.id, e.target.value)}
                    onKeyDown={(e) => {
                      // Prevent spacebar from triggering canvas panning
                      if (e.key === ' ' || e.key === 'Spacebar') {
                        e.stopPropagation();
                      }
                    }}
                    className="bg-muted border focus:border-primary h-9"
                    placeholder={text.originalText}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isApplying || isAnalyzing || extractedTexts.length === 0 || !hasChanges}
            className="gap-1.5"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate
                <span className="text-xs opacity-70 ml-1">10</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default FloatingEditTextPanel;
