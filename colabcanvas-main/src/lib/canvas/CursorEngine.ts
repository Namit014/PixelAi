/**
 * CursorEngine — Production-grade, zero-lag cursor management.
 *
 * Works WITH Fabric.js by setting canvas.defaultCursor / hoverCursor
 * instead of fighting Fabric's internal cursor system.
 * Modifier key changes apply instantly (no rAF delay).
 */

import {
  CURSOR_SELECT,
  CURSOR_MOVE,
  CURSOR_DUPLICATE,
  CURSOR_PEN,
  CURSOR_PEN_ADD,
  CURSOR_PEN_DELETE,
  CURSOR_PEN_CLOSE,
  CURSOR_ROTATE,
  CURSOR_TEXT,
  CURSOR_GRAB,
  CURSOR_GRABBING,
  CURSOR_CROSSHAIR,
  CURSOR_EYEDROPPER,
  getRotatedResizeCursor,
  CORNER_ANGLES,
} from './cursorSvgs';

import type { Canvas as FabricCanvas } from 'fabric';

export type ToolMode =
  | 'select' | 'edit' | 'hand' | 'pen' | 'pencil' | 'text'
  | 'rectangle' | 'circle' | 'star' | 'triangle' | 'hexagon'
  | 'polygon' | 'arrow' | 'image' | 'chat' | 'eyedropper';

interface Modifiers {
  shift: boolean;
  alt: boolean;
  meta: boolean;
  ctrl: boolean;
  space: boolean;
}

export type PenHoverState = 'idle' | 'overAnchor' | 'overSegment' | 'nearClose';

export class CursorEngine {
  private canvas: FabricCanvas;
  private tool: ToolMode = 'select';
  private mods: Modifiers = { shift: false, alt: false, meta: false, ctrl: false, space: false };
  private isPanning = false;
  private lastDefault = '';
  private lastHover = '';
  private destroyed = false;

  // External pen hover state (set by BezierPenTool via ref callback)
  public penHoverState: PenHoverState = 'idle';

  // Current resolved cursor for pen tool (read by BezierPenTool overlay)
  public currentPenCursor: string = CURSOR_PEN;

  // Bound handlers (for cleanup)
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;
  private _onMouseMove: () => void;

  constructor(fabricCanvas: FabricCanvas) {
    this.canvas = fabricCanvas;

    this._onKeyDown = this.handleKeyDown.bind(this);
    this._onKeyUp = this.handleKeyUp.bind(this);
    this._onMouseMove = this.handleMouseMove.bind(this);

    window.addEventListener('keydown', this._onKeyDown, { passive: true });
    window.addEventListener('keyup', this._onKeyUp, { passive: true });

    // Listen to Fabric's mouse:move to update cursors contextually (e.g. hover target changes)
    fabricCanvas.on('mouse:move', this._onMouseMove);
    fabricCanvas.on('mouse:over', this._onMouseMove);
    fabricCanvas.on('mouse:out', this._onMouseMove);

    // Apply initial cursors
    this.applyCursors();
  }

  /** Call when the active tool changes */
  setTool(tool: ToolMode) {
    this.tool = tool;
    this.applyCursors();
  }

  /** Call when space-pan starts/stops */
  setPanning(panning: boolean) {
    this.isPanning = panning;
    this.applyCursors();
  }

  /** Force refresh (e.g. after pen hover state changes) */
  refresh() {
    this.applyCursors();
  }

  private handleMouseMove() {
    if (this.destroyed) return;
    this.applyCursors();
  }

  // ── Modifier key handlers ─────────────────────────────────
  private handleKeyDown(e: KeyboardEvent) {
    let changed = false;
    if (e.key === 'Shift' && !this.mods.shift) { this.mods.shift = true; changed = true; }
    if (e.key === 'Alt' && !this.mods.alt) { this.mods.alt = true; changed = true; }
    if (e.key === 'Meta' && !this.mods.meta) { this.mods.meta = true; changed = true; }
    if (e.key === 'Control' && !this.mods.ctrl) { this.mods.ctrl = true; changed = true; }
    if (e.code === 'Space' && !this.mods.space) { this.mods.space = true; changed = true; }
    if (changed) this.applyCursors();
  }

  private handleKeyUp(e: KeyboardEvent) {
    let changed = false;
    if (e.key === 'Shift') { this.mods.shift = false; changed = true; }
    if (e.key === 'Alt') { this.mods.alt = false; changed = true; }
    if (e.key === 'Meta') { this.mods.meta = false; changed = true; }
    if (e.key === 'Control') { this.mods.ctrl = false; changed = true; }
    if (e.code === 'Space') { this.mods.space = false; changed = true; }
    if (changed) this.applyCursors();
  }

