import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentActionExecutor, type AgentAction } from './useAgentActionExecutor';
import { isCanvasCommand, AGENT_MSG_PREFIX, type AgentPostMessage, type AgentCommandType } from '@/lib/agentCommands';

interface CursorState {
  x: number;
  y: number;
  label?: string;
  clicking: boolean;
}

/**
 * Extends `useAgentActionExecutor` to drive canvas/cosmo via postMessage.
 * Animates the magic cursor, then fires commands to the preview iframe.
 */
export function useAgentCanvasExecutor(jobId: string | null) {
  const base = useAgentActionExecutor(jobId);
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, clicking: false });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const processedRef = useRef<Set<string>>(new Set());
  const sendCommandRef = useRef<((msg: AgentPostMessage) => void) | null>(null);

  /** Register the sendCommand from LiveCanvasPreview */
  const registerSendCommand = useCallback((fn: (msg: AgentPostMessage) => void) => {
    sendCommandRef.current = fn;
  }, []);

  // Process new canvas-command actions
  useEffect(() => {
    if (!base.actions.length) return;

    const unprocessed = base.actions.filter(
      a => !processedRef.current.has(a.id) && isCanvasCommand(a.action_type) && a.status === 'executing'
    );

    if (unprocessed.length === 0) return;

    const processNext = async () => {
      for (const action of unprocessed) {
        processedRef.current.add(action.id);
        await executeAction(action);
      }
    };

    processNext();
  }, [base.actions]);

  const executeAction = async (action: AgentAction) => {
    const data = action.action_data || {};
    const cursorTarget = data.cursor_target as { x: number; y: number; label?: string } | undefined;

    // Update status text
    setStatusText((data.step as string) || action.action_type);

    // 1. Handle navigation commands (update previewUrl)
    if (action.action_type === 'navigate_to_canvas') {
      const projectId = data.projectId as string;
      if (projectId) {
        setPreviewUrl(`/canvas?projectId=${encodeURIComponent(projectId)}&agentMode=true`);
      }
      await markDone(action.id);
      return;
    }

    if (action.action_type === 'navigate_to_cosmo') {
      const presentationId = data.presentationId as string;
      if (presentationId) {
        setPreviewUrl(`/cosmo?presentationId=${encodeURIComponent(presentationId)}&agentMode=true`);
      }
      await markDone(action.id);
      return;
    }

    if (action.action_type === 'navigate_to_website') {
      // Website previews are handled by the dedicated LandingPagePanel — this hook
      // (which drives the magic-cursor canvas/cosmo preview) must NOT take over the
      // preview URL. We just acknowledge the action so the agent can proceed.
      await markDone(action.id);
      return;
    }

    // 2. Cursor-only command
    if (action.action_type === 'cursor_move' && cursorTarget) {
      setCursor({ x: cursorTarget.x, y: cursorTarget.y, label: cursorTarget.label, clicking: false });
      await markDone(action.id);
      return;
    }

    // 3. Move cursor to target, then fire postMessage
    if (cursorTarget) {
      setCursor({ x: cursorTarget.x, y: cursorTarget.y, label: cursorTarget.label, clicking: false });
      await sleep(250); // cursor travel time
    }

    // Click animation
    setCursor(prev => ({ ...prev, clicking: true }));
    await sleep(150);

    // Fire command to iframe
    if (isCanvasCommand(action.action_type)) {
      await waitForRegisteredSender(sendCommandRef);
    }

    if (sendCommandRef.current) {
      const msg: AgentPostMessage = {
        source: AGENT_MSG_PREFIX,
        command: action.action_type as AgentCommandType,
        payload: data,
        actionId: action.id,
      };
      sendCommandRef.current(msg);
    }

    setCursor(prev => ({ ...prev, clicking: false, label: undefined }));

    // Mark done in DB
    await markDone(action.id);
  };

  const markDone = async (actionId: string) => {
    await supabase
      .from('rumi_agent_actions')
      .update({ status: 'done', updated_at: new Date().toISOString() } as any)
      .eq('id', actionId);
  };

  return {
    ...base,
    cursor,
    previewUrl,
    statusText,
    registerSendCommand,
    isWorking: base.actions.some(a => a.status === 'executing'),
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForRegisteredSender(
  sendCommandRef: React.MutableRefObject<((msg: AgentPostMessage) => void) | null>,
  attempts = 40,
  delayMs = 100,
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (sendCommandRef.current) return;
    await sleep(delayMs);
  }
}
