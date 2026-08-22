export type NodeType = 
  | 'imageOutput'
  | 'textInput'
  | 'promptInput'
  | 'imageGenerator'
  | 'videoGenerator'
  | 'videoOutput'
  | 'upscaler'
  | 'assistant'
  | 'upload'
  | 'batchGenerator'
  | 'conditional'
  | 'merge'
  | 'random'
  | 'loop'
  | 'export';

export type NodeStatus = 'idle' | 'pending' | 'running' | 'success' | 'error';

export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  config: Record<string, any>;
  status?: NodeStatus;
  result?: any;
  error?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isTemplate: boolean;
  isPublic: boolean;
  templateCategory?: string;
  tags: string[];
  viewCount: number;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  creditsUsed: number;
  errorMessage?: string;
}

export interface NodeExecutionResult {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: NodeStatus;
  resultData?: any;
  creditsUsed: number;
  executionTimeMs?: number;
  errorMessage?: string;
}
