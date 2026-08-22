import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Workflow Editor',
    description: 'Create visual AI design pipelines by connecting nodes together.',
  },
  {
    title: 'Drag Nodes',
    description: 'Drag nodes from the left panel onto the canvas to add them to your workflow.',
  },
  {
    title: 'Connect Nodes',
    description: 'Click and drag between node handles to create connections.',
  },
  {
    title: 'Configure Nodes',
    description: 'Click on a node to see its configuration options in the right panel.',
  },
  {
    title: 'Execute Workflow',
    description: 'Click the Execute button to run your workflow and generate designs.',
  },
];

const OnboardingTutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('workflow-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem('workflow-tutorial-seen', 'true');
    setShowTutorial(false);
  };

  if (!showTutorial) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </div>
            <h2 className="text-xl font-semibold">{step.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-muted-foreground">{step.description}</p>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            Skip Tutorial
          </Button>
          <Button onClick={handleNext}>
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentStep
                  ? 'bg-primary'
                  : 'bg-zinc-300 dark:bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingTutorial;
