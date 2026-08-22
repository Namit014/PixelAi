/**
 * Canvas Layout System
 * Provides grid-based positioning for canvas objects with consistent spacing
 */

export interface LayoutConfig {
  startX: number;
  startY: number;
  itemWidth: number;
  itemHeight: number;
  horizontalGap: number;
  verticalGap: number;
  itemsPerRow: number;
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Calculate grid positions for multiple items
 * Places items in a predictable left-to-right, top-to-bottom flow
 */
export function calculateGridPositions(
  itemCount: number,
  viewportCenter: Position,
  config?: Partial<LayoutConfig>,
  existingObjects?: Array<{ left: number; top: number; width?: number; height?: number }>
): Position[] {
  const defaultConfig: LayoutConfig = {
    startX: viewportCenter.x - 400,
    startY: viewportCenter.y - 300,
    itemWidth: 250,
    itemHeight: 250,
    horizontalGap: 50,
    verticalGap: 50,
    itemsPerRow: 3,
    ...config
  };

  const positions: Position[] = [];
  
  // Check if position overlaps with existing objects
  const hasOverlap = (testX: number, testY: number) => {
    if (!existingObjects || existingObjects.length === 0) return false;
    
    return existingObjects.some(obj => {
      const objX = obj.left || 0;
      const objY = obj.top || 0;
      const objWidth = obj.width || defaultConfig.itemWidth;
      const objHeight = obj.height || defaultConfig.itemHeight;
      
      const dx = Math.abs(testX - objX);
      const dy = Math.abs(testY - objY);
      
      return dx < (defaultConfig.itemWidth + defaultConfig.horizontalGap) && 
             dy < (defaultConfig.itemHeight + defaultConfig.verticalGap);
    });
  };
  
  for (let i = 0; i < itemCount; i++) {
    const row = Math.floor(i / defaultConfig.itemsPerRow);
    const col = i % defaultConfig.itemsPerRow;
    
    let x = defaultConfig.startX + col * (defaultConfig.itemWidth + defaultConfig.horizontalGap);
    let y = defaultConfig.startY + row * (defaultConfig.itemHeight + defaultConfig.verticalGap);
    
    // Check for collision and find next available position
    let attempts = 0;
    while (hasOverlap(x, y) && attempts < 100) {
      // Try next position in grid
      const nextIndex = i + attempts + 1;
      const nextRow = Math.floor(nextIndex / defaultConfig.itemsPerRow);
      const nextCol = nextIndex % defaultConfig.itemsPerRow;
      
      x = defaultConfig.startX + nextCol * (defaultConfig.itemWidth + defaultConfig.horizontalGap);
      y = defaultConfig.startY + nextRow * (defaultConfig.itemHeight + defaultConfig.verticalGap);
      attempts++;
    }
    
    positions.push({ x, y });
  }
  
  return positions;
}

/**
 * Calculate centered position for a single item
 * Used when placing standalone objects
 */
export function calculateCenteredPosition(
  viewportCenter: Position,
  itemWidth: number = 250,
  itemHeight: number = 250
): Position {
  return {
    x: viewportCenter.x - itemWidth / 2,
    y: viewportCenter.y - itemHeight / 2
  };
}

/**
 * Find the next available position that doesn't overlap existing objects
 */
export function findAvailablePosition(
  existingPositions: Position[],
  viewportCenter: Position,
  itemWidth: number = 250,
  itemHeight: number = 250,
  gap: number = 50
): Position {
  // Start from center
  let testPosition = calculateCenteredPosition(viewportCenter, itemWidth, itemHeight);
  
  // Check for overlaps
  const hasOverlap = (pos: Position) => {
    return existingPositions.some(existing => {
      const dx = Math.abs(pos.x - existing.x);
      const dy = Math.abs(pos.y - existing.y);
      return dx < (itemWidth + gap) && dy < (itemHeight + gap);
    });
  };
  
  // If center is occupied, try positions in a spiral pattern
  if (hasOverlap(testPosition)) {
    const offset = itemWidth + gap;
    const positions = [
      { x: testPosition.x + offset, y: testPosition.y },
      { x: testPosition.x - offset, y: testPosition.y },
      { x: testPosition.x, y: testPosition.y + offset },
      { x: testPosition.x, y: testPosition.y - offset },
      { x: testPosition.x + offset, y: testPosition.y + offset },
      { x: testPosition.x - offset, y: testPosition.y - offset },
    ];
    
    for (const pos of positions) {
      if (!hasOverlap(pos)) {
        return pos;
      }
    }
  }
  
  return testPosition;
}

/**
 * Find non-overlapping position for a new element on canvas
 * Uses bounding rect collision detection for accurate overlap checking
 */
export function findNonOverlappingPosition(
  existingObjects: Array<{ left: number; top: number; width: number; height: number }>,
  viewportCenter: Position,
  itemWidth: number,
  itemHeight: number,
  gap: number = 40
): Position {
  // Calculate scaled dimensions for the actual display size
  const scaledWidth = itemWidth;
  const scaledHeight = itemHeight;
  
  // Start from viewport center
  const startPosition: Position = {
    x: viewportCenter.x - scaledWidth / 2,
    y: viewportCenter.y - scaledHeight / 2
  };
  
  // Check if a position overlaps with any existing object
  const hasOverlap = (testX: number, testY: number): boolean => {
    if (!existingObjects || existingObjects.length === 0) return false;
    
    const newLeft = testX;
    const newRight = testX + scaledWidth;
    const newTop = testY;
    const newBottom = testY + scaledHeight;
    
    return existingObjects.some(obj => {
      const objLeft = obj.left;
      const objRight = obj.left + obj.width;
      const objTop = obj.top;
      const objBottom = obj.top + obj.height;
      
      // Check for overlap with gap
      const overlapX = !(newRight + gap < objLeft || newLeft - gap > objRight);
      const overlapY = !(newBottom + gap < objTop || newTop - gap > objBottom);
      
      return overlapX && overlapY;
    });
  };
  
  // If center is free, use it
  if (!hasOverlap(startPosition.x, startPosition.y)) {
    return startPosition;
  }
  
  // Try spiral pattern to find free space
  const spiralStep = scaledWidth + gap;
  const maxLayers = 10;
  
  for (let layer = 1; layer <= maxLayers; layer++) {
    // Try 8 directions at increasing distances
    const directions = [
      { dx: 1, dy: 0 },   // Right
      { dx: -1, dy: 0 },  // Left
      { dx: 0, dy: 1 },   // Down
      { dx: 0, dy: -1 },  // Up
      { dx: 1, dy: 1 },   // Bottom-right
      { dx: -1, dy: 1 },  // Bottom-left
      { dx: 1, dy: -1 },  // Top-right
      { dx: -1, dy: -1 }, // Top-left
    ];
    
    for (const dir of directions) {
      const testX = startPosition.x + dir.dx * spiralStep * layer;
      const testY = startPosition.y + dir.dy * spiralStep * layer;
      
      if (!hasOverlap(testX, testY)) {
        return { x: testX, y: testY };
      }
    }
  }
  
  // Fallback: offset from center
  return {
    x: startPosition.x + spiralStep * maxLayers,
    y: startPosition.y
  };
}
