import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { toast } from 'sonner';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, onboardingCompleted } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted) return <Navigate to="/dashboard" replace />;

  const handleComplete = () => {
    toast.success('Welcome to Colab');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <OnboardingFlow
        userId={user.id}
        onComplete={handleComplete}
        initialFullName={user.user_metadata?.full_name || ''}
      />
    </div>
  );
};

export default Onboarding;
