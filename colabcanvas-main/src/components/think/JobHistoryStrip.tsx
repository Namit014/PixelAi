import React, { useRef, useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutonomousJob } from '@/hooks/useAutonomousJobs';

interface JobHistoryStripProps {
  jobs: AutonomousJob[];
  onNewChat: () => void;
  onSelectJob: (job: AutonomousJob) => void;
  onDeleteJob?: (jobId: string) => void;
}

export function JobHistoryStrip({ jobs, onNewChat, onSelectJob, onDeleteJob }: JobHistoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [jobs.length]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  const handleDelete = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (deleteConfirm === jobId) {
      onDeleteJob?.(jobId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(jobId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="relative flex items-center gap-1 mt-2">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] shrink-0 border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-3 w-3" /> New Chat
        </button>
        {jobs.slice(0, 5).map((job) => (
          <div key={job.id} className="relative group shrink-0">
            <button
              onClick={() => onSelectJob(job)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border transition-colors',
                job.state === 'COMPLETE' && 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                job.state === 'FAILED' && 'bg-destructive/10 border-destructive/20 text-destructive',
                job.state !== 'COMPLETE' && job.state !== 'FAILED' && 'bg-primary/10 border-primary/20 text-primary animate-pulse',
              )}
            >
              {(job.objective as any)?.goal?.slice(0, 20) || 'Job'}
              {job.state === 'COMPLETE' ? <Check className="h-3 w-3" /> : job.state === 'FAILED' ? <X className="h-3 w-3" /> : <RefreshCw className="h-3 w-3 animate-spin" />}
            </button>
            {onDeleteJob && (job.state === 'COMPLETE' || job.state === 'FAILED') && (
              <button
                onClick={(e) => handleDelete(e, job.id)}
                className={cn(
                  "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center transition-all",
                  deleteConfirm === job.id
                    ? "bg-destructive text-destructive-foreground scale-110"
                    : "bg-muted border border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                )}
                title={deleteConfirm === job.id ? "Click again to confirm" : "Delete job"}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
