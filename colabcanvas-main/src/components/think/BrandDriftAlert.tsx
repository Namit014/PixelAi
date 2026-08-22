import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, TrendingDown, Palette, Type, Layout, Heart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DriftDimension {
  score: number;
  deviation: string;
  current: unknown;
  expected: unknown;
  severity: 'info' | 'warning' | 'critical';
}

interface DriftAlert {
  drift_type: string;
  severity: string;
  deviation_score: number;
  correction_suggestion: string;
  current_value: unknown;
  expected_range: unknown;
}

interface DriftAnalysis {
  overall_drift_score: number;
  dimensions: {
    color: DriftDimension;
    typography: DriftDimension;
    layout: DriftDimension;
    tone: DriftDimension;
  };
  alerts: DriftAlert[];
  suggestions: string[];
  requires_attention: boolean;
}

interface BrandDriftAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driftAnalysis: DriftAnalysis | null;
  onCorrect?: () => void;
  onOverride?: () => void;
  onAcknowledge?: () => void;
  isLoading?: boolean;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-muted',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  critical: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
};

const dimensionIcons = {
  color: Palette,
  typography: Type,
  layout: Layout,
  tone: Heart,
};

const dimensionLabels = {
  color: 'Color Palette',
  typography: 'Typography',
  layout: 'Layout Density',
  tone: 'Emotional Tone',
};

export function BrandDriftAlert({
  open,
  onOpenChange,
  driftAnalysis,
  onCorrect,
  onOverride,
  onAcknowledge,
  isLoading = false,
}: BrandDriftAlertProps) {
  if (!driftAnalysis) return null;

  const overallSeverity = driftAnalysis.overall_drift_score >= 70
    ? 'critical'
    : driftAnalysis.overall_drift_score >= 40
      ? 'warning'
      : 'info';

  const SeverityIcon = severityConfig[overallSeverity].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              severityConfig[overallSeverity].bg
            )}>
              <SeverityIcon className={cn(
                'h-5 w-5',
                severityConfig[overallSeverity].color
              )} />
            </div>
            <div>
              <DialogTitle className="text-lg">Brand Drift Detected</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                This design deviates from your established brand patterns
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Overall Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Drift Score</span>
              <span className={cn(
                'font-medium',
                driftAnalysis.overall_drift_score >= 70 ? 'text-destructive' :
                driftAnalysis.overall_drift_score >= 40 ? 'text-warning' :
                'text-success'
              )}>
                {driftAnalysis.overall_drift_score}%
              </span>
            </div>
            <Progress 
              value={driftAnalysis.overall_drift_score} 
              className={cn(
                'h-2',
                driftAnalysis.overall_drift_score >= 70 ? '[&>div]:bg-destructive' :
                driftAnalysis.overall_drift_score >= 40 ? '[&>div]:bg-warning' :
                '[&>div]:bg-success'
              )}
            />
          </div>

          {/* Dimension Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Drift Analysis</h4>
            <div className="grid gap-2">
              {(Object.entries(driftAnalysis.dimensions) as [keyof typeof dimensionIcons, DriftDimension][]).map(
                ([key, dimension]) => {
                  const Icon = dimensionIcons[key];
                  const config = severityConfig[dimension.severity];
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        config.bg,
                        config.border
                      )}
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {dimensionLabels[key]}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              dimension.severity === 'critical' && 'border-destructive/50 text-destructive',
                              dimension.severity === 'warning' && 'border-warning/50 text-warning',
                              dimension.severity === 'info' && 'border-muted text-muted-foreground'
                            )}
                          >
                            {dimension.score}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {dimension.deviation}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Suggestions */}
          {driftAnalysis.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                Suggestions
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {driftAnalysis.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {driftAnalysis.requires_attention ? (
            <>
              <Button
                variant="outline"
                onClick={onOverride}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Intentional Override
              </Button>
              <Button
                onClick={onCorrect}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Apply Corrections
              </Button>
            </>
          ) : (
            <Button
              onClick={onAcknowledge}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
