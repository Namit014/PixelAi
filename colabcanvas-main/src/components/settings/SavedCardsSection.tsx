import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SavedCardsSection = () => {
  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-zinc-600" />
          <h2 className="text-xl font-semibold text-zinc-900">Saved Cards</h2>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add Card
        </Button>
      </div>

      <div className="text-center py-12">
        <CreditCard className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 mb-2">No saved cards</p>
        <p className="text-sm text-zinc-400">Add a payment method to save it for future use</p>
      </div>
    </div>
  );
};
