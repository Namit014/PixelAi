/**
 * TextToOutlines — Convert Fabric.js IText/Textbox objects to SVG path outlines.
 * Uses opentype.js to parse font files, extract glyph paths, and generate clean SVG path data.
 * Preserves kerning, letter spacing, line height, alignment, and transforms.
 */

import opentype from 'opentype.js';
import paper from 'paper';

// Cache loaded fonts to avoid re-fetching
const fontCache = new Map<string, opentype.Font>();

// Common web-safe font URLs (Google Fonts CDN - .woff format that opentype.js can parse)
const FONT_URL_MAP: Record<string, string> = {
  'Inter': 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
  'Roboto': 'https://fonts.gstatic.com/s/roboto/v47/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GVWQ.woff',
  'Open Sans': 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.woff',
  'Lato': 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXg.woff',
  'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff',
  'Poppins': 'https://fonts.gstatic.com/s/poppins/v22/pxiEyp8kv8JHgFVrJJfecg.woff',
  'Oswald': 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYA.woff',
  'Playfair Display': 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff',
  'Raleway': 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrE.woff',
  'Source Sans Pro': 'https://fonts.gstatic.com/s/sourcesanspro/v22/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.woff',
  'Nunito': 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTY9jo7eTWk.woff',
  'PT Sans': 'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0KExQ.woff',
};

// Initialize Paper.js headlessly
let paperInitialized = false;
function ensurePaperSetup() {
  if (!paperInitialized) {
    paper.setup(new paper.Size(1, 1));
    paperInitialized = true;
  }
}

interface TextOutlineOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number;
  fontStyle?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: string;
  width?: number;
  transformMatrix?: number[];
}

interface TextOutlineResult {
  pathData: string;
  width: number;
  height: number;
}

/**
 * Load a font by family name.
 * Priority: 1) Cache, 2) Edge function proxy (TTF), 3) Direct URL map, 4) document.fonts
 */
export async function loadFont(fontFamily: string, fontWeight?: string | number, fontStyle?: string): Promise<opentype.Font | null> {
  const cacheKey = `${fontFamily}_${fontWeight || 'normal'}_${fontStyle || 'normal'}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey)!;

  const weight = typeof fontWeight === 'number' ? fontWeight : (fontWeight === 'bold' ? 700 : 400);
  const style = fontStyle || 'normal';

  // 1) Try edge function proxy — fetches TTF from Google Fonts server-side
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (projectId) {
      const proxyUrl = `https://${projectId}.supabase.co/functions/v1/fetch-google-font?family=${encodeURIComponent(fontFamily)}&weight=${weight}&style=${style}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('octet-stream') || contentType.includes('font')) {
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 1000) {
            const font = opentype.parse(buffer);
            fontCache.set(cacheKey, font);
            console.log(`TextToOutlines: Loaded "${fontFamily}" via edge function proxy (TTF)`);
            return font;
          }
        }
      }
    }
  } catch (e) {
    console.warn(`TextToOutlines: Edge function proxy failed for "${fontFamily}"`, e);
  }

  // 2) Try direct URL from our map (woff — opentype.js can parse woff but not woff2)
  const fontUrl = FONT_URL_MAP[fontFamily];
  if (fontUrl) {
    try {
      const font = await opentype.load(fontUrl);
      fontCache.set(cacheKey, font);
      return font;
    } catch (e) {
      console.warn(`TextToOutlines: Failed to load font "${fontFamily}" from URL map`, e);
    }
  }

  // 3) Try document.fonts API (system fonts / @font-face)
  const systemFont = await loadFontFromDocumentFonts(fontFamily, fontWeight, fontStyle);
  if (systemFont) {
    fontCache.set(cacheKey, systemFont);
    return systemFont;
  }

  console.warn(`TextToOutlines: Could not load font "${fontFamily}" — will use bitmap fallback`);
  return null;
}

/**
 * Attempt to get font data from the document.fonts API.
 * This works for system fonts that are available via CSS @font-face or loaded in the page.
 */
