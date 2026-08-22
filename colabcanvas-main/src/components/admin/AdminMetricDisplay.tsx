import { LucideIcon } from 'lucide-react';

interface AdminMetricDisplayProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
}

export const AdminMetricDisplay = ({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
}: AdminMetricDisplayProps) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        {Icon && (
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
      </div>
      
      <p className="text-4xl font-bold text-zinc-50 tracking-tight mb-1">
        {value}
      </p>
      
      {subtitle && (
        <p className="text-sm text-zinc-500">{subtitle}</p>
      )}
      
      {trend && (
        <div className="flex items-center gap-2 mt-3">
          <span 
            className={`text-sm font-medium ${
              trend.positive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-zinc-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
