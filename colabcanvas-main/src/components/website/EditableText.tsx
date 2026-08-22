import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditableTextProps {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  value: string;
  fieldPath: string;
  sectionIndex: number;
  editable?: boolean;
}

/**
 * Wraps any text node with an inline AI-edit popover.
 * On click → floating popover with AI prompt + contentEditable.
 * Posts EDIT_ELEMENT to parent window.
 */
export function EditableText({
  as: Tag = 'span',
  className = '',
  style,
  children,
  value,
  fieldPath,
  sectionIndex,
  editable = true,
}: EditableTextProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        ref.current && !ref.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setPrompt('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setOpen(true);
  };

  const submit = (instruction: string, manualText?: string) => {
    setBusy(true);
    window.parent.postMessage({
      source: 'WEBSITE_PREVIEW',
      type: 'EDIT_ELEMENT',
      sectionIndex,
      fieldPath,
      instruction: instruction || null,
      manualText: manualText ?? null,
      currentValue: value,
    }, '*');
    // Optimistic close
    setTimeout(() => { setBusy(false); setOpen(false); setPrompt(''); }, 250);
  };

  const TagAny = Tag as any;

  return (
    <>
      <TagAny
        ref={ref as any}
        className={`${className} ${editable ? 'cursor-text hover:outline hover:outline-1 hover:outline-dashed hover:outline-[hsl(var(--brand-accent,210_90%_50%))]/60 hover:outline-offset-4 transition-all relative' : ''}`}
        style={style}
        onClick={handleOpen}
        data-editable={editable ? 'true' : 'false'}
        data-field={fieldPath}
      >
        {children}
      </TagAny>

      <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] w-[340px] bg-white rounded-xl shadow-2xl border border-zinc-200 p-2.5"
            style={{ top: pos.top, left: Math.min(pos.left, window.innerWidth - 360) }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 px-1 pb-1.5">Edit element</div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={2}
              className="w-full text-sm text-zinc-900 bg-zinc-50 rounded-lg px-2.5 py-2 outline-none resize-none border border-transparent focus:border-zinc-300"
              placeholder="Edit text directly…"
            />
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <button
                onClick={() => submit('', draft)}
                disabled={busy || draft === value}
                className="text-[11px] px-2 py-1 rounded-md bg-zinc-900 text-white font-medium disabled:opacity-40 hover:bg-zinc-800"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <span className="text-[10px] text-zinc-400">or ask AI</span>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && prompt.trim()) submit(prompt); }}
                placeholder="make it punchier, shorten, more urgent…"
                className="flex-1 text-xs text-zinc-900 bg-zinc-50 rounded-md px-2 py-1.5 outline-none border border-transparent focus:border-zinc-300"
              />
              <button
                onClick={() => prompt.trim() && submit(prompt)}
                disabled={busy || !prompt.trim()}
                className="text-[11px] px-2 py-1.5 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-medium disabled:opacity-40"
              >
                ✨
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {['Make punchier', 'Shorten', 'More urgent', 'More premium'].map(s => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