async function loadFontFromDocumentFonts(
  fontFamily: string,
  fontWeight?: string | number,
  fontStyle?: string
): Promise<opentype.Font | null> {
  if (typeof document === 'undefined' || !document.fonts) return null;

  try {
    const weight = fontWeight?.toString() || 'normal';
    const style = fontStyle || 'normal';
    
    // Check if the font is available
    const available = document.fonts.check(`${style} ${weight} 16px "${fontFamily}"`);
    if (!available) {
      // Try loading it
      await document.fonts.load(`${style} ${weight} 16px "${fontFamily}"`);
    }

    // Iterate loaded fonts to find matching FontFace
    for (const face of document.fonts) {
      if (face.family.replace(/['"]/g, '') === fontFamily) {
        // Ensure the font face is loaded
        await face.load();
        
        // Try to get the ArrayBuffer from the font face
        // FontFace may have been created with a URL or ArrayBuffer
        if ((face as any).data) {
          // Rare: some implementations expose raw data
          const buffer = (face as any).data;
          return opentype.parse(buffer instanceof ArrayBuffer ? buffer : await buffer.arrayBuffer());
        }

        // Try fetching the font URL from the CSS source
        const src = (face as any).src || '';
        const urlMatch = src.match(/url\(["']?([^"')]+)["']?\)/);
        if (urlMatch && urlMatch[1]) {
          const response = await fetch(urlMatch[1]);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            return opentype.parse(buffer);
          }
        }
      }
    }
  } catch (e) {
    console.warn(`TextToOutlines: document.fonts fallback failed for "${fontFamily}"`, e);
  }

  return null;
}

/**
 * Convert text to SVG path outlines using opentype.js.
 */
function textToPathData(
  font: opentype.Font,
  text: string,
  fontSize: number,
  x: number,
  y: number,
  letterSpacing: number = 0
): string {
  const glyphs = font.stringToGlyphs(text);
  let currentX = x;
  const scale = fontSize / font.unitsPerEm;
  const paths: string[] = [];

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const glyphPath = glyph.getPath(currentX, y, fontSize);
    const svgPath = glyphPath.toSVG();
    
    const match = svgPath.match(/d="([^"]+)"/);
    if (match && match[1] && match[1].trim()) {
      paths.push(match[1]);
    }

    const advance = (glyph.advanceWidth || 0) * scale;
    let kerning = 0;
    if (i < glyphs.length - 1) {
      kerning = font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    }
    currentX += advance + kerning + letterSpacing;
  }

  return paths.join(' ');
}

export interface GlyphPathData {
  pathData: string;
  char: string;
}

/**
 * Convert text to individual per-glyph SVG path data arrays.
 * Each glyph gets its own complete path data string (may contain subpaths for holes).
 */
function textToPerGlyphPaths(
  font: opentype.Font,
  text: string,
  fontSize: number,
  x: number,
  y: number,
  letterSpacing: number = 0
): GlyphPathData[] {
  const glyphs = font.stringToGlyphs(text);
  let currentX = x;
  const scale = fontSize / font.unitsPerEm;
  const result: GlyphPathData[] = [];

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const char = text[i] || '';

    if (char.trim()) {
      const glyphPath = glyph.getPath(currentX, y, fontSize);
      const svgPath = glyphPath.toSVG();
      const match = svgPath.match(/d="([^"]+)"/);
      if (match && match[1] && match[1].trim()) {
        result.push({ pathData: match[1], char });
      }
    }

    const advance = (glyph.advanceWidth || 0) * scale;
    let kerning = 0;
    if (i < glyphs.length - 1) {
      kerning = font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    }
    currentX += advance + kerning + letterSpacing;
  }

  return result;
}

/**
 * Convert a multi-line text block into per-glyph path data arrays.
 */
export async function convertTextToGlyphPaths(options: TextOutlineOptions): Promise<GlyphPathData[] | null> {
  const {
    text, fontFamily, fontSize, fontWeight, fontStyle,
    letterSpacing = 0, lineHeight = 1.2, textAlign = 'left',
    width: maxWidth,
  } = options;

  const font = await loadFont(fontFamily, fontWeight, fontStyle);
  if (!font) return null;

  const lines = text.split('\n');
  const lineHeightPx = fontSize * lineHeight;
  const ascender = (font.ascender / font.unitsPerEm) * fontSize;
  const allGlyphs: GlyphPathData[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    const lineWidth = measureLineWidth(font, line, fontSize, letterSpacing);
    let xOffset = 0;
    if (textAlign === 'center' && maxWidth) xOffset = (maxWidth - lineWidth) / 2;
    else if (textAlign === 'right' && maxWidth) xOffset = maxWidth - lineWidth;

    const y = ascender + lineIdx * lineHeightPx;
    const glyphs = textToPerGlyphPaths(font, line, fontSize, xOffset, y, letterSpacing);
    allGlyphs.push(...glyphs);
  }

  return allGlyphs.length > 0 ? allGlyphs : null;
}

/**
 * Convert a multi-line text block to SVG path outlines.
 */
