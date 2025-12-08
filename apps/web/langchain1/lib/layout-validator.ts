/**
 * Pure mathematical layout validation - NO node-canvas required
 * Validates primitives using coordinate math only
 */

interface Point {
  x: number;
  y: number;
}

interface PrimitiveShape {
  shape: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  start?: Point;
  end?: Point;
}

export interface ValidationIssue {
  type: 'overlap' | 'disconnected' | 'off-canvas' | 'spacing' | 'alignment';
  message: string;
  severity: 'error' | 'warning';
  shapeIndex?: number;
  details?: Record<string, unknown>;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const OVERLAP_THRESHOLD = 5; // pixels
const CONNECTION_THRESHOLD = 30; // pixels - how close arrow must be to shape

/**
 * Get bounding box of a shape
 */
function getBounds(shape: PrimitiveShape): { x: number; y: number; w: number; h: number } {
  if (shape.shape === 'arrow' || shape.shape === 'line') {
    const startX = shape.start?.x ?? shape.x;
    const startY = shape.start?.y ?? shape.y;
    const endX = shape.end?.x ?? startX + 100;
    const endY = shape.end?.y ?? startY;
    
    return {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX) || 10,
      h: Math.abs(endY - startY) || 10,
    };
  }
  
  return {
    x: shape.x,
    y: shape.y,
    w: shape.w || 100,
    h: shape.h || 60,
  };
}

/**
 * Check if two rectangles overlap
 */
function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  // Add threshold to detect near-overlaps
  return (
    a.x < b.x + b.w - OVERLAP_THRESHOLD &&
    a.x + a.w > b.x + OVERLAP_THRESHOLD &&
    a.y < b.y + b.h - OVERLAP_THRESHOLD &&
    a.y + a.h > b.y + OVERLAP_THRESHOLD
  );
}

/**
 * Check if a point is near a shape's edge
 */
function isPointNearShape(point: Point, shape: PrimitiveShape, threshold: number): boolean {
  const bounds = getBounds(shape);
  
  // Check if point is within threshold of any edge
  const nearLeft = Math.abs(point.x - bounds.x) <= threshold && 
                   point.y >= bounds.y - threshold && 
                   point.y <= bounds.y + bounds.h + threshold;
                   
  const nearRight = Math.abs(point.x - (bounds.x + bounds.w)) <= threshold && 
                    point.y >= bounds.y - threshold && 
                    point.y <= bounds.y + bounds.h + threshold;
                    
  const nearTop = Math.abs(point.y - bounds.y) <= threshold && 
                  point.x >= bounds.x - threshold && 
                  point.x <= bounds.x + bounds.w + threshold;
                  
  const nearBottom = Math.abs(point.y - (bounds.y + bounds.h)) <= threshold && 
                     point.x >= bounds.x - threshold && 
                     point.x <= bounds.x + bounds.w + threshold;
  
  return nearLeft || nearRight || nearTop || nearBottom;
}

/**
 * Check if shape is within canvas bounds
 */
function isInBounds(shape: PrimitiveShape): boolean {
  const bounds = getBounds(shape);
  return (
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.x + bounds.w <= CANVAS_WIDTH &&
    bounds.y + bounds.h <= CANVAS_HEIGHT
  );
}

/**
 * Pure mathematical layout validation
 */
