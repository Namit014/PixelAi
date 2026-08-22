import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  chart?: ReactNode;
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  icon: Icon,
  trend = 'neutral',
  loading = false,
  chart,
  className,
}: MetricCardProps) => {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 ${className || ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        {Icon && (
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
      </div>
      
      <p className="text-4xl font-bold text-zinc-50 tracking-tight mb-2">
        {value}
      </p>

      {change !== undefined && (
        <div className="flex items-center gap-2">
          {trend === 'up' && (
            <div className="flex items-center gap-1 text-green-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+{change}%</span>
            </div>
          )}
          {trend === 'down' && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">{change}%</span>
            </div>
          )}
          {trend === 'neutral' && (
            <span className="text-sm font-medium text-zinc-400">
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
          <span className="text-xs text-zinc-500">{changeLabel}</span>
        </div>
      )}

      {chart && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          {chart}
        </div>
      )}
    </div>
  );
};
