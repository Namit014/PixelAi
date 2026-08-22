import { ShaderRenderer } from './ShaderRenderer';
import type { ShaderConfig } from './shaderDefinitions';
import type { FabricObject } from 'fabric';

export class ObjectShaderRenderer {
  private overlayCanvas: HTMLCanvasElement;
  private shaderRenderer: ShaderRenderer;
  private fabricObject: any;
  private animationId: number | null = null;
  private isDisposed: boolean = false;
  private parentCanvas: HTMLCanvasElement;
  private fabricCanvas: any;

  constructor(
    fabricObject: any,
    shaderConfig: ShaderConfig,
    parentCanvas: HTMLCanvasElement,
    fabricCanvas: any
  ) {
    this.fabricObject = fabricObject;
    this.parentCanvas = parentCanvas;
    this.fabricCanvas = fabricCanvas;

    // Create overlay canvas
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.style.zIndex = '1000';
    
    // Initialize shader renderer
    this.shaderRenderer = new ShaderRenderer(this.overlayCanvas, shaderConfig);
    
    // Start rendering
    this.updateOverlayPosition();
    this.extractObjectTexture();
    this.startAnimation();
  }

  private extractObjectTexture(): void {
    try {
      // Get object as data URL
      const dataURL = this.fabricObject.toDataURL({
        format: 'png',
        multiplier: 1,
      });

      // Load as image and set as texture
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!this.isDisposed) {
          this.shaderRenderer.setTexture(img);
        }
      };
      img.onerror = (error) => {
        console.error('Failed to load object texture:', error);
      };
      img.src = dataURL;
    } catch (error) {
      console.error('Failed to extract object texture:', error);
    }
  }

  private updateOverlayPosition(): void {
    if (this.isDisposed || !this.fabricObject || !this.fabricCanvas) return;

    // Get object bounds
    const bound = this.fabricObject.getBoundingRect();
    const zoom = this.fabricCanvas.getZoom();
    const vpt = this.fabricCanvas.viewportTransform;

    // Calculate position on screen
    const left = bound.left * zoom + vpt[4];
    const top = bound.top * zoom + vpt[5];
    const width = bound.width * zoom;
    const height = bound.height * zoom;

    // Update overlay canvas
    this.overlayCanvas.style.left = `${left}px`;
    this.overlayCanvas.style.top = `${top}px`;
    this.overlayCanvas.width = width * window.devicePixelRatio;
    this.overlayCanvas.height = height * window.devicePixelRatio;
    this.overlayCanvas.style.width = `${width}px`;
    this.overlayCanvas.style.height = `${height}px`;

    // Update shader renderer size
    this.shaderRenderer.resize(
      this.overlayCanvas.width,
      this.overlayCanvas.height
    );
  }

  private startAnimation(): void {
    if (this.isDisposed) return;

    this.shaderRenderer.start();

    // Update overlay position on each frame
    const animate = () => {
      if (this.isDisposed) return;

      this.updateOverlayPosition();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  public getOverlayCanvas(): HTMLCanvasElement {
    return this.overlayCanvas;
  }

  public update(): void {
    if (this.isDisposed) return;
    this.updateOverlayPosition();
    this.extractObjectTexture();
  }

  public dispose(): void {
    if (this.isDisposed) return;
    
    this.isDisposed = true;

    // Stop animation
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Dispose shader renderer
    this.shaderRenderer.dispose();

    // Remove overlay canvas
    if (this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
  }
}
