import { useState, useCallback } from 'react';
import type { AgentTask, AgentSubtask } from '@/components/ui/agent-plan';

export type GenerationStep = 
  | 'searching-references'
  | 'analyzing'
  | 'generating'
  | 'quality-check'
  | 'complete';

export interface GenerationPlanOptions {
  designType?: string;
  iterationCount?: number;
  hasReference?: boolean;
  isSearchingReferences?: boolean;
}

export function useGenerationPlan() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [currentStep, setCurrentStep] = useState<GenerationStep | null>(null);
  const [completedSnapshot, setCompletedSnapshot] = useState<AgentTask[] | null>(null);

  const createDesignGenerationPlan = useCallback((options: GenerationPlanOptions = {}): AgentTask[] => {
    const { designType = 'design', iterationCount = 5, hasReference = false, isSearchingReferences = false } = options;

    const plan: AgentTask[] = [];

    // Add reference search step if searching
    if (isSearchingReferences) {
      plan.push({
        id: '0',
        title: 'Finding Inspirations',
        description: 'Searching for design references that match your style',
        status: 'pending',
        priority: 'high',
        level: 0,
        dependencies: [],
        subtasks: [
          { id: '0.1', title: 'Query design databases', description: 'Searching curated design collections', status: 'pending', priority: 'high', tools: ['reference-curator'] },
          { id: '0.2', title: 'Filter by relevance', description: 'Selecting references that match your style', status: 'pending', priority: 'medium', tools: ['ai-filter'] },
          { id: '0.3', title: 'Curate top matches', description: 'Preparing the best inspirations for you', status: 'pending', priority: 'medium', tools: ['curator'] }
        ]
      });
    }

    // Analyzing step
    if (!isSearchingReferences || iterationCount > 0) {
      plan.push({
        id: '1',
        title: 'Analyzing Request',
        description: 'Understanding your design requirements',
        status: 'pending',
        priority: 'high',
        level: 0,
        dependencies: isSearchingReferences ? ['0'] : [],
        subtasks: [
          { id: '1.1', title: 'Parse design brief', description: 'Extracting key requirements from your prompt', status: 'pending', priority: 'high', tools: ['text-analyzer'] },
          { id: '1.2', title: `Detect design type: ${designType}`, description: 'Identifying the category of design needed', status: 'pending', priority: 'high', tools: ['design-classifier'] },
          { id: '1.3', title: 'Extract style keywords', description: 'Identifying style preferences and constraints', status: 'pending', priority: 'medium', tools: ['style-extractor'] }
        ]
      });
    }

    // Reference analysis removed — reference is passed directly to generation

    // Generation step
    const genStepId = '2';
    const iterationSubtasks: AgentSubtask[] = [];
    
    for (let i = 1; i <= iterationCount; i++) {
      iterationSubtasks.push({
        id: `${genStepId}.${i}`,
        title: `Generating variation ${i}`,
        description: `Creating unique design variation ${i} of ${iterationCount}`,
        status: 'pending',
        priority: 'high',
        tools: ['image-generator']
      });
    }

    plan.push({
      id: genStepId,
      title: `Generating ${iterationCount} Designs`,
      description: `Creating ${iterationCount} unique variations`,
      status: 'pending',
      priority: 'high',
      level: 0,
      dependencies: ['1'],
      subtasks: iterationSubtasks
    });

    // Finalizing step
    plan.push({
      id: '3',
      title: 'Finalizing',
      description: 'Preparing designs for display',
      status: 'pending',
      priority: 'medium',
      level: 0,
      dependencies: [genStepId],
      subtasks: [
        { id: '3.1', title: 'Process images', description: 'Optimizing images for display', status: 'pending', priority: 'medium', tools: ['image-processor'] },
        { id: '3.2', title: 'Ready for review', description: 'Designs ready for your selection', status: 'pending', priority: 'low' }
      ]
    });

    return plan;
  }, []);

  const initializePlan = useCallback((options: GenerationPlanOptions = {}) => {
    const plan = createDesignGenerationPlan(options);
    setTasks(plan);
    setCurrentStep('analyzing');
    setCompletedSnapshot(null);
    return plan;
  }, [createDesignGenerationPlan]);

  const updateTaskStatus = useCallback((taskId: string, status: AgentTask['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
  }, []);

  const updateSubtaskStatus = useCallback((taskId: string, subtaskId: string, status: AgentSubtask['status']) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId ? { ...subtask, status } : subtask
        );
        
        const allCompleted = updatedSubtasks.every(s => s.status === 'completed');
        const anyInProgress = updatedSubtasks.some(s => s.status === 'in-progress');
        const anyFailed = updatedSubtasks.some(s => s.status === 'failed');
        
        let taskStatus = task.status;
        if (allCompleted) taskStatus = 'completed';
        else if (anyFailed) taskStatus = 'failed';
        else if (anyInProgress) taskStatus = 'in-progress';
        
        return { ...task, subtasks: updatedSubtasks, status: taskStatus };
      }
      return task;
    }));
  }, []);

  const startStep = useCallback((step: GenerationStep) => {
    setCurrentStep(step);
    
    const getTaskId = (tasks: AgentTask[]) => {
      if (step === 'searching-references') return '0';
      if (step === 'analyzing') return '1';
      if (step === 'generating') return tasks.find(t => t.title.includes('Generating'))?.id || '2';
      if (step === 'quality-check') return tasks.find(t => t.title.includes('Finalizing'))?.id || '3';
      return '';
    };

    setTasks(prev => {
      const taskId = getTaskId(prev);
      if (!taskId) return prev;
      return prev.map(task => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.length > 0
            ? task.subtasks.map((s, i) => i === 0 ? { ...s, status: 'in-progress' as const } : s)
            : task.subtasks;
          return { ...task, status: 'in-progress' as const, subtasks: updatedSubtasks };
        }
        return task;
      });
    });
  }, []);

  const completeStep = useCallback((step: GenerationStep) => {
    setTasks(prev => {
      const getTaskId = (tasks: AgentTask[]) => {
        if (step === 'searching-references') return '0';
        if (step === 'analyzing') return '1';
        if (step === 'generating') return tasks.find(t => t.title.includes('Generating'))?.id || '2';
        if (step === 'quality-check') return tasks.find(t => t.title.includes('Finalizing'))?.id || '3';
        return '';
      };
      const taskId = getTaskId(prev);
      if (!taskId) return prev;
      return prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: 'completed',
            subtasks: task.subtasks.map(s => ({ ...s, status: 'completed' as const }))
          };
        }
        return task;
      });
    });
  }, []);

  const updateIterationProgress = useCallback((iterationIndex: number, status: AgentSubtask['status']) => {
    setTasks(prev => {
      const genTask = prev.find(t => t.title.includes('Generating'));
      if (!genTask) return prev;
      const subtaskId = `${genTask.id}.${iterationIndex + 1}`;
      return prev.map(task => {
        if (task.id === genTask.id) {
          const updatedSubtasks = task.subtasks.map(s =>
            s.id === subtaskId ? { ...s, status } : s
          );
          const allCompleted = updatedSubtasks.every(s => s.status === 'completed');
          const anyInProgress = updatedSubtasks.some(s => s.status === 'in-progress');
          const anyFailed = updatedSubtasks.some(s => s.status === 'failed');
          let taskStatus = task.status;
          if (allCompleted) taskStatus = 'completed';
          else if (anyFailed) taskStatus = 'failed';
          else if (anyInProgress) taskStatus = 'in-progress';
          return { ...task, subtasks: updatedSubtasks, status: taskStatus };
        }
        return task;
      });
    });
  }, []);

  // Snapshot current tasks as completed before resetting
  const snapshotCompleted = useCallback(() => {
    setCompletedSnapshot(prev => {
      // Only snapshot if we have tasks
      if (tasks.length > 0) return [...tasks];
      return prev;
    });
  }, [tasks]);

  const resetPlan = useCallback(() => {
    setTasks([]);
    setCurrentStep(null);
  }, []);

  const clearSnapshot = useCallback(() => {
    setCompletedSnapshot(null);
  }, []);

  const getExpandedTaskIds = useCallback(() => {
    return tasks.filter(t => t.status === 'in-progress').map(t => t.id);
  }, [tasks]);

  return {
    tasks,
    currentStep,
    completedSnapshot,
    initializePlan,
    updateTaskStatus,
    updateSubtaskStatus,
    startStep,
    completeStep,
    updateIterationProgress,
    snapshotCompleted,
    resetPlan,
    clearSnapshot,
    getExpandedTaskIds
  };
}
