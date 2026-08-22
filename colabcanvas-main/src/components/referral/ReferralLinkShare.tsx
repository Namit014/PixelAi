import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReferralCode } from '@/hooks/useReferralData';

interface ReferralLinkShareProps {
  referralCode: ReferralCode | null;
}

export const ReferralLinkShare = ({ referralCode }: ReferralLinkShareProps) => {
  const [copied, setCopied] = useState(false);
  const code = referralCode?.code || '';
  const referralLink = `${window.location.origin}/auth?ref=${code}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success('Referral code copied!');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Join me on Colab!");
    const body = encodeURIComponent(`Hey! I've been using Colab and thought you'd love it. Sign up with my referral link and we both get free credits:\n\n${referralLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Join Colab', text: 'Sign up with my referral link!', url: referralLink });
    } else {
      copyLink();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 className="text-lg font-semibold text-zinc-900 mb-1">Your Referral Link</h3>
      <p className="text-sm text-zinc-500 mb-5">Share this link and earn credits + revenue for every signup and conversion.</p>

      {/* Link display */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-700 truncate font-sans">
          {referralLink}
        </div>
        <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0 rounded-xl h-11 w-11">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* Code display */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-zinc-500">Your code:</span>
        <button onClick={copyCode} className="px-3 py-1 rounded-lg text-sm transition-colors font-sans font-medium border-muted-foreground bg-blue-700 hover:bg-blue-600 text-primary-foreground">
          {code}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={shareEmail} className="gap-2 rounded-xl">
          <Mail className="w-4 h-4" /> Email
        </Button>
        <Button variant="outline" onClick={shareNative} className="gap-2 rounded-xl">
          <Share2 className="w-4 h-4" /> Share
        </Button>
      </div>
    </div>);

};