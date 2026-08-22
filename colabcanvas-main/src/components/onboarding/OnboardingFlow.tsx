import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import confetti from 'canvas-confetti';
import colabLogo from '@/assets/colab-logo.svg';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Validation schemas
const fullNameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name too long').regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes');
const companySizeSchema = z.enum(['solo', '2-10', '11-50', '51-200', '201-500', '500+'], {
  errorMap: () => ({
    message: 'Please select a valid company size'
  })
});
const industrySchema = z.enum(['technology', 'marketing', 'ecommerce', 'education', 'healthcare', 'finance', 'media', 'other'], {
  errorMap: () => ({
    message: 'Please select a valid industry'
  })
});
const useCaseSchema = z.enum(['social-media', 'marketing', 'presentations', 'web-graphics', 'product-design', 'personal', 'other'], {
  errorMap: () => ({
    message: 'Please select a valid use case'
  })
});
const designExperienceSchema = z.enum(['beginner', 'intermediate', 'advanced', 'professional'], {
  errorMap: () => ({
    message: 'Please select your experience level'
  })
});
const referralSourceSchema = z.enum(['search', 'social-media', 'friend', 'blog', 'advertisement', 'other'], {
  errorMap: () => ({
    message: 'Please select how you heard about us'
  })
});
interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
  initialFullName?: string;
}
const OnboardingFlow = ({
  userId,
  onComplete,
  initialFullName = ''
}: OnboardingFlowProps) => {
  const {
    toast
  } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Form data
  const [fullName, setFullName] = useState(initialFullName);
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [useCase, setUseCase] = useState('');
  const [designExperience, setDesignExperience] = useState('');
  const [currentChallenges, setCurrentChallenges] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [teamCollaboration, setTeamCollaboration] = useState('no');
  useEffect(() => {
    // Minimal confetti on mount
    confetti({
      particleCount: 50,
      spread: 60,
      origin: {
        y: 0.6
      },
      colors: ['#3f3f46', '#71717a', '#a1a1aa'],
      ticks: 100,
      gravity: 0.8,
      scalar: 0.8
    });
  }, []);
  const handleNext = () => {
    if (step === 1) {
      const validation = fullNameSchema.safeParse(fullName);
      if (!validation.success) {
        toast({
          title: 'Invalid name',
          description: validation.error.errors[0].message,
          variant: 'destructive'
        });
        return;
      }
    }
    setStep(step + 1);
  };
  const verifyOnboardingCompleted = async (retryCount = 0): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      console.log(`Verification attempt ${retryCount + 1}: onboarding_completed =`, data?.onboarding_completed);
      return data?.onboarding_completed === true;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setVerificationError(null);
    
    try {
      // Validate all inputs
      const nameValidation = fullNameSchema.safeParse(fullName);
      if (!nameValidation.success) {
        throw new Error(nameValidation.error.errors[0].message);
      }
      const companySizeValidation = companySizeSchema.safeParse(companySize);
      if (!companySizeValidation.success) {
        throw new Error(companySizeValidation.error.errors[0].message);
      }
      const industryValidation = industrySchema.safeParse(industry);
      if (!industryValidation.success) {
        throw new Error(industryValidation.error.errors[0].message);
      }
      const useCaseValidation = useCaseSchema.safeParse(useCase);
      if (!useCaseValidation.success) {
        throw new Error(useCaseValidation.error.errors[0].message);
      }
      const experienceValidation = designExperienceSchema.safeParse(designExperience);
      if (!experienceValidation.success) {
        throw new Error(experienceValidation.error.errors[0].message);
      }
      const referralValidation = referralSourceSchema.safeParse(referralSource);
      if (!referralValidation.success) {
        throw new Error(referralValidation.error.errors[0].message);
      }

      console.log('Starting onboarding update...');
      
      // Update profile with onboarding data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company_size: companySize,
          industry: industry,
          use_case: useCase,
          design_experience: designExperience,
          current_challenges: currentChallenges,
          referral_source: referralSource,
          team_collaboration: teamCollaboration === 'yes',
          onboarding_completed: true
        })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      console.log('✓ Database updated successfully');

      // Verify the update with retry logic (up to 3 attempts)
      let verified = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          console.log(`Retrying verification (attempt ${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
        }
        
        verified = await verifyOnboardingCompleted(attempt);
        if (verified) {
          console.log('✓ Onboarding completion verified');
          break;
        }
      }

      if (!verified) {
        console.error('✗ Failed to verify onboarding completion after 3 attempts');
        setVerificationError('Unable to verify onboarding completion. Please try again or skip to continue.');
        return;
      }

      // CRITICAL: Clear the onboarding cache BEFORE refreshing session
      // so AuthContext's onAuthStateChange handler re-queries the DB
      // instead of reading the stale cached 'false' value
      try {
        sessionStorage.removeItem('onboarding_status');
        sessionStorage.removeItem('onboarding_status_timestamp');
      } catch {}

      // Force session refresh to trigger auth state change
      console.log('Refreshing session to update auth context...');
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session) {
        throw new Error('Session refresh failed');
      }
      console.log('✓ Session refreshed successfully');

      // Wait for AuthContext to fully process the profile update
      console.log('Waiting for auth context to update...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✓ Auth context should be updated');

      // Send welcome email (fire-and-forget)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          supabase.functions.invoke('send-welcome-email', {
            body: { email: user.email, full_name: fullName, user_id: userId }
          }).catch(err => console.error('Welcome email failed:', err));
        }
      } catch (e) {
        console.error('Welcome email error:', e);
      }

      toast({
        title: 'Welcome to Colab! 🎉',
        description: 'Your account is all set up'
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive'
      });
      setVerificationError(error.message || 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      console.log('Skipping onboarding...');
      
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Verify skip worked
      const verified = await verifyOnboardingCompleted(0);
      if (!verified) {
        throw new Error('Failed to skip onboarding. Please refresh and try again.');
      }
      
      // CRITICAL: Clear the onboarding cache BEFORE refreshing session
      try {
        sessionStorage.removeItem('onboarding_status');
        sessionStorage.removeItem('onboarding_status_timestamp');
      } catch {}

      // Force session refresh to trigger auth state change
      console.log('Refreshing session to update auth context...');
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session) {
        throw new Error('Session refresh failed');
      }
      console.log('✓ Session refreshed successfully');

      // Wait for AuthContext to fully process the profile update
      console.log('Waiting for auth context to update...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✓ Auth context should be updated');
      
      console.log('✓ Successfully skipped onboarding');
      toast({
        title: 'Onboarding skipped',
        description: 'You can complete your profile later in settings'
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Skip error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to skip onboarding',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setShowSkipDialog(false);
    }
  };
  const renderStep = () => {
    switch (step) {
      case 1:
        return <div className="space-y-6">
            <div className="text-center">
              <img src={colabLogo} alt="Colab" className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-zinc-900">Welcome to Colab!</h2>
              <p className="text-sm text-zinc-600">Let's get to know you better</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-zinc-700">What's your name?</Label>
              <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus className="h-10 border-zinc-300 focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 focus-visible:ring-zinc-400 bg-zinc-100" />
            </div>

            <Button onClick={handleNext} disabled={!fullName.trim()} className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white">
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>;
      case 2:
        return <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-zinc-900">Tell us about your work</h2>
              <p className="text-sm text-zinc-600">This helps us personalize your experience</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companySize" className="text-zinc-700">Company size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger id="companySize" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Just me</SelectItem>
                    <SelectItem value="2-10">2-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-zinc-700">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="media">Media & Entertainment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamCollaboration" className="text-zinc-700">Do you work in a team?</Label>
                <Select value={teamCollaboration} onValueChange={setTeamCollaboration}>
                  <SelectTrigger id="teamCollaboration" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, I collaborate with a team</SelectItem>
                    <SelectItem value="no">No, I work solo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 h-10 border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!companySize || !industry || !teamCollaboration} className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>;
      case 3:
        return <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-zinc-900">Your design journey</h2>
              <p className="text-sm text-zinc-600">Help us understand your needs</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="useCase" className="text-zinc-700">Primary use case</Label>
                <Select value={useCase} onValueChange={setUseCase}>
                  <SelectTrigger id="useCase" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                    <SelectValue placeholder="Select use case" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social-media">Social Media Content</SelectItem>
                    <SelectItem value="marketing">Marketing Materials</SelectItem>
                    <SelectItem value="presentations">Presentations</SelectItem>
                    <SelectItem value="web-graphics">Web Graphics</SelectItem>
                    <SelectItem value="product-design">Product Design</SelectItem>
                    <SelectItem value="personal">Personal Projects</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="designExperience" className="text-zinc-700">Design experience level</Label>
                <Select value={designExperience} onValueChange={setDesignExperience}>
                  <SelectTrigger id="designExperience" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                    <SelectValue placeholder="Select your experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner - Just getting started</SelectItem>
                    <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                    <SelectItem value="advanced">Advanced - Regular designer</SelectItem>
                    <SelectItem value="professional">Professional - Design is my job</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentChallenges" className="text-zinc-700">
                  What's your biggest design challenge? (Optional)
                </Label>
                <Textarea id="currentChallenges" placeholder="E.g., Creating consistent brand visuals, designing quickly, etc." value={currentChallenges} onChange={e => setCurrentChallenges(e.target.value)} className="min-h-[80px] border-zinc-300 bg-white resize-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 focus-visible:ring-zinc-400" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1 h-10 border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!useCase || !designExperience} className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>;
      case 4:
        return <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-zinc-900">Almost done!</h2>
              <p className="text-sm text-zinc-600">One last question</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralSource" className="text-zinc-700">How did you hear about Colab?</Label>
              <Select value={referralSource} onValueChange={setReferralSource}>
                <SelectTrigger id="referralSource" className="h-10 border-zinc-300 bg-white focus:ring-zinc-400 focus:border-zinc-400">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="search">Search Engine (Google, Bing, etc.)</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="friend">Friend or Colleague</SelectItem>
                  <SelectItem value="blog">Blog or Article</SelectItem>
                  <SelectItem value="advertisement">Advertisement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
              <p className="text-sm text-zinc-700">
                ✨ You're all set! Click finish to start creating amazing designs with AI.
              </p>
            </div>

            {verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{verificationError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1 h-10 border-zinc-300 text-zinc-700 hover:bg-zinc-50" disabled={isLoading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleComplete} disabled={isLoading || !referralSource} className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Finish'
                )}
              </Button>
            </div>

            <Button 
              onClick={() => setShowSkipDialog(true)} 
              variant="ghost" 
              className="w-full h-8 text-xs text-zinc-500 hover:text-zinc-700"
              disabled={isLoading}
            >
              Skip for now
            </Button>
          </div>;
      default:
        return null;
    }
  };
  return (
    <>
      <Card className="w-full max-w-sm border border-zinc-200/50 bg-zinc-50 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />)}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">{renderStep()}</CardContent>
      </Card>

      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              You can complete your profile later in settings. This will help us personalize your experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkip} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Skipping...
                </>
              ) : (
                'Skip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default OnboardingFlow;
export { OnboardingFlow };