import { useState, useEffect } from 'react';
import { MessageSquare, Check, Trash2, X, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useReactFlow } from '@xyflow/react';

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface Comment {
  id: string;
  workflow_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  content: string;
  resolved: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface CommentsPanelProps {
  workflowId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const CommentsPanel = ({ workflowId, isOpen, onClose }: CommentsPanelProps) => {
  const { user } = useAuth();
  const { fitView, setCenter } = useReactFlow();
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Map<string, Reply[]>>(new Map());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    if (!workflowId) return;

    loadComments();

    // Subscribe to realtime updates for comments
    const commentsChannel = supabase
      .channel('workflow-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_comments',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for replies
    const repliesChannel = supabase
      .channel('workflow-comment-replies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_comment_replies',
        },
        () => {
          loadReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, [workflowId]);

  const loadComments = async () => {
    if (!workflowId) return;

    const { data, error } = await supabase
      .from('workflow_comments')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    // Fetch profile names separately
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: { full_name: profileMap.get(comment.user_id) || 'Unknown' }
      }));

      setComments(commentsWithProfiles);
      loadReplies();
    }
  };

  const loadReplies = async () => {
    if (!comments.length) return;

    const commentIds = comments.map(c => c.id);
    const { data, error } = await supabase
      .from('workflow_comment_replies')
      .select('*')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading replies:', error);
      return;
    }

    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const repliesWithProfiles = data.map(reply => ({
        ...reply,
        profiles: { full_name: profileMap.get(reply.user_id) || 'Unknown' }
      }));

      const repliesMap = new Map<string, Reply[]>();
      repliesWithProfiles.forEach(reply => {
        const existing = repliesMap.get(reply.comment_id) || [];
        repliesMap.set(reply.comment_id, [...existing, reply]);
      });

      setReplies(repliesMap);
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    const { error } = await supabase
      .from('workflow_comments')
      .update({ resolved: !resolved })
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to update comment');
      return;
    }

    loadComments();
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('workflow_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to delete comment');
      return;
    }

    toast.success('Comment deleted');
    loadComments();
  };

  const handlePanToComment = (comment: Comment) => {
    setCenter(comment.position_x, comment.position_y, { zoom: 1, duration: 800 });
  };

  const handleAddReply = async (commentId: string) => {
    const content = replyTexts.get(commentId);
    if (!content?.trim() || !user) return;

    const { error } = await supabase
      .from('workflow_comment_replies')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        content: content.trim(),
      });

    if (error) {
      toast.error('Failed to add reply');
      return;
    }

    setReplyTexts(new Map(replyTexts.set(commentId, '')));
    loadReplies();
  };

  const toggleExpanded = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 w-96 max-h-[calc(100vh-120px)] bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-900">Comments</h3>
          <span className="text-xs text-zinc-500">({filteredComments.length})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-3">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {filteredComments.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No comments yet
                </div>
              ) : (
                filteredComments.map(comment => {
                  const commentReplies = replies.get(comment.id) || [];
                  const isExpanded = expandedComments.has(comment.id);
                  const replyText = replyTexts.get(comment.id) || '';

                  return (
                    <div
                      key={comment.id}
                      className={`rounded-lg border ${
                        comment.resolved
                          ? 'border-zinc-200 dark:border-zinc-200 opacity-60'
                          : 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20'
                      }`}
                    >
                      {/* Main Comment */}
                      <div
                        className="p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-100/50 transition-colors"
                        onClick={() => handlePanToComment(comment)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-700">
                            {comment.profiles?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-3">{comment.content}</p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(comment.id, comment.resolved);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {comment.resolved ? 'Reopen' : 'Resolve'}
                          </Button>
                          {comment.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(comment.id);
                              }}
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Replies Section */}
                      {commentReplies.length > 0 && (
                        <>
                          <div className="px-3 pb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(comment.id);
                              }}
                              className="h-7 px-2 text-xs text-zinc-600 dark:text-zinc-500"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 mr-1" />
                              ) : (
                                <ChevronDown className="h-3 w-3 mr-1" />
                              )}
                              {commentReplies.length} {commentReplies.length === 1 ? 'reply' : 'replies'}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="ml-4 mr-3 mb-3 space-y-2">
                              {commentReplies.map(reply => (
                                <div
                                  key={reply.id}
                                  className="p-2 rounded bg-zinc-50 dark:bg-zinc-100/50 border border-zinc-200 dark:border-zinc-300"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-500">
                                      {reply.profiles?.full_name || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                      {new Date(reply.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-500">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Reply Input */}
                      <div className="px-3 pb-3 flex gap-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => {
                            const newTexts = new Map(replyTexts);
                            newTexts.set(comment.id, e.target.value);
                            setReplyTexts(newTexts);
                          }}
                          className="flex-1 min-h-[60px] text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddReply(comment.id);
                          }}
                          disabled={!replyText.trim()}
                          className="h-auto px-3"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommentsPanel;