  /**
   * Core: resolve cursor and apply via Fabric's own cursor properties.
   * Fabric reads defaultCursor/hoverCursor/moveCursor on every mouse:move
   * and sets upperCanvasEl.style.cursor accordingly. By setting these
   * properties, we work WITH Fabric instead of fighting it.
   */
  private applyCursors() {
    const { defaultCursor, hoverCursor } = this.resolve();

    if (defaultCursor !== this.lastDefault) {
      this.lastDefault = defaultCursor;
      this.canvas.defaultCursor = defaultCursor;
    }
    if (hoverCursor !== this.lastHover) {
      this.lastHover = hoverCursor;
      this.canvas.hoverCursor = hoverCursor;
      (this.canvas as any).moveCursor = hoverCursor;
    }
  }

  // ── Cursor resolution (priority chain) ────────────────────
  private resolve(): { defaultCursor: string; hoverCursor: string } {
    // 1. Space-pan overrides everything
    if (this.mods.space || this.isPanning || this.tool === 'hand') {
      const c = this.isPanning ? CURSOR_GRABBING : CURSOR_GRAB;
      return { defaultCursor: c, hoverCursor: c };
    }

    // 2. Tool-specific
    switch (this.tool) {
      case 'pen':
      case 'pencil': {
        const c = this.tool === 'pen' ? this.resolvePen() : CURSOR_CROSSHAIR;
        this.currentPenCursor = c;
        return { defaultCursor: c, hoverCursor: c };
      }
      case 'text':
        return { defaultCursor: CURSOR_TEXT, hoverCursor: CURSOR_TEXT };
      case 'eyedropper':
        return { defaultCursor: CURSOR_EYEDROPPER, hoverCursor: CURSOR_EYEDROPPER };
      case 'chat':
        return { defaultCursor: CURSOR_CROSSHAIR, hoverCursor: CURSOR_CROSSHAIR };
      case 'rectangle':
      case 'circle':
      case 'star':
      case 'triangle':
      case 'hexagon':
      case 'polygon':
      case 'arrow':
      case 'image':
        return { defaultCursor: CURSOR_CROSSHAIR, hoverCursor: CURSOR_CROSSHAIR };
      case 'select':
      case 'edit':
      default:
        return this.resolveSelect();
    }
  }

  private resolveSelect(): { defaultCursor: string; hoverCursor: string } {
    const hoverTarget = (this.canvas as any)._target;

    if (hoverTarget) {
      // Check corner handle (resize/rotate)
      const corner = (hoverTarget as any).__corner;
      if (corner) {
        const cornerCursor = this.resolveCornerCursor(corner, hoverTarget);
        if (cornerCursor) return { defaultCursor: CURSOR_SELECT, hoverCursor: cornerCursor };
      }

      // Alt+hover → duplicate
      if (this.mods.alt && !(hoverTarget as any).isArtboard && !(hoverTarget as any).isTitle) {
        return { defaultCursor: CURSOR_SELECT, hoverCursor: CURSOR_DUPLICATE };
      }

      // Hovering object → move
      return { defaultCursor: CURSOR_SELECT, hoverCursor: CURSOR_MOVE };
    }

    return { defaultCursor: CURSOR_SELECT, hoverCursor: CURSOR_SELECT };
  }

  private resolvePen(): string {
    switch (this.penHoverState) {
      case 'overAnchor': return CURSOR_PEN_DELETE;
      case 'overSegment': return CURSOR_PEN_ADD;
      case 'nearClose': return CURSOR_PEN_CLOSE;
      default: return CURSOR_PEN;
    }
  }

  private resolveCornerCursor(corner: string, target: any): string {
    if (corner.includes('Rotate') || corner === 'mtr') {
      return CURSOR_ROTATE;
    }
    const baseAngle = CORNER_ANGLES[corner];
    if (baseAngle !== undefined) {
      const objAngle = target.angle || 0;
      return getRotatedResizeCursor(baseAngle, objAngle);
    }
    return '';
  }

  // ── Lifecycle ─────────────────────────────────────────────
  destroy() {
    this.destroyed = true;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.off('mouse:move', this._onMouseMove);
    this.canvas.off('mouse:over', this._onMouseMove);
    this.canvas.off('mouse:out', this._onMouseMove);
  }
}
