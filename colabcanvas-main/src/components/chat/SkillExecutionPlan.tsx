import { Check, Loader2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkillStep } from '@/lib/rumiSkillsConfig';

interface SkillExecutionPlanProps {
  planTitle: string;
  steps: SkillStep[];
  currentStepIndex: number;
  brandInfo?: { name?: string; industry?: string };
}

export const SkillExecutionPlan = ({ 
  planTitle, 
  steps, 
  currentStepIndex,
  brandInfo 
}: SkillExecutionPlanProps) => {
  return (
    <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
      <h4 className="font-semibold text-xs flex items-center gap-2 mb-2.5">
        <Target className="w-3.5 h-3.5 text-primary" />
        {planTitle} {brandInfo?.name && `for ${brandInfo.name}`}
      </h4>
      
      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isComplete = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;
          
          return (
            <div 
              key={step.id}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg transition-colors text-xs",
                isCurrent && "bg-primary/5 border border-primary/20",
                isComplete && "opacity-60"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                isComplete && "bg-green-500",
                isCurrent && "bg-primary",
                isPending && "bg-zinc-200"
              )}>
                {isComplete ? (
                  <Check className="w-2.5 h-2.5 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                ) : (
                  <span className="text-[10px] text-zinc-500">{idx + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  isComplete && "line-through"
                )}>{step.title}</p>
                <p className="text-muted-foreground text-[11px]">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillExecutionPlan;
