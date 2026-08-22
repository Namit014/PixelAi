import { memo, useState } from 'react';
import { usePenToolStore, type EditSubTool } from '@/stores/penToolStore';
import { cn } from '@/lib/utils';

// ── Inline SVG icon components using currentColor ──────────

const MoveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 143 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="22.33" y="85.99" width="15.47" height="15.47" rx="3" stroke="currentColor" strokeWidth="6"/>
    <rect x="85.97" y="22.28" width="15.47" height="15.47" rx="3" stroke="currentColor" strokeWidth="6"/>
    <path d="M87.03 36.64L74.47 49.2L69.85 53.82M36.82 86.85L49.37 74.3L53.3 70.25" stroke="currentColor" strokeWidth="6"/>
    <path d="M57.73 49.72L90.71 62.57L103.47 67.86C110.36 70.72 109.94 80.62 102.83 82.88L90.09 86.93C87.48 87.76 85.48 89.86 84.78 92.51L82.22 102.16C80.3 109.41 70.34 110.26 67.21 103.44L47.55 60.5C44.56 53.97 51.03 47.11 57.73 49.72Z" stroke="currentColor" strokeWidth="6"/>
  </svg>
);

const BendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 143 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="107.86" cy="106.93" r="10.2" stroke="currentColor" strokeWidth="6"/>
    <circle cx="35.14" cy="36.07" r="10.2" stroke="currentColor" strokeWidth="6"/>
    <path d="M107.34 97.79C107.34 63.49 79.53 35.69 45.24 35.69" stroke="currentColor" strokeWidth="6"/>
  </svg>
);

const WidthIcon = () => (
  <svg width="24" height="24" viewBox="0 0 143 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M78.65 50.84C64.08 44.96 47.5 38.85 36.61 26.88C34.72 24.79 30.97 25.73 30.87 28.54C30.29 44.02 33.06 66.25 45.86 79.75M63.98 91.02C83.4 100.16 95.35 107.14 101.74 113.87C103.82 116.06 109.03 115.53 109.61 112.57C112.39 98.35 113.71 78.36 105.69 67.22C103.44 64.1 100.22 61.48 96.36 59.13" stroke="currentColor" strokeWidth="6"/>
    <circle cx="70.96" cy="69.69" r="11.84" stroke="currentColor" strokeWidth="6"/>
    <rect x="31.94" y="93.69" width="15.47" height="15.47" rx="3" stroke="currentColor" strokeWidth="6"/>
    <rect x="95.59" y="29.98" width="15.47" height="15.47" rx="3" stroke="currentColor" strokeWidth="6"/>
    <path d="M96.64 44.35L84.08 56.91L79.46 61.52M46.43 94.56L58.98 82.01L62.91 77.96" stroke="currentColor" strokeWidth="6"/>
  </svg>
);

const CutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 143 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M97.3443 23.2627L64.4586 89.375M64.4586 89.375L59.092 100.164C55.7748 106.706 49.678 119.738 38.1203 119.738C23.6731 119.738 25.071 89.4452 41.8484 89.4452C55.2703 89.4452 62.5143 89.3984 64.4586 89.375Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M45.6557 23.2627L62.0985 56.3189M78.5414 89.375L83.908 100.164C87.2252 106.706 93.322 119.738 104.88 119.738C119.327 119.738 117.929 89.4452 101.152 89.4452C87.7297 89.4452 80.4857 89.3984 78.5414 89.375ZM78.5414 89.375L70.9925 76.3" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

const OffsetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 143 143" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M64.921 121.271C64.921 97.1248 45.347 77.5508 21.2012 77.5508" stroke="currentColor" strokeWidth="6"/>
    <path d="M51.8374 91.0009L81.1742 61.6641M81.1742 61.6641V84.7423M81.1742 61.6641H56.9221" stroke="currentColor" strokeWidth="6"/>
    <path d="M120.824 119.034C120.824 65.28 77.2479 21.7036 23.4937 21.7036" stroke="currentColor" strokeWidth="6" strokeDasharray="12 12"/>
  </svg>
);

const tools: { id: EditSubTool; label: string; Icon: React.FC }[] = [
  { id: 'move', label: 'Move', Icon: MoveIcon },
  { id: 'bend', label: 'Bend', Icon: BendIcon },
  { id: 'width', label: 'Width', Icon: WidthIcon },
  { id: 'cut', label: 'Cut / Break', Icon: CutIcon },
  { id: 'offset', label: 'Offset Path', Icon: OffsetIcon },
];

interface OffsetInputProps {
  onApply: (value: number) => void;
}

const OffsetInput = ({ onApply }: OffsetInputProps) => {
  const [value, setValue] = useState(10);
  return (
    <div className="absolute left-12 top-0 z-50 flex items-center gap-1 rounded-md border border-border bg-background p-1 shadow-md">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-14 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground"
        min={-100}
        max={100}
        step={1}
      />
      <button
        onClick={() => onApply(value)}
        className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90"
      >
        Apply
      </button>
    </div>
  );
};

const PenEditToolbar = memo(() => {
  const { mode, editSubTool, setEditSubTool, activePath, paths, updatePath, addPath, pushHistory } = usePenToolStore();
  const [showOffsetInput, setShowOffsetInput] = useState(false);

  if (mode !== 'editing') return null;

  const handleToolClick = (id: EditSubTool) => {
    setEditSubTool(id);
    if (id === 'offset') {
      setShowOffsetInput(true);
    } else {
      setShowOffsetInput(false);
    }
  };

  const handleOffsetApply = (value: number) => {
    const ap = activePath ? paths.find(p => p.id === activePath) : null;
    if (!ap) return;
    // Dynamic import to avoid circular deps
    import('@/lib/penTool/geometry').then(({ offsetPath }) => {
      pushHistory();
      const newPath = offsetPath(ap, value);
      addPath(newPath);
    });
    setShowOffsetInput(false);
    setEditSubTool('move');
  };

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 rounded-lg border border-border bg-background p-1">
      {tools.map(({ id, label, Icon }) => (
        <div key={id} className="relative">
          <button
            title={label}
            onClick={() => handleToolClick(id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              editSubTool === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon />
          </button>
          {id === 'offset' && showOffsetInput && editSubTool === 'offset' && (
            <OffsetInput onApply={handleOffsetApply} />
          )}
        </div>
      ))}
    </div>
  );
});

PenEditToolbar.displayName = 'PenEditToolbar';

export default PenEditToolbar;
