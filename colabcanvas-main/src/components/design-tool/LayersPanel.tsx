import { useEffect, useState } from "react";
import { Canvas as FabricCanvas, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, Video, Image, Type, Square, Circle } from "lucide-react";

interface LayersPanelProps {
  canvas: FabricCanvas | null;
}

interface Layer {
  id: string;
  type: 'artboard' | 'image' | 'video' | 'text' | 'rectangle' | 'circle' | 'group' | 'path' | string;
  title: string;
  visible: boolean;
  locked: boolean;
  object: FabricObject;
}

// Get icon for layer type
const getLayerIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <Video className="h-3 w-3" />;
    case 'image':
      return <Image className="h-3 w-3" />;
    case 'text':
    case 'i-text':
      return <Type className="h-3 w-3" />;
    case 'rect':
    case 'rectangle':
      return <Square className="h-3 w-3" />;
    case 'circle':
      return <Circle className="h-3 w-3" />;
    default:
      return null;
  }
};

export function LayersPanel({ canvas }: LayersPanelProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const updateLayers = () => {
      const objects = canvas.getObjects();
      const layerData = objects.map((obj) => {
        // Detect video objects - check isVideo property
        const isVideo = (obj as any).isVideo === true;
        const objType = isVideo ? 'video' : (obj.type || 'object');
        
        // Generate title based on type
        let title = objType;
        if (isVideo) {
          title = (obj as any).title || 'Video';
        } else if (obj.type === 'image') {
          title = (obj as any).layerName || (obj as any).title || 'Image';
        } else if (obj.type === 'i-text' || obj.type === 'text') {
          title = (obj as any).text?.substring(0, 20) || 'Text';
        } else if ((obj as any).layerName) {
          title = (obj as any).layerName;
        }
        
        return {
          id: obj.get('id') as string || (obj as any).canvasObjectId || Math.random().toString(),
          type: objType,
          title,
          visible: obj.visible !== false,
          locked: obj.lockMovementX === true,
          object: obj,
        };
      }).reverse(); // Reverse to show top layer first

      setLayers(layerData);
    };

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      setSelectedId(activeObject?.get('id') as string || null);
    };

    updateLayers();
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedId(null));

    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [canvas]);

  const toggleVisibility = (layer: Layer) => {
    layer.object.set('visible', !layer.visible);
    canvas?.renderAll();
  };

  const toggleLock = (layer: Layer) => {
    const locked = !layer.locked;
    layer.object.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      selectable: !locked,
    });
    canvas?.renderAll();
  };

  const deleteLayer = (layer: Layer) => {
    canvas?.remove(layer.object);
  };

  const duplicateLayer = async (layer: Layer) => {
    const cloned = await layer.object.clone();
    cloned.set({
      left: (cloned.left || 0) + 20,
      top: (cloned.top || 0) + 20,
    });
    canvas?.add(cloned);
  };

  const selectLayer = (layer: Layer) => {
    canvas?.setActiveObject(layer.object);
    canvas?.renderAll();
  };

  return (
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Layers</h3>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-2 space-y-1">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer ${
                selectedId === layer.id ? 'bg-accent' : ''
              }`}
              onClick={() => selectLayer(layer)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer);
                }}
              >
                {layer.visible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </Button>

              {getLayerIcon(layer.type)}
              <span className="flex-1 text-sm truncate capitalize">
                {layer.title}
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLock(layer);
                }}
              >
                {layer.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateLayer(layer);
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layer);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {layers.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No layers yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
