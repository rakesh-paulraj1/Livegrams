
import type { LayoutSpec, LayoutNode, LayoutEdge, LayoutText } from "./layout-spec";


export interface TLDrawShape {
  id: string;
  typeName: "shape";
  type: "geo" | "text" | "arrow" | "line";
  x: number;
  y: number;
  props: Record<string, unknown>;
  rotation: number;
  opacity: number;
  isLocked: boolean;
  meta: Record<string, unknown>;
}

// ============================================
// Helpers
// ============================================

function toRichText(text: string) {
  const lines = text.split("\n");
  const content = lines.map((lineText) => {
    if (!lineText) {
      return { type: "paragraph" };
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: lineText }],
    };
  });
  return { type: "doc", content };
}

/**
 * Map node type to TLDraw geo type
 */
function mapGeoType(nodeType: LayoutNode["type"]): string {
  const mapping: Record<string, string> = {
    rectangle: "rectangle",
    ellipse: "ellipse",
    diamond: "diamond",
    star: "star",
    hexagon: "hexagon",
    cloud: "cloud",
    triangle: "triangle",
  };
  return mapping[nodeType] || "rectangle";
}

/**
 * Calculate edge connection point on node boundary
 * Returns normalized anchor point (0-1 range)
 */
function calculateAnchorPoint(
  fromNode: LayoutNode,
  toNode: LayoutNode
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  // Calculate centers
  const fromCenterX = fromNode.x + fromNode.w / 2;
  const fromCenterY = fromNode.y + fromNode.h / 2;
  const toCenterX = toNode.x + toNode.w / 2;
  const toCenterY = toNode.y + toNode.h / 2;

  // Direction vector
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const angle = Math.atan2(dy, dx);

  // Determine which edge to connect (simplified: top, bottom, left, right)
  // For 'from' node - exit point
  let startAnchor = { x: 0.5, y: 0.5 };
  // For 'to' node - entry point
  let endAnchor = { x: 0.5, y: 0.5 };

  // 8-direction anchoring
  const PI = Math.PI;
  
  // From node exit point
  if (angle >= -PI/4 && angle < PI/4) {
    // Going right
    startAnchor = { x: 1, y: 0.5 };
  } else if (angle >= PI/4 && angle < 3*PI/4) {
    // Going down
    startAnchor = { x: 0.5, y: 1 };
  } else if (angle >= 3*PI/4 || angle < -3*PI/4) {
    // Going left
    startAnchor = { x: 0, y: 0.5 };
  } else {
    // Going up
    startAnchor = { x: 0.5, y: 0 };
  }

  // To node entry point (opposite direction)
  if (angle >= -PI/4 && angle < PI/4) {
    // Coming from left
    endAnchor = { x: 0, y: 0.5 };
  } else if (angle >= PI/4 && angle < 3*PI/4) {
    // Coming from top
    endAnchor = { x: 0.5, y: 0 };
  } else if (angle >= 3*PI/4 || angle < -3*PI/4) {
    // Coming from right
    endAnchor = { x: 1, y: 0.5 };
  } else {
    // Coming from bottom
    endAnchor = { x: 0.5, y: 1 };
  }

  return { start: startAnchor, end: endAnchor };
}

/**
 * Calculate absolute arrow coordinates
 */
function calculateArrowCoordinates(
  fromNode: LayoutNode,
  toNode: LayoutNode
): { startX: number; startY: number; endX: number; endY: number } {
  const anchors = calculateAnchorPoint(fromNode, toNode);
  
  return {
    startX: fromNode.x + fromNode.w * anchors.start.x,
    startY: fromNode.y + fromNode.h * anchors.start.y,
    endX: toNode.x + toNode.w * anchors.end.x,
    endY: toNode.y + toNode.h * anchors.end.y,
  };
}

// ============================================
// Renderer Class
// ============================================

class LayoutSpecRenderer {
  private shapeCounter = 0;
  private nodeIdToShapeId = new Map<string, string>();

  private generateId(prefix: string): string {
    return `shape:${prefix}-${this.shapeCounter++}-${Date.now()}`;
  }

