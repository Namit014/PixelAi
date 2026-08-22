/**
 * pathParser.ts — Converts SVG path data strings back into Segment[] format
 * compatible with the pen tool's penToolData structure.
 * 
 * Handles M, L, C, Q, Z commands (absolute) as output by Paper.js boolean operations.
 */

import type { Segment, Point } from './geometry';

interface ParseResult {
  segments: Segment[];
  closed: boolean;
}

export interface ContourParseResult {
  contours: { segments: Segment[]; closed: boolean }[];
}

/**
 * Parse an SVG path data string into pen-tool-compatible Segment[].
 * Supports M, L, C, Q, Z commands (absolute).
 * Handles multiple subpaths by combining them.
 */
export function parseSvgPathToSegments(pathData: string): ParseResult {
  if (!pathData || pathData.trim() === '') {
    return { segments: [], closed: false };
  }

  const allSegments: Segment[] = [];
  let closed = false;

  // Tokenize: split into command + numbers
  const tokens = tokenize(pathData);
  
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;
  let i = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCmd = '';

  while (i < tokens.length) {
    const cmd = tokens[i];
    i++;

    switch (cmd) {
      case 'M': {
        currentX = parseFloat(tokens[i++]);
        currentY = parseFloat(tokens[i++]);
        subpathStartX = currentX;
        subpathStartY = currentY;
        allSegments.push({
          anchor: { x: currentX, y: currentY },
          handleIn: null,
          handleOut: null,
        });
        // Implicit L commands after M
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = parseFloat(tokens[i++]);
          currentY = parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'M';
        break;
      }
      case 'm': {
        currentX += parseFloat(tokens[i++]);
        currentY += parseFloat(tokens[i++]);
        subpathStartX = currentX;
        subpathStartY = currentY;
        allSegments.push({
          anchor: { x: currentX, y: currentY },
          handleIn: null,
          handleOut: null,
        });
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX += parseFloat(tokens[i++]);
          currentY += parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'm';
        break;
      }
      case 'L': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = parseFloat(tokens[i++]);
          currentY = parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'L';
        break;
      }
      case 'l': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX += parseFloat(tokens[i++]);
          currentY += parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'l';
        break;
      }
      case 'H': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'H';
        break;
      }
      case 'h': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX += parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'h';
        break;
      }
      case 'V': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentY = parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'V';
        break;
      }
      case 'v': {
        while (i < tokens.length && isNumber(tokens[i])) {
          currentY += parseFloat(tokens[i++]);
          allSegments.push({
            anchor: { x: currentX, y: currentY },
            handleIn: null,
            handleOut: null,
          });
        }
        lastCmd = 'v';
        break;
      }
      case 'C': {
        while (i < tokens.length && isNumber(tokens[i])) {
          const cp1x = parseFloat(tokens[i++]);
          const cp1y = parseFloat(tokens[i++]);
          const cp2x = parseFloat(tokens[i++]);
          const cp2y = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          // Set handleOut on the previous segment
          if (allSegments.length > 0) {
            allSegments[allSegments.length - 1].handleOut = { x: cp1x, y: cp1y };
          }

          allSegments.push({
            anchor: { x, y },
            handleIn: { x: cp2x, y: cp2y },
            handleOut: null,
          });

          currentX = x;
          currentY = y;
          lastControlX = cp2x;
          lastControlY = cp2y;
        }
        lastCmd = 'C';
        break;
      }
      case 'c': {
        while (i < tokens.length && isNumber(tokens[i])) {
          const cp1x = currentX + parseFloat(tokens[i++]);
          const cp1y = currentY + parseFloat(tokens[i++]);
          const cp2x = currentX + parseFloat(tokens[i++]);
          const cp2y = currentY + parseFloat(tokens[i++]);
          const x = currentX + parseFloat(tokens[i++]);
          const y = currentY + parseFloat(tokens[i++]);

          if (allSegments.length > 0) {
            allSegments[allSegments.length - 1].handleOut = { x: cp1x, y: cp1y };
          }

          allSegments.push({
            anchor: { x, y },
            handleIn: { x: cp2x, y: cp2y },
            handleOut: null,
          });

          currentX = x;
          currentY = y;
          lastControlX = cp2x;
          lastControlY = cp2y;
        }
        lastCmd = 'c';
        break;
      }
      case 'Q': {
        while (i < tokens.length && isNumber(tokens[i])) {
          const cpx = parseFloat(tokens[i++]);
          const cpy = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          // Convert quadratic to cubic handles
          const prevX = currentX;
          const prevY = currentY;
          const cp1x = prevX + (2 / 3) * (cpx - prevX);
          const cp1y = prevY + (2 / 3) * (cpy - prevY);
          const cp2x = x + (2 / 3) * (cpx - x);
          const cp2y = y + (2 / 3) * (cpy - y);

          if (allSegments.length > 0) {
            allSegments[allSegments.length - 1].handleOut = { x: cp1x, y: cp1y };
          }

          allSegments.push({
            anchor: { x, y },
            handleIn: { x: cp2x, y: cp2y },
            handleOut: null,
          });

          currentX = x;
          currentY = y;
          lastControlX = cpx;
          lastControlY = cpy;
        }
        lastCmd = 'Q';
        break;
      }
      case 'S': {
        while (i < tokens.length && isNumber(tokens[i])) {
          // Reflected control point
          let cp1x: number, cp1y: number;
          if (lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's') {
            cp1x = 2 * currentX - lastControlX;
            cp1y = 2 * currentY - lastControlY;
          } else {
            cp1x = currentX;
            cp1y = currentY;
          }
          const cp2x = parseFloat(tokens[i++]);
          const cp2y = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]);
          const y = parseFloat(tokens[i++]);

          if (allSegments.length > 0) {
            allSegments[allSegments.length - 1].handleOut = { x: cp1x, y: cp1y };
          }

          allSegments.push({
            anchor: { x, y },
            handleIn: { x: cp2x, y: cp2y },
            handleOut: null,
          });

          currentX = x;
          currentY = y;
          lastControlX = cp2x;
          lastControlY = cp2y;
        }
        lastCmd = 'S';
        break;
      }
      case 'Z':
      case 'z': {
        closed = true;
        // If the last segment coincides with the first, merge handles
        if (allSegments.length >= 2) {
          const first = allSegments[0];
          const last = allSegments[allSegments.length - 1];
          const dx = Math.abs(last.anchor.x - first.anchor.x);
          const dy = Math.abs(last.anchor.y - first.anchor.y);
          if (dx < 0.01 && dy < 0.01) {
            // Transfer handleIn from last to first, remove duplicate
            if (last.handleIn) {
              first.handleIn = last.handleIn;
            }
            allSegments.pop();
          }
        }
        currentX = subpathStartX;
        currentY = subpathStartY;
        lastCmd = 'Z';
        break;
      }
      default:
        // Skip unknown commands
        break;
    }
  }

  return { segments: allSegments, closed };
}

