import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResourceRowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: string;
  primaryKey: string | null;
  row: any | null;
  onSaved: () => void;
}

/**
 * Full-row JSON editor for the Resource Explorer.
 * Validates JSON client-side and routes through the admin-table-mutate
 * edge function so every write is service-role audited.
 */
export const ResourceRowDrawer = ({
  open,
  onOpenChange,
  table,
  primaryKey,
  row,
  onSaved,
}: ResourceRowDrawerProps) => {
  const { toast } = useToast();
  const [text, setText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (row) {
      setText(JSON.stringify(row, null, 2));
    } else {
      setText('{\n  \n}');
    }
  }, [open, row]);

  const isEdit = !!row;

  const save = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
      return;
    }

    setSaving(true);
    let result;
    if (isEdit) {
      if (!primaryKey) {
        setError('Cannot update: this table has no primary key.');
        setSaving(false);
        return;
      }
      // Strip PK + system fields from the values payload so users can't change them.
      const values = { ...parsed };
      delete values[primaryKey];
      delete values.created_at;

      result = await supabase.functions.invoke('admin-table-mutate', {
        body: {
          table,
          op: 'update',
          match: { column: primaryKey, value: row[primaryKey] },
          values,
        },
      });
    } else {
      result = await supabase.functions.invoke('admin-table-mutate', {
        body: { table, op: 'insert', values: parsed },
      });
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data?.error) {
      setError(result.data.error);
      return;
    }

    toast({ title: isEdit ? 'Row updated' : 'Row created' });
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-zinc-950 border-zinc-800 text-zinc-100 w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-zinc-100 font-mono">
            {isEdit ? 'Edit row' : 'New row'} · {table}
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            {isEdit
              ? 'Edit the JSON below. Primary key and created_at are stripped automatically.'
              : 'Provide a JSON object with the column values for the new row.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-[60vh] bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            spellCheck={false}
          />
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md p-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create row'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
