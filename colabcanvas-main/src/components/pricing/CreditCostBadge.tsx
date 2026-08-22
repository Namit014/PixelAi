import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap } from "lucide-react";
import { ACTION_COSTS, type ActionId } from "@/lib/creditCosts";
import { cn } from "@/lib/utils";

interface CreditCostBadgeProps {
  action: ActionId;
  className?: string;
  /** Show a "+ 1 Cogent run" suffix when applicable */
  showCogentRun?: boolean;
}

/**
 * Compact badge that previews how many credits an action will cost
 * before the user runs it. Use next to expensive CTAs.
 */
export function CreditCostBadge({ action, className, showCogentRun = true }: CreditCostBadgeProps) {
  const cost = ACTION_COSTS[action];
  if (!cost) return null;

  const isCogent = cost.category === 'cogent';
  const Icon = isCogent ? Sparkles : Zap;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal text-xs border-zinc-200 bg-white text-zinc-700",
        isCogent && "border-violet-200 bg-violet-50 text-violet-700",
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      Uses {cost.credits} credits
      {showCogentRun && cost.consumesCogentRun && (
        <span className="text-zinc-500"> · 1 Cogent run</span>
      )}
    </Badge>
  );
}
