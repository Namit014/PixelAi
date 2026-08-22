import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface NewBrandCardProps {
  onClick: () => void;
}

export const NewBrandCard = ({ onClick }: NewBrandCardProps) => {
  return (
    <div>
      <Card onClick={onClick} className="group cursor-pointer overflow-hidden border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-100/50 transition-all duration-300 flex items-center justify-center" style={{ height: 'calc(160px + 37px)' }}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-200 group-hover:bg-zinc-300 transition-colors flex items-center justify-center">
            <Plus className="w-6 h-6 text-zinc-600" />
          </div>
          <h3 className="font-medium text-sm text-zinc-700">Add New Brand</h3>
        </div>
      </Card>
      {/* Spacer to match BrandCard height with text below */}
      <div className="mt-2.5 px-1 invisible">
        <h3 className="font-semibold text-sm">&nbsp;</h3>
        <p className="text-xs mt-0.5">&nbsp;</p>
      </div>
    </div>
  );
};
