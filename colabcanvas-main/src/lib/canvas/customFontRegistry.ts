// Registers compiled custom fonts with the browser's FontFace API so that
// Fabric Textbox layers using `fontFamily: <familyName>` can render and be edited.
//
// Source can be either a base64 string (preferred — no CORS) or a remote URL.

const loaded = new Map<string, Promise<void>>();

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface CustomFontSource {
  familyName: string;
  fontDataBase64?: string | null;
  fontUrl?: string | null;
  fontMime?: string;
}

export async function ensureCustomFont(src: CustomFontSource): Promise<boolean> {
  const { familyName } = src;
  if (!familyName) return false;
  if (loaded.has(familyName)) {
    try { await loaded.get(familyName)!; return true; } catch { return false; }
  }

  const task = (async () => {
    let face: FontFace;
    if (src.fontDataBase64) {
      const bytes = base64ToBytes(src.fontDataBase64);
      // Slice into a fresh ArrayBuffer so the type is non-shared.
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      face = new FontFace(familyName, ab);
    } else if (src.fontUrl) {
      const fmt = (src.fontMime || "").includes("woff2") ? "woff2"
        : (src.fontMime || "").includes("woff") ? "woff"
        : "opentype";
      face = new FontFace(familyName, `url(${src.fontUrl}) format("${fmt}")`);
    } else {
      throw new Error("ensureCustomFont: no font data or url");
    }
    await face.load();
    (document as any).fonts.add(face);
  })();

  loaded.set(familyName, task);
  try { await task; return true; }
  catch (e) { console.error("ensureCustomFont failed", familyName, e); loaded.delete(familyName); return false; }
}

/**
 * Scan a list of saved canvas object records (raw `object_data`) and preload all
 * generated custom fonts in parallel before they are reconstructed on the canvas.
 * Safe to call with arbitrary objects — entries without font metadata are ignored.
 */
export async function ensureCustomFontsForObjects(objects: any[]): Promise<void> {
  if (!Array.isArray(objects) || objects.length === 0) return;
  const sources = new Map<string, CustomFontSource>();
  for (const obj of objects) {
    const data = obj?.object_data ?? obj?.objectData ?? obj;
    const meta = data?.fontMetadata;
    if (!meta || !meta.customCompiledFont || !meta.familyName) continue;
    if (!meta.fontDataBase64 && !meta.fontUrl) continue;
    if (sources.has(meta.familyName)) continue;
    sources.set(meta.familyName, {
      familyName: meta.familyName,
      fontDataBase64: meta.fontDataBase64,
      fontUrl: meta.fontUrl,
      fontMime: meta.fontMime,
    });
  }
  if (sources.size === 0) return;
  await Promise.allSettled(Array.from(sources.values()).map((s) => ensureCustomFont(s)));
}
