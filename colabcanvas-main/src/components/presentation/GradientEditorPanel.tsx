import React, { useState, useCallback, useMemo } from 'react';
import type { BackgroundGradientConfig, GradientStop } from '@/types/presentation';
import { ColorPickerInline, SliderControl } from './panel-primitives';
import { Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADIENT_PRESETS } from '@/components/canvas/GradientPresetsData';

const makeId = () => Math.random().toString(36).slice(2, 8);

const DEFAULT_CONFIG: BackgroundGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { id: makeId(), color: '#667eea', position: 0 },
    { id: makeId(), color: '#764ba2', position: 100 },
  ],
};

function configToCss(cfg: BackgroundGradientConfig): string {
  const sorted = [...cfg.stops].sort((a, b) => a.position - b.position);
  const stopStr = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');
  return cfg.type === 'radial'
    ? `radial-gradient(circle, ${stopStr})`
    : `linear-gradient(${cfg.angle}deg, ${stopStr})`;
}

interface Props {
  config: BackgroundGradientConfig | undefined;
  onChange: (config: BackgroundGradientConfig, cssValue: string) => void;
}

export function GradientEditorPanel({ config, onChange }: Props) {
  const cfg = config || DEFAULT_CONFIG;

  const emit = useCallback(
    (patch: Partial<BackgroundGradientConfig>) => {
      const next = { ...cfg, ...patch };
      onChange(next, configToCss(next));
    },
    [cfg, onChange]
  );

  const updateStop = useCallback(
    (id: string, patch: Partial<GradientStop>) => {
      const stops = cfg.stops.map((s) => (s.id === id ? { ...s, ...patch } : s));
      emit({ stops });
    },
    [cfg, emit]
  );

  const addStop = useCallback(() => {
    const pos = cfg.stops.length > 0 ? Math.round(cfg.stops[cfg.stops.length - 1].position / 2 + 25) : 50;
    emit({ stops: [...cfg.stops, { id: makeId(), color: '#ffffff', position: Math.min(pos, 100) }] });
  }, [cfg, emit]);

  const removeStop = useCallback(
    (id: string) => {
      if (cfg.stops.length <= 2) return;
      emit({ stops: cfg.stops.filter((s) => s.id !== id) });
    },
    [cfg, emit]
  );

  const cssValue = useMemo(() => configToCss(cfg), [cfg]);

  return (
    <div className="space-y-2">
      {/* Preview */}
      <div
        className="w-full h-16 rounded-lg border border-border"
        style={{ background: cssValue }}
      />

      {/* Type toggle */}
      <div className="flex gap-1">
        {(['linear', 'radial'] as const).map((t) => (
          <button
            key={t}
            onClick={() => emit({ type: t })}
            className={cn(
              'flex-1 h-6 rounded text-[9px] font-medium border transition-colors',
              cfg.type === t
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            {t === 'linear' ? 'Linear' : 'Radial'}
          </button>
        ))}
      </div>

      {/* Angle (linear only) */}
      {cfg.type === 'linear' && (
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground">Angle</span>
          <SliderControl
            value={cfg.angle}
            onChange={(v) => emit({ angle: v })}
            min={0}
            max={360}
            step={1}
            suffix="°"
          />
        </div>
      )}

      {/* Stops */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground font-medium">Color Stops</span>
          <button onClick={addStop} className="h-5 w-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Stop bar */}
        <div className="relative w-full h-4 rounded-full border border-border" style={{ background: cssValue }}>
          {cfg.stops.map((stop) => (
            <div
              key={stop.id}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background shadow cursor-grab"
              style={{
                left: `${stop.position}%`,
                backgroundColor: stop.color,
                transform: `translate(-50%, -50%)`,
              }}
              title={`${stop.position}%`}
            />
          ))}
        </div>

        {cfg.stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <ColorPickerInline
              label=""
              value={stop.color}
              onChange={(v) => updateStop(stop.id, { color: v })}
              placeholder="#000"
            />
            <SliderControl
              value={stop.position}
              onChange={(v) => updateStop(stop.id, { position: v })}
              min={0}
              max={100}
              step={1}
              suffix="%"
            />
            {cfg.stops.length > 2 && (
              <button
                onClick={() => removeStop(stop.id)}
                className="h-4 w-4 rounded hover:bg-destructive/20 flex items-center justify-center shrink-0"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Presets */}
      <div>
        <span className="text-[9px] text-muted-foreground font-medium mb-1 block">Presets</span>
        <div className="grid grid-cols-6 gap-1">
          {GRADIENT_PRESETS.map((preset) => {
            const stops: GradientStop[] = preset.stops.map((s, i) => ({
              id: makeId(),
              color: s.color,
              position: s.offset * 100,
            }));
            const presetCfg: BackgroundGradientConfig = {
              type: preset.type,
              angle: preset.angle ?? 135,
              stops,
            };
            return (
              <button
                key={preset.name}
                onClick={() => onChange(presetCfg, configToCss(presetCfg))}
                className="w-full aspect-square rounded-md border border-border hover:ring-1 hover:ring-foreground/30 transition-all"
                style={{
                  background:
                    preset.type === 'radial'
                      ? `radial-gradient(circle, ${preset.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`
                      : `linear-gradient(${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`,
                }}
                title={preset.name}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
