import { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Minus, Plus, Pen, Waves, Paintbrush } from 'lucide-react';
import type { StrokeConfig, StrokeType, StrokeStyle, JoinType, CapType } from '@/lib/strokeEngine/types';
import { PRESET_WIDTH_PROFILES, BRUSH_PRESETS, createDefaultStrokeConfig } from '@/lib/strokeEngine/types';

interface StrokePanelProps {
  config: StrokeConfig;
  onChange: (config: StrokeConfig) => void;
  onDragStart?: () => void;
}

export function StrokePanel({ config, onChange, onDragStart }: StrokePanelProps) {
  const [editingProfile, setEditingProfile] = useState(false);

  const update = useCallback((partial: Partial<StrokeConfig>) => {
    onChange({ ...config, ...partial });
  }, [config, onChange]);

  const handleSliderStart = useCallback(() => {
    onDragStart?.();
  }, [onDragStart]);

  return (
    <div className="w-full space-y-3">
      {/* Type Tabs */}
      <Tabs
        value={config.type}
        onValueChange={(v) => update({ type: v as StrokeType })}
      >
        <TabsList className="w-full bg-zinc-100 rounded-lg p-0.5">
          <TabsTrigger value="basic" className="flex-1 text-xs gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            <Pen className="w-3 h-3" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="dynamic" className="flex-1 text-xs gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            <Waves className="w-3 h-3" />
            Dynamic
          </TabsTrigger>
          <TabsTrigger value="brush" className="flex-1 text-xs gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">
            <Paintbrush className="w-3 h-3" />
            Brush
          </TabsTrigger>
        </TabsList>

        {/* ── Basic Tab ── */}
        <TabsContent value="basic" className="space-y-3 mt-3">
          {/* Style */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Style</label>
            <Select
              value={config.style}
              onValueChange={(v) => update({ style: v as StrokeStyle })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>Solid</span>
                  </div>
                </SelectItem>
                <SelectItem value="dash">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3"/></svg>
                    <span>Dash</span>
                  </div>
                </SelectItem>
                <SelectItem value="dotted">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/></svg>
                    <span>Dotted</span>
                  </div>
                </SelectItem>
                <SelectItem value="dash-dot">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3 2 3"/></svg>
                    <span>Dash Dot</span>
                  </div>
                </SelectItem>
                <SelectItem value="long-dash">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="12 4"/></svg>
                    <span>Long Dash</span>
                  </div>
                </SelectItem>
                <SelectItem value="dash-dot-dot">
                  <div className="flex items-center gap-2">
                    <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="6 2 2 2 2 2"/></svg>
                    <span>Dash Dot Dot</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Width Profile */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Width Profile</label>
            <Select
              value={config.widthProfile?.id || 'flat'}
              onValueChange={(v) => {
                if (v === 'custom-edit') {
                  setEditingProfile(true);
                  return;
                }
                const preset = PRESET_WIDTH_PROFILES.find(p => p.id === v);
                update({
                  widthProfile: preset && preset.id !== 'flat' ? preset : undefined,
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_WIDTH_PROFILES.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <WidthProfilePreview profile={p} />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom-edit">
                  <span className="text-blue-600">Edit width profile…</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Join & Cap */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Join</label>
              <Select
                value={config.join}
                onValueChange={(v) => update({ join: v as JoinType })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miter">Miter</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="bevel">Bevel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Cap</label>
              <Select
                value={config.cap}
                onValueChange={(v) => update({ cap: v as CapType })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="butt">Butt</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Miter Angle (only for miter join) */}
          {config.join === 'miter' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Miter Angle</span>
                <span>{config.miterAngle.toFixed(1)}°</span>
              </div>
              <Slider
                value={[config.miterAngle]}
                onValueChange={([v]) => update({ miterAngle: v })}
                onPointerDown={handleSliderStart}
                min={1}
                max={90}
                step={0.5}
              />
            </div>
          )}
        </TabsContent>

        {/* ── Dynamic Tab ── */}
        <TabsContent value="dynamic" className="space-y-3 mt-3">
          <DynamicControls
            frequency={config.dynamicMeta?.frequency ?? 5}
            wiggle={config.dynamicMeta?.wiggle ?? 3}
            smoothen={config.dynamicMeta?.smoothen ?? 2}
            onChange={(dm) => update({ dynamicMeta: dm })}
            onDragStart={handleSliderStart}
          />
        </TabsContent>

        {/* ── Brush Tab ── */}
        <TabsContent value="brush" className="space-y-3 mt-3">
          <BrushControls
            brushId={config.brushMeta?.brushId ?? 'marker'}
            direction={config.brushMeta?.direction ?? 'forward'}
            onChange={(bm) => update({ brushMeta: bm })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function WidthProfilePreview({ profile }: { profile: { stops: { t: number; width: number }[] } }) {
  const w = 40, h = 14;
  const points = profile.stops.map(s => `${s.t * w},${h / 2 - (s.width * h / 2 * 0.8)}`);
  const pointsBottom = [...profile.stops].reverse().map(s => `${s.t * w},${h / 2 + (s.width * h / 2 * 0.8)}`);
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polygon
        points={[...points, ...pointsBottom].join(' ')}
        fill="currentColor"
        opacity={0.6}
      />
    </svg>
  );
}

function DynamicControls({
  frequency, wiggle, smoothen, onChange, onDragStart
}: {
  frequency: number;
  wiggle: number;
  smoothen: number;
  onChange: (meta: { frequency: number; wiggle: number; smoothen: number }) => void;
  onDragStart?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Frequency</span>
          <span>{frequency.toFixed(1)}</span>
        </div>
        <Slider
          value={[frequency]}
          onValueChange={([v]) => onChange({ frequency: v, wiggle, smoothen })}
          onPointerDown={onDragStart}
          min={0.5}
          max={20}
          step={0.5}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Wiggle</span>
          <span>{wiggle.toFixed(1)}px</span>
        </div>
        <Slider
          value={[wiggle]}
          onValueChange={([v]) => onChange({ frequency, wiggle: v, smoothen })}
          onPointerDown={onDragStart}
          min={0}
          max={50}
          step={0.5}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Smoothen</span>
          <span>{smoothen}</span>
        </div>
        <Slider
          value={[smoothen]}
          onValueChange={([v]) => onChange({ frequency, wiggle, smoothen: v })}
          onPointerDown={onDragStart}
          min={0}
          max={10}
          step={1}
        />
      </div>
    </div>
  );
}

function BrushControls({
  brushId, direction, onChange
}: {
  brushId: string;
  direction: 'forward' | 'reverse';
  onChange: (meta: { brushId: string; direction: 'forward' | 'reverse' }) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Brush Grid */}
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Brush</label>
        <div className="grid grid-cols-2 gap-1.5">
          {BRUSH_PRESETS.map(brush => (
            <button
              key={brush.id}
              onClick={() => onChange({ brushId: brush.id, direction })}
              className={`h-10 rounded-lg border text-xs font-medium transition-all ${
                brushId === brush.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
              }`}
            >
              {brush.name}
            </button>
          ))}
        </div>
      </div>

      {/* Direction */}
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Direction</label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ brushId, direction: 'forward' })}
            className={`flex-1 h-8 rounded-lg border text-xs font-medium transition-all ${
              direction === 'forward'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
            }`}
          >
            Forward →
          </button>
          <button
            onClick={() => onChange({ brushId, direction: 'reverse' })}
            className={`flex-1 h-8 rounded-lg border text-xs font-medium transition-all ${
              direction === 'reverse'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
            }`}
          >
            ← Reverse
          </button>
        </div>
      </div>
    </div>
  );
}