/**
 * Parse an SVG path data string into separate contours (subpaths).
 * Each M...Z block becomes its own contour with independent segments and closed status.
 * This prevents boolean compound paths from creating illegal connector lines.
 */
export function parseSvgPathToContours(pathData: string): ContourParseResult {
  if (!pathData || pathData.trim() === '') {
    return { contours: [] };
  }

  const contours: { segments: Segment[]; closed: boolean }[] = [];
  let currentContour: Segment[] = [];
  let closed = false;

  const tokens = tokenize(pathData);
  let currentX = 0, currentY = 0;
  let subpathStartX = 0, subpathStartY = 0;
  let lastControlX = 0, lastControlY = 0;
  let lastCmd = '';
  let i = 0;

  const finalizeContour = () => {
    if (currentContour.length > 0) {
      // If closed, merge duplicate start/end points
      if (closed && currentContour.length >= 2) {
        const first = currentContour[0];
        const last = currentContour[currentContour.length - 1];
        const dx = Math.abs(last.anchor.x - first.anchor.x);
        const dy = Math.abs(last.anchor.y - first.anchor.y);
        if (dx < 0.01 && dy < 0.01) {
          if (last.handleIn) first.handleIn = last.handleIn;
          currentContour.pop();
        }
      }
      contours.push({ segments: [...currentContour], closed });
      currentContour = [];
      closed = false;
    }
  };

  while (i < tokens.length) {
    const cmd = tokens[i]; i++;
    switch (cmd) {
      case 'M': case 'm': {
        // New M starts a new contour — finalize previous one
        finalizeContour();
        const rel = cmd === 'm';
        currentX = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
        currentY = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
        subpathStartX = currentX; subpathStartY = currentY;
        currentContour.push({ anchor: { x: currentX, y: currentY }, handleIn: null, handleOut: null });
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentY = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentContour.push({ anchor: { x: currentX, y: currentY }, handleIn: null, handleOut: null });
        }
        lastCmd = cmd; break;
      }
      case 'L': case 'l': {
        const rel = cmd === 'l';
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentY = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentContour.push({ anchor: { x: currentX, y: currentY }, handleIn: null, handleOut: null });
        }
        lastCmd = cmd; break;
      }
      case 'H': case 'h': {
        const rel = cmd === 'h';
        while (i < tokens.length && isNumber(tokens[i])) {
          currentX = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentContour.push({ anchor: { x: currentX, y: currentY }, handleIn: null, handleOut: null });
        }
        lastCmd = cmd; break;
      }
      case 'V': case 'v': {
        const rel = cmd === 'v';
        while (i < tokens.length && isNumber(tokens[i])) {
          currentY = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          currentContour.push({ anchor: { x: currentX, y: currentY }, handleIn: null, handleOut: null });
        }
        lastCmd = cmd; break;
      }
      case 'C': case 'c': {
        const rel = cmd === 'c';
        while (i < tokens.length && isNumber(tokens[i])) {
          const cp1x = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const cp1y = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const cp2x = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const cp2y = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const x = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const y = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          if (currentContour.length > 0) {
            currentContour[currentContour.length - 1].handleOut = { x: cp1x, y: cp1y };
          }
          currentContour.push({ anchor: { x, y }, handleIn: { x: cp2x, y: cp2y }, handleOut: null });
          currentX = x; currentY = y;
          lastControlX = cp2x; lastControlY = cp2y;
        }
        lastCmd = cmd; break;
      }
      case 'Q': {
        while (i < tokens.length && isNumber(tokens[i])) {
          const cpx = parseFloat(tokens[i++]); const cpy = parseFloat(tokens[i++]);
          const x = parseFloat(tokens[i++]); const y = parseFloat(tokens[i++]);
          const cp1x = currentX + (2/3) * (cpx - currentX);
          const cp1y = currentY + (2/3) * (cpy - currentY);
          const cp2x = x + (2/3) * (cpx - x);
          const cp2y = y + (2/3) * (cpy - y);
          if (currentContour.length > 0) currentContour[currentContour.length - 1].handleOut = { x: cp1x, y: cp1y };
          currentContour.push({ anchor: { x, y }, handleIn: { x: cp2x, y: cp2y }, handleOut: null });
          currentX = x; currentY = y;
        }
        lastCmd = 'Q'; break;
      }
      case 'S': case 's': {
        const rel = cmd === 's';
        while (i < tokens.length && isNumber(tokens[i])) {
          let cp1x: number, cp1y: number;
          if ('CcSs'.includes(lastCmd)) {
            cp1x = 2 * currentX - lastControlX;
            cp1y = 2 * currentY - lastControlY;
          } else { cp1x = currentX; cp1y = currentY; }
          const cp2x = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const cp2y = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const x = rel ? currentX + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          const y = rel ? currentY + parseFloat(tokens[i++]) : parseFloat(tokens[i++]);
          if (currentContour.length > 0) currentContour[currentContour.length - 1].handleOut = { x: cp1x, y: cp1y };
          currentContour.push({ anchor: { x, y }, handleIn: { x: cp2x, y: cp2y }, handleOut: null });
          currentX = x; currentY = y;
          lastControlX = cp2x; lastControlY = cp2y;
        }
        lastCmd = cmd; break;
      }
      case 'Z': case 'z': {
        closed = true;
        finalizeContour();
        currentX = subpathStartX; currentY = subpathStartY;
        lastCmd = 'Z'; break;
      }
    }
  }
  // Finalize any remaining open contour
  finalizeContour();
  return { contours };
}

/**
 * Tokenize SVG path data into an array of commands and numbers.
 */
function tokenize(pathData: string): string[] {
  const tokens: string[] = [];
  // Match commands or numbers (including negative and decimal)
  const re = /([a-zA-Z])|(-?\d+\.?\d*(?:e[+-]?\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pathData)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function isNumber(token: string | undefined): boolean {
  if (!token) return false;
  return /^-?\d/.test(token);
}
