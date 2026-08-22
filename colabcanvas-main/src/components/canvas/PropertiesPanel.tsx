import { useState, useEffect, useRef } from "react";
import TextOnPathPanel from "./TextOnPathPanel";
import { Button } from "@/components/ui/button";
import { Sliders, Paintbrush, PenLine, Type, Shirt, Sparkles } from "lucide-react";
import {
  DeleteIcon,
  DuplicateIcon,
  ShadowIcon,
  CornerRadiusIcon,
  NoiseIcon,
  ExpandIcon,
  CropIcon,
  UpscaleIcon,
  RemoveBackgroundIcon,
  OpacityIcon,
  VectoriseIcon,
  ExportIcon,
  BlurIcon } from
"@/components/icons/CustomIcons";
import { Shadow, FabricImage, Rect, filters, util, loadSVGFromString } from "fabric";
import { applyLayerBlur, removeLayerBlur, applyBackgroundBlur, applyProgressiveBlur, removeProgressiveBlur, type BlurMode } from "@/lib/canvas/blurEngine";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CropControlPanel from "./CropControlPanel";
import { applyNoiseFilter, NoiseType, BlendMode } from "@/lib/noiseFilters";
import { FillColorDialog } from "./FillColorDialog";
import { StrokeColorDialog } from "./StrokeColorDialog";
import { ExportDialog } from "./ExportDialog";
import { removeBackground, loadImage } from "@/lib/removeBackground";
import { snapshotSingleImageOrSource } from "@/lib/canvas/safeSnapshot";
interface PropertiesPanelProps {
  selectedObject: any;
  canvas?: any;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (properties: any) => void;
  onNewArtboard?: (imageUrl: string, title: string) => void;
  onEnterEditTextMode?: () => void;
  onEnterMockupMode?: () => void;
}

