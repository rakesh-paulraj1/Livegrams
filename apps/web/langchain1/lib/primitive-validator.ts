import type { Primitive } from "./primitives";


export type DiagramType = 
  | "structured"    
  | "freeform";    

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  diagramType: DiagramType;
}


const VALIDATION_CONFIG: Record<DiagramType, {
  checkOverlaps: boolean;
  checkBounds: boolean;
  checkArrowConnections: boolean;
  minSpacing: number;
}> = {
  structured: { checkOverlaps: true, checkBounds: true, checkArrowConnections: true, minSpacing: 20 },
  freeform: { checkOverlaps: false, checkBounds: false, checkArrowConnections: false, minSpacing: 0 },
};


interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

function getBoundingBox(primitive: Primitive): BoundingBox | null {
  if (primitive.shape === "arrow" || primitive.shape === "line") {
    return null; 
  }
  
  if (primitive.shape === "text") {
    const text = (primitive as { text?: string }).text || "";
    return {
      x: primitive.x,
      y: primitive.y,
      w: Math.max(50, text.length * 8),
      h: 30,
      label: primitive.label,
    };
  }
  
  const geo = primitive as { w?: number; h?: number };
  return {
    x: primitive.x,
    y: primitive.y,
    w: geo.w || 100,
    h: geo.h || 100,
    label: primitive.label,
  };
}

function boxesOverlap(a: BoundingBox, b: BoundingBox, minSpacing: number): boolean {
  return !(
    a.x + a.w + minSpacing <= b.x ||
    b.x + b.w + minSpacing <= a.x ||
    a.y + a.h + minSpacing <= b.y ||
    b.y + b.h + minSpacing <= a.y
  );
}

function isOutOfBounds(box: BoundingBox, maxX = 1200, maxY = 1200): boolean {
  return box.x < -50 || box.y < -50 || box.x + box.w > maxX || box.y + box.h > maxY;
}


function checkOverlaps(primitives: Primitive[], minSpacing: number): string[] {
  const errors: string[] = [];
  const boxes: BoundingBox[] = [];
  
  for (const p of primitives) {
    const box = getBoundingBox(p);
    if (box) boxes.push(box);
  }
  
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i]!, boxes[j]!, minSpacing)) {
        const label1 = boxes[i]!.label || `shape at (${boxes[i]!.x}, ${boxes[i]!.y})`;
        const label2 = boxes[j]!.label || `shape at (${boxes[j]!.x}, ${boxes[j]!.y})`;
        errors.push(`Overlap detected: "${label1}" overlaps with "${label2}". Increase spacing.`);
      }
    }
  }
return errors;
}

function checkBounds(primitives: Primitive[]): string[] {
  const errors: string[] = [];
  
  for (const p of primitives) {
    const box = getBoundingBox(p);
    if (box && isOutOfBounds(box)) {
      const label = box.label || `shape at (${box.x}, ${box.y})`;
      errors.push(`"${label}" is out of canvas bounds. Move it within (0-1200, 0-1200).`);
    }
  }
  
  return errors;
}

function checkArrowConnections(primitives: Primitive[]): string[] {
  const errors: string[] = [];
  const geoShapes = primitives.filter(p => 
    p.shape !== "arrow" && p.shape !== "line" && p.shape !== "text"
  );
  const arrows = primitives.filter(p => p.shape === "arrow");
  
  if (geoShapes.length > 1 && arrows.length === 0) {
    errors.push("Flowchart has multiple shapes but no arrows connecting them. Add arrows to show flow.");
  }
  
  for (const arrow of arrows) {
    const a = arrow as { start?: { x: number; y: number }; end?: { x: number; y: number } };
    if (!a.start || !a.end) continue;
    
    let startNearShape = false;
    let endNearShape = false;
    
    for (const geo of geoShapes) {
      const box = getBoundingBox(geo);
      if (!box) continue;
      const nearStart = isPointNearBox(a.start, box, 30);
      const nearEnd = isPointNearBox(a.end, box, 30);
      
      if (nearStart) startNearShape = true;
      if (nearEnd) endNearShape = true;
    }
    
    if (!startNearShape || !endNearShape) {
      errors.push(`Arrow at (${a.start.x}, ${a.start.y}) doesn't connect shapes properly. Adjust arrow endpoints.`);
    }
  }
  
  return errors;
}

function isPointNearBox(point: { x: number; y: number }, box: BoundingBox, threshold: number): boolean {
  const nearLeft = Math.abs(point.x - box.x) < threshold && point.y >= box.y - threshold && point.y <= box.y + box.h + threshold;
  const nearRight = Math.abs(point.x - (box.x + box.w)) < threshold && point.y >= box.y - threshold && point.y <= box.y + box.h + threshold;
  const nearTop = Math.abs(point.y - box.y) < threshold && point.x >= box.x - threshold && point.x <= box.x + box.w + threshold;
  const nearBottom = Math.abs(point.y - (box.y + box.h)) < threshold && point.x >= box.x - threshold && point.x <= box.x + box.w + threshold;
  
  return nearLeft || nearRight || nearTop || nearBottom;
}

export function validatePrimitives(
  primitives: Primitive[],
  diagramType: DiagramType
): ValidationResult {
  const config = VALIDATION_CONFIG[diagramType];
  const errors: string[] = [];
  
  if (diagramType === "freeform") {
    return { valid: true, errors: [], diagramType };
  }
  
  if (config.checkOverlaps) {
    errors.push(...checkOverlaps(primitives, config.minSpacing));
  }
  
  if (config.checkBounds) {
    errors.push(...checkBounds(primitives));
  }
  
  if (config.checkArrowConnections) {
    errors.push(...checkArrowConnections(primitives));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    diagramType,
  };
}


export function generateFeedback(errors: string[], primitives: Primitive[]): string {
  if (errors.length === 0) return "";
  
  const feedback = [
    "The generated diagram has the following issues:",
    ...errors.map((e, i) => `${i + 1}. ${e}`),
    "",
    "Please regenerate the primitives with these fixes applied.",
    "Current primitive count: " + primitives.length,
  ];
  
  return feedback.join("\n");
}
