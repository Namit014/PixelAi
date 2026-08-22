import { useCallback } from 'react';
import { AppTourEngine } from './AppTourEngine';
import { useTourTrigger } from '@/hooks/useTourTrigger';
import { TourContext } from './TourContext';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { activeTour, completeTour, dismissTour, startManualTour } = useTourTrigger();

  const handleStartManualTour = useCallback((targetPage?: string) => {
    startManualTour(targetPage);
  }, [startManualTour]);

  return (
    <TourContext.Provider value={{ startManualTour: handleStartManualTour }}>
      {children}
      <AppTourEngine tour={activeTour} onComplete={completeTour} onDismiss={dismissTour} />
    </TourContext.Provider>
  );
}
