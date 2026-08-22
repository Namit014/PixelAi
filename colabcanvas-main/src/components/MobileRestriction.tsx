/**
 * Legacy mobile restriction. Kept as a passthrough wrapper for backward
 * compatibility — mobile UX is now handled by `MobileShell` + per-route
 * `MobileEditorGate` (see App.tsx). Do not add new logic here.
 */
export const MobileRestriction = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
