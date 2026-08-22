import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { DesignTokens } from '@/types/presentation';
import {
  BarChart3, TrendingUp, PieChart, ScatterChart,
  Minus, ChevronDown, Layers, AreaChart,
} from 'lucide-react';

interface ChartEditorProps {
  chartType: string;
  data: { label: string; value: number; name?: string }[];
  title?: string;
  tokens: DesignTokens;
  onChange: (updates: { chartType?: string; data?: any[]; title?: string; options?: any }) => void;
  onClose: () => void;
}

const CHART_TYPES = [
  { id: 'bar', label: 'Column', icon: BarChart3 },
  { id: 'stacked-bar', label: 'Stacked', icon: Layers },
  { id: 'horizontal-bar', label: 'Bar', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: TrendingUp },
  { id: 'area', label: 'Area', icon: AreaChart },
  { id: 'pie', label: 'Pie', icon: PieChart },
  { id: 'donut', label: 'Donut', icon: PieChart },
  { id: 'scatter', label: 'Scatter', icon: ScatterChart },
  { id: 'funnel', label: 'Funnel', icon: ChevronDown },
  { id: 'combo', label: 'Combo', icon: TrendingUp },
  { id: 'radar', label: 'Radar', icon: ScatterChart },
  { id: 'waterfall', label: 'Waterfall', icon: Minus },
];

const TABS = ['Graph', 'Axes', 'Visuals', 'Data'] as const;

const COLOR_PRESETS = [
  ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'],
  ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'],
];

export function ChartEditor({ chartType, data, title, tokens, onChange, onClose }: ChartEditorProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Graph');
  const [options, setOptions] = useState({
    showPoints: true,
    smoothLines: true,
    showDataLabels: false,
    showLegend: true,
    showGrid: true,
    xAxisVisible: true,
    yAxisVisible: true,
    colorPresetIdx: 0,
  });

  const updateOption = useCallback((key: string, val: any) => {
    const next = { ...options, [key]: val };
    setOptions(next);
    onChange({ options: next });
  }, [options, onChange]);

  const updateData = useCallback((idx: number, field: 'label' | 'value', val: string) => {
    const next = [...data];
    if (field === 'value') {
      next[idx] = { ...next[idx], [field]: parseFloat(val) || 0 };
    } else {
      next[idx] = { ...next[idx], [field]: val, name: val };
    }
    onChange({ data: next });
  }, [data, onChange]);

  const addRow = useCallback(() => {
    onChange({ data: [...data, { label: `Item ${data.length + 1}`, value: 0, name: `Item ${data.length + 1}` }] });
  }, [data, onChange]);

  const removeRow = useCallback((idx: number) => {
    if (data.length <= 1) return;
    onChange({ data: data.filter((_, i) => i !== idx) });
  }, [data, onChange]);

  return (
    <div
      className="flex flex-col gap-0 rounded-xl overflow-hidden border border-border"
      style={{ backgroundColor: tokens.backgroundColor, color: tokens.textColor, minWidth: 320 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Chart Type Grid */}
      <div className="p-3 border-b border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Chart Type</div>
        <div className="grid grid-cols-6 gap-1">
          {CHART_TYPES.map(ct => {
            const Icon = ct.icon;
            return (
              <button
                key={ct.id}
                onClick={() => onChange({ chartType: ct.id })}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[9px] transition-all",
                  chartType === ct.id
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate w-full text-center">{ct.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 text-[10px] py-2 font-medium transition-colors",
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 max-h-[300px] overflow-y-auto">
        {activeTab === 'Graph' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-medium">Title</label>
              <input
                className="w-full text-xs bg-muted/50 rounded-lg px-2.5 py-1.5 outline-none border border-transparent focus:border-primary/30"
                value={title || ''}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="Chart title..."
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
            {['line', 'area', 'scatter', 'combo'].includes(chartType) && (
              <ToggleOption label="Show points" checked={options.showPoints} onChange={v => updateOption('showPoints', v)} />
            )}
            {['line', 'area'].includes(chartType) && (
              <ToggleOption label="Smooth lines" checked={options.smoothLines} onChange={v => updateOption('smoothLines', v)} />
            )}
            <ToggleOption label="Data labels" checked={options.showDataLabels} onChange={v => updateOption('showDataLabels', v)} />
            <ToggleOption label="Show legend" checked={options.showLegend} onChange={v => updateOption('showLegend', v)} />
            <ToggleOption label="Grid lines" checked={options.showGrid} onChange={v => updateOption('showGrid', v)} />
          </div>
        )}

        {activeTab === 'Axes' && (
          <div className="space-y-3">
            <ToggleOption label="X-Axis visible" checked={options.xAxisVisible} onChange={v => updateOption('xAxisVisible', v)} />
            <ToggleOption label="Y-Axis visible" checked={options.yAxisVisible} onChange={v => updateOption('yAxisVisible', v)} />
          </div>
        )}

        {activeTab === 'Visuals' && (
          <div className="space-y-3">
            <div className="text-[10px] text-muted-foreground font-medium mb-1">Color Preset</div>
            <div className="space-y-1.5">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => updateOption('colorPresetIdx', idx)}
                  className={cn(
                    "flex gap-1 p-1.5 rounded-lg w-full transition-all",
                    options.colorPresetIdx === idx ? "ring-2 ring-primary/40 bg-muted/50" : "hover:bg-muted/30"
                  )}
                >
                  {preset.map((c, ci) => (
                    <div key={ci} className="h-5 flex-1 rounded" style={{ backgroundColor: c }} />
                  ))}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Data' && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_32px] gap-1 text-[10px] text-muted-foreground font-medium">
              <span>Label</span><span>Value</span><span />
            </div>
            {data.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_32px] gap-1 items-center">
                <input
                  className="text-xs bg-muted/50 rounded px-2 py-1 outline-none border border-transparent focus:border-primary/30"
                  value={d.label || d.name || ''}
                  onChange={e => updateData(i, 'label', e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                />
                <input
                  type="number"
                  className="text-xs bg-muted/50 rounded px-2 py-1 outline-none border border-transparent focus:border-primary/30"
                  value={d.value}
                  onChange={e => updateData(i, 'value', e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                />
                <button
                  onClick={() => removeRow(i)}
                  className="text-muted-foreground hover:text-destructive text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              className="w-full text-[10px] text-primary hover:bg-primary/10 rounded-lg py-1.5 transition-colors font-medium"
            >
              + Add row
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end p-2 border-t border-border/50">
        <button
          onClick={onClose}
          className="text-[10px] px-3 py-1 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ToggleOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[11px]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-8 h-4.5 rounded-full relative transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <div className={cn(
          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </button>
    </label>
  );
}
