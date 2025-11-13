"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CanvasShape } from "./lib/editorcontroller";
import { canvasTools } from "./tools/canvas-tools";

// ============ MODEL SETUP ============

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

// Model with tools for complex operations
const modelWithTools = model.bindTools(canvasTools);


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
});


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

const allTools = [...canvasTools, tldraw_docs_retrieve];
const modelWithTools = model.bindTools(allTools);



async function classifyRequest(state: typeof AgentState.State) {
  const systemPrompt = `You are a canvas operation classifier. Analyze the user's request and determine if it's simple or complex.

SIMPLE operations (no tools needed):
- Single shape creation: "add a circle", "create blue rectangle"
- Simple edits: "move rect_1 to x=200", "change color to red"
- Single deletions: "delete shape_1", "remove the circle"
- Clear canvas: "delete everything"

COMPLEX operations (need tools):
- Flowcharts: "create a login flowchart", "draw process flow"
- Diagrams: "create organizational chart", "show system architecture"
- Multiple connected shapes: "create 5 boxes connected with arrows"
- Layout-dependent: "align all shapes", "distribute evenly"
- Queries about canvas: "what shapes are near rect_1?"

Respond with JSON: {"complexity": "simple"|"complex", "reasoning": "..."}`;

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Request: "${state.userRequest}"\nCurrent canvas: ${state.canvasSnapshot.length} shapes` }
  ]);

  const content = response.content as string;
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  const classification = jsonMatch ? JSON.parse(jsonMatch[0]) : { complexity: "simple" };

  console.log("📊 Classification:", classification);

  return {
    complexity: classification.complexity,
    messages: [new AIMessage(content)]
  };
}

// ============ NODE: SIMPLE HANDLER ============

async function handleSimpleOperation(state: typeof AgentState.State) {
  const systemPrompt = `You are a canvas intent generator. Generate structured intent for simple operations.

Available intents:
- create: Add new shape(s)
- edit: Modify existing shape properties
- delete: Remove specific shape(s)
- delete_all: Clear entire canvas

Shape types and properties:
1. geo: Geometric shapes
   - props.geo: "rectangle" | "ellipse" | "triangle" | "diamond"
   - props.w, props.h: dimensions (default 100)
   - props.color: "black" | "blue" | "red" | "green" | "yellow"
   
2. text: Text boxes
   - props.text: string content
   - props.size: "s" | "m" | "l" | "xl"
   - props.color: color name

3. arrow: Connecting lines
   - props.start: {x, y}
   - props.end: {x, y}
   - props.color: color name

Default positioning:
- First shape: x=200, y=200
- Additional shapes: offset by 150px to right

Respond with JSON:
{
  "intent": "create"|"edit"|"delete"|"delete_all",
  "shapes": [{"type": "geo", "x": 200, "y": 200, "props": {"geo": "rectangle", "w": 100, "h": 100, "color": "blue"}}],
  "id": "shape_id",
  "ids": ["id1", "id2"],
  "props": {"x": 300},
  "reply": "User-friendly confirmation message"
}`;

  const canvasSummary = state.canvasSnapshot.length > 0
    ? `Existing shapes: ${state.canvasSnapshot.map(s => `${s.id}(${s.type})`).join(", ")}`
    : "Empty canvas";

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: `${canvasSummary}\n\nUser: "${state.userRequest}"` }
  ]);

  const content = response.content as string;
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  const intent = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  console.log("✅ Simple intent:", intent);

  return {
    finalIntent: intent,
    messages: [new AIMessage(content)]
  };
}

// ============ NODE: COMPLEX HANDLER (WITH TOOLS) ============

async function handleComplexOperation(state: typeof AgentState.State) {
  const systemPrompt = `You are an advanced canvas agent with access to tools. Use them to create complex layouts.

WORKFLOW FOR COMPLEX OPERATIONS:
1. Use get_canvas_state(detailed=true) to understand current canvas
2. Use analyze_layout for flowcharts/diagrams to get positioning
3. Use search_editor_docs if you need TLDraw-specific features
4. Use calculate_arrow_path to connect shapes
5. Generate final structured intent

FLOWCHART EXAMPLE:
User: "create login flowchart"
1. Call analyze_layout(operation="flowchart", shapeCount=4)
2. Get positions: [{x:100,y:100}, {x:100,y:200}, ...]
3. Create nodes at those positions
4. Use calculate_arrow_path between consecutive nodes
5. Return batch intent with all shapes and arrows

When you have all information, respond with:
FINAL_INTENT: {json with structured intent}`;

  const messages: BaseMessage[] = [
    new AIMessage(systemPrompt),
    new AIMessage(`Canvas: ${state.canvasSnapshot.length} shapes\nRequest: "${state.userRequest}"`)
  ];

  // Agentic loop: model calls tools until it has enough info
  let continueLoop = true;
  let iterations = 0;
  const maxIterations = 3; // Reduced from 5 to 3 to limit API calls

  while (continueLoop && iterations < maxIterations) {
    iterations++;
    
    const response = await modelWithTools.invoke(messages, {
      configurable: { canvasShapes: state.canvasSnapshot }
    });

    messages.push(response);

    // Check if model wants to use tools
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 Iteration ${iterations}: Model calling ${response.tool_calls.length} tool(s)`);
      
      // Execute tool calls
      const toolNode = new ToolNode(allTools);
      const toolResults = await toolNode.invoke({ 
        messages: [response] 
      }, {
        configurable: { canvasShapes: state.canvasSnapshot }
      });
      
      messages.push(...toolResults.messages);
      
    } else {
      // No more tool calls, model is done
      continueLoop = false;
      
      const content = response.content as string;
      
      // Extract final intent
      if (content.includes("FINAL_INTENT:")) {
        const parts = content.split("FINAL_INTENT:");
        if (parts[1]) {
          const intentJson = parts[1].trim();
          const jsonMatch = intentJson.match(/\{[\s\S]*?\}/);
          const intent = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          
          console.log("🎯 Complex intent:", intent);
          
          return {
            finalIntent: intent,
            messages: [new AIMessage(content)]
          };
        }
      }
      
      // Fallback: try to extract any JSON
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const intent = JSON.parse(jsonMatch[0]);
        console.log("🎯 Complex intent (fallback):", intent);
        return {
          finalIntent: intent,
          messages: [new AIMessage(content)]
        };
      }
    }
  }

  console.warn(" Complex handler exited without generating intent");
  return {
    finalIntent: { 
      intent: "error", 
      reply: "Could not generate intent after tool usage" 
    },
    messages: [new AIMessage("Operation too complex")]
  };
}


