/**
 * High-Quality Background Removal using RMBG-1.4
 * 
 * v6: Trust the AI model more - minimal post-processing
 * - Removed aggressive mask expansion (was eating hair)
 * - Light blur only for anti-aliasing
 * - Gentle color correction only on truly edge pixels
 */

let pipelineInstance: any = null;
let envConfigured = false;
let currentModelName = '';

const MAX_PROCESSING_DIMENSION = 4096;

const isWebGPUAvailable = async (): Promise<boolean> => {
  try {
    // @ts-ignore
    if (!navigator.gpu) return false;
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
};

function prepareImageForProcessing(
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, 
  image: HTMLImageElement
): { wasResized: boolean } {
  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  let processWidth = originalWidth;
  let processHeight = originalHeight;

  if (originalWidth > MAX_PROCESSING_DIMENSION || originalHeight > MAX_PROCESSING_DIMENSION) {
    if (originalWidth > originalHeight) {
      processHeight = Math.round((originalHeight * MAX_PROCESSING_DIMENSION) / originalWidth);
      processWidth = MAX_PROCESSING_DIMENSION;
    } else {
      processWidth = Math.round((originalWidth * MAX_PROCESSING_DIMENSION) / originalHeight);
      processHeight = MAX_PROCESSING_DIMENSION;
    }

    canvas.width = processWidth;
    canvas.height = processHeight;
    ctx.drawImage(image, 0, 0, processWidth, processHeight);
    return { wasResized: true };
  }

  canvas.width = originalWidth;
  canvas.height = originalHeight;
  ctx.drawImage(image, 0, 0);
  return { wasResized: false };
}

function scaleMaskBilinear(
  mask: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const result = new Float32Array(dstWidth * dstHeight);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const y1 = Math.min(y0 + 1, srcHeight - 1);
      
      const fx = srcX - x0;
      const fy = srcY - y0;
      
      const v00 = mask[y0 * srcWidth + x0];
      const v10 = mask[y0 * srcWidth + x1];
      const v01 = mask[y1 * srcWidth + x0];
      const v11 = mask[y1 * srcWidth + x1];
      
      result[y * dstWidth + x] = 
        v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy;
    }
  }
  
  return result;
}

function toFloat32Normalized(data: Float32Array | Uint8Array): Float32Array {
  const result = new Float32Array(data.length);
  const isBytes = data[0] > 1 || (data.length > 100 && data[100] > 1);
  const scale = isBytes ? 1 / 255 : 1;
  
  for (let i = 0; i < data.length; i++) {
    result[i] = Math.max(0, Math.min(1, data[i] * scale));
  }
  
  return result;
}

/**
 * Min/max normalization - stretch mask values to use full 0-1 range
 * This helps when the model outputs a narrow value range
 */
function normalizeMinMax(data: Float32Array): Float32Array {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  
  const range = max - min;
  if (range < 0.01) return data; // Already flat, don't divide by near-zero
  
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] - min) / range;
  }
  return result;
}

/**
 * Soft threshold - preserve edge gradients while making solid areas more solid
 * Values below 'low' become 0, above 'high' become 1, in-between are stretched
 */
function softThreshold(data: Float32Array, low: number = 0.05, high: number = 0.95): Float32Array {
  const result = new Float32Array(data.length);
  const range = high - low;
  
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v <= low) result[i] = 0;
    else if (v >= high) result[i] = 1;
    else result[i] = (v - low) / range;
  }
  return result;
}

/**
 * Light 3x3 Gaussian blur - just for anti-aliasing edges
 */
function lightBlur(data: Float32Array, width: number, height: number): Float32Array {
  const result = new Float32Array(data.length);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const val = data[idx];
      
      // Only blur edge pixels - leave solid areas alone
      if (val > 0.02 && val < 0.98) {
        let sum = 0;
        let kIdx = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nx = Math.max(0, Math.min(width - 1, x + kx));
            const ny = Math.max(0, Math.min(height - 1, y + ky));
            sum += data[ny * width + nx] * kernel[kIdx++];
          }
        }
        
        result[idx] = sum / kernelSum;
      } else {
        result[idx] = val;
      }
    }
  }
  
  return result;
}

/**
 * Gentle color correction ONLY for truly edge pixels (very narrow band)
 * This prevents dark fringing without affecting hair/shadows
 */
function gentleColorCorrection(
  imageData: ImageData,
  mask: Float32Array,
  width: number,
  height: number
): void {
  const data = imageData.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alpha = mask[idx];
      
      // VERY narrow band: only correct pixels with 10-50% alpha
      // These are the true edge pixels where fringing occurs
      // Above 50% = probably hair/detail, don't touch
      if (alpha > 0.10 && alpha < 0.50) {
        const pixelIdx = idx * 4;
        
        // Find nearest high-alpha pixel color
        let nearR = 0, nearG = 0, nearB = 0, nearCount = 0;
        
        // Small 5x5 search
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              // Use pixels with high alpha as reference
              if (mask[nIdx] > 0.85) {
                const nPixelIdx = nIdx * 4;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const weight = 1 / (1 + dist);
                nearR += data[nPixelIdx] * weight;
                nearG += data[nPixelIdx + 1] * weight;
                nearB += data[nPixelIdx + 2] * weight;
                nearCount += weight;
              }
            }
          }
        }
        
        if (nearCount > 0) {
          nearR /= nearCount;
          nearG /= nearCount;
          nearB /= nearCount;
          
          // Gentle blend - the more transparent, the more correction
          const t = (0.50 - alpha) / 0.40; // 0 at alpha=0.5, 1 at alpha=0.1
          const blend = t * 0.5; // Max 50% correction
          
          data[pixelIdx] = Math.round(data[pixelIdx] * (1 - blend) + nearR * blend);
          data[pixelIdx + 1] = Math.round(data[pixelIdx + 1] * (1 - blend) + nearG * blend);
          data[pixelIdx + 2] = Math.round(data[pixelIdx + 2] * (1 - blend) + nearB * blend);
        }
      }
    }
  }
}

