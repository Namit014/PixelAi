import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'moderator' | 'user';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { shouldShowAdminUI, session, isLoading } = useAuth();
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (requiredRole !== 'admin') {
        setAdminCheckComplete(true);
        return;
      }

      // Use the token already available in context — no getSession() call
      const token = session?.access_token;
      if (!token) {
        setAdminCheckComplete(true);
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-authorization', {
          body: { requiredRole: 'admin' },
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAdmin(!error && data?.authorized === true);
      } catch {
        setIsAdmin(false);
      }
      setAdminCheckComplete(true);
    };

    if (!isLoading) {
      checkAdmin();
    }
  }, [requiredRole, session, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BrandLoader size="lg" text="Loading..." />
      </div>
    );
  }

  if (requiredRole === 'admin' && !adminCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BrandLoader size="lg" text="Verifying access..." />
      </div>
    );
  }

  // Note: This is UI-level protection only - all admin operations are verified server-side
  if (requiredRole === 'admin' && !isAdmin && !shouldShowAdminUI) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
