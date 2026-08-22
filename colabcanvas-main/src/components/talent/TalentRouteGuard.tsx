import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUserIntent } from '@/hooks/useUserIntent';

interface Props {
  children: ReactNode;
  requires?: 'client' | 'freelancer' | 'agency' | 'any';
}

/**
 * Loose guard: Talent is an add-on, not a forced lane.
 * - 'client' / 'any': always allowed (Colab default).
 * - 'freelancer': requires explicit freelancer intent.
 * - 'agency': requires explicit agency intent.
 */
export const TalentRouteGuard = ({ children, requires = 'any' }: Props) => {
  const { intent, loading } = useUserIntent();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (requires === 'freelancer' && intent !== 'freelancer') {
    return <Navigate to="/talent" replace />;
  }
  if (requires === 'agency' && intent !== 'agency') {
    return <Navigate to="/talent" replace />;
  }

  return <>{children}</>;
};
