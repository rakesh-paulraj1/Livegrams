"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CanvasShape } from "./lib/editorcontroller";
import { FULL_SYSTEM_PROMPT } from "./lib/prompts";
import { z } from "zod";

const createPropsSchema = () => z.object({
  geo: z.string().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  color: z.string().optional(),
  fill: z.string().optional(),
  dash: z.string().optional(),
  size: z.string().optional(),
  text: z.string().optional(),
  font: z.string().optional(),
  start: z.object({ x: z.number(), y: z.number() }).optional(),
  end: z.object({ x: z.number(), y: z.number() }).optional(),
  arrowheadStart: z.string().optional(),
  arrowheadEnd: z.string().optional(),
  bend: z.number().optional(),
  labelColor: z.string().optional()
});

const createShapeSchema = () => z.object({
  id: z.string().optional(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  props: createPropsSchema().optional()
});

const ActionSchema: z.ZodType = z.lazy(() => z.object({
  intent: z.enum(["create", "edit", "delete", "delete_all"]),
  shapes: z.array(createShapeSchema()).optional(),
  id: z.string().optional(),
  props: createPropsSchema().optional(),
  ids: z.array(z.string()).optional(),
  reply: z.string().optional()
}));

const ModelIntentSchema = z.object({
  intent: z.enum(["create", "edit", "delete", "delete_all", "batch"]),
  shapes: z.array(createShapeSchema()).optional(),
  id: z.string().optional(),
  props: createPropsSchema().optional(),
  ids: z.array(z.string()).optional(),
  actions: z.array(ActionSchema).optional(),
  reply: z.string().optional()
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const structuredModel = model.withStructuredOutput(ModelIntentSchema, {
  name: "canvas_intent",
  includeRaw: false
});

function formatCanvasSummary(shapes: CanvasShape[]): string {
  if (shapes.length === 0) return "Empty canvas";
  return `Current canvas (${shapes.length} shapes):\n${
    shapes.map(s => `${s.id}: ${s.type} at (${s.x}, ${s.y})`).join("\n")
  }`;
}

async function generateIntent(
  userRequest: string,
  canvasSnapshot: CanvasShape[] = [],
  canvasImage: string
) {
  const summary = formatCanvasSummary(canvasSnapshot);
  const textContent = `${summary}\n\nUser: "${userRequest}"`;

  const userMessage = [
    { type: "text" as const, text: textContent },
    { type: "image_url" as const, image_url: { url: canvasImage } },
  ];


  const intent = await structuredModel.invoke([
    { role: "system", content: FULL_SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ]);

  return intent;
}

export async function runCanvasAgent(
  userRequest: string,
  canvasSnapshot: CanvasShape[] = [],
  canvasImage: string
) {
  try {
    console.log("\nCANVAS AGENT STARTING");
    console.log("Request:", userRequest);
    console.log("Canvas:", canvasSnapshot.length, "shapes");
    if (canvasImage) {
      console.log("Canvas image provided, size:", canvasImage.length, "bytes");
    }

    const intent = await generateIntent(userRequest, canvasSnapshot, canvasImage);

    console.log("Intent generated:", intent);
    console.log("AGENT COMPLETE");

    return {
      success: true,
      intent: intent,
      reply: intent?.reply || "Operation completed",
      usedTools: intent?.actions ? true : false
    };

  } catch (error: unknown) {
    console.error("AGENT ERROR:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      intent: null,
      reply: "Error processing request"
    };
  }
}