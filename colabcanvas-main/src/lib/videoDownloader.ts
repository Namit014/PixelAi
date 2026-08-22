/**
 * Download a video file from a URL
 * @param videoUrl - URL of the video to download
 * @param filename - Filename to save as (without extension)
 */
export async function downloadVideo(videoUrl: string, filename: string = 'video'): Promise<void> {
  try {
    // Fetch video as blob
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Create object URL
    const objectUrl = URL.createObjectURL(blob);
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${filename}.mp4`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    
    console.log('✅ Video downloaded:', filename);
  } catch (error) {
    console.error('❌ Failed to download video:', error);
    throw error;
  }
}

/**
 * Extract the first frame from a video as a poster image
 * @param videoUrl - URL of the video
 * @returns Promise resolving to a data URL of the poster image
 */
export async function extractVideoPoster(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to first frame
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      try {
        // Create canvas and draw first frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(video, 0, 0);
        
        // Export as data URL
        const posterDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Cleanup
        video.remove();
        
        resolve(posterDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for poster extraction'));
    };
    
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Get video duration from a URL
 * @param videoUrl - URL of the video
 * @returns Promise resolving to duration in seconds
 */
export async function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.remove();
      resolve(duration);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Format duration in seconds to MM:SS string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "00:04"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
