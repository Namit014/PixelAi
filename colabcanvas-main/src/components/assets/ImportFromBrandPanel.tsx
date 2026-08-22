import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface BrandAsset {
  id: string;
  brand_id: string;
  file_name: string;
  signed_url: string;
  asset_type: string;
  width: number;
  height: number;
  brands: {
    name: string;
  };
}

interface ImportFromBrandPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (asset: any) => void;
}

export const ImportFromBrandPanel = ({ open, onOpenChange, onImport }: ImportFromBrandPanelProps) => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadBrandAssets();
    }
  }, [open]);

  const loadBrandAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_assets')
        .select(`
          id,
          brand_id,
          file_name,
          signed_url,
          asset_type,
          width,
          height,
          brands!inner (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to load brand assets:', error);
      toast.error('Failed to load brand assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.brands.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImport = async (asset: BrandAsset) => {
    try {
      // Create design_assets entry and import
      const { data, error } = await supabase.functions.invoke('import-from-asset', {
        body: {
          assetId: asset.id,
          targetType: 'canvas',
          targetId: null
        }
      });

      if (error) throw error;

      onImport({
        url: asset.signed_url,
        width: asset.width,
        height: asset.height,
        name: asset.file_name,
        source: 'brand',
        brandName: asset.brands.name
      });

      toast.success(`Imported ${asset.file_name} from ${asset.brands.name}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to import asset:', error);
      toast.error('Failed to import asset');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import from Brand Assets</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search brand assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No brand assets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleImport(asset)}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                >
                  <img
                    src={asset.signed_url}
                    alt={asset.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                    <p className="text-white text-xs font-medium text-center mb-1">
                      {asset.brands.name}
                    </p>
                    <p className="text-white text-xs text-center truncate w-full">
                      {asset.file_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};