import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Plus, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CosmoAsset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  file_url: string;
  thumbnail_url: string | null;
  file_type: string;
  is_premium: boolean;
  created_at: string;
}

const CATEGORIES = ['icon', 'illustration', 'sticker', 'badge'] as const;

export function CosmoAssetLibraryTab() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<CosmoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newTags, setNewTags] = useState('');
  const [newCategory, setNewCategory] = useState<string>('icon');

  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cosmo_asset_library')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAssets(data as CosmoAsset[]);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'svg';
      const filePath = `${user.id}/cosmo-assets/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('design-assets').getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('cosmo_asset_library')
        .insert({
          name: file.name.replace(/\.[^.]+$/, ''),
          category: newCategory,
          tags,
          file_url: urlData.publicUrl,
          file_type: ext === 'png' ? 'png' : 'svg',
          uploaded_by: user.id,
        });

      if (insertError) {
        toast({ title: 'DB Error', description: insertError.message, variant: 'destructive' });
      }
    }

    toast({ title: 'Upload complete', description: `${files.length} asset(s) uploaded.` });
    setUploading(false);
    setNewTags('');
    loadAssets();
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('cosmo_asset_library').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAssets(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Deleted', description: 'Asset removed.' });
    }
  };

  const filtered = filterCategory === 'all' ? assets : assets.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-zinc-400" />
          Upload Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Tags (comma separated)"
            className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 col-span-2"
            value={newTags}
            onChange={e => setNewTags(e.target.value)}
          />
          <div className="relative">
            <input
              type="file"
              accept=".svg,.png,.webp,.jpg,.jpeg"
              multiple
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-zinc-500">Supported: SVG, PNG, WebP, JPG. Multiple files at once.</p>
      </div>

      {/* Assets Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Image className="w-5 h-5 text-zinc-400" />
            Asset Library ({filtered.length})
          </h2>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-500 text-center py-12">No assets uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(asset => (
              <div key={asset.id} className="group relative bg-zinc-800/50 border border-zinc-800 rounded-xl p-3 hover:bg-zinc-800 transition-colors">
                <div className="aspect-square rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden mb-2">
                  <img
                    src={asset.thumbnail_url || asset.file_url}
                    alt={asset.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <p className="text-xs text-zinc-300 truncate font-medium">{asset.name}</p>
                <Badge className="mt-1 bg-zinc-700 text-zinc-400 border-zinc-600 text-[10px] capitalize">
                  {asset.category}
                </Badge>
                {asset.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-[9px] text-zinc-500 bg-zinc-800 px-1 rounded">{t}</span>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
