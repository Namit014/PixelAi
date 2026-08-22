import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  title: string | null;
}
interface ChatHistoryPanelProps {
  userId: string;
  projectId: string;
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onClose: () => void;
}
const ChatHistoryPanel = ({
  userId,
  projectId,
  currentConversationId,
  onConversationSelect,
  onClose
}: ChatHistoryPanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadConversations();
  }, [userId, projectId]);
  const loadConversations = async () => {
    setIsLoading(true);
    const {
      data,
      error
    } = await supabase.from('conversations').select('*').eq('user_id', userId).eq('project_id', projectId).order('updated_at', {
      ascending: false
    });
    if (!error && data) {
      setConversations(data);
    }
    setIsLoading(false);
  };
  return <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-zinc-100">
        <h3 className="font-semibold">Chat History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 bg-zinc-100">
        {isLoading ? <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div> : conversations.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No conversations yet</p>
          </div> : <div className="space-y-2">
            {conversations.map(conv => <Button key={conv.id} variant={conv.id === currentConversationId ? 'secondary' : 'ghost'} onClick={() => {
          // FIX #9: Don't auto-close, let parent handle loading first
          console.log('📖 Loading conversation:', conv.id, conv.title);
          onConversationSelect(conv.id);
          // Close immediately - parent will handle loading asynchronously
          onClose();
        }} className="w-full justify-start h-auto py-3 px-4 rounded-xl bg-zinc-50 text-xs">
                <div className="flex flex-col items-start gap-1">
              <span className="font-medium">
                {conv.title || `New ${new Date(conv.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
              </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), {
                addSuffix: true
              })}
                  </span>
                </div>
              </Button>)}
          </div>}
      </ScrollArea>
    </div>;
};
export default ChatHistoryPanel;