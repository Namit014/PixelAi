import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  Folder,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Gift,
  LogOut,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import colabLogo from "@/assets/colab-logo.svg";
import colabWordmark from "@/assets/colab-wordmark.svg";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const items = [
  { label: "Brands", icon: Folder, path: "/brands" },
  { label: "Settings", icon: SettingsIcon, path: "/settings" },
  { label: "Pricing", icon: CreditCard, path: "/pricing" },
  { label: "Referral", icon: Gift, path: "/referral" },
  { label: "Community", icon: Users, path: "/community" },
  { label: "Help Center", icon: HelpCircle, path: "/help" },
  { label: "Feedback", icon: MessageSquare, path: "/feedback" },
];

export const MobileDrawer = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    navigate("/auth");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85%] max-w-sm p-0 bg-white border-r border-zinc-200">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-100">
          <img src={colabLogo} alt="" className="h-8 w-8" />
          <img src={colabWordmark} alt="Colab" className="h-4" />
        </div>
        <div className="flex flex-col py-2">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left"
            >
              <item.icon className="w-5 h-5 text-zinc-500" />
              {item.label}
            </button>
          ))}
          <div className="border-t border-zinc-100 my-2" />
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
