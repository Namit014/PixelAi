import { memo } from 'react';
import { EdgeProps, getBezierPath } from '@xyflow/react';

// Import colored SVG icons
import mediaNodeIcon from '@/assets/icons/media-node.svg';
import textNodeIcon from '@/assets/icons/text-node.svg';
import assistantNodeIcon from '@/assets/icons/assistant-node.svg';
import imageGeneratorNodeIcon from '@/assets/icons/image-generator-node.svg';

interface LandingEdgeData {
  color?: 'zinc' | 'purple' | 'blue' | 'green' | 'orange';
  sourceType?: 'input' | 'note' | 'instructions' | 'result';
}

// Two colors for alternating dashes
const colorPairs: Record<string, [string, string]> = {
  zinc: ['#71717A', '#A1A1AA'],
  purple: ['#8B5CF6', '#A78BFA'],
  blue: ['#10B981', '#3B82F6'],  // green + blue alternating
  green: ['#10B981', '#34D399'],
  orange: ['#F97316', '#FB923C'],
};

// Icon mapping per source node type
const sourceIcons: Record<string, string> = {
  input: mediaNodeIcon,
  note: textNodeIcon,
  instructions: assistantNodeIcon,
  result: imageGeneratorNodeIcon,
};

const LandingEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) => {
  const edgeData = data as LandingEdgeData | undefined;
  const colorKey = edgeData?.color || 'zinc';
  const sourceType = edgeData?.sourceType || 'input';
  const colors = colorPairs[colorKey] || colorPairs.zinc;
  const iconSrc = sourceIcons[sourceType] || sourceIcons.input;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <defs>
        <style>{`
          @keyframes dash-flow {
            to { stroke-dashoffset: -24; }
          }
        `}</style>
      </defs>
      
      {/* First color dashes */}
      <path
        d={edgePath}
        stroke={colors[0]}
        strokeWidth={2}
        fill="none"
        strokeDasharray="8 16"
        strokeDashoffset={0}
        style={{ animation: 'dash-flow 1.5s linear infinite' }}
      />
      
      {/* Second color dashes (offset to fill gaps) */}
      <path
        d={edgePath}
        stroke={colors[1]}
        strokeWidth={2}
        fill="none"
        strokeDasharray="8 16"
        strokeDashoffset={-12}
        style={{ animation: 'dash-flow 1.5s linear infinite' }}
      />
      
      {/* White circle background */}
      <circle cx={sourceX} cy={sourceY} r="14" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth={1} />
      
      {/* Icon using foreignObject */}
      <foreignObject 
        x={sourceX - 10} 
        y={sourceY - 10} 
        width="20" 
        height="20"
      >
        <img 
          src={iconSrc} 
          alt="" 
          style={{ width: '20px', height: '20px' }}
        />
      </foreignObject>
      <foreignObject 
        x={sourceX - 10} 
        y={sourceY - 10} 
        width="20" 
        height="20"
      >
        <img 
          src={iconSrc} 
          alt="" 
          style={{ width: '20px', height: '20px' }}
        />
      </foreignObject>
    </>
  );
});

LandingEdge.displayName = 'LandingEdge';

export default LandingEdge;
