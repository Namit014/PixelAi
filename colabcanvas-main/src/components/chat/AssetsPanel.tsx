import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { X, Image as ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
interface Artboard {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
}
interface AssetsPanelProps {
  projectId: string;
  onClose: () => void;
}
const AssetsPanel = ({
  projectId,
  onClose
}: AssetsPanelProps) => {
  const [artboards, setArtboards] = useState<Artboard[]>([]);
  const [referenceImages, setReferenceImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driveUrl, setDriveUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  useEffect(() => {
    loadAssets();
  }, [projectId]);
  
  const loadAssets = async () => {
    setIsLoading(true);
    
    // Load artboards
    const { data: artboardData, error: artboardError } = await supabase
      .from('artboards')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (!artboardError && artboardData) {
      setArtboards(artboardData);
    }
    
    // Load reference images
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: refData, error: refError } = await supabase
        .from('reference_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!refError && refData) {
        setReferenceImages(refData);
      }
    }
    
    setIsLoading(false);
  };
  
  const handleImportFromDrive = async () => {
    if (!driveUrl.trim()) {
      toast.error('Please enter a Google Drive URL');
      return;
    }
    
    setIsImporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('import-reference-images', {
        body: { driveUrl, projectId }
      });
      
      if (error) throw error;
      
      toast.success(`Imported ${data.count} images successfully!`);
      setDriveUrl('');
      loadAssets(); // Reload to show new images
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import images');
    } finally {
      setIsImporting(false);
    }
  };
  return <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-zinc-100">
        <h3 className="font-semibold">Project Assets</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 bg-zinc-100">
        {/* Import from Google Drive */}
        <div className="mb-6 p-4 border border-border rounded-lg bg-background">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Import from Google Drive
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Paste your Google Drive folder URL (must be publicly accessible)
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://drive.google.com/drive/folders/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              disabled={isImporting}
            />
            <Button 
              onClick={handleImportFromDrive}
              disabled={isImporting || !driveUrl.trim()}
              size="sm"
            >
              {isImporting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reference Images */}
            {referenceImages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Reference Images ({referenceImages.length})
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {referenceImages.map((ref) => (
                    <div key={ref.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer bg-muted">
                      <img 
                        src={ref.thumbnail_url || ref.image_url} 
                        alt={ref.title || ref.file_name} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs font-medium truncate">
                            {ref.title || ref.file_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Generated Artboards */}
            {artboards.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Generated Designs ({artboards.length})</h4>
                <div className="grid grid-cols-2 gap-3">
                  {artboards.map((artboard) => (
                    <div key={artboard.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer bg-muted">
                      {artboard.image_url ? (
                        <img src={artboard.image_url} alt={artboard.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">
                            {artboard.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {artboards.length === 0 && referenceImages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No assets yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Import references or generate designs
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>;
};
export default AssetsPanel;