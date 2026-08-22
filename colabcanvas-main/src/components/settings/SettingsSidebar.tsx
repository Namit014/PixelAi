import { User, CreditCard, History, Shield, Receipt, TrendingUp, Brain, Gift, Briefcase, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "talent", label: "Talent Setup", icon: Briefcase },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "credit-history", label: "Credit History", icon: TrendingUp },
  { id: "payment-history", label: "Payment History", icon: Receipt },
  { id: "saved-cards", label: "Saved Cards", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "activity", label: "Recent Activity", icon: History },
  { id: "ai-audit", label: "AI Audit Log", icon: Brain },
  { id: "referral", label: "Referral Program", icon: Gift },
];

export const SettingsSidebar = ({ activeSection, onSectionChange }: SettingsSidebarProps) => {
  return (
    <aside className="w-64 border-r border-zinc-200 bg-white min-h-screen p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-6">Settings</h2>
      <nav className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover-scale",
                activeSection === section.id
                  ? "bg-zinc-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              )}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
