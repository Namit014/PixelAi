/**
 * Canvas Component Serializer
 *
 * Helpers to save a Fabric.js selection as a reusable component
 * and to instantiate a saved component back onto the canvas.
 */
import {
  Canvas as FabricCanvas,
  StaticCanvas,
  Group,
  Point,
  util as fabricUtil,
  ActiveSelection,
  type Object as FabricObject,
} from "fabric";
import { supabase } from "@/integrations/supabase/client";

const PROPS_TO_INCLUDE = [
  "selectable",
  "evented",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "lockRotation",
  "visible",
  "rx",
  "ry",
  "penToolData",
  "textOnPath",
  "isStandaloneObject",
  "componentId",
  "componentInstanceId",
  "isComponentInstance",
  "filters",
  "shadow",
];

export interface SerializedComponent {
  fabric_json: any;
  width: number;
  height: number;
  thumbnail_blob: Blob;
}

/**
 * Strip transient runtime props off a Fabric object snapshot.
 */
function cleanObject(obj: any) {
  const { isArtboard, isTitle, isArtboardImage, parentFrameId, artboardId, ...rest } = obj;
  return rest;
}

/**
 * Serialize a selection (1+ objects) into a JSON payload + thumbnail blob.
 * The serialized objects are translated so the bounding box origin sits at (0,0).
 */
export async function serializeSelection(
  canvas: FabricCanvas,
  objects: FabricObject[],
): Promise<SerializedComponent> {
  if (!objects.length) throw new Error("No objects selected");

  // Compute bounding box across all objects in canvas coords.
  const rects = objects.map((o) => o.getBoundingRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);

  // Snapshot each object via toObject, then translate so the group origin is (0,0).
  const serialized = objects.map((o) => {
    const json = o.toObject(PROPS_TO_INCLUDE);
    const cleaned = cleanObject(json);
    cleaned.left = (json.left ?? 0) - left;
    cleaned.top = (json.top ?? 0) - top;
    return cleaned;
  });

  const thumbnail_blob = await captureThumbnail(objects, width, height);

  return {
    fabric_json: { version: 2, objects: serialized },
    width,
    height,
    thumbnail_blob,
  };
}

/**
 * Render the selected objects onto an off-screen StaticCanvas and return a PNG blob.
 */
async function captureThumbnail(
  objects: FabricObject[],
  width: number,
  height: number,
): Promise<Blob> {
  const TARGET = 256;
  const scale = Math.min(TARGET / width, TARGET / height, 2);
  const canvasW = Math.max(1, Math.round(width * scale));
  const canvasH = Math.max(1, Math.round(height * scale));

  const off = document.createElement("canvas");
  off.width = canvasW;
  off.height = canvasH;
  const staticCanvas = new StaticCanvas(off, {
    backgroundColor: "#ffffff",
    width: canvasW,
    height: canvasH,
    enableRetinaScaling: false,
  });

  // Compute bbox again in canvas coords for translation.
  const rects = objects.map((o) => o.getBoundingRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));

  // Serialize → enliven → place.
  const json = objects.map((o) => {
    const j = o.toObject(PROPS_TO_INCLUDE);
    j.left = (j.left ?? 0) - left;
    j.top = (j.top ?? 0) - top;
    return j;
  });

  const enlivened: FabricObject[] = await new Promise((resolve, reject) => {
    fabricUtil
      .enlivenObjects(json)
      .then((objs: any) => resolve(objs as FabricObject[]))
      .catch(reject);
  });

  enlivened.forEach((o: any) => {
    o.scaleX = (o.scaleX ?? 1) * scale;
    o.scaleY = (o.scaleY ?? 1) * scale;
    o.left = (o.left ?? 0) * scale;
    o.top = (o.top ?? 0) * scale;
    staticCanvas.add(o);
  });
  staticCanvas.renderAll();

  const blob: Blob = await new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png");
  });

  staticCanvas.dispose();
  return blob;
}

/**
 * Upload a thumbnail to the design-assets bucket and return the public URL.
 */
export async function uploadThumbnail(userId: string, blob: Blob): Promise<string> {
  const key = `components/${userId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from("design-assets").upload(key, blob, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("design-assets").getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Instantiate a saved component on the canvas at the given canvas coordinates.
 * Multi-object components are inserted as a Group so they move/scale together
 * but remain ungroupable later via Cmd+Shift+G.
 */
export async function instantiateComponent(
  canvas: FabricCanvas,
  component: { id: string; fabric_json: any; name?: string },
  point: { x: number; y: number },
): Promise<FabricObject | null> {
  const json = component.fabric_json;
  const objectsJson = Array.isArray(json) ? json : json?.objects;
  if (!Array.isArray(objectsJson) || objectsJson.length === 0) return null;

  const enlivened: FabricObject[] = await fabricUtil.enlivenObjects(objectsJson) as any;
  if (!enlivened.length) return null;

  const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Compute bbox of enlivened set so we can drop it centered at point.
  const tmp = new Group(enlivened.slice(), { subTargetCheck: false });
  const w = tmp.width || 0;
  const h = tmp.height || 0;
  tmp.set({
    left: point.x - w / 2,
    top: point.y - h / 2,
  });

  // Stamp identifying metadata on the wrapper group.
  (tmp as any).isStandaloneObject = true;
  (tmp as any).canvasObjectId = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  (tmp as any).componentId = component.id;
  (tmp as any).componentInstanceId = instanceId;
  (tmp as any).isComponentInstance = true;
  (tmp as any).componentName = component.name;

  canvas.add(tmp);
  canvas.setActiveObject(tmp);
  canvas.requestRenderAll();
  canvas.fire("object:modified", { target: tmp });
  return tmp;
}

/**
 * Convenience: get the screen-center canvas point for instantiation.
 */
export function getViewportCenter(canvas: FabricCanvas): { x: number; y: number } {
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vpt[0] || 1;
  const w = (canvas.getWidth?.() ?? canvas.width ?? 800);
  const h = (canvas.getHeight?.() ?? canvas.height ?? 600);
  const pt = new Point((w / 2 - vpt[4]) / zoom, (h / 2 - vpt[5]) / zoom);
  return { x: pt.x, y: pt.y };
}
