import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  serializeSelection,
  uploadThumbnail,
} from "@/lib/canvas/componentSerializer";
import type { Canvas as FabricCanvas, Object as FabricObject } from "fabric";

const CATEGORIES = ["Buttons", "Cards", "Icons", "Sections", "Custom"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: FabricCanvas | null;
  objects: FabricObject[];
  onSaved?: () => void;
}

export function SaveCanvasComponentDialog({
  open,
  onOpenChange,
  canvas,
  objects,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Custom");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!canvas || !objects.length) {
      toast({ title: "Nothing to save", variant: "destructive" });
      return;
    }
    const cleanName = name.trim() || "Untitled component";
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        toast({ title: "Sign in required", variant: "destructive" });
        setSaving(false);
        return;
      }

      const serialized = await serializeSelection(canvas, objects);
      let thumbUrl: string | null = null;
      try {
        thumbUrl = await uploadThumbnail(userId, serialized.thumbnail_blob);
      } catch (err) {
        console.warn("Thumbnail upload failed (saving without preview)", err);
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);

      const { error } = await supabase.from("canvas_components").insert({
        user_id: userId,
        name: cleanName,
        category: category.toLowerCase(),
        tags,
        fabric_json: serialized.fabric_json,
        thumbnail_url: thumbUrl,
        width: serialized.width,
        height: serialized.height,
      });
      if (error) throw error;

      toast({ title: `Saved "${cleanName}" to your component library` });
      onOpenChange(false);
      setName("");
      setTagsInput("");
      setCategory("Custom");
      onSaved?.();
    } catch (e: any) {
      console.error("Save component failed", e);
      toast({
        title: "Failed to save component",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Save as Component</DialogTitle>
          <DialogDescription>
            Save this {objects.length > 1 ? `${objects.length} elements` : "element"} as a reusable
            component you can drop into any project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary CTA button"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 text-sm rounded-md bg-background border border-border px-3 text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tags (comma-separated, optional)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="hero, cta, dark"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Component"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
