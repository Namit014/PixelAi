import { useState, useEffect, useRef } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UploadsPanelProps {
  canvas: FabricCanvas | null;
}

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_url: string | null;
  file_type: string;
  width: number | null;
  height: number | null;
}

interface UserFolder {
  id: string;
  name: string;
  uploadCount: number;
}

export function UploadsPanel({ canvas }: UploadsPanelProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUploads();
      loadFolders();
    }
  }, [user]);

  const loadUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('design_user_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error loading uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    if (!user) return;

    try {
      const { data: foldersData, error } = await supabase
        .from('design_user_folders')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const foldersWithCounts = await Promise.all(
        (foldersData || []).map(async (folder) => {
          const { count } = await supabase
            .from('design_user_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);

          return {
            ...folder,
            uploadCount: count || 0,
          };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('design-tool-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('design-tool-uploads')
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('design_user_uploads')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            thumbnail_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });

        if (dbError) throw dbError;
      }

      toast.success(`${files.length} file(s) uploaded successfully`);
      loadUploads();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addUploadToCanvas = async (upload: UserUpload) => {
    if (!canvas) return;

    try {
      const { data: { publicUrl } } = supabase.storage
        .from('design-tool-uploads')
        .getPublicUrl(upload.file_path);

      const img = await FabricImage.fromURL(publicUrl);

      const maxWidth = canvas.width! * 0.5;
      const maxHeight = canvas.height! * 0.5;
      const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!, 1);

      img.scale(scale);
      img.set({
        left: canvas.width! / 2 - (img.width! * scale) / 2,
        top: canvas.height! / 2 - (img.height! * scale) / 2,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    } catch (error) {
      console.error('Error adding upload to canvas:', error);
      toast.error('Failed to add image to canvas');
    }
  };

  return (
    <div className="w-80 border-r border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Uploads</h3>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full mb-2"
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload (PNG, JPG, SVG, WEBP)'}
        </Button>
        <Button variant="outline" className="w-full">
          <FolderPlus className="w-4 h-4 mr-2" />
          Add New Folder
        </Button>
      </div>

      <Tabs defaultValue="uploads" className="flex-1 flex flex-col">
        <TabsList className="mx-4 grid grid-cols-2">
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="uploads" className="p-4 mt-0">
            <div className="grid grid-cols-2 gap-2">
              {uploads.map((upload) => (
                <button
                  key={upload.id}
                  onClick={() => addUploadToCanvas(upload)}
                  className="aspect-square bg-muted rounded-lg hover:opacity-80 transition-opacity overflow-hidden"
                >
                  {upload.thumbnail_url ? (
                    <img
                      src={upload.thumbnail_url}
                      alt={upload.file_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/150x150?text=Upload';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2">
                      {upload.file_name}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {uploads.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                No uploads yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="folders" className="p-4 mt-0">
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="w-full p-3 bg-muted rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="font-medium">{folder.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {folder.uploadCount} Uploads
                  </div>
                </button>
              ))}
              <Button variant="ghost" className="w-full">
                Show All Folders
              </Button>
            </div>

            {folders.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                No folders yet
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}