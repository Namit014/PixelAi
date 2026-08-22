import { Rect, Shadow, util } from 'fabric';
import type { AutoLayoutConfig } from './autoLayout';

export interface FrameContainerOptions {
  id: string;
  title: string;
  width: number;
  height: number;
  left: number;
  top: number;
  fill?: string;
  autoLayoutConfig?: AutoLayoutConfig;
}

/**
 * FrameContainer — a passive visual artboard background.
 * Extends Rect (NOT Group) so it never hijacks hit-testing or traps pointer events.
 * All user objects remain top-level canvas elements with `parentFrameId` metadata.
 */
export class FrameContainer extends Rect {
  declare isArtboard: boolean;
  declare artboardId: string;
  declare artboardTitle: string;
  declare fullTitle: string;
  declare _bgColor: string;
  declare autoLayoutConfig: AutoLayoutConfig | null;

  constructor(options: FrameContainerOptions) {
    const bgFill = options.fill || 'white';

    super({
      width: options.width,
      height: options.height,
      left: options.left,
      top: options.top,
      fill: bgFill,
      stroke: '#E5E7EB',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      originX: 'left',
      originY: 'top',
      selectable: true,
      evented: true,
      hasControls: true,
      lockRotation: true,
      objectCaching: false,
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.08)',
        blur: 8,
        offsetX: 0,
        offsetY: 2,
      }),
    });

    this.isArtboard = true;
    this.artboardId = options.id;
    this.artboardTitle = options.title;
    this.fullTitle = options.title;
    this._bgColor = bgFill;
    this.autoLayoutConfig = options.autoLayoutConfig || null;
  }

  // ── Bounds ──────────────────────────────────────────────────────

  getFrameBounds(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const w = (this.width || 0) * (this.scaleX || 1);
    const h = (this.height || 0) * (this.scaleY || 1);
    return {
      left: this.left || 0,
      top: this.top || 0,
      width: w,
      height: h,
    };
  }

  // ── Hit testing ─────────────────────────────────────────────────

  containsWorldPoint(px: number, py: number): boolean {
    const bounds = this.getFrameBounds();
    return (
      px >= bounds.left &&
      px <= bounds.left + bounds.width &&
      py >= bounds.top &&
      py <= bounds.top + bounds.height
    );
  }

  // ── Coordinate conversion ───────────────────────────────────────

  worldToLocal(wx: number, wy: number): { x: number; y: number } {
    const invMatrix = util.invertTransform(this.calcTransformMatrix());
    const pt = util.transformPoint({ x: wx, y: wy } as any, invMatrix);
    return { x: pt.x, y: pt.y };
  }

  localToWorld(lx: number, ly: number): { x: number; y: number } {
    const matrix = this.calcTransformMatrix();
    const pt = util.transformPoint({ x: lx, y: ly } as any, matrix);
    return { x: pt.x, y: pt.y };
  }

  // ── Background color ───────────────────────────────────────────

  setBackgroundColor(color: string): void {
    this._bgColor = color;
    this.set({ fill: color });
    this.dirty = true;
  }

  getBackgroundColor(): string {
    return this._bgColor;
  }

  // ── Highlight ──────────────────────────────────────────────────

  setHighlight(active: boolean): void {
    if (active) {
      this.set({ stroke: '#3B82F6', strokeWidth: 3 });
    } else {
      this.set({ stroke: '#E5E7EB', strokeWidth: 2 });
    }
    this.dirty = true;
  }

  // ── Resize (normalizes scale to width/height) ──────────────────

  applyResize(): void {
    const sx = this.scaleX || 1;
    const sy = this.scaleY || 1;
    if (sx === 1 && sy === 1) return;

    const newW = (this.width || 0) * sx;
    const newH = (this.height || 0) * sy;

    this.set({ scaleX: 1, scaleY: 1, width: newW, height: newH });
    this.setCoords();
  }

  // ── Export ──────────────────────────────────────────────────────

  toFrameDataURL(
    format: 'png' | 'jpeg' = 'png',
    multiplier: number = 1,
    quality: number = 1
  ): string {
    return this.toDataURL({ format, multiplier, quality });
  }
}
