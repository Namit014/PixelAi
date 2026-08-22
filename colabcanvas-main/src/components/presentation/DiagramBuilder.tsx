import { useState, useRef, useCallback, useEffect } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ContentBlock } from '@/types/presentation';
import {
  Square, Circle, Type, ArrowRight, Minus, X, Download,
  MousePointer, Move, Trash2, PenTool,
} from 'lucide-react';

// ── Shape Types ──────────────────────────────────────────────────────

type ShapeType = 'rect' | 'circle' | 'text' | 'line' | 'arrow' | 'path';
type ToolMode = 'select' | 'rect' | 'circle' | 'text' | 'line' | 'arrow' | 'pen';

interface DiagramShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  // For lines/arrows
  x2?: number;
  y2?: number;
  // For paths (bezier)
  pathData?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CANVAS_W = 800;
const CANVAS_H = 500;

const TOOLS: { id: ToolMode; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'pen', icon: PenTool, label: 'Bezier Pen' },
];

const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

export function DiagramBuilder({ isOpen, onClose }: Props) {
  const [shapes, setShapes] = useState<DiagramShape[]>([]);
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [fillColor, setFillColor] = useState('#6366f120');
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [dragState, setDragState] = useState<{ startX: number; startY: number; shapeId?: string; creating?: boolean; moved?: boolean } | null>(null);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const addBlockToSlide = usePresentationStore((s) => s.addBlockToSlide);
  const activeSlideId = usePresentationStore((s) => s.activeSlideId);

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e);

    if (tool === 'pen') {
      setPenPoints(prev => [...prev, pt]);
      return;
    }

    if (tool === 'select') {
      // Check if clicking on a shape
      const target = (e.target as SVGElement).closest('[data-shape-id]');
      if (target) {
        const id = target.getAttribute('data-shape-id')!;
        setSelectedId(id);
        setDragState({ startX: pt.x, startY: pt.y, shapeId: id, moved: false });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // Creating a new shape
    const id = crypto.randomUUID();
    const newShape: DiagramShape = {
      id, type: tool === 'arrow' ? 'arrow' : tool === 'line' ? 'line' : tool as ShapeType,
      x: pt.x, y: pt.y, width: 0, height: 0,
      fill: tool === 'text' ? 'transparent' : fillColor,
      stroke: strokeColor, strokeWidth: 2,
      text: tool === 'text' ? 'Text' : undefined,
      x2: tool === 'line' || tool === 'arrow' ? pt.x : undefined,
      y2: tool === 'line' || tool === 'arrow' ? pt.y : undefined,
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedId(id);
    setDragState({ startX: pt.x, startY: pt.y, shapeId: id, creating: true });
  }, [tool, fillColor, strokeColor, getSvgPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const pt = getSvgPoint(e);

    if (dragState.creating && dragState.shapeId) {
      setShapes(prev => prev.map(s => {
        if (s.id !== dragState.shapeId) return s;
        if (s.type === 'line' || s.type === 'arrow') {
          return { ...s, x2: pt.x, y2: pt.y };
        }
        const w = pt.x - dragState.startX;
        const h = pt.y - dragState.startY;
        return {
          ...s,
          x: w < 0 ? pt.x : dragState.startX,
          y: h < 0 ? pt.y : dragState.startY,
          width: Math.abs(w),
          height: Math.abs(h),
        };
      }));
    } else if (dragState.shapeId) {
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setDragState(prev => prev ? { ...prev, moved: true } : null);
      }
      setShapes(prev => prev.map(s => {
        if (s.id !== dragState.shapeId) return s;
        if (s.type === 'line' || s.type === 'arrow') {
          return { ...s, x: s.x + dx, y: s.y + dy, x2: (s.x2 || 0) + dx, y2: (s.y2 || 0) + dy };
        }
        return { ...s, x: s.x + dx, y: s.y + dy };
      }));
      setDragState(prev => prev ? { ...prev, startX: pt.x, startY: pt.y } : null);
    }
  }, [dragState, getSvgPoint]);

  const handleMouseUp = useCallback(() => {
    if (dragState?.creating && dragState.shapeId) {
      const shape = shapes.find(s => s.id === dragState.shapeId);
      if (shape && shape.type === 'text') {
        setEditingTextId(shape.id);
      }
    }
    setDragState(null);
  }, [dragState, shapes]);

  // Finish pen path on double click
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (tool === 'pen' && penPoints.length > 1) {
      const d = penPoints.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x} ${pt.y}`;
        const prev = penPoints[i - 1];
        const cpx1 = prev.x + (pt.x - prev.x) / 3;
        const cpy1 = prev.y + (pt.y - prev.y) / 3;
        const cpx2 = prev.x + 2 * (pt.x - prev.x) / 3;
        const cpy2 = prev.y + 2 * (pt.y - prev.y) / 3;
        return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
      }, '');

      const newShape: DiagramShape = {
        id: crypto.randomUUID(), type: 'path',
        x: 0, y: 0, width: 0, height: 0,
        fill: 'none', stroke: strokeColor, strokeWidth: 2,
        pathData: d,
      };
      setShapes(prev => [...prev, newShape]);
      setPenPoints([]);
      return;
    }

    // Double click on shape to edit text
    const target = (e.target as SVGElement).closest('[data-shape-id]');
    if (target) {
      setEditingTextId(target.getAttribute('data-shape-id'));
    }
  }, [tool, penPoints, strokeColor]);

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      setShapes(prev => prev.filter(s => s.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editingTextId) deleteSelected();
      }
      if (e.key === 'Escape') {
        if (editingTextId) setEditingTextId(null);
        else if (penPoints.length > 0) setPenPoints([]);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, selectedId, editingTextId, penPoints, deleteSelected, onClose]);

  const exportToSlide = useCallback(() => {
    if (!activeSlideId || !svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGElement;
    // Remove selection indicators
    svgClone.querySelectorAll('.selection-indicator').forEach(el => el.remove());
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

    const block: ContentBlock = {
      id: crypto.randomUUID(),
      regionId: '',
      type: 'image',
      src: dataUri,
      alt: 'Diagram',
      fit: 'contain',
    };
    addBlockToSlide(activeSlideId, block);
    onClose();
  }, [activeSlideId, addBlockToSlide, onClose]);

  if (!isOpen) return null;

  const renderShape = (shape: DiagramShape) => {
    const isSelected = selectedId === shape.id;
    const group = (
      <g key={shape.id} data-shape-id={shape.id}>
        {shape.type === 'rect' && (
          <rect
            x={shape.x} y={shape.y} width={shape.width} height={shape.height}
            fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth}
            rx={4}
          />
        )}
        {shape.type === 'circle' && (
          <ellipse
            cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2}
            rx={shape.width / 2} ry={shape.height / 2}
            fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth}
          />
        )}
        {shape.type === 'text' && (
          <rect x={shape.x} y={shape.y} width={Math.max(shape.width, 80)} height={Math.max(shape.height, 30)}
            fill="transparent" stroke="transparent" />
        )}
        {(shape.type === 'line' || shape.type === 'arrow') && (
          <>
            <line x1={shape.x} y1={shape.y} x2={shape.x2} y2={shape.y2}
              stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
            {shape.type === 'arrow' && shape.x2 != null && shape.y2 != null && (
              <polygon
                points={getArrowHead(shape.x, shape.y, shape.x2, shape.y2)}
                fill={shape.stroke}
              />
            )}
          </>
        )}
        {shape.type === 'path' && shape.pathData && (
          <path d={shape.pathData} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
        )}
        {/* Text label */}
        {shape.text && editingTextId !== shape.id && (
          <text
            x={shape.type === 'line' || shape.type === 'arrow'
              ? ((shape.x + (shape.x2 || shape.x)) / 2)
              : shape.x + (shape.width || 80) / 2}
            y={shape.type === 'line' || shape.type === 'arrow'
              ? ((shape.y + (shape.y2 || shape.y)) / 2 - 8)
              : shape.y + (shape.height || 30) / 2}
            textAnchor="middle" dominantBaseline="central"
            fontSize={14} fill="#000" style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {shape.text}
          </text>
        )}
        {/* Editable text foreignObject */}
        {editingTextId === shape.id && (
          <foreignObject
            x={shape.x} y={shape.y}
            width={Math.max(shape.width, 120)} height={Math.max(shape.height, 40)}
          >
            <input
              autoFocus
              defaultValue={shape.text || ''}
              onBlur={(e) => {
                setShapes(prev => prev.map(s => s.id === shape.id ? { ...s, text: e.target.value } : s));
                setEditingTextId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              style={{
                width: '100%', height: '100%', border: 'none', outline: '2px solid #6366f1',
                background: 'white', textAlign: 'center', fontSize: 14, borderRadius: 4,
              }}
            />
          </foreignObject>
        )}
        {/* Selection outline */}
        {isSelected && (
          <rect
            className="selection-indicator"
            x={shape.type === 'line' || shape.type === 'arrow' ? Math.min(shape.x, shape.x2 || shape.x) - 4 : shape.x - 4}
            y={shape.type === 'line' || shape.type === 'arrow' ? Math.min(shape.y, shape.y2 || shape.y) - 4 : shape.y - 4}
            width={shape.type === 'line' || shape.type === 'arrow' ? Math.abs((shape.x2 || shape.x) - shape.x) + 8 : (shape.width || 80) + 8}
            height={shape.type === 'line' || shape.type === 'arrow' ? Math.abs((shape.y2 || shape.y) - shape.y) + 8 : (shape.height || 30) + 8}
            fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" rx={4}
          />
        )}
      </g>
    );
    return group;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-popover border border-border rounded-2xl shadow-2xl flex flex-col" style={{ width: CANVAS_W + 80, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Diagram Builder</h3>
          <div className="flex gap-2">
            <button onClick={exportToSlide} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Download className="w-4 h-4" /> Insert to Slide
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-1 p-2 border-r border-border bg-muted/30" style={{ width: 48 }}>
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTool(t.id); if (t.id !== 'pen') setPenPoints([]); }}
                title={t.label}
                className={`p-2 rounded-lg transition-colors ${tool === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button onClick={deleteSelected} title="Delete" className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="border-t border-border my-1" />
            {/* Color swatches */}
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[8px] text-muted-foreground uppercase">Fill</span>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {COLORS.slice(0, 6).map(c => (
                  <button
                    key={`f-${c}`}
                    onClick={() => setFillColor(c + '20')}
                    className="w-3.5 h-3.5 rounded-sm border border-border"
                    style={{ backgroundColor: c + '40' }}
                  />
                ))}
              </div>
              <span className="text-[8px] text-muted-foreground uppercase mt-1">Stroke</span>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {COLORS.slice(0, 6).map(c => (
                  <button
                    key={`s-${c}`}
                    onClick={() => setStrokeColor(c)}
                    className={`w-3.5 h-3.5 rounded-sm border ${strokeColor === c ? 'ring-2 ring-primary' : 'border-border'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-4 bg-background">
            <svg
              ref={svgRef}
              width={CANVAS_W} height={CANVAS_H}
              className="border border-border rounded-lg bg-white"
              style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

              {shapes.map(renderShape)}

              {/* Pen tool preview */}
              {tool === 'pen' && penPoints.length > 0 && (
                <g>
                  {penPoints.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#6366f1" />
                  ))}
                  {penPoints.length > 1 && (
                    <polyline
                      points={penPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2"
                    />
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>{shapes.length} shapes</span>
          <span>
            {tool === 'pen' ? 'Click to add points, double-click to finish path' :
             tool === 'select' ? 'Click to select, drag to move, double-click to edit text' :
             'Click and drag to create shape'}
          </span>
        </div>
      </div>
    </div>
  );
}

function getArrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;
  const p1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const p1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const p2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const p2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
  return `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`;
}
