import React, { memo, useState, useCallback } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

// ── PanelSection ────────────────────────────────────────────────────

interface PanelSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export const PanelSection = memo(function PanelSection({ title, children, collapsible = true, defaultOpen = true, className }: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-border py-3", className)}>
      <button
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className="w-full flex items-center justify-between px-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">

        {title}
        {collapsible &&
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")} />
        }
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[2000px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
        )}>

        <div className="space-y-3">{children}</div>
      </div>
    </div>);

});

// ── PanelToggleGroup ────────────────────────────────────────────────

interface ToggleOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface PanelToggleGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export const PanelToggleGroup = memo(function PanelToggleGroup<T extends string>({
  options,
  value,
  onChange,
  className
}: PanelToggleGroupProps<T>) {
  return (
    <div className={cn("flex h-7 rounded-md border border-border overflow-hidden", className)}>
      {options.map((opt) =>
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn("flex-1 text-[9px] font-medium transition-colors rounded-lg flex items-center justify-center px-[9px]",

        value === opt.value ?
        "bg-foreground text-background" :
        "bg-muted/30 text-muted-foreground hover:text-foreground"
        )}>

          {opt.label}
        </button>
      )}
    </div>);

}) as <T extends string>(props: PanelToggleGroupProps<T>) => React.ReactElement;

// ── StepperInput ────────────────────────────────────────────────────

interface StepperInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export const StepperInput = memo(function StepperInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix
}: StepperInputProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-6 shrink-0">{label}</span>
      <div className="flex items-center h-7 rounded-md border border-border bg-muted/30 overflow-hidden flex-1">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          className="h-full px-1.5 hover:bg-muted transition-colors">

          <Minus className="h-2.5 w-2.5" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          className="flex-1 h-full text-center text-[10px] bg-transparent border-0 outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />

        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          className="h-full px-1.5 hover:bg-muted transition-colors">

          <Plus className="h-2.5 w-2.5" />
        </button>
      </div>
      {suffix && <span className="text-[9px] text-muted-foreground">{suffix}</span>}
    </div>);

});

// ── CardSelector ────────────────────────────────────────────────────

interface CardSelectorProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
  title?: string;
}

export const CardSelector = memo(function CardSelector({ active, onClick, children, label, title }: CardSelectorProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-all",
        active ?
        "border-foreground ring-1 ring-foreground bg-foreground/5" :
        "border-border hover:border-foreground/40 bg-muted/20"
      )}>

      {children}
      {label && <span className="text-muted-foreground font-medium text-xs">{label}</span>}
    </button>);

});

// ── ColorField ──────────────────────────────────────────────────────

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export const ColorField = memo(function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] text-muted-foreground truncate w-full text-center">{label}</span>
      <div className="relative w-7 h-7 rounded-full border border-border overflow-hidden cursor-pointer shrink-0 hover:ring-2 hover:ring-foreground/20 transition-all">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />

        <div className="w-full h-full rounded-full" style={{ backgroundColor: value }} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 text-[8px] px-1 bg-muted/30 border-0 rounded font-mono text-center w-full text-foreground outline-none" />

    </div>);

});

// ── ColorPickerInline ───────────────────────────────────────────────

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ColorPickerComponent } from '@/components/canvas/ColorPickerComponent';

interface ColorPickerInlineProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const ColorPickerInline = memo(function ColorPickerInline({ label, value, onChange, placeholder }: ColorPickerInlineProps) {
  const displayColor = value || 'transparent';
  const isTransparent = !value || value === 'transparent';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-8 shrink-0">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 h-6 flex-1 rounded bg-muted/30 px-1.5 hover:bg-muted/50 transition-colors cursor-pointer">
            <div
              className={cn("w-4 h-4 rounded-[3px] border border-border shrink-0", isTransparent && "bg-[repeating-conic-gradient(#e5e5e5_0%_25%,white_0%_50%)] bg-[length:8px_8px]")}
              style={!isTransparent ? { backgroundColor: displayColor } : undefined}
            />
            <span className="text-[9px] font-mono text-muted-foreground truncate">
              {value || placeholder || 'none'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="left" align="start" className="w-auto p-0 border-border" sideOffset={8}>
          <ColorPickerComponent color={value || '#ffffff'} onChange={onChange} showOpacity={true} />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Clear"
        >
          ×
        </button>
      )}
    </div>
  );
});

// ── SliderControl ───────────────────────────────────────────────────

interface SliderControlProps {
  icon?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}

export const SliderControl = memo(function SliderControl({ icon, value, onChange, min = 0, max = 100, step = 1, suffix, className }: SliderControlProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1" />

      <span className="text-[9px] text-muted-foreground w-8 text-right tabular-nums">
        {value}{suffix}
      </span>
    </div>);

});

// ── AlignmentGrid ───────────────────────────────────────────────────

interface AlignmentGridProps {
  alignSelf?: string;
  justifySelf?: string;
  onChange: (patch: {alignSelf?: string;justifySelf?: string;}) => void;
}

export const AlignmentGrid = memo(function AlignmentGrid({ alignSelf, justifySelf, onChange }: AlignmentGridProps) {
  const positions = [
  { as: 'flex-start', js: 'flex-start' }, { as: 'flex-start', js: 'center' }, { as: 'flex-start', js: 'flex-end' },
  { as: 'center', js: 'flex-start' }, { as: 'center', js: 'center' }, { as: 'center', js: 'flex-end' },
  { as: 'flex-end', js: 'flex-start' }, { as: 'flex-end', js: 'center' }, { as: 'flex-end', js: 'flex-end' }];

  return (
    <div className="grid grid-cols-3 gap-0.5 w-14 h-14 p-1.5 rounded-lg border border-border bg-muted/30">
      {positions.map((pos, i) =>
      <button
        key={i}
        onClick={() => onChange({ alignSelf: pos.as, justifySelf: pos.js })}
        className={cn(
          "w-3.5 h-3.5 rounded-[2px] transition-colors",
          alignSelf === pos.as && justifySelf === pos.js ?
          "bg-foreground" :
          "bg-muted-foreground/20 hover:bg-muted-foreground/40"
        )} />

      )}
    </div>);

});