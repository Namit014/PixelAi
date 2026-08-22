import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import colabLogo from '@/assets/colab-logo.svg';

type Intent = 'client' | 'freelancer' | 'undecided';

interface IntentSplitProps {
  userId: string;
  onPick: (intent: Intent) => void;
  onSkipToApp: () => Promise<void>;
}

export const IntentSplit = ({ userId, onPick, onSkipToApp }: IntentSplitProps) => {
  const [busy, setBusy] = useState<Intent | null>(null);

  const persist = async (intent: Intent) => {
    setBusy(intent);
    try {
      const { error } = await supabase
        .from('user_intent')
        .upsert({ user_id: userId, intent, completed_at: intent === 'undecided' ? null : new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      if (intent === 'undecided') {
        await onSkipToApp();
      } else {
        onPick(intent);
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save your choice');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <img src={colabLogo} alt="Colab" className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-zinc-900">How do you want to use Colab?</h2>
        <p className="text-sm text-zinc-600 mt-2">Pick one. You can change this any time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => persist('client')}
          disabled={!!busy}
          className={cn(
            "group text-left p-6 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-900 hover:shadow-lg transition-all",
            busy === 'client' && "opacity-60"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-900 mb-1">Build with AI + experts</div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Describe what you need. We assemble the right team, manage delivery and ship it.
          </p>
          <div className="flex items-center gap-1 mt-4 text-sm font-medium text-zinc-900">
            I'm a client {busy === 'client' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </div>
        </button>

        <button
          onClick={() => persist('freelancer')}
          disabled={!!busy}
          className={cn(
            "group text-left p-6 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-900 hover:shadow-lg transition-all",
            busy === 'freelancer' && "opacity-60"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-900 mb-1">Join as a creative</div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Designers, writers, devs and producers. Get matched to projects that fit your craft.
          </p>
          <div className="flex items-center gap-1 mt-4 text-sm font-medium text-zinc-900">
            I'm a freelancer {busy === 'freelancer' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
          </div>
        </button>
      </div>

      <div className="text-center">
        <Button variant="ghost" disabled={!!busy} onClick={() => persist('undecided')} className="text-zinc-500 hover:text-zinc-900">
          {busy === 'undecided' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Skip for now — I just want to explore
        </Button>
      </div>
    </div>
  );
};
