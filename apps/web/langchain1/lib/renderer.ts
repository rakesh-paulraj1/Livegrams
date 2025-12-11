import { 
  Primitive, 
  RectanglePrimitive, 
  EllipsePrimitive, 
  GeoPrimitive,
  TextPrimitive, 
  ArrowPrimitive, 
  LinePrimitive, 
  PolygonPrimitive 
} from "./primitives";

function toRichText(text: string) {
  const lines = text.split("\n");
  const content = lines.map((lineText) => {
    if (!lineText) {
      return {
        type: "paragraph"
      };
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: lineText }]
    };
  });
  return {
    type: "doc",
    content
  };
}

function calculateBoxSize(label: string | undefined, requestedW: number | null | undefined, requestedH: number | null | undefined): { w: number; h: number } {
  const safeW = requestedW ?? 100;
  const safeH = requestedH ?? 60;
  
  if (!label) {
    return { w: Math.max(safeW, 120), h: Math.max(safeH, 80) };
  }
  
  const lines = label.split("\n");
  const maxLineLength = Math.max(...lines.map(l => l.length));

  const charWidth = 18;
  const horizontalPadding = 80;
  const lineHeight = 36;
  const verticalPadding = 50;   
  
  const minWidth = Math.max(maxLineLength * charWidth + horizontalPadding, 140);
  const minHeight = Math.max(lines.length * lineHeight + verticalPadding, 80);
  
  return {
    w: Math.max(safeW, minWidth),
    h: Math.max(safeH, minHeight)
  };
}

export interface TLDrawShape {
  id: string;
  typeName: "shape";
  type: "geo" | "text" | "arrow" | "line" | "draw";
  x: number;
  y: number;
  props: Record<string, unknown>;
  rotation: number;
  opacity: number;
  index?: string;
  parentId?: string;
  isLocked: boolean;
  meta: Record<string, unknown>;
}

export interface TLArrowBinding {
  id: string;
  typeName: "binding";
  type: "arrow";
  fromId: string;  
  toId: string;   
  props: {terminal: "start" | "end";
    normalizedAnchor: { x: number; y: number };
    isExact: boolean;
    isPrecise: boolean;
  };
  meta: Record<string, unknown>;
}

export interface RenderResult {
  shapes: TLDrawShape[];
  bindings: TLArrowBinding[];
}

class PrimitiveRenderer {
  private shapeCounter = 0;
  private bindingCounter = 0;
  private labelToShapeId: Map<string, string> = new Map();
  private shapePositions: Map<string, { x: number; y: number; w: number; h: number }> = new Map();

  private generateId(prefix: string): string {
    return `shape:${prefix}-${this.shapeCounter++}-${Date.now()}`;
  }
  
  private generateBindingId(): string {
    return `binding:arrow-${this.bindingCounter++}-${Date.now()}`;
  }


