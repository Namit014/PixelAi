import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  steps: TourStep[];
}

interface AppTourEngineProps {
  tour: Tour | null;
  onComplete: () => void;
  onDismiss: () => void;
}

export function AppTourEngine({ tour, onComplete, onDismiss }: AppTourEngineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Calculate position of tooltip relative to target element
  const calculatePosition = useCallback((targetRect: DOMRect) => {
    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = targetRect.bottom + padding;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Check if tooltip would go off the bottom
    if (top + tooltipHeight > viewportHeight) {
      top = targetRect.top - tooltipHeight - padding;
    }

    // Check if tooltip would go off the left
    if (left < padding) {
      left = padding;
    }

    // Check if tooltip would go off the right
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }

    return { top, left };
  }, []);

  // Find and highlight target element
  useEffect(() => {
    if (!tour || !tour.steps[currentStep]) return;

    const step = tour.steps[currentStep];
    
    if (!step.ui_target_selector) {
      // Center the tooltip if no target
      setHighlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 180
      });
      return;
    }

    const targetElement = document.querySelector(step.ui_target_selector);
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);
      setTooltipPosition(calculatePosition(rect));

      // Scroll element into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 180
      });
    }
  }, [tour, currentStep, calculatePosition]);

  // Track step view
  useEffect(() => {
    if (!tour) return;
    
    // Track step viewed event (could be sent to analytics)
    console.log(`📍 Tour step viewed: ${tour.name} - Step ${currentStep + 1}`);
  }, [tour, currentStep]);

  const handleNext = async () => {
    if (!tour) return;

    const step = tour.steps[currentStep];

    if (step.cta_action === 'navigate' && step.navigate_to) {
      window.location.href = step.navigate_to;
      return;
    }

    if (step.cta_action === 'complete' || currentStep >= tour.steps.length - 1) {
      // Mark tour as complete
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_tour_progress').upsert({
            user_id: user.id,
            tour_id: tour.id,
            current_step: tour.steps.length,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,tour_id' });
        }
      } catch (error) {
        console.error('Error marking tour complete:', error);
      }
      onComplete();
      return;
    }

    // Update progress
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_tour_progress').upsert({
          user_id: user.id,
          tour_id: tour.id,
          current_step: currentStep + 1
        }, { onConflict: 'user_id,tour_id' });
      }
    } catch (error) {
      console.error('Error updating tour progress:', error);
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleDismiss = async () => {
    if (!tour) return;

    // Mark tour as dismissed with dropped step
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_tour_progress').upsert({
          user_id: user.id,
          tour_id: tour.id,
          current_step: currentStep,
          dropped_at_step: currentStep
        }, { onConflict: 'user_id,tour_id' });
      }
    } catch (error) {
      console.error('Error recording tour dismissal:', error);
    }

    onDismiss();
  };

  if (!tour || tour.steps.length === 0) return null;

  const step = tour.steps[currentStep];
  const isLastStep = currentStep >= tour.steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with cutout for highlighted element */}
      <div 
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        onClick={handleDismiss}
        style={{
          clipPath: highlightRect 
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${highlightRect.left - 8}px 100%, 
                ${highlightRect.left - 8}px ${highlightRect.top - 8}px, 
                ${highlightRect.right + 8}px ${highlightRect.top - 8}px, 
                ${highlightRect.right + 8}px ${highlightRect.bottom + 8}px, 
                ${highlightRect.left - 8}px ${highlightRect.bottom + 8}px, 
                ${highlightRect.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : undefined
        }}
      />

      {/* Highlight border around target */}
      {highlightRect && (
        <div 
          className="absolute border-2 border-violet-500 rounded-lg pointer-events-none animate-pulse"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16
          }}
        />
      )}

      {/* Tooltip Card */}
      <Card 
        className="absolute w-[360px] p-5 shadow-2xl z-10 animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 p-1 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Step indicator */}
        <div className="text-xs text-muted-foreground mb-2">
          Step {currentStep + 1} of {tour.steps.length}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

        {/* Media (if any) */}
        {step.media_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            {step.media_url.endsWith('.mp4') ? (
              <video 
                src={step.media_url} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-auto"
              />
            ) : (
              <img 
                src={step.media_url} 
                alt={step.title} 
                className="w-full h-auto"
              />
            )}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {tour.steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentStep
                  ? "bg-violet-500"
                  : index < currentStep
                    ? "bg-violet-300"
                    : "bg-zinc-200"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            Skip Tour
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? (
                step.cta_text || 'Get Started'
              ) : (
                <>
                  {step.cta_text || 'Next'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
}
