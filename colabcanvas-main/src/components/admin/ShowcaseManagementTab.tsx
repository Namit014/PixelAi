import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Upload, Eye, Heart, Images } from 'lucide-react';

interface ShowcaseItem {
  id: string;
  image_url: string;
  title: string;
  creator_name: string;
  creator_avatar_url: string | null;
  tags: string[];
  views_count: number;
  likes_count: number;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

const AVAILABLE_TAGS = [
  'Branding', 'Posters & Ads', 'Illustration', 'UI Layout',
  'Character Design', 'Product Design', 'Typography', 'Social Media',
];

export const ShowcaseManagementTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newCreatorName, setNewCreatorName] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkCreatorName, setBulkCreatorName] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('design_showcase')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setItems((data as ShowcaseItem[]) || []);
    setLoading(false);
  };

  const uploadImageToStorage = async (file: File, userId: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const filePath = `${userId}/showcase/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('reference-images')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('reference-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!newImageFile || !newTitle.trim()) {
      toast({ title: 'Missing fields', description: 'Title and image are required', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const publicUrl = await uploadImageToStorage(newImageFile, user.id);

      const { error: insertError } = await supabase
        .from('design_showcase')
        .insert({
          image_url: publicUrl,
          title: newTitle.trim(),
          creator_name: newCreatorName.trim() || 'Anonymous',
          tags: newTags,
          created_by: user.id,
          sort_order: items.length,
        });
      if (insertError) throw insertError;

      toast({ title: 'Success', description: 'Showcase item added' });
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Bulk upload handler
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBulkFiles(files);
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;

    setBulkUploading(true);
    setBulkProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let successCount = 0;
      for (let i = 0; i < bulkFiles.length; i++) {
        const file = bulkFiles[i];
        try {
          const publicUrl = await uploadImageToStorage(file, user.id);
          const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

          await supabase.from('design_showcase').insert({
            image_url: publicUrl,
            title,
            creator_name: bulkCreatorName.trim() || 'Anonymous',
            tags: bulkTags,
            created_by: user.id,
            sort_order: items.length + i,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        }
        setBulkProgress(Math.round(((i + 1) / bulkFiles.length) * 100));
      }

      toast({ title: 'Bulk upload complete', description: `${successCount}/${bulkFiles.length} images uploaded` });
      setBulkFiles([]);
      setBulkCreatorName('');
      setBulkTags([]);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      fetchItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setBulkUploading(false);
      setBulkProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('design_showcase').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchItems();
    }
  };

  const toggleVisibility = async (id: string, currentVisible: boolean) => {
    await supabase.from('design_showcase').update({ is_visible: !currentVisible }).eq('id', id);
    fetchItems();
  };

  const resetForm = () => {
    setNewTitle('');
    setNewCreatorName('');
    setNewTags([]);
    setNewImageFile(null);
    setNewImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTag = (tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Single Upload Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-zinc-400" />
          Add Showcase Item
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors min-h-[200px]"
            >
              {newImagePreview ? (
                <img src={newImagePreview} alt="Preview" className="max-h-[180px] rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                  <p className="text-sm text-zinc-500">Click to upload image</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Title</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Design title" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Creator Name</label>
              <Input value={newCreatorName} onChange={(e) => setNewCreatorName(e.target.value)} placeholder="Creator name (optional)" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag, setNewTags)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      newTags.includes(tag) ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                    }`}>{tag}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading || !newImageFile || !newTitle.trim()} className="w-full bg-blue-600 hover:bg-blue-500">
              {uploading ? 'Uploading...' : 'Add to Showcase'}
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Upload Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Images className="w-5 h-5 text-zinc-400" />
          Bulk Upload
        </h2>

        <div className="space-y-4">
          <div
            onClick={() => bulkFileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
          >
            <Upload className="w-6 h-6 text-zinc-500 mb-2" />
            <p className="text-sm text-zinc-500">
              {bulkFiles.length > 0 ? `${bulkFiles.length} files selected` : 'Click to select multiple images'}
            </p>
          </div>
          <input ref={bulkFileInputRef} type="file" accept="image/*" multiple onChange={handleBulkFileSelect} className="hidden" />

          {bulkFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {bulkFiles.map((f, i) => (
                <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs truncate max-w-[120px]">{f.name}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Creator Name (all)</label>
              <Input value={bulkCreatorName} onChange={(e) => setBulkCreatorName(e.target.value)} placeholder="Creator name" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Tags (all)</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag, setBulkTags)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                      bulkTags.includes(tag) ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                    }`}>{tag}</button>
                ))}
              </div>
            </div>
          </div>

          {bulkUploading && (
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${bulkProgress}%` }} />
            </div>
          )}

          <Button onClick={handleBulkUpload} disabled={bulkUploading || bulkFiles.length === 0} className="w-full bg-blue-600 hover:bg-blue-500">
            {bulkUploading ? `Uploading... ${bulkProgress}%` : `Upload ${bulkFiles.length} images`}
          </Button>
        </div>
      </div>

      {/* Existing Items */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          Manage Showcase ({items.length})
        </h2>

        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500">No showcase items yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id}
                className={`relative rounded-xl overflow-hidden border transition-all group ${
                  item.is_visible ? 'border-zinc-800' : 'border-red-900/50 opacity-60'
                }`}>
                <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover" />
                <div className="p-3 bg-zinc-800/50">
                  <p className="text-sm text-zinc-200 font-medium truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 mb-2">{item.creator_name}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags?.map((tag) => (
                      <Badge key={tag} className="bg-zinc-700 text-zinc-300 border-zinc-600 text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views_count}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{item.likes_count}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => toggleVisibility(item.id, item.is_visible)}
                      className="flex-1 text-xs bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                      {item.is_visible ? 'Hide' : 'Show'}
                    </Button>
                    <Button size="sm" onClick={() => handleDelete(item.id)}
                      className="bg-red-900/20 text-red-400 hover:bg-red-900/30 border-red-900/50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
