import type { ShaderConfig } from './shaderDefinitions';
import { ShaderRenderer } from './ShaderRenderer';

interface ShaderState {
  renderer: ShaderRenderer | null;
  offscreenCanvas: HTMLCanvasElement | null;
  animationId: number | null;
  isDisposed: boolean;
  originalTexture: HTMLCanvasElement | null;
  compositeCanvas: HTMLCanvasElement | null;
  compositeCtx: CanvasRenderingContext2D | null;
  // NEW: Cached image for 60fps performance - NO toDataURL
  cachedImageBitmap: ImageBitmap | null;
  cachedImage: HTMLImageElement | null;
  lastFrameTime: number;
  // For shape restoration
  originalShapeData: any;
  wasShape: boolean;
}

const activeShaders = new Map<string, ShaderState>();

export async function applyShaderToObject(
  object: any,
  shaderConfig: ShaderConfig,
  parentCanvas: HTMLCanvasElement,
  fabricCanvas: any,
  containerElement: HTMLElement
): Promise<void> {
  if (!object) return;

  removeShaderFromObject(object);

  const objectId = object.id || object.__uid || `obj_${Date.now()}`;
  
  try {
    let originalImageData: string | null = null;
    let originalElement: HTMLImageElement | HTMLCanvasElement | null = null;
    let wasShape = false;
    let originalShapeData: any = null;
    
    // Handle different object types
    if (object.type === 'image' && object._element) {
      originalElement = object._element;
      try {
        originalImageData = object.toDataURL({ format: 'png' });
      } catch (e) {}
    } else if (['rect', 'circle', 'ellipse', 'polygon', 'triangle', 'path'].includes(object.type)) {
      // SHAPE: Convert to image first
      wasShape = true;
      originalShapeData = {
        type: object.type,
        fill: object.fill,
        stroke: object.stroke,
        strokeWidth: object.strokeWidth,
      };
    }

    object.set('__originalImageData', originalImageData);
    object.set('__originalElement', originalElement);
    object.set('__shaderConfig', shaderConfig);
    object.set('__hasShader', true);
    object.set('__objectId', objectId);

    const scale = Math.max(object.scaleX || 1, object.scaleY || 1, 1);
    const width = Math.max(Math.round(object.width * scale), 128);
    const height = Math.max(Math.round(object.height * scale), 128);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    // Pre-allocate composite canvas for 60fps performance
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const compositeCtx = compositeCanvas.getContext('2d', { 
      willReadFrequently: false,
      alpha: true 
    });

    const renderer = new ShaderRenderer(offscreenCanvas, shaderConfig);
    const originalTexture = await objectToTexture(object, width, height);
    
    if (originalTexture) {
      renderer.setTexture(originalTexture);
    }

    // Pre-create cached image element (reused every frame - NO new Image())
    const cachedImage = new Image();
    cachedImage.width = width;
    cachedImage.height = height;

    const shaderState: ShaderState = {
      renderer,
      offscreenCanvas,
      animationId: null,
      isDisposed: false,
      originalTexture,
      compositeCanvas,
      compositeCtx,
      cachedImageBitmap: null,
      cachedImage,
      lastFrameTime: 0,
      originalShapeData,
      wasShape
    };
    activeShaders.set(objectId, shaderState);

    if (shaderConfig.isAnimated) {
      startAnimatedShader(object, shaderState, fabricCanvas, shaderConfig);
    } else {
      await applyStaticShader(object, shaderState, fabricCanvas, shaderConfig);
    }

    if (fabricCanvas) {
      object.setCoords();
      fabricCanvas.fire('object:modified', { target: object });
      fabricCanvas.requestRenderAll();
    }
  } catch (error) {
    console.error('Failed to apply shader:', error);
    object.set('__shaderConfig', null);
    object.set('__hasShader', false);
  }
}

async function objectToTexture(object: any, width: number, height: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get 2D context');

  if (object.type === 'image' && object._element) {
    ctx.drawImage(object._element, 0, 0, width, height);
  } else {
    // For shapes and other objects: render to canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Clone object and render centered
    const cloneData = object.toObject();
    const fabric = (window as any).fabric;
    
    if (fabric) {
      await new Promise<void>((resolve) => {
        fabric.util.enlivenObjects([cloneData], (objects: any[]) => {
          if (objects[0]) {
            const clone = objects[0];
            clone.set({
              left: width / 2,
              top: height / 2,
              originX: 'center',
              originY: 'center',
              scaleX: 1,
              scaleY: 1
            });
            
            const tempFabricCanvas = new fabric.StaticCanvas(tempCanvas);
            tempFabricCanvas.add(clone);
            tempFabricCanvas.renderAll();
            
            ctx.drawImage(tempCanvas, 0, 0);
            tempFabricCanvas.dispose();
          }
          resolve();
        });
      });
    } else {
      // Fallback: use toDataURL
      const dataUrl = object.toDataURL({ format: 'png', multiplier: 1 });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, width, height); resolve(); };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }
  }
  
  return canvas;
}

