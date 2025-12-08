

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PrimitiveOutputSchema, PRIMITIVE_GENERATOR_PROMPT } from "../lib/llm-prompt";
import { validatePrimitives, checkLayout, renderPreview, type ValidationIssue } from "../lib/canvas-preview";
import { renderPrimitives, type TLDrawShape } from "../lib/renderer";
import type { Primitive } from "../lib/primitives";

const DiagramState = Annotation.Root({
  userRequest: Annotation<string>,
  canvasImage: Annotation<string | undefined>,
  canvasContext: Annotation<unknown[] | undefined>,
  
  // Processing
  primitives: Annotation<unknown[]>,
  validationIssues: Annotation<ValidationIssue[]>,
  feedback: Annotation<string | undefined>,
  previewImage: Annotation<string | undefined>,
  
  // Control
  attempts: Annotation<number>,
  maxAttempts: Annotation<number>,
  isValid: Annotation<boolean>,
  
  // Output
  tldrawShapes: Annotation<TLDrawShape[]>,
  reply: Annotation<string>,
});

type DiagramStateType = typeof DiagramState.State;

// Model setup
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const structuredModel = model.withStructuredOutput(PrimitiveOutputSchema, {
  name: "primitive_shapes",
  includeRaw: false
});

// Enhanced prompt that includes feedback
function buildPrompt(state: DiagramStateType): string {
  let prompt = state.userRequest;
  
  // Add canvas context if available
  if (state.canvasContext && Array.isArray(state.canvasContext) && state.canvasContext.length > 0) {
    prompt += `\n\nExisting shapes on canvas (TLDraw format):\n${JSON.stringify(state.canvasContext, null, 2)}`;
  }
  
  // Add feedback from previous validation attempt
  if (state.feedback) {
    prompt += `\n\n⚠️ IMPORTANT - Your previous attempt had issues. Look at the attached image to see what you generated.`;
    prompt += `\n\nProblems found:\n${state.feedback}`;
    prompt += `\n\nPlease fix these issues:
- Position arrows to connect shape edges precisely (arrow start/end should touch shape boundaries)
- Avoid overlapping shapes (maintain at least 20px gap)
- Keep all shapes within canvas bounds (x: 0-1200, y: 0-800)
- Use consistent spacing between elements`;
  }
  
  return prompt;
}

// Node: Generate primitives
async function generateNode(state: DiagramStateType): Promise<Partial<DiagramStateType>> {
  console.log(`🎨 Generate Node (Attempt ${state.attempts + 1}/${state.maxAttempts})`);
  
  const promptText = buildPrompt(state);
  
  // Determine which image to show the model:
  // - On first attempt: use the user's canvas image (if any)
  // - On retry: use the preview image so the model can SEE what it generated
  const imageToShow = state.previewImage || state.canvasImage;
  
  // Build messages using LangChain message classes
  const messages = [
    new SystemMessage(PRIMITIVE_GENERATOR_PROMPT),
    imageToShow 
      ? new HumanMessage({
          content: [
            { type: "text", text: promptText },
            { 
              type: "image_url", 
              image_url: { 
                url: imageToShow.startsWith('data:') ? imageToShow : `data:image/png;base64,${imageToShow}` 
              } 
            }
          ]
        })
      : new HumanMessage(promptText)
  ];
  
  if (state.previewImage && state.attempts > 0) {
    console.log("📸 Showing model the preview of its previous attempt");
  }
  
  const output = await structuredModel.invoke(messages);
  
  console.log(`✅ Generated ${output.items.length} primitives`);
  
  return {
    primitives: output.items,
    attempts: state.attempts + 1,
    reply: output.description || `Created ${output.items.length} shapes`,
  };
}

// Node: Validate primitives
async function validateNode(state: DiagramStateType): Promise<Partial<DiagramStateType>> {
  console.log("🔍 Validate Node");
  
  const primitives = state.primitives as Primitive[];
  
  // Run validation
  const { issues, previewImage, isValid } = validatePrimitives(primitives, { 
    renderImage: true 
  });
  
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  
  console.log(` Validation: ${errorCount} errors, ${warningCount} warnings`);
  
  if (issues.length > 0) {
    console.log("Issues found:");
    issues.forEach(issue => console.log(`  - [${issue.severity}] ${issue.message}`));
  }
  
  return {
    validationIssues: issues,
    previewImage,
    isValid,
  };
}

