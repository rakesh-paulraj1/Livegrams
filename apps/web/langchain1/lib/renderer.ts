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

class PrimitiveRenderer {
  private shapeCounter = 0;

  private generateId(prefix: string): string {
    return `shape:${prefix}-${this.shapeCounter++}-${Date.now()}`;
  }


  private renderRectangle(primitive: RectanglePrimitive): TLDrawShape {
    return {
      id: this.generateId("rect"),
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
        w: primitive.w || 100,
        h: primitive.h || 100,
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
    return {
      id: this.generateId("ellipse"),
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
        w: primitive.w || 100,
        h: primitive.h || 100,
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
    return {
      id: this.generateId("geo"),
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
        w: primitive.w || 100,
        h: primitive.h || 100,
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
    return {
      id: this.generateId("text"),
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
        w: Math.max(100, textContent.length * 8),
        scale: 1,
        autoSize: true
      }
    };
  }


  private renderArrow(primitive: ArrowPrimitive): TLDrawShape {
    const start = primitive.start || { x: primitive.x || 0, y: primitive.y || 0 };
    const end = primitive.end || { x: (start.x || 0) + 100, y: (start.y || 0) };

    return {
      id: this.generateId("arrow"),
      typeName: "shape",
      type: "arrow",
      x: start.x,
      y: start.y,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      meta: {},
      props: {
        start: {
          x: 0, 
          y: 0  
        },
        end: {
          x: end.x - start.x, 
          y: end.y - start.y   
        },
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
    const pointId1 = `point-${this.shapeCounter}`;
    const pointId2 = `point-${this.shapeCounter + 1}`;
    this.shapeCounter += 2;

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
        points: [
          { id: pointId1, x: 0, y: 0 },  
          { id: pointId2, x: end.x - start.x, y: end.y - start.y } 
        ],
        color: primitive.color || "black",
        bend: primitive.curved ? 20 : 0,
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
        const pointId1 = `point-${this.shapeCounter}`;
        const pointId2 = `point-${this.shapeCounter + 1}`;
        this.shapeCounter += 2;

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
            points: [
              { id: pointId1, x: 0, y: 0 },  
              { id: pointId2, x: end.x - start.x, y: end.y - start.y }  
            ],
            color: primitive.color || "black",
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


  render(primitives: Primitive[]): TLDrawShape[] {
    const shapes: TLDrawShape[] = [];

    for (const primitive of primitives) {
      const result = this.renderPrimitive(primitive);
      
      if (Array.isArray(result)) {
        shapes.push(...result);
      } else {
        shapes.push(result);
      }
    }

    return shapes;
  }


  reset(): void {
    this.shapeCounter = 0;
  }
}

export const renderer = new PrimitiveRenderer();

export function renderPrimitives(primitives: Primitive[]): TLDrawShape[] {
  renderer.reset();
  return renderer.render(primitives);
}
