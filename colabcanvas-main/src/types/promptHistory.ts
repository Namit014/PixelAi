export interface PromptHistoryItem {
  id: string;
  projectId: string;
  prompt: string;
  status: 'queued' | 'generating' | 'success' | 'error';
  timestamp: Date;
  imageUrls?: string[];
  error?: string;
  imageCount?: number;
  size?: string;
}

export type PromptStatus = PromptHistoryItem['status'];
