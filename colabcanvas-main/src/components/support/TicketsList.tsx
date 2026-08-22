import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
}

interface TicketsListProps {
  userId: string;
}

export const TicketsList = ({ userId }: TicketsListProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [userId]);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'closed': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      default: return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600">Loading tickets...</div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
        <p className="text-zinc-600">No support tickets yet.</p>
        <p className="text-sm text-zinc-500 mt-2">Use the chat to get help or create a ticket.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4 bg-white border-zinc-300">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-zinc-900">{ticket.title}</h3>
                  <Badge variant="outline" className={getStatusColor(ticket.status)}>
                    {getStatusIcon(ticket.status)}
                    <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                    <span className="capitalize">{ticket.priority}</span>
                  </Badge>
                </div>
                <p className="text-sm text-zinc-600 mb-3">{ticket.description}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Category: {ticket.category}</span>
                  <span>ID: #{ticket.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-300">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated: {format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};