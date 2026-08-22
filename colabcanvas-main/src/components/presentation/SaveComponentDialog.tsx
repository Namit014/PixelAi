import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { usePresentationStore } from '@/stores/presentationStore';
import type { ContentBlock } from '@/types/presentation';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: ContentBlock;
  slideId: string;
}

const CATEGORIES = ['Text', 'Layout', 'Data', 'Media', 'Chart', 'Custom'];

export function SaveComponentDialog({ open, onOpenChange, block, slideId }: Props) {
  const [name, setName] = useState(block.type as string);
  const [category, setCategory] = useState('Custom');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) { setSaving(false); return; }

    // Strip the id and regionId from the block data for the template
    const { id, regionId, ...blockTemplate } = block as any;

    const { error } = await supabase.from('cosmo_components').insert({
      user_id: userId,
      name: name.trim() || block.type,
      category,
      block_data: blockTemplate,
      description: `${block.type} component`,
      tags: [block.type, category.toLowerCase()],
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Saved "${name}" as component` });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Save as Component</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              placeholder="Component name"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-8 text-xs rounded-lg bg-muted/30 border border-border px-2 text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
