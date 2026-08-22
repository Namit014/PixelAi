import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminTabShellProps {
  title: string;
  description?: string;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** Optional inline stats / chips below header */
  stats?: ReactNode;
  children: ReactNode;
  /** Remove default outer card padding (for full-bleed grids) */
  bare?: boolean;
  className?: string;
}

/**
 * Standard wrapper for every admin tab. Gives every screen a consistent
 * header, action slot, and content card. Eliminates the "every tab styled
 * differently" gimmicky feel.
 */
export const AdminTabShell = ({
  title,
  description,
  actions,
  stats,
  children,
  bare = false,
  className,
}: AdminTabShellProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {stats && <div>{stats}</div>}

      {bare ? (
        children
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">{children}</div>
      )}
    </div>
  );
};

export const AdminEmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16">
    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
      <div className="w-6 h-6 rounded-full bg-zinc-700" />
    </div>
    <h3 className="text-base font-semibold text-zinc-100 mb-1">{title}</h3>
    {description && <p className="text-sm text-zinc-500 max-w-sm mb-4">{description}</p>}
    {action}
  </div>
);
