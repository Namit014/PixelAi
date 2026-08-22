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
import { Bug, Lightbulb, MessageSquare, RefreshCw, ChevronRight } from 'lucide-react';

interface Feedback {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  browser_info: any;
  admin_notes: string | null;
  assigned_admin_id: string | null;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  reviewing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  in_progress: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  dismissed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export const FeedbackManagementTab = () => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadFeedback();
  }, [statusFilter]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles separately
      const feedbackWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', item.user_id)
            .single();
          return { ...item, profiles: profile } as Feedback;
        })
      );
      
      setFeedback(feedbackWithProfiles);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus as any })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Feedback status changed to ${newStatus}`,
      });

      loadFeedback();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;

    try {
      const { error } = await supabase
        .from('feedback')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast({
        title: 'Notes Saved',
        description: 'Admin notes have been saved',
      });

      setSelectedFeedback(null);
      loadFeedback();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  const columns: Column<Feedback>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.title?.toLowerCase().includes('bug') ? (
            <Bug className="w-4 h-4 text-red-400" />
          ) : (
            <Lightbulb className="w-4 h-4 text-yellow-400" />
          )}
          <span className="text-zinc-100 font-medium line-clamp-1">{value || 'Untitled'}</span>
        </div>
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
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge className={statusColors[value] || statusColors.submitted}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
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
        <div className="flex items-center gap-2">
          <Select
            value={row.status}
            onValueChange={(value) => handleStatusUpdate(row.id, value)}
          >
            <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedFeedback(row);
              setAdminNotes(row.admin_notes || '');
            }}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: feedback.length,
    pending: feedback.filter(f => f.status === 'submitted').length,
    inProgress: feedback.filter(f => f.status === 'in_progress' || f.status === 'reviewing').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
              <p className="text-xs text-zinc-500">Total Feedback</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Bug className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.pending}</p>
              <p className="text-xs text-zinc-500">Pending Review</p>
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
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Lightbulb className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{stats.resolved}</p>
              <p className="text-xs text-zinc-500">Resolved</p>
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
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFeedback}
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
          data={feedback}
          searchPlaceholder="Search feedback..."
          pageSize={10}
        />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {selectedFeedback?.title || 'Feedback Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-500">Description</label>
                <p className="text-zinc-300 mt-1 p-3 bg-zinc-800 rounded-lg">
                  {selectedFeedback.description || 'No description provided'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-500">User</label>
                  <p className="text-zinc-300">{selectedFeedback.profiles?.email || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-zinc-500">Submitted</label>
                  <p className="text-zinc-300">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedFeedback.browser_info && (
                <div>
                  <label className="text-sm text-zinc-500">Browser Info</label>
                  <pre className="text-xs text-zinc-400 mt-1 p-3 bg-zinc-800 rounded-lg overflow-auto">
                    {JSON.stringify(selectedFeedback.browser_info, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm text-zinc-500">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFeedback(null)}
                  className="bg-zinc-800 border-zinc-700"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
