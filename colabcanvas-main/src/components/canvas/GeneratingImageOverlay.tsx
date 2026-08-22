import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratingImageOverlayProps {
  isGenerating: boolean;
  position: { x: number; y: number };
  width: number;
  height: number;
  onComplete?: () => void;
}

const GeneratingImageOverlay = ({
  isGenerating,
  position,
  width,
  height,
  onComplete
}: GeneratingImageOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingState, setLoadingState] = useState<'starting' | 'generating' | 'completed'>('starting');
  const duration = 30000; // 30 seconds max generation time

  useEffect(() => {
    if (!isGenerating) {
      // When generation completes, finish the animation
      if (progress > 0) {
        setProgress(100);
        setLoadingState('completed');
        onComplete?.();
      }
      return;
    }

    // Reset state when generation starts
    setProgress(0);
    setLoadingState('starting');

    // Start with "Getting started" for 2 seconds
    const startingTimeout = setTimeout(() => {
      setLoadingState('generating');

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progressPercentage = Math.min(100, (elapsedTime / duration) * 100);
        setProgress(progressPercentage);
      }, 50);

      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(startingTimeout);
  }, [isGenerating, duration]);

  if (!isGenerating && loadingState !== 'completed') return null;

  return (
    <AnimatePresence>
      {(isGenerating || loadingState === 'completed') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-none z-50"
          style={{
            left: position.x,
            top: position.y,
            width,
            height
          }}
        >
          {/* Status and progress INSIDE the container, centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground whitespace-nowrap flex flex-col items-center gap-2"
            >
              <span>
                {loadingState === 'starting' && 'Getting started.'}
                {loadingState === 'generating' && 'Creating image. May take a moment.'}
                {loadingState === 'completed' && 'Image created.'}
              </span>
              {loadingState !== 'completed' && (
                <span className="text-lg font-medium tabular-nums">
                  {Math.round(progress)}%
                </span>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GeneratingImageOverlay;
