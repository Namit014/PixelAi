"use client"

import * as React from "react"
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface ImageGenerationProps {
  children: React.ReactNode;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export const ImageGeneration = ({ 
  children, 
  duration = 30000,
  onComplete,
  className
}: ImageGenerationProps) => {
  const [progress, setProgress] = React.useState(0);
  const [loadingState, setLoadingState] = React.useState<
    "starting" | "generating" | "completed"
  >("starting");

  React.useEffect(() => {
    const startingTimeout = setTimeout(() => {
      setLoadingState("generating");

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progressPercentage = Math.min(100, (elapsedTime / duration) * 100);
        setProgress(progressPercentage);

        if (progressPercentage >= 100) {
          clearInterval(interval);
          setLoadingState("completed");
          onComplete?.();
        }
      }, 16);

      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(startingTimeout);
  }, [duration, onComplete]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-sm text-muted-foreground text-center font-medium"
      >
        {loadingState === "starting" && "Getting started."}
        {loadingState === "generating" && "Creating image. May take a moment."}
        {loadingState === "completed" && "Image created."}
      </motion.div>
      
      {/* Progress bar */}
      {loadingState !== "completed" && (
        <div className="w-full max-w-[200px] h-1 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: loadingState === "starting" ? "5%" : `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

ImageGeneration.displayName = "ImageGeneration";
