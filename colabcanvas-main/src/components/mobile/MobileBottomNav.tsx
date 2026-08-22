import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import CanvasIcon from "@/assets/icons/canvas-nav.svg?react";
import CosmoIcon from "@/assets/icons/cosmo-nav.svg?react";
import ThinkIcon from "@/assets/icons/think.svg?react";
import CovexIcon from "@/assets/icons/covex-nav.svg?react";
import TalentIcon from "@/assets/icons/companion-nav.svg?react";

const tabs = [
  { name: "Home", icon: CanvasIcon, path: "/dashboard" },
  { name: "Cosmo", icon: CosmoIcon, path: "/cosmo" },
  { name: "Cogent", icon: ThinkIcon, path: "/cogent" },
  { name: "Covex", icon: CovexIcon, path: "/covex" },
  { name: "Companion", icon: TalentIcon, path: "/talent" },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="fixed left-0 right-0 z-50 pointer-events-none flex justify-center px-3"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <nav
        className={cn(
          "pointer-events-auto w-full max-w-md rounded-full",
          // Liquid-glass: translucent white, blur, soft border, subtle highlight
          "bg-white/65 backdrop-blur-xl backdrop-saturate-150",
          "border border-white/60 ring-1 ring-black/5",
          "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]",
          "px-2 py-2",
        )}
      >
        <div className="grid grid-cols-5 gap-1 w-full">
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              (tab.path === "/dashboard" && location.pathname === "/") ||
              (tab.path !== "/dashboard" && location.pathname.startsWith(tab.path));
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                aria-label={tab.name}
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-0.5 rounded-full transition-all h-12 px-1",
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/70",
                )}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    "[&_path]:stroke-current [&_circle]:stroke-current [&_line]:stroke-current [&_polyline]:stroke-current",
                  )}
                />
                <span className="text-[9px] font-medium leading-none tracking-tight truncate max-w-full">
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
