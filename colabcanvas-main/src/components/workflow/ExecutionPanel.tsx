import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, StopCircle, Trash2, Clock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStore } from '@/stores/workflowStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ExecutionPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const { currentExecution, nodes, setIsExecuting } = useWorkflowStore();

  useEffect(() => {
    if (!currentExecution) return;

    // Subscribe to execution results
    const channel = supabase
      .channel('execution-results')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_execution_results',
          filter: `execution_id=eq.${currentExecution.id}`,
        },
        (payload) => {
          console.log('Execution result update:', payload);
          loadExecutionResults();
        }
      )
      .subscribe();

    loadExecutionResults();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentExecution]);

  const loadExecutionResults = async () => {
    if (!currentExecution) return;

    const { data, error } = await supabase
      .from('node_execution_results')
      .select('*')
      .eq('execution_id', currentExecution.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading execution results:', error);
      return;
    }

    setExecutionResults(data || []);
  };

  const handleStop = async () => {
    if (!currentExecution) return;

    try {
      await supabase
        .from('workflow_executions')
        .update({ status: 'failed', error_message: 'Cancelled by user' })
        .eq('id', currentExecution.id);

      setIsExecuting(false);
      toast.info('Execution stopped');
    } catch (error) {
      console.error('Error stopping execution:', error);
      toast.error('Failed to stop execution');
    }
  };

  const handleClear = () => {
    setExecutionResults([]);
    useWorkflowStore.getState().setCurrentExecution(null);
  };

  const getNodeLabel = (nodeId: string): string => {
    const node = nodes.find(n => n.id === nodeId);
    return (node?.data as any)?.label || nodeId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (!currentExecution) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-white border-t border-zinc-200 dark:border-zinc-200 z-20">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-200">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-sm">Execution Progress</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Started {new Date(currentExecution.startedAt).toLocaleTimeString()}</span>
            </div>
            {currentExecution.creditsUsed > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="w-3 h-3" />
                <span>{currentExecution.creditsUsed} credits</span>
              </div>
            )}
          </div>

        <div className="flex items-center gap-2">
          {currentExecution.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <ScrollArea className="h-64">
          <div className="p-4 space-y-2">
            {executionResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-100 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {getNodeLabel(result.node_id)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.node_type}
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                  {result.execution_time_ms && (
                    <span className="text-xs text-muted-foreground">
                      {result.execution_time_ms}ms
                    </span>
                  )}
                  {result.credits_used > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {result.credits_used} credits
                    </span>
                  )}
                </div>
                {result.error_message && (
                  <div className="text-xs text-red-500 ml-3">
                    {result.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ExecutionPanel;
