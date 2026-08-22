import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Shield, 
  Brain, 
  Target,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BrandInsightPanelsProps {
  consistencyScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0-100
  performanceDirection: 'up' | 'down' | 'stable';
  performanceExplanation?: string;
  totalDesignsAnalyzed?: number;
  learningProgress?: number; // 0-100
  className?: string;
}

const riskConfig = {
  low: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: 'Low Risk',
    icon: CheckCircle,
  },
  medium: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Medium Risk',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    label: 'High Risk',
    icon: AlertTriangle,
  },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: 'text-success',
  down: 'text-destructive',
  stable: 'text-muted-foreground',
};

export function BrandInsightPanels({
  consistencyScore,
  riskLevel,
  confidenceScore,
  performanceDirection,
  performanceExplanation,
  totalDesignsAnalyzed = 0,
  learningProgress = 0,
  className,
}: BrandInsightPanelsProps) {
  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;
  const TrendIcon = trendIcons[performanceDirection];

  return (
    <TooltipProvider>
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {/* Brand Consistency Score */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Brand Consistency
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-end justify-between mb-1.5">
              <span className={cn(
                'text-2xl font-semibold tabular-nums',
                consistencyScore >= 70 ? 'text-success' :
                consistencyScore >= 40 ? 'text-warning' :
                'text-destructive'
              )}>
                {consistencyScore}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[10px] cursor-help',
                      risk.color,
                      risk.border
                    )}
                  >
                    <RiskIcon className="h-3 w-3 mr-1" />
                    {risk.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Risk level based on current design choices</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Progress 
              value={consistencyScore} 
              className={cn(
                'h-1.5',
                consistencyScore >= 70 ? '[&>div]:bg-success' :
                consistencyScore >= 40 ? '[&>div]:bg-warning' :
                '[&>div]:bg-destructive'
              )}
            />
          </CardContent>
        </Card>

        {/* Creative Confidence Score */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              AI Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-end justify-between mb-1.5">
              <span className={cn(
                'text-2xl font-semibold tabular-nums',
                confidenceScore >= 70 ? 'text-primary' :
                confidenceScore >= 40 ? 'text-muted-foreground' :
                'text-muted-foreground/60'
              )}>
                {confidenceScore}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground cursor-help">
                    {totalDesignsAnalyzed} designs learned
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">More designs = better suggestions</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Progress 
              value={confidenceScore} 
              className="h-1.5 [&>div]:bg-primary"
            />
          </CardContent>
        </Card>

        {/* Performance Prediction */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Performance Direction
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-1.5 rounded-md',
                performanceDirection === 'up' && 'bg-success/10',
                performanceDirection === 'down' && 'bg-destructive/10',
                performanceDirection === 'stable' && 'bg-muted'
              )}>
                <TrendIcon className={cn('h-5 w-5', trendColors[performanceDirection])} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-sm font-medium capitalize',
                  trendColors[performanceDirection]
                )}>
                  {performanceDirection === 'up' ? 'Trending Up' :
                   performanceDirection === 'down' ? 'Trending Down' :
                   'Stable'}
                </span>
                {performanceExplanation && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {performanceExplanation}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Progress */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-2xl font-semibold tabular-nums text-primary">
                {learningProgress}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground cursor-help">
                    {learningProgress >= 80 ? 'Highly trained' :
                     learningProgress >= 50 ? 'Actively learning' :
                     'Gathering data'}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Continue using RUMI to improve accuracy</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Progress 
              value={learningProgress} 
              className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/60"
            />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
