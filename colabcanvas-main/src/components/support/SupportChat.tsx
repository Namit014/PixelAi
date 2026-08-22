import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SupportChatProps {
  userId: string;
}

export const SupportChat = ({ userId }: SupportChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI support assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: { 
          messages: [...messages, userMessage],
          ticketId: currentTicketId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const aiResponse = data.choices[0].message;
      
      // Check if AI wants to use a tool
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        for (const toolCall of aiResponse.tool_calls) {
          const funcName = toolCall.function.name;
          
          if (funcName === 'create_ticket') {
            const ticketData = JSON.parse(toolCall.function.arguments);
            
            // Create ticket in database
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
            
            // Save messages to database
            await supabase.from('support_messages').insert([
              { ticket_id: ticket.id, user_id: userId, role: 'user', content: userMessage.content },
              { ticket_id: ticket.id, role: 'assistant', content: `I've created ticket #${ticket.id.slice(0, 8)} for you. A support agent will review it soon.` }
            ]);

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `I've created a support ticket for your issue: "${ticketData.title}". Ticket ID: #${ticket.id.slice(0, 8)}. You can track its progress in your tickets list.`
            }]);

            toast({
              title: "Ticket Created",
              description: `Ticket #${ticket.id.slice(0, 8)} has been created successfully.`
            });
          } else if (funcName === 'get_user_tickets') {
            // Handle get_user_tickets tool - display ticket list in chat
            const toolContent = aiResponse.content || 'Here are your tickets:';
            setMessages(prev => [...prev, { role: 'assistant', content: toolContent }]);
          } else if (funcName === 'escalate_ticket') {
            // Handle escalate_ticket tool
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: aiResponse.content || 'Your ticket has been escalated to urgent priority. Our team will prioritize it.'
            }]);
            
            toast({
              title: "Ticket Escalated",
              description: "Your ticket has been escalated for urgent attention."
            });
          } else if (funcName === 'update_ticket_status') {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: aiResponse.content || 'Your ticket status has been updated.'
            }]);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.content }]);
        
        // Save to database if we have a ticket
        if (currentTicketId) {
          await supabase.from('support_messages').insert([
            { ticket_id: currentTicketId, user_id: userId, role: 'user', content: userMessage.content },
            { ticket_id: currentTicketId, role: 'assistant', content: aiResponse.content }
          ]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col ${isMinimized ? 'h-14' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">Support Chat</span>
        </div>
        <div className="flex gap-2">
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
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-zinc-100 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-zinc-700">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};