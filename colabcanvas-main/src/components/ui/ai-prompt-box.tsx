import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, X, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const PromptTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  ...props
}, ref) => <textarea className={cn("flex w-full rounded-md border-none bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none", className)} ref={ref} rows={1} {...props} />);
PromptTextarea.displayName = "PromptTextarea";

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({
  className,
  sideOffset = 4,
  ...props
}, ref) => <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props} />);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({
  className,
  ...props
}, ref) => <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({
  className,
  children,
  ...props
}, ref) => <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-muted/80 p-2 hover:bg-muted transition-all">
        <X className="h-5 w-5 text-foreground hover:text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>);
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({
  className,
  ...props
}, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)} {...props} />);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({
  imageUrl,
  onClose
}) => {
  if (!imageUrl) return null;
  return <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.95
      }} transition={{
        duration: 0.2,
        ease: "easeOut"
      }} className="relative bg-background rounded-2xl overflow-hidden shadow-2xl">
          <img src={imageUrl} alt="Full preview" className="w-full max-h-[80vh] object-contain rounded-2xl" />
        </motion.div>
      </DialogContent>
    </Dialog>;
};

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}
interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
  onDragOver,
  onDragLeave,
  onDrop,
  ...rest
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(value || "");
  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };
  return <TooltipProvider>
        <PromptInputContext.Provider value={{
      isLoading,
      value: value ?? internalValue,
      setValue: onValueChange ?? handleChange,
      maxHeight,
      onSubmit,
      disabled
    }}>
          <div ref={ref} className={cn("rounded-3xl border border-border p-4 transition-all duration-300 py-[15px] px-[12px] shadow-none bg-white pb-[15px] pt-[15px]", className)} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} {...rest}>
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>;
});
PromptInput.displayName = "PromptInput";
interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}
const PromptInputTextarea: React.FC<PromptInputTextareaProps & Omit<React.ComponentProps<typeof PromptTextarea>, 'onKeyDown'>> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  textareaRef,
  ...props
}) => {
  const {
    value,
    setValue,
    maxHeight,
    onSubmit,
    disabled
  } = usePromptInput();
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || internalRef;
  React.useEffect(() => {
    if (disableAutosize || !ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = typeof maxHeight === "number" ? `${Math.min(ref.current.scrollHeight, maxHeight)}px` : `min(${ref.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize, ref]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };
  return <PromptTextarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={handleKeyDown} className={cn("text-sm", className)} disabled={disabled} placeholder={placeholder} {...props} />;
};
interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}
const PromptInputActions: React.FC<PromptInputActionsProps> = ({
  children,
  className,
  ...props
}) => <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>;
interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const {
    disabled
  } = usePromptInput();
  return <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>;
};

// Custom Divider Component
const PromptDivider: React.FC = () => <div className="h-6 w-px bg-border/50 mx-1" />;

// ActionButton Component with Framer Motion
interface ActionButtonProps {
  isActive?: boolean;
  activeColor?: string;
  activeBgColor?: string;
  activeBorderColor?: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  inactiveIconClassName?: string;
}
const ActionButton: React.FC<ActionButtonProps> = ({
  isActive = false,
  activeColor,
  activeBgColor,
  activeBorderColor,
  icon,
  activeIcon,
  label,
  onClick,
  disabled = false,
  inactiveIconClassName
}) => {
  const displayIcon = isActive && activeIcon ? activeIcon : icon;
  const activeStyles = isActive ? {
    backgroundColor: activeBgColor || 'hsl(var(--primary) / 0.1)',
    borderColor: activeBorderColor || activeColor || 'hsl(var(--primary))',
    color: activeColor || 'hsl(var(--primary))'
  } : {};
  return <button type="button" onClick={onClick} disabled={disabled} style={activeStyles} className={cn("rounded-full transition-all flex items-center gap-1 border h-9 text-xs", isActive ? "px-3 py-1.5" : "w-9 justify-center bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted")}>
      <div className={cn("flex items-center justify-center flex-shrink-0", isActive ? "w-5 h-5" : inactiveIconClassName || "w-5 h-5")}>
        <motion.div animate={{
        rotate: isActive ? 360 : 0,
        scale: isActive ? 1.1 : 1
      }} whileHover={{
        rotate: isActive ? 360 : 15,
        scale: 1.1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 10
        }
      }} transition={{
        type: "spring",
        stiffness: 260,
        damping: 25
      }} className="flex items-center justify-center">
          {displayIcon}
        </motion.div>
      </div>
      <AnimatePresence>
        {isActive && <motion.span initial={{
        width: 0,
        opacity: 0
      }} animate={{
        width: "auto",
        opacity: 1
      }} exit={{
        width: 0,
        opacity: 0
      }} transition={{
        duration: 0.2
      }} className="overflow-hidden whitespace-nowrap flex-shrink-0">
            {label}
          </motion.span>}
      </AnimatePresence>
    </button>;
};
export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, PromptDivider, ActionButton, ImageViewDialog, TooltipProvider, cn };