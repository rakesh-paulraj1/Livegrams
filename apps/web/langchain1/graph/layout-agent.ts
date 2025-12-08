/**
 * Layout Agent - Clean Architecture (No node-canvas)
 * 
 * Flow: Generate → Validate → Refine → Render
 * 
 * - Generate: LLM outputs LayoutSpec (nodes + edges by ID)
 * - Validate: Pure geometry + graph logic (no canvas)
 * - Refine: Structured feedback for agent repair
 * - Render: Convert to TLDraw shapes (client-side rendering)
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { LayoutSpecSchema, type LayoutSpec } from "../lib/layout-spec";
import { LAYOUT_SPEC_PROMPT } from "../lib/layout-prompt";
import { validateLayoutSpec, generateAgentFeedback } from "../lib/geometry-validator";
import type { ValidationResult } from "../lib/layout-spec";
import { renderLayoutSpec, type TLDrawShape } from "../lib/layout-renderer";

// ============================================
// State Definition
// ============================================

const LayoutAgentState = Annotation.Root({
  // Input
  userRequest: Annotation<string>,
  canvasImage: Annotation<string | undefined>,
  existingLayout: Annotation<LayoutSpec | undefined>,
  
  // Processing
  layoutSpec: Annotation<LayoutSpec | undefined>,
  validation: Annotation<ValidationResult | undefined>,
  feedback: Annotation<string | undefined>,
  
  // Control
  attempts: Annotation<number>,
  maxAttempts: Annotation<number>,
  
  // Output
  tldrawShapes: Annotation<TLDrawShape[]>,
  reply: Annotation<string>,
  isValid: Annotation<boolean>,
});

type LayoutAgentStateType = typeof LayoutAgentState.State;

// ============================================
// Model Setup
// ============================================

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const structuredModel = model.withStructuredOutput(LayoutSpecSchema, {
  name: "layout_spec",
  includeRaw: false,
});

// ============================================
// Prompt Builder
// ============================================

function buildPrompt(state: LayoutAgentStateType): string {
  let prompt = state.userRequest;
  
  // Add existing layout context if available
  if (state.existingLayout) {
    prompt += `\n\nExisting diagram on canvas:\n${JSON.stringify(state.existingLayout, null, 2)}`;
    prompt += `\n\nYou can reference existing node IDs or add new nodes.`;
  }
  
  // Add feedback from previous validation (structured, not image!)
  if (state.feedback) {
    prompt += `\n\n⚠️ YOUR PREVIOUS ATTEMPT HAD ERRORS. YOU MUST FIX THEM:\n`;
    prompt += state.feedback;
    prompt += `\n\nFix ALL errors listed above. Keep the same structure but adjust positions/IDs as needed.`;
  }
  
  return prompt;
}

// ============================================
// Graph Nodes
// ============================================

/**
 * GENERATE NODE
 * LLM creates LayoutSpec (nodes + edges with IDs)
 */
async function generateNode(state: LayoutAgentStateType): Promise<Partial<LayoutAgentStateType>> {
  console.log(`\n🎨 GENERATE (Attempt ${state.attempts + 1}/${state.maxAttempts})`);
  
  const prompt = buildPrompt(state);
  
  const messages = [
    new SystemMessage(LAYOUT_SPEC_PROMPT),
    state.canvasImage
      ? new HumanMessage({
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: state.canvasImage } },
          ],
        })
      : new HumanMessage(prompt),
  ];
  
  const rawLayoutSpec = await structuredModel.invoke(messages);
  
  // Normalize the output - apply defaults for optional fields
  const layoutSpec: LayoutSpec = {
    canvas: {
      width: rawLayoutSpec.canvas?.width ?? 1200,
      height: rawLayoutSpec.canvas?.height ?? 800,
    },
    nodes: rawLayoutSpec.nodes.map(node => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      w: node.w ?? 120,
      h: node.h ?? 60,
      label: node.label,
      color: node.color,
      fillColor: node.fillColor,
    })),
    edges: rawLayoutSpec.edges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      type: edge.type ?? "arrow",
      label: edge.label,
      color: edge.color,
    })),
    texts: rawLayoutSpec.texts,
    description: rawLayoutSpec.description,
  };
  
  console.log(`   Generated: ${layoutSpec.nodes.length} nodes, ${layoutSpec.edges.length} edges`);
  
  return {
    layoutSpec,
    attempts: state.attempts + 1,
    reply: layoutSpec.description || `Created diagram with ${layoutSpec.nodes.length} shapes`,
  };
}

/**
 * VALIDATE NODE
 * Pure geometry + graph validation (no canvas!)
 */
