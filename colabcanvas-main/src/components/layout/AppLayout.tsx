import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AnnouncementPopupHost } from "@/components/popups/AnnouncementPopupHost";

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <AppHeader />
      <Outlet />
      <AnnouncementPopupHost />
    </div>
  );
};
