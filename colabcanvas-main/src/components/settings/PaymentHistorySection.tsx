import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

export const PaymentHistorySection = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payments")
        // Security: avoid pulling sensitive fields like gateway_response into the client
        .select("id, user_id, amount, currency, status, transaction_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setPayments(data);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-zinc-200">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-zinc-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="w-6 h-6 text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-900">Payment History</h2>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">No payment history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-zinc-900">
                    {payment.currency} {parseFloat(payment.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
              </div>
              {payment.transaction_id && (
                <p className="text-xs text-zinc-400">ID: {payment.transaction_id}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
