import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX } from
"lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// Type definitions
export interface AgentSubtask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'need-help';
  priority: 'low' | 'medium' | 'high';
  tools?: string[];
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'need-help';
  priority: 'low' | 'medium' | 'high';
  level: number;
  dependencies: string[];
  subtasks: AgentSubtask[];
}

export interface AgentPlanProps {
  tasks: AgentTask[];
  onTaskStatusChange?: (taskId: string, status: string) => void;
  defaultExpandedTasks?: string[];
  compact?: boolean;
}

export function AgentPlan({
  tasks,
  onTaskStatusChange,
  defaultExpandedTasks = [],
  compact = false
}: AgentPlanProps) {
  const [expandedTasks, setExpandedTasks] = useState<string[]>(defaultExpandedTasks);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});

  // Check for reduced motion preference
  const prefersReducedMotion =
  typeof window !== 'undefined' ?
  window.matchMedia('(prefers-reduced-motion: reduce)').matches :
  false;

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
    prev.includes(taskId) ?
    prev.filter((id) => id !== taskId) :
    [...prev, taskId]
    );
  };

  // Toggle subtask expansion
  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Animation variants with reduced motion support
  const taskVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: prefersReducedMotion ? "tween" as const : "spring" as const,
        stiffness: 500,
        damping: 30,
        duration: prefersReducedMotion ? 0.2 : undefined
      }
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5,
      transition: { duration: 0.15 }
    }
  };

  const subtaskListVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      overflow: "hidden" as const
    },
    visible: {
      height: "auto",
      opacity: 1,
      overflow: "visible" as const,
      transition: {
        duration: 0.25,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren" as const,
        ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number]
      }
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden" as const,
      transition: {
        duration: 0.2,
        ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number]
      }
    }
  };

  const subtaskVariants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -10
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: prefersReducedMotion ? "tween" as const : "spring" as const,
        stiffness: 500,
        damping: 25,
        duration: prefersReducedMotion ? 0.2 : undefined
      }
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -10,
      transition: { duration: 0.15 }
    }
  };

  const subtaskDetailsVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      overflow: "hidden" as const
    },
    visible: {
      opacity: 1,
      height: "auto",
      overflow: "visible" as const,
      transition: {
        duration: 0.25,
        ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number]
      }
    }
  };

  const statusBadgeVariants = {
    initial: { scale: 1 },
    animate: {
      scale: prefersReducedMotion ? 1 : [1, 1.08, 1],
      transition: {
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number]
      }
    }
  };

  const getStatusIcon = (status: string, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';

    switch (status) {
      case 'completed':
        return <CheckCircle2 className={`${sizeClass} text-emerald-500`} />;
      case 'in-progress':
        return <CircleDotDashed className={`${sizeClass} text-blue-500 animate-spin`} style={{ animationDuration: '3s' }} />;
      case 'need-help':
        return <CircleAlert className={`${sizeClass} text-yellow-500`} />;
      case 'failed':
        return <CircleX className={`${sizeClass} text-red-500`} />;
      default:
        return <Circle className={`${sizeClass} text-muted-foreground`} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'need-help':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={`bg-background text-foreground ${compact ? 'p-0' : 'h-full overflow-auto p-2'}`}>
      <motion.div
        className="bg-card rounded-lg border shadow-sm overflow-hidden border-primary-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.2, 0.65, 0.3, 0.9]
          }
        }}>

        <LayoutGroup>
          <div className={compact ? "p-3" : "p-4"}>
            <ul className="space-y-1 overflow-hidden">
              {tasks.map((task, index) => {
                const isExpanded = expandedTasks.includes(task.id);
                const isCompleted = task.status === "completed";

                return (
                  <motion.li
                    key={task.id}
                    className={`${index !== 0 ? "mt-1 pt-2" : ""}`}
                    initial="hidden"
                    animate="visible"
                    variants={taskVariants}>

                    {/* Task row */}
                    <motion.div
                      className="group flex items-center px-3 py-1.5 rounded-md cursor-pointer"
                      onClick={() => toggleTaskExpansion(task.id)}
                      whileHover={{
                        backgroundColor: "hsl(var(--muted) / 0.5)",
                        transition: { duration: 0.2 }
                      }}>

                      <motion.div
                        className="mr-2 flex-shrink-0"
                        whileTap={{ scale: 0.9 }}>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={task.status}
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                            transition={{
                              duration: 0.2,
                              ease: [0.2, 0.65, 0.3, 0.9]
                            }}>

                            {getStatusIcon(task.status)}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      <div className="flex min-w-0 flex-grow items-center justify-between">
                        <div className="mr-2 flex-1 truncate">
                          <span
                            className={`text-sm ${isCompleted ? "text-muted-foreground line-through" : ""}`}>

                            {task.title}
                          </span>
                        </div>

                        <div className="flex flex-shrink-0 items-center space-x-2 text-xs">
                          <motion.span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(task.status)}`}
                            variants={statusBadgeVariants}
                            initial="initial"
                            animate="animate"
                            key={task.status}>

                            {task.status}
                          </motion.span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Subtasks */}
                    <AnimatePresence mode="wait">
                      {isExpanded && task.subtasks.length > 0 &&
                      <motion.div
                        className="relative overflow-hidden"
                        variants={subtaskListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout>

                          {/* Vertical connecting line */}
                          <div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-muted-foreground/30" />
                          <ul className="mt-1 mr-2 mb-1.5 ml-3 space-y-0.5">
                            {task.subtasks.map((subtask) => {
                            const subtaskKey = `${task.id}-${subtask.id}`;
                            const isSubtaskExpanded = expandedSubtasks[subtaskKey];

                            return (
                              <motion.li
                                key={subtask.id}
                                className="group flex flex-col py-0.5 pl-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubtaskExpansion(task.id, subtask.id);
                                }}
                                variants={subtaskVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout>

                                  <motion.div
                                  className="flex flex-1 items-center rounded-md p-1"
                                  whileHover={{
                                    backgroundColor: "hsl(var(--muted) / 0.3)",
                                    transition: { duration: 0.2 }
                                  }}
                                  layout>

                                    <motion.div
                                    className="mr-2 flex-shrink-0"
                                    layout>

                                      <AnimatePresence mode="wait">
                                        <motion.div
                                        key={subtask.status}
                                        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                                        transition={{
                                          duration: 0.2,
                                          ease: [0.2, 0.65, 0.3, 0.9]
                                        }}>

                                          {getStatusIcon(subtask.status, 'sm')}
                                        </motion.div>
                                      </AnimatePresence>
                                    </motion.div>

                                    <span
                                    className={`cursor-pointer text-xs ${subtask.status === "completed" ? "text-muted-foreground line-through" : ""}`}>

                                      {subtask.title}
                                    </span>
                                  </motion.div>

                                  <AnimatePresence mode="wait">
                                    {isSubtaskExpanded &&
                                  <motion.div
                                    className="text-muted-foreground border-foreground/20 mt-1 ml-1.5 border-l border-dashed pl-5 text-xs overflow-hidden"
                                    variants={subtaskDetailsVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    layout>

                                        <p className="py-1">{subtask.description}</p>
                                        {subtask.tools && subtask.tools.length > 0 &&
                                    <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-1.5">
                                            <span className="text-muted-foreground font-medium">
                                              Tools:
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {subtask.tools.map((tool, idx) =>
                                        <motion.span
                                          key={idx}
                                          className="bg-secondary/40 text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium"
                                          initial={{ opacity: 0, y: -5 }}
                                          animate={{
                                            opacity: 1,
                                            y: 0,
                                            transition: {
                                              duration: 0.2,
                                              delay: idx * 0.05
                                            }
                                          }}>

                                                  {tool}
                                                </motion.span>
                                        )}
                                            </div>
                                          </div>
                                    }
                                      </motion.div>
                                  }
                                  </AnimatePresence>
                                </motion.li>);

                          })}
                          </ul>
                        </motion.div>
                      }
                    </AnimatePresence>
                  </motion.li>);

              })}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>);

}

export default AgentPlan;