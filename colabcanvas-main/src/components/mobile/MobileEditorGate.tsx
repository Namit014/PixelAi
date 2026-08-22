import { ReactNode } from "react";
import { useIsMobileDevice } from "@/hooks/useIsMobile";
import { DesktopOnlyScreen } from "./DesktopOnlyScreen";

interface Props {
  children: ReactNode;
  toolName?: string;
  /** Optional component to render on mobile instead of the desktop-only screen. */
  mobileFallback?: ReactNode;
}

/**
 * Wraps editor routes so mobile users see a friendly "open on desktop" screen
 * instead of a broken/unusable editor. Routes can opt into a mobile experience
 * by passing `mobileFallback` (e.g. read-only Canvas viewer).
 */
export const MobileEditorGate = ({ children, toolName, mobileFallback }: Props) => {
  const isMobile = useIsMobileDevice();
  if (isMobile) {
    return <>{mobileFallback ?? <DesktopOnlyScreen toolName={toolName} />}</>;
  }
  return <>{children}</>;
};
