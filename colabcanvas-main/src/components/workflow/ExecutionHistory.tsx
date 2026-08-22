import { useState, useEffect } from 'react';
import { History, Play, Eye, Trash2, Clock, Coins, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkflowStore } from '@/stores/workflowStore';

const ExecutionHistory = () => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { workflowId } = useWorkflowStore();

  useEffect(() => {
    if (isOpen && workflowId) {
      loadExecutions();
    }
  }, [isOpen, workflowId]);

  const loadExecutions = async () => {
    if (!workflowId) return;

    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading executions:', error);
      return;
    }

    setExecutions(data || []);
  };

  const handleRerun = async (executionId: string) => {
    // Would trigger workflow execution again
    toast.info('Re-running workflow...');
  };

  const handleViewResults = async (executionId: string) => {
    // Load results into nodes
    const { data, error } = await supabase
      .from('node_execution_results')
      .select('*')
      .eq('execution_id', executionId);

    if (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load results');
      return;
    }

      // Update nodes with results
      data?.forEach((result) => {
        useWorkflowStore.getState().updateNodeData(result.node_id, {
          status: result.status as any,
          result: result.result_data,
          error: result.error_message,
        });
      });

    toast.success('Results loaded');
    setIsOpen(false);
  };

  const handleDelete = async (executionId: string) => {
    const { error } = await supabase
      .from('workflow_executions')
      .delete()
      .eq('id', executionId);

    if (error) {
      console.error('Error deleting execution:', error);
      toast.error('Failed to delete execution');
      return;
    }

    toast.success('Execution deleted');
    loadExecutions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Execution History</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          <div className="space-y-2">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(execution.status)}
                    <Badge variant={execution.status === 'completed' ? 'default' : 'destructive'}>
                      {execution.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(execution.started_at).toLocaleString()}
                  </div>
                </div>

                {execution.completed_at && (
                  <div className="text-xs text-muted-foreground flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {Math.round(
                          (new Date(execution.completed_at).getTime() -
                            new Date(execution.started_at).getTime()) /
                            1000
                        )}s
                      </span>
                    </div>
                    {execution.credits_used > 0 && (
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        <span>{execution.credits_used} credits</span>
                      </div>
                    )}
                  </div>
                )}

                {execution.error_message && (
                  <div className="text-xs text-red-500">
                    {execution.error_message}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewResults(execution.id)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRerun(execution.id)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Re-run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(execution.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ExecutionHistory;
