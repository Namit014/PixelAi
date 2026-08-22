import { useState } from "react";
import { Menu } from "lucide-react";
import { MobileDrawer } from "./MobileDrawer";
import { NotificationBell } from "@/components/layout/NotificationBell";
import colabLogo from "@/assets/colab-logo.svg";
import colabWordmark from "@/assets/colab-wordmark.svg";

export const MobileHeader = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-100"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
            className="w-9 h-9 flex items-center justify-center -ml-1 rounded-lg text-zinc-700 hover:bg-zinc-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <img src={colabLogo} alt="" className="h-6 w-6" />
            <img src={colabWordmark} alt="Colab" className="h-3.5" />
          </div>
          <div className="w-9 h-9 flex items-center justify-center">
            <NotificationBell />
          </div>
        </div>
      </header>
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};
