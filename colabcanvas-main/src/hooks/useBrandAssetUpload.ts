import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBrandAssetUpload = (brandId: string) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadAsset = async (file: File, sectionId?: string, blockId?: string) => {
    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${brandId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(50);

      const { data: urlData } = await supabase.storage
        .from('brand-assets')
        .createSignedUrl(fileName, 31536000); // 1 year

      const assetData = {
        brand_id: brandId,
        user_id: user.id,
        section_id: sectionId,
        block_id: blockId,
        file_name: file.name,
        file_path: fileName,
        storage_url: uploadData.path,
        signed_url: urlData?.signedUrl,
        file_size: file.size,
        mime_type: file.type,
        asset_type: file.type.split('/')[0],
      };

      const { data, error } = await supabase
        .from('brand_assets')
        .insert(assetData)
        .select()
        .single();

      if (error) throw error;

      setProgress(100);
      
      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded`,
      });

      return data;
    } catch (error: any) {
      console.error('Upload error details:', {
        error,
        brandId,
        sectionId,
        blockId,
        fileName: file.name
      });
      
      toast({
        title: 'Upload failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadAsset, uploading, progress };
};
