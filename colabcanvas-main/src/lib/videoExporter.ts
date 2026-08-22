export interface VideoExportOptions {
  duration: number; // seconds
  fps: number;
  format: 'webm' | 'mp4';
  quality: number; // 0-1
  width: number;
  height: number;
  onProgress?: (progress: number) => void;
}

export async function exportCanvasToVideo(
  canvas: HTMLCanvasElement,
  options: VideoExportOptions
): Promise<Blob> {
  const { duration, fps, format, quality } = options;
  
  // Check MediaRecorder support
  const mimeType = format === 'webm' ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    throw new Error(`${format} format not supported`);
  }

  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];
  
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: quality * 8000000, // Up to 8 Mbps for high quality
  });

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      reject(e);
    };

    recorder.start();

    // Progress tracking
    const totalFrames = duration * fps;
    let frameCount = 0;
    const progressInterval = setInterval(() => {
      frameCount++;
      if (options.onProgress) {
        options.onProgress(frameCount / totalFrames);
      }
    }, 1000 / fps);

    // Stop recording after duration
    setTimeout(() => {
      clearInterval(progressInterval);
      recorder.stop();
      stream.getTracks().forEach(track => track.stop());
    }, duration * 1000);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
