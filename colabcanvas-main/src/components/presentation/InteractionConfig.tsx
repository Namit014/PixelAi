import React from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import { PanelSection, PanelToggleGroup, StepperInput, ColorPickerInline, SliderControl } from './panel-primitives';
import { MousePointer2, Hand, ScrollText, Eye } from 'lucide-react';
import type { BlockStyle } from '@/types/presentation';

export function InteractionConfig({ blockId, slideId }: { blockId: string; slideId: string }) {
  const block = usePresentationStore((s) => {
    const slide = s.slides.find((sl) => sl.id === slideId);
    return slide?.contentBlocks.find((b) => b.id === blockId);
  });
  const updateBlock = usePresentationStore((s) => s.updateBlock);

  if (!block) return null;
  const st = block.style || {};

  const setStyle = (patch: Partial<BlockStyle>) => {
    updateBlock(slideId, blockId, { style: { ...st, ...patch } } as any);
  };

  return (
    <>
      {/* Hover Effects */}
      <PanelSection title="Hover Effects" defaultOpen={false}>
        <SliderControl
          icon={<MousePointer2 className="h-3 w-3" />}
          value={Math.round(((st.hoverScale ?? 1) - 1) * 100)}
          onChange={(v) => setStyle({ hoverScale: 1 + v / 100 })}
          min={-20}
          max={30}
          step={1}
          suffix="%"
        />
        <SliderControl
          icon={<Eye className="h-3 w-3" />}
          value={Math.round((st.hoverOpacity ?? 1) * 100)}
          onChange={(v) => setStyle({ hoverOpacity: v / 100 })}
          min={0}
          max={100}
          step={5}
          suffix="%"
        />
        <ColorPickerInline
          label="Hover color"
          value={st.hoverColor || ''}
          onChange={(v) => setStyle({ hoverColor: v })}
          placeholder="none"
        />
      </PanelSection>

      {/* Entrance Animation (enhanced) */}
      <PanelSection title="Entrance" defaultOpen={false}>
        <PanelToggleGroup
          options={[
            { value: 'none', label: 'None' },
            { value: 'fade-in', label: 'Fade' },
            { value: 'fade-up', label: 'Up' },
            { value: 'slide-in-left', label: '← In' },
            { value: 'slide-in-right', label: 'In →' },
          ]}
          value={st.animation?.effect || 'none'}
          onChange={(v) =>
            setStyle({
              animation: {
                ...(st.animation || { effect: 'none' }),
                effect: v as any,
              },
            })
          }
        />
        <PanelToggleGroup
          options={[
            { value: 'scale-in', label: 'Scale' },
            { value: 'bounce', label: 'Bounce' },
          ]}
          value={
            ['scale-in', 'bounce'].includes(st.animation?.effect || '')
              ? (st.animation?.effect || 'none')
              : ''
          }
          onChange={(v) =>
            setStyle({
              animation: {
                ...(st.animation || { effect: 'none' }),
                effect: v as any,
              },
            })
          }
        />
        {st.animation?.effect && st.animation.effect !== 'none' && (
          <div className="grid grid-cols-2 gap-2">
            <StepperInput
              label="Delay"
              value={st.animation?.delay ?? 0}
              onChange={(v) => setStyle({ animation: { ...st.animation!, delay: v } })}
              min={0}
              max={5000}
              step={50}
              suffix="ms"
            />
            <StepperInput
              label="Duration"
              value={st.animation?.duration ?? 500}
              onChange={(v) => setStyle({ animation: { ...st.animation!, duration: v } })}
              min={50}
              max={3000}
              step={50}
              suffix="ms"
            />
          </div>
        )}
      </PanelSection>

      {/* Quick Presets */}
      <PanelSection title="Animation Presets" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setStyle({ animation: p.animation, hoverScale: p.hoverScale })}
              className="px-2 py-1.5 text-[10px] rounded-lg border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              {p.name}
            </button>
          ))}
        </div>
      </PanelSection>
    </>
  );
}

const PRESETS: {
  name: string;
  animation: BlockStyle['animation'];
  hoverScale?: number;
}[] = [
  { name: 'Subtle Fade', animation: { effect: 'fade-in', delay: 0, duration: 600 } },
  { name: 'Rise Up', animation: { effect: 'fade-up', delay: 100, duration: 500 } },
  { name: 'Slide Left', animation: { effect: 'slide-in-left', delay: 0, duration: 400 } },
  { name: 'Pop In', animation: { effect: 'scale-in', delay: 0, duration: 350 }, hoverScale: 1.02 },
  { name: 'Bounce Entry', animation: { effect: 'bounce', delay: 0, duration: 600 } },
  { name: 'Stagger Card', animation: { effect: 'fade-up', delay: 200, duration: 500 }, hoverScale: 1.03 },
  { name: 'Hero Title', animation: { effect: 'scale-in', delay: 0, duration: 700 } },
  { name: 'Quick Snap', animation: { effect: 'fade-in', delay: 0, duration: 200 } },
];