const PropertiesPanel = ({
  selectedObject,
  canvas,
  onDelete,
  onDuplicate,
  onUpdate,
  onNewArtboard,
  onEnterEditTextMode,
  onEnterMockupMode
}: PropertiesPanelProps) => {
  const multipleSelected =
  selectedObject?.type === "activeSelection" || selectedObject?._objects && selectedObject._objects.length > 1;

  // Fix: Extract objects array properly for Fabric.js v6
  const selectedObjects = (() => {
    if (!selectedObject) return [];

    if (multipleSelected) {
      const objects = selectedObject._objects || selectedObject.getObjects?.() || [];

      return objects;
    }

    return [selectedObject];
  })();


  const [opacity, setOpacity] = useState(selectedObject?.opacity || 1);
  const [shadowBlur, setShadowBlur] = useState(selectedObject?.shadow?.blur || 0);
  const [blur, setBlur] = useState(() => {
    const pg = (selectedObject as any)?.__progressiveBlur;
    const bg = (selectedObject as any)?.__backgroundBlur;
    const bc = (selectedObject as any)?.__blurConfig;
    if (pg) return pg.amount;
    if (typeof bg === 'number' && bg > 0) return bg;
    if (bc) return bc.amount;
    return 0;
  });
  const [blurMode, setBlurMode] = useState<BlurMode>(() => {
    if ((selectedObject as any)?.__progressiveBlur) return 'progressive';
    if ((selectedObject as any)?.__backgroundBlur) return 'background';
    if ((selectedObject as any)?.__blurConfig) return 'layer';
    return 'layer';
  });
  const [blurAngle, setBlurAngle] = useState(() => {
    return (selectedObject as any)?.__progressiveBlur?.angle ?? 90;
  });
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState<any>(null);
  const [cropWidth, setCropWidth] = useState(0);
  const [cropHeight, setCropHeight] = useState(0);
  // Hold the ORIGINAL image being cropped, independent of React selection state
  const cropTargetRef = useRef<any>(null);
  const cropCanvasRef = useRef<any>(null);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [noiseType, setNoiseType] = useState<NoiseType>("gaussian");
  const [noiseIntensity, setNoiseIntensity] = useState(50);
  const [noiseScale, setNoiseScale] = useState(5);
  const [noiseBlendMode, setNoiseBlendMode] = useState<BlendMode>("multiply");

  const isImage =
  selectedObject && (
  selectedObject instanceof FabricImage ||
  selectedObject.type === "image" ||
  (selectedObject as any)._element?.tagName === "IMG");

  useEffect(() => {
    // Cleanup crop mode on unmount only if we still own a cropRect
    return () => {
      try {
        const c = cropCanvasRef.current;
        if (cropRect && c) c.remove(cropRect);
      } catch {}
    };
  }, [cropRect]);

  // Listen for toolbar-action events from ImageActionToolbar
  useEffect(() => {
    const handler = (e: Event) => {
      const toolId = (e as CustomEvent).detail?.toolId;
      if (!toolId) return;
      if (toolId === 'crop' && !isImage && !isCropping) return;
      switch (toolId) {
        case 'upscale': handleUpscale(); break;
        case 'remove-bg': handleRemoveBackground(); break;
        case 'expand': handleExpand(); break;
        case 'crop': handleCrop(); break;
        case 'vector': handleVectorize(); break;
      }
    };
    window.addEventListener('toolbar-action', handler);
    return () => window.removeEventListener('toolbar-action', handler);
  }, [isImage, selectedObject, isCropping, cropRect]);

  if (!selectedObject && !isCropping) return null;

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setOpacity(newOpacity);
    onUpdate({ opacity: newOpacity });
  };

  const handleShadowToggle = () => {
    if (selectedObject.shadow) {
      onUpdate({ shadow: null });
      setShadowBlur(0);
    } else {
      const shadow = new Shadow({
        color: "rgba(0,0,0,0.3)",
        blur: 10,
        offsetX: 0,
        offsetY: 4
      });
      onUpdate({ shadow });
      setShadowBlur(10);
    }
  };

  const handleShadowBlurChange = (value: number[]) => {
    const blur = value[0];
    setShadowBlur(blur);
    const shadow = new Shadow({
      color: "rgba(0,0,0,0.3)",
      blur: blur,
      offsetX: 0,
      offsetY: 4
    });
    onUpdate({ shadow });
  };

  const handleBlurChange = async (value: number[]) => {
    const blurValue = value[0];
    setBlur(blurValue);

    if (blurMode === 'layer') {
      if (selectedObject.type === "image") {
        // For images: use Fabric.js filter
        if (blurValue > 0) {
          const blurFilter = new filters.Blur({ blur: blurValue / 100 });
          selectedObject.filters = [blurFilter];
          selectedObject.applyFilters();
        } else {
          selectedObject.filters = [];
          selectedObject.applyFilters();
        }
        selectedObject.canvas?.renderAll();
      } else {
        // For shapes: use ctx.filter via blurEngine
        applyLayerBlur(selectedObject, blurValue);
      }
    } else if (blurMode === 'background') {
      applyBackgroundBlur(selectedObject, blurValue);
    } else if (blurMode === 'progressive') {
      applyProgressiveBlur(selectedObject, blurValue, blurAngle);
    }

    onUpdate({ blur: blurValue });
  };

  const handleBlurModeChange = (mode: string) => {
    // Clear previous blur
    if (blur > 0) {
      removeLayerBlur(selectedObject);
      applyBackgroundBlur(selectedObject, 0);
      removeProgressiveBlur(selectedObject);
      if (selectedObject.type === 'image') {
        selectedObject.filters = [];
        selectedObject.applyFilters();
      }
    }
    setBlurMode(mode as BlurMode);
    setBlur(0);
    setBackgroundBlur(0);
  };

  const handleBlurAngleChange = (value: number[]) => {
    setBlurAngle(value[0]);
    if (blur > 0 && blurMode === 'progressive') {
      applyProgressiveBlur(selectedObject, blur, value[0]);
    }
  };

  const handleRemoveBackground = async () => {
    if (!isImage || isProcessing) return;

    setIsProcessing(true);
    const loadingToast = toast.loading("Loading AI model for background removal...");

    try {
      if (!canvas) {
        toast.error("Canvas not available", { id: loadingToast });
        return;
      }

      // Get the original image element from Fabric object
      const fabricImg = selectedObject as any;
      let imageElement: HTMLImageElement;

      if (fabricImg._element || fabricImg._originalElement) {
        imageElement = fabricImg._originalElement || fabricImg._element;
      } else {
        // Fallback: convert canvas object to image
        const dataUrl = selectedObject.toDataURL({ format: "png", quality: 1 });
        const blob = await fetch(dataUrl).then((r) => r.blob());
        imageElement = await loadImage(blob);
      }

      toast.loading("Removing background with AI segmentation...", { id: loadingToast });

      // Use client-side RMBG model for TRUE alpha transparency
      const resultBlob = await removeBackground(imageElement);
      const resultUrl = URL.createObjectURL(resultBlob);

      // Load processed image and place as NEW image (offset from original, keep original)
      const img = await FabricImage.fromURL(resultUrl);

      if (!img) {
        toast.error("Failed to load processed image", { id: loadingToast });
        return;
      }

      // Position offset from original (add as new, don't replace)
      img.set({
        left: (selectedObject.left || 0) + 30,
        top: (selectedObject.top || 0) + 30,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY
      });

      // Set canvas object ID for new image
      (img as any).isStandaloneObject = true;
      (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add processed image as NEW object (keep original intact)
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();

      // Clean up blob URL
      URL.revokeObjectURL(resultUrl);

      toast.success("Background removed with true transparency!", { id: loadingToast });
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error(`Failed to remove background: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCropCancel = () => {
    const c = cropCanvasRef.current || canvas || selectedObject?.canvas || cropRect?.canvas;
    if (cropRect && c) {
      try {
        c.remove(cropRect);
        const target = cropTargetRef.current;
        if (target) c.setActiveObject(target);
        c.requestRenderAll?.();
      } catch (err) {
        console.warn("Crop cancel cleanup failed:", err);
      }
    }
    setCropRect(null);
    setIsCropping(false);
    cropTargetRef.current = null;
    cropCanvasRef.current = null;
  };

  const handleCropApply = async () => {
    // Use refs captured at crop START — selectedObject may now point at the crop rect
    const target = cropTargetRef.current;
    const workingCanvas = cropCanvasRef.current || canvas || target?.canvas || cropRect?.canvas;
    if (!cropRect || !workingCanvas || !target) {
      toast.error("Crop session lost — please reselect the image and try again.");
      setIsCropping(false);
      setCropRect(null);
      cropTargetRef.current = null;
      cropCanvasRef.current = null;
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Cropping image...");

    try {
      const wc = workingCanvas;
      const imgElement = target._originalElement || target._element;
      if (!imgElement) throw new Error("Could not access image element");

      const imgBounds = target.getBoundingRect();
      const cropBounds = cropRect.getBoundingRect();
      const imageScaleX = target.scaleX || 1;
      const imageScaleY = target.scaleY || 1;

      const relativeLeft = cropBounds.left - imgBounds.left;
      const relativeTop = cropBounds.top - imgBounds.top;

      const srcX = Math.max(0, relativeLeft / imageScaleX);
      const srcY = Math.max(0, relativeTop / imageScaleY);
      const srcW = Math.min((imgElement.naturalWidth || target.width) - srcX, cropBounds.width / imageScaleX);
      const srcH = Math.min((imgElement.naturalHeight || target.height) - srcY, cropBounds.height / imageScaleY);

      if (srcW <= 1 || srcH <= 1) throw new Error("Crop area is too small");

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.round(srcW);
      tempCanvas.height = Math.round(srcH);
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      ctx.drawImage(
        imgElement,
        Math.round(srcX), Math.round(srcY),
        Math.round(srcW), Math.round(srcH),
        0, 0,
        Math.round(srcW), Math.round(srcH),
      );

      const dataURL = tempCanvas.toDataURL('image/png');

      try { wc.remove(cropRect); } catch {}
      try { if (wc.getActiveObject() === cropRect) wc.discardActiveObject(); } catch {}
      try { wc.requestRenderAll?.(); } catch {}
      setCropRect(null);
      setIsCropping(false);

      // Always replace in place — preserve transform & metadata
      const newImg = await FabricImage.fromURL(dataURL);
      if (newImg && wc) {
        newImg.set({
          left: target.left,
          top: target.top,
          angle: target.angle || 0,
          // Reset scale because new image is exact crop pixels
          scaleX: target.scaleX || 1,
          scaleY: target.scaleY || 1,
          originX: target.originX,
          originY: target.originY,
        });
        (newImg as any).data = target.data;
        (newImg as any).id = target.id;
        (newImg as any).object_id = target.object_id;
        (newImg as any).canvasObjectId = target.canvasObjectId;
        (newImg as any).isStandaloneObject = !!target.isStandaloneObject;
        try { wc.remove(target); } catch {}
        wc.add(newImg);
        try { wc.setActiveObject(newImg); } catch {}
        wc.requestRenderAll?.();
      }
      toast.success("Image cropped", { id: loadingToast });
    } catch (error) {
      console.error("Error cropping:", error);
      toast.error(`Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });

      try {
        if (cropRect) {
          const c = cropCanvasRef.current || canvas;
          if (c) {
            c.remove(cropRect);
            c.requestRenderAll?.();
          }
        }
      } catch (cleanupErr) {
        console.warn("Crop cleanup failed:", cleanupErr);
      }
      setCropRect(null);
      setIsCropping(false);
    } finally {
      cropTargetRef.current = null;
      cropCanvasRef.current = null;
      setIsProcessing(false);
    }
  };

  const handleCropUpdate = (width: number, height: number) => {
    if (cropRect) {
      cropRect.set({
        scaleX: width / (cropRect.width || 1),
        scaleY: height / (cropRect.height || 1)
      });
      cropRect.setCoords();
      cropCanvasRef.current?.requestRenderAll?.();
    }
  };

  const handleCrop = () => {
    if (isCropping) {
      handleCropApply();
      return;
    }
    // Resolve target image at the moment of entering crop
    const target = (selectedObject && (selectedObject instanceof FabricImage || selectedObject.type === 'image'))
      ? selectedObject
      : null;
    const workingCanvas = canvas || target?.canvas;
    if (!target || !workingCanvas) {
      toast.error("Image not ready for cropping. Please reselect.");
      return;
    }

    cropTargetRef.current = target;
    cropCanvasRef.current = workingCanvas;

    const wc = workingCanvas;
    const imgBounds = target.getBoundingRect();

    const newCropRect = new Rect({
      left: imgBounds.left + imgBounds.width * 0.1,
      top: imgBounds.top + imgBounds.height * 0.1,
      width: imgBounds.width * 0.8,
      height: imgBounds.height * 0.8,
      fill: "transparent",
      stroke: "#3b82f6",
      strokeWidth: 2,
      cornerColor: "#3b82f6",
      cornerSize: 12,
      transparentCorners: false,
      lockRotation: true,
      hasControls: true,
      data: { isCropRect: true }
    } as any);

    newCropRect.on("modified", () => {
      const bounds = newCropRect.getBoundingRect();
      setCropWidth(bounds.width);
      setCropHeight(bounds.height);
    });
    newCropRect.on("scaling", () => {
      const bounds = newCropRect.getBoundingRect();
      setCropWidth(bounds.width);
      setCropHeight(bounds.height);
    });

    wc.add(newCropRect);
    wc.setActiveObject(newCropRect);
    wc.requestRenderAll?.();

    setCropRect(newCropRect);
    setCropWidth(imgBounds.width * 0.8);
    setCropHeight(imgBounds.height * 0.8);
    setIsCropping(true);
  };

  const handleUpscale = async () => {
    if (!isImage || isProcessing || !onNewArtboard) return;

    setIsProcessing(true);

    // Progress tracking
    const startTime = Date.now();
    const estimatedDuration = 20000; // 20 seconds
    let progressInterval: NodeJS.Timeout;

    const loadingToast = toast.loading("Upscaling — Queued");

    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const stage = elapsed < 5 ? 'Queued' : elapsed < 15 ? 'Processing' : 'Finalizing';
      toast.loading(`Upscaling — ${stage} (${elapsed}s)`, { id: loadingToast });
    }, 1000);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        clearInterval(progressInterval);
        toast.error("Session expired. Please log in again.", { id: loadingToast });
        return;
      }

      // Convert image to base64 (remove data URI prefix)
      const imageDataUrl = selectedObject.toDataURL({ format: "png", quality: 1 });
      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

      // Get image dimensions
      const width = Math.round(selectedObject.width * selectedObject.scaleX);
      const height = Math.round(selectedObject.height * selectedObject.scaleY);

      console.log("Upscaling image:", { width, height });

      // Call new gemini-upscale function
      const { data, error } = await supabase.functions.invoke("gemini-upscale", {
        body: {
          image: base64Data,
          mimeType: "image/png",
          width,
          height
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data?.image) throw new Error("No image returned");

      if (!canvas) throw new Error("Canvas not available");

      // Convert base64 back to data URL for Fabric.js
      const upscaledDataUrl = `data:image/png;base64,${data.image}`;
      console.log("Loading upscaled image, data length:", data.image?.length);

      // Load upscaled image with error handling
      let img;
      try {
        img = await FabricImage.fromURL(upscaledDataUrl, {
          crossOrigin: 'anonymous'
        });
      } catch (loadError) {
        console.error("FabricImage.fromURL failed:", loadError);
        toast.error("Failed to load upscaled image", { id: loadingToast });
        return;
      }

      if (!img || !img.width) {
        console.error("Image loaded but has no dimensions");
        toast.error("Failed to load upscaled image", { id: loadingToast });
        return;
      }

      console.log("Upscaled image loaded successfully:", img.width, "x", img.height);

      // Position at the same location as original
      img.set({
        left: selectedObject.left,
        top: selectedObject.top,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY
      });

      // Remove original and add upscaled image
      canvas.remove(selectedObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();

      clearInterval(progressInterval);
      toast.success("Image upscaled to 4K - 10 credits deducted", { id: loadingToast });
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Error upscaling:", error);
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("unauthorized") || error.status === 401) {
        toast.error("Please log in to use this feature.", { id: loadingToast });
      } else if (errorMessage.includes("rate limit")) {
        toast.error("Rate limit exceeded. Please try again later.", { id: loadingToast });
      } else if (errorMessage.includes("insufficient_credits")) {
        toast.error("Insufficient credits. Please add funds to continue.", { id: loadingToast });
      } else {
        toast.error("Failed to upscale image", { id: loadingToast });
      }
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const handleExpand = async () => {
    if (!isImage || isProcessing || !canvas) return;

    setIsProcessing(true);

    // Progress tracking
    const startTime = Date.now();
    const estimatedDuration = 25000; // 25 seconds
    let progressInterval: NodeJS.Timeout;

    const loadingToast = toast.loading("Expanding — Queued");

    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const stage = elapsed < 5 ? 'Queued' : elapsed < 18 ? 'Processing' : 'Finalizing';
      toast.loading(`Expanding — ${stage} (${elapsed}s)`, { id: loadingToast });
    }, 1000);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        clearInterval(progressInterval);
        toast.error("Session expired. Please log in again.", { id: loadingToast });
        return;
      }

      const imageDataUrl = selectedObject.toDataURL({ format: "png", quality: 1 });

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: imageDataUrl,
          operation: "expand"
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image returned");

      // Load expanded image and add as standalone image (not inside frame)
      const img = await FabricImage.fromURL(data.imageUrl);
      if (!img) {
        toast.error("Failed to load expanded image", { id: loadingToast });
        return;
      }

      // Position offset from original
      img.set({
        left: (selectedObject.left || 0) + 50,
        top: (selectedObject.top || 0) + 50
      });

      // Set as standalone object
      (img as any).isStandaloneObject = true;
      (img as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();

      clearInterval(progressInterval);
      toast.success("Image expanded - new image added", { id: loadingToast });
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Error expanding:", error);
      if (error.message?.includes("Rate limits")) {
        toast.error("Rate limit exceeded. Please try again later.", { id: loadingToast });
      } else if (error.message?.includes("Payment required")) {
        toast.error("Credits required. Please add funds to continue.", { id: loadingToast });
      } else {
        toast.error("Failed to expand image", { id: loadingToast });
      }
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const handleCornerRadiusChange = (value: number[]) => {
    const radiusValue = value[0];
    setCornerRadius(radiusValue);

    if (selectedObject instanceof Rect) {
      const width = (selectedObject.width || 100) * (selectedObject.scaleX || 1);
      const height = (selectedObject.height || 100) * (selectedObject.scaleY || 1);

      // Maximum radius for pill shape is half of the shorter side
      const maxRadius = Math.min(width, height) / 2;
      const actualRadius = radiusValue / 100 * maxRadius;

      // Update the rectangle
      selectedObject.set({
        rx: actualRadius / (selectedObject.scaleX || 1),
        ry: actualRadius / (selectedObject.scaleY || 1)
      });

      selectedObject.setCoords();
      selectedObject.canvas?.requestRenderAll();

      onUpdate({
        rx: actualRadius / (selectedObject.scaleX || 1),
        ry: actualRadius / (selectedObject.scaleY || 1),
        cornerRadius: radiusValue
      });
    } else if (selectedObject instanceof FabricImage) {
      // For images: Create rounded clipPath
      const width = (selectedObject.width || 100) * (selectedObject.scaleX || 1);
      const height = (selectedObject.height || 100) * (selectedObject.scaleY || 1);
      const maxRadius = Math.min(width, height) / 2;
      const actualRadius = radiusValue / 100 * maxRadius;

      const clipPath = new Rect({
        width: selectedObject.width || 100,
        height: selectedObject.height || 100,
        rx: actualRadius / (selectedObject.scaleX || 1),
        ry: actualRadius / (selectedObject.scaleY || 1),
        left: -(selectedObject.width || 100) / 2,
        top: -(selectedObject.height || 100) / 2,
        originX: "left",
        originY: "top"
      });

      selectedObject.set({ clipPath });
      selectedObject.setCoords();
      selectedObject.canvas?.renderAll();
      onUpdate({ cornerRadius: radiusValue });
    }
  };

  const handleVectorize = async () => {
    if (!isImage || isProcessing) return;

    // Capture stable refs up front — selection can change mid-flight.
    const targetObj = selectedObject;
    const workingCanvas = canvas || (targetObj as any)?.canvas;

    setIsProcessing(true);
    const loadingToast = toast.loading("Converting to vector...");

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.", { id: loadingToast });
        return;
      }

      // Prefer original remote URL when available (cheaper + better quality).
      // Fallback: snapshot, then upload to storage so the edge function gets a real URL.
      let imageDataUrl =
        (targetObj as any)?.getSrc?.() ||
        (targetObj as any)?._originalElement?.src ||
        (targetObj as any)?._element?.src ||
        '';
      if (!imageDataUrl || (!imageDataUrl.startsWith('http') && !imageDataUrl.startsWith('data:'))) {
        imageDataUrl = await snapshotSingleImageOrSource(targetObj, { format: "png", multiplier: 2, maxDimension: 4096 });
      }
      // If we still have a data URL, upload it so vectorizer.ai gets a small request body.
      if (imageDataUrl.startsWith('data:')) {
        try {
          const { ensureRemoteImageUrl } = await import('@/lib/canvas/imageToolHelpers');
          imageDataUrl = await ensureRemoteImageUrl(imageDataUrl);
        } catch (e) {
          console.warn('[Vectorize] upload failed, sending data URL', e);
        }
      }

      const { data, error } = await supabase.functions.invoke("vectorize-image", {
        body: { imageData: imageDataUrl },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        if (error.message?.includes("not configured") || error.message?.includes("503")) {
          toast.error("Vectorization service not configured. Please contact support.", { id: loadingToast });
          return;
        }
        throw error;
      }

      if (!data?.svg) {
        throw new Error("No SVG data returned from vectorization service");
      }

      // Validate SVG data before loading
      const svgString = data.svg.trim();
      if (!svgString.includes('<svg') || !svgString.includes('</svg>')) {
        throw new Error("Invalid SVG data returned from vectorization service");
      }

      // Load SVG into fabric using loadSVGFromString with proper error handling
      try {
        const result = await loadSVGFromString(svgString);

        if (!result || !result.objects || result.objects.length === 0) {
          throw new Error("Failed to parse SVG - no valid objects found");
        }

        const svgGroup = util.groupSVGElements(result.objects, result.options);

        if (!svgGroup) {
          throw new Error("Failed to create SVG group from parsed elements");
        }

        // Compute scale so the vector matches the on-canvas size of the original image.
        // Fallback chain for SVG natural size:
        //   1) svgGroup.width/height
        //   2) bounding rect of the group
        //   3) parsed width/height from the raw <svg> tag's viewBox / attributes
        const targetW = (targetObj.width || 0) * (targetObj.scaleX || 1);
        const targetH = (targetObj.height || 0) * (targetObj.scaleY || 1);
        let svgW = (svgGroup as any).width || 0;
        let svgH = (svgGroup as any).height || 0;
        if (!svgW || !svgH) {
          try {
            const br = (svgGroup as any).getBoundingRect?.();
            if (br?.width) svgW = br.width;
            if (br?.height) svgH = br.height;
          } catch {}
        }
        if (!svgW || !svgH) {
          const vb = svgString.match(/viewBox\s*=\s*"([^"]+)"/i);
          if (vb) {
            const parts = vb[1].split(/[\s,]+/).map(Number);
            if (parts.length === 4 && parts[2] && parts[3]) {
              svgW = parts[2];
              svgH = parts[3];
            }
          }
        }
        if (!svgW || !svgH) {
          const wAttr = svgString.match(/<svg[^>]*\swidth\s*=\s*"([\d.]+)/i);
          const hAttr = svgString.match(/<svg[^>]*\sheight\s*=\s*"([\d.]+)/i);
          if (wAttr) svgW = parseFloat(wAttr[1]) || svgW;
          if (hAttr) svgH = parseFloat(hAttr[1]) || svgH;
        }
        svgW = svgW || 1024;
        svgH = svgH || 1024;
        const sx = targetW > 0 ? targetW / svgW : (targetObj.scaleX || 1);
        const sy = targetH > 0 ? targetH / svgH : (targetObj.scaleY || 1);

        svgGroup.set({
          left: targetObj.left,
          top: targetObj.top,
          scaleX: sx,
          scaleY: sy,
          angle: targetObj.angle || 0,
          originX: targetObj.originX,
          originY: targetObj.originY,
        });
        // Preserve canvas-level metadata so persistence keeps working
        (svgGroup as any).isStandaloneObject = true;
        (svgGroup as any).data = (targetObj as any).data;
        (svgGroup as any).id = (targetObj as any).id;
        (svgGroup as any).object_id = (targetObj as any).object_id;
        (svgGroup as any).canvasObjectId = (targetObj as any).canvasObjectId
          || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (svgGroup as any).name = (targetObj as any).name || 'Vector';

        if (workingCanvas) {
          try { workingCanvas.remove(targetObj); } catch {}
          workingCanvas.add(svgGroup);
          try { workingCanvas.setActiveObject(svgGroup); } catch {}
          workingCanvas.requestRenderAll?.();
        }

        toast.success("Converted to vector!", { id: loadingToast });
      } catch (svgError: any) {
        console.error("SVG parsing error:", svgError);
        throw new Error(`Failed to load vectorized SVG: ${svgError.message}`);
      }
    } catch (error: any) {
      console.error("Error vectorizing:", error);
      const msg = String(error?.message || error?.error || '');
      if (msg.includes("Rate limit") || msg.includes("429")) {
        toast.error("Rate limit exceeded. Please try again later.", { id: loadingToast });
      } else if (msg.includes("Payment required") || msg.includes("402") || msg.includes("insufficient_credits")) {
        toast.error("Insufficient credits. Please add credits and try again.", { id: loadingToast });
      } else if (msg.toLowerCase().includes("unauthor") || msg.includes("401")) {
        toast.error("Session expired. Please sign in again.", { id: loadingToast });
      } else if (msg.includes("not configured") || msg.includes("503")) {
        toast.error("Vectorization service unavailable. Please try again later.", { id: loadingToast });
      } else {
        toast.error(msg || "Failed to vectorize image", { id: loadingToast });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyNoise = async () => {
    if (!isImage || isProcessing) return;

    setIsProcessing(true);
    const loadingToast = toast.loading("Applying noise effect...");

    try {
      // Get image element and apply noise
      const imgElement = (selectedObject as any)._element;
      if (!imgElement) throw new Error("No image element found");

      // Create a canvas from the image
      const canvas = document.createElement("canvas");
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imgElement, 0, 0);

      // Apply noise
      applyNoiseFilter(canvas, {
        type: noiseType,
        intensity: noiseIntensity,
        scale: noiseScale,
        blendMode: noiseBlendMode,
        monochrome: true
      });

      // Convert back to data URL
      const dataURL = canvas.toDataURL("image/png", 1.0);

      // Update the object
      onUpdate({ src: dataURL });

      toast.success("Noise effect applied", { id: loadingToast });
    } catch (error) {
      console.error("Error applying noise:", error);
      toast.error("Failed to apply noise effect", { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!selectedObject) return;

    // Export selected object as image
    const dataURL = selectedObject.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2
    });

    const link = document.createElement("a");
    link.download = "element.png";
    link.href = dataURL;
    link.click();
  };

  const getImageUrl = () => {
    if (!isImage) return "";
    return selectedObject.toDataURL({ format: "png", quality: 1 });
  };

  const handleEditTextComplete = async (newImageUrl: string) => {
    if (!canvas || !selectedObject) return;

    try {
      const FabricImageClass = (await import("fabric")).FabricImage;
      const img = await FabricImageClass.fromURL(newImageUrl);

      if (!img) {
        toast.error("Failed to load edited image");
        return;
      }

      img.set({
        left: selectedObject.left,
        top: selectedObject.top,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY
      });

      canvas.remove(selectedObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (error) {
      console.error("Error updating image:", error);
      toast.error("Failed to update image");
    }
  };

  const handleMockupComplete = async (newImageUrl: string) => {
    if (!canvas || !selectedObject) return;

    try {
      const FabricImageClass = (await import("fabric")).FabricImage;
      const img = await FabricImageClass.fromURL(newImageUrl);

      if (!img) {
        toast.error("Failed to load mockup image");
        return;
      }

      img.set({
        left: selectedObject.left,
        top: selectedObject.top,
        scaleX: selectedObject.scaleX,
        scaleY: selectedObject.scaleY
      });

      canvas.remove(selectedObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    } catch (error) {
      console.error("Error updating mockup:", error);
      toast.error("Failed to update mockup");
    }
  };

  return (
    <>
      {isCropping &&
      <CropControlPanel
        width={cropWidth}
        height={cropHeight}
        onUpdate={handleCropUpdate}
        onApply={handleCropApply}
        onCancel={handleCropCancel} />

      }

      {!isCropping &&
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="glass-header rounded-lg border border-border/30 py-[4px] px-[4px]">
              <div className="flex items-center gap-1">
                {/* Align & Distribute - Show only when multiple objects selected */}
                {/* Delete & Duplicate */}
                <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                title="Delete (Backspace)">

                  <DeleteIcon className="h-4 w-4" />
                </Button>

                <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="h-8 w-8"
                title="Duplicate (⌘D or Alt+Drag)">

                  <DuplicateIcon className="h-4 w-4" />
                </Button>

                <div className="h-5 w-px bg-border/30 mx-1" />

                {/* Transparency */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Transparency">
                      <OpacityIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-4">
                      <Label>Opacity: {Math.round(opacity * 100)}%</Label>
                      <Slider value={[opacity]} onValueChange={handleOpacityChange} min={0} max={1} step={0.01} />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Shadow */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${selectedObject.shadow ? "text-primary" : ""}`}
                    title="Shadow">

                      <ShadowIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Shadow</Label>
                        <Button variant="outline" size="sm" onClick={handleShadowToggle}>
                          {selectedObject.shadow ? "Remove" : "Add"}
                        </Button>
                      </div>
                      {selectedObject.shadow &&
                    <>
                          <Label>Blur: {shadowBlur}px</Label>
                          <Slider
                        value={[shadowBlur]}
                        onValueChange={handleShadowBlurChange}
                        min={0}
                        max={50}
                        step={1} />

                        </>
                    }
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Blur */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${blur > 0 ? "text-primary" : ""}`}
                    title="Blur">

                      <BlurIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Blur Type</Label>
                        <Select value={blurMode} onValueChange={handleBlurModeChange}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="layer">Layer Blur</SelectItem>
                            <SelectItem value="background">Background Blur</SelectItem>
                            <SelectItem value="progressive">Progressive Blur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Amount: {blur}%</Label>
                        <Slider value={[blur]} onValueChange={handleBlurChange} min={0} max={200} step={1} />
                      </div>

                      {blurMode === 'progressive' && (
                        <div className="space-y-1">
                          <Label className="text-xs">Direction: {blurAngle}°</Label>
                          <Slider value={[blurAngle]} onValueChange={handleBlurAngleChange} min={0} max={360} step={1} />
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Corner Radius */}
                {(selectedObject instanceof Rect || selectedObject instanceof FabricImage) &&
              <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Corner Radius">
                        <CornerRadiusIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-4">
                        <Label>Corner Radius: {cornerRadius}%</Label>
                        <Slider
                      value={[cornerRadius]}
                      onValueChange={handleCornerRadiusChange}
                      min={0}
                      max={100}
                      step={1} />

                      </div>
                    </PopoverContent>
                  </Popover>
              }

                {/* Noise/Grain */}
                {isImage &&
              <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Noise & Grain">
                        <NoiseIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-4">
                        <Label className="font-semibold">Noise & Grain Effect</Label>

                        <div className="space-y-2">
                          <Label className="text-xs">Noise Type</Label>
                          <Select value={noiseType} onValueChange={(v) => setNoiseType(v as NoiseType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gaussian">Gaussian</SelectItem>
                              <SelectItem value="perlin">Perlin (Organic)</SelectItem>
                              <SelectItem value="film-grain">Film Grain</SelectItem>
                              <SelectItem value="stipple">Stipple/Dots</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Intensity: {noiseIntensity}%</Label>
                          <Slider
                        value={[noiseIntensity]}
                        onValueChange={(v) => setNoiseIntensity(v[0])}
                        min={0}
                        max={100}
                        step={1} />

                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Scale: {noiseScale}</Label>
                          <Slider
                        value={[noiseScale]}
                        onValueChange={(v) => setNoiseScale(v[0])}
                        min={1}
                        max={10}
                        step={1} />

                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Blend Mode</Label>
                          <Select value={noiseBlendMode} onValueChange={(v) => setNoiseBlendMode(v as BlendMode)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiply">Multiply</SelectItem>
                              <SelectItem value="overlay">Overlay</SelectItem>
                              <SelectItem value="screen">Screen</SelectItem>
                              <SelectItem value="add">Add</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={handleApplyNoise} disabled={isProcessing} className="w-full">
                          Apply Noise
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
              }

                <div className="h-5 w-px bg-border/30 mx-1" />

                {/* Vectorize */}
                {isImage &&
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVectorize}
                className="h-8 w-8"
                title="Vectorize with AI"
                disabled={isProcessing}>

                    <VectoriseIcon className="h-4 w-4" />
                  </Button>
              }

                {/* Upscale */}
                <Button
                variant="ghost"
                size="icon"
                onClick={handleUpscale}
                className="h-8 w-8"
                title="Upscale with AI"
                disabled={!isImage || isProcessing}>

                  <UpscaleIcon className="h-4 w-4" />
                </Button>

                {/* Expand */}
                <Button
                variant="ghost"
                size="icon"
                onClick={handleExpand}
                className="h-8 w-8"
                title="Expand with AI"
                disabled={!isImage || isProcessing}>

                  <ExpandIcon className="h-4 w-4" />
                </Button>

                {/* Separator before remove bg */}

                {/* Remove Background */}
                <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveBackground}
                className="h-8 w-8"
                title="Remove Background"
                disabled={!isImage || isProcessing}>

                  <RemoveBackgroundIcon className="h-4 w-4" />
                </Button>

                {/* Crop */}
                <Button
                variant="ghost"
                size="icon"
                onClick={handleCrop}
                className={`h-8 w-8 ${isCropping ? "text-primary bg-primary/10" : ""}`}
                title={isCropping ? "Apply Crop" : "Crop"}
                disabled={!isImage || isProcessing}>

                  <CropIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Text on Path controls moved to floating panel next to left toolbar */}

            {/* Export */}
            <div className="glass-header rounded-lg border border-border/30">
              <ExportDialog selectedObject={selectedObject} />
            </div>
          </div>
        </div>
      }

    </>);

};

export default PropertiesPanel;