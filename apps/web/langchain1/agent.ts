"use server"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { Primitive } from "./lib/primitives";
import { PrimitiveOutputSchema, PRIMITIVE_GENERATOR_PROMPT } from "./lib/llm-prompt";
import { renderPrimitives, type TLDrawShape } from "./lib/renderer";

interface TLDrawCanvasShape {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
}

interface DrawingRequest {
  userRequest: string;
  canvasImage?: string;
  canvasContext?: TLDrawCanvasShape[];
}

interface DrawingResult {
  success: boolean;
  primitives?: unknown[];
  tldrawShapes?: TLDrawShape[];
  reply?: string;
  error?: string;
  stats?: {
    primitiveCount?: number;
    shapeCount?: number;
    executionTime: number;
  };
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const structuredModel = model.withStructuredOutput(PrimitiveOutputSchema, {
  name: "primitive_shapes",
  includeRaw: false
});

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function generatePrimitives(request: DrawingRequest): Promise<{
  primitives: unknown[];
  reply: string;
}> {

  let promptText = request.userRequest;
      promptText += `\n\nExisting shapes on canvas (TLDraw format):\n${JSON.stringify(request.canvasContext)}`;
  const userContent: UserContentPart[] = [{ type: "text", text: promptText }];
  
  if (request.canvasImage) {
    userContent.push({ type: "image_url", image_url: { url: request.canvasImage } });
  }

  const messages = [
    { role: "system", content: PRIMITIVE_GENERATOR_PROMPT },
    { role: "user", content: userContent }
  ];

  const output = await structuredModel.invoke(messages);














  
  return {
    primitives: output.items,
    reply: output.description || `Created ${output.items.length} primitive shapes`
  };
}


export async function   drawWithPrimitives(
  request: DrawingRequest
): Promise<DrawingResult> {
  const startTime = Date.now();
  try {


    console.log(" Step 1: Generating primitives from request...");
    const { primitives, reply } = await generatePrimitives(request);
    const tldrawShapes = renderPrimitives(primitives as Primitive[]);
    const executionTime = Date.now() - startTime;
    console.log(tldrawShapes + "TL Draw Shapes");
    
    return {
      success: true,
      primitives,
      tldrawShapes,
      reply,
      stats: {
        primitiveCount: primitives.length,
        shapeCount: tldrawShapes.length,
        executionTime
      }
    };
  } catch (error) {
    console.error("Agent Error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      reply: "Failed to process your request"
    };
  }
}