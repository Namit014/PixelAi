import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from '@xyflow/react';
import { NodeData, WorkflowExecution } from '@/types/workflow';

interface WorkflowState {
  // Current workflow
  workflowId: string | null;
  workflowTitle: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  
  // Execution state
  currentExecution: WorkflowExecution | null;
  isExecuting: boolean;
  executingNodeIds: string[];
  executionProgress: Record<string, number>;
  
  // Auto-save state
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Canvas tools
  activeTool: 'select' | 'hand' | 'comment';
  
  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowTitle: (title: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setCurrentExecution: (execution: WorkflowExecution | null) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  setExecutingNodeIds: (ids: string[]) => void;
  setExecutionProgress: (nodeId: string, progress: number) => void;
  setIsSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setActiveTool: (tool: 'select' | 'hand' | 'comment') => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      workflowId: null,
      workflowTitle: 'Untitled Cosmo',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      currentExecution: null,
      isExecuting: false,
      executingNodeIds: [],
      executionProgress: {},
      isSaving: false,
      lastSaved: null,
      activeTool: 'select',
      
      // Actions
      setWorkflowId: (id) => set({ workflowId: id }),
      setWorkflowTitle: (title) => set({ workflowTitle: title }),
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setViewport: (viewport) => set({ viewport }),
      
      updateNodeData: (nodeId, data) => {
        const { nodes } = get();
        const updatedNodes = nodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, ...data } }
            : node
        );
        set({ nodes: updatedNodes });
      },
      
      setCurrentExecution: (execution) => set({ currentExecution: execution }),
      setIsExecuting: (isExecuting) => set({ isExecuting }),
      setExecutingNodeIds: (ids) => set({ executingNodeIds: ids }),
      setExecutionProgress: (nodeId, progress) => set((state) => ({
        executionProgress: { ...state.executionProgress, [nodeId]: progress }
      })),
      setIsSaving: (isSaving) => set({ isSaving }),
      setLastSaved: (date) => set({ lastSaved: date }),
      setActiveTool: (tool) => set({ activeTool: tool }),
      
      reset: () => set({
        workflowId: null,
        workflowTitle: 'Untitled Cosmo',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        currentExecution: null,
        isExecuting: false,
        executingNodeIds: [],
        executionProgress: {},
        isSaving: false,
        lastSaved: null,
        activeTool: 'select',
      }),
    }),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        workflowId: state.workflowId,
        workflowTitle: state.workflowTitle,
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      }),
    }
  )
);
