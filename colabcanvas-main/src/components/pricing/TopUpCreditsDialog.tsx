import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CREDIT_PACKS = [
  { credits: 100, price: 10 },
  { credits: 500, price: 45 },
  { credits: 1000, price: 80 },
];

interface TopUpCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopUpCreditsDialog({ open, onOpenChange }: TopUpCreditsDialogProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const { toast } = useToast();

  const handleTopUp = async (credits: number, price: number) => {
    setLoading(credits);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-topup-payment', {
        body: { credits, price },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      // Redirect to PayU
      if (data?.payuUrl && data?.paymentData) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payuUrl;
        Object.entries(data.paymentData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Top Up Credits
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.credits} className="flex items-center justify-between p-4 border rounded-xl hover:bg-zinc-50 transition-colors">
              <div>
                <p className="font-semibold text-zinc-900">{pack.credits} Credits</p>
                <p className="text-sm text-muted-foreground">${pack.price} USD</p>
              </div>
              <Button onClick={() => handleTopUp(pack.credits, pack.price)} disabled={loading === pack.credits}>
                {loading === pack.credits ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
