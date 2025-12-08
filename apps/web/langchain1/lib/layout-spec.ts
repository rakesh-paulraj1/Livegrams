/**
 * LayoutSpec - Structured diagram representation
 * 
 * Forces the LLM to think in relationships (nodes + edges),
 * not raw pixel coordinates. This enables:
 * - Semantic validation (graph correctness)
 * - Geometric validation (pure math)
 * - Agent-friendly error feedback
 */

import { z } from "zod";

// ============================================
// Core Types
// ============================================

export interface LayoutNode {
  id: string;
  type: "rectangle" | "ellipse" | "diamond" | "star" | "hexagon" | "cloud" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  fillColor?: string;
}

export interface LayoutEdge {
  id: string;
  from: string;  // Node ID
  to: string;    // Node ID
  type: "arrow" | "line";
  label?: string;
  color?: string;
}

export interface LayoutText {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
}

export interface LayoutSpec {
  canvas: {
    width: number;
    height: number;
  };
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  texts?: LayoutText[];
  description?: string;
}

// ============================================
// Zod Schemas for LLM Structured Output
// ============================================

export const LayoutNodeSchema = z.object({
  id: z.string().describe("Unique identifier for this node (e.g., 'node_1', 'start', 'decision_a')"),
  type: z.enum(["rectangle", "ellipse", "diamond", "star", "hexagon", "cloud", "triangle"])
    .describe("Shape type - use rectangle for boxes, ellipse for circles, diamond for decisions"),
  x: z.number().min(0).max(1200).describe("X position (left edge) - keep within 0-1100"),
  y: z.number().min(0).max(800).describe("Y position (top edge) - keep within 0-700"),
  w: z.number().min(40).max(400).default(120).describe("Width in pixels (40-400)"),
  h: z.number().min(30).max(300).default(60).describe("Height in pixels (30-300)"),
  label: z.string().optional().describe("Text label to display inside the shape"),
  color: z.string().optional().describe("Border color: black, blue, red, green, orange, violet"),
  fillColor: z.string().optional().describe("Fill color (optional)"),
});

export const LayoutEdgeSchema = z.object({
  id: z.string().describe("Unique identifier for this edge (e.g., 'edge_1', 'flow_a_b')"),
  from: z.string().describe("ID of the source node (must match a node id)"),
  to: z.string().describe("ID of the target node (must match a node id)"),
  type: z.enum(["arrow", "line"]).default("arrow").describe("Edge type - arrow has arrowhead"),
  label: z.string().optional().describe("Label for the edge (optional)"),
  color: z.string().optional().describe("Edge color"),
});

export const LayoutTextSchema = z.object({
  id: z.string().describe("Unique identifier for this text"),
  type: z.literal("text"),
  x: z.number().describe("X position"),
  y: z.number().describe("Y position"),
  text: z.string().describe("The text content"),
  fontSize: z.number().optional().describe("Font size in pixels"),
  color: z.string().optional().describe("Text color"),
});

export const LayoutSpecSchema = z.object({
  canvas: z.object({
    width: z.number().default(1200),
    height: z.number().default(800),
  }).default({ width: 1200, height: 800 }),
  nodes: z.array(LayoutNodeSchema).describe("All shapes/nodes in the diagram"),
  edges: z.array(LayoutEdgeSchema).describe("Connections between nodes - use node IDs"),
  texts: z.array(LayoutTextSchema).optional().describe("Standalone text labels"),
  description: z.string().optional().describe("Brief description of what was created"),
});

// Type inference from Zod
export type LayoutSpecOutput = z.infer<typeof LayoutSpecSchema>;

// ============================================
// Validation Types
// ============================================

export type ValidationCode = 
  | "OVERLAP"
  | "OUT_OF_BOUNDS" 
  | "DISCONNECTED_EDGE"
  | "DUPLICATE_ID"
  | "INVALID_EDGE_TARGET"
  | "SPACING_WARNING"
  | "EMPTY_DIAGRAM";

export interface ValidationIssue {
  code: ValidationCode;
  severity: "error" | "warning";
  message: string;
  entities: string[];  // Node/edge IDs involved
  suggestion?: string; // How to fix it
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    errorCount: number;
    warningCount: number;
  };
}
