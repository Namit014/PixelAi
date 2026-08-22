import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import colabLogo from '@/assets/colab-logo.svg';

const THINKING_PHASES = {
  general: [
    "Thinking...",
    "Understanding your request...",
    "Processing your input...",
    "Analyzing context..."
  ],
  searching: [
    "Searching design databases...",
    "Finding relevant inspirations...",
    "Curating the best matches...",
    "Analyzing design trends..."
  ],
  analyzing: [
    "Analyzing your requirements...",
    "Understanding the brief...",
    "Identifying design patterns...",
    "Preparing creative strategy..."
  ],
  generating: [
    "Generating your designs...",
    "Crafting visual concepts...",
    "Rendering design variations...",
    "Applying style parameters..."
  ],
  researching: [
    "Researching the web...",
    "Finding brand information...",
    "Gathering market insights...",
    "Analyzing competitors..."
  ],
};

export type ThinkingContext = 'general' | 'searching' | 'analyzing' | 'generating' | 'researching';

interface DynamicThinkingIndicatorProps {
  context?: ThinkingContext;
  customMessages?: string[];
  intervalMs?: number;
  isGenerating?: boolean;
  modelName?: string;
  startTime?: number | null;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'nano-banana-pro': 'Nano Banana Pro',
  'nano-banana': 'Nano Banana',
  'gemini-2.5-flash': 'Gemini Flash',
  'gemini-2.5-pro': 'Gemini Pro',
};

const MODEL_ETA_SECONDS: Record<string, number> = {
  'nano-banana-pro': 120,
  'nano-banana': 90,
  'gemini-2.5-flash': 120,
  'gemini-2.5-pro': 180,
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatEta = (seconds: number): string => {
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return `${m} m`;
  }
  return `${seconds} s`;
};

export const DynamicThinkingIndicator = ({ 
  context = 'general',
  customMessages,
  intervalMs = 2500,
  isGenerating = false,
  modelName,
  startTime
}: DynamicThinkingIndicatorProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  
  const messages = customMessages || THINKING_PHASES[context];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [messages.length, intervalMs]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [context]);

  // Timer for generation
  useEffect(() => {
    if (!isGenerating || !startTime) {
      setElapsed(0);
      return;
    }
    
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime]);

  const displayModelName = modelName ? (MODEL_DISPLAY_NAMES[modelName] || modelName) : null;
  const etaSeconds = modelName ? (MODEL_ETA_SECONDS[modelName] || 120) : 120;

  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3 flex items-center gap-3">
        <motion.img 
          src={colabLogo} 
          alt="RUMI" 
          className="h-5 w-5"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="min-w-[180px] flex flex-col gap-1">
          {isGenerating && startTime ? (
            <>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Generating images{displayModelName ? ` using ${displayModelName}` : ''}...
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-500">
                  {formatTime(elapsed)} / {formatEta(etaSeconds)}
                </span>
                <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden max-w-[120px]">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (elapsed / etaSeconds) * 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-zinc-600 dark:text-zinc-400"
              >
                {messages[currentIndex]}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicThinkingIndicator;
