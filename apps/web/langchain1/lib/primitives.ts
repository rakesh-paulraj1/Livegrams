export type GeoShape =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "cloud"
  | "trapezoid"
  | "triangle"
  | "check-box"
  | "x-box"
  | "rhombus"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down";

export type PrimitiveShape = GeoShape | "text" | "arrow" | "line" | "polygon";

export interface Point {
  x: number;
  y: number;
}

export interface BasePrimitive {
  shape: PrimitiveShape;
  x: number;
  y: number;
  label?: string;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

export interface RectanglePrimitive extends BasePrimitive {
  shape: "rectangle";
  w: number;
  h: number;
}

export interface EllipsePrimitive extends BasePrimitive {
  shape: "ellipse";
  w: number;
  h: number;
}

export interface GeoPrimitive extends BasePrimitive {
  shape: GeoShape;
  w: number;
  h: number;
}

export interface TextPrimitive extends BasePrimitive {
  shape: "text";
  text?: string;
  fontSize?: number;
  fontFamily?: "draw" | "serif" | "mono" | "sans";
}

export interface ArrowPrimitive extends BasePrimitive {
  shape: "arrow";
  start?: Point;
  end?: Point;
  fromLabel?: string;
  toLabel?: string;
  arrowHeadType?: "arrow" | "triangle" | "dot" | "square";
  curved?: boolean;
}

export interface LinePrimitive extends BasePrimitive {
  shape: "line";
  start: Point;
  end: Point;
  curved?: boolean;
}

export interface PolygonPrimitive extends BasePrimitive {
  shape: "polygon";
  points: Point[];
  sides?: number;
}

export type Primitive =
  | RectanglePrimitive
  | EllipsePrimitive
  | GeoPrimitive
  | TextPrimitive
  | ArrowPrimitive
  | LinePrimitive
  | PolygonPrimitive;

export interface RenderRequest {
  intent: "draw" | "diagram" | "flowchart" | "sketch";
  items: Primitive[];
  title?: string;
  description?: string;
}

export interface TLDrawShape {
  id: string;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

export interface RenderResult {
  success: boolean;
  tldrawShapes: TLDrawShape[];
  error?: string;
  stats?: {
    primitiveCount: number;
    shapeCount: number;
    processingTime: number;
  };
}
