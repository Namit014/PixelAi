import { useEffect, useState } from 'react';
import { GitFork } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflowStore } from '@/stores/workflowStore';

const ForkBadge = () => {
  const [originalWorkflow, setOriginalWorkflow] = useState<any>(null);
  const { workflowId } = useWorkflowStore();

  useEffect(() => {
    if (!workflowId) return;

    loadForkInfo();
  }, [workflowId]);

  const loadForkInfo = async () => {
    if (!workflowId) return;

    const { data, error } = await supabase
      .from('workflow_forks')
      .select('*, original_workflow:workflows!workflow_forks_original_workflow_id_fkey(*)')
      .eq('forked_workflow_id', workflowId)
      .single();

    if (error || !data) return;

    setOriginalWorkflow(data.original_workflow);
  };

  if (!originalWorkflow) return null;

  return (
    <div className="absolute top-20 left-4 z-10">
      <Badge variant="outline" className="flex items-center gap-2">
        <GitFork className="w-3 h-3" />
        Forked from: {originalWorkflow.title}
      </Badge>
    </div>
  );
};

export default ForkBadge;