  private renderRectangle(primitive: RectanglePrimitive): TLDrawShape {
    const size = calculateBoxSize(primitive.label, primitive.w, primitive.h);
    const id = this.generateId("rect");
    
    if (primitive.label) {
      this.labelToShapeId.set(primitive.label.toLowerCase(), id);
    }
    this.shapePositions.set(id, { x: primitive.x, y: primitive.y, w: size.w, h: size.h });
    
    return {
      id,
      typeName: "shape",
      type: "geo",
      x: primitive.x,
      y: primitive.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        geo: "rectangle",
        w: size.w,
        h: size.h,
        color: primitive.color || "black",
        labelColor: "black",
        fill: primitive.fillColor ? "solid" : "none",
        dash: "draw",
        size: "m",
        font: "draw",
        richText: primitive.label ? toRichText(primitive.label) : toRichText(""),
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1
      }
    };
  }

  private renderEllipse(primitive: EllipsePrimitive): TLDrawShape {
    const size = calculateBoxSize(primitive.label, primitive.w, primitive.h);
    const id = this.generateId("ellipse");
    
    if (primitive.label) {
      this.labelToShapeId.set(primitive.label.toLowerCase(), id);
    }
    this.shapePositions.set(id, { x: primitive.x, y: primitive.y, w: size.w, h: size.h });
    
    return {
      id,
      typeName: "shape",
      type: "geo",
      x: primitive.x,
      y: primitive.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        geo: "ellipse",
        w: size.w,
        h: size.h,
        color: primitive.color || "black",
        labelColor: "black",
        fill: primitive.fillColor ? "solid" : "none",
        dash: "draw",
        size: "m",
        font: "draw",
        richText: primitive.label ? toRichText(primitive.label) : toRichText(""),
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1
      }
    };
  }

  private renderGeo(primitive: GeoPrimitive): TLDrawShape {
    const size = calculateBoxSize(primitive.label, primitive.w, primitive.h);
    const id = this.generateId("geo");
    
    if (primitive.label) {
      this.labelToShapeId.set(primitive.label.toLowerCase(), id);
    }
    this.shapePositions.set(id, { x: primitive.x, y: primitive.y, w: size.w, h: size.h });
    
    return {
      id,
      typeName: "shape",
      type: "geo",
      x: primitive.x,
      y: primitive.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        geo: primitive.shape,
        w: size.w,
        h: size.h <60 ? 80 : size.h,
        color: primitive.color || "black",
        labelColor: "black",
        fill: primitive.fillColor ? "solid" : "none",
        dash: "draw",
        size: "m",
        font: "draw",
        richText: primitive.label ? toRichText(primitive.label) : toRichText(""),
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        url: "",
        scale: 1
      }
    };
  }


  private renderText(primitive: TextPrimitive): TLDrawShape {
    const textContent = primitive.text || "";
    const id = this.generateId("text");
    
    if (textContent) {
      this.labelToShapeId.set(textContent.toLowerCase(), id);
    }
    
    return {
      id,
      typeName: "shape",
      type: "text",
      x: primitive.x,
      y: primitive.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        richText: toRichText(textContent),
        color: primitive.color || "black",
        size: this.mapFontSize(primitive.fontSize),
        font: primitive.fontFamily || "draw",
        textAlign: "start",
        w: Math.max(100, textContent.length * 4),
        scale: 1,
        autoSize: true
      }
    };
  }



  private arrowsToConnect: Array<{
    arrowId: string;
    fromLabel?: string;
    toLabel?: string;
  }> = [];

  private renderArrow(primitive: ArrowPrimitive): TLDrawShape {
    const safeStart = primitive.start && typeof primitive.start.x === 'number' && typeof primitive.start.y === 'number'
      ? primitive.start
      : { x: primitive.x || 0, y: primitive.y || 0 };
    const safeEnd = primitive.end && typeof primitive.end.x === 'number' && typeof primitive.end.y === 'number'
      ? primitive.end
      : { x: (safeStart.x || 0) + 100, y: (safeStart.y || 0) };
    const arrowId = this.generateId("arrow");
    const startProp: Record<string, unknown> = { x: 0, y: 0 };
    const endProp: Record<string, unknown> = { x: safeEnd.x - safeStart.x, y: safeEnd.y - safeStart.y };
    return {
      id: arrowId,
      typeName: "shape",
      type: "arrow",
      x: safeStart.x,
      y: safeStart.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        start: startProp,
        end: endProp,
        color: primitive.color || "black",
        arrowheadStart: "none",
        arrowheadEnd: primitive.arrowHeadType || "arrow",
        bend: primitive.curved ? 30 : 0,
        size: "m",
        dash: "draw"
      }
    };
  }


  private renderLine(primitive: LinePrimitive): TLDrawShape {
    const start = primitive.start || { x: primitive.x || 0, y: primitive.y || 0 };
    const end = primitive.end || { x: (start.x || 0) + 100, y: (start.y || 0) };

    return {
      id: this.generateId("line"),
      typeName: "shape",
      type: "line",
      x: start.x,
      y: start.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        points: {
          a1: { id: "a1", index: "a1", x: 0, y: 0 },
          a2: { id: "a2", index: "a2", x: end.x - start.x, y: end.y - start.y }
        },
        color: primitive.color || "black",
        spline: primitive.curved ? "cubic" : "line",
        size: "m",
        dash: "draw"
      }
    };
  }

  private renderPolygon(primitive: PolygonPrimitive): TLDrawShape[] {
    const shapes: TLDrawShape[] = [];
    const points = primitive.points || [];
    if (points.length < 2) return shapes;
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length];

      if (start && end) {
        shapes.push({
          id: this.generateId("polygon-line"),
          typeName: "shape",
          type: "line",
          x: start.x,
          y: start.y,
          rotation: 0,
          opacity: 1,
          isLocked: false,
          meta: {},
          props: {
            points: {
              a1: { id: "a1", index: "a1", x: 0, y: 0 },
              a2: { id: "a2", index: "a2", x: end.x - start.x, y: end.y - start.y }
            },
            color: primitive.color || "black",
            spline: "line",
            size: "m",
            dash: "draw"
          }
        });
      }
    }

    return shapes;
  }


  private mapFontSize(fontSize?: number): "s" | "m" | "l" | "xl" {
    if (!fontSize) return "m";
    if (fontSize <= 12) return "s";
    if (fontSize <= 18) return "m";
    if (fontSize <= 24) return "l";
    return "xl";
  }


  private renderPrimitive(primitive: Primitive): TLDrawShape | TLDrawShape[] {
    switch (primitive.shape) {
      case "rectangle":
        return this.renderRectangle(primitive as RectanglePrimitive);
      case "ellipse":
        return this.renderEllipse(primitive as EllipsePrimitive);
      case "diamond":
      case "pentagon":
      case "hexagon":
      case "octagon":
      case "star":
      case "cloud":
      case "trapezoid":
      case "triangle":
      case "check-box":
      case "x-box":
      case "rhombus":
      case "arrow-right":
      case "arrow-left":
      case "arrow-up":
      case "arrow-down":
        return this.renderGeo(primitive as GeoPrimitive);
      case "text":
        return this.renderText(primitive as TextPrimitive);
      case "arrow":
        return this.renderArrow(primitive as ArrowPrimitive);
      case "line":
        return this.renderLine(primitive as LinePrimitive);
      case "polygon":
        return this.renderPolygon(primitive as PolygonPrimitive);
      default:
        throw new Error(`Unknown primitive shape: ${(primitive as unknown as Record<string, unknown>).shape}`);
    }
  }



  private createBindings(): TLArrowBinding[] {
    const bindings: TLArrowBinding[] = [];
    
    for (const arrow of this.arrowsToConnect) {
    
      if (arrow.fromLabel) {
        const fromShapeId = this.labelToShapeId.get(arrow.fromLabel);
        if (fromShapeId) {
          bindings.push({
            id: this.generateBindingId(),
            typeName: "binding",
            type: "arrow",
            fromId: arrow.arrowId,
            toId: fromShapeId,
            props: {
              terminal: "start",
              normalizedAnchor: { x: 0.5, y: 1 },
              isExact: false,
              isPrecise: false
            },
            meta: {}
          });
        }
      }
        if (arrow.toLabel) {
        const toShapeId = this.labelToShapeId.get(arrow.toLabel);
        if (toShapeId) {
          bindings.push({
            id: this.generateBindingId(),
            typeName: "binding",
            type: "arrow",
            fromId: arrow.arrowId,
            toId: toShapeId,
            props: {
              terminal: "end",
              normalizedAnchor: { x: 0.5, y: 0 }, 
              isExact: false,
              isPrecise: false
            },
            meta: {}
          });
        }
      }
    }
    
    return bindings;
  }


  render(primitives: Primitive[]): RenderResult {
    const shapes: TLDrawShape[] = [];
    const arrowPrimitives: ArrowPrimitive[] = [];

    for (const primitive of primitives) {
      if (primitive.shape === "arrow") {
        arrowPrimitives.push(primitive as ArrowPrimitive);
      } else {
        const result = this.renderPrimitive(primitive);
        if (Array.isArray(result)) {
          shapes.push(...result);
        } else {
          shapes.push(result);
        }
      }
    }

    for (const arrowPrimitive of arrowPrimitives) {
      const result = this.renderArrow(arrowPrimitive);
      shapes.push(result);
    }

    const bindings: TLArrowBinding[] = [];

    return { shapes, bindings };
  }


  reset(): void {
    this.shapeCounter = 0;
    this.bindingCounter = 0;
    this.labelToShapeId.clear();
    this.shapePositions.clear();
    this.arrowsToConnect = [];
  }
}

export const renderer = new PrimitiveRenderer();

export function renderPrimitives(primitives: Primitive[]): RenderResult {
  renderer.reset();
  return renderer.render(primitives);
}
