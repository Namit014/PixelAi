import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Eye, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagicAICursor } from './MagicAICursor';
import { isAgentAck, type AgentPostMessage, AGENT_MSG_PREFIX } from '@/lib/agentCommands';
import { cn } from '@/lib/utils';

interface LiveCanvasPreviewProps {
  /** URL to load in iframe — e.g. /canvas/{projectId}?agentMode=true */
  src: string | null;
  /** Current cursor position */
  cursorPos: { x: number; y: number } | null;
  cursorLabel?: string;
  cursorClicking?: boolean;
  /** Whether the agent is currently working */
  isWorking?: boolean;
  statusText?: string;
  /** Open the full page */
  onOpenFull?: () => void;
  onRegisterSendCommand?: (fn: (msg: AgentPostMessage) => void) => void;
  className?: string;
}

export function LiveCanvasPreview({
  src,
  cursorPos,
  cursorLabel,
  cursorClicking,
  isWorking,
  statusText,
  onOpenFull,
  onRegisterSendCommand,
  className,
}: LiveCanvasPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const commandQueueRef = useRef<AgentPostMessage[]>([]);

  // Listen for acks from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (isAgentAck(e.data)) {
        // Could track completion here
      }
      if (e.data?.source === AGENT_MSG_PREFIX && e.data?.type === 'READY') {
        setIframeReady(true);
        // Flush queued commands
        for (const cmd of commandQueueRef.current) {
          iframeRef.current?.contentWindow?.postMessage(cmd, '*');
        }
        commandQueueRef.current = [];
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Reset ready state when src changes
  useEffect(() => {
    setIframeReady(false);
  }, [src]);

  /** Send a command to the iframe — queues if not ready */
  const sendCommand = useCallback((msg: AgentPostMessage) => {
    if (iframeReady && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    } else {
      commandQueueRef.current.push(msg);
    }
  }, [iframeReady]);

  useEffect(() => {
    if (!onRegisterSendCommand) return;
    onRegisterSendCommand(sendCommand);
  }, [onRegisterSendCommand, sendCommand]);

  // Expose sendCommand via ref-like pattern
  (LiveCanvasPreview as any)._sendCommand = sendCommand;

  if (!src) return null;

  // Map cursor position to container-relative coordinates
  const containerRect = containerRef.current?.getBoundingClientRect();
  const mappedCursor = cursorPos && containerRect
    ? {
        x: containerRect.left + (cursorPos.x / 1920) * containerRect.width,
        y: containerRect.top + (cursorPos.y / 1080) * containerRect.height,
      }
    : null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl overflow-hidden border border-border bg-card shadow-lg",
        isExpanded ? "fixed inset-4 z-50" : "w-full h-full",
        className
      )}
    >
      {/* Status Bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-3 py-1.5 bg-card/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          {isWorking && (
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <span className="text-[10px] text-muted-foreground font-medium">
            {statusText || (isWorking ? 'AI is working...' : 'Live Preview')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          {onOpenFull && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenFull}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0 pt-8"
        style={{ minHeight: isExpanded ? 'calc(100vh - 2rem)' : '400px' }}
        title="Live Canvas Preview"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      {/* Loading overlay */}
      {!iframeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-20 pt-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading canvas...</span>
          </div>
        </div>
      )}

      {/* Magic AI Cursor overlay */}
      {mappedCursor && (
        <MagicAICursor
          x={mappedCursor.x}
          y={mappedCursor.y}
          label={cursorLabel}
          isClicking={cursorClicking}
          visible={isWorking}
        />
      )}
    </motion.div>
  );
}