  /**
   * Render a node to TLDraw geo shape
   */
  private renderNode(node: LayoutNode): TLDrawShape {
    const shapeId = this.generateId(node.type);
    this.nodeIdToShapeId.set(node.id, shapeId);

    return {
      id: shapeId,
      typeName: "shape",
      type: "geo",
      x: node.x,
      y: node.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: { layoutId: node.id }, // Store original ID for reference
      props: {
        geo: mapGeoType(node.type),
        w: node.w,
        h: node.h,
        color: node.color || "black",
        labelColor: "black",
        fill: node.fillColor ? "solid" : "none",
        dash: "draw",
        size: "m",
        font: "draw",
        richText: node.label ? toRichText(node.label) : toRichText(""),
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1,
      },
    };
  }

  /**
   * Render an edge to TLDraw arrow shape
   */
  private renderEdge(edge: LayoutEdge, nodes: LayoutNode[]): TLDrawShape | null {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) {
      console.warn(`Edge ${edge.id}: Cannot find nodes ${edge.from} → ${edge.to}`);
      return null;
    }

    const coords = calculateArrowCoordinates(fromNode, toNode);
    const shapeId = this.generateId("arrow");

    return {
      id: shapeId,
      typeName: "shape",
      type: "arrow",
      x: coords.startX,
      y: coords.startY,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: { 
        layoutId: edge.id,
        from: edge.from,
        to: edge.to,
      },
      props: {
        start: { x: 0, y: 0 },
        end: { 
          x: coords.endX - coords.startX, 
          y: coords.endY - coords.startY 
        },
        color: edge.color || "black",
        arrowheadStart: "none",
        arrowheadEnd: edge.type === "arrow" ? "arrow" : "none",
        bend: 0,
        size: "m",
        dash: "draw",
        text: edge.label || "",
        labelPosition: 0.5,
      },
    };
  }

  /**
   * Render a text element
   */
  private renderText(text: LayoutText): TLDrawShape {
    return {
      id: this.generateId("text"),
      typeName: "shape",
      type: "text",
      x: text.x,
      y: text.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: { layoutId: text.id },
      props: {
        richText: toRichText(text.text),
        color: text.color || "black",
        size: text.fontSize && text.fontSize > 20 ? "xl" : "m",
        font: "draw",
        textAlign: "start",
        w: Math.max(100, text.text.length * 10),
        scale: 1,
        autoSize: true,
      },
    };
  }

  /**
   * Render entire LayoutSpec to TLDraw shapes
   */
  render(spec: LayoutSpec): TLDrawShape[] {
    const shapes: TLDrawShape[] = [];
    
    // Reset state
    this.shapeCounter = 0;
    this.nodeIdToShapeId.clear();

    // 1. Render all nodes first
    for (const node of spec.nodes) {
      shapes.push(this.renderNode(node));
    }

    // 2. Render all edges (arrows)
    for (const edge of spec.edges) {
      const arrowShape = this.renderEdge(edge, spec.nodes);
      if (arrowShape) {
        shapes.push(arrowShape);
      }
    }

    // 3. Render standalone texts
    if (spec.texts) {
      for (const text of spec.texts) {
        shapes.push(this.renderText(text));
      }
    }

    return shapes;
  }
}

// ============================================
// Exports
// ============================================

/**
 * Convert LayoutSpec to TLDraw shapes
 */
export function renderLayoutSpec(spec: LayoutSpec): TLDrawShape[] {
  const renderer = new LayoutSpecRenderer();
  return renderer.render(spec);
}

/**
 * Get mapping from layout node IDs to TLDraw shape IDs
 * (useful for debugging or bindings)
 */
export function renderLayoutSpecWithMapping(spec: LayoutSpec): {
  shapes: TLDrawShape[];
  idMapping: Map<string, string>;
} {
  const renderer = new LayoutSpecRenderer();
  const shapes = renderer.render(spec);
  
  // Extract ID mapping from shape meta
  const idMapping = new Map<string, string>();
  for (const shape of shapes) {
    const layoutId = shape.meta?.layoutId as string | undefined;
    if (layoutId) {
      idMapping.set(layoutId, shape.id);
    }
  }
  
  return { shapes, idMapping };
}
