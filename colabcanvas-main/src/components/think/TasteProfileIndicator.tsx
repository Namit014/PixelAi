import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TasteProfile } from '@/hooks/useCreativeIntelligence';

interface TasteProfileIndicatorProps {
  profile: TasteProfile | null;
  className?: string;
}

export function TasteProfileIndicator({ profile, className }: TasteProfileIndicatorProps) {
  if (!profile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50",
              className
            )}>
              <Brain className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Building taste profile...</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">RUMI is learning your preferences. Complete more sessions to improve personalization.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const sessionsCount = profile.total_sessions || 0;
  const acceptanceRate = profile.acceptance_rate || 0;
  
  // Calculate profile strength (0-100)
  const profileStrength = Math.min(100, sessionsCount * 10 + acceptanceRate * 0.5);
  
  const strengthLabel = profileStrength < 30 
    ? 'Learning' 
    : profileStrength < 60 
      ? 'Developing' 
      : profileStrength < 80 
        ? 'Strong' 
        : 'Expert';

  const strengthColor = profileStrength < 30 
    ? 'text-amber-500' 
    : profileStrength < 60 
      ? 'text-blue-500' 
      : 'text-green-500';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20",
              className
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className={cn("text-xs font-medium", strengthColor)}>{strengthLabel}</span>
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${profileStrength}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Taste Profile</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Sessions completed:</span>
                <span className="font-medium text-foreground">{sessionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Decision acceptance:</span>
                <span className="font-medium text-foreground">{acceptanceRate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Profile strength:</span>
                <span className={cn("font-medium", strengthColor)}>{profileStrength.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border">
              The more you use Creative Intelligence, the better RUMI understands your preferences.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
