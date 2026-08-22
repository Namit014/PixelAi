import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import WorkflowEditor from '@/components/workflow/WorkflowEditor';
import { CosmoLoadingState } from '@/components/workflow/CosmoLoadingState';
import { useWorkflowStore } from '@/stores/workflowStore';
import { NodeData, NodeType } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WorkflowCanvas = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt');
  const [isLoading, setIsLoading] = useState(true);
  
  const { setWorkflowId, setWorkflowTitle, setNodes, setEdges, reset } = useWorkflowStore();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadWorkflow();
  }, [user, workflowId]);

  const loadWorkflow = async () => {
    setIsLoading(true);
    if (!workflowId) {
      // New workflow
      reset();
      setIsLoading(false);
      return;
    }

    try {
      // Load workflow from database
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Load nodes
      const { data: nodes, error: nodesError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId);

      if (nodesError) throw nodesError;

      // Load edges
      const { data: edges, error: edgesError } = await supabase
        .from('workflow_edges')
        .select('*')
        .eq('workflow_id', workflowId);

      if (edgesError) throw edgesError;

      // Convert to ReactFlow format
      const reactFlowNodes = nodes.map(n => {
        const config = typeof n.config === 'object' ? n.config : {};
        return {
          id: n.node_id,
          type: 'custom',
          position: { x: n.position_x, y: n.position_y },
          data: {
            label: (config as any)?.label || n.node_type,
            nodeType: n.node_type as NodeType,
            config: config as Record<string, any>,
          } as NodeData,
        };
      });

      const reactFlowEdges = edges.map(e => ({
        id: e.edge_id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
      }));

      setWorkflowId(workflow.id);
      setWorkflowTitle(workflow.title);
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast.error('Failed to load workflow');
      navigate('/workflow');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <CosmoLoadingState />;
  }

  return (
    <div className="h-screen w-full bg-white">
      <WorkflowEditor />
    </div>
  );
};

export default WorkflowCanvas;