async function validateNode(state: LayoutAgentStateType): Promise<Partial<LayoutAgentStateType>> {
  console.log(`\n🔍 VALIDATE`);
  
  if (!state.layoutSpec) {
    return {
      validation: {
        isValid: false,
        issues: [{ code: "EMPTY_DIAGRAM", severity: "error", message: "No layout generated", entities: [] }],
        stats: { nodeCount: 0, edgeCount: 0, errorCount: 1, warningCount: 0 },
      },
      isValid: false,
    };
  }
  
  const validation = validateLayoutSpec(state.layoutSpec);
  
  console.log(`   Result: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`   Stats: ${validation.stats.nodeCount} nodes, ${validation.stats.edgeCount} edges`);
  console.log(`   Issues: ${validation.stats.errorCount} errors, ${validation.stats.warningCount} warnings`);
  
  if (!validation.isValid) {
    validation.issues.forEach(issue => {
      console.log(`   [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
    });
  }
  
  return {
    validation,
    isValid: validation.isValid,
  };
}

/**
 * REFINE NODE
 * Generate structured feedback for agent repair
 */
async function refineNode(state: LayoutAgentStateType): Promise<Partial<LayoutAgentStateType>> {
  console.log(`\n📝 REFINE (preparing feedback)`);
  
  if (!state.validation) {
    return { feedback: "Unknown validation error" };
  }
  
  // Generate machine-readable feedback
  const feedback = generateAgentFeedback(state.validation);
  
  console.log(`   Feedback:\n${feedback.split('\n').map(l => '   ' + l).join('\n')}`);
  
  return { feedback };
}

/**
 * RENDER NODE
 * Convert LayoutSpec → TLDraw shapes
 */
async function renderNode(state: LayoutAgentStateType): Promise<Partial<LayoutAgentStateType>> {
  console.log(`\n🎯 RENDER`);
  
  if (!state.layoutSpec) {
    return { tldrawShapes: [] };
  }
  
  const tldrawShapes = renderLayoutSpec(state.layoutSpec);
  
  console.log(`   Output: ${tldrawShapes.length} TLDraw shapes`);
  
  return { tldrawShapes };
}

// ============================================
// Conditional Edge
// ============================================

function shouldRetry(state: LayoutAgentStateType): "refine" | "render" {
  // Valid → render
  if (state.isValid) {
    console.log(`\n✅ Validation passed → render`);
    return "render";
  }
  
  // Max attempts reached → render anyway (best effort)
  if (state.attempts >= state.maxAttempts) {
    console.log(`\n⚠️ Max attempts (${state.maxAttempts}) reached → render best effort`);
    return "render";
  }
  
  // Invalid → refine and retry
  console.log(`\n🔄 Validation failed → refine and retry`);
  return "refine";
}

// ============================================
// Build Graph
// ============================================

function createLayoutGraph() {
  const graph = new StateGraph(LayoutAgentState)
    .addNode("generate", generateNode)
    .addNode("validate", validateNode)
    .addNode("refine", refineNode)
    .addNode("render", renderNode)
    .addEdge("__start__", "generate")
    .addEdge("generate", "validate")
    .addConditionalEdges("validate", shouldRetry, {
      refine: "refine",
      render: "render",
    })
    .addEdge("refine", "generate")
    .addEdge("render", "__end__");
  
  return graph.compile();
}

// ============================================
// Main Export
// ============================================

export interface LayoutAgentRequest {
  userRequest: string;
  canvasImage?: string;
  existingLayout?: LayoutSpec;
  maxAttempts?: number;
}

export interface LayoutAgentResponse {
  success: boolean;
  layoutSpec?: LayoutSpec;
  tldrawShapes?: TLDrawShape[];
  reply?: string;
  error?: string;
  validation?: ValidationResult;
  stats?: {
    nodeCount: number;
    edgeCount: number;
    shapeCount: number;
    attempts: number;
    isValid: boolean;
  };
}

export async function runLayoutAgent(request: LayoutAgentRequest): Promise<LayoutAgentResponse> {
  const startTime = Date.now();
  
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 LAYOUT AGENT START");
    console.log("=".repeat(50));
    console.log(`Request: "${request.userRequest}"`);
    
    const graph = createLayoutGraph();
    
    const initialState: Partial<LayoutAgentStateType> = {
      userRequest: request.userRequest,
      canvasImage: request.canvasImage,
      existingLayout: request.existingLayout,
      layoutSpec: undefined,
      validation: undefined,
      feedback: undefined,
      attempts: 0,
      maxAttempts: request.maxAttempts || 3,
      tldrawShapes: [],
      reply: "",
      isValid: false,
    };
    
    const result = await graph.invoke(initialState);
    
    const executionTime = Date.now() - startTime;
    console.log("\n" + "=".repeat(50));
    console.log(`✅ COMPLETE in ${executionTime}ms`);
    console.log("=".repeat(50) + "\n");
    
    return {
      success: true,
      layoutSpec: result.layoutSpec,
      tldrawShapes: result.tldrawShapes,
      reply: result.reply,
      validation: result.validation,
      stats: {
        nodeCount: result.layoutSpec?.nodes.length || 0,
        edgeCount: result.layoutSpec?.edges.length || 0,
        shapeCount: result.tldrawShapes?.length || 0,
        attempts: result.attempts,
        isValid: result.isValid,
      },
    };
  } catch (error) {
    console.error("\n❌ LAYOUT AGENT ERROR:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      reply: "Failed to generate diagram",
    };
  }
}

// Export validation utilities for testing
export { validateLayoutSpec, generateAgentFeedback };
