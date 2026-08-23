import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, MiniMap, useNodesState, useEdgesState, addEdge, Connection, Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/stores/workflowStore';
import WorkflowToolbar from './WorkflowToolbar';
import WorkflowBottomControls from './WorkflowBottomControls';
import CustomNode from './nodes/CustomNode';
import CustomEdge from './nodes/CustomEdge';
import ExecutionPanel from './ExecutionPanel';
import OnboardingTutorial from './OnboardingTutorial';
import ForkBadge from './ForkBadge';
import CanvasFloatingToolbar from './CanvasFloatingToolbar';
import CommandPalette from './CommandPalette';
import KeyboardShortcutsHandler from './KeyboardShortcutsHandler';
import CommentPin from './CommentPin';
import CommentsPanel from './CommentsPanel';
import CreateCommentModal from './CreateCommentModal';
import { CosmoEmptyState } from './CosmoEmptyState';
import { NodeData, NodeType } from '@/types/workflow';
import { NODE_TYPES } from '@/lib/workflowNodeTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
const nodeTypes = {
  custom: CustomNode
};
const edgeTypes = {
  default: CustomEdge
};
const WorkflowEditor = () => {
  const {
    user
  } = useAuth();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const {
    workflowId,
    workflowTitle,
    nodes: storeNodes,
    edges: storeEdges,
    viewport,
    activeTool,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    setViewport: setStoreViewport,
    setIsSaving,
    setLastSaved,
    setActiveTool
  } = useWorkflowStore();

  // Comment system state
  const [comments, setComments] = useState<any[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentPosition, setCommentPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Auto-open comments panel when comment tool is activated
  useEffect(() => {
    if (activeTool === 'comment') {
      setIsPanelOpen(true);
    } else {
      setIsPanelOpen(false);
    }
  }, [activeTool]);
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load comments
  useEffect(() => {
    if (!workflowId) return;
    loadComments();
    const channel = supabase.channel(`workflow-editor-comments-${workflowId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'workflow_comments',
      filter: `workflow_id=eq.${workflowId}`
    }, () => {
      loadComments();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId]);
  const loadComments = async () => {
    if (!workflowId) return;
    const {
      data,
      error
    } = await supabase.from('workflow_comments').select('*').eq('workflow_id', workflowId);
    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    // Fetch profile names separately
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const {
        data: profiles
      } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: {
          full_name: profileMap.get(comment.user_id) || 'Unknown'
        }
      }));
      setComments(commentsWithProfiles);
    }
  };

  // Auto-save on changes
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
    }, 3000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges]);
  const saveWorkflow = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let currentWorkflowId = workflowId;

      // Create workflow if doesn't exist
      if (!currentWorkflowId) {
        const {
          data,
          error
        } = await supabase.from('workflows').insert({
          user_id: user.id,
          title: workflowTitle
        }).select().single();
        if (error) throw error;
        currentWorkflowId = data.id;
        useWorkflowStore.getState().setWorkflowId(currentWorkflowId);
      }

      // Delete existing nodes and edges
      await supabase.from('workflow_nodes').delete().eq('workflow_id', currentWorkflowId);
      await supabase.from('workflow_edges').delete().eq('workflow_id', currentWorkflowId);

      // Insert new nodes
      if (nodes.length > 0) {
        const nodeRecords = nodes.map(n => {
          const nodeData = n.data as NodeData;
          return {
            workflow_id: currentWorkflowId,
            node_id: n.id,
            node_type: nodeData.nodeType,
            position_x: n.position.x,
            position_y: n.position.y,
            config: nodeData.config as any
          };
        });
        const {
          error: nodesError
        } = await supabase.from('workflow_nodes').insert(nodeRecords);
        if (nodesError) throw nodesError;
      }

      // Insert new edges
      if (edges.length > 0) {
        const edgeRecords = edges.map(e => ({
          workflow_id: currentWorkflowId,
          edge_id: e.id,
          source_node_id: e.source,
          target_node_id: e.target,
          source_handle: e.sourceHandle,
          target_handle: e.targetHandle
        }));
        const {
          error: edgesError
        } = await supabase.from('workflow_edges').insert(edgeRecords);
        if (edgesError) throw edgesError;
      }
      setLastSaved(new Date());
      setStoreNodes(nodes);
      setStoreEdges(edges);
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };
  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge(connection, eds));
  }, [setEdges]);
  const handleNodeDrop = useCallback((nodeType: NodeType, position?: {
    x: number;
    y: number;
  }) => {
    // Use provided position or viewport center
    const nodePosition = position || {
      x: viewport.x + (window.innerWidth / 2 - 100) / viewport.zoom,
      y: viewport.y + (window.innerHeight / 2 - 50) / viewport.zoom
    };
    const newNode: Node = {
      id: `${nodeType}_${Date.now()}`,
      type: 'custom',
      position: nodePosition,
      data: {
        label: NODE_TYPES[nodeType].label,
        nodeType,
        config: {}
      } as NodeData
    };
    setNodes(nds => nds.concat(newNode));
  }, [setNodes, viewport]);
  const handleDeleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected));
  }, [setNodes]);
  const handleDuplicateSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    const duplicatedNodes = selectedNodes.map(node => ({
      ...node,
      id: `${(node.data as NodeData).nodeType}_${Date.now()}_${Math.random()}`,
      position: {
        x: node.position.x + 20,
        y: node.position.y + 20
      },
      selected: false
    }));
    setNodes(nds => [...nds.map(n => ({
      ...n,
      selected: false
    })), ...duplicatedNodes]);
  }, [nodes, setNodes]);
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (activeTool !== 'comment' || !reactFlowInstance.current) return;
    const position = reactFlowInstance.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
    setCommentPosition(position);
    setCommentModalOpen(true);
  }, [activeTool]);
  return <div className="h-full w-full flex flex-col bg-zinc-50 relative">
      {/* Empty state overlay - covers entire container including toolbar */}
      {nodes.length === 0 && <CosmoEmptyState onNodeAdd={handleNodeDrop} />}
      
      <OnboardingTutorial />
      <ForkBadge />
      <WorkflowToolbar />
      
      <div className="flex-1 relative" onDragOver={e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }} onDrop={e => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType || !reactFlowInstance.current) return;
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      handleNodeDrop(nodeType, position);
    }}>
        {/* Comments button removed - panel auto-opens when comment tool is activated */}
        
        <div className="h-full w-full" onClick={handleCanvasClick}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} proOptions={{
          hideAttribution: true
        }} onInit={instance => {
          reactFlowInstance.current = instance;
        }} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView defaultViewport={viewport} onViewportChange={setStoreViewport} className="bg-zinc-50" panOnDrag={activeTool === 'hand'} nodesDraggable={activeTool === 'select'} nodesConnectable={activeTool === 'select'} elementsSelectable={activeTool === 'select'} onClick={handleCanvasClick} style={{
          cursor: activeTool === 'comment' ? 'crosshair' : activeTool === 'hand' ? 'grab' : 'default'
        }} noDragClassName="nodrag" noWheelClassName="nowheel" minZoom={0.1} maxZoom={2}>
          <Background color="#d4d4d8" gap={16} size={1} />
          
          <CanvasFloatingToolbar onNodeAdd={handleNodeDrop} />
          <WorkflowBottomControls />
          <CommandPalette onSave={saveWorkflow} onNodeAdd={handleNodeDrop} />
          <KeyboardShortcutsHandler onSave={saveWorkflow} onDeleteSelected={handleDeleteSelected} onDuplicateSelected={handleDuplicateSelected} />
          
          {/* MiniMap toggle button */}
          {nodes.length > 0 && <div className="absolute bottom-20 right-5 z-40" onMouseEnter={() => setShowMiniMap(true)} onMouseLeave={() => setShowMiniMap(false)}>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-zinc-200 shadow-lg">
              <MapIcon className="h-4 w-4 text-zinc-600" />
            </Button>
            {showMiniMap && <MiniMap className="!absolute !bottom-12 !right-0 bg-white border border-zinc-200 !rounded-lg shadow-xl !w-48 !h-32" nodeColor={node => {
              if (node.data?.status === 'success') return '#22c55e';
              if (node.data?.status === 'error') return '#ef4444';
              if (node.data?.status === 'running') return '#3b82f6';
              return '#a1a1aa';
            }} maskColor="rgba(255, 255, 255, 0.6)" />}
          </div>}
          
          {/* Render comment pins */}
          {comments.map(comment => <CommentPin key={comment.id} id={comment.id} position={{
            x: comment.position_x,
            y: comment.position_y
          }} authorName={comment.profiles?.full_name || 'Unknown'} content={comment.content} resolved={comment.resolved} onClick={() => setIsPanelOpen(true)} />)}
          
          <CommentsPanel workflowId={workflowId} isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
        </ReactFlow>
        </div>
        
        <ExecutionPanel />
        <CreateCommentModal workflowId={workflowId} position={commentPosition} isOpen={commentModalOpen} onClose={() => {
        setCommentModalOpen(false);
        setCommentPosition(null);
      }} />
      </div>
    </div>;
};
export default WorkflowEditor;