import { useIsMobileDevice } from "@/hooks/useIsMobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileShell } from "./MobileShell";

/**
 * Picks the correct layout shell based on device. Mobile users get the
 * dedicated MobileShell (top header, bottom tab bar, drawer). Everyone else
 * keeps the existing desktop AppLayout.
 */
export const DeviceLayout = () => {
  const isMobile = useIsMobileDevice();
  return isMobile ? <MobileShell /> : <AppLayout />;
};