async function applyStaticShader(
  object: any,
  state: ShaderState,
  fabricCanvas: any,
  shaderConfig: ShaderConfig
): Promise<void> {
  if (!state.renderer) return;

  return new Promise((resolve) => {
    state.renderer!.start();
    requestAnimationFrame(() => {
      if (state.isDisposed) { resolve(); return; }
      applyShaderResultToObject(object, state, shaderConfig, fabricCanvas);
      state.renderer?.stop();
      resolve();
    });
  });
}

function startAnimatedShader(
  object: any,
  state: ShaderState,
  fabricCanvas: any,
  shaderConfig: ShaderConfig
): void {
  if (!state.renderer) return;
  state.renderer.start();

  // Pure 60fps animation loop - NO toDataURL, use createImageBitmap
  const updateFrame = async () => {
    if (state.isDisposed) return;
    
    // Throttle to 60fps max
    const now = performance.now();
    if (now - state.lastFrameTime < 16) {
      state.animationId = requestAnimationFrame(updateFrame) as unknown as number;
      return;
    }
    state.lastFrameTime = now;
    
    await applyShaderResultToObjectFast(object, state, shaderConfig, fabricCanvas);
    state.animationId = requestAnimationFrame(updateFrame) as unknown as number;
  };

  state.animationId = requestAnimationFrame(updateFrame) as unknown as number;
}

async function applyShaderResultToObjectFast(
  object: any,
  state: ShaderState,
  shaderConfig: ShaderConfig,
  fabricCanvas: any
): Promise<void> {
  if (!state.offscreenCanvas || !state.compositeCanvas || !state.compositeCtx) return;

  const width = state.offscreenCanvas.width;
  const height = state.offscreenCanvas.height;
  const ctx = state.compositeCtx;
  const blendMode = shaderConfig.blendMode || 'screen';
  const requiresTexture = shaderConfig.requiresTexture;

  // Clear composite canvas
  ctx.clearRect(0, 0, width, height);

  if (requiresTexture && state.originalTexture) {
    // TEXTURE-BASED SHADER: Draw original first, blend shader on top
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(state.originalTexture, 0, 0);

    // Apply shader with proper blend mode
    const blendMap: Record<string, GlobalCompositeOperation> = {
      'replace': 'source-over',
      'overlay': 'overlay',
      'multiply': 'multiply', 
      'screen': 'screen',
      'add': 'lighter',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'color-dodge': 'color-dodge'
    };

    if (blendMode === 'replace') {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.drawImage(state.offscreenCanvas, 0, 0);
    } else {
      ctx.globalCompositeOperation = blendMap[blendMode] || 'screen';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.offscreenCanvas, 0, 0);
    }
  } else if (state.originalTexture) {
    // GENERATIVE SHADER: Need alpha masking so shader respects original shape
    
    // Step 1: Draw shader output
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(state.offscreenCanvas, 0, 0);
    
    // Step 2: ALPHA MASK - Use original's alpha to clip shader
    // This makes generative shaders ONLY appear where original object exists
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(state.originalTexture, 0, 0);
    
    // Step 3: (Optional) Blend original back for semi-transparency
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // No original texture - just use shader directly
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(state.offscreenCanvas, 0, 0);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  // FAST PATH: Use createImageBitmap instead of toDataURL (10-50x faster!)
  try {
    const bitmap = await createImageBitmap(state.compositeCanvas);
    
    // Dispose old bitmap
    if (state.cachedImageBitmap) {
      state.cachedImageBitmap.close();
    }
    state.cachedImageBitmap = bitmap;
    
    // Create temporary canvas from bitmap and set as element
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(bitmap, 0, 0);
      
      if (object.type === 'image') {
        // Direct element swap - fastest
        const img = new Image();
        img.onload = () => {
          if (state.isDisposed) return;
          object.setElement(img);
          fabricCanvas?.requestRenderAll();
        };
        // Use blob URL instead of dataURL for better performance
        tempCanvas.toBlob((blob) => {
          if (blob && !state.isDisposed) {
            const url = URL.createObjectURL(blob);
            img.src = url;
            // Clean up blob URL after load
            img.onload = () => {
              if (state.isDisposed) return;
              object.setElement(img);
              fabricCanvas?.requestRenderAll();
              URL.revokeObjectURL(url);
            };
          }
        }, 'image/png');
      } else {
        // For shapes: use pattern fill
        const fabric = (window as any).fabric;
        if (fabric?.Pattern) {
          object.set({ 
            fill: new fabric.Pattern({ 
              source: tempCanvas, 
              repeat: 'no-repeat' 
            }), 
            dirty: true 
          });
          fabricCanvas?.requestRenderAll();
        }
      }
    }
  } catch (e) {
    // Fallback to slower method if createImageBitmap fails
    applyShaderResultToObject(object, state, shaderConfig, fabricCanvas);
  }
}

