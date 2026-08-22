import { useRef, useEffect, useCallback } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  isEditing: boolean;
  style?: React.CSSProperties;
  className?: string;
  tag?: 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'p';
  placeholder?: string;
  multiline?: boolean;
  children?: React.ReactNode;
}

export function EditableText({
  value,
  onSave,
  isEditing,
  style,
  className,
  tag: Tag = 'div',
  placeholder = 'Click to edit...',
  multiline = false,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const savedRef = useRef(false);
  const initializedRef = useRef(false);

  // Only set content on first mount into editing mode, not on subsequent re-renders
  useEffect(() => {
    if (ref.current && isEditing && !initializedRef.current) {
      ref.current.textContent = value || '';
      initializedRef.current = true;
    }
    if (!isEditing) {
      initializedRef.current = false;
    }
  }, [isEditing, value]);

  const handleSave = useCallback(() => {
    if (savedRef.current) return;
    const newVal = ref.current?.textContent || '';
    if (newVal !== value) {
      savedRef.current = true;
      onSave(newVal);
      setTimeout(() => { savedRef.current = false; }, 50);
    }
  }, [value, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }, [multiline]);

  if (!isEditing) {
    return (
      <Tag style={style} className={className}>
        {value || placeholder}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      style={{
        ...style,
        cursor: 'text',
        outline: 'none',
        minWidth: 20,
        minHeight: '1em',
      }}
      className={className}
      data-placeholder={placeholder}
    />
  );
}
