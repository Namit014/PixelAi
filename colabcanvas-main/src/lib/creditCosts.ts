/**
 * Shared credit cost map — mirrors backend cost constants so the UI can
 * display "this action will cost N credits" before execution.
 *
 * Keep these values in sync with the constants used inside each edge function.
 */

export type ActionCategory = 'canvas' | 'cosmo' | 'covex' | 'cogent';

export type ActionId =
  // Canvas (5–20)
  | 'canvas.chat'
  | 'canvas.edit_image'
  | 'canvas.inpaint'
  | 'canvas.replace_text'
  | 'canvas.remove_background'
  | 'canvas.generate'
  // Cosmo (20–50)
  | 'cosmo.slide'
  | 'cosmo.document'
  | 'cosmo.full_deck'
  // Covex (30–100)
  | 'covex.workflow_small'
  | 'covex.workflow_large'
  // Cogent (200–500) — also consumes 1 Cogent run
  | 'cogent.execute_short'
  | 'cogent.execute_full';

export interface ActionCost {
  category: ActionCategory;
  credits: number;
  consumesCogentRun?: boolean;
  label: string;
}

export const ACTION_COSTS: Record<ActionId, ActionCost> = {
  'canvas.chat':              { category: 'canvas', credits: 5,   label: 'Canvas AI chat' },
  'canvas.edit_image':        { category: 'canvas', credits: 15,  label: 'Edit image' },
  'canvas.inpaint':           { category: 'canvas', credits: 10,  label: 'Inpaint' },
  'canvas.replace_text':      { category: 'canvas', credits: 5,   label: 'Replace text' },
  'canvas.remove_background': { category: 'canvas', credits: 8,   label: 'Remove background' },
  'canvas.generate':          { category: 'canvas', credits: 20,  label: 'Generate image' },

  'cosmo.slide':              { category: 'cosmo',  credits: 20,  label: 'Generate slide' },
  'cosmo.document':           { category: 'cosmo',  credits: 35,  label: 'Generate document' },
  'cosmo.full_deck':          { category: 'cosmo',  credits: 50,  label: 'Generate full deck' },

  'covex.workflow_small':     { category: 'covex',  credits: 30,  label: 'Run workflow' },
  'covex.workflow_large':     { category: 'covex',  credits: 100, label: 'Run large workflow' },

  'cogent.execute_short':     { category: 'cogent', credits: 200, consumesCogentRun: true, label: 'Run autonomous workflow' },
  'cogent.execute_full':      { category: 'cogent', credits: 500, consumesCogentRun: true, label: 'Run full autonomous workflow' },
};

export function getActionCost(id: ActionId): ActionCost {
  return ACTION_COSTS[id];
}
