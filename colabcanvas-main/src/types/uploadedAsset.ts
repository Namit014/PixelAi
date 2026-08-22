export interface UploadedAsset {
  id: string;
  user_id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  created_at: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}
