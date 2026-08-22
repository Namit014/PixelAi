import { memo, useCallback, useState } from 'react';
import { usePresentationStore } from '@/stores/presentationStore';
import type { BlockStyle } from '@/types/presentation';
import {
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Minus, Plus,
  Type,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';

function ToolBtn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'transparent',
        color: '#fff',
        transition: 'background-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

interface Props {
  blockId: string;
  slideId: string;
  style?: React.CSSProperties;
}

export const InlineTextToolbar = memo(function InlineTextToolbar({ blockId, slideId, style }: Props) {
  const updateBlock = usePresentationStore((s) => s.updateBlock);
  const slides = usePresentationStore((s) => s.slides);

  const slide = slides.find((s) => s.id === slideId);
  const block = slide?.contentBlocks.find((b) => b.id === blockId);
  
  const bs = ((block?.style) || {}) as BlockStyle;

  const setStyle = useCallback((patch: Partial<BlockStyle>) => {
    updateBlock(slideId, blockId, { style: { ...bs, ...patch } } as any);
  }, [bs, slideId, blockId, updateBlock]);

  const execCommand = useCallback((cmd: string) => {
    document.execCommand(cmd, false);
  }, []);

  if (!block) return null;

  const fontSize = bs.fontSize ?? (block.type === 'title' ? 64 : 22);
  const isBold = (bs.fontWeight ?? 400) >= 700;
  const textAlign = bs.textAlign || 'left';

  return (
    <div
      style={{
        position: 'absolute',
        top: -64,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 12px',
        borderRadius: 12,
        backgroundColor: 'rgba(30, 30, 40, 0.92)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Font size */}
      <ToolBtn onClick={() => setStyle({ fontSize: Math.max(8, fontSize - 2) })} title="Decrease font size">
        <Minus size={22} />
      </ToolBtn>
      <span style={{ color: '#fff', fontSize: 16, minWidth: 36, textAlign: 'center', fontWeight: 600, userSelect: 'none' }}>{fontSize}</span>
      <ToolBtn onClick={() => setStyle({ fontSize: Math.min(200, fontSize + 2) })} title="Increase font size">
        <Plus size={22} />
      </ToolBtn>

      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 6px' }} />

      {/* Bold / Italic / Underline */}
      <ToolBtn active={isBold} onClick={() => { setStyle({ fontWeight: isBold ? 400 : 700 }); execCommand('bold'); }} title="Bold">
        <Bold size={22} />
      </ToolBtn>
      <ToolBtn onClick={() => execCommand('italic')} title="Italic">
        <Italic size={22} />
      </ToolBtn>
      <ToolBtn onClick={() => execCommand('underline')} title="Underline">
        <Underline size={22} />
      </ToolBtn>

      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 6px' }} />

      {/* Alignment */}
      <ToolBtn active={textAlign === 'left'} onClick={() => setStyle({ textAlign: 'left' })} title="Align left">
        <AlignLeft size={22} />
      </ToolBtn>
      <ToolBtn active={textAlign === 'center'} onClick={() => setStyle({ textAlign: 'center' })} title="Align center">
        <AlignCenter size={22} />
      </ToolBtn>
      <ToolBtn active={textAlign === 'right'} onClick={() => setStyle({ textAlign: 'right' })} title="Align right">
        <AlignRight size={22} />
      </ToolBtn>

      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 6px' }} />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent',
            }}
            title="Text color"
          >
            <Type size={22} color="#fff" />
            <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 12, height: 3, borderRadius: 1, backgroundColor: bs.color || '#fff' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" side="top" sideOffset={8}>
          <HexColorPicker color={bs.color || '#ffffff'} onChange={(c) => setStyle({ color: c })} />
        </PopoverContent>
      </Popover>
    </div>
  );
});
