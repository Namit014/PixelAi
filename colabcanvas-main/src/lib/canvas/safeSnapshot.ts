/**
 * Safe selection snapshot helper.
 *
 * Fabric v6's `canvas.toDataURL(...)` and even `obj.toDataURL(...)` can throw
 *   TypeError: Cannot read properties of undefined (reading 'clearRect')
 * when called against the live, interactive canvas while a render cycle is in
 * flight or while the canvas element is being torn down by React. This helper
 * re-renders the requested objects on a fresh offscreen StaticCanvas so the
 * snapshot can never race with the live canvas's rendering pipeline.
 */
import {
  Canvas as FabricCanvas,
  StaticCanvas,
  util as fabricUtil,
  type Object as FabricObject,
} from "fabric";

const PROPS_TO_INCLUDE = [
  "selectable",
  "evented",
  "visible",
  "rx",
  "ry",
  "filters",
  "shadow",
  "penToolData",
  "textOnPath",
  "isStandaloneObject",
  "componentId",
  "componentInstanceId",
  "isComponentInstance",
];

export interface SnapshotOptions {
  /** Output format. Defaults to png. */
  format?: "png" | "jpeg";
  /** Pixel density multiplier. Defaults to 2. */
  multiplier?: number;
  /** Maximum output width/height in pixels (after multiplier). Defaults to 4096. */
  maxDimension?: number;
  /** Background color. Defaults to transparent for png, white for jpeg. */
  background?: string | null;
}

export interface SnapshotResult {
  dataUrl: string;
  width: number;
  height: number;
}

function getBoundsForObjects(objects: FabricObject[]) {
  const rects = objects.map((o) => o.getBoundingRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

/**
 * Render the given Fabric objects onto an offscreen StaticCanvas and return a data URL.
 * Always falls back gracefully when the source object exposes a direct image source.
 */
export async function snapshotObjects(
  objects: FabricObject[],
  options: SnapshotOptions = {},
): Promise<SnapshotResult> {
  if (!objects.length) throw new Error("No objects to snapshot");

  const format = options.format ?? "png";
  const multiplier = options.multiplier ?? 2;
  const maxDimension = options.maxDimension ?? 4096;
  const background =
    options.background === undefined
      ? format === "jpeg"
        ? "#ffffff"
        : null
      : options.background;

  const { left, top, width, height } = getBoundsForObjects(objects);

  // Cap final pixel dimensions so giant artboards don't blow out memory.
  let finalMultiplier = multiplier;
  const longest = Math.max(width, height) * finalMultiplier;
  if (longest > maxDimension) {
    finalMultiplier = maxDimension / Math.max(width, height);
  }

  const canvasW = Math.max(1, Math.round(width * finalMultiplier));
  const canvasH = Math.max(1, Math.round(height * finalMultiplier));

  const off = document.createElement("canvas");
  off.width = canvasW;
  off.height = canvasH;
  const staticCanvas = new StaticCanvas(off, {
    width: canvasW,
    height: canvasH,
    backgroundColor: background ?? "rgba(0,0,0,0)",
    enableRetinaScaling: false,
  });

  // Serialize then enliven so we never mutate live objects on the active canvas.
  const json = objects.map((o: any) => {
    const j = o.toObject(PROPS_TO_INCLUDE);
    j.left = (j.left ?? 0) - left;
    j.top = (j.top ?? 0) - top;
    return j;
  });

  let enlivened: FabricObject[] = [];
  try {
    enlivened = (await fabricUtil.enlivenObjects(json)) as FabricObject[];
  } catch (err) {
    staticCanvas.dispose();
    throw err;
  }

  enlivened.forEach((o: any) => {
    o.scaleX = (o.scaleX ?? 1) * finalMultiplier;
    o.scaleY = (o.scaleY ?? 1) * finalMultiplier;
    o.left = (o.left ?? 0) * finalMultiplier;
    o.top = (o.top ?? 0) * finalMultiplier;
    staticCanvas.add(o);
  });
  staticCanvas.renderAll();

  // Wait one frame so any async image loads inside enlivened objects flush.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  staticCanvas.renderAll();

  let dataUrl = "";
  try {
    dataUrl = off.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 1);
  } finally {
    try {
      staticCanvas.dispose();
    } catch {
      /* ignore */
    }
  }

  return { dataUrl, width: canvasW, height: canvasH };
}

/**
 * Best-effort snapshot for a single image-like Fabric object.
 * Returns the original src when available so we never crash on toDataURL races.
 */
export async function snapshotSingleImageOrSource(
  obj: any,
  options: SnapshotOptions = {},
): Promise<string> {
  // Prefer the underlying network source when it's a usable URL — much cheaper
  // and avoids any chance of a Fabric render race.
  const src: string | undefined =
    obj?.getSrc?.() ||
    obj?._originalElement?.src ||
    obj?._element?.src ||
    undefined;
  if (src && (src.startsWith("http") || src.startsWith("data:"))) {
    return src;
  }

  const result = await snapshotObjects([obj], options);
  return result.dataUrl;
}

/**
 * Snapshot the current selection (1+ objects) on a Fabric canvas safely.
 * Falls back to direct image source if the snapshot pipeline crashes for a
 * single image object.
 */
export async function snapshotSelection(
  _canvas: FabricCanvas | null,
  objects: FabricObject[],
  options: SnapshotOptions = {},
): Promise<SnapshotResult> {
  try {
    return await snapshotObjects(objects, options);
  } catch (err) {
    if (objects.length === 1) {
      const fallback = await snapshotSingleImageOrSource(objects[0], options);
      return { dataUrl: fallback, width: 0, height: 0 };
    }
    throw err;
  }
}
