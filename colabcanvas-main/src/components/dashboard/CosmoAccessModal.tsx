import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CosmoNavIcon from '@/assets/icons/cosmo-nav.svg?react';

interface CosmoAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CosmoAccessModal: React.FC<CosmoAccessModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    setIsSubmitting(true);
    try {
      // Save to early access waitlist (reusing existing table)
      const { error } = await supabase
        .from('design_tool_early_access')
        .upsert({
          email: email.trim(),
          full_name: fullName.trim(),
          user_id: user?.id || null,
        }, {
          onConflict: 'email',
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when Cosmos is available for your account.",
      });
    } catch (error) {
      console.error('Error submitting to waitlist:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setEmail('');
      setFullName('');
      setIsSubmitted(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CosmoNavIcon className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Cosmos Access Required</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Exclusive invite-only feature
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">You're on the waitlist!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We'll email you at <span className="font-medium text-foreground">{email}</span> when Cosmos is available for your account.
            </p>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="py-4">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Cosmos is our advanced AI workflow builder that lets you chain multiple AI actions together. 
                It's currently available to select users by invitation.
              </p>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">What you'll get with Cosmos:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Multi-step AI workflow automation</li>
                      <li>• Visual workflow builder</li>
                      <li>• Batch processing capabilities</li>
                      <li>• Advanced output configurations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isSubmitting || !email.trim() || !fullName.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join the Waitlist'
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
