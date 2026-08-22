import { NodeType } from '@/types/workflow';
import { useEffect, useState } from 'react';
import MediaIcon from '@/assets/icons/media-node.svg?react';
import TextIcon from '@/assets/icons/text-node.svg?react';
import ImageGeneratorIcon from '@/assets/icons/image-generator-node.svg?react';
import VideoGeneratorIcon from '@/assets/icons/video-generator-node.svg?react';
import AssistantIcon from '@/assets/icons/assistant-node.svg?react';
import { DitheringShader } from '@/components/ui/dithering-shader';

interface CosmoEmptyStateProps {
  onNodeAdd: (nodeType: NodeType) => void;
}

const nodeCards = [
  {
    type: 'upload' as NodeType,
    label: 'Media',
    icon: MediaIcon,
    bgColor: 'hover:bg-cyan-500/10',
  },
  {
    type: 'textInput' as NodeType,
    label: 'Text',
    icon: TextIcon,
    bgColor: 'hover:bg-pink-500/10',
  },
  {
    type: 'imageGenerator' as NodeType,
    label: 'Image Generator',
    icon: ImageGeneratorIcon,
    bgColor: 'hover:bg-blue-500/10',
  },
  {
    type: 'videoGenerator' as NodeType,
    label: 'Video generator',
    icon: VideoGeneratorIcon,
    bgColor: 'hover:bg-orange-500/10',
  },
  {
    type: 'assistant' as NodeType,
    label: 'Assistant',
    icon: AssistantIcon,
    bgColor: 'hover:bg-emerald-500/10',
  },
];

export const CosmoEmptyState = ({ onNodeAdd }: CosmoEmptyStateProps) => {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1920 });

  useEffect(() => {
    const updateDimensions = () => {
      // Use the larger dimension for both to maintain circular shape
      const size = Math.max(window.innerWidth, window.innerHeight);
      setDimensions({ width: size, height: size });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="absolute inset-0 bg-white flex items-center justify-center z-20 animate-fade-in">
      {/* Subtle dotted background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-40">
        <DitheringShader
          width={dimensions.width}
          height={dimensions.height}
          colorBack="#ffffff"
          colorFront="#e4e4e7"
          shape="swirl"
          type="8x8"
          pxSize={4}
          speed={0.5}
          className="min-w-full min-h-full"
        />
      </div>
      
      {/* Content with higher z-index */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl px-4">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-zinc-900">
            Your covex is empty
          </h2>
          <p className="text-lg text-zinc-500">
            Start by choosing your first node
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3 w-full max-w-3xl">
          {nodeCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.type}
                onClick={() => onNodeAdd(card.type)}
                className={`
                  group relative p-4 rounded-2xl 
                  bg-white/80 backdrop-blur-sm
                  border border-zinc-200
                  shadow-sm
                  transition-all duration-300
                  ${card.bgColor}
                  hover:border-zinc-400
                  hover:shadow-md
                  hover:scale-105
                  active:scale-95
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon className="w-6 h-6 transform transition-transform group-hover:scale-110" />
                  <span className="text-xs font-medium text-zinc-800 group-hover:text-zinc-900 transition-colors">
                    {card.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