export const removeBackgroundWithMask = async (imageElement: HTMLImageElement): Promise<{
  blob: Blob;
  mask: Float32Array;
  width: number;
  height: number;
}> => {
  try {
    console.log('🎨 BG Removal v6 - minimal processing, trust the AI');
    
    const originalWidth = imageElement.naturalWidth;
    const originalHeight = imageElement.naturalHeight;
    
    if (!pipelineInstance) {
      console.log('🔄 Calling local AI server for background removal...');
      const canvas = document.createElement('canvas');
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(imageElement, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const LOCAL_SERVER = import.meta.env.VITE_LOCAL_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${LOCAL_SERVER}/functions/v1/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: dataUrl,
          operation: 'remove_background',
          originalWidth,
          originalHeight
        })
      });

      if (!response.ok) {
        throw new Error('AI Background removal failed');
      }

      const resData = await response.json();
      if (!resData.imageUrl) {
        throw new Error('No image returned from AI');
      }

      // Convert result to image blob with alpha transparency for white pixels
      const resultImg = new Image();
      resultImg.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        resultImg.onload = res;
        resultImg.onerror = rej;
        resultImg.src = resData.imageUrl;
      });

      const outCanvas = document.createElement('canvas');
      outCanvas.width = resultImg.naturalWidth || originalWidth;
      outCanvas.height = resultImg.naturalHeight || originalHeight;
      const outCtx = outCanvas.getContext('2d')!;
      outCtx.drawImage(resultImg, 0, 0);

      const imgData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height);
      const d = imgData.data;
      // Key out pure white/near white pixels to create true PNG transparency
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r > 240 && g > 240 && b > 240) {
          d[i+3] = 0; // alpha = 0
        }
      }
      outCtx.putImageData(imgData, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Blob error')), 'image/png');
      });

      const dummyMask = new Float32Array(outCanvas.width * outCanvas.height).fill(1);
      return { blob, mask: dummyMask, width: outCanvas.width, height: outCanvas.height };
    }
    
    const processingCanvas = document.createElement('canvas');
    const processingCtx = processingCanvas.getContext('2d')!;
    const { wasResized } = prepareImageForProcessing(processingCanvas, processingCtx, imageElement);
    
    const processWidth = processingCanvas.width;
    const processHeight = processingCanvas.height;
    
    console.log('🤖 Running segmentation...');
    const result = await pipelineInstance(processingCanvas.toDataURL('image/png'));
    
    if (!result?.[0]?.mask?.data) {
      throw new Error('Segmentation failed');
    }
    
    // Get mask and normalize to 0-1
    let mask = toFloat32Normalized(result[0].mask.data);
    
    // Min/max normalization - stretch to use full range
    console.log('📊 Normalizing mask range...');
    mask = normalizeMinMax(mask);
    
    // Soft threshold - preserve edge gradients (0.05-0.95)
    mask = softThreshold(mask, 0.05, 0.95);
    
    // Light blur for anti-aliasing
    mask = lightBlur(mask, processWidth, processHeight);
    
    // Scale to original if needed
    if (wasResized) {
      mask = scaleMaskBilinear(mask, processWidth, processHeight, originalWidth, originalHeight);
      // One more light blur after scaling
      mask = lightBlur(mask, originalWidth, originalHeight);
    }
    
    // Create output
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = originalWidth;
    outputCanvas.height = originalHeight;
    const outputCtx = outputCanvas.getContext('2d')!;
    
    outputCtx.drawImage(imageElement, 0, 0);
    const imageData = outputCtx.getImageData(0, 0, originalWidth, originalHeight);
    
    // Gentle color correction only on true edge pixels
    console.log('🎨 Gentle edge color correction...');
    gentleColorCorrection(imageData, mask, originalWidth, originalHeight);
    
    // Apply alpha
    const pixels = imageData.data;
    for (let i = 0; i < mask.length; i++) {
      pixels[i * 4 + 3] = Math.round(mask[i] * 255);
    }
    
    outputCtx.putImageData(imageData, 0, 0);
    
    console.log('✅ Done - hair and shadows preserved');
    
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => blob ? resolve({ blob, mask, width: originalWidth, height: originalHeight }) : reject(new Error('Blob failed')),
        'image/png'
      );
    });
  } catch (error) {
    console.error('❌ BG removal failed:', error);
    throw error;
  }
};

export const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  return (await removeBackgroundWithMask(imageElement)).blob;
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
