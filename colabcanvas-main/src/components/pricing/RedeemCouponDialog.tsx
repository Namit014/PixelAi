import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Tag, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscountInfo {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discountAmount: number;
  applicable_plan_ids: string[] | null;
  applicable_billing_periods: string[] | null;
}

interface RedeemCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscountApplied?: (discountInfo: DiscountInfo) => void;
}

export function RedeemCouponDialog({ open, onOpenChange, onDiscountApplied }: RedeemCouponDialogProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      // Validate the code first - include auth header
      const { data: validation, error: validationError } = await supabase.functions.invoke('validate-discount-code', {
        body: { code: code.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (validationError || !validation?.valid) {
        setError(validation?.error || "Invalid coupon code");
        return;
      }

      // Pass the validated coupon to the pricing page. Activation happens only
      // after the user selects the exact eligible plan/billing period.
      if (onDiscountApplied) {
        onDiscountApplied({
          code: validation.code,
          discount_type: validation.discount_type,
          discount_value: validation.discount_value,
          discountAmount: validation.discount_amount,
          applicable_plan_ids: validation.applicable_plan_ids || null,
          applicable_billing_periods: validation.applicable_billing_periods || null
        });
      }
      
      toast({ title: "Coupon Applied!", description: `${validation.discount_value}% off applied` });
      onOpenChange(false);
      setCode("");

    } catch (err) {
      setError("Failed to redeem coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Redeem Coupon
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Enter your coupon code to unlock discounts or free subscription upgrades.
          </p>
          
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="Enter coupon code"
              className="pl-10"
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <Button onClick={handleRedeem} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Redeem Coupon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