export function validateLayout(primitives: PrimitiveShape[]): {
  issues: ValidationIssue[];
  isValid: boolean;
  stats: {
    shapeCount: number;
    arrowCount: number;
    errorCount: number;
    warningCount: number;
  };
} {
  const issues: ValidationIssue[] = [];
  
  const shapes = primitives.filter(p => 
    p.shape !== 'arrow' && p.shape !== 'line' && p.shape !== 'text'
  );
  const arrows = primitives.filter(p => p.shape === 'arrow');
  
  // 1. Check for overlapping shapes
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const shapeA = shapes[i]!;
      const shapeB = shapes[j]!;
      const a = getBounds(shapeA);
      const b = getBounds(shapeB);
      
      if (rectsOverlap(a, b)) {
        issues.push({
          type: 'overlap',
          message: `Shape ${i + 1} (${shapeA.label || shapeA.shape}) overlaps with Shape ${j + 1} (${shapeB.label || shapeB.shape})`,
          severity: 'error',
          shapeIndex: i,
          details: { shapeA: i, shapeB: j },
        });
      }
    }
  }
  
  // 2. Check arrow connections
  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i]!;
    const start = arrow.start || { x: arrow.x, y: arrow.y };
    const end = arrow.end || { x: arrow.x + 100, y: arrow.y };
    
    // Check if start connects to any shape
    const startConnected = shapes.some(s => isPointNearShape(start, s, CONNECTION_THRESHOLD));
    // Check if end connects to any shape
    const endConnected = shapes.some(s => isPointNearShape(end, s, CONNECTION_THRESHOLD));
    
    if (!startConnected && !endConnected) {
      issues.push({
        type: 'disconnected',
        message: `Arrow ${i + 1} is not connected to any shape (both ends floating)`,
        severity: 'error',
        shapeIndex: primitives.indexOf(arrow),
        details: { start, end },
      });
    } else if (!startConnected) {
      issues.push({
        type: 'disconnected',
        message: `Arrow ${i + 1} start point is not connected to any shape`,
        severity: 'warning',
        shapeIndex: primitives.indexOf(arrow),
        details: { start },
      });
    } else if (!endConnected) {
      issues.push({
        type: 'disconnected',
        message: `Arrow ${i + 1} end point is not connected to any shape`,
        severity: 'warning',
        shapeIndex: primitives.indexOf(arrow),
        details: { end },
      });
    }
  }
  
  // 3. Check bounds
  for (let i = 0; i < primitives.length; i++) {
    const shape = primitives[i]!;
    if (!isInBounds(shape)) {
      const bounds = getBounds(shape);
      issues.push({
        type: 'off-canvas',
        message: `Shape ${i + 1} (${shape.label || shape.shape}) is outside canvas bounds`,
        severity: 'error',
        shapeIndex: i,
        details: { bounds },
      });
    }
  }
  
  // 4. Check spacing consistency (for aligned shapes)
  if (shapes.length >= 3) {
    const horizontallyAligned = shapes.filter((s, _, arr) => {
      const bounds = getBounds(s);
      return arr.filter(other => {
        const otherBounds = getBounds(other);
        return Math.abs(bounds.y - otherBounds.y) < 20;
      }).length >= 2;
    });
    
    if (horizontallyAligned.length >= 3) {
      const sorted = [...horizontallyAligned].sort((a, b) => getBounds(a).x - getBounds(b).x);
      const gaps: number[] = [];
      
      for (let i = 1; i < sorted.length; i++) {
        const prevBounds = getBounds(sorted[i - 1]!);
        const currBounds = getBounds(sorted[i]!);
        const gap = currBounds.x - (prevBounds.x + prevBounds.w);
        if (gap > 0) gaps.push(gap);
      }
      
      if (gaps.length >= 2) {
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const maxDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)));
        
        if (maxDeviation > avgGap * 0.5 && maxDeviation > 30) {
          issues.push({
            type: 'spacing',
            message: `Inconsistent horizontal spacing. Gaps: ${gaps.map(g => Math.round(g)).join(', ')}px`,
            severity: 'warning',
            details: { gaps, avgGap },
          });
        }
      }
    }
  }
  
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  
  return {
    issues,
    isValid: errorCount === 0,
    stats: {
      shapeCount: shapes.length,
      arrowCount: arrows.length,
      errorCount,
      warningCount,
    },
  };
}

/**
 * Generate feedback message for the model
 */
export function generateFeedback(issues: ValidationIssue[]): string {
  if (issues.length === 0) return '';
  
  const lines = issues.map(issue => {
    switch (issue.type) {
      case 'overlap':
        return `❌ OVERLAP: ${issue.message}. Separate shapes by at least 20px.`;
      case 'disconnected':
        return `❌ ARROW: ${issue.message}. Move arrow endpoint to touch shape edge.`;
      case 'off-canvas':
        return `❌ BOUNDS: ${issue.message}. Keep x: 0-1200, y: 0-800.`;
      case 'spacing':
        return `⚠️ SPACING: ${issue.message}. Use consistent gaps.`;
      case 'alignment':
        return `⚠️ ALIGNMENT: ${issue.message}`;
      default:
        return issue.message;
    }
  });
  
  return lines.join('\n');
}
