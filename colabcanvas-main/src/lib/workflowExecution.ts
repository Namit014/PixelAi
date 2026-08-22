import { Node, Edge } from '@xyflow/react';
import { NodeData } from '@/types/workflow';

export interface ExecutionNode {
  id: string;
  type: string;
  data: NodeData;
  dependencies: string[];
}

export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  creditsUsed: number;
}

/**
 * Parse ReactFlow graph into execution DAG
 */
export function parseWorkflowGraph(nodes: Node[], edges: Edge[]): ExecutionNode[] {
  const executionNodes: ExecutionNode[] = [];
  
  // Build adjacency map for dependencies
  const dependencyMap = new Map<string, string[]>();
  edges.forEach(edge => {
    const deps = dependencyMap.get(edge.target) || [];
    deps.push(edge.source);
    dependencyMap.set(edge.target, deps);
  });
  
  // Create execution nodes
  nodes.forEach(node => {
    const data = node.data as NodeData;
    executionNodes.push({
      id: node.id,
      type: data.nodeType,
      data: data,
      dependencies: dependencyMap.get(node.id) || [],
    });
  });
  
  return executionNodes;
}

/**
 * Topological sort to determine execution order
 */
export function topologicalSort(executionNodes: ExecutionNode[]): string[][] {
  const nodeMap = new Map(executionNodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const levels: string[][] = [];
  
  // Find nodes with no dependencies for level 0
  let currentLevel = executionNodes
    .filter(n => n.dependencies.length === 0)
    .map(n => n.id);
  
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach(id => visited.add(id));
    
    // Find next level: nodes whose dependencies are all visited
    const nextLevel = executionNodes
      .filter(n => !visited.has(n.id))
      .filter(n => n.dependencies.every(dep => visited.has(dep)))
      .map(n => n.id);
    
    currentLevel = nextLevel;
  }
  
  return levels;
}

/**
 * Validate workflow for circular dependencies
 */
export function validateWorkflow(nodes: Node[], edges: Edge[]): { valid: boolean; error?: string } {
  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });
  
  // Input/output nodes don't need connections
  const requiresConnection = nodes.filter(n => {
    const data = n.data as NodeData;
    return !['upload', 'textInput', 'promptInput', 'imageOutput', 'export'].includes(data.nodeType);
  });
  
  const disconnected = requiresConnection.filter(n => !connectedNodes.has(n.id));
  if (disconnected.length > 0) {
    const labels = disconnected.map(n => (n.data as NodeData).label).join(', ');
    return {
      valid: false,
      error: `Nodes not connected: ${labels}`
    };
  }
  
  // Check for cycles using DFS
  const adjList = new Map<string, string[]>();
  edges.forEach(edge => {
    const neighbors = adjList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjList.set(edge.source, neighbors);
  });
  
  const hasCycle = (node: string, visited: Set<string>, recStack: Set<string>): boolean => {
    visited.add(node);
    recStack.add(node);
    
    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, visited, recStack)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    
    recStack.delete(node);
    return false;
  };
  
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id, visited, recStack)) {
        return { valid: false, error: 'Circular dependency detected' };
      }
    }
  }
  
  // Check node limit
  if (nodes.length > 1000) {
    return { valid: false, error: 'Maximum 1000 nodes allowed' };
  }
  
  return { valid: true };
}

/**
 * Calculate credits for a node execution
 */
export function calculateNodeCredits(nodeType: string, config: Record<string, any>): number {
  switch (nodeType) {
    case 'imageGenerator':
      return config.highRes ? 5 : 2;
    case 'videoGenerator':
      return 15;
    case 'upscaler':
      return 1;
    case 'batchGenerator':
      return (config.count || 1) * 2;
    default:
      return 0; // Text processing and logic nodes are free
  }
}
