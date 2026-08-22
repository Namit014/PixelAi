import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Bot,
  Clock,
  Volume2,
  VolumeX,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: { name: string; url: string; type: string }[];
}

interface SupportChatProps {
  userId: string;
}

const QUICK_REPLIES = [
  "How do I create a new project?",
  "I need help with my account",
  "How do credits work?",
  "Report a bug",
];

export const AdvancedSupportChat = ({ userId }: SupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    } catch (e) {
      // Audio context not available
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    setShowWelcome(false);
    setShowQuickReplies(false);

    const userMessage: Message = { 
      id: Date.now().toString(),
      role: 'user', 
      content: messageText,
      timestamp: new Date(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    // Update status to sent
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, status: 'sent' } : m
      ));
    }, 300);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: { 
          messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: messageText }]),
          ticketId: currentTicketId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setIsTyping(false);

      const aiResponse = data.choices[0].message;
      
      // Handle tool calls
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        for (const toolCall of aiResponse.tool_calls) {
          const funcName = toolCall.function.name;
          
          if (funcName === 'create_ticket') {
            const ticketData = JSON.parse(toolCall.function.arguments);
            
            const { data: ticket, error: ticketError } = await supabase
              .from('support_tickets')
              .insert({
                user_id: userId,
                title: ticketData.title,
                description: ticketData.description,
                category: ticketData.category,
                priority: ticketData.priority,
                status: 'open'
              })
              .select()
              .single();

            if (ticketError) throw ticketError;

            setCurrentTicketId(ticket.id);
            
            await supabase.from('support_messages').insert([
              { ticket_id: ticket.id, user_id: userId, role: 'user', content: messageText },
              { ticket_id: ticket.id, role: 'assistant', content: `Ticket #${ticket.id.slice(0, 8)} created.` }
            ]);

            const newMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ I've created a support ticket for your issue.\n\n**Ticket ID:** #${ticket.id.slice(0, 8)}\n**Title:** ${ticketData.title}\n\nOur team will review it shortly. You can track progress in your tickets list.`,
              timestamp: new Date(),
              status: 'read'
            };
            
            setMessages(prev => [...prev, newMessage]);
            playNotificationSound();
            if (isMinimized || !isOpen) {
              setUnreadCount(prev => prev + 1);
            }

            toast({
              title: "Ticket Created",
              description: `Ticket #${ticket.id.slice(0, 8)} has been created.`
            });
          }
        }
      } else {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          status: 'read'
        };
        
        setMessages(prev => [...prev, newMessage]);
        playNotificationSound();
        if (isMinimized || !isOpen) {
          setUnreadCount(prev => prev + 1);
        }
        
        if (currentTicketId) {
          await supabase.from('support_messages').insert([
            { ticket_id: currentTicketId, user_id: userId, role: 'user', content: messageText },
            { ticket_id: currentTicketId, role: 'assistant', content: aiResponse.content }
          ]);
        }
      }

      // Update user message to delivered
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, status: 'delivered' } : m
      ));

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return null;
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentTicketId(null);
    setShowQuickReplies(true);
    setShowWelcome(true);
  };

  // Closed state - floating button
  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-zinc-900 hover:bg-zinc-800 z-50"
            >
              <MessageCircle className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-medium flex items-center justify-center text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Chat with Support</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 w-[400px] bg-background border border-border rounded-2xl flex flex-col z-50 overflow-hidden transition-all duration-300 ${
        isMinimized ? 'h-[64px]' : 'h-[600px]'
      }`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-zinc-900 text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src="/rumi-avatar.png" />
              <AvatarFallback className="bg-zinc-700 text-white">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
          </div>
          <div>
            <span className="font-semibold text-sm">RUMI Support</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-xs text-zinc-400">Online • Replies instantly</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? (
                  <>
                    <VolumeX className="w-4 h-4 mr-2" />
                    Mute sounds
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Enable sounds
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startNewConversation}>
                <MessageCircle className="w-4 h-4 mr-2" />
                New conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {/* Welcome Screen */}
              {showWelcome && messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 mx-auto mb-4 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Hi there! 👋</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    I'm RUMI, your AI support assistant.<br />
                    How can I help you today?
                  </p>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {message.role === 'assistant' && (
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="bg-zinc-900 text-white text-xs">
                          <Bot className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="space-y-1">
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-zinc-900 text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {format(message.timestamp, 'h:mm a')}
                        </span>
                        {message.role === 'user' && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-zinc-900 text-white text-xs">
                        <Bot className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Replies */}
              {showQuickReplies && messages.length === 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3 text-center">Popular questions</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_REPLIES.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickReply(reply)}
                        className="px-4 py-2 text-xs bg-muted hover:bg-muted/80 border border-border rounded-full text-foreground transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="pr-12 bg-background border-border rounded-xl py-5 text-sm"
                  disabled={isLoading}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-10 w-10 rounded-xl bg-zinc-900 hover:bg-zinc-800"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <p className="text-[10px] text-muted-foreground text-center">
              Powered by RUMI AI • Your data is encrypted and secure
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedSupportChat;
