import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon, X } from 'lucide-react';
interface CanvasAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  imageUrl: string;
}
interface AssetTaggingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: CanvasAsset) => void;
  searchQuery: string;
  canvasInstance: any | null;
  anchorPosition?: {
    left: number;
    bottom: number;
  };
}
export function AssetTaggingPopup({
  isOpen,
  onClose,
  onSelectAsset,
  searchQuery,
  canvasInstance,
  anchorPosition
}: AssetTaggingPopupProps) {
  const [assets, setAssets] = useState<CanvasAsset[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);

  // Get all image objects from canvas (including nested in groups/artboards)
  useEffect(() => {
    if (!isOpen || !canvasInstance) return;
    const imageObjects: CanvasAsset[] = [];
    const usedNames = new Set<string>();
    let imageCounter = 0;

    // Helper to generate unique name
    const generateUniqueName = (obj: any): string => {
      // Try existing name
      if (obj.name && !usedNames.has(obj.name)) {
        usedNames.add(obj.name);
        return obj.name;
      }
      if (obj.customName && !usedNames.has(obj.customName)) {
        usedNames.add(obj.customName);
        return obj.customName;
      }

      // Try to extract name from source URL
      const src = obj._element?.src || obj.getSrc?.() || '';
      if (src && !src.startsWith('data:')) {
        try {
          const urlPath = new URL(src).pathname;
          const fileName = urlPath.split('/').pop()?.split('.')[0];
          if (fileName && fileName.length > 2 && fileName.length < 30) {
            const cleanName = fileName.replace(/[-_]/g, ' ').replace(/\d+$/, '').trim();
            if (cleanName && !usedNames.has(cleanName)) {
              usedNames.add(cleanName);
              return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            }
          }
        } catch {}
      }

      // Generate descriptive name based on dimensions and position
      const width = Math.round((obj.width || 100) * (obj.scaleX || 1));
      const height = Math.round((obj.height || 100) * (obj.scaleY || 1));
      const aspectRatio = width / height;
      let sizeLabel = 'Medium';
      if (width > 800 || height > 800) sizeLabel = 'Large';else if (width < 200 && height < 200) sizeLabel = 'Small';
      let shapeLabel = 'image';
      if (aspectRatio > 1.5) shapeLabel = 'wide';else if (aspectRatio < 0.67) shapeLabel = 'tall';else if (aspectRatio > 0.9 && aspectRatio < 1.1) shapeLabel = 'square';

      // Create unique name with counter
      imageCounter++;
      let baseName = `${sizeLabel} ${shapeLabel} #${imageCounter}`;
      usedNames.add(baseName);
      return baseName;
    };

    // Recursive function to find all images (including in groups/artboards)
    const extractImagesFromObject = (obj: any, depth: number = 0) => {
      if (depth > 5) return; // Prevent infinite recursion

      if (obj.type === 'image') {
        try {
          // Generate thumbnail from canvas object
          const thumbnailUrl = obj.toDataURL({
            format: 'jpeg',
            quality: 0.3,
            multiplier: 0.2
          });

          // Get original image URL
          const imageUrl = obj._element?.src || obj.getSrc?.() || thumbnailUrl;

          // Generate unique descriptive name
          const name = generateUniqueName(obj);
          const id = obj.objectId || obj.id || obj.canvasObjectId || `canvas-img-${imageObjects.length}`;
          imageObjects.push({
            id,
            name,
            thumbnailUrl,
            imageUrl
          });
        } catch (error) {
          console.error('Error extracting image asset:', error);
        }
      }

      // Check for nested objects (groups, artboards, activeSelection)
      if (obj._objects && Array.isArray(obj._objects)) {
        obj._objects.forEach((child: any) => extractImagesFromObject(child, depth + 1));
      }
      if (obj.getObjects && typeof obj.getObjects === 'function') {
        try {
          const children = obj.getObjects();
          if (Array.isArray(children)) {
            children.forEach((child: any) => extractImagesFromObject(child, depth + 1));
          }
        } catch {}
      }
    };

    // Get all objects and recursively extract images
    const objects = canvasInstance.getObjects();
    objects.forEach((obj: any) => extractImagesFromObject(obj, 0));
    console.log(`[AssetTaggingPopup] Found ${imageObjects.length} images on canvas`);
    setAssets(imageObjects);
  }, [isOpen, canvasInstance]);

  // Filter assets by search query
  const filteredAssets = searchQuery ? assets.filter(asset => asset.name.toLowerCase().includes(searchQuery.toLowerCase())) : assets;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return <div ref={popupRef} className="bg-background rounded-lg overflow-hidden w-full" style={{
    animation: 'flyInUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
  }}>
      <style>{`
        @keyframes flyInUp {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes staggerFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-8px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .asset-item {
          opacity: 0;
          animation: staggerFadeIn 0.2s ease-out forwards;
        }
      `}</style>
      
      <div className="flex items-center justify-between px-3 py-2 bg-background">
        <span className="text-xs font-medium text-muted-foreground">
          Canvas Assets ({filteredAssets.length})
        </span>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="h-[280px] overflow-y-auto">
        {filteredAssets.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">
            {assets.length === 0 ? 'No images on canvas' : 'No matching assets'}
          </div> : <div className="p-1">
            {filteredAssets.map((asset, index) => <button key={asset.id} onClick={() => onSelectAsset(asset)} className="asset-item w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-all duration-150 text-left hover:translate-x-1" style={{
          animationDelay: `${index * 40}ms`
        }}>
                <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">Canvas image</p>
                </div>
                
              </button>)}
          </div>}
      </ScrollArea>
    </div>;
}
export type { CanvasAsset };