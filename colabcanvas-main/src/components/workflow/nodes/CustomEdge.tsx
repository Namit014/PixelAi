import { useState } from 'react';
import { EdgeProps, getBezierPath, BaseEdge } from '@xyflow/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
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
        <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHovered ? 3 : 2.5,
          stroke: `url(#gradient-${id})`,
          strokeLinecap: 'round',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {isHovered && (
        <foreignObject
          width={40}
          height={40}
          x={labelX - 20}
          y={labelY - 20}
          className="overflow-visible"
        >
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-red-600 text-zinc-900 shadow-lg border border-zinc-300"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default CustomEdge;
