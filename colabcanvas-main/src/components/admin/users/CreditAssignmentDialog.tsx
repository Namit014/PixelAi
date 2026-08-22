import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';
import { logAdminAction } from '@/lib/adminTheme';

interface CreditAssignmentDialogProps {
  userId: string;
  userName: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreditAssignmentDialog = ({
  userId,
  userName,
  currentBalance,
  open,
  onOpenChange,
  onSuccess,
}: CreditAssignmentDialogProps) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isAdding, setIsAdding] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const creditAmount = parseInt(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Add or deduct credits
      if (isAdding) {
        const { error } = await supabase.rpc('add_credits', {
          _user_id: userId,
          _amount: creditAmount,
          _description: reason || 'Admin credit addition',
        });
        if (error) throw error;
      } else {
        const { data: success, error } = await supabase.rpc('deduct_credits', {
          _user_id: userId,
          _amount: creditAmount,
          _description: reason || 'Admin credit deduction',
        });
        if (error) throw error;
        if (!success) {
          throw new Error('Insufficient balance for deduction');
        }
      }

      // Log admin action
      await logAdminAction(supabase, user.id, 'credit_adjust', userId, {
        amount: isAdding ? creditAmount : -creditAmount,
        reason,
        new_balance: isAdding ? currentBalance + creditAmount : currentBalance - creditAmount,
      });

      toast({
        title: 'Success',
        description: `Credits ${isAdding ? 'added' : 'deducted'} successfully`,
      });

      onSuccess();
      onOpenChange(false);
      setAmount('');
      setReason('');
    } catch (error: any) {
      console.error('Error adjusting credits:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to adjust credits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Adjust Credits for {userName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Current Balance</Label>
            <div className="text-2xl font-bold text-zinc-100">{currentBalance} credits</div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={isAdding ? 'default' : 'outline'}
              onClick={() => setIsAdding(true)}
              className={isAdding 
                ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
            <Button
              type="button"
              variant={!isAdding ? 'default' : 'outline'}
              onClick={() => setIsAdding(false)}
              className={!isAdding 
                ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }
            >
              <Minus className="h-4 w-4 mr-2" />
              Deduct Credits
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-zinc-300">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-zinc-300">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Compensation for service issue..."
              rows={3}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={isAdding
                ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30'
                : 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30'
              }
            >
              {loading ? 'Processing...' : isAdding ? 'Add Credits' : 'Deduct Credits'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
