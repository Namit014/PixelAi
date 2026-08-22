import type { PinTag as PinTagType } from '@/types/pinTag';

interface PinTagProps {
  tag: PinTagType;
  position: { x: number; y: number };
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export const PinTag = ({ tag, position, isActive, onClick, onRemove }: PinTagProps) => {
  return (
    <div
      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-full group"
      style={{ 
        left: position.x, 
        top: position.y,
        zIndex: isActive ? 1060 : 1055
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Pin icon - blue location marker with shadow */}
      <svg width="32" height="40" viewBox="0 0 32 40" className="drop-shadow-lg transition-transform group-hover:scale-110">
        <defs>
          <filter id={`shadow-${tag.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25"/>
          </filter>
        </defs>
        <path 
          d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
          fill={isActive ? '#2563EB' : '#3B82F6'}
          stroke="#1D4ED8"
          strokeWidth="1"
          filter={`url(#shadow-${tag.id})`}
        />
        {/* White numbered circle */}
        <circle cx="16" cy="14" r="10" fill="white" />
        <text 
          x="16" 
          y="18" 
          textAnchor="middle" 
          fontSize="12" 
          fontWeight="600" 
          fill="#3B82F6"
          fontFamily="system-ui, sans-serif"
        >
          {tag.number}
        </text>
      </svg>
      
      {/* Label tooltip on hover */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-zinc-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
          {tag.isIdentifying ? 'Identifying...' : tag.label}
        </div>
      </div>
      
      {/* Remove button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <span className="text-white text-[10px] font-bold leading-none">×</span>
      </button>
    </div>
  );
};
