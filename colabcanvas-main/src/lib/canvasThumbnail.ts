import { supabase } from "@/integrations/supabase/client";
import { isDragInProgress } from "./canvas/frameReparenting";

/**
 * Generate a thumbnail from canvas data or artboards
 */
export async function generateCanvasThumbnail(
  projectId: string,
  canvasElement?: HTMLCanvasElement | null,
  artboards?: any[],
  canvasObjects?: any[]
): Promise<string | null> {
  try {
    // Skip thumbnail generation during active drag operations
    if (isDragInProgress()) return null;

    if (canvasElement) {
      const dataUrl = canvasElement.toDataURL('image/png', 0.5);
      
      if (dataUrl.length > 5000) {
        await supabase.from('projects').update({
          thumbnail_url: dataUrl
        }).eq('id', projectId);
        
        return dataUrl;
      }
    }

    if (artboards && artboards.length > 0) {
      const firstArtboardWithImage = artboards.find(ab => ab.image_url);
      if (firstArtboardWithImage) {
        await supabase.from('projects').update({
          thumbnail_url: firstArtboardWithImage.image_url
        }).eq('id', projectId);
        
        return firstArtboardWithImage.image_url;
      }
    }

    if (canvasObjects && canvasObjects.length > 0) {
      const firstImageObject = canvasObjects.find(obj => obj.object_type === 'image' && obj.object_data?.src);
      if (firstImageObject) {
        await supabase.from('projects').update({
          thumbnail_url: firstImageObject.object_data.src
        }).eq('id', projectId);
        
        return firstImageObject.object_data.src;
      }
    }

    return null;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Update thumbnail periodically with change detection.
 * Skips updates during active drag/manipulation.
 */
export function setupThumbnailAutoUpdate(
  projectId: string,
  getCanvasElement: () => HTMLCanvasElement | null,
  getArtboards: () => any[],
  getCanvasObjects: () => any[]
) {
  let lastContentHash = '';
  
  const updateWithChangeDetection = async () => {
    // Skip during active manipulation
    if (isDragInProgress()) return;

    const canvas = getCanvasElement();
    const artboards = getArtboards();
    const objects = getCanvasObjects();
    
    const contentHash = JSON.stringify({
      artboardCount: artboards.length,
      objectCount: objects.length,
      canvasData: canvas?.toDataURL()?.substring(0, 100)
    });
    
    if (contentHash !== lastContentHash) {
      await generateCanvasThumbnail(projectId, canvas, artboards, objects);
      lastContentHash = contentHash;
    }
  };
  
  // 15s interval — less aggressive
  const intervalId = setInterval(updateWithChangeDetection, 15000);
  
  return () => clearInterval(intervalId);
}
