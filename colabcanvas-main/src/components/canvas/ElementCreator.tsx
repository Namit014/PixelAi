import { Canvas as FabricCanvas, IText, FabricImage, Path } from 'fabric';
import { generatePathD } from '@/lib/penTool/geometry';
import type { Segment } from '@/lib/penTool/geometry';
import {
  circleToSegments,
  rectangleToSegments,
  type ShapeMeta,
} from '@/lib/penTool/shapeToPath';
import { createDefaultStrokeConfig } from '@/lib/strokeEngine/types';
import type { StrokeConfig } from '@/lib/strokeEngine/types';
import { FrameContainer } from '@/lib/canvas/FrameContainer';
import { applyFrameClip } from '@/lib/canvas/frameReparenting';

function buildPathFromSegments(
  segments: Segment[],
  opts: { fill: string; stroke: string; strokeWidth: number; shapeMeta: ShapeMeta; strokeConfig?: StrokeConfig },
): Path {
  const pathD = generatePathD({ id: '', closed: true, segments });
  const path = new Path(pathD, {
    fill: opts.fill,
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    strokeUniform: true,
    objectCaching: false,
  });
  const pathOffset = (path as any).pathOffset || { x: 0, y: 0 };
  (path as any).penToolData = {
    segments,
    closed: true,
    originalLeft: 0,
    originalTop: 0,
    pathOffsetX: pathOffset.x,
    pathOffsetY: pathOffset.y,
    strokeColor: opts.stroke,
    fillColor: opts.fill,
    strokeWidth: opts.strokeWidth,
    shapeMeta: opts.shapeMeta,
    strokeConfig: opts.strokeConfig || createDefaultStrokeConfig(),
  };
  return path;
}

export const createElement = async (
  canvas: FabricCanvas,
  type: string,
  position?: { x: number; y: number },
  artboards?: any[],
  onPathDrawing?: (drawing: boolean) => void
) => {
  let x = position?.x || 100;
  let y = position?.y || 100;

  // Find which FrameContainer this position is in
  let targetFrame: FrameContainer | null = null;
  const allObjects = canvas.getObjects();
  for (let i = allObjects.length - 1; i >= 0; i--) {
    const obj = allObjects[i];
    if (obj instanceof FrameContainer && obj.containsWorldPoint(x, y)) {
      targetFrame = obj;
      break;
    }
  }

  // If inside a frame, center within it
  if (targetFrame) {
    const bounds = targetFrame.getFrameBounds();
    x = bounds.left + bounds.width / 2;
    y = bounds.top + bounds.height / 2;
  }

  const addObjectToCanvas = (obj: any) => {
    if (!(obj as any).canvasObjectId) {
      const uniqueId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      (obj as any).id = uniqueId;
      (obj as any).canvasObjectId = uniqueId;
    }

    // Always add as top-level canvas object (flat model)
    (obj as any).isStandaloneObject = true;
    obj.set({ selectable: true, evented: true });
    
    if (targetFrame) {
      // Set metadata + clipPath (object stays top-level)
      applyFrameClip(obj, targetFrame);
    }
    
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    canvas.fire('object:added', { target: obj });
  };

  switch (type) {
    case 'rectangle': {
      const w = 200, h = 150;
      const segments = rectangleToSegments(w, h, 8);
      const rect = buildPathFromSegments(segments, {
        fill: '#8B5CF6', stroke: '#6D28D9', strokeWidth: 2,
        shapeMeta: { type: 'rectangle', width: w, height: h, cornerRadius: 8 },
      });
      rect.set({ left: x - w / 2, top: y - h / 2 });
      addObjectToCanvas(rect);
      break;
    }

    case 'circle': {
      const r = 75;
      const segments = circleToSegments(r, r, r);
      const circle = buildPathFromSegments(segments, {
        fill: '#EC4899', stroke: '#DB2777', strokeWidth: 2,
        shapeMeta: { type: 'circle', outerRadius: r },
      });
      circle.set({ left: x - r, top: y - r });
      addObjectToCanvas(circle);
      break;
    }

    case 'text': {
      const text = new IText('Double-click to edit', {
        fontSize: 24,
        fill: '#1F2937',
        fontFamily: 'system-ui, sans-serif',
        originX: 'left',
        originY: 'top',
        clipPath: undefined,
        padding: 10,
        selectable: true,
        editable: true,
        lockMovementX: false,
        lockMovementY: false,
      });
      const textWidth = text.width || 150;
      const textHeight = text.height || 30;
      text.set({ left: x - textWidth / 2, top: y - textHeight / 2 });
      addObjectToCanvas(text);
      break;
    }

    case 'image': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const MAX_SIZE_MB = 100;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          const toast = await import('sonner');
          toast.toast.error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_SIZE_MB}MB.`);
          return;
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `canvas-images/${fileName}`;

          const { toast: toastLib } = await import('sonner');
          const uploadToast = toastLib.loading('Uploading image...');

          const { data: uploadData, error: uploadError } = await (await import('@/integrations/supabase/client')).supabase
            .storage.from('design-assets').upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            toastLib.error(`Failed to upload image: ${uploadError.message || 'Unknown error'}`, { id: uploadToast });
            return;
          }
          toastLib.success('Image uploaded successfully!', { id: uploadToast });

          const { data: urlData, error: urlError } = await (await import('@/integrations/supabase/client')).supabase
            .storage.from('design-assets').createSignedUrl(uploadData.path, 3600);

          if (urlError || !urlData?.signedUrl) {
            toastLib.error('Failed to generate access URL', { id: uploadToast });
            return;
          }

          const img = await FabricImage.fromURL(urlData.signedUrl, { crossOrigin: 'anonymous' });
          (img as any).imageUrl = urlData.signedUrl;
          (img as any).canvasFilePath = uploadData.path;
          (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

          const maxDim = 400;
          const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1), 1);
          img.set({ scaleX: scale, scaleY: scale });

          const imgWidth = (img.width || 0) * scale;
          const imgHeight = (img.height || 0) * scale;
          img.set({ left: x - imgWidth / 2, top: y - imgHeight / 2 });
          addObjectToCanvas(img);
          canvas.renderAll();
        } catch (error) {
          console.error('Error handling image upload:', error);
          const toast = await import('sonner');
          toast.toast.error('Failed to upload image. Please try again.');
        }
      };
      input.click();
      break;
    }

    case 'pen': {
      if (onPathDrawing) onPathDrawing(true);
      break;
    }
  }

  canvas.renderAll();
};
