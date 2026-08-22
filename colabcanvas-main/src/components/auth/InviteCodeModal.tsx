import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { toast } from 'sonner';
import colabLogo from '@/assets/colab-logo.svg';
import headerGlow from '@/assets/header-glow.svg';

interface InviteCodeModalProps {
  open: boolean;
  onSuccess: () => void;
}

export const InviteCodeModal = ({
  open,
  onSuccess
}: InviteCodeModalProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeCode = (raw: string) =>
    raw
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[\u2013\u2014]/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeCode(code);
    if (!cleaned) {
      toast.error('Please enter an invite code');
      return;
    }
    setLoading(true);
    try {
      console.log('🔐 Verifying invite code...');

      // Use raw fetch with 10s timeout to avoid SDK stalls
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let data: any = null;
      let httpStatus = 0;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-invite-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ code: cleaned, email: '' }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);
        httpStatus = res.status;
        try { data = await res.json(); } catch { data = null; }
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        const isTimeout = fetchErr.name === 'AbortError';
        console.error('❌ Invite verification fetch failed:', isTimeout ? 'TIMEOUT' : fetchErr.message);
        toast.error(isTimeout
          ? 'Verification is taking too long. Please try again.'
          : 'Connection issue. Please check your internet and try again.');
        return;
      }

      if (data?.valid) {
        console.log('✅ Code valid');
        // Store the cleaned code so we can redeem it AFTER the user signs up / signs in.
        // Actual single-use redemption now happens in Auth.tsx via redeem_invite_code RPC.
        localStorage.setItem('colab_invite_verified', JSON.stringify({
          verified: true,
          timestamp: Date.now(),
          codeId: data.codeId,
          code: cleaned,
        }));
        toast.success('Access granted! Welcome to Colab.');
        onSuccess();
        return;
      }

      // Friendlier error mapping
      const serverMsg = data?.error || '';
      if (httpStatus === 429) {
        toast.error('Too many attempts. Please wait a few minutes and try again.');
      } else if (/expired/i.test(serverMsg)) {
        toast.error('This invite code has expired.');
      } else if (/maximum/i.test(serverMsg)) {
        toast.error('This invite code has already been fully used.');
      } else if (serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error('Invalid invite code. Please check it and try again.');
      }
    } catch (error: any) {
      console.error('💥 Unexpected verification error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-white">
          <img 
            src={headerGlow} 
            alt="" 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[2000px] pointer-events-none opacity-70" 
          />
        </DialogPrimitive.Overlay>
        
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 duration-200 sm:rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogHeader className="space-y-6">
            <div className="flex justify-center">
              <img src={colabLogo} alt="Colab" className="h-12 w-auto" />
            </div>
            
            <div className="space-y-3 text-center">
              <DialogTitle className="text-2xl font-medium text-zinc-900">
                Welcome to{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #7D22FF 0%, #FF8870 33%, #FFDEDE 66%, #C196FF 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }} className="inline-block shadow-none">
                  Colab
                </span>
              </DialogTitle>
              <DialogDescription className="text-base text-zinc-600">
                Please enter your invite code to continue
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-zinc-700">
                Invite Code
              </Label>
              <Input 
                id="inviteCode" 
                type="text" 
                placeholder="Enter your code" 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())} 
                className="h-12 px-4 bg-white border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 transition-all duration-200 focus:scale-[1.01] text-center tracking-wide" 
                maxLength={20} 
                autoFocus 
                disabled={loading} 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : 'Continue'}
            </Button>

            <p className="text-xs text-center text-zinc-500 mt-4">
              Don't have a code?{' '}
              <a 
                href="mailto:hello@letscolab.tech?subject=Request for Beta Access" 
                className="text-zinc-900 hover:underline font-medium"
              >
                Request access
              </a>
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
};
