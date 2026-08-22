import { useState, useEffect } from 'react';

interface GenerationTimerProps {
  startTime: number;
  deadlineMs: number;
  progress?: {
    current: number;
    total: number;
    step: string;
  } | null;
}

export const GenerationTimer = ({ startTime, deadlineMs, progress }: GenerationTimerProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.floor((now - startTime) / 1000);
  const remaining = Math.max(0, Math.floor((startTime + deadlineMs - now) / 1000));
  const progressPct = progress ? Math.round((progress.current / Math.max(1, progress.total)) * 100) : Math.min(95, Math.floor((elapsed / (deadlineMs / 1000)) * 100));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground">
        {formatTime(elapsed)} / {formatTime(Math.floor(deadlineMs / 1000))}
      </span>
      {progress && (
        <span className="text-[10px] text-muted-foreground">
          {progress.current}/{progress.total}
        </span>
      )}
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {remaining > 0 && remaining < deadlineMs / 1000 && (
        <span className="text-[10px] text-muted-foreground">
          ~{formatTime(remaining)} left
        </span>
      )}
    </div>
  );
};