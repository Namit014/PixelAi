import React, { useCallback, useMemo } from 'react';
import type { PatternConfig } from '@/types/presentation';
import { ColorPickerInline, SliderControl } from './panel-primitives';
import { cn } from '@/lib/utils';

interface PatternDef {
  id: string;
  name: string;
  svg: (color: string, scale: number) => string;
}

const PATTERNS: PatternDef[] = [
  {
    id: 'dots',
    name: 'Dots',
    svg: (c, s) => {
      const size = Math.round(20 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${size / 2}' cy='${size / 2}' r='${Math.max(1, size / 8)}' fill='${encodeURIComponent(c)}'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'grid',
    name: 'Grid',
    svg: (c, s) => {
      const size = Math.round(24 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    svg: (c, s) => {
      const size = Math.round(16 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 ${size} L ${size} 0' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'cross',
    name: 'Cross',
    svg: (c, s) => {
      const size = Math.round(20 * s);
      const half = size / 2;
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M ${half} 0 V ${size} M 0 ${half} H ${size}' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'waves',
    name: 'Waves',
    svg: (c, s) => {
      const size = Math.round(30 * s);
      const h = size / 2;
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 ${h / 2} Q ${size / 4} 0 ${size / 2} ${h / 2} T ${size} ${h / 2}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    svg: (c, s) => {
      const size = Math.round(20 * s);
      const h = Math.round(10 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 ${h} L ${size / 2} 0 L ${size} ${h}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'hexagons',
    name: 'Hexagons',
    svg: (c, s) => {
      const size = Math.round(28 * s);
      const w = size;
      const h = Math.round(size * 0.866);
      return `url("data:image/svg+xml,%3Csvg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${w / 2},0 ${w},${h / 4} ${w},${(h * 3) / 4} ${w / 2},${h} 0,${(h * 3) / 4} 0,${h / 4}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'triangles',
    name: 'Triangles',
    svg: (c, s) => {
      const size = Math.round(20 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'circles',
    name: 'Circles',
    svg: (c, s) => {
      const size = Math.round(24 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${size / 2}' cy='${size / 2}' r='${size / 3}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'diamonds',
    name: 'Diamonds',
    svg: (c, s) => {
      const size = Math.round(20 * s);
      const h = size / 2;
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='${h},2 ${size - 2},${h} ${h},${size - 2} 2,${h}' fill='none' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'horizontal-lines',
    name: 'H-Lines',
    svg: (c, s) => {
      const size = Math.round(12 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='${size / 2}' x2='${size}' y2='${size / 2}' stroke='${encodeURIComponent(c)}' stroke-width='1'/%3E%3C/svg%3E")`;
    },
  },
  {
    id: 'confetti',
    name: 'Confetti',
    svg: (c, s) => {
      const size = Math.round(30 * s);
      return `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='${size / 4}' y='${size / 6}' width='3' height='3' fill='${encodeURIComponent(c)}' transform='rotate(45 ${size / 4} ${size / 6})'/%3E%3Crect x='${(size * 3) / 4}' y='${(size * 2) / 3}' width='3' height='3' fill='${encodeURIComponent(c)}' transform='rotate(20 ${(size * 3) / 4} ${(size * 2) / 3})'/%3E%3C/svg%3E")`;
    },
  },
];

const DEFAULT_CONFIG: PatternConfig = {
  patternId: 'dots',
  color: 'rgba(255,255,255,0.15)',
  scale: 1,
  opacity: 1,
};

interface Props {
  config: PatternConfig | undefined;
  onChange: (config: PatternConfig, cssValue: string) => void;
}

function patternToCss(cfg: PatternConfig): string {
  const pat = PATTERNS.find((p) => p.id === cfg.patternId) || PATTERNS[0];
  return pat.svg(cfg.color, cfg.scale);
}

export function PatternPicker({ config, onChange }: Props) {
  const cfg = config || DEFAULT_CONFIG;

  const emit = useCallback(
    (patch: Partial<PatternConfig>) => {
      const next = { ...cfg, ...patch };
      onChange(next, patternToCss(next));
    },
    [cfg, onChange]
  );

  const cssValue = useMemo(() => patternToCss(cfg), [cfg]);

  return (
    <div className="space-y-2">
      {/* Preview */}
      <div
        className="w-full h-16 rounded-lg border border-border bg-muted/50"
        style={{ backgroundImage: cssValue, opacity: cfg.opacity }}
      />

      {/* Pattern grid */}
      <div className="grid grid-cols-6 gap-1">
        {PATTERNS.map((pat) => (
          <button
            key={pat.id}
            onClick={() => emit({ patternId: pat.id })}
            className={cn(
              'aspect-square rounded-md border transition-all overflow-hidden',
              cfg.patternId === pat.id
                ? 'border-foreground ring-1 ring-foreground/30'
                : 'border-border hover:border-muted-foreground'
            )}
            style={{
              backgroundImage: pat.svg(cfg.patternId === pat.id ? 'currentColor' : 'rgba(150,150,150,0.5)', 1),
              backgroundColor: 'hsl(var(--muted))',
            }}
            title={pat.name}
          />
        ))}
      </div>

      {/* Controls */}
      <ColorPickerInline
        label="Color"
        value={cfg.color}
        onChange={(v) => emit({ color: v })}
        placeholder="rgba(255,255,255,0.2)"
      />
      <div className="space-y-0.5">
        <span className="text-[9px] text-muted-foreground">Scale</span>
        <SliderControl
          value={Math.round(cfg.scale * 100)}
          onChange={(v) => emit({ scale: v / 100 })}
          min={30}
          max={300}
          step={10}
          suffix="%"
        />
      </div>
      <div className="space-y-0.5">
        <span className="text-[9px] text-muted-foreground">Opacity</span>
        <SliderControl
          value={Math.round(cfg.opacity * 100)}
          onChange={(v) => emit({ opacity: v / 100 })}
          min={5}
          max={100}
          step={5}
          suffix="%"
        />
      </div>
    </div>
  );
}

export { patternToCss };
