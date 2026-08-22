import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UploadedAsset, UploadProgress } from '@/types/uploadedAsset';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export const useAssetUpload = (projectId: string, userId: string) => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [uploading, setUploading] = useState(false);

  // Show privacy confirmation on first upload
  useEffect(() => {
    const hasSeenMessage = localStorage.getItem('asset-upload-privacy-info');
    if (!hasSeenMessage) {
      toast.success('Files uploaded securely to your private storage', {
        duration: 5000,
      });
      localStorage.setItem('asset-upload-privacy-info', 'true');
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: JPG, PNG, WEBP, GIF, SVG.`;
    }
    return null;
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  };

  const uploadAsset = async (file: File): Promise<UploadedAsset> => {
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: { fileName: file.name, progress: 0, status: 'uploading' }
    }));

    try {
      // Get image dimensions
      const { width, height } = await getImageDimensions(file);

      // Upload to Supabase Storage
      const filePath = `${userId}/${projectId}/${Date.now()}-${file.name}`;
      
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], progress: 30 }
      }));

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], progress: 60, status: 'processing' }
      }));

      // Get signed URL (1-hour expiry for private bucket)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('design-assets')
        .createSignedUrl(filePath, 3600);

      if (urlError || !urlData?.signedUrl) {
        throw new Error('Failed to generate signed URL');
      }

      const signedUrl = urlData.signedUrl;

      // Save metadata to database
      const { data: assetData, error: dbError } = await supabase
        .from('uploaded_assets')
        .insert({
          user_id: userId,
          project_id: projectId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          storage_url: signedUrl,
          width,
          height
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], progress: 100, status: 'complete' }
      }));

      // Clear progress after 2 seconds
      setTimeout(() => {
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
      }, 2000);

      return assetData;
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { 
          ...prev[fileId], 
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      throw error;
    }
  };

  const uploadMultiple = async (files: File[]): Promise<UploadedAsset[]> => {
    setUploading(true);
    const results: UploadedAsset[] = [];
    
    try {
      for (const file of files) {
        try {
          const asset = await uploadAsset(file);
          results.push(asset);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      return results;
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (assetId: string, filePath: string): Promise<void> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('design-assets')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('uploaded_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) throw dbError;

      toast.success('Asset deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  return {
    uploadAsset,
    uploadMultiple,
    deleteAsset,
    uploading,
    uploadProgress
  };
};
