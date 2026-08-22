/**
 * Shared helpers for canvas image tools (Crop / Vector / Mockup / Multi-Angles
 * / Expand / Upscale / Download).
 *
 * The whole point of this module is to keep image tools off the fragile
 * `selectedObject.canvas.toDataURL(...)` / `selectedObject.canvas.renderAll()`
 * paths. Those crash with "Cannot read properties of undefined (reading
 * 'renderAll' / 'clearRect')" when the React tree re-renders or the canvas
 * gets disposed mid-operation.
 */
import { FabricImage } from "fabric";
import { supabase } from "@/integrations/supabase/client";

/** Returns natural pixel dimensions for a Fabric image when available. */
export const getNaturalImageSize = (
  obj: any,
): { width: number; height: number } => {
  const el = obj?._originalElement || obj?._element;
  const w = el?.naturalWidth || obj?.width || 0;
  const h = el?.naturalHeight || obj?.height || 0;
  return { width: Math.round(w), height: Math.round(h) };
};

/** Display (canvas) size of a Fabric image after scale. */
export const getDisplayImageSize = (
  obj: any,
): { width: number; height: number } => {
  const w = (obj?.width || 0) * (obj?.scaleX || 1);
  const h = (obj?.height || 0) * (obj?.scaleY || 1);
  return { width: Math.round(w), height: Math.round(h) };
};

export interface FabricLike {
  add: (...args: any[]) => any;
  remove: (...args: any[]) => any;
  setActiveObject: (...args: any[]) => any;
  requestRenderAll: () => any;
  renderAll?: () => any;
  getObjects?: () => any[];
}

/** Best-effort safe URL/source extraction for a Fabric image-like object. */
export const getSafeImageSrc = (obj: any): string => {
  if (!obj) return "";
  try {
    const src =
      obj?.getSrc?.() ||
      obj?._originalElement?.src ||
      obj?._element?.src ||
      "";
    if (src && (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:"))) {
      return src;
    }
  } catch {
    /* ignore */
  }
  // Last resort — direct toDataURL on the OBJECT (not canvas). Wrapped so it
  // never throws synchronously.
  try {
    const url = obj?.toDataURL?.({ format: "png", quality: 1 });
    if (url) return url;
  } catch {
    /* ignore */
  }
  return "";
};

/**
 * Upload a data URL or blob URL to the design-assets bucket and return a
 * signed/public URL. Returns the original URL when it's already https.
 */
export const ensureRemoteImageUrl = async (url: string): Promise<string> => {
  if (!url) throw new Error("No image URL provided");
  if (url.startsWith("http")) return url;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const blob = await fetch(url).then((r) => r.blob());
  const fileName = `tool-input-${Date.now()}.png`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("design-assets")
    .upload(filePath, blob, { contentType: blob.type || "image/png" });
  if (uploadError) throw uploadError;

  const { data: signedUrlData } = await supabase.storage
    .from("design-assets")
    .createSignedUrl(filePath, 3600);
  if (!signedUrlData?.signedUrl) {
    throw new Error("Failed to create signed URL for uploaded image");
  }
  return signedUrlData.signedUrl;
};

/**
 * Replace a Fabric image with a new image URL while preserving transform and
 * canvas-level metadata. Safer than the inline pattern used in panels because
 * it always re-checks that the canvas is still alive before rendering.
 */
export const replaceImageOnCanvas = async (
  canvas: FabricLike | null,
  oldObject: any,
  newImageUrl: string,
): Promise<any | null> => {
  if (!canvas || !oldObject || !newImageUrl) return null;
  try {
    const img = await FabricImage.fromURL(newImageUrl, { crossOrigin: "anonymous" });
    if (!img || !canvas) return null;

    img.set({
      left: oldObject.left,
      top: oldObject.top,
      scaleX: oldObject.scaleX,
      scaleY: oldObject.scaleY,
      angle: oldObject.angle,
      originX: oldObject.originX,
      originY: oldObject.originY,
    });
    (img as any).data = oldObject.data;
    (img as any).id = oldObject.id;
    (img as any).object_id = oldObject.object_id;
    (img as any).canvasObjectId = oldObject.canvasObjectId;
    (img as any).isStandaloneObject = !!oldObject.isStandaloneObject;
    (img as any).name = oldObject.name || "Image";

    try { canvas.remove(oldObject); } catch { /* may have already been removed */ }
    canvas.add(img);
    try { canvas.setActiveObject(img); } catch { /* not fatal */ }
    canvas.requestRenderAll?.();
    return img;
  } catch (err) {
    console.error("[imageToolHelpers] replaceImageOnCanvas failed", err);
    return null;
  }
};

/** Add a new image NEAR an existing one without removing the original. */
export const addImageNearOriginal = async (
  canvas: FabricLike | null,
  origin: any,
  newImageUrl: string,
  offset = 30,
): Promise<any | null> => {
  if (!canvas || !newImageUrl) return null;
  try {
    const img = await FabricImage.fromURL(newImageUrl, { crossOrigin: "anonymous" });
    if (!img || !canvas) return null;
    img.set({
      left: (origin?.left || 0) + offset,
      top: (origin?.top || 0) + offset,
      scaleX: origin?.scaleX,
      scaleY: origin?.scaleY,
    });
    (img as any).isStandaloneObject = true;
    (img as any).id = (img as any).id || (typeof crypto !== "undefined" ? crypto.randomUUID() : `img_${Date.now()}`);
    canvas.add(img);
    try { canvas.setActiveObject(img); } catch { /* ignore */ }
    canvas.requestRenderAll?.();
    return img;
  } catch (err) {
    console.error("[imageToolHelpers] addImageNearOriginal failed", err);
    return null;
  }
};
