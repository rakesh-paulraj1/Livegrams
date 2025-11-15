"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { CanvasShape } from "./lib/editorcontroller";
import { z } from "zod";

const TLDRAW_SCHEMA = `
# TLDraw Canvas Capabilities

## Available Shape Types:
1. **geo** - Geometric shapes: rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star, rhombus, cloud, trapezoid, arrow-right, arrow-left, arrow-up, arrow-down, x-box, check-box
2. **arrow** - Arrows connecting points or shapes
3. **text** - Text labels
4. **line** - Free-form lines
5. **draw** - Hand-drawn strokes
6. **note** - Sticky notes
7. **frame** - Grouping frames
8. **highlight** - Highlighting overlays

## Shape Properties:
- Geo: {geo, w, h, color, fill, dash, size, text?}
- Arrow: {start: {x, y}, end: {x, y}, color, arrowheadStart, arrowheadEnd, bend, labelColor, size, font}
  IMPORTANT: Arrows do NOT support a "text" property. Use a separate text shape for labels.
- Text: {text, color, size, font, w}
- Colors: black, blue, red, green, yellow, orange, violet, grey
- Fill: none, semi, solid, pattern
- Dash: draw, solid, dashed, dotted
- Size: s, m, l, xl
`;

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

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  userRequest: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  canvasSnapshot: Annotation<CanvasShape[]>({
    reducer: (x, y) => y ?? x,
  }),
  complexity: Annotation<"simple" | "complex">({
    reducer: (x, y) => y ?? x,
  }),
  finalIntent: Annotation<Record<string, unknown> | null>({
    reducer: (x, y) => y ?? x,
  }),
  reflectionCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
});

type State = typeof AgentState.State;
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
  return `Current canvas (${shapes.length} shapes - avoid overlapping):\n${
    shapes.map(s => `${s.id}: ${s.type} at (${s.x}, ${s.y})`).join("\n")
  }`;
}

function createUserMessage(state: State): string {
  const summary = formatCanvasSummary(state.canvasSnapshot);
  const textContent = `${summary}\n\nUser: "${state.userRequest}"`;
  return textContent;
}

function shouldContinueReflection(state: State): string {
  console.log('ROUTING: shouldContinueReflection - messages:', state.messages.length, 'reflectionCount:', state.reflectionCount);
  if (state.messages.length > 4) {
    console.log('ROUTING: Ending (message limit reached)');
    return END;
  }
  
  const lastMessage = state.messages[state.messages.length - 1]?.content || "";
  if (typeof lastMessage === 'string' && lastMessage.includes("APPROVED")) {
    console.log('ROUTING: Ending (APPROVED)');
    return END;
  }
  
  const next = state.complexity === "simple" ? "reflect_simple" : "reflect_complex";
  console.log('ROUTING: Continue to', next);
  return next;
}