// Node: Generate feedback for refinement
async function feedbackNode(state: DiagramStateType): Promise<Partial<DiagramStateType>> {
  console.log("📝 Feedback Node");
  
  const issues = state.validationIssues;
  
  // Build specific feedback for the model
  const feedbackLines = issues.map(issue => {
    switch (issue.type) {
      case 'overlap':
        return `OVERLAP: ${issue.message}. Move one of the shapes to avoid overlap.`;
      case 'disconnected':
        return `ARROW: ${issue.message}. Adjust arrow coordinates to connect properly.`;
      case 'off-canvas':
        return `BOUNDS: ${issue.message}. Move shape inside canvas (x: 0-1200, y: 0-800).`;
      case 'spacing':
        return `SPACING: ${issue.message}. Adjust positions for consistent spacing.`;
      case 'alignment':
        return `ALIGNMENT: ${issue.message}. Align shapes properly.`;
      default:
        return issue.message;
    }
  });
  
  const feedback = feedbackLines.join('\n');
  
  console.log("Feedback generated:", feedback);
  
  return {
    feedback,
  };
}

async function renderNode(state: DiagramStateType): Promise<Partial<DiagramStateType>> {
  console.log("🎯 Render Node");
  
  const primitives = state.primitives as Primitive[];
  const tldrawShapes = renderPrimitives(primitives);
  
  console.log(`✅ Rendered ${tldrawShapes.length} TLDraw shapes`);
  
  return {
    tldrawShapes,
  };
}

function shouldRetry(state: DiagramStateType): "refine" | "render" {
  // If valid, go to render
  if (state.isValid) {
    console.log("✅ Validation passed, proceeding to render");
    return "render";
  }
  
  // If we've exhausted attempts, render anyway (best effort)
  if (state.attempts >= state.maxAttempts) {
    console.log(`⚠️ Max attempts (${state.maxAttempts}) reached, rendering best effort`);
    return "render";
  }
  
  // Otherwise, generate feedback and retry
  console.log("🔄 Validation failed, will retry with feedback");
  return "refine";
}

// Build the graph
function createDiagramGraph() {
  const graph = new StateGraph(DiagramState)
    .addNode("generate", generateNode)
    .addNode("validate", validateNode)
    .addNode("refine", feedbackNode)
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

// Main export: run the diagram agent
export async function runDiagramAgent(request: {
  userRequest: string;
  canvasImage?: string;
  canvasContext?: unknown[];
  maxAttempts?: number;
}): Promise<{
  success: boolean;
  primitives?: unknown[];
  tldrawShapes?: TLDrawShape[];
  reply?: string;
  error?: string;
  validationIssues?: ValidationIssue[];
  previewImage?: string;
  stats?: {
    primitiveCount: number;
    shapeCount: number;
    attempts: number;
    isValid: boolean;
  };
}> {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting Diagram Agent");
    console.log("Request:", request.userRequest);
    
    const graph = createDiagramGraph();
    
    const initialState: Partial<DiagramStateType> = {
      userRequest: request.userRequest,
      canvasImage: request.canvasImage,
      canvasContext: request.canvasContext,
      primitives: [],
      validationIssues: [],
      feedback: undefined,
      previewImage: undefined,
      attempts: 0,
      maxAttempts: request.maxAttempts || 3,
      isValid: false,
      tldrawShapes: [],
      reply: "",
    };
    
    const result = await graph.invoke(initialState);
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Agent completed in ${executionTime}ms`);
    
    return {
      success: true,
      primitives: result.primitives,
      tldrawShapes: result.tldrawShapes,
      reply: result.reply,
      validationIssues: result.validationIssues,
      previewImage: result.previewImage,
      stats: {
        primitiveCount: result.primitives?.length || 0,
        shapeCount: result.tldrawShapes?.length || 0,
        attempts: result.attempts,
        isValid: result.isValid,
      },
    };
  } catch (error) {
    console.error("❌ Diagram Agent Error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      reply: "Failed to process your request",
    };
  }
}

export { checkLayout, renderPreview, validatePrimitives };