export async function convertTextToOutlines(options: TextOutlineOptions): Promise<TextOutlineResult | null> {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    letterSpacing = 0,
    lineHeight = 1.2,
    textAlign = 'left',
    width: maxWidth,
    transformMatrix,
  } = options;

  const font = await loadFont(fontFamily, fontWeight, fontStyle);
  
  if (!font) {
    // Fallback: use Paper.js PointText which leverages the browser's font rendering
    console.log('TextToOutlines: Using Paper.js fallback for font:', fontFamily);
    return convertTextWithPaperJs(options);
  }

  const lines = text.split('\n');
  const lineHeightPx = fontSize * lineHeight;
  const ascender = (font.ascender / font.unitsPerEm) * fontSize;
  let allPaths: string[] = [];
  let totalHeight = 0;
  let maxLineWidth = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) {
      totalHeight += lineHeightPx;
      continue;
    }

    const lineWidth = measureLineWidth(font, line, fontSize, letterSpacing);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);

    let xOffset = 0;
    if (textAlign === 'center' && maxWidth) {
      xOffset = (maxWidth - lineWidth) / 2;
    } else if (textAlign === 'right' && maxWidth) {
      xOffset = maxWidth - lineWidth;
    }

    const y = ascender + lineIdx * lineHeightPx;
    const linePathData = textToPathData(font, line, fontSize, xOffset, y, letterSpacing);
    if (linePathData.trim()) {
      allPaths.push(linePathData);
    }
    totalHeight = y + (lineHeightPx - ascender);
  }

  if (allPaths.length === 0) return null;

  let pathData = allPaths.join(' ');

  if (transformMatrix) {
    pathData = applyTransformToPathData(pathData, transformMatrix);
  }

  return {
    pathData,
    width: maxWidth || maxLineWidth,
    height: totalHeight,
  };
}

/**
 * Measure the width of a line of text
 */
function measureLineWidth(font: opentype.Font, text: string, fontSize: number, letterSpacing: number): number {
  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;
  let width = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const advance = (glyph.advanceWidth || 0) * scale;
    let kerning = 0;
    if (i < glyphs.length - 1) {
      kerning = font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    }
    width += advance + kerning + letterSpacing;
  }

  return width;
}

/**
 * Apply a 2D transform matrix to SVG path data.
 */
function applyTransformToPathData(pathData: string, matrix: number[]): string {
  const [a, b, c, d, e, f] = matrix;
  
  return pathData.replace(
    /(-?\d+\.?\d*(?:e[+-]?\d+)?)\s*[,\s]\s*(-?\d+\.?\d*(?:e[+-]?\d+)?)/g,
    (_match, xStr, yStr) => {
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      const nx = a * x + c * y + e;
      const ny = b * x + d * y + f;
      return `${nx.toFixed(2)},${ny.toFixed(2)}`;
    }
  );
}

/**
 * Convert a Fabric.js IText/Textbox object to vector outlines.
 */
export async function fabricTextToOutlines(textObj: any): Promise<{
  pathData: string;
  left: number;
  top: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  angle: number;
  scaleX: number;
  scaleY: number;
} | null> {
  const text = textObj.text || '';
  if (!text.trim()) return null;

  const result = await convertTextToOutlines({
    text,
    fontFamily: textObj.fontFamily || 'Arial',
    fontSize: textObj.fontSize || 16,
    fontWeight: textObj.fontWeight || 'normal',
    fontStyle: textObj.fontStyle || 'normal',
    letterSpacing: (textObj.charSpacing || 0) / 1000 * (textObj.fontSize || 16),
    lineHeight: textObj.lineHeight || 1.2,
    textAlign: textObj.textAlign || 'left',
    width: textObj.width,
  });

  if (!result) return null;

  return {
    pathData: result.pathData,
    left: textObj.left || 0,
    top: textObj.top || 0,
    fill: textObj.fill || '#000000',
    stroke: textObj.stroke || '',
    strokeWidth: textObj.strokeWidth || 0,
    opacity: textObj.opacity ?? 1,
    angle: textObj.angle || 0,
    scaleX: textObj.scaleX || 1,
    scaleY: textObj.scaleY || 1,
  };
}

/**
 * Marching squares algorithm: traces contours of a binary bitmap.
 * Returns an array of contours, each being an array of [x, y] points.
 */
