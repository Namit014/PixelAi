import { Loader2 } from 'lucide-react';

interface VideoUploadProgressOverlayProps {
  position: { x: number; y: number };
  progress: number;
  visible: boolean;
}

export function VideoUploadProgressOverlay({ 
  position, 
  progress, 
  visible 
}: VideoUploadProgressOverlayProps) {
  if (!visible) return null;

  return (
    <div 
      className="absolute pointer-events-none z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-sm"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        minWidth: '280px',
        backgroundColor: '#f4f4f5',
      }}
    >
      <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: '#52525b' }} />
      <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#3f3f46' }}>
        Uploading video...
      </span>
      <div className="flex-1 min-w-[100px]">
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#d4d4d8' }}>
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: '#52525b'
            }}
          />
        </div>
      </div>
    </div>
  );
}
