/**
 * Geometry Validator - Pure Math, No Canvas
 * 
 * Validates LayoutSpec using deterministic geometric checks:
 * - Overlap detection (AABB intersection)
 * - Bounds checking
 * - Edge/graph validity
 * - Spacing consistency
 */

import type { 
  LayoutSpec, 
  LayoutNode, 
  ValidationIssue,
  ValidationResult,
} from "./layout-spec";

// ============================================
// Bounding Box Helpers
// ============================================

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getBounds(node: LayoutNode): BoundingBox {
  return {
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
  };
}

/**
 * AABB Overlap Detection (Axis-Aligned Bounding Box)
 * Returns true if two rectangles overlap
 */
function overlaps(a: BoundingBox, b: BoundingBox, margin: number = 0): boolean {
  return !(
    a.x + a.w + margin < b.x ||  // a is left of b
    b.x + b.w + margin < a.x ||  // b is left of a
    a.y + a.h + margin < b.y ||  // a is above b
    b.y + b.h + margin < a.y     // b is above a
  );
}

/**
 * Calculate edge-to-edge distance (minimum gap)
 */
function gapBetween(a: LayoutNode, b: LayoutNode): number {
  const ba = getBounds(a);
  const bb = getBounds(b);
  
  // Horizontal gap
  const hGap = Math.max(0, 
    Math.max(bb.x - (ba.x + ba.w), ba.x - (bb.x + bb.w))
  );
  
  // Vertical gap
  const vGap = Math.max(0,
    Math.max(bb.y - (ba.y + ba.h), ba.y - (bb.y + bb.h))
  );
  
  // If they overlap, gap is negative
  if (overlaps(ba, bb)) {
    return -1;
  }
  
  // Return the actual gap (could be diagonal)
  return Math.sqrt(hGap ** 2 + vGap ** 2);
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check for overlapping nodes
 */
function checkOverlaps(nodes: LayoutNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      
      if (overlaps(getBounds(a), getBounds(b))) {
        const overlapAmount = calculateOverlapAmount(a, b);
        issues.push({
          code: "OVERLAP",
          severity: "error",
          message: `Node "${a.id}" overlaps with "${b.id}" by ~${overlapAmount}px`,
          entities: [a.id, b.id],
          suggestion: `Move "${b.id}" at least ${overlapAmount + 20}px away from "${a.id}"`,
        });
      }
    }
  }
  
  return issues;
}

function calculateOverlapAmount(a: LayoutNode, b: LayoutNode): number {
  const ba = getBounds(a);
  const bb = getBounds(b);
  
  const overlapX = Math.min(ba.x + ba.w, bb.x + bb.w) - Math.max(ba.x, bb.x);
  const overlapY = Math.min(ba.y + ba.h, bb.y + bb.h) - Math.max(ba.y, bb.y);
  
  return Math.round(Math.min(overlapX, overlapY));
}

/**
 * Check if nodes are within canvas bounds
 */
function checkBounds(spec: LayoutSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { width, height } = spec.canvas;
  
  for (const node of spec.nodes) {
    const problems: string[] = [];
    
    if (node.x < 0) problems.push(`x=${node.x} is negative`);
    if (node.y < 0) problems.push(`y=${node.y} is negative`);
    if (node.x + node.w > width) problems.push(`right edge (${node.x + node.w}) exceeds canvas width (${width})`);
    if (node.y + node.h > height) problems.push(`bottom edge (${node.y + node.h}) exceeds canvas height (${height})`);
    
    if (problems.length > 0) {
      issues.push({
        code: "OUT_OF_BOUNDS",
        severity: "error",
        message: `Node "${node.id}" is outside canvas: ${problems.join(", ")}`,
        entities: [node.id],
        suggestion: `Keep node within bounds: x(0-${width - node.w}), y(0-${height - node.h})`,
      });
    }
  }
  
  return issues;
}

/**
 * Check edge validity (graph correctness)
 */
function checkEdges(spec: LayoutSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(spec.nodes.map(n => n.id));
  
  for (const edge of spec.edges) {
    // Check if 'from' node exists
    if (!nodeIds.has(edge.from)) {
      issues.push({
        code: "INVALID_EDGE_TARGET",
        severity: "error",
        message: `Edge "${edge.id}" references non-existent source node "${edge.from}"`,
        entities: [edge.id, edge.from],
        suggestion: `Change edge.from to one of: ${[...nodeIds].join(", ")}`,
      });
    }
    
    // Check if 'to' node exists
    if (!nodeIds.has(edge.to)) {
      issues.push({
        code: "INVALID_EDGE_TARGET",
        severity: "error",
        message: `Edge "${edge.id}" references non-existent target node "${edge.to}"`,
        entities: [edge.id, edge.to],
        suggestion: `Change edge.to to one of: ${[...nodeIds].join(", ")}`,
      });
    }
    
    // Check for self-loops (usually unintended)
    if (edge.from === edge.to) {
      issues.push({
        code: "DISCONNECTED_EDGE",
        severity: "warning",
        message: `Edge "${edge.id}" is a self-loop (connects "${edge.from}" to itself)`,
        entities: [edge.id],
        suggestion: "Remove self-loop or connect to a different node",
      });
    }
  }
  
  return issues;
}

