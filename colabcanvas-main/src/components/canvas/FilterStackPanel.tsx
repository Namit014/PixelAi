import { useRef, useCallback } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { AppliedFilter, CanvasFilter } from '@/lib/filters/types';
import { getFilter } from '@/lib/filters/FilterRegistry';

interface FilterStackPanelProps {
  stack: AppliedFilter[];
  onUpdateParam: (instanceId: string, paramKey: string, value: number | number[] | boolean | string) => void;
  onRemoveFilter: (instanceId: string) => void;
  onReorderFilter?: (fromIndex: number, toIndex: number) => void;
}

export function FilterStackPanel({ stack, onUpdateParam, onRemoveFilter }: FilterStackPanelProps) {
  // Store slider values in ref during drag for 60fps performance
  const dragValuesRef = useRef<Record<string, number>>({});

  const handleSliderChange = useCallback((instanceId: string, paramKey: string, values: number[]) => {
    const key = `${instanceId}_${paramKey}`;
    dragValuesRef.current[key] = values[0];
    // Commit on every change — React batching + rAF in engine handles throttling
    onUpdateParam(instanceId, paramKey, values[0]);
  }, [onUpdateParam]);

  if (stack.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        No effects applied. Click an effect to add it.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      <div className="text-[11px] font-medium text-foreground/70 px-1 mb-1">Applied Effects</div>
      {stack.map((applied) => {
        const filterDef = getFilter(applied.filterId);
        if (!filterDef) return null;

        return (
          <FilterItem
            key={applied.instanceId}
            applied={applied}
            filterDef={filterDef}
            onSliderChange={handleSliderChange}
            onRemove={onRemoveFilter}
          />
        );
      })}
    </div>
  );
}

function FilterItem({
  applied,
  filterDef,
  onSliderChange,
  onRemove,
}: {
  applied: AppliedFilter;
  filterDef: CanvasFilter;
  onSliderChange: (id: string, key: string, values: number[]) => void;
  onRemove: (id: string) => void;
}) {
  const sliderParams = Object.entries(filterDef.params).filter(
    ([, p]) => p.type === 'float' || p.type === 'int'
  );

  return (
    <div className="bg-card/50 border border-border/30 rounded-lg p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab" />
          <span className="text-xs font-medium text-foreground">{filterDef.name}</span>
        </div>
        <button
          onClick={() => onRemove(applied.instanceId)}
          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {sliderParams.map(([key, param]) => {
        const currentValue = (applied.params[key] as number) ?? (param.value as number);
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{param.label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {typeof currentValue === 'number' ? currentValue.toFixed(param.step && param.step < 1 ? 2 : 0) : currentValue}
              </span>
            </div>
            <Slider
              value={[currentValue]}
              min={param.min ?? 0}
              max={param.max ?? 1}
              step={param.step ?? 0.01}
              onValueChange={(vals) => onSliderChange(applied.instanceId, key, vals)}
              className="h-4"
            />
          </div>
        );
      })}
    </div>
  );
}