async function classifyRequest(state: State) {
  console.log('NODE: classifier - Starting classification');
  console.log('userRequest:', state.userRequest);
  console.log('canvasSnapshot:', state.canvasSnapshot?.length);
  
  if (!state.userRequest || state.userRequest.trim() === '') {
    console.error('Empty userRequest in classifier');
    throw new Error('User request is empty');
  }
  
  const systemPrompt = `You are a canvas operation classifier. Analyze the user's request and determine if it's simple or complex.

SIMPLE operations (no tools needed):
- Single shape creation: "add a circle", "create blue rectangle"
- Simple edits: "move rect_1 to x=200", "change color to red"
- Single deletions: "delete shape_1", "remove the circle"

COMPLEX operations (need tools):
- Flowcharts: "create a login flowchart", "draw process flow"
- Diagrams: "create organizational chart", "show system architecture"
- Multiple connected shapes: "create 5 boxes connected with arrows"
- Layout-dependent: "align all shapes", "distribute evenly"
- Queries about canvas: "what shapes are near rect_1?"

Respond with JSON: {"complexity": "simple"|"complex", "reasoning": "..."}`;

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Request: "${state.userRequest}"` }
  ]);

  const content = response.content as string;
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  const classification = jsonMatch ? JSON.parse(jsonMatch[0]) : { complexity: "simple" };

  console.log("Classification:", classification.complexity);
  console.log('NODE: classifier - Complete');

  return {
    complexity: classification.complexity,
    messages: [new AIMessage(content)]
  };
}

async function handleOperation(state: State, isComplex: boolean) {
  const basePrompt = `You are a canvas intent generator. Analyze the user's request and generate the appropriate intent.

${TLDRAW_SCHEMA}

Available intents:
- create: Add new shapes to canvas
- edit: Modify existing shape properties  
- delete: Remove specific shapes by ID
- delete_all: Clear entire canvas
${isComplex ? "- batch: Execute multiple operations in sequence" : ""}

CRITICAL Rules:
- ALWAYS include the "props" object for every shape with ALL required properties
- For geo shapes: MUST include {geo: "shape-type", w: number, h: number, color: string}
- For arrow shapes: MUST include {start: {x, y}, end: {x, y}, color: string}
- For text shapes: MUST include {text: string, color: string, size: string}
- Default position for first shape: x=200, y=200
- Space multiple shapes 150px apart
- Always include a friendly reply message

Example geo shape:
{"type": "geo", "x": 200, "y": 200, "props": {"geo": "rectangle", "w": 100, "h": 80, "color": "blue"}}

Example arrow shape:
{"type": "arrow", "x": 300, "y": 200, "props": {"start": {"x": 300, "y": 200}, "end": {"x": 300, "y": 350}, "color": "black"}}`;

  const complexPrompt = isComplex ? `
For complex operations - FLOWCHARTS:
- Create boxes with text labels inside them (use "text" property in geo props)
- Use vertical spacing of 150px between boxes (box bottom to next box top)
- Arrows MUST connect box edges properly:
  * For vertical flow: Arrow start.y = box1.y + (h/2), Arrow end.y = box2.y - (h/2)
  * Arrow start.x and end.x = box center (box.x + w/2)
- CRITICAL: Every shape MUST have complete "props" with all required properties
- Include all shapes (boxes AND arrows) in a single create intent

COMPLETE FLOWCHART EXAMPLE (3 boxes connected vertically):
{
  "intent": "create",
  "shapes": [
    {"type": "geo", "x": 200, "y": 100, "props": {"geo": "rectangle", "w": 120, "h": 60, "color": "blue", "fill": "solid", "text": "Start"}},
    {"type": "arrow", "x": 260, "y": 130, "props": {"start": {"x": 260, "y": 160}, "end": {"x": 260, "y": 250}, "color": "black", "arrowheadEnd": "arrow"}},
    {"type": "geo", "x": 200, "y": 250, "props": {"geo": "rectangle", "w": 120, "h": 60, "color": "blue", "fill": "solid", "text": "Process"}},
    {"type": "arrow", "x": 260, "y": 280, "props": {"start": {"x": 260, "y": 310}, "end": {"x": 260, "y": 400}, "color": "black", "arrowheadEnd": "arrow"}},
    {"type": "geo", "x": 200, "y": 400, "props": {"geo": "rectangle", "w": 120, "h": 60, "color": "blue", "fill": "solid", "text": "End"}}
  ],
  "reply": "Created a flowchart with 3 connected steps"
}

Arrow calculation formula for vertical flowcharts:
- Box1 at (x=200, y=100, w=120, h=60) → center x = 200 + 60 = 260, bottom = 100 + 60 = 160
- Box2 at (x=200, y=250, w=120, h=60) → center x = 260, top = 250
- Arrow: start = {x: 260, y: 160}, end = {x: 260, y: 250}` : "";

  const systemPrompt = basePrompt + complexPrompt;
  const userMessage = createUserMessage(state);

  const intent = await structuredModel.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ]);

  console.log(`${isComplex ? 'Complex' : 'Simple'} intent generated:`, intent);
  
  return {
    finalIntent: intent,
    messages: [new AIMessage(JSON.stringify(intent))],
    reflectionCount: 0
  };
}

async function handleSimpleOperation(state: State) {
  console.log('🔵 NODE: simple_handler - Starting');
  const result = await handleOperation(state, false);
  console.log('✅ NODE: simple_handler - Complete');
  return result;
}

async function handleComplexOperation(state: State) {
  console.log('🔵 NODE: complex_handler - Starting');
  const result = await handleOperation(state, true);
  console.log('✅ NODE: complex_handler - Complete');
  return result;
}

async function reflect(state: State, isComplex: boolean) {
  const baseChecks = `
1. **Correctness**: Does the intent match the user's request?
2. **Positioning**: Are shapes positioned appropriately? Check for overlaps with existing shapes.
3. **Properties**: Are all required properties (geo type, size, color) specified correctly?
4. **Completeness**: Is anything missing?`;

  const complexChecks = isComplex ? `
5. **Layout Logic**: Are shapes arranged in a logical flow?
6. **Spacing**: Is spacing consistent (120-150px vertical, 200-250px horizontal)?
7. **Arrows**: Do arrows properly connect shape centers?
8. **Batch Usage**: Should this use batch intent to clear old shapes first?
9. **Text Labels**: Do flowchart boxes have descriptive text labels?
10. **Arrow Connections**: Are arrow start/end coordinates calculated correctly to connect box edges?` : "";

  const batchCheck = state.canvasSnapshot.length > 0 ? `\n\nIMPORTANT: Canvas has ${state.canvasSnapshot.length} existing shapes. Consider if batch intent should be used to:
- Clear old shapes first (delete or delete_all)
- Then create new shapes
Example: {"intent": "batch", "actions": [{"intent": "delete_all"}, {"intent": "create", "shapes": [...]}]}` : "";

  const reflectionPrompt = `You are a canvas intent validator. Review the generated intent and provide critique.

Check for:${baseChecks}${complexChecks}${batchCheck}

User request: "${state.userRequest}"
Canvas state: ${state.canvasSnapshot.length} existing shapes
${state.canvasSnapshot.map(s => `${s.id}: ${s.type} at (${s.x}, ${s.y})`).join(", ")}

Generated intent: ${JSON.stringify(state.finalIntent, null, 2)}

Provide specific recommendations for improvement, or respond "APPROVED" if the intent is correct.`;

  const critique = await model.invoke([
    { role: "system", content: reflectionPrompt }
  ]);

  // Ensure content is always a string
  let content = '';
  if (typeof critique.content === 'string') {
    content = critique.content;
  } else if (Array.isArray(critique.content)) {
    content = critique.content.map(item => 
      typeof item === 'string' ? item : JSON.stringify(item)
    ).join(' ');
  } else {
    content = JSON.stringify(critique.content);
  }
  
  console.log(`${isComplex ? 'Complex' : 'Simple'} reflection:`, content.substring(0, 100));

  return {
    messages: [new AIMessage(content)],
    reflectionCount: (state.reflectionCount || 0) + 1
  };
}

async function reflectSimple(state: State) {
  console.log('🔵 NODE: reflect_simple - Starting');
  const result = await reflect(state, false);
  console.log('✅ NODE: reflect_simple - Complete');
  return result;
}

async function reflectComplex(state: State) {
  console.log('🔵 NODE: reflect_complex - Starting');
  const result = await reflect(state, true);
  console.log('✅ NODE: reflect_complex - Complete');
  return result;
}

async function refine(state: State) {
  console.log('🔵 NODE: refine - Starting (reflection count:', state.reflectionCount, ')');
  const lastCritique = state.messages[state.messages.length - 1]?.content || "";
  
  const refinePrompt = `Based on the critique, generate an improved intent that addresses all feedback.

Original user request: "${state.userRequest}"
Previous intent: ${JSON.stringify(state.finalIntent, null, 2)}
Critique: ${lastCritique}

Generate a refined intent that fixes all issues mentioned in the critique.`;

  const canvasSummary = formatCanvasSummary(state.canvasSnapshot);

  const intent = await structuredModel.invoke([
    { role: "system", content: refinePrompt },
    { role: "user", content: canvasSummary }
  ]);

  console.log("Refined intent:", intent);
  console.log('✅ NODE: refine - Complete');

  return {
    finalIntent: intent,
    messages: [new AIMessage(JSON.stringify(intent))]
  };
}

function routeByComplexity(state: State): string {
  const route = state.complexity === "simple" ? "simple_handler" : "complex_handler";
  console.log('🔀 ROUTING: routeByComplexity ->', route);
  return route;
}

const workflow = new StateGraph(AgentState)
  .addNode("classifier", classifyRequest)
  .addNode("simple_handler", handleSimpleOperation)
  .addNode("reflect_simple", reflectSimple)
  .addNode("refine_simple", refine)
  .addNode("complex_handler", handleComplexOperation)
  .addNode("reflect_complex", reflectComplex)
  .addNode("refine_complex", refine)
  .addEdge(START, "classifier")
  .addConditionalEdges("classifier", routeByComplexity, {
    simple_handler: "simple_handler",
    complex_handler: "complex_handler"
  })
  .addConditionalEdges("simple_handler", shouldContinueReflection, {
    reflect_simple: "reflect_simple",
    [END]: END
  })
  .addEdge("reflect_simple", "refine_simple")
  .addConditionalEdges("refine_simple", shouldContinueReflection, {
    reflect_simple: "reflect_simple",
    [END]: END
  })
  .addConditionalEdges("complex_handler", shouldContinueReflection, {
    reflect_complex: "reflect_complex",
    [END]: END
  })
  .addEdge("reflect_complex", "refine_complex")
  .addConditionalEdges("refine_complex", shouldContinueReflection, {
    reflect_complex: "reflect_complex",
    [END]: END
  });

const graph = workflow.compile();

export async function runCanvasAgent(
  userRequest: string,
  canvasSnapshot: CanvasShape[] = []
) {
  try {
    console.log("\nCANVAS AGENT STARTING");
    console.log("Request:", userRequest);
    console.log("Canvas:", canvasSnapshot.length, "shapes");

    const result = await graph.invoke({
      userRequest,
      canvasSnapshot,
      messages: [],
      complexity: "simple",
      finalIntent: null,
      reflectionCount: 0
    });

    console.log("AGENT COMPLETE");
    console.log("Complexity:", result.complexity);

    return {
      success: true,
      complexity: result.complexity,
      intent: result.finalIntent,
      reply: result.finalIntent?.reply || "Operation completed",
      usedTools: result.complexity === "complex"
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