function applyShaderResultToObject(
  object: any,
  state: ShaderState,
  shaderConfig: ShaderConfig,
  fabricCanvas: any
): void {
  if (!state.offscreenCanvas || !state.compositeCanvas || !state.compositeCtx) return;

  const width = state.offscreenCanvas.width;
  const height = state.offscreenCanvas.height;
  const ctx = state.compositeCtx;
  const blendMode = shaderConfig.blendMode || 'screen';
  const requiresTexture = shaderConfig.requiresTexture;

  // Clear and prepare
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  if (requiresTexture && state.originalTexture) {
    // TEXTURE SHADER: Original first, blend shader on top
    ctx.drawImage(state.originalTexture, 0, 0);

    const blendMap: Record<string, GlobalCompositeOperation> = {
      'replace': 'source-over',
      'overlay': 'overlay',
      'multiply': 'multiply', 
      'screen': 'screen',
      'add': 'lighter',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'color-dodge': 'color-dodge'
    };

    if (blendMode === 'replace') {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(state.offscreenCanvas, 0, 0);
    } else {
      ctx.globalCompositeOperation = blendMap[blendMode] || 'screen';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.offscreenCanvas, 0, 0);
    }
  } else if (state.originalTexture) {
    // GENERATIVE SHADER with alpha masking
    ctx.drawImage(state.offscreenCanvas, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(state.originalTexture, 0, 0);
  } else {
    ctx.drawImage(state.offscreenCanvas, 0, 0);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  // Static shader: Use cached image with reused element
  if (state.cachedImage) {
    state.cachedImage.onload = () => {
      if (state.isDisposed) return;
      if (object.type === 'image') {
        object.setElement(state.cachedImage);
      } else {
        const fabric = (window as any).fabric;
        if (fabric?.Pattern) {
          object.set({ 
            fill: new fabric.Pattern({ 
              source: state.cachedImage, 
              repeat: 'no-repeat' 
            }), 
            dirty: true 
          });
        }
      }
      fabricCanvas?.requestRenderAll();
    };
    state.cachedImage.src = state.compositeCanvas.toDataURL('image/png');
  }
}

export function removeShaderFromObject(object: any): void {
  if (!object) return;

  const objectId = object.__objectId;
  
  if (objectId) {
    const state = activeShaders.get(objectId);
    if (state) {
      state.isDisposed = true;
      if (state.animationId) cancelAnimationFrame(state.animationId);
      if (state.cachedImageBitmap) state.cachedImageBitmap.close();
      state.renderer?.dispose();
      activeShaders.delete(objectId);
    }
  }

  const originalElement = object.__originalElement;
  if (originalElement && object.type === 'image') {
    object.setElement(originalElement);
    if (object.canvas) {
      object.setCoords();
      object.canvas.fire('object:modified', { target: object });
      object.canvas.renderAll();
    }
  }

  object.set('__shaderConfig', null);
  object.set('__hasShader', false);
  object.set('__originalImageData', null);
  object.set('__originalElement', null);
  object.set('__objectId', null);
  
  if (object.canvas) object.canvas.fire('object:modified', { target: object });
}

export function updateShaderUniform(object: any, name: string, value: number | number[]): void {
  const objectId = object?.__objectId;
  if (!objectId) return;
  const state = activeShaders.get(objectId);
  if (state?.renderer) state.renderer.updateUniform(name, value);
  if (object.__shaderConfig?.uniforms?.[name]) object.__shaderConfig.uniforms[name].value = value;
}

export function hasShader(object: any): boolean {
  return object?.__hasShader === true;
}

export function getShaderConfig(object: any): ShaderConfig | null {
  return object?.__shaderConfig || null;
}

export function disposeAllShaders(): void {
  activeShaders.forEach((state) => {
    state.isDisposed = true;
    if (state.animationId) cancelAnimationFrame(state.animationId);
    if (state.cachedImageBitmap) state.cachedImageBitmap.close();
    state.renderer?.dispose();
  });
  activeShaders.clear();
}
