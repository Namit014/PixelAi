import React, { useRef, useCallback, useState, useEffect } from "react";
import { X, Plus, Loader2, EllipsisVertical, Paperclip, Mic, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PromptInput,
  PromptInputActions,
  PromptDivider,
  ActionButton,
  ImageViewDialog } from
"@/components/ui/ai-prompt-box";
import GenerateIcon from "@/assets/icons/generate.svg?react";
import ColabLogo from "@/assets/colab-logo.svg?react";
import CosmoNavIcon from "@/assets/icons/cosmo-nav.svg?react";
import ThinkIcon from "@/assets/icons/think.svg?react";
import CompanionIcon from "@/assets/icons/companion-nav.svg?react";

// Dynamic placeholder examples for each mode
const PLACEHOLDER_EXAMPLES: Record<"canvas" | "cosmo" | "think" | "talent", string[]> = {
  canvas: [
  "A minimalist logo for a coffee brand...",
  "Cinematic portrait with dramatic lighting...",
  "Isometric illustration of a cozy room...",
  "Abstract geometric pattern in sunset colors...",
  "Vintage travel poster for Tokyo..."],

  cosmo: [
  "Create a logo with 5 variations...",
  "Build an image-to-video pipeline...",
  "Generate social media assets from one prompt...",
  "Upscale and enhance product photos...",
  "Create a brand identity workflow..."],

  think: [
  "Brainstorm startup ideas for sustainability...",
  "Analyze pros and cons of remote work...",
  "Explore marketing strategies for a new app...",
  "Break down a complex coding problem...",
  "Plan a product launch timeline..."],

  talent: [
  "Find a logo designer for my SaaS startup...",
  "Hire a brand strategist for a 4-week sprint...",
  "Source a freelance illustrator for a kids' book...",
  "Build me a small product design team...",
  "Get an agency to redesign our marketing site..."]

};

// Typewriter animation phases
type TypewriterPhase = "typing" | "pause" | "deleting" | "waiting";

