import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  ArrowRight, 
  AlertTriangle, 
  Zap, 
  Shield,
  Target,
  Palette,
  Heart,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DecisionCard as DecisionCardType } from '@/hooks/useCreativeIntelligence';

interface DecisionCardProps {
  card: DecisionCardType;
  onAccept: (cardId: string) => void;
  onReject: (cardId: string, feedback?: string) => void;
  onExport: (cardId: string) => void;
  isUpdating?: boolean;
  compact?: boolean;
}

const riskConfig = {
  low: { icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Low Risk' },
  medium: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Medium Risk' },
  high: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', label: 'High Risk' },
};

export function DecisionCard({ card, onAccept, onReject, onExport, isUpdating, compact }: DecisionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRejectFeedback, setShowRejectFeedback] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  const risk = riskConfig[card.risk_level];
  const RiskIcon = risk.icon;

  const handleReject = () => {
    if (showRejectFeedback) {
      onReject(card.id, rejectFeedback);
      setShowRejectFeedback(false);
      setRejectFeedback('');
    } else {
      setShowRejectFeedback(true);
    }
  };

  const isActioned = card.status !== 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all",
        compact ? "rounded-xl" : "rounded-2xl",
        isActioned && "opacity-60",
        card.status === 'accepted' && "border-green-500/30 bg-green-500/5",
        card.status === 'rejected' && "border-red-500/30 bg-red-500/5",
        card.status === 'exported' && "border-primary/30 bg-primary/5"
      )}
    >
      {/* Header with risk & probability */}
      <div className={cn(
        "flex items-center justify-between border-b border-border/50",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}>
        <div className={cn(
          "flex items-center gap-1.5 rounded-full",
          compact ? "px-2 py-1" : "px-3 py-1.5",
          risk.bg
        )}>
          <RiskIcon className={cn(compact ? "w-3 h-3" : "w-4 h-4", risk.color)} />
          <span className={cn("font-medium", risk.color, compact ? "text-[10px]" : "text-xs")}>{risk.label}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <TrendingUp className={cn("text-primary", compact ? "w-3 h-3" : "w-4 h-4")} />
          <span className={cn("font-semibold text-primary", compact ? "text-xs" : "text-sm")}>{card.performance_probability}%</span>
        </div>
      </div>

      {/* Title */}
      <div className={cn(compact ? "px-3 py-3" : "px-4 py-4")}>
        <h3 className={cn(
          "font-semibold text-foreground leading-tight",
          compact ? "text-sm line-clamp-2" : "text-lg"
        )}>{card.title}</h3>
        
        {/* Business Reasoning Preview */}
        {card.business_reasoning && (
          <p className={cn(
            "mt-2 text-muted-foreground italic",
            compact ? "text-xs line-clamp-2" : "text-sm line-clamp-2"
          )}>
            "{card.business_reasoning}"
          </p>
        )}
      </div>

      {/* Key Metrics - Hide some in compact mode */}
      <div className={cn(compact ? "px-3 pb-3 space-y-2" : "px-4 pb-4 space-y-3")}>
        {/* Emotional Positioning - hide in compact */}
        {card.emotional_positioning && !compact && (
          <div className="flex items-start gap-3">
            <Heart className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-medium text-muted-foreground">Emotional Target</span>
              <p className="text-sm text-foreground">{card.emotional_positioning}</p>
            </div>
          </div>
        )}

        {/* Visual Philosophy - hide in compact */}
        {card.visual_philosophy && !compact && (
          <div className="flex items-start gap-3">
            <Palette className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-medium text-muted-foreground">Visual Philosophy</span>
              <p className="text-sm text-foreground">{card.visual_philosophy}</p>
            </div>
          </div>
        )}

        {/* Brand Alignment */}
        <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
          <Target className={cn("text-blue-500 shrink-0", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("font-medium text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>Brand Alignment</span>
              <span className={cn("font-semibold text-foreground", compact ? "text-[10px]" : "text-xs")}>{card.brand_alignment_score}%</span>
            </div>
            <div className={cn("bg-muted rounded-full overflow-hidden", compact ? "h-1.5" : "h-2")}>
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${card.brand_alignment_score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details - Only show if not compact */}
      {!compact && (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-4">
                {/* Full Business Reasoning */}
                {card.business_reasoning && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Business Reasoning</h4>
                    <p className="text-sm text-muted-foreground">{card.business_reasoning}</p>
                  </div>
                )}

                {/* Metadata / Market Signals */}
                {card.metadata && Object.keys(card.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Market Context</h4>
                    <div className="flex flex-wrap gap-2">
                      {(card.metadata.signals as string[] || []).map((signal, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-muted rounded-lg text-muted-foreground">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Reject Feedback Input - Hide in compact mode */}
      {!compact && (
        <AnimatePresence>
          {showRejectFeedback && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 overflow-hidden"
            >
              <Textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Why doesn't this direction work for you? (optional)"
                className="min-h-[80px] text-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Actions */}
      <div className={cn(
        "flex items-center justify-between border-t border-border/50 bg-muted/30",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}>
        {!compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {isExpanded ? 'Less' : 'Details'}
          </Button>
        )}

        <div className={cn("flex items-center", compact ? "gap-1 w-full justify-between" : "gap-2")}>
          {!isActioned && (
            <>
              <Button
                variant="ghost"
                size={compact ? "icon" : "sm"}
                onClick={handleReject}
                disabled={isUpdating}
                className={cn(
                  "text-red-500 hover:text-red-600 hover:bg-red-500/10",
                  compact && "h-7 w-7"
                )}
              >
                <X className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4 mr-1")} />
                {!compact && (showRejectFeedback ? 'Confirm' : 'Reject')}
              </Button>
              
              <Button
                variant="ghost"
                size={compact ? "icon" : "sm"}
                onClick={() => onAccept(card.id)}
                disabled={isUpdating}
                className={cn(
                  "text-green-500 hover:text-green-600 hover:bg-green-500/10",
                  compact && "h-7 w-7"
                )}
              >
                <Check className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4 mr-1")} />
                {!compact && 'Accept'}
              </Button>
            </>
          )}
          
          <Button
            size={compact ? "sm" : "sm"}
            onClick={() => onExport(card.id)}
            disabled={isUpdating || card.status === 'exported'}
            className={cn(
              "bg-primary hover:bg-primary/90",
              compact && "h-7 text-xs px-2"
            )}
          >
            <ArrowRight className={cn(compact ? "w-3 h-3 mr-1" : "w-4 h-4 mr-1")} />
            {compact ? 'Export' : 'Export to Canvas'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
