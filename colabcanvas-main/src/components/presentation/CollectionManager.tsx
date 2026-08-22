import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus, Trash2, Database, ChevronRight, ChevronDown,
  X, GripVertical, Save, Loader2, FolderOpen,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentationStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CollectionField {
  name: string;
  type: 'text' | 'image' | 'url' | 'date' | 'number';
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  schema: CollectionField[];
  item_count?: number;
}

interface CollectionItem {
  id: string;
  collection_id: string;
  data: Record<string, any>;
  display_order: number;
}

const FIELD_TYPES: CollectionField['type'][] = ['text', 'image', 'url', 'date', 'number'];

export function CollectionManager({ onClose }: { onClose?: () => void }) {
  const presentationId = usePresentationStore((s) => s.id);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New collection form
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) { setLoading(false); return; }

    const query = supabase
      .from('cosmo_collections')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });

    if (presentationId) {
      query.eq('presentation_id', presentationId);
    }

    const { data } = await query;
    if (data) setCollections(data.map((d: any) => ({ ...d, schema: d.schema || [] })));
    setLoading(false);
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;

    setSaving(true);
    const { data, error } = await supabase
      .from('cosmo_collections')
      .insert({
        user_id: userId,
        presentation_id: presentationId,
        name: newName.trim(),
        schema: [{ name: 'Title', type: 'text' }, { name: 'Description', type: 'text' }],
      } as any)
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast.error('Failed to create collection');
    } else if (data) {
      setCollections((prev) => [{ ...(data as any), schema: (data as any).schema || [] }, ...prev]);
      setNewName('');
      setShowNewForm(false);
      toast.success(`Created "${newName}"`);
    }
  };

  const deleteCollection = async (id: string) => {
    await supabase.from('cosmo_collections').delete().eq('id', id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeCollection?.id === id) {
      setActiveCollection(null);
      setItems([]);
    }
    toast.success('Collection deleted');
  };

  const loadItems = async (collection: Collection) => {
    setActiveCollection(collection);
    const { data } = await supabase
      .from('cosmo_collection_items')
      .select('*')
      .eq('collection_id', collection.id)
      .order('display_order');
    if (data) setItems(data as CollectionItem[]);
  };

  const addItem = async () => {
    if (!activeCollection) return;
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;

    const emptyData: Record<string, any> = {};
    activeCollection.schema.forEach((f) => { emptyData[f.name] = ''; });

    const { data, error } = await supabase
      .from('cosmo_collection_items')
      .insert({
        collection_id: activeCollection.id,
        user_id: userId,
        data: emptyData,
        display_order: items.length,
      } as any)
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data as CollectionItem]);
    }
  };

  const updateItem = async (itemId: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, data: { ...item.data, [field]: value } }
          : item
      )
    );
    // Debounced save handled on blur
  };

  const saveItem = async (item: CollectionItem) => {
    await supabase
      .from('cosmo_collection_items')
      .update({ data: item.data } as any)
      .eq('id', item.id);
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from('cosmo_collection_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const addField = async () => {
    if (!activeCollection) return;
    const newSchema = [...activeCollection.schema, { name: `Field ${activeCollection.schema.length + 1}`, type: 'text' as const }];
    await supabase.from('cosmo_collections').update({ schema: newSchema } as any).eq('id', activeCollection.id);
    setActiveCollection({ ...activeCollection, schema: newSchema });
    setCollections((prev) => prev.map((c) => c.id === activeCollection.id ? { ...c, schema: newSchema } : c));
  };

  return (
    <div className="absolute left-16 top-4 bottom-[100px] w-[320px] z-40 bg-white dark:bg-card rounded-xl border border-border/50 shadow-lg flex flex-col animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />
          {activeCollection ? activeCollection.name : 'Collections'}
        </span>
        <div className="flex gap-1">
          {activeCollection && (
            <button onClick={() => { setActiveCollection(null); setItems([]); }} className="text-muted-foreground hover:text-foreground text-[10px]">
              ← Back
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {!activeCollection ? (
          // Collection list
          <div className="p-3 space-y-2">
            {/* New collection */}
            {showNewForm ? (
              <div className="flex gap-1.5">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name..."
                  className="h-7 text-[10px] bg-muted/30 border-0 flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                />
                <Button size="sm" className="h-7 text-[10px] px-2" onClick={createCollection} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                </Button>
                <button onClick={() => setShowNewForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[10px] gap-1"
                onClick={() => setShowNewForm(true)}
              >
                <Plus className="w-3 h-3" /> New Collection
              </Button>
            )}

            {loading ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">Loading...</p>
            ) : collections.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground">
                  No collections yet. Create one to manage structured content like team members, testimonials, etc.
                </p>
              </div>
            ) : (
              collections.map((col) => (
                <div
                  key={col.id}
                  className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => loadItems(col)}
                >
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-foreground truncate">{col.name}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {col.schema.length} fields
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        ) : (
          // Collection items view
          <div className="p-3 space-y-3">
            {/* Schema / Fields */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Fields</span>
                <button onClick={addField} className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                  <Plus className="w-2.5 h-2.5" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeCollection.schema.map((field, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                    {field.name} <span className="opacity-50">({field.type})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Items ({items.length})
                </span>
                <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 px-2" onClick={addItem}>
                  <Plus className="w-2.5 h-2.5" /> Add Item
                </Button>
              </div>

              {items.map((item) => (
                <div key={item.id} className="p-2 rounded-lg border border-border bg-muted/10 space-y-1.5 group">
                  {activeCollection.schema.map((field) => (
                    <div key={field.name}>
                      <label className="text-[8px] text-muted-foreground block mb-0.5">{field.name}</label>
                      <Input
                        value={item.data[field.name] || ''}
                        onChange={(e) => updateItem(item.id, field.name, e.target.value)}
                        onBlur={() => saveItem(item)}
                        className="h-6 text-[9px] bg-muted/30 border-0"
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-[8px] text-destructive hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete item
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
