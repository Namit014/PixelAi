import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ImagePlaceholderIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.66992 18.9496L7.59992 15.6396C8.38992 15.1096 9.52992 15.1696 10.2399 15.7796L10.5699 16.0696C11.3499 16.7396 12.6099 16.7396 13.3899 16.0696L17.5499 12.4996C18.3299 11.8296 19.5899 11.8296 20.3699 12.4996L21.9999 13.8996" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface Asset {
  id: string;
  asset_type: string;
  source: string;
  signed_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  metadata: any;
}

interface AssetPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: Asset) => void;
}

export const AssetPickerModal = ({ open, onOpenChange, onSelect }: AssetPickerModalProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, activeTab]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      let allAssets: Asset[] = [];

      if (activeTab === 'all') {
        // Query both uploaded_assets and brand_assets
        const [canvasResult, brandResult] = await Promise.all([
          supabase.from('uploaded_assets').select('*').order('created_at', { ascending: false }).limit(25),
          supabase.from('brand_assets').select('*').order('created_at', { ascending: false }).limit(25)
        ]);

        if (canvasResult.error) throw canvasResult.error;
        if (brandResult.error) throw brandResult.error;

        // Transform uploaded_assets to Asset interface
        const canvasAssets: Asset[] = (canvasResult.data || []).map(asset => ({
          id: asset.id,
          asset_type: asset.mime_type.split('/')[0] || 'image',
          source: 'canvas',
          signed_url: asset.storage_url,
          thumbnail_url: asset.thumbnail_url || asset.storage_url,
          width: asset.width || 0,
          height: asset.height || 0,
          metadata: { name: asset.file_name }
        }));

        // Transform brand_assets to Asset interface
        const brandAssets: Asset[] = (brandResult.data || []).map(asset => ({
          id: asset.id,
          asset_type: asset.asset_type,
          source: 'brand',
          signed_url: asset.signed_url || asset.storage_url,
          thumbnail_url: asset.signed_url || asset.storage_url,
          width: asset.width || 0,
          height: asset.height || 0,
          metadata: { name: asset.file_name }
        }));

        allAssets = [...canvasAssets, ...brandAssets];
      } else if (activeTab === 'canvas') {
        const { data, error } = await supabase
          .from('uploaded_assets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        allAssets = (data || []).map(asset => ({
          id: asset.id,
          asset_type: asset.mime_type.split('/')[0] || 'image',
          source: 'canvas',
          signed_url: asset.storage_url,
          thumbnail_url: asset.thumbnail_url || asset.storage_url,
          width: asset.width || 0,
          height: asset.height || 0,
          metadata: { name: asset.file_name }
        }));
      } else if (activeTab === 'brand') {
        const { data, error } = await supabase
          .from('brand_assets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        allAssets = (data || []).map(asset => ({
          id: asset.id,
          asset_type: asset.asset_type,
          source: 'brand',
          signed_url: asset.signed_url || asset.storage_url,
          thumbnail_url: asset.signed_url || asset.storage_url,
          width: asset.width || 0,
          height: asset.height || 0,
          metadata: { name: asset.file_name }
        }));
      } else if (activeTab === 'cosmo') {
        const { data, error } = await supabase
          .from('design_assets')
          .select('*')
          .eq('source', 'cosmo')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        allAssets = data || [];
      }

      setAssets(allAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    return (
      asset.metadata?.name?.toLowerCase().includes(searchLower) ||
      asset.asset_type.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = async (asset: Asset) => {
    try {
      // Import the asset to get refreshed URL
      const { data, error } = await supabase.functions.invoke('import-from-asset', {
        body: { assetId: asset.id }
      });

      if (error) throw error;

      onSelect(data.asset);
      onOpenChange(false);
      toast.success('Asset imported successfully');
    } catch (error) {
      console.error('Failed to import asset:', error);
      toast.error('Failed to import asset');
    }
  };

  const getIcon = (source: string) => {
    switch (source) {
      case 'canvas': return <ImagePlaceholderIcon className="w-4 h-4" />;
      case 'brand': return <Palette className="w-4 h-4" />;
      case 'cosmo': return <FileText className="w-4 h-4" />;
      default: return <ImagePlaceholderIcon className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="inline-flex h-10 items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <TabsTrigger 
                value="all" 
                className="px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=inactive]:text-zinc-500 hover:text-zinc-700 dark:data-[state=active]:bg-zinc-700 dark:hover:text-zinc-300"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="canvas" 
                className="px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=inactive]:text-zinc-500 hover:text-zinc-700 dark:data-[state=active]:bg-zinc-700 dark:hover:text-zinc-300"
              >
                Canvas
              </TabsTrigger>
              <TabsTrigger 
                value="cosmo" 
                className="px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=inactive]:text-zinc-500 hover:text-zinc-700 dark:data-[state=active]:bg-zinc-700 dark:hover:text-zinc-300"
              >
                Cosmo
              </TabsTrigger>
              <TabsTrigger 
                value="brand" 
                className="px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=inactive]:text-zinc-500 hover:text-zinc-700 dark:data-[state=active]:bg-zinc-700 dark:hover:text-zinc-300"
              >
                Brand
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ImagePlaceholderIcon className="w-12 h-12 text-zinc-400 mb-2" />
                  <p className="text-sm text-zinc-500">No assets found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelect(asset)}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                    >
                      <img
                        src={asset.thumbnail_url || asset.signed_url}
                        alt={asset.asset_type}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            {getIcon(asset.source)}
                            <span className="text-xs capitalize">{asset.source}</span>
                          </div>
                          <p className="text-xs font-medium">{asset.asset_type}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};