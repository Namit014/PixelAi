import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface EarlyAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EarlyAccessModal({ open, onOpenChange }: EarlyAccessModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    
    setIsSubmitting(true);
    
    // Simulate submission - can be connected to database later
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('Early access signup:', email);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    // Reset state when closing
    if (!newOpen) {
      setTimeout(() => {
        setEmail('');
        setIsSubmitted(false);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-zinc-900">Get Early Access</DialogTitle>
              <DialogDescription className="text-zinc-600">
                Be the first to experience Cosmo. Enter your email to join the waitlist.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-zinc-200 focus:ring-zinc-900"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <Button 
                onClick={handleSubmit} 
                disabled={!email || !email.includes('@') || isSubmitting}
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-full"
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">You're on the list!</h3>
            <p className="text-zinc-600">We'll notify you when Cosmo is ready.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
