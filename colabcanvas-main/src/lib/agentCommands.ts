/**
 * Agent Command Protocol — typed vocabulary for RUMi autonomous canvas/cosmo actions.
 * The backend emits these as `rumi_agent_actions` rows; the frontend executor
 * picks them up via Realtime and drives the canvas/cosmo iframe via postMessage.
 */

export const AGENT_COMMAND_TYPES = [
  // Navigation
  'navigate_to_canvas',
  'navigate_to_cosmo',
  'navigate_to_website',

  // Canvas operations
  'canvas_add_image',
  'canvas_add_text',
  'canvas_create_artboard',
  'canvas_select_object',
  'canvas_move_object',
  'canvas_ai_generate',

  // Cosmo operations
  'cosmo_create_presentation',
  'cosmo_add_slide',
  'cosmo_set_theme',

  // Website operations
  'website_set_data',
  'website_update_section',

  // Cursor
  'cursor_move',
] as const;

export type AgentCommandType = typeof AGENT_COMMAND_TYPES[number];

export interface CursorTarget {
  x: number;
  y: number;
  label?: string;
}

export interface AgentCommand {
  type: AgentCommandType;
  payload: Record<string, unknown>;
  cursor_target?: CursorTarget;
}

// ── postMessage protocol ──────────────────────────────────

export const AGENT_MSG_PREFIX = 'RUMI_AGENT' as const;

export interface AgentPostMessage {
  source: typeof AGENT_MSG_PREFIX;
  command: AgentCommandType;
  payload: Record<string, unknown>;
  actionId: string;          // rumi_agent_actions.id for ack
}

export interface AgentAckMessage {
  source: typeof AGENT_MSG_PREFIX;
  ack: true;
  actionId: string;
  success: boolean;
  result?: Record<string, unknown>;
}

export function isAgentCommand(msg: unknown): msg is AgentPostMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as any).source === AGENT_MSG_PREFIX &&
    'command' in (msg as any)
  );
}

export function isAgentAck(msg: unknown): msg is AgentAckMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as any).source === AGENT_MSG_PREFIX &&
    (msg as any).ack === true
  );
}

/**
 * Check if a given action_type from the DB matches a known agent command.
 */
export function isCanvasCommand(actionType: string): boolean {
  return (AGENT_COMMAND_TYPES as readonly string[]).includes(actionType);
}
