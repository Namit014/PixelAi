import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Video, ArrowRight } from "lucide-react";

interface VideoUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureAttempted?: string;
}

export function VideoUpgradeModal({ open, onOpenChange, featureAttempted = 'Video Generation' }: VideoUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 bg-zinc-950 border-zinc-800 text-white overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Icon + Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Video className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Unlock Video Creation</h3>
              <p className="text-xs text-zinc-500">Pro plan and above</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-400 leading-relaxed">
            {featureAttempted} is available on Pro and above. Upgrade to access AI video generation, motion design, and video editing.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Pro", value: "$30/mo" },
              { label: "Business", value: "$60/mo" },
              { label: "Enterprise", value: "$140/mo" },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="text-sm font-medium text-zinc-200">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200"
            >
              Upgrade
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