function routeByComplexity(state: typeof AgentState.State): string {
  return state.complexity === "simple" ? "simple_handler" : "complex_handler";
}


const workflow = new StateGraph(AgentState)
  .addNode("classifier", classifyRequest)
  .addNode("simple_handler", handleSimpleOperation)
  .addNode("complex_handler", handleComplexOperation)
  .addEdge(START, "classifier")
  .addConditionalEdges("classifier", routeByComplexity, {
    simple_handler: "simple_handler",
    complex_handler: "complex_handler"
  })
  .addEdge("simple_handler", END)
  .addEdge("complex_handler", END);

const graph = workflow.compile();


export async function runCanvasAgent(
  userRequest: string,
  canvasSnapshot: CanvasShape[] = []
) {
  try {
    console.log("\n=== CANVAS AGENT STARTING ===");
    console.log("Request:", userRequest);
    console.log("Canvas:", canvasSnapshot.length, "shapes");

    const result = await graph.invoke({
      userRequest,
      canvasSnapshot,
      messages: [],
      complexity: "simple",
      finalIntent: null
    });

    console.log("=== AGENT COMPLETE ===");
    console.log("Complexity:", result.complexity);
    console.log("Intent:", result.finalIntent);

    return {
      success: true,
      complexity: result.complexity,
      intent: result.finalIntent,
      reply: result.finalIntent?.reply || "Operation completed",
      usedTools: result.complexity === "complex"
    };

  } catch (error: unknown) {
    console.error("=== AGENT ERROR ===", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      intent: null,
      reply: "Error processing request"
    };
  }
}
