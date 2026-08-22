import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, X, AlertTriangle, Eye, Flag, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  content_url: string | null;
  user_id: string;
  flag_reason: string | null;
  flag_source: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export function ContentModerationTab() {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: moderationQueue, isLoading } = useQuery({
    queryKey: ['admin-moderation-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ModerationItem[];
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('moderation_queue')
        .update({
          status,
          notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] });
      setSelectedItem(null);
      setReviewNotes('');
      toast.success('Review submitted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    }
  });

  const pendingCount = moderationQueue?.filter(item => item.status === 'pending').length || 0;
  const approvedCount = moderationQueue?.filter(item => item.status === 'approved').length || 0;
  const rejectedCount = moderationQueue?.filter(item => item.status === 'rejected').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'escalated':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Escalated</Badge>;
      default:
        return <Badge className="bg-zinc-500/10 text-zinc-400">{status}</Badge>;
    }
  };

  const getContentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      image: 'bg-blue-500/10 text-blue-500',
      prompt: 'bg-purple-500/10 text-purple-500',
      workflow: 'bg-green-500/10 text-green-500',
      brand: 'bg-orange-500/10 text-orange-500'
    };
    return <Badge className={colors[type] || 'bg-zinc-500/10 text-zinc-400'}>{type}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Content Moderation</h2>
        <p className="text-zinc-400">Review flagged content and manage approvals</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Total Flagged</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{moderationQueue?.length || 0}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-zinc-400">Pending Review</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm text-zinc-400">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{approvedCount}</p>
        </Card>
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm text-zinc-400">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{rejectedCount}</p>
        </Card>
      </div>

      {/* Moderation Queue */}
      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Moderation Queue</h3>
        
        {isLoading ? (
          <p className="text-zinc-400">Loading moderation queue...</p>
        ) : !moderationQueue || moderationQueue.length === 0 ? (
          <div className="text-center py-12">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">All Clear!</h3>
            <p className="text-zinc-500">No flagged content to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moderationQueue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border ${
                  selectedItem?.id === item.id 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-zinc-800 bg-zinc-800/30'
                } cursor-pointer hover:border-zinc-700 transition-colors`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getContentTypeBadge(item.content_type)}
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {item.flag_reason && (
                      <p className="text-sm text-zinc-300 mb-2">
                        <span className="text-zinc-500">Reason:</span> {item.flag_reason}
                      </p>
                    )}
                    
                    <p className="text-xs text-zinc-500">
                      Source: {item.flag_source} | Content ID: {item.content_id.slice(0, 8)}...
                    </p>
                  </div>
                  
                  {item.content_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.content_url!, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Review Panel */}
      {selectedItem && selectedItem.status === 'pending' && (
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Review Content</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-400 mb-1">Content Type</p>
              <p className="text-zinc-200 capitalize">{selectedItem.content_type}</p>
            </div>
            
            {selectedItem.flag_reason && (
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-sm text-zinc-400 mb-1">Flag Reason</p>
                <p className="text-zinc-200">{selectedItem.flag_reason}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Review Notes</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your review decision..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => reviewMutation.mutate({ 
                  id: selectedItem.id, 
                  status: 'approved', 
                  notes: reviewNotes 
                })}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={reviewMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({ 
                  id: selectedItem.id, 
                  status: 'rejected', 
                  notes: reviewNotes 
                })}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={reviewMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedItem(null);
                  setReviewNotes('');
                }}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
