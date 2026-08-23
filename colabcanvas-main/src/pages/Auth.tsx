import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import colabLogo from '@/assets/colab-logo.svg';
import headerGlow from '@/assets/header-glow.svg';
import { AuthSkeleton } from '@/components/auth/AuthSkeleton';
import { Eye, EyeOff } from 'lucide-react';
import checkEmailIllustration from '@/assets/check_your_email_for_verification.webp';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name too long');

const SB_STORAGE_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;


function getStoredSession() {
  try {
    const raw = localStorage.getItem(SB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    if (parsed.expires_at && parsed.expires_at * 1000 <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Multi-step flow states
  const [step, setStep] = useState<'email' | 'signup' | 'login' | 'verify' | 'reset' | 'choose'>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('colab_referral_code', refCode);
    }
  }, [searchParams]);

  // Check session on mount
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      navigate('/dashboard', { replace: true });
    } else {
      setCheckingAuth(false);
    }
  }, [navigate]);

  // Handle email submission — try quick lookup, fallback to manual choice
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      // Race the lookup against a 3-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const lookupPromise = fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-lookup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
          signal: controller.signal,
        }
      );

      const res = await lookupPromise;
      clearTimeout(timeout);
      const data = await res.json();

      if (data?.exists === true) {
        setStep('login');
      } else if (data?.exists === false) {
        setStep('signup');
      } else {
        setStep('choose');
      }
    } catch (err: any) {
      console.warn('Email lookup unavailable, showing manual choice:', err.name);
      setStep('choose');
    } finally {
      setLoading(false);
    }
  };

  // Handle new user signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidation = nameSchema.safeParse(fullName);
    if (!nameValidation.success) {
      toast.error(nameValidation.error.errors[0].message);
      return;
    }
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/onboarding`
        }
      });
      if (error) throw error;

      if (data.user) {
        const refCode = localStorage.getItem('colab_referral_code');
        if (refCode) {
          try {
            await supabase.functions.invoke('process-referral', {
              body: { action: 'signup', referral_code: refCode }
            });
            localStorage.removeItem('colab_referral_code');
          } catch (refError) {
            console.error('Referral processing failed:', refError);
          }
        }
      }
      setStep('verify');
      toast.success('Check your email to verify your account!');
    } catch (error: any) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle existing user login — direct client-side auth (no edge function proxy)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message || 'Sign in failed.';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (msg.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in.');
        } else {
          toast.error(msg);
        }
        return;
      }

      if (data.session) {
        toast.success('Welcome back!');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Login succeeded but no session was returned. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Connection issue. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setStep('verify');
      toast.success('Check your email for the reset link!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  if (checkingAuth) {
    return <AuthSkeleton />;
  }

  return <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[2000px] pointer-events-none opacity-40">
        <img src={headerGlow} alt="" className="w-full h-auto" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center bg-transparent animate-bounce-subtle">
            <img src={colabLogo} alt="Colab AI" className="w-35 max-h-52" />
          </div>
          <h1 className="mb-2 text-zinc-900 animate-in fade-in-0 duration-300 delay-100 text-3xl" style={{ fontWeight: 400 }}>
            {step === 'verify' ? 'Check your email' : step === 'signup' ? 'Create your account' : step === 'login' ? 'Welcome back' : step === 'reset' ? 'Reset your password' : step === 'choose' ? 'How would you like to continue?' : <>
                Ready to{' '}
                <span className="inline-block" style={{
              background: 'linear-gradient(90deg, #7D22FF 0%, #FF8870 33%, #FFDEDE 66%, #C196FF 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 3s linear infinite'
            }}>
                  colab
                </span>
                -orate?
              </>}
          </h1>
          <p className="text-zinc-600 animate-in fade-in-0 duration-300 delay-200">
            {step === 'verify' ? 'We sent you a verification link' : step === 'signup' ? 'Sign up to start designing with AI' : step === 'login' ? 'Sign in to continue' : step === 'reset' ? 'Enter your email to reset password' : step === 'choose' ? 'We couldn\'t reach our servers. Choose an option below.' : 'AI-powered design platform'}
          </p>
        </div>

        <Card className="border-0 shadow-none bg-card/95 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-400">
          <CardContent className="space-y-4 pt-6">
            {step === 'verify' ? <div className="space-y-4">
                <div className="text-center py-8">
                  <img src={checkEmailIllustration} alt="Check your email" className="h-48 w-auto mx-auto mb-4" />
                  <p className="text-sm text-zinc-600 mb-4">
                    Click the verification link in your email to complete signup.
                  </p>
                  <Button onClick={handleBackToEmail} variant="outline" className="w-full border-zinc-300 text-zinc-900 hover:bg-zinc-50">
                    Back to email
                  </Button>
                </div>
              </div> : step === 'signup' ? <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-700">Email</Label>
                  <Input id="email" type="email" value={email} disabled className="h-12 px-4 bg-zinc-50 border-zinc-300" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-zinc-700">Full Name</Label>
                  <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading} className="h-12 px-4 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01]" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-700">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="h-12 px-4 pr-12 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01]" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-700">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading} className="h-12 px-4 pr-12 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01]" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={handleBackToEmail} variant="outline" disabled={loading} className="flex-1 h-12 border-zinc-300 text-zinc-900 hover:bg-zinc-50">
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 text-white">
                    {loading ? <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </div> : 'Create Account'}
                  </Button>
                </div>
              </form> : step === 'login' ? <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-700">Email</Label>
                  <Input id="email" type="email" value={email} disabled className="h-12 px-4 bg-zinc-50 border-zinc-300" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="text-zinc-700">Password</Label>
                  <div className="relative">
                    <Input id="loginPassword" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="h-12 px-4 pr-12 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01]" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={handleBackToEmail} variant="outline" disabled={loading} className="flex-1 h-12 border-zinc-300 text-zinc-900 hover:bg-zinc-50">
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 text-white">
                    {loading ? <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </div> : 'Sign In'}
                  </Button>
                </div>

                <div className="text-center">
                  <button type="button" onClick={() => setStep('reset')} className="text-sm text-zinc-600 hover:text-zinc-900 underline">
                    Forgot your password?
                  </button>
                </div>

                <div className="text-center">
                  <button type="button" onClick={() => setStep('signup')} className="text-sm text-zinc-600 hover:text-zinc-900 underline">
                    Need an account? Create one
                  </button>
                </div>
              </form> : step === 'reset' ? <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-zinc-700">Email</Label>
                  <Input id="resetEmail" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-12 px-4 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01]" />
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={handleBackToEmail} variant="outline" disabled={loading} className="flex-1 h-12 border-zinc-300 text-zinc-900 hover:bg-zinc-50">
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 bg-zinc-900 hover:bg-zinc-800 text-white">
                    {loading ? <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </div> : 'Send Reset Link'}
                  </Button>
                </div>
              </form> : step === 'choose' ? <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-700">Email</Label>
                  <Input type="email" value={email} disabled className="h-12 px-4 bg-zinc-50 border-zinc-300" />
                </div>
                <Button onClick={() => setStep('login')} className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white">
                  I have an account — Sign In
                </Button>
                <Button onClick={() => setStep('signup')} variant="outline" className="w-full h-12 border-zinc-300 text-zinc-900 hover:bg-zinc-50">
                  I'm new — Create Account
                </Button>
                <div className="text-center">
                  <button type="button" onClick={handleBackToEmail} className="text-sm text-zinc-600 hover:text-zinc-900 underline">
                    Back
                  </button>
                </div>
              </div> : <>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="h-14 px-4 border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 bg-zinc-100 transition-all duration-200 focus:scale-[1.01]" />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-14 text-base bg-zinc-900 hover:bg-zinc-800 text-white">
                    {loading ? <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Continuing...
                      </div> : 'Continue with Email'}
                  </Button>
                </form>
              </>}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-zinc-500 mt-8">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-zinc-900">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-zinc-900">Privacy Policy</a>
        </p>
      </div>
    </div>;
};
export default Auth;
