import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateCommentModalProps {
  workflowId: string | null;
  position: { x: number; y: number } | null;
  isOpen: boolean;
  onClose: () => void;
}

const CreateCommentModal = ({ workflowId, position, isOpen, onClose }: CreateCommentModalProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !workflowId || !position || !user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('workflow_comments')
        .insert({
          workflow_id: workflowId,
          user_id: user.id,
          position_x: position.x,
          position_y: position.y,
          content: content.trim(),
        });

      if (error) throw error;

      toast.success('Comment added');
      setContent('');
      onClose();
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Failed to create comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Comment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your comment here..."
            className="min-h-[120px] resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommentModal;
