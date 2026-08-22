import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Import colored SVG icons
import mediaNodeIcon from '@/assets/icons/media-node.svg';
import textNodeIcon from '@/assets/icons/text-node.svg';
import assistantNodeIcon from '@/assets/icons/assistant-node.svg';
import imageGeneratorNodeIcon from '@/assets/icons/image-generator-node.svg';

type NodeVariant = 'input' | 'note' | 'instructions' | 'result';

interface LandingNodeData {
  variant: NodeVariant;
  label: string;
  images?: string[];
  text?: string;
  image?: string;
  aspectRatio?: string;
  width?: number;
}

// Map variants to their colored icons
const variantIcons: Record<NodeVariant, string> = {
  input: mediaNodeIcon,
  note: textNodeIcon,
  instructions: assistantNodeIcon,
  result: imageGeneratorNodeIcon,
};

const LandingNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as LandingNodeData;
  const { variant, label, images, text, image, aspectRatio, width } = nodeData;
  const iconSrc = variantIcons[variant];
  const isImageVariant = variant === 'input' || variant === 'result';

  const renderContent = () => {
    if (variant === 'input' && images) {
      return (
        <div className="grid grid-cols-2 gap-1.5" style={{ width: width || 200 }}>
          {images.slice(0, 4).map((img, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'note' && text) {
      return (
        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-4">
          {text}
        </p>
      );
    }

    if (variant === 'instructions' && text) {
      return (
        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-6">
          {text}
        </p>
      );
    }

    if (variant === 'result' && image) {
      return (
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ width: width || 200, aspectRatio: aspectRatio || '4/3' }}
        >
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative pt-8">
      {/* Label positioned OUTSIDE/ABOVE the card */}
      <div className="absolute -top-0 left-0 flex items-center gap-2">
        <img src={iconSrc} alt="" className="w-5 h-5" />
        <span className="font-medium text-zinc-700 text-sm">{label}</span>
      </div>

      {/* Content - conditionally wrapped */}
      {isImageVariant ? (
        renderContent()
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden p-3 max-w-[260px]">
          {renderContent()}
        </div>
      )}

      {/* Handles - completely invisible */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-transparent !border-none !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-transparent !border-none !opacity-0"
      />
    </div>
  );
});

LandingNode.displayName = 'LandingNode';

export default LandingNode;
