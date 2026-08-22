import { useState, useRef, useEffect, useCallback } from 'react';
import type { ContentBlock, DesignTokens } from '@/types/presentation';
import { usePresentationStore } from '@/stores/presentationStore';
import { icons } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartEditor } from './ChartEditor';

interface Props {
  block: ContentBlock;
  slideId: string;
  tokens: DesignTokens;
  onFinish: () => void;
}

const SIMPLE_TEXT_TYPES = ['title', 'subtitle', 'callout', 'quote', 'metric'];

// Helper: Render a Lucide icon by name
function RenderIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = icons[name as keyof typeof icons];
  if (!Icon) return <span className={className}>{name}</span>;
  return <Icon size={size} className={className} />;
}

// Editable cell component for structured editors
function EditableCell({ value, onChange, placeholder, className, style }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={() => onChange(ref.current?.innerText || '')}
      data-placeholder={placeholder}
      className={cn(
        "outline-none min-h-[20px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
        className
      )}
      style={style}
    />
  );
}

export function ContentBlockEditor({ block, slideId, tokens, onFinish }: Props) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const textRef = useRef<HTMLDivElement>(null);
  const isSimpleText = SIMPLE_TEXT_TYPES.includes(block.type);

  // Local state for structured editors
  const [localData, setLocalData] = useState<any>(() => {
    switch (block.type) {
      case 'bullets': return { items: [...block.items] };
      case 'numbered-list': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'timeline': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'stats': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'steps': case 'process-flow': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'cycle-diagram': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'venn-diagram': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'icon-grid': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'todo-list': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'table': return { rows: block.rows.map((r: string[]) => [...r]) };
      case 'card-grid': return { cards: block.cards.map((c: any) => ({ ...c })) };
      case 'comparison': return { left: { ...block.left, items: [...block.left.items] }, right: { ...block.right, items: [...block.right.items] } };
      case 'icon-list': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'progress': return { items: block.items.map((i: any) => ({ ...i })) };
      case 'chart': return { data: block.data.map((d: any) => ({ ...d })), chartType: block.chartType };
      case 'quote-box': return { text: block.text, attribution: block.attribution || '' };
      case 'button-block': return { text: block.text, url: block.url };
      case 'embed': return { url: block.url || '' };
      case 'image': return { src: block.src || '', alt: block.alt || '' };
      case 'code': return { code: block.code, language: block.language || 'javascript' };
      default: return {};
    }
  });

  useEffect(() => {
    if (isSimpleText && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isSimpleText]);

  const save = useCallback(() => {
    if (isSimpleText) {
      const currentText = textRef.current?.innerText || '';
      switch (block.type) {
        case 'title': case 'subtitle': case 'callout': case 'quote':
          updateBlock(slideId, block.id, { text: currentText } as any);
          break;
        case 'metric':
          updateBlock(slideId, block.id, { value: currentText } as any);
          break;
      }
    } else {
      // Save structured data
      switch (block.type) {
        case 'bullets':
          updateBlock(slideId, block.id, { items: localData.items.filter(Boolean) } as any);
          break;
        case 'numbered-list': case 'steps': case 'process-flow':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'timeline':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'stats':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'cycle-diagram':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'venn-diagram':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'icon-grid':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'todo-list':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'table':
          updateBlock(slideId, block.id, { rows: localData.rows } as any);
          break;
        case 'card-grid':
          updateBlock(slideId, block.id, { cards: localData.cards } as any);
          break;
        case 'comparison':
          updateBlock(slideId, block.id, { left: localData.left, right: localData.right } as any);
          break;
        case 'icon-list':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'progress':
          updateBlock(slideId, block.id, { items: localData.items } as any);
          break;
        case 'chart':
          updateBlock(slideId, block.id, { data: localData.data, chartType: localData.chartType } as any);
          break;
        case 'quote-box':
          updateBlock(slideId, block.id, { text: localData.text, attribution: localData.attribution } as any);
          break;
        case 'button-block':
          updateBlock(slideId, block.id, { text: localData.text, url: localData.url } as any);
          break;
        case 'embed':
          updateBlock(slideId, block.id, { url: localData.url } as any);
          break;
        case 'image':
          updateBlock(slideId, block.id, { src: localData.src, alt: localData.alt } as any);
          break;
        case 'code':
          updateBlock(slideId, block.id, { code: localData.code, language: localData.language } as any);
          break;
      }
    }
    onFinish();
  }, [localData, block, slideId, updateBlock, onFinish, isSimpleText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let "/" bubble up to window handler for slash commands
    if (e.key === '/') return;
    e.stopPropagation();
    if (e.key === 'Escape') save();
    if (isSimpleText && e.key === 'Enter' && block.type === 'title') {
      e.preventDefault();
      save();
    }
  };

  const editorOutline = { outline: `2px solid ${tokens.accentColor}`, outlineOffset: 4, borderRadius: tokens.borderRadius };
  const padding = `${12 * tokens.spacingScale}px`;

  // ContentEditable for simple text blocks
  if (isSimpleText) {
    const bs = block.style;
    const fontSize =
      block.type === 'title' ? (block.level === 1 ? 64 : block.level === 2 ? 48 : 36) :
      block.type === 'subtitle' ? 24 :
      block.type === 'metric' ? 80 : 22;
    const fontWeight =
      block.type === 'title' ? 800 :
      block.type === 'metric' ? 900 : 400;

    const getText = () => {
      if (block.type === 'metric') return block.value;
      return (block as any).text || (block as any).value || '';
    };

    return (
      <div
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          minHeight: 32,
          fontSize: bs?.fontSize || fontSize,
          fontFamily: bs?.fontFamily || (block.type === 'title' ? tokens.headingFont : tokens.bodyFont),
          color: bs?.color || (block.type === 'metric' ? tokens.accentColor : tokens.textColor),
          fontWeight: bs?.fontWeight || fontWeight,
          lineHeight: bs?.lineHeight || 1.3,
          ...editorOutline,
          padding,
          whiteSpace: 'pre-wrap',
          textAlign: bs?.textAlign || (block.type === 'title' || block.type === 'metric' ? 'center' : 'left'),
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'text',
        }}
      >
        {getText()}
      </div>
    );
  }

  // === STRUCTURED EDITORS FOR ALL COMPLEX TYPES ===

  const bs = block.style;
  const blockFont = bs?.fontFamily || tokens.bodyFont;

  const wrapperStyle: React.CSSProperties = {
    ...editorOutline,
    padding,
    fontFamily: blockFont,
    color: tokens.textColor,
    backgroundColor: 'transparent',
  };

  const labelStyle = "text-[10px] uppercase tracking-wider opacity-50 mb-1 font-semibold";
  const inputStyle = "w-full bg-transparent border-b border-current/20 outline-none py-1 text-sm";

  // Bullets
  if (block.type === 'bullets') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Bullet Points</div>
        {localData.items.map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tokens.accentColor }} />
            <input
              className={inputStyle}
              value={item}
              onChange={e => {
                const next = [...localData.items];
                next[i] = e.target.value;
                setLocalData({ items: next });
              }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const next = [...localData.items];
                  next.splice(i + 1, 0, '');
                  setLocalData({ items: next });
                }
                if (e.key === 'Backspace' && !item && localData.items.length > 1) {
                  const next = [...localData.items];
                  next.splice(i, 1);
                  setLocalData({ items: next });
                }
                if (e.key === 'Escape') save();
              }}
              autoFocus={i === 0}
              style={{ color: tokens.textColor, fontFamily: blockFont }}
            />
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, ''] })}>+ Add item</button>
      </div>
    );
  }

  // Numbered List / Steps / Process-flow
  if (block.type === 'numbered-list' || block.type === 'steps' || block.type === 'process-flow') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>{block.type === 'numbered-list' ? 'Numbered List' : block.type === 'steps' ? 'Steps' : 'Process Flow'}</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${tokens.textColor}20` }}>
            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: tokens.accentColor, color: tokens.backgroundColor }}>{i + 1}</span>
            <div className="flex-1 space-y-1">
              <input
                className={inputStyle + " font-semibold"}
                value={item.title}
                placeholder="Title"
                onChange={e => {
                  const next = [...localData.items];
                  next[i] = { ...next[i], title: e.target.value };
                  setLocalData({ items: next });
                }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                autoFocus={i === 0}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input
                className={inputStyle}
                value={item.description || ''}
                placeholder="Description"
                onChange={e => {
                  const next = [...localData.items];
                  next[i] = { ...next[i], description: e.target.value };
                  setLocalData({ items: next });
                }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { title: '', description: '' }] })}>+ Add item</button>
      </div>
    );
  }

  // Timeline
  if (block.type === 'timeline') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Timeline</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${tokens.textColor}20` }}>
            <input className="w-16 bg-transparent border-b outline-none text-sm font-bold" value={item.year} placeholder="Year"
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], year: e.target.value }; setLocalData({ items: next }); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
              style={{ color: tokens.accentColor, fontFamily: blockFont, borderColor: `${tokens.textColor}20` }}
            />
            <div className="flex-1 space-y-1">
              <input className={inputStyle + " font-semibold"} value={item.title} placeholder="Title"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], title: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input className={inputStyle} value={item.description || ''} placeholder="Description"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], description: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { year: '', title: '', description: '' }] })}>+ Add item</button>
      </div>
    );
  }

  // Stats
  if (block.type === 'stats') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Stats</div>
        <div className="grid grid-cols-2 gap-3">
          {localData.items.map((item: any, i: number) => (
            <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: `${tokens.accentColor}15` }}>
              <input className="w-full bg-transparent outline-none text-2xl font-bold" value={item.value}
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], value: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.accentColor, fontFamily: blockFont }}
              />
              <input className="w-full bg-transparent outline-none text-xs" value={item.label} placeholder="Label"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], label: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          ))}
        </div>
        <button className="text-xs opacity-50 hover:opacity-100 mt-2" onClick={() => setLocalData({ items: [...localData.items, { label: '', value: '0' }] })}>+ Add stat</button>
      </div>
    );
  }

  // Todo List
  if (block.type === 'todo-list') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Todo List</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <input type="checkbox" checked={item.checked}
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], checked: e.target.checked }; setLocalData({ items: next }); }}
            />
            <input className={inputStyle} value={item.text}
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], text: e.target.value }; setLocalData({ items: next }); }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); const next = [...localData.items]; next.splice(i + 1, 0, { text: '', checked: false }); setLocalData({ items: next }); }
                if (e.key === 'Escape') save();
              }}
              style={{ color: tokens.textColor, fontFamily: blockFont, textDecoration: item.checked ? 'line-through' : 'none' }}
            />
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { text: '', checked: false }] })}>+ Add item</button>
      </div>
    );
  }

  // Table
  if (block.type === 'table') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Table</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {localData.rows.map((row: string[], ri: number) => (
              <tr key={ri}>
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className="border p-1" style={{ borderColor: `${tokens.textColor}20` }}>
                    <input className="w-full bg-transparent outline-none text-sm" value={cell}
                      onChange={e => {
                        const next = localData.rows.map((r: string[]) => [...r]);
                        next[ri][ci] = e.target.value;
                        setLocalData({ rows: next });
                      }}
                      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                      style={{ color: tokens.textColor, fontFamily: blockFont, fontWeight: ri === 0 ? 600 : 400 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </table>
        </div>
        <div className="flex gap-2 mt-1">
          <button className="text-xs opacity-50 hover:opacity-100" onClick={() => setLocalData({ rows: [...localData.rows, new Array(localData.rows[0]?.length || 2).fill('')] })}>+ Row</button>
          <button className="text-xs opacity-50 hover:opacity-100" onClick={() => setLocalData({ rows: localData.rows.map((r: string[]) => [...r, '']) })}>+ Column</button>
        </div>
      </div>
    );
  }

  // Card Grid
  if (block.type === 'card-grid') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Card Grid</div>
        <div className="grid grid-cols-2 gap-2">
          {localData.cards.map((card: any, i: number) => (
            <div key={i} className="p-2 rounded-lg border" style={{ borderColor: `${tokens.textColor}20` }}>
              <input className="w-full bg-transparent outline-none text-sm font-semibold mb-1" value={card.title || ''} placeholder="Title"
                onChange={e => { const next = [...localData.cards]; next[i] = { ...next[i], title: e.target.value }; setLocalData({ cards: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input className="w-full bg-transparent outline-none text-xs" value={card.description || ''} placeholder="Description"
                onChange={e => { const next = [...localData.cards]; next[i] = { ...next[i], description: e.target.value }; setLocalData({ cards: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          ))}
        </div>
        <button className="text-xs opacity-50 hover:opacity-100 mt-2" onClick={() => setLocalData({ cards: [...localData.cards, { title: '', description: '', icon: 'Star' }] })}>+ Add card</button>
      </div>
    );
  }

  // Comparison
  if (block.type === 'comparison') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Comparison</div>
        <div className="grid grid-cols-2 gap-3">
          {['left', 'right'].map(side => (
            <div key={side}>
              <input className="w-full bg-transparent outline-none text-sm font-bold mb-2" value={localData[side].title} placeholder={`${side} title`}
                onChange={e => setLocalData({ ...localData, [side]: { ...localData[side], title: e.target.value } })}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              {localData[side].items.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-1 mb-1">
                  <span className="text-xs">{side === 'left' ? '✓' : '✗'}</span>
                  <input className={inputStyle} value={item}
                    onChange={e => {
                      const next = { ...localData[side], items: [...localData[side].items] };
                      next.items[i] = e.target.value;
                      setLocalData({ ...localData, [side]: next });
                    }}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                    style={{ color: tokens.textColor, fontFamily: blockFont }}
                  />
                </div>
              ))}
              <button className="text-xs opacity-50 hover:opacity-100" onClick={() => {
                const next = { ...localData[side], items: [...localData[side].items, ''] };
                setLocalData({ ...localData, [side]: next });
              }}>+ Add</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Icon List
  if (block.type === 'icon-list') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Icon List</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${tokens.accentColor}20` }}>
              <RenderIcon name={item.icon || 'Star'} size={14} />
            </div>
            <div className="flex-1 space-y-1">
              <input className={inputStyle + " font-semibold"} value={item.title || ''} placeholder="Title"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], title: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input className={inputStyle} value={item.description || ''} placeholder="Description"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], description: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { icon: 'Star', title: '', description: '' }] })}>+ Add item</button>
      </div>
    );
  }

  // Progress
  if (block.type === 'progress') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Progress Bars</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <input className="flex-1 bg-transparent outline-none text-sm" value={item.label} placeholder="Label"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], label: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input type="range" min="0" max="100" value={item.value}
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], value: parseInt(e.target.value) }; setLocalData({ items: next }); }}
                className="w-20"
              />
              <span className="text-xs w-8 text-right">{item.value}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: `${tokens.textColor}15` }}>
              <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: tokens.accentColor }} />
            </div>
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { label: '', value: 50 }] })}>+ Add bar</button>
      </div>
    );
  }

  // Cycle Diagram
  if (block.type === 'cycle-diagram') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Cycle Diagram Items</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: tokens.accentColor, color: tokens.backgroundColor }}>{i + 1}</span>
            <input className={inputStyle} value={item.label} placeholder="Label"
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], label: e.target.value }; setLocalData({ items: next }); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
              style={{ color: tokens.textColor, fontFamily: blockFont }}
            />
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { label: '' }] })}>+ Add node</button>
      </div>
    );
  }

  // Venn Diagram
  if (block.type === 'venn-diagram') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Venn Diagram</div>
        {localData.items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 mb-2" style={{ borderBottom: `1px solid ${tokens.textColor}20`, paddingBottom: 8 }}>
            <input className="w-24 bg-transparent border-b outline-none text-sm font-bold" value={item.label} placeholder="Label"
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], label: e.target.value }; setLocalData({ items: next }); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
              style={{ color: tokens.accentColor, fontFamily: blockFont, borderColor: `${tokens.textColor}20` }}
            />
            <input className={inputStyle} value={item.description || ''} placeholder="Description"
              onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], description: e.target.value }; setLocalData({ items: next }); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
              style={{ color: tokens.textColor, fontFamily: blockFont }}
            />
          </div>
        ))}
        <button className="text-xs opacity-50 hover:opacity-100 mt-1" onClick={() => setLocalData({ items: [...localData.items, { label: '', description: '' }] })}>+ Add circle</button>
      </div>
    );
  }

  // Icon Grid
  if (block.type === 'icon-grid') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Icon Grid</div>
        <div className="grid grid-cols-2 gap-2">
          {localData.items.map((item: any, i: number) => (
            <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: `${tokens.accentColor}10` }}>
              <div className="flex items-center gap-2 mb-1">
                <RenderIcon name={item.icon || 'Star'} size={14} />
                <input className="flex-1 bg-transparent outline-none text-xs" value={item.icon || ''} placeholder="Icon name"
                  onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], icon: e.target.value }; setLocalData({ items: next }); }}
                  onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                  style={{ color: tokens.textColor, fontFamily: blockFont }}
                />
              </div>
              <input className="w-full bg-transparent outline-none text-sm font-semibold" value={item.title || ''} placeholder="Title"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], title: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont }}
              />
              <input className="w-full bg-transparent outline-none text-xs" value={item.description || ''} placeholder="Description"
                onChange={e => { const next = [...localData.items]; next[i] = { ...next[i], description: e.target.value }; setLocalData({ items: next }); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
                style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
              />
            </div>
          ))}
        </div>
        <button className="text-xs opacity-50 hover:opacity-100 mt-2" onClick={() => setLocalData({ items: [...localData.items, { icon: 'Star', title: '', description: '' }] })}>+ Add item</button>
      </div>
    );
  }

  // Quote Box
  if (block.type === 'quote-box') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Quote</div>
        <textarea className="w-full bg-transparent outline-none text-lg italic resize-none mb-2" rows={3} value={localData.text} placeholder="Quote text..."
          onChange={e => setLocalData({ ...localData, text: e.target.value })}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
          style={{ color: tokens.textColor, fontFamily: blockFont }}
        />
        <input className={inputStyle} value={localData.attribution} placeholder="— Attribution"
          onChange={e => setLocalData({ ...localData, attribution: e.target.value })}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
          style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
        />
      </div>
    );
  }

  // Button Block
  if (block.type === 'button-block') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Button</div>
        <div className="space-y-2">
          <input className={inputStyle + " font-semibold"} value={localData.text} placeholder="Button text"
            onChange={e => setLocalData({ ...localData, text: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
            style={{ color: tokens.textColor, fontFamily: blockFont }}
          />
          <input className={inputStyle} value={localData.url} placeholder="URL (https://...)"
            onChange={e => setLocalData({ ...localData, url: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
            style={{ color: tokens.accentColor, fontFamily: blockFont }}
          />
        </div>
      </div>
    );
  }

  // Embed
  if (block.type === 'embed') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Embed URL</div>
        <input className={inputStyle} value={localData.url} placeholder="Paste URL (YouTube, Figma, etc.)"
          onChange={e => setLocalData({ ...localData, url: e.target.value })}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
          style={{ color: tokens.accentColor, fontFamily: blockFont }}
          autoFocus
        />
      </div>
    );
  }

  // Image
  if (block.type === 'image') {
    return (
      <div style={wrapperStyle} onClick={e => e.stopPropagation()}>
        <div className={labelStyle}>Image</div>
        <div className="space-y-2">
          <input className={inputStyle} value={localData.src} placeholder="Image URL"
            onChange={e => setLocalData({ ...localData, src: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
            style={{ color: tokens.accentColor, fontFamily: blockFont }}
            autoFocus
          />
          <input className={inputStyle} value={localData.alt} placeholder="Alt text"
            onChange={e => setLocalData({ ...localData, alt: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
            style={{ color: tokens.textColor, fontFamily: blockFont, opacity: 0.7 }}
          />
          {localData.src && <img src={localData.src} alt={localData.alt} className="max-h-32 rounded object-contain" />}
        </div>
      </div>
    );
  }

  // Chart
  if (block.type === 'chart') {
    return (
      <ChartEditor
        chartType={localData.chartType}
        data={localData.data}
        title={localData.title}
        tokens={tokens}
        onChange={(updates) => {
          setLocalData((prev: any) => ({ ...prev, ...updates }));
        }}
        onClose={save}
      />
    );
  }

  // Code
  if (block.type === 'code') {
    return (
      <div style={{ ...wrapperStyle, backgroundColor: '#1e1e2e' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className={labelStyle} style={{ color: '#cdd6f4' }}>Code</div>
          <input className="text-xs bg-transparent border rounded px-1 py-0.5 outline-none w-24" value={localData.language} placeholder="Language"
            onChange={e => setLocalData({ ...localData, language: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
            style={{ borderColor: '#45475a', color: '#cdd6f4' }}
          />
        </div>
        <textarea className="w-full bg-transparent outline-none resize-none" rows={8} value={localData.code}
          onChange={e => setLocalData({ ...localData, code: e.target.value })}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') save(); }}
          style={{ color: '#cdd6f4', fontFamily: '"Fira Code", monospace', fontSize: 14, lineHeight: 1.5 }}
          autoFocus
        />
      </div>
    );
  }

  // Fallback: textarea for any unhandled type
  const getText = () => {
    switch (block.type) {
      case 'divider': return '';
      default: return (block as any).text || '';
    }
  };

  return (
    <textarea
      value={getText()}
      onChange={() => {}}
      onBlur={save}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', minHeight: 80,
        fontSize: 18,
        fontFamily: blockFont,
        color: tokens.textColor,
        backgroundColor: 'transparent',
        ...editorOutline,
        padding,
        whiteSpace: 'pre-wrap',
        resize: 'none',
        border: 'none',
      }}
      autoFocus
    />
  );
}
