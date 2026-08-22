import { useCallback } from 'react';
import { X, Plus, Minus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSvgAnimationStore, type PathAnimationProperty, type PathLengthProperty, type AnimationKeyframe } from '@/stores/svgAnimationStore';

interface SvgAnimationPropertiesPanelProps {
  onClose: () => void;
}

// Reusable property row with slider, initial value, and keyframe list
function PropertySection({
  label,
  property,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  property: PathAnimationProperty;
  onChange: (updated: PathAnimationProperty) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const toggle = () => onChange({ ...property, enabled: !property.enabled });

  const addKeyframe = () => {
    const lastTime = property.keyframes.length > 0 ? property.keyframes[property.keyframes.length - 1].time : 0;
    const newTime = Math.min(lastTime + 0.25, 1);
    onChange({ ...property, keyframes: [...property.keyframes, { time: newTime, value: property.initial }] });
  };

  const removeKeyframe = (idx: number) => {
    onChange({ ...property, keyframes: property.keyframes.filter((_, i) => i !== idx) });
  };

  const updateKeyframe = (idx: number, field: 'time' | 'value', val: number) => {
    const kfs = [...property.keyframes];
    kfs[idx] = { ...kfs[idx], [field]: val };
    onChange({ ...property, keyframes: kfs });
  };

  return (
    <Collapsible defaultOpen={property.enabled}>
      <div className="flex items-center justify-between py-1">
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium hover:text-foreground text-muted-foreground">
          <ChevronDown className="w-3 h-3" />
          {label}
        </CollapsibleTrigger>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={toggle}>
          {property.enabled ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>
      <CollapsibleContent>
        {property.enabled && (
          <div className="space-y-2 pl-4 pb-2">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-12 shrink-0">Initial</Label>
              <Slider
                value={[property.initial]}
                onValueChange={([v]) => onChange({ ...property, initial: v })}
                min={min}
                max={max}
                step={step}
                className="flex-1"
              />
              <span className="text-[10px] tabular-nums w-8 text-right">{property.initial.toFixed(2)}</span>
            </div>

            {/* Keyframes */}
            <div className="space-y-1">
              {property.keyframes.map((kf, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-4">{idx + 1}</span>
                  <Input
                    type="number"
                    className="h-6 text-[10px] w-14 px-1"
                    value={kf.time}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(e) => updateKeyframe(idx, 'time', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    className="h-6 text-[10px] w-14 px-1"
                    value={kf.value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(e) => updateKeyframe(idx, 'value', parseFloat(e.target.value) || 0)}
                  />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeKeyframe(idx)}>
                    <Minus className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1 gap-1" onClick={addKeyframe}>
                <Plus className="w-2.5 h-2.5" /> Keyframe
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Path Length has extra direction controls
function PathLengthSection({
  property,
  onChange,
}: {
  property: PathLengthProperty;
  onChange: (updated: PathLengthProperty) => void;
}) {
  return (
    <div>
      <PropertySection
        label="Path Length"
        property={property}
        onChange={(p) => onChange({ ...property, ...p })}
      />
      {property.enabled && (
        <div className="flex items-center gap-1 pl-4 pb-2">
          {(['start', 'end', 'custom'] as const).map((dir) => (
            <Button
              key={dir}
              variant={property.direction === dir ? 'default' : 'outline'}
              size="sm"
              className="h-5 text-[10px] px-2"
              onClick={() => onChange({ ...property, direction: dir })}
            >
              {dir.charAt(0).toUpperCase() + dir.slice(1)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SvgAnimationPropertiesPanel({ onClose }: SvgAnimationPropertiesPanelProps) {
  const { activeAnimationId, animationConfigs, updatePathProperty, updateTransition, selectedPathIndex, setSelectedPathIndex } = useSvgAnimationStore();
  const config = activeAnimationId ? animationConfigs.get(activeAnimationId) : null;

  const handleUpdatePath = useCallback(
    (pathIndex: number, property: string, value: any) => {
      if (!activeAnimationId) return;
      updatePathProperty(activeAnimationId, pathIndex, property, value);
    },
    [activeAnimationId, updatePathProperty],
  );

  const handleUpdateTransition = useCallback(
    (key: string, value: any) => {
      if (!activeAnimationId) return;
      updateTransition(activeAnimationId, key, value);
    },
    [activeAnimationId, updateTransition],
  );

  if (!config) return null;

  return (
    <div className="fixed left-[60px] top-0 bottom-0 z-[80] flex items-center pointer-events-none">
    <div className="w-[260px] bg-background border border-border rounded-lg animate-slide-in-left overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold">Animation Properties</span>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="p-3 space-y-3">
          {/* Per-path sections */}
          {config.paths.map((pathConfig, idx) => (
            <Collapsible key={idx} defaultOpen={idx === 0} open={selectedPathIndex === idx ? true : undefined}>
              <CollapsibleTrigger 
                className={`flex items-center gap-1 text-xs font-medium w-full py-1 hover:text-foreground border-b border-border/50 pb-1 ${selectedPathIndex === idx ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setSelectedPathIndex(selectedPathIndex === idx ? null : idx)}
              >
                <ChevronDown className="w-3 h-3" />
                Path {idx + 1} {selectedPathIndex === idx && <span className="ml-auto text-[10px] text-primary">●</span>}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 space-y-1">
                <PathLengthSection
                  property={pathConfig.pathLength}
                  onChange={(v) => handleUpdatePath(idx, 'pathLength', v)}
                />
                <PropertySection
                  label="Opacity"
                  property={pathConfig.opacity}
                  onChange={(v) => handleUpdatePath(idx, 'opacity', v)}
                />
                <PropertySection
                  label="Scale"
                  property={pathConfig.scale}
                  onChange={(v) => handleUpdatePath(idx, 'scale', v)}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <PropertySection
                  label="Scale X"
                  property={pathConfig.scaleX}
                  onChange={(v) => handleUpdatePath(idx, 'scaleX', v)}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <PropertySection
                  label="Scale Y"
                  property={pathConfig.scaleY}
                  onChange={(v) => handleUpdatePath(idx, 'scaleY', v)}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <PropertySection
                  label="Rotate"
                  property={pathConfig.rotate}
                  onChange={(v) => handleUpdatePath(idx, 'rotate', v)}
                  min={-360}
                  max={360}
                  step={1}
                />
                <PropertySection
                  label="X Position"
                  property={pathConfig.x}
                  onChange={(v) => handleUpdatePath(idx, 'x', v)}
                  min={-200}
                  max={200}
                  step={1}
                />
                <PropertySection
                  label="Y Position"
                  property={pathConfig.y}
                  onChange={(v) => handleUpdatePath(idx, 'y', v)}
                  min={-200}
                  max={200}
                  step={1}
                />
                <PropertySection
                  label="Stroke Width"
                  property={pathConfig.strokeWidth}
                  onChange={(v) => handleUpdatePath(idx, 'strokeWidth', v)}
                  min={0}
                  max={20}
                  step={0.5}
                />
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Transition settings */}
          <div className="border-t border-border pt-3 space-y-3">
            <span className="text-xs font-semibold">Transition</span>

            {/* Type */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14 shrink-0">Type</Label>
              <Select value={config.transitionType} onValueChange={(v) => handleUpdateTransition('transitionType', v)}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tween">Tween</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14 shrink-0">Duration</Label>
              <Slider
                value={[config.duration]}
                onValueChange={([v]) => handleUpdateTransition('duration', v)}
                min={0.1}
                max={5}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                className="h-6 text-[10px] w-12 px-1"
                value={config.duration}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(e) => handleUpdateTransition('duration', parseFloat(e.target.value) || 0.7)}
              />
            </div>

            {/* Easing */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14 shrink-0">Easing</Label>
              <Select value={config.easing} onValueChange={(v) => handleUpdateTransition('easing', v)}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="easeIn">Ease In</SelectItem>
                  <SelectItem value="easeOut">Ease Out</SelectItem>
                  <SelectItem value="easeInOut">Ease In-Out</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="elastic">Elastic</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delay */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14 shrink-0">Delay</Label>
              <Slider
                value={[config.delay]}
                onValueChange={([v]) => handleUpdateTransition('delay', v)}
                min={0}
                max={5}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                className="h-6 text-[10px] w-12 px-1"
                value={config.delay}
                min={0}
                max={5}
                step={0.1}
                onChange={(e) => handleUpdateTransition('delay', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Repeat */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14 shrink-0">Repeat</Label>
              <Input
                type="number"
                className="h-6 text-[10px] w-16 px-1"
                value={config.repeat}
                min={-1}
                max={100}
                step={1}
                onChange={(e) => handleUpdateTransition('repeat', parseInt(e.target.value) || 0)}
              />
              <span className="text-[10px] text-muted-foreground">-1 = ∞</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
    </div>
  );
}
