import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Folder,
  GripVertical,
  Pencil,
  Maximize2,
  Minimize2,
  Search,
  Video,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Layer {
  id: string;
  title: string;
  type: 'artboard' | 'image' | 'video' | 'text' | 'rectangle' | 'circle' | 'group';
  visible: boolean;
  thumbnail?: string;
  children?: Layer[];
  isExpanded?: boolean;
  parentId?: string;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId?: string;
  onLayerSelect: (id: string) => void;
  onLayerToggleVisibility: (id: string) => void;
  onLayerDelete: (id: string) => void;
  onLayerToggleExpand?: (id: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onLayerRename: (id: string, name: string) => void;
  onLayerReorder: (parentId: string | null, orderedIds: string[]) => void;
  onClose?: () => void;
}

const LayersPanel = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerDelete,
  onLayerToggleExpand,
  expanded,
  onExpandedChange,
  onLayerRename,
  onLayerReorder,
  onClose,
}: LayersPanelProps) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const parentById = useMemo(() => {
    const map = new Map<string, string | null>();
    const walk = (items: Layer[], parent: string | null) => {
      items.forEach((l) => {
        map.set(l.id, parent);
        if (l.children?.length) walk(l.children, l.id);
      });
    };
    walk(layers, null);
    return map;
  }, [layers]);

  const filteredLayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return layers;

    const filterTree = (items: Layer[]): Layer[] => {
      const out: Layer[] = [];
      for (const item of items) {
        const titleMatch = item.title.toLowerCase().includes(q);
        const children = item.children ? filterTree(item.children) : undefined;
        const childMatch = !!children && children.length > 0;
        if (titleMatch || childMatch) {
          out.push({
            ...item,
            isExpanded: childMatch ? true : item.isExpanded,
            children,
          });
        }
      }
      return out;
    };

    return filterTree(layers);
  }, [layers, query]);

  const isNonDraggable = (layer: Layer) => layer.title === 'Background' && !!layer.parentId;

  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'artboard':
      case 'group':
        return Folder;
      case 'video':
        return Video;
      case 'image':
        return ImageIcon;
      case 'text':
        return Type;
      case 'rectangle':
        return Square;
      case 'circle':
        return Circle;
      default:
        return Layers;
    }
  };

  const SortableRow = ({ layer, depth }: { layer: Layer; depth: number }) => {
    const disabled = isNonDraggable(layer);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: layer.id,
      disabled,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    } as React.CSSProperties;

    const Icon = getLayerIcon(layer.type);
    const hasChildren = layer.children && layer.children.length > 0;
    const paddingLeft = depth * 16 + 8;
    const isEditing = editingId === layer.id;

    return (
      <div ref={setNodeRef} style={style}>
        <div
          className={
            `group relative flex items-center gap-2 p-2 rounded-md cursor-pointer ` +
            `transition-colors hover:bg-muted/50 ` +
            (selectedLayerId === layer.id ? 'bg-primary/10 ring-1 ring-primary' : '')
          }
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onLayerSelect(layer.id)}
          onDoubleClick={() => {
            setEditingId(layer.id);
            setDraftName(layer.title);
          }}
        >
          <button
            type="button"
            className={
              `h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted/60 ` +
              (disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-grab')
            }
            aria-label="Reorder layer"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {hasChildren && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggleExpand?.(layer.id);
              }}
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-transparent"
            >
              {layer.isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {!hasChildren && <div className="w-5" />}

          {layer.thumbnail ? (
            <img
              src={layer.thumbnail}
              alt={layer.title}
              className="w-10 h-10 rounded object-cover border border-border"
              loading="lazy"
            />
          ) : (
            <div
              className={
                `w-10 h-10 rounded flex items-center justify-center border border-border ` +
                (layer.type === 'artboard' || layer.type === 'group' ? 'bg-muted/30' : 'bg-muted')
              }
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none ring-1 ring-primary/40 rounded px-1 py-0.5"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setEditingId(null);
                    setDraftName('');
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    const next = draftName.trim();
                    if (next) onLayerRename(layer.id, next);
                    setEditingId(null);
                    setDraftName('');
                  }
                }}
                onBlur={() => {
                  const next = draftName.trim();
                  if (next) onLayerRename(layer.id, next);
                  setEditingId(null);
                  setDraftName('');
                }}
              />
            ) : (
              <p className="text-sm font-medium truncate">{layer.title}</p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(layer.id);
                setDraftName(layer.title);
              }}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggleVisibility(layer.id);
              }}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={layer.visible ? 'Hide' : 'Show'}
            >
              {layer.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onLayerDelete(layer.id);
              }}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {hasChildren && layer.isExpanded && (
          <SortableList parentId={layer.id} items={layer.children!} depth={depth + 1} />
        )}
      </div>
    );
  };

  const SortableList = ({
    parentId,
    items,
    depth,
  }: {
    parentId: string | null;
    items: Layer[];
    depth: number;
  }) => (
    <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
      <div>
        {items.map((layer) => (
          <SortableRow key={layer.id} layer={layer} depth={depth} />
        ))}
      </div>
    </SortableContext>
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeParent = parentById.get(active.id as string) ?? null;
    const overParent = parentById.get(over.id as string) ?? null;
    if (activeParent !== overParent) return;

    const reorderInTree = (items: Layer[], parent: string | null): string[] | null => {
      const ids = items.map((i) => i.id);
      if (parent === activeParent && ids.includes(active.id) && ids.includes(over.id)) {
        const oldIndex = ids.indexOf(active.id);
        const newIndex = ids.indexOf(over.id);
        return arrayMove(ids, oldIndex, newIndex);
      }
      for (const item of items) {
        if (item.children?.length) {
          const res = reorderInTree(item.children, item.id);
          if (res) return res;
        }
      }
      return null;
    };

    const orderedIds = reorderInTree(filteredLayers, null);
    if (!orderedIds) return;
    onLayerReorder(activeParent, orderedIds);
  };

  useEffect(() => {
    if (!editingId) return;
    if (!parentById.has(editingId)) {
      setEditingId(null);
      setDraftName('');
    }
  }, [editingId, parentById]);

  return (
    <div
      className={
        expanded
          ? 'fixed left-4 bottom-4 z-50 w-[420px] h-[calc(100vh-120px)]'
          : 'fixed left-4 bottom-4 z-50 w-80 h-[420px]'
      }
    >
      <div className="h-full rounded-2xl border border-border bg-background/90 backdrop-blur-md overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="font-semibold text-sm">Layers</span>
              <span className="text-xs text-muted-foreground">({layers.length})</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => onExpandedChange(!expanded)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Close layers"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-border/60">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search layers"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredLayers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No layers</div>
                ) : (
                  <SortableList parentId={null} items={filteredLayers} depth={0} />
                )}
              </div>
            </ScrollArea>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;
