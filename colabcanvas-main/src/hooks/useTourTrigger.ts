import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TourStep {
  id: string;
  step_order: number;
  title: string;
  description: string;
  ui_target_selector: string | null;
  media_url: string | null;
  cta_text: string;
  cta_action: 'next' | 'complete' | 'navigate';
  navigate_to: string | null;
}

interface Tour {
  id: string;
  name: string;
  description: string | null;
  trigger_type: 'first_login' | 'feature_open' | 'manual' | 'behavior';
  trigger_feature: string | null;
  priority: number;
  steps: TourStep[];
}

interface UseTourTriggerReturn {
  activeTour: Tour | null;
  triggerFeatureTour: (featureName: string) => void;
  completeTour: () => void;
  dismissTour: () => void;
  startManualTour: (targetPage?: string) => void;
  isLoading: boolean;
}

export function useTourTrigger(): UseTourTriggerReturn {
  const { user, onboardingCompleted } = useAuth();
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [completedTourIds, setCompletedTourIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's completed tours
  useEffect(() => {
    const fetchCompletedTours = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_tour_progress')
          .select('tour_id, completed_at')
          .eq('user_id', user.id);

        if (error) throw error;

        const completedIds = new Set(
          data
            ?.filter(p => p.completed_at)
            .map(p => p.tour_id) || []
        );
        setCompletedTourIds(completedIds);
      } catch (error) {
        console.error('Error fetching tour progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedTours();
  }, [user]);

  // Check for first_login tour when user logs in
  useEffect(() => {
    const checkFirstLoginTour = async () => {
      if (!user || isLoading || activeTour) return;

      // Only trigger first_login tour if onboarding is not completed
      if (onboardingCompleted) return;

      try {
        // Fetch first_login tours
        const { data: tours, error } = await supabase
          .from('app_tours')
          .select('*')
          .eq('is_active', true)
          .eq('trigger_type', 'first_login')
          .order('priority', { ascending: false });

        if (error) throw error;

        // Find first uncompleted tour
        const availableTour = tours?.find(t => !completedTourIds.has(t.id));
        
        if (availableTour) {
          // Fetch steps for this tour
          const { data: steps } = await supabase
            .from('app_tour_steps')
            .select('*')
            .eq('tour_id', availableTour.id)
            .order('step_order');

          if (steps && steps.length > 0) {
            setActiveTour({
              ...availableTour,
              steps: steps.map(s => ({
                ...s,
                cta_action: s.cta_action as 'next' | 'complete' | 'navigate'
              }))
            } as Tour);
          }
        }
      } catch (error) {
        console.error('Error checking first login tour:', error);
      }
    };

    checkFirstLoginTour();
  }, [user, isLoading, completedTourIds, onboardingCompleted, activeTour]);

  // Trigger a feature-specific tour
  const triggerFeatureTour = useCallback(async (featureName: string) => {
    if (!user || activeTour) return;

    try {
      // Fetch feature_open tours matching this feature
      const { data: tours, error } = await supabase
        .from('app_tours')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', 'feature_open')
        .eq('trigger_feature', featureName)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Find first uncompleted tour
      const availableTour = tours?.find(t => !completedTourIds.has(t.id));

      if (availableTour) {
        // Fetch steps for this tour
        const { data: steps } = await supabase
          .from('app_tour_steps')
          .select('*')
          .eq('tour_id', availableTour.id)
          .order('step_order');

        if (steps && steps.length > 0) {
          setActiveTour({
            ...availableTour,
            steps: steps.map(s => ({
              ...s,
              cta_action: s.cta_action as 'next' | 'complete' | 'navigate'
            }))
          } as Tour);

          console.log(`🎯 Triggered tour: ${availableTour.name} for feature: ${featureName}`);
        }
      }
    } catch (error) {
      console.error('Error triggering feature tour:', error);
    }
  }, [user, activeTour, completedTourIds]);

  const completeTour = useCallback(() => {
    if (activeTour) {
      setCompletedTourIds(prev => new Set([...prev, activeTour.id]));
    }
    setActiveTour(null);
  }, [activeTour]);

  const dismissTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  // Start a manual tour (replayable, ignores completion status)
  const startManualTour = useCallback(async (targetPage?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('app_tours')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', 'manual')
        .order('priority', { ascending: false });

      if (targetPage) {
        query = query.or(`target_page.eq.${targetPage},target_page.is.null`);
      }

      const { data: tours, error } = await query;
      if (error) throw error;

      const tour = tours?.[0];
      if (tour) {
        const { data: steps } = await supabase
          .from('app_tour_steps')
          .select('*')
          .eq('tour_id', tour.id)
          .order('step_order');

        if (steps && steps.length > 0) {
          setActiveTour({
            ...tour,
            steps: steps.map(s => ({
              ...s,
              cta_action: s.cta_action as 'next' | 'complete' | 'navigate'
            }))
          } as Tour);
          console.log(`🎯 Manual tour started: ${tour.name}`);
        }
      }
    } catch (error) {
      console.error('Error starting manual tour:', error);
    }
  }, [user]);

  return {
    activeTour,
    triggerFeatureTour,
    completeTour,
    dismissTour,
    startManualTour,
    isLoading
  };
}
