import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingRouteProps {
  children: React.ReactNode;
}

export const OnboardingRoute = ({ children }: OnboardingRouteProps) => {
  const { user, onboardingCompleted, isLoading } = useAuth();

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Not authenticated - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated but onboarding not completed - redirect to onboarding
  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
};