interface DashboardPromptBoxProps {
  prompt: string;
  setPrompt: (value: string) => void;
  suggestion: string;
  isGenerating: boolean;
  attachedFiles: File[];
  filePreviewUrls: string[];
  handleFileAttach: () => void;
  removeFile: (index: number) => void;
  handlePromptSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  textareaHeight: number;
  handleResizeStart: (e: React.MouseEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeMode: "canvas" | "cosmo" | "think" | "talent";
  setActiveMode: (mode: "canvas" | "cosmo" | "think" | "talent") => void;
  isGeneratingWorkflow: boolean;
  onThinkSubmit: () => void;
  onCosmosSubmit: () => void;
  onTalentSubmit: () => void;
}

export const DashboardPromptBox: React.FC<DashboardPromptBoxProps> = ({
  prompt,
  setPrompt,
  suggestion,
  isGenerating,
  attachedFiles,
  filePreviewUrls,
  handleFileAttach,
  removeFile,
  handlePromptSubmit,
  handleKeyDown,
  textareaHeight,
  handleResizeStart,
  fileInputRef,
  handleFileChange,
  activeMode,
  setActiveMode,
  isGeneratingWorkflow,
  onThinkSubmit,
  onCosmosSubmit,
  onTalentSubmit
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<TypewriterPhase>("typing");
  const [charIndex, setCharIndex] = useState(0);

  // Reset typewriter when mode changes
  useEffect(() => {
    setPlaceholderIndex(0);
    setCharIndex(0);
    setDisplayText("");
    setPhase("typing");
  }, [activeMode]);

  // Typewriter animation effect
  useEffect(() => {
    const currentText = PLACEHOLDER_EXAMPLES[activeMode][placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (phase === "typing") {
      if (charIndex < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 40); // Typing speed
      } else {
        timeout = setTimeout(() => setPhase("pause"), 100);
      }
    } else if (phase === "pause") {
      timeout = setTimeout(() => setPhase("deleting"), 2000); // Hold for 2s
    } else if (phase === "deleting") {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 25); // Faster delete speed
      } else {
        timeout = setTimeout(() => setPhase("waiting"), 100);
      }
    } else if (phase === "waiting") {
      timeout = setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES[activeMode].length);
        setPhase("typing");
      }, 300);
    }

    return () => clearTimeout(timeout);
  }, [phase, charIndex, placeholderIndex, activeMode]);

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => isImageFile(file));
      if (imageFiles.length > 0 && fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((file) => dataTransfer.items.add(file));
        fileInputRef.current.files = dataTransfer.files;
        const event = new Event("change", { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    },
    [fileInputRef]
  );

  return (
    <>
      <PromptInput
        value={prompt}
        onValueChange={setPrompt}
        isLoading={isGenerating}
        onSubmit={handlePromptSubmit}
        className="w-full bg-secondary border-border"
        disabled={isGenerating}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-chatbox>

        {/* File previews */}
        <AnimatePresence>
          {attachedFiles.length > 0 &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 pb-3">

              {attachedFiles.map((file, index) =>
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group">

                  <div
                className="w-14 h-14 rounded-xl overflow-hidden cursor-pointer border border-border/50 transition-all duration-200 hover:border-border"
                onClick={() => setSelectedImage(filePreviewUrls[index])}>

                    <img src={filePreviewUrls[index]} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                  <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-1 opacity-100 transition-opacity hover:bg-foreground/80">

                    <X className="h-3 w-3 text-background" />
                  </button>
                </motion.div>
            )}
            </motion.div>
          }
        </AnimatePresence>

        {/* Textarea with suggestion overlay */}
        <div className="relative">
          <div
            style={{ height: `${textareaHeight}px` }}
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">

            {/* Typewriter placeholder overlay */}
            {!prompt && !suggestion &&
            <div className="absolute top-0 left-0 right-0 pointer-events-none text-sm z-0">
                <span
                className="bg-clip-text text-transparent animate-gradient-shift"
                style={{
                  backgroundImage: "linear-gradient(90deg, #959595, #ACACAC, #D4D4D4, #F0F0F0, #959595)",
                  backgroundSize: "200% 200%"
                }}>

                  {displayText}
                </span>
                {(phase === "typing" || phase === "deleting") &&
              <span className="animate-pulse text-[#959595] ml-0.5">|</span>
              }
              </div>
            }
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              className="resize-none min-h-full border-0 p-0 pr-2 focus-visible:ring-0 shadow-none text-sm bg-transparent focus-visible:outline-none relative z-10" />

          </div>

          {/* Suggestion overlay */}
          {suggestion && !isGenerating &&
          <div className="absolute top-0 left-0 right-0 pointer-events-none p-0 text-sm whitespace-pre-wrap overflow-hidden leading-normal">
              <span className="invisible">{prompt}</span>
              <span
              className="bg-gradient-to-r from-muted-foreground via-foreground/60 to-muted-foreground bg-clip-text text-transparent animate-text-shimmer"
              style={{ backgroundSize: "200% auto" }}>

                {suggestion}
              </span>
              <span className="inline-flex items-center gap-0.5 ml-2 px-1 py-1 bg-muted rounded align-middle">
                <kbd className="text-[9px] text-muted-foreground px-0.5 py-0 bg-border rounded">Tab</kbd>
                <span className="text-[9px] text-muted-foreground">to accept</span>
              </span>
            </div>
          }

          {/* Resize handle */}
          <div
            className="flex items-center justify-end h-5 cursor-ns-resize rounded-b-lg transition-all mt-1 pr-2"
            onMouseDown={handleResizeStart}>

            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Actions bar */}
        <PromptInputActions className="flex items-center justify-between mt-3 border-t border-primary-foreground pt-0">
          <div className="flex items-center gap-0.5">
            {/* Attach Button */}
            <ActionButton
               isActive={false}
               icon={<Paperclip className="w-4 h-4" />}
               label="Attach"
              onClick={() => {
                handleFileAttach();
              }} />


            <PromptDivider />

            {/* Canvas Button - Orange */}
            <ActionButton
              isActive={activeMode === "canvas"}
              activeColor="#F59E0B"
              activeBgColor="rgba(245, 158, 11, 0.1)"
              activeBorderColor="#F59E0B"
              icon={<ColabLogo className="w-4 h-4" />}
              label="Canvas"
              onClick={() => setActiveMode("canvas")} />


            {/* Cosmos Button - Purple */}
            <ActionButton
              isActive={activeMode === "cosmo"}
              activeColor="#8B5CF6"
              activeBgColor="rgba(139, 92, 246, 0.1)"
              activeBorderColor="#8B5CF6"
              icon={<CosmoNavIcon className="w-4 h-4" />}
              label="Cosmo"
              onClick={() => setActiveMode("cosmo")} />


            {/* Think Button - Teal */}
            <ActionButton
              isActive={activeMode === "think"}
              activeColor="#14B8A6"
              activeBgColor="rgba(20, 184, 166, 0.1)"
              activeBorderColor="#14B8A6"
              icon={<ThinkIcon className="w-4 h-4" />}
              label="Cogent"
              onClick={() => setActiveMode("think")} />


            {/* Talent Button - Emerald */}
            <ActionButton
              isActive={activeMode === "talent"}
              activeColor="#10B981"
              activeBgColor="rgba(16, 185, 129, 0.1)"
              activeBorderColor="#10B981"
              icon={<CompanionIcon className="w-4 h-4" />}
              label="Companion"
              onClick={() => setActiveMode("talent")} />

          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {/* Mic Button */}
            <button
              type="button"
              aria-label="Voice input"
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => {
                if (activeMode === "think") {
                  onThinkSubmit();
                } else if (activeMode === "cosmo") {
                  onCosmosSubmit();
                } else if (activeMode === "talent") {
                  onTalentSubmit();
                } else {
                  handlePromptSubmit();
                }
              }}
              disabled={!prompt.trim() || isGeneratingWorkflow}
              aria-label="Send"
              className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isGeneratingWorkflow ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </PromptInputActions>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*" />

      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      
    </>);

};