function marchingSquares(grid: Uint8Array, w: number, h: number): number[][][] {
  const visited = new Uint8Array((w - 1) * (h - 1));
  const contours: number[][][] = [];

  // Get cell value (2x2 square classification)
  const cellValue = (cx: number, cy: number): number => {
    const tl = cy > 0 && cx > 0 ? grid[(cy - 1) * w + (cx - 1)] : 0;
    const tr = cy > 0 && cx < w ? grid[(cy - 1) * w + cx] : 0;
    const bl = cy < h && cx > 0 ? grid[cy * w + (cx - 1)] : 0;
    const br = cy < h && cx < w ? grid[cy * w + cx] : 0;
    return (tl << 3) | (tr << 2) | (br << 1) | bl;
  };

  // Direction offsets for marching: [dx, dy]
  // Based on the 16 marching squares cases
  const step = (val: number, prevDir: number): [number, number] => {
    switch (val) {
      case 1: return [0, 1];     // ╗
      case 2: return [1, 0];     // ╔
      case 3: return [1, 0];     // ═
      case 4: return [0, -1];    // ╝
      case 5: return prevDir === 1 ? [1, 0] : [-1, 0]; // saddle
      case 6: return [0, -1];    // ║
      case 7: return [1, 0];     // ╦
      case 8: return [-1, 0];    // ╚
      case 9: return [0, 1];     // ║
      case 10: return prevDir === 0 ? [0, 1] : [0, -1]; // saddle
      case 11: return [0, 1];    // ╩
      case 12: return [-1, 0];   // ═
      case 13: return [0, -1];   // (corner)
      case 14: return [-1, 0];   // (corner)
      default: return [0, 0];
    }
  };

  // Find and trace all contours
  for (let cy = 0; cy <= h; cy++) {
    for (let cx = 0; cx <= w; cx++) {
      const val = cellValue(cx, cy);
      if (val === 0 || val === 15) continue;
      
      const vidx = cy < h - 1 && cx < w - 1 ? cy * (w - 1) + cx : -1;
      if (vidx >= 0 && visited[vidx]) continue;

      // Trace this contour
      const contour: number[][] = [];
      let x = cx, y = cy;
      let prevDir = 0;
      const maxSteps = w * h * 2;
      let steps = 0;

      do {
        contour.push([x, y]);
        const v = cellValue(x, y);
        const [dx, dy] = step(v, prevDir);
        if (dx === 0 && dy === 0) break;
        
        prevDir = dx !== 0 ? 0 : 1;
        x += dx;
        y += dy;
        
        const vi = y < h - 1 && x < w - 1 && y >= 0 && x >= 0 ? y * (w - 1) + x : -1;
        if (vi >= 0) visited[vi] = 1;
        
        steps++;
        if (steps > maxSteps) break;
      } while (x !== cx || y !== cy);

      if (contour.length >= 3) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

/**
 * Paper.js fallback: Convert text to outlines using browser font rendering
 * with marching squares contour tracing for clean vector outlines.
 */
function convertTextWithPaperJs(options: TextOutlineOptions): TextOutlineResult | null {
  ensurePaperSetup();

  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    letterSpacing = 0,
    lineHeight = 1.2,
    textAlign = 'left',
    width: maxWidth,
  } = options;

  try {
    const lines = text.split('\n');
    const lineHeightPx = fontSize * lineHeight;
    const allPaths: string[] = [];
    let totalHeight = 0;
    let maxLineWidth = 0;

    const weight = typeof fontWeight === 'number' ? fontWeight : (fontWeight === 'bold' ? 700 : 400);
    const style = fontStyle === 'italic' ? 'italic' : 'normal';

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (!line.trim()) {
        totalHeight += lineHeightPx;
        continue;
      }

      const y = lineIdx * lineHeightPx + fontSize;

      // Create a Paper.js PointText to leverage browser font rendering
      const pointText = new paper.PointText({
        point: new paper.Point(0, y),
        content: line,
        fontFamily: fontFamily,
        fontWeight: weight,
        fontSize: fontSize,
        letterSpacing: letterSpacing,
      });

      // Measure line width
      const lineWidth = pointText.bounds.width;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);

      // Handle alignment
      if (textAlign === 'center' && maxWidth) {
        pointText.point = new paper.Point((maxWidth - lineWidth) / 2, y);
      } else if (textAlign === 'right' && maxWidth) {
        pointText.point = new paper.Point(maxWidth - lineWidth, y);
      }

      // Export the PointText as SVG and extract path data
      const svgElement = pointText.exportSVG({ asString: false }) as SVGElement;
      
      if (svgElement) {
        // Paper.js exportSVG on PointText returns a <text> element.
        // We need to use a different approach: convert to a path item
        // by creating a temporary SVG, rendering text, and tracing.
        
        // Alternative: Use canvas to render each character and build paths
        // Paper.js PointText doesn't directly give path outlines.
        // Instead, render character by character using canvas Path2D approach.
      }
      
      pointText.remove();
      totalHeight = lineIdx * lineHeightPx + lineHeightPx;
    }

    // Paper.js PointText.exportSVG() returns <text>, not <path>.
    // True fallback: use Canvas2D + Path2D to get actual glyph outlines.
    // The TextMetrics API with canvas gives us character positions;
    // we render text to a temporary canvas and use getImageData to trace.
    
    // Render text at 4x resolution for high-quality contour tracing
    const SCALE = 4;
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    const scaledFontSize = fontSize * SCALE;
    const scaledLineHeight = lineHeightPx * SCALE;
    const scaledLetterSpacing = letterSpacing * SCALE;
    const weightStr = typeof fontWeight === 'number' ? String(fontWeight) : (fontWeight === 'bold' ? '700' : '400');
    const styleStr = fontStyle === 'italic' ? 'italic ' : '';
    ctx.font = `${styleStr}${weightStr} ${scaledFontSize}px "${fontFamily}"`;

    // Measure total dimensions at scaled size
    let totalWidth = 0;
    totalHeight = 0;
    const lineData: { text: string; width: number; y: number; xOffset: number }[] = [];
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const y = lineIdx * scaledLineHeight;
      if (!line.trim()) {
        totalHeight = y + scaledLineHeight;
        continue;
      }
      const metrics = ctx.measureText(line);
      const lw = metrics.width + Math.max(0, line.length - 1) * scaledLetterSpacing;
      totalWidth = Math.max(totalWidth, lw);
      
      let xOffset = 0;
      const scaledMaxWidth = maxWidth ? maxWidth * SCALE : 0;
      if (textAlign === 'center' && scaledMaxWidth) xOffset = (scaledMaxWidth - lw) / 2;
      else if (textAlign === 'right' && scaledMaxWidth) xOffset = scaledMaxWidth - lw;
      
      lineData.push({ text: line, width: lw, y, xOffset });
      totalHeight = y + scaledLineHeight;
    }

    const canvasWidth = Math.ceil((maxWidth ? maxWidth * SCALE : totalWidth)) + 8;
    const canvasHeight = Math.ceil(totalHeight) + 8;
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;

    // Re-set font after resize (canvas reset clears state)
    ctx.font = `${styleStr}${weightStr} ${scaledFontSize}px "${fontFamily}"`;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    for (const ld of lineData) {
      if (scaledLetterSpacing > 0) {
        let cx = ld.xOffset;
        for (const char of ld.text) {
          ctx.fillText(char, cx, ld.y);
          cx += ctx.measureText(char).width + scaledLetterSpacing;
        }
      } else {
        ctx.fillText(ld.text, ld.xOffset, ld.y);
      }
    }

    // Trace contours using marching squares on the alpha channel
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const alphaData = imageData.data;
    const w = canvasWidth;
    const h = canvasHeight;
    const threshold = 128;

    // Build a binary grid
    const grid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      grid[i] = alphaData[i * 4 + 3] >= threshold ? 1 : 0;
    }

    // Marching squares contour tracing
    const contours = marchingSquares(grid, w, h);

    if (contours.length === 0) return null;

    // Convert contours to Paper.js paths, scale back to 1x, simplify, and combine
    // Use CompoundPath with fill-rule evenodd to handle holes automatically
    const allPathData: string[] = [];

    for (const contour of contours) {
      if (contour.length < 4) continue;
      
      // Scale points back to original resolution
      const scaledSegments: paper.Segment[] = contour.map(
        (pt) => new paper.Segment(new paper.Point(pt[0] / SCALE, pt[1] / SCALE))
      );
      const path = new paper.Path(scaledSegments);
      path.closed = true;

      // Simplify with higher tolerance for smoother curves
      path.simplify(2.0);

      const pd = path.pathData;
      if (pd && pd.trim()) {
        allPathData.push(pd);
      }
      path.remove();
    }

    if (allPathData.length === 0) return null;

    // Combine all contours into a single CompoundPath
    // CompoundPath with fill-rule evenodd handles holes automatically
    const compoundPathStr = allPathData.join(' ');
    const compoundPath = new paper.CompoundPath(compoundPathStr);
    compoundPath.fillRule = 'evenodd';
    
    const finalPathData = compoundPath.pathData;
    compoundPath.remove();

    if (!finalPathData || finalPathData.trim() === '') return null;

    // Return dimensions at original (1x) scale
    return {
      pathData: finalPathData,
      width: maxWidth || (totalWidth / SCALE),
      height: totalHeight / SCALE,
    };
  } catch (e) {
    console.error('TextToOutlines: Paper.js fallback failed', e);
    return null;
  }
}