/**
 * Check for duplicate IDs
 */
function checkDuplicateIds(spec: LayoutSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Map<string, string>(); // id -> type
  
  for (const node of spec.nodes) {
    if (seenIds.has(node.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Duplicate ID "${node.id}" - already used by ${seenIds.get(node.id)}`,
        entities: [node.id],
        suggestion: `Rename to "${node.id}_2" or use a unique identifier`,
      });
    }
    seenIds.set(node.id, `node (${node.type})`);
  }
  
  for (const edge of spec.edges) {
    if (seenIds.has(edge.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        severity: "error",
        message: `Duplicate ID "${edge.id}" - already used by ${seenIds.get(edge.id)}`,
        entities: [edge.id],
        suggestion: `Rename to "${edge.id}_edge" or use a unique identifier`,
      });
    }
    seenIds.set(edge.id, `edge (${edge.from} → ${edge.to})`);
  }
  
  return issues;
}

/**
 * Check spacing consistency (optional, warning only)
 */
function checkSpacing(nodes: LayoutNode[], minGap: number = 20): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Find nodes that are too close but not overlapping
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const gap = gapBetween(a, b);
      
      if (gap >= 0 && gap < minGap) {
        issues.push({
          code: "SPACING_WARNING",
          severity: "warning",
          message: `Nodes "${a.id}" and "${b.id}" are very close (${Math.round(gap)}px gap)`,
          entities: [a.id, b.id],
          suggestion: `Increase gap to at least ${minGap}px for better readability`,
        });
      }
    }
  }
  
  return issues;
}

/**
 * Check for empty diagram
 */
function checkEmpty(spec: LayoutSpec): ValidationIssue[] {
  if (spec.nodes.length === 0) {
    return [{
      code: "EMPTY_DIAGRAM",
      severity: "error",
      message: "Diagram has no nodes",
      entities: [],
      suggestion: "Add at least one node to the diagram",
    }];
  }
  return [];
}

// ============================================
// Main Validation Function
// ============================================

export function validateLayoutSpec(spec: LayoutSpec): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  
  // Run all checks
  allIssues.push(...checkEmpty(spec));
  allIssues.push(...checkDuplicateIds(spec));
  allIssues.push(...checkOverlaps(spec.nodes));
  allIssues.push(...checkBounds(spec));
  allIssues.push(...checkEdges(spec));
  allIssues.push(...checkSpacing(spec.nodes));
  
  const errorCount = allIssues.filter(i => i.severity === "error").length;
  const warningCount = allIssues.filter(i => i.severity === "warning").length;
  
  return {
    isValid: errorCount === 0,
    issues: allIssues,
    stats: {
      nodeCount: spec.nodes.length,
      edgeCount: spec.edges.length,
      errorCount,
      warningCount,
    },
  };
}

// ============================================
// Feedback Generation for Agent
// ============================================

/**
 * Generate machine-readable feedback for the LLM
 */
export function generateAgentFeedback(result: ValidationResult): string {
  if (result.isValid) {
    return "✅ Layout is valid. No issues found.";
  }
  
  const lines: string[] = [
    `❌ Found ${result.stats.errorCount} errors and ${result.stats.warningCount} warnings:`,
    "",
  ];
  
  // Group by severity
  const errors = result.issues.filter(i => i.severity === "error");
  const warnings = result.issues.filter(i => i.severity === "warning");
  
  if (errors.length > 0) {
    lines.push("ERRORS (must fix):");
    for (const issue of errors) {
      lines.push(`  [${issue.code}] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    → Fix: ${issue.suggestion}`);
      }
    }
    lines.push("");
  }
  
  if (warnings.length > 0) {
    lines.push("WARNINGS (recommended to fix):");
    for (const issue of warnings) {
      lines.push(`  [${issue.code}] ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    → Suggestion: ${issue.suggestion}`);
      }
    }
  }
  
  return lines.join("\n");
}

/**
 * Generate JSON feedback (for structured agent communication)
 */
export function generateStructuredFeedback(result: ValidationResult): object {
  return {
    valid: result.isValid,
    errorCount: result.stats.errorCount,
    warningCount: result.stats.warningCount,
    issues: result.issues.map(i => ({
      code: i.code,
      severity: i.severity,
      message: i.message,
      entities: i.entities,
      fix: i.suggestion,
    })),
  };
}
