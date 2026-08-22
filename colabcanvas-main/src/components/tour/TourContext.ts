import { createContext, useContext } from 'react';

interface TourContextValue {
  startManualTour: (targetPage?: string) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourContext must be used within TourProvider');
  return ctx;
}
