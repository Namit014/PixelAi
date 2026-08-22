import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIDesignerIcon } from '@/components/icons/CustomIcons';
import { saveCanvasVersion } from '@/components/canvas/CanvasVersionHistory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingEditChatProps {
  artboardId: string;
  artboardTitle: string;
  imageUrl: string;
  originalWidth?: number;
  originalHeight?: number;
  projectId?: string;
  onClose: () => void;
  onEditComplete: (newImageUrl: string) => void;
  position?: { x: number; y: number };
}

const FloatingEditChat = ({
  artboardId,
  artboardTitle,
  imageUrl,
  originalWidth,
  originalHeight,
  projectId,
  onClose,
  onEditComplete,
  position = { x: 100, y: 100 },
}: FloatingEditChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I can help you edit "${artboardTitle}". What changes would you like to make?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      setElapsed(0);
      const startedAt = Date.now();
      elapsedTimerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
    } else if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    return () => {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      // Server enforces an 18s hard timeout for flash edits — the redundant
      // 30s client wrapper has been removed so users see real failures faster.
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl,
          operation: 'edit',
          prompt: userMessage,
          originalWidth,
          originalHeight,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Auto-snapshot the PREVIOUS state so the user can revert this AI iteration
        try {
          if (projectId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await saveCanvasVersion({
                projectId,
                userId: user.id,
                artboardId,
                source: 'ai',
                label: `Before: ${userMessage.slice(0, 80)}`,
                snapshot: { image_url: imageUrl, originalWidth, originalHeight, prompt: userMessage },
                thumbnailUrl: imageUrl,
              });
            }
          }
        } catch (e) { console.warn('snapshot failed', e); }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I\'ve applied your changes! The artboard has been updated.',
          },
        ]);
        onEditComplete(data.imageUrl);
        toast.success('Artboard updated successfully');
      } else {
        throw new Error('No edited image returned');
      }
    } catch (error: any) {
      console.error('Edit error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I couldn't apply those changes: ${error.message || 'Unknown error'}`,
        },
      ]);
      toast.error('Failed to edit artboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="fixed z-[100] animate-in fade-in slide-in-from-right-4 duration-300"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        maxHeight: '550px',
      }}
    >
      <div className="bg-background/95 backdrop-blur-xl rounded-xl border-2 border-primary/20 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <AIDesignerIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Edit Chat</h3>
              <p className="text-xs text-muted-foreground">{artboardTitle}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 min-h-[300px]" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                    ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border border-border/50'
                    }
                  `}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border/50 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Applying edits… {elapsed}s</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your changes... (e.g., make it blue, add a shadow)"
              className="min-h-[80px] resize-none text-sm flex-1"
              disabled={isLoading}
            />
            {input.trim() && (
              <Button
                onClick={handleSend}
                disabled={isLoading}
                className="shrink-0 h-10 px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingEditChat;
