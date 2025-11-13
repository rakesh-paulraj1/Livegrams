import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { CanvasShape } from "../lib/editorcontroller";

// Helper functions
function calculateBounds(shapes: CanvasShape[]) {
  if (shapes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  
  const xs = shapes.map(s => s.x || 0);
  const ys = shapes.map(s => s.y || 0);
  
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function countShapeTypes(shapes: CanvasShape[]) {
  return shapes.reduce((acc, shape) => {
    acc[shape.type] = (acc[shape.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Tool 1: Get canvas state
export const getCanvasStateTool = tool(
  async ({ detailed }, config) => {
    // Canvas shapes are passed through RunnableConfig
    const shapes = (config?.configurable?.canvasShapes as CanvasShape[]) || [];
    
    if (!detailed) {
      return `Canvas has ${shapes.length} shapes: ${shapes.map(s => `${s.type}(${s.id})`).join(', ')}`;
    }
    
    const analysis = {
      totalShapes: shapes.length,
      shapes: shapes.map(s => ({
        id: s.id,
        type: s.type,
        position: { x: s.x || 0, y: s.y || 0 },
        props: s.props
      })),
      bounds: calculateBounds(shapes),
      shapeTypes: countShapeTypes(shapes)
    };
    
    return JSON.stringify(analysis, null, 2);
  },
  {
    name: "get_canvas_state",
    description: "Get current canvas state. Use detailed=true for complex operations like flowcharts or when you need precise positioning.",
    schema: z.object({
      detailed: z.boolean().describe("Whether to get detailed shape information including positions and properties")
    })
  }
);

// Tool 2: Analyze layout for positioning
export const analyzeLayoutTool = tool(
  async ({ operation, shapeCount }) => {
    if (operation === "flowchart") {
      const verticalSpacing = 120;
      const positions = [];
      
      for (let i = 0; i < shapeCount; i++) {
        positions.push({
          x: 200,
          y: 100 + (i * verticalSpacing),
          index: i
        });
      }
      
      return JSON.stringify({
        recommendation: "Vertical flowchart layout",
        positions,
        nodeSize: { w: 140, h: 70 },
        arrowSpacing: verticalSpacing,
        connectionPoints: positions.map((p, i) => ({
          from: i,
          to: i + 1,
          startY: p.y + 35,
          endY: i < shapeCount - 1 ? p.y + 35 + verticalSpacing : null
        })).filter(c => c.endY !== null)
      });
    }
    
    if (operation === "grid") {
      const cols = Math.ceil(Math.sqrt(shapeCount));
      const rows = Math.ceil(shapeCount / cols);
      const positions = [];
      
      for (let i = 0; i < shapeCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: 100 + (col * 180),
          y: 100 + (row * 150),
          index: i
        });
      }
      
      return JSON.stringify({
        recommendation: "Grid layout",
        positions,
        nodeSize: { w: 120, h: 80 },
        cols,
        rows
      });
    }
    
    if (operation === "horizontal") {
      const horizontalSpacing = 180;
      const positions = [];
      
      for (let i = 0; i < shapeCount; i++) {
        positions.push({
          x: 100 + (i * horizontalSpacing),
          y: 200,
          index: i
        });
      }
      
      return JSON.stringify({
        recommendation: "Horizontal layout",
        positions,
        nodeSize: { w: 120, h: 80 },
        arrowSpacing: horizontalSpacing
      });
    }
    
    return JSON.stringify({
      recommendation: "Default stacked layout",
      positions: Array(shapeCount).fill(0).map((_, i) => ({
        x: 200,
        y: 100 + (i * 100),
        index: i
      }))
    });
  },
  {
    name: "analyze_layout",
    description: "Analyze and recommend positioning for multiple shapes. Use this for flowcharts, grids, diagrams, or any multi-shape layout. Operations: 'flowchart', 'grid', 'horizontal'",
    schema: z.object({
      operation: z.enum(["flowchart", "grid", "horizontal", "other"]).describe("Type of layout operation"),
      shapeCount: z.number().describe("Number of shapes to arrange")
    })
  }
);

// Tool 3: Get shape relationships
export const getShapeRelationshipsTool = tool(
  async ({ shapeId, relationshipType }, config) => {
    const shapes = (config?.configurable?.canvasShapes as CanvasShape[]) || [];
    const targetShape = shapes.find(s => s.id === shapeId);
    
    if (!targetShape) {
      return `Shape ${shapeId} not found`;
    }
    
    if (relationshipType === "nearby") {
      const nearby = shapes.filter(s => {
        if (s.id === shapeId) return false;
        const dx = Math.abs((s.x || 0) - (targetShape.x || 0));
        const dy = Math.abs((s.y || 0) - (targetShape.y || 0));
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 200; // Within 200px
      });
      
      return JSON.stringify({
        shapeId,
        nearbyShapes: nearby.map(s => ({
          id: s.id,
          type: s.type,
          distance: Math.sqrt(
            Math.pow((s.x || 0) - (targetShape.x || 0), 2) +
            Math.pow((s.y || 0) - (targetShape.y || 0), 2)
          ).toFixed(2)
        }))
      });
    }
    
    if (relationshipType === "connected") {
      const arrows = shapes.filter(s => s.type === "arrow");
      const connected = arrows.filter(arrow => {
        const start = arrow.props?.start;
        const end = arrow.props?.end;
        // Simplified connection detection
        return start || end; // Would need proper logic here
      });
      
      return JSON.stringify({
        shapeId,
        connectedShapes: connected.map(a => ({ id: a.id, type: "arrow" }))
      });
    }
    
    return JSON.stringify({ shapeId, relationships: [] });
  },
  {
    name: "get_shape_relationships",
    description: "Find relationships between shapes. Use 'nearby' to find shapes close to a target, 'connected' to find arrow connections.",
    schema: z.object({
      shapeId: z.string().describe("ID of the target shape"),
      relationshipType: z.enum(["nearby", "connected"]).describe("Type of relationship to find")
    })
  }
);

// Tool 4: Calculate arrow path
export const calculateArrowPathTool = tool(
  async ({ fromX, fromY, toX, toY, fromWidth = 100, fromHeight = 100 }) => {
    // Calculate connection points from center of shapes
    const startX = fromX + (fromWidth / 2);
    const startY = fromY + fromHeight; // Bottom of from shape
    const endX = toX + (fromWidth / 2);
    const endY = toY; // Top of to shape
    
    return JSON.stringify({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      recommendation: "Connect shapes with vertical arrow"
    });
  },
  {
    name: "calculate_arrow_path",
    description: "Calculate optimal arrow path between two shapes given their positions and dimensions.",
    schema: z.object({
      fromX: z.number().describe("X position of starting shape"),
      fromY: z.number().describe("Y position of starting shape"),
      toX: z.number().describe("X position of ending shape"),
      toY: z.number().describe("Y position of ending shape"),
      fromWidth: z.number().optional().describe("Width of starting shape (default 100)"),
      fromHeight: z.number().optional().describe("Height of starting shape (default 100)")
    })
  }
);

// Export all tools
export const canvasTools = [
  getCanvasStateTool,
  analyzeLayoutTool,
  getShapeRelationshipsTool,
  calculateArrowPathTool
];
