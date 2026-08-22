import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Image, Palette, FolderOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePresentationStore } from '@/stores/presentationStore';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

interface AssetItem {
  name: string;
  url: string;
}

export function AssetBrowserDialog({ open, onOpenChange, onSelect }: Props) {
  const [tab, setTab] = useState('uploads');
  const [search, setSearch] = useState('');
  const [uploads, setUploads] = useState<AssetItem[]>([]);
  const [brandAssets, setBrandAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const activeBrandId = usePresentationStore((s) => s.activeBrandId);

  useEffect(() => {
    if (!open) return;
    loadAssets();
  }, [open, tab]);

  const loadAssets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (tab === 'uploads') {
      const { data } = await supabase.storage.from('design-assets').list(user.id, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
      if (data) {
        const items = data
          .filter(f => f.metadata?.mimetype?.startsWith('image/'))
          .map(f => {
            const { data: urlData } = supabase.storage.from('design-assets').getPublicUrl(`${user.id}/${f.name}`);
            return { name: f.name, url: urlData.publicUrl };
          });
        setUploads(items);
      }
    }

    if (tab === 'brand') {
      const brandId = activeBrandId;
      if (brandId) {
        const { data } = await supabase.from('brand_assets').select('file_name, storage_url, signed_url').eq('brand_id', brandId).eq('asset_type', 'image').limit(50);
        if (data) {
          setBrandAssets(data.map(a => ({ name: a.file_name, url: a.signed_url || a.storage_url })));
        }

        // Also get brand logos
        const { data: brand } = await supabase.from('brands').select('logo_primary_url, logo_secondary_url').eq('id', brandId).single();
        if (brand) {
          const logos: AssetItem[] = [];
          if (brand.logo_primary_url) logos.push({ name: 'Primary Logo', url: brand.logo_primary_url });
          if (brand.logo_secondary_url) logos.push({ name: 'Secondary Logo', url: brand.logo_secondary_url });
          setBrandAssets(prev => [...logos, ...prev]);
        }
      }
    }
    setLoading(false);
  };

  const handleSelect = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  const filterItems = (items: AssetItem[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q));
  };

  const renderGrid = (items: AssetItem[]) => {
    const filtered = filterItems(items);
    if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
    if (filtered.length === 0) return <div className="text-center text-xs text-muted-foreground py-12">No assets found</div>;
    return (
      <div className="grid grid-cols-3 gap-2 p-3">
        {filtered.map((item, i) => (
          <button
            key={i}
            onClick={() => handleSelect(item.url)}
            className="group relative aspect-square rounded-lg border border-border overflow-hidden hover:border-foreground/50 transition-colors"
          >
            <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
              <span className="text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 truncate w-full">{item.name}</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Insert Asset</DialogTitle>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs bg-muted/50 border-0" />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 h-8 bg-muted/50 rounded-lg">
            <TabsTrigger value="uploads" className="text-[11px] gap-1.5"><FolderOpen className="w-3 h-3" />Uploads</TabsTrigger>
            <TabsTrigger value="brand" className="text-[11px] gap-1.5"><Palette className="w-3 h-3" />Brand Assets</TabsTrigger>
          </TabsList>
          <TabsContent value="uploads" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-[300px]">{renderGrid(uploads)}</ScrollArea>
          </TabsContent>
          <TabsContent value="brand" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-[300px]">
              {!activeBrandId ? (
                <div className="text-center text-xs text-muted-foreground py-12">Select a brand in the Theme tab first</div>
              ) : renderGrid(brandAssets)}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}