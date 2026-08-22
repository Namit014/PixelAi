import { useEffect, useMemo, useState } from "react";
import { X, Search, Trash2, Pencil, RefreshCw, MoreVertical } from "lucide-react";
import ComponentIconUrl from "@/assets/icons/component.svg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  instantiateComponent,
  getViewportCenter,
  serializeSelection,
  uploadThumbnail,
} from "@/lib/canvas/componentSerializer";
import type { Canvas as FabricCanvas, Object as FabricObject } from "fabric";

interface CanvasComponent {
  id: string;
  name: string;
  category: string;
  tags: string[];
  fabric_json: any;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  version: number;
  usage_count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  canvas: FabricCanvas | null;
}

const CATEGORIES = ["all", "buttons", "cards", "icons", "sections", "custom"];

export function CanvasComponentsPanel({ open, onClose, canvas }: Props) {
  const [components, setComponents] = useState<CanvasComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("canvas_components")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load components", description: error.message, variant: "destructive" });
    } else {
      setComponents((data ?? []) as CanvasComponent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return components.filter((c) => {
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [components, search, activeCategory]);

  const insert = async (c: CanvasComponent) => {
    if (!canvas) {
      toast({ title: "Canvas not ready", variant: "destructive" });
      return;
    }
    const point = getViewportCenter(canvas);
    const obj = await instantiateComponent(canvas, c, point);
    if (obj) {
      // Bump usage_count fire-and-forget
      supabase
        .from("canvas_components")
        .update({ usage_count: c.usage_count + 1 })
        .eq("id", c.id)
        .then(({ error }) => {
          if (error) console.warn("usage_count bump failed", error);
        });
      toast({ title: `Inserted "${c.name}"` });
    } else {
      toast({ title: "Could not instantiate component", variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, c: CanvasComponent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-canvas-component", c.id);
    e.dataTransfer.setData("text/plain", c.name);
  };

  const handleDelete = async (c: CanvasComponent) => {
    if (!confirm(`Delete component "${c.name}"?`)) return;
    const { error } = await supabase.from("canvas_components").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setComponents((prev) => prev.filter((x) => x.id !== c.id));
    toast({ title: "Component deleted" });
  };

  const handleRename = async (c: CanvasComponent) => {
    const next = window.prompt("Rename component", c.name);
    if (!next || next.trim() === c.name) return;
    const { error } = await supabase
      .from("canvas_components")
      .update({ name: next.trim() })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
      return;
    }
    setComponents((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: next.trim() } : x)));
  };

  const handleUpdateFromSelection = async (c: CanvasComponent) => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    const sel: FabricObject[] =
      active && (active as any).type === "activeSelection"
        ? ((active as any).getObjects() as FabricObject[])
        : active
        ? [active as FabricObject]
        : [];
    if (!sel.length) {
      toast({ title: "Select something on the canvas first", variant: "destructive" });
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      const serialized = await serializeSelection(canvas, sel);
      let thumbUrl: string | null = c.thumbnail_url;
      try {
        thumbUrl = await uploadThumbnail(userId, serialized.thumbnail_blob);
      } catch (err) {
        console.warn("Thumbnail upload failed", err);
      }
      const { error } = await supabase
        .from("canvas_components")
        .update({
          fabric_json: serialized.fabric_json,
          width: serialized.width,
          height: serialized.height,
          thumbnail_url: thumbUrl,
          version: c.version + 1,
        })
        .eq("id", c.id);
      if (error) throw error;
      toast({ title: `Updated "${c.name}"` });
      load();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Unknown", variant: "destructive" });
    }
  };

  if (!open) return null;

  return (
    <div className="absolute left-16 top-1/2 -translate-y-1/2 z-40 w-[320px] max-h-[80vh] flex flex-col rounded-xl border border-border bg-background pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={ComponentIconUrl} alt="" className="w-4 h-4 [filter:var(--icon-filter,none)]" />
          <span className="text-sm font-semibold">Components</span>
          <span className="text-[10px] text-muted-foreground">({components.length})</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-12 px-4">
            <img src={ComponentIconUrl} alt="" className="w-8 h-8 mx-auto mb-2 opacity-40 [filter:var(--icon-filter,none)]" />
            <p>No components yet.</p>
            <p className="mt-1 text-[10px]">
              Right-click any element on the canvas → "Save as Component" to start your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => handleDragStart(e, c)}
                onClick={() => insert(c)}
                className="group relative aspect-square rounded-lg border border-border bg-muted/40 hover:border-foreground/40 hover:shadow-md cursor-grab active:cursor-grabbing overflow-hidden transition-all"
                title={`Click or drag to insert "${c.name}"`}
              >
                {c.thumbnail_url ? (
                  <img
                    src={c.thumbnail_url}
                    alt={c.name}
                    className="absolute inset-0 w-full h-full object-contain p-2"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent px-2 py-1.5 flex items-end justify-between">
                  <span className="text-[10px] font-medium truncate text-foreground">{c.name}</span>
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-6 rounded bg-background/90 border border-border flex items-center justify-center hover:bg-background"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleRename(c)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateFromSelection(c)}>
                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                        Update from selection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(c)} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
