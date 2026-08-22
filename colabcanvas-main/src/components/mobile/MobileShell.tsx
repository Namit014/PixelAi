import { Outlet } from "react-router-dom";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { AnnouncementPopupHost } from "@/components/popups/AnnouncementPopupHost";

export const MobileShell = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <MobileHeader />
      <main
        className="flex-1 w-full overflow-x-hidden mobile-page"
        // Reserve space below the floating pill nav (h-12 + py-2 ≈ 64px) plus safe area.
        style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
      >
        <Outlet />
      </main>
      <MobileBottomNav />
      <AnnouncementPopupHost />
    </div>
  );
};
