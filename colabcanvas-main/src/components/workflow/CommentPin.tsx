import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface CommentPinProps {
  id: string;
  position: { x: number; y: number };
  authorName: string;
  content: string;
  resolved: boolean;
  onClick: () => void;
}

const CommentPin = ({ id, position, authorName, content, resolved, onClick }: CommentPinProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const initials = authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('commentId', id);
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    setIsDragging(false);
    
    // Update position in database
    const { error } = await supabase
      .from('workflow_comments')
      .update({
        position_x: position.x + e.clientX,
        position_y: position.y + e.clientY
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating comment position:', error);
    }
  };

  return (
    <div
      className="absolute z-50 cursor-move group"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <Avatar className={`h-8 w-8 border-2 ${resolved ? 'border-zinc-400 opacity-50' : 'border-blue-500'} bg-white dark:bg-zinc-100 shadow-lg group-hover:scale-110 transition-transform`}>
          <AvatarFallback className="text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        {!resolved && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-200" />
        )}
      </div>
      
      {/* Hover preview */}
      <div className="absolute left-full ml-2 top-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-white/95 dark:bg-white/95 backdrop-blur-md p-2 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-200 min-w-[200px] max-w-[300px] z-50">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-3 w-3 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-700">{authorName}</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-500 line-clamp-3">{content}</p>
      </div>
    </div>
  );
};

export default CommentPin;
