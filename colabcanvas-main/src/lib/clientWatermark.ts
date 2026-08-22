import watermarkSvg from '@/assets/made_with_colab.svg';

/**
 * Applies a watermark to an image on the client-side
 * @param imageUrl - URL or data URL of the image to watermark
 * @returns Promise resolving to the watermarked image as a data URL
 */
export async function applyWatermarkToImage(imageUrl: string): Promise<string> {
  try {
    // Load the original image
    const img = await loadImage(imageUrl);
    
    // Create canvas matching image dimensions
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Load and draw watermark
    const watermarkImg = await loadSvgAsImage(watermarkSvg, 96, 22);
    
    // Set watermark opacity
    ctx.globalAlpha = 0.9;
    
    // Position watermark at bottom-left (20px padding)
    const x = 20;
    const y = canvas.height - 22 - 20; // 20px from bottom
    
    ctx.drawImage(watermarkImg, x, y, 96, 22);
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Convert to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error applying watermark:', error);
    // Return original image if watermarking fails
    return imageUrl;
  }
}

/**
 * Load an image from a URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = url;
  });
}

/**
 * Convert SVG to an Image element
 */
function loadSvgAsImage(svgUrl: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.width = width;
    img.height = height;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load SVG: ${e}`));
    img.src = svgUrl;
  });
}
