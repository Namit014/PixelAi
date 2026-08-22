/**
 * Video Frame Extraction Utility
 * Extracts individual frames from a video URL at native or specified FPS
 */

export interface VideoFrameData {
  index: number;              // Frame number (0-indexed)
  timestamp: number;          // Time in seconds
  dataUrl: string;            // Base64 frame image
}

export interface ExtractFramesOptions {
  targetFps?: number;         // Target FPS (default: 30)
  maxFrames?: number;         // Maximum frames to extract (default: 120)
  thumbnailSize?: number;     // Max dimension for thumbnails (default: 200)
  quality?: number;           // JPEG quality 0-1 (default: 0.7)
}

/**
 * Extract frames from a video URL
 * @param videoUrl - URL of the video to extract frames from
 * @param options - Extraction options
 * @param onProgress - Optional progress callback (0-100)
 * @returns Promise resolving to array of VideoFrameData
 */
export async function extractVideoFrames(
  videoUrl: string,
  options: ExtractFramesOptions = {},
  onProgress?: (progress: number) => void
): Promise<VideoFrameData[]> {
  const {
    targetFps = 30,
    maxFrames = 120,
    thumbnailSize = 200,
    quality = 0.7
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let frames: VideoFrameData[] = [];
    let totalFrames = 0;
    let currentFrameIndex = 0;

    // Create canvas for frame capture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const extractNextFrame = async () => {
      if (currentFrameIndex >= totalFrames) {
        // All frames extracted
        video.remove();
        resolve(frames);
        return;
      }

      const timestamp = currentFrameIndex / targetFps;
      video.currentTime = timestamp;
    };

    video.onseeked = () => {
      try {
        // Draw current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Export as data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        frames.push({
          index: currentFrameIndex,
          timestamp: currentFrameIndex / targetFps,
          dataUrl
        });

        // Report progress
        if (onProgress) {
          const progress = Math.round(((currentFrameIndex + 1) / totalFrames) * 100);
          onProgress(progress);
        }

        currentFrameIndex++;
        extractNextFrame();
      } catch (err) {
        reject(err);
      }
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Calculate total frames (capped at maxFrames)
      totalFrames = Math.min(Math.floor(duration * targetFps), maxFrames);

      // Set canvas size maintaining aspect ratio
      const aspectRatio = videoWidth / videoHeight;
      if (aspectRatio >= 1) {
        canvas.width = Math.min(thumbnailSize, videoWidth);
        canvas.height = Math.round(canvas.width / aspectRatio);
      } else {
        canvas.height = Math.min(thumbnailSize, videoHeight);
        canvas.width = Math.round(canvas.height * aspectRatio);
      }

      console.log(`📽️ Extracting ${totalFrames} frames at ${targetFps}fps from ${duration.toFixed(2)}s video`);

      // Start extraction
      extractNextFrame();
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for frame extraction'));
    };

    video.src = videoUrl;
    video.load();
  });
}

/**
 * Get video metadata (duration, dimensions, estimated FPS)
 */
export async function getVideoMetadata(videoUrl: string): Promise<{
  duration: number;
  width: number;
  height: number;
  estimatedFps: number;
  estimatedFrameCount: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const estimatedFps = 30; // HTML5 doesn't expose FPS
      
      resolve({
        duration,
        width: video.videoWidth,
        height: video.videoHeight,
        estimatedFps,
        estimatedFrameCount: Math.floor(duration * estimatedFps)
      });
      
      video.remove();
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };

    video.src = videoUrl;
    video.load();
  });
}
