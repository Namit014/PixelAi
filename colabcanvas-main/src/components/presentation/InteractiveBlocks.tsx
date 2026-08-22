import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { DesignTokens } from '@/types/presentation';
import { EditableText } from './EditableText';

// ── Countdown ────────────────────────────────────────────────────────

interface CountdownProps {
  targetDate: string;
  label?: string;
  completedText?: string;
  tokens: DesignTokens;
  isEditing?: boolean;
  onSave?: (patch: Record<string, any>) => void;
}

export function CountdownRenderer({ targetDate, label, completedText = '🎉 Time\'s up!', tokens, isEditing, onSave }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        done: false,
      };
    };
    setTimeLeft(calc());
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const editing = !!isEditing;
  const save = onSave || (() => {});

  if (timeLeft.done && !editing) {
    return (
      <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, color: tokens.accentColor, padding: 40 }}>
        {completedText}
      </div>
    );
  }

  const units = [
    { val: timeLeft.days, label: 'Days' },
    { val: timeLeft.hours, label: 'Hours' },
    { val: timeLeft.minutes, label: 'Min' },
    { val: timeLeft.seconds, label: 'Sec' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 20, width: '100%' }}>
      {(label || editing) && (
        <EditableText
          value={label || ''}
          onSave={(t) => save({ label: t })}
          isEditing={editing}
          tag="div"
          placeholder="Countdown label..."
          style={{ fontSize: 22, fontWeight: 600, color: tokens.textColor }}
        />
      )}
      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: 13, color: tokens.mutedTextColor, fontWeight: 600 }}>Target:</span>
          <input
            type="datetime-local"
            value={targetDate ? targetDate.slice(0, 16) : ''}
            onChange={(e) => save({ targetDate: new Date(e.target.value).toISOString() })}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 14, padding: '4px 8px', borderRadius: 6,
              border: `1px solid ${tokens.accentColor}40`, background: `${tokens.accentColor}08`,
              color: tokens.textColor, outline: 'none',
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        {units.map((u) => (
          <div key={u.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 90, height: 90, borderRadius: tokens.borderRadius,
              background: `${tokens.accentColor}12`, border: `2px solid ${tokens.accentColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 900, color: tokens.accentColor,
              fontVariantNumeric: 'tabular-nums',
              transition: 'transform 0.15s', 
            }}>
              {String(u.val).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: tokens.mutedTextColor, textTransform: 'uppercase', letterSpacing: 1 }}>{u.label}</div>
          </div>
        ))}
      </div>
      {editing && (
        <EditableText
          value={completedText || ''}
          onSave={(t) => save({ completedText: t })}
          isEditing={editing}
          tag="div"
          placeholder="Completed text..."
          style={{ fontSize: 16, color: tokens.mutedTextColor, fontStyle: 'italic' }}
        />
      )}
    </div>
  );
}

// ── Animated Counter ─────────────────────────────────────────────────

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  label?: string;
  tokens: DesignTokens;
  isEditing?: boolean;
  onSave?: (patch: Record<string, any>) => void;
}

export function AnimatedCounterRenderer({ value, prefix = '', suffix = '', duration = 2000, label, tokens, isEditing, onSave }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const editing = !!isEditing;
  const save = onSave || (() => {});

  useEffect(() => {
    if (editing) { setDisplay(value); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const animate = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(eased * value));
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration, editing]);

  return (
    <div ref={ref} style={{ textAlign: 'center', padding: 20 }}>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <EditableText value={prefix} onSave={(t) => save({ prefix: t })} isEditing={editing} tag="span" placeholder="Prefix" style={{ fontSize: 48, fontWeight: 900, color: tokens.accentColor }} />
          <input
            type="number"
            value={value}
            onChange={(e) => save({ value: Number(e.target.value) || 0 })}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 140, fontSize: 48, fontWeight: 900, color: tokens.accentColor,
              background: `${tokens.accentColor}08`, border: `1px solid ${tokens.accentColor}40`,
              borderRadius: 8, textAlign: 'center', outline: 'none', fontVariantNumeric: 'tabular-nums',
            }}
          />
          <EditableText value={suffix} onSave={(t) => save({ suffix: t })} isEditing={editing} tag="span" placeholder="Suffix" style={{ fontSize: 48, fontWeight: 900, color: tokens.accentColor }} />
        </div>
      ) : (
        <div style={{ fontSize: 72, fontWeight: 900, color: tokens.accentColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {prefix}{display.toLocaleString()}{suffix}
        </div>
      )}
      <EditableText
        value={label || ''}
        onSave={(t) => save({ label: t })}
        isEditing={editing}
        tag="div"
        placeholder="Label..."
        style={{ fontSize: 20, color: tokens.mutedTextColor, marginTop: 12 }}
      />
    </div>
  );
}

// ── Before / After Slider ────────────────────────────────────────────

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  tokens: DesignTokens;
  isEditing?: boolean;
  onSave?: (patch: Record<string, any>) => void;
}

export function BeforeAfterRenderer({ beforeSrc, afterSrc, beforeLabel = 'Before', afterLabel = 'After', tokens, isEditing, onSave }: BeforeAfterProps) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const editing = !!isEditing;
  const save = onSave || (() => {});

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPos(x);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      handleMove(x);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchend', onUp); };
  }, [handleMove]);

  const triggerUpload = useCallback((field: 'beforeSrc' | 'afterSrc') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) save({ [field]: dataUrl });
        };
        reader.readAsDataURL(file);
      }
      document.body.removeChild(input);
    };
    input.click();
  }, [save]);

  const placeholder = (lbl: string, field: 'beforeSrc' | 'afterSrc') => (
    <div style={{ width: '100%', height: '100%', minHeight: 300, background: tokens.surfaceColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: tokens.mutedTextColor, fontSize: 18, gap: 8 }}>
      {lbl} — add image
      {editing && (
        <button
          onClick={(e) => { e.stopPropagation(); triggerUpload(field); }}
          style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${tokens.accentColor}40`, background: `${tokens.accentColor}10`, color: tokens.accentColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Upload Image
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, overflow: 'hidden', borderRadius: tokens.borderRadius, cursor: 'ew-resize', userSelect: 'none' }}
        onMouseDown={(e) => { e.stopPropagation(); dragging.current = true; handleMove(e.clientX); }}
        onTouchStart={(e) => { e.stopPropagation(); dragging.current = true; handleMove(e.touches[0].clientX); }}
      >
        {/* After (full) */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {afterSrc ? <img src={afterSrc} alt={afterLabel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : placeholder(afterLabel, 'afterSrc')}
        </div>
        {/* Before (clipped) */}
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {beforeSrc ? <img src={beforeSrc} alt={beforeLabel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : placeholder(beforeLabel, 'beforeSrc')}
        </div>
        {/* Divider */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: 4, background: '#fff', zIndex: 5, boxShadow: '0 0 8px rgba(0,0,0,0.4)' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#333' }}>
            ⇔
          </div>
        </div>
        {/* Labels */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 14, fontWeight: 600, zIndex: 6 }}>
          {editing ? (
            <EditableText value={beforeLabel} onSave={(t) => save({ beforeLabel: t })} isEditing={editing} tag="span" style={{ color: '#fff' }} />
          ) : beforeLabel}
        </div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 14, fontWeight: 600, zIndex: 6 }}>
          {editing ? (
            <EditableText value={afterLabel} onSave={(t) => save({ afterLabel: t })} isEditing={editing} tag="span" style={{ color: '#fff' }} />
          ) : afterLabel}
        </div>
        {/* Upload buttons overlay when editing */}
        {editing && (beforeSrc || afterSrc) && (
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', zIndex: 7 }}>
            <button onClick={(e) => { e.stopPropagation(); triggerUpload('beforeSrc'); }} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
              📷 Before
            </button>
            <button onClick={(e) => { e.stopPropagation(); triggerUpload('afterSrc'); }} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
              📷 After
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toggle Reveal ────────────────────────────────────────────────────

interface ToggleRevealProps {
  prompt: string;
  reveal: string;
  variant?: 'flip' | 'fade' | 'slide';
  tokens: DesignTokens;
  isEditing?: boolean;
  onSave?: (patch: Record<string, any>) => void;
}

export function ToggleRevealRenderer({ prompt, reveal, variant = 'flip', tokens, isEditing, onSave }: ToggleRevealProps) {
  const [revealed, setRevealed] = useState(false);

  const editing = !!isEditing;
  const save = onSave || (() => {});

  const baseCard: React.CSSProperties = {
    width: '100%', minHeight: 200, borderRadius: tokens.borderRadius,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 32, cursor: editing ? 'text' : 'pointer', transition: 'all 0.5s ease',
    textAlign: 'center', userSelect: 'none',
  };

  // When editing, show both prompt and reveal side by side for editing
  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 16, width: '100%' }}>
        <div style={{ ...baseCard, flex: 1, background: `${tokens.accentColor}10`, border: `2px solid ${tokens.accentColor}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tokens.accentColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Prompt (front)</div>
          <EditableText value={prompt} onSave={(t) => save({ prompt: t })} isEditing={editing} tag="div" style={{ fontSize: 24, fontWeight: 700, color: tokens.textColor }} placeholder="Enter prompt..." />
        </div>
        <div style={{ ...baseCard, flex: 1, background: `${tokens.accentColor}15`, border: `2px solid ${tokens.accentColor}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tokens.accentColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Reveal (back)</div>
          <EditableText value={reveal} onSave={(t) => save({ reveal: t })} isEditing={editing} tag="div" multiline style={{ fontSize: 22, color: tokens.textColor, lineHeight: 1.6 }} placeholder="Enter reveal content..." />
        </div>
      </div>
    );
  }

  if (variant === 'flip') {
    return (
      <div style={{ perspective: 800, width: '100%' }} onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}>
        <div style={{ ...baseCard, transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(180deg)' : 'rotateY(0)', position: 'relative' }}>
          <div style={{ ...baseCard, backfaceVisibility: 'hidden', position: revealed ? 'absolute' : 'relative', inset: 0, background: `${tokens.accentColor}10`, border: `2px solid ${tokens.accentColor}30` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.accentColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Click to reveal</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: tokens.textColor }}>{prompt}</div>
          </div>
          <div style={{ ...baseCard, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: revealed ? 'relative' : 'absolute', inset: 0, background: `${tokens.accentColor}15`, border: `2px solid ${tokens.accentColor}` }}>
            <div style={{ fontSize: 22, color: tokens.textColor, lineHeight: 1.6 }}>{reveal}</div>
          </div>
        </div>
      </div>
    );
  }

  // fade / slide variants
  return (
    <div
      style={{ ...baseCard, background: revealed ? `${tokens.accentColor}15` : `${tokens.accentColor}08`, border: `2px solid ${revealed ? tokens.accentColor : tokens.accentColor + '30'}` }}
      onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
    >
      {!revealed ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: tokens.accentColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Click to reveal</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: tokens.textColor }}>{prompt}</div>
        </>
      ) : (
        <div style={{
          fontSize: 22, color: tokens.textColor, lineHeight: 1.6,
          animation: variant === 'slide' ? 'slideUp 0.4s ease' : 'fadeInBlock 0.4s ease',
        }}>
          {reveal}
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInBlock { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ── Live Ticker ──────────────────────────────────────────────────────

interface LiveTickerProps {
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
  tokens: DesignTokens;
  isEditing?: boolean;
  onSave?: (patch: Record<string, any>) => void;
}

export function LiveTickerRenderer({ items, speed = 30, direction = 'left', tokens, isEditing, onSave }: LiveTickerProps) {
  const dur = Math.max(5, items.length * (60 / speed));
  const anim = direction === 'left' ? 'tickerLeft' : 'tickerRight';

  const editing = !!isEditing;
  const save = onSave || (() => {});

  // When editing, show items as editable list
  if (editing) {
    return (
      <div style={{ width: '100%', padding: '16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: tokens.accentColor, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Ticker Items</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} className="group/item" style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', padding: '8px 12px', borderRadius: 8, background: `${tokens.accentColor}06`, border: `1px solid ${tokens.accentColor}15` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.accentColor, flexShrink: 0 }} />
              <EditableText
                value={item}
                onSave={(t) => {
                  const newItems = [...items];
                  newItems[i] = t;
                  save({ items: newItems });
                }}
                isEditing={editing}
                tag="span"
                style={{ fontSize: 18, fontWeight: 600, color: tokens.textColor, flex: 1 }}
              />
              {items.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); save({ items: items.filter((_, idx) => idx !== i) }); }}
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    backgroundColor: '#ef4444', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s',
                  }}
                  className="group-hover/item:!opacity-100"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); save({ items: [...items, 'New item'] }); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '8px 0', marginTop: 4,
              border: `1.5px dashed ${tokens.accentColor}40`, borderRadius: 8,
              backgroundColor: `${tokens.accentColor}08`, color: tokens.accentColor,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add item
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '16px 0', position: 'relative' }}>
      <div style={{
        display: 'flex', gap: 48, whiteSpace: 'nowrap',
        animation: `${anim} ${dur}s linear infinite`,
        width: 'max-content',
      }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{
            fontSize: 22, fontWeight: 600, color: tokens.textColor, display: 'inline-flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.accentColor, flexShrink: 0 }} />
            {item}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes tickerLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes tickerRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
