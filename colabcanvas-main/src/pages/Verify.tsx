import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      // Set up timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setStatus('error');
        setMessage('Verification timed out. Please try again or request a new verification email.');
        toast.error('Verification timed out');
      }, 10000); // 10 second timeout

      try {
        console.log('Starting email verification...');
        const { data, error } = await supabase.functions.invoke('verify-email-token', {
          body: { token }
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('Verification error:', error);
          throw error;
        }

        if (data?.success) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to your dashboard...');
          toast.success('Email verified successfully!');

          // Redirect to onboarding after 2 seconds
          setTimeout(() => {
            navigate('/onboarding', { replace: true });
          }, 2000);
        } else {
          throw new Error(data?.error || 'Verification failed');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Verification failed. The link may be invalid or expired.');
        toast.error('Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);
  const handleResend = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to resend verification email');
        navigate('/auth');
        return;
      }
      await supabase.functions.invoke('send-verification-email', {
        body: {
          email: user.email,
          userId: user.id
        }
      });
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error('Failed to resend verification email');
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && <BrandLoader size="lg" />}
            {status === 'success' && (
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <div className="space-y-4">
              <Button onClick={handleResend} className="w-full">
                Resend Verification Email
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Back to Login
              </Button>
            </div>
          )}
          {status === 'success' && (
            <Button onClick={() => navigate('/onboarding')} className="w-full">
              Continue to Onboarding
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}