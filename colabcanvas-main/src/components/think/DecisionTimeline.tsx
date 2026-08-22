import React from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Edit, 
  Clock, 
  Lightbulb,
  Palette,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DecisionInfluence {
  type: 'brand_memory' | 'past_campaign' | 'market_trend' | 'user_preference';
  label: string;
  weight?: number;
}

interface TimelineDecision {
  id: string;
  title: string;
  reasoning: string;
  status: 'accepted' | 'rejected' | 'modified' | 'pending';
  createdAt: string;
  influences: DecisionInfluence[];
  riskLevel?: 'low' | 'medium' | 'high';
  performanceProbability?: number;
}

interface DecisionTimelineProps {
  decisions: TimelineDecision[];
  onDecisionClick?: (decisionId: string) => void;
  className?: string;
}

const statusConfig = {
  accepted: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success',
    label: 'Accepted',
  },
  rejected: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive',
    label: 'Rejected',
  },
  modified: {
    icon: Edit,
    color: 'text-warning',
    bg: 'bg-warning',
    label: 'Modified',
  },
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted-foreground',
    label: 'Pending',
  },
};

const influenceIcons = {
  brand_memory: Palette,
  past_campaign: BookOpen,
  market_trend: TrendingUp,
  user_preference: Lightbulb,
};

const influenceLabels = {
  brand_memory: 'Brand Memory',
  past_campaign: 'Past Campaign',
  market_trend: 'Market Trend',
  user_preference: 'Your Preference',
};

export function DecisionTimeline({
  decisions,
  onDecisionClick,
  className,
}: DecisionTimelineProps) {
  if (decisions.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        className
      )}>
        <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No decisions yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start a creative session to see decision history
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[400px]', className)}>
      <div className="relative pl-6 pr-2">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {decisions.map((decision, index) => {
            const status = statusConfig[decision.status];
            const StatusIcon = status.icon;
            const isLast = index === decisions.length - 1;

            return (
              <div 
                key={decision.id}
                className={cn(
                  'relative group cursor-pointer',
                  'transition-colors duration-150',
                  'hover:bg-muted/30 -ml-2 pl-2 pr-2 py-2 rounded-lg'
                )}
                onClick={() => onDecisionClick?.(decision.id)}
              >
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-[-13px] top-3 w-3 h-3 rounded-full border-2 border-background',
                  status.bg,
                  'ring-2 ring-background'
                )} />

                {/* Content */}
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground line-clamp-1">
                        {decision.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            status.color
                          )}
                        >
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {status.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(decision.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>

                    {decision.performanceProbability !== undefined && (
                      <div className="text-right">
                        <span className={cn(
                          'text-sm font-medium tabular-nums',
                          decision.performanceProbability >= 70 ? 'text-success' :
                          decision.performanceProbability >= 40 ? 'text-warning' :
                          'text-muted-foreground'
                        )}>
                          {decision.performanceProbability}%
                        </span>
                        <p className="text-[9px] text-muted-foreground">probability</p>
                      </div>
                    )}
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {decision.reasoning}
                  </p>

                  {/* Influences */}
                  {decision.influences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {decision.influences.slice(0, 3).map((influence, idx) => {
                        const Icon = influenceIcons[influence.type];
                        return (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-muted/50 hover:bg-muted"
                          >
                            <Icon className="h-2.5 w-2.5 mr-1 opacity-60" />
                            {influence.label}
                          </Badge>
                        );
                      })}
                      {decision.influences.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-muted/50"
                        >
                          +{decision.influences.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
