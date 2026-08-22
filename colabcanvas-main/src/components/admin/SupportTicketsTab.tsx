import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Headphones, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  ChevronRight,
  MessageCircle,
  ArrowUp
} from 'lucide-react';

interface SupportTicket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  escalated_reason: string | null;
  assigned_admin_id: string | null;
  profiles?: {
    email: string;
    full_name: string;
  };
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  role: string;
  content: string;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export const SupportTicketsTab = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles separately
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', item.user_id)
            .single();
          return { ...item, profiles: profile } as SupportTicket;
        })
      );
      
      setTickets(ticketsWithProfiles);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleTicketSelect = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${newStatus}`,
      });

      loadTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handlePriorityUpdate = async (id: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Priority Updated',
        description: `Ticket priority changed to ${newPriority}`,
      });

      loadTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      });
    }
  };

  const handleEscalate = async (ticket: SupportTicket) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          priority: 'urgent',
          escalated_at: new Date().toISOString(),
          escalated_reason: 'Escalated by admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: 'Ticket Escalated',
        description: 'Ticket has been escalated to urgent priority',
      });

      loadTickets();
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to escalate ticket',
        variant: 'destructive',
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !adminResponse.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          role: 'admin',
          content: adminResponse.trim()
        });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);
      }

      toast({
        title: 'Response Sent',
        description: 'Your response has been added to the ticket',
      });

      setAdminResponse('');
      await loadMessages(selectedTicket.id);
      loadTickets();
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.escalated_at && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-zinc-400 text-xs font-mono">
            #{value.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (value) => (
        <span className="text-zinc-100 font-medium line-clamp-1">{value}</span>
      ),
    },
    {
      key: 'profiles',
      label: 'User',
      render: (value: any) => (
        <span className="text-zinc-400 text-sm">
          {value?.email || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (value) => (
        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
          {value}
        </Badge>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value) => (
        <Badge className={priorityColors[value] || priorityColors.medium}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge className={statusColors[value] || statusColors.open}>
          {value.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-zinc-500 text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleTicketSelect(row)}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    escalated: tickets.filter(t => t.escalated_at !== null).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Headphones className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
              <p className="text-xs text-zinc-500">Total Tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.open}</p>
              <p className="text-xs text-zinc-500">Open Tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.inProgress}</p>
              <p className="text-xs text-zinc-500">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.escalated}</p>
              <p className="text-xs text-zinc-500">Escalated</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTickets}
          className="bg-zinc-800 border-zinc-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Data Table */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <DataTable
          columns={columns}
          data={tickets}
          searchPlaceholder="Search tickets..."
          pageSize={10}
        />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Ticket #{selectedTicket?.id.slice(0, 8)}
              {selectedTicket?.escalated_at && (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 ml-2">
                  Escalated
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <label className="text-xs text-zinc-500">Title</label>
                  <p className="text-zinc-100 font-medium">{selectedTicket.title}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">User</label>
                  <p className="text-zinc-300">{selectedTicket.profiles?.email || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Category</label>
                  <p className="text-zinc-300">{selectedTicket.category}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Created</label>
                  <p className="text-zinc-300">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status and Priority Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500">Status:</label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => {
                      handleStatusUpdate(selectedTicket.id, value);
                      setSelectedTicket({ ...selectedTicket, status: value });
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500">Priority:</label>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(value) => {
                      handlePriorityUpdate(selectedTicket.id, value);
                      setSelectedTicket({ ...selectedTicket, priority: value });
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!selectedTicket.escalated_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEscalate(selectedTicket)}
                    className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  >
                    <ArrowUp className="w-4 h-4 mr-1" />
                    Escalate
                  </Button>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500">Description</label>
                <p className="text-zinc-300 mt-1 p-3 bg-zinc-800 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Messages */}
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Conversation History</label>
                <ScrollArea className="h-48 border border-zinc-800 rounded-lg p-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-4">No messages yet</p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-zinc-800 ml-8' 
                              : msg.role === 'admin'
                              ? 'bg-blue-500/10 mr-8'
                              : 'bg-purple-500/10 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-zinc-400">
                              {msg.role === 'user' ? 'User' : msg.role === 'admin' ? 'Admin' : 'AI Assistant'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-zinc-200 text-sm">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Admin Response */}
              <div>
                <label className="text-xs text-zinc-500">Add Response</label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Type your response to the user..."
                  className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  className="bg-zinc-800 border-zinc-700"
                >
                  Close
                </Button>
                <Button 
                  onClick={handleSendResponse}
                  disabled={!adminResponse.trim()}
                >
                  Send Response
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
