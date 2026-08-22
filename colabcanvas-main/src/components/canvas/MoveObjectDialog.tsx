import { useState } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FabricImage } from 'fabric';

interface MoveObjectDialogProps {
  selectedObject: any;
  canvas: any;
  imageUrl: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const MoveObjectDialog = ({ selectedObject, canvas, imageUrl, position, onClose }: MoveObjectDialogProps) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      const movePrompt = `In this image, ${prompt.trim()}. Keep everything else exactly the same. Maintain the same image style, lighting, and quality.`;

      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl,
          prompt: movePrompt,
          originalWidth: selectedObject?.width * (selectedObject?.scaleX || 1),
          originalHeight: selectedObject?.height * (selectedObject?.scaleY || 1),
        },
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('No image returned');

      const newImg = await FabricImage.fromURL(data.imageUrl);
      if (!newImg || !canvas) return;

      newImg.set({
        left: selectedObject.left,
        top: selectedObject.top,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY,
        angle: selectedObject.angle,
        data: selectedObject.data,
      });

      canvas.remove(selectedObject);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();

      toast.success('Object moved successfully!');
      onClose();
    } catch (err: any) {
      console.error('[MoveObject] Error:', err);
      toast.error(err.message || 'Failed to move object');
    } finally {
      setIsProcessing(false);
    }
  };

  const panelX = Math.min(position.x, window.innerWidth - 320);
  const panelY = Math.max(20, Math.min(position.y + 10, window.innerHeight - 140));

  return (
    <div
      className="absolute z-[1001] w-[300px] bg-white/95 backdrop-blur-xl rounded-xl border border-zinc-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: `${panelX}px`, top: `${panelY}px`, transform: 'translateX(-50%)' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-800">Move Object</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3 h-3 text-zinc-400" />
        </Button>
      </div>

      <div className="p-3">
        <p className="text-[11px] text-zinc-400 mb-2">Describe what to move and where</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. move the car to the right side"
            className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-300"
            disabled={isProcessing}
            autoFocus
          />
          <Button size="sm" className="h-7 px-2" onClick={handleSubmit} disabled={isProcessing || !prompt.trim()}>
            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MoveObjectDialog;
