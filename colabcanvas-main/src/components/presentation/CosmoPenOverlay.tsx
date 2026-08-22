import { useState, useRef, useCallback, useEffect } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ffffff'];
const WIDTHS = [2, 4, 6, 10];

export function CosmoPenOverlay() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<{ d: string; color: string; width: number }[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const addBlockToSlide = usePresentationStore(s => s.addBlockToSlide);
  const activeSlideId = usePresentationStore(s => s.activeSlideId);
  const setActiveTool = usePresentationStore(s => s.setActiveTool);
  const slideWidth = usePresentationStore(s => s.slideWidth) || 1920;
  const slideHeight = usePresentationStore(s => s.slideHeight) || 1080;

  const getPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * slideWidth,
      y: ((e.clientY - rect.top) / rect.height) * slideHeight,
    };
  }, [slideWidth, slideHeight]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const { x, y } = getPoint(e);
    setCurrentPath([`M ${x} ${y}`]);
    setIsDrawing(true);
  }, [getPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPoint(e);
    setCurrentPath(prev => [...prev, `L ${x} ${y}`]);
  }, [isDrawing, getPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    setPaths(prev => [...prev, { d: currentPath.join(' '), color, width: strokeWidth }]);
    setCurrentPath([]);
    setIsDrawing(false);
  }, [isDrawing, currentPath, color, strokeWidth]);

  const finalize = useCallback(() => {
    if (paths.length === 0) return;
    if (!activeSlideId) return;

    // Create SVG data URI
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${slideWidth} ${slideHeight}" width="${slideWidth}" height="${slideHeight}">
      ${paths.map(p => `<path d="${p.d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    </svg>`;
    const dataUri = `data:image/svg+xml;base64,${btoa(svgContent)}`;

    addBlockToSlide(activeSlideId, {
      id: crypto.randomUUID(),
      type: 'image',
      regionId: 'main',
      src: dataUri,
      alt: 'Drawing',
      fit: 'contain',
    });

    setPaths([]);
    setActiveTool('select');
  }, [paths, activeSlideId, addBlockToSlide, setActiveTool, slideWidth, slideHeight]);

  // Escape to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaths([]);
        setCurrentPath([]);
        setActiveTool('select');
      }
      if (e.key === 'Enter') finalize();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTool, finalize]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        cursor: 'crosshair',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${slideWidth} ${slideHeight}`}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {currentPath.length > 0 && (
          <path d={currentPath.join(' ')} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        )}
      </svg>

      {/* Mini toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-auto">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={(e) => { e.stopPropagation(); setColor(c); }}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: c === color ? 'hsl(var(--primary))' : 'transparent',
              transform: c === color ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {WIDTHS.map(w => (
          <button
            key={w}
            onClick={(e) => { e.stopPropagation(); setStrokeWidth(w); }}
            className="flex items-center justify-center w-6 h-6 rounded transition-colors"
            style={{ backgroundColor: w === strokeWidth ? 'hsl(var(--muted))' : 'transparent' }}
          >
            <div className="rounded-full bg-foreground" style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={(e) => { e.stopPropagation(); finalize(); }}
          className="text-[11px] font-medium px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Done
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setPaths([]); setCurrentPath([]); setActiveTool('select'); }}
          className="text-[11px] font-medium px-2 py-1 rounded text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
