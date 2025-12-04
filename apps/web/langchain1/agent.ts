"use server"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { Primitive } from "./lib/primitives";
import {  PrimitiveOutputSchema,PRIMITIVE_GENERATOR_PROMPT } from "./lib/llm-prompt";
import { renderPrimitives,TLDrawShape } from "./lib/renderer";

interface DrawingRequest {
  userRequest: string;
  canvasImage?: string;
}

interface DrawingResult {
  success: boolean;
  primitives?: unknown[];
  tldrawShapes?: TLDrawShape[];
  reply?: string;
  error?: string;
  stats?: {
    primitiveCount: number;
    shapeCount: number;
    executionTime: number;
  };
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const structuredModel = model.withStructuredOutput(PrimitiveOutputSchema, {
  name: "primitive_shapes",
  includeRaw: false
});

/**
 * Generate primitives from natural language request
 */
async function generatePrimitives(request: DrawingRequest): Promise<{
  primitives: unknown[];
  reply: string;
}> {
  try {
    const userMessage = 
      [
          { type: "text" as const, text: request.userRequest },
          { 
            type: "image_url" as const, 
            image_url: { url: request.canvasImage } 
          }
        ]
   
    const output = await structuredModel.invoke([
      { role: "system", content: PRIMITIVE_GENERATOR_PROMPT },
      { role: "user", content: userMessage }
    ]);

    console.log(output+"LLM Output")
    return {
      primitives: output.items,
      reply: output.description || `Created ${output.items.length} primitive shapes`
    };
  } catch (error) {
    throw new Error(
      `Failed to generate primitives: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Main agent function
 */
export async function drawWithPrimitives(
  request: DrawingRequest
): Promise<DrawingResult> {
  const startTime = Date.now();

  try {
    console.log("🎨 Primitive Agent Starting");
    console.log("Request:", request.userRequest);

    console.log("📝 Step 1: Generating primitives from request...");
    const { primitives, reply } = await generatePrimitives(request);
    console.log(`✅ Generated ${primitives.length} primitives`);

    console.log("🎯 Step 2: Rendering primitives to TLDraw shapes...");
    const tldrawShapes = renderPrimitives(primitives as Primitive[]);
    console.log(`✅ Created ${tldrawShapes.length} TLDraw shapes`);

    const executionTime = Date.now() - startTime;
console.log(tldrawShapes+"TL Draw Shapes");
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