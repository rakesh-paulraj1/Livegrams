"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { CanvasShape } from "./lib/editorcontroller";
import { canvasTools } from "./tools/canvas-tools";
import { tldraw_docs_retrieve } from "./tools/retriver";


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
  model: "gemini-2.5-flash",
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
    { role: "user", content: `Request: "${state.userRequest}` }
  ]);

  const content = response.content as string;
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  const classification = jsonMatch ? JSON.parse(jsonMatch[0]) : { complexity: "simple" };

  console.log("Classification:", classification);

  return {
    complexity: classification.complexity,
    messages: [new AIMessage(content)]
  };
}


async function handleSimpleOperation(state: typeof AgentState.State) {
  const systemPrompt = `You are a canvas intent generator. You MUST respond with ONLY valid JSON, no other text.

**CRITICAL: Response Format**
- Output ONLY the JSON object
- No markdown code blocks
- No explanations before or after
- Valid JSON syntax with proper quotes and no trailing commas

Available intents:
- create: Add new shape(s)
- edit: Modify existing shape properties
- delete: Remove specific shape(s)
- delete_all: Clear entire canvas

**CRITICAL: Intent Structure**
All responses MUST use this exact structure:

CREATE Intent:
{
  "intent": "create",
  "shapes": [
    {"type": "geo", "x": 200, "y": 200, "props": {"geo": "rectangle", "w": 100, "h": 100, "color": "blue"}}
  ],
  "reply": "Created a blue rectangle"
}

EDIT Intent:
{
  "intent": "edit",
  "id": "shape:abc123",
  "props": {"x": 300, "color": "red"},
  "reply": "Moved and changed color"
}

DELETE Intent:
{
  "intent": "delete",
  "ids": ["shape:abc123", "shape:def456"],
  "reply": "Deleted 2 shapes"
}

DELETE_ALL Intent:
{
  "intent": "delete_all",
  "reply": "Cleared the canvas"
}

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

**REMEMBER:** Always use "intent" field with value "create", "edit", "delete", or "delete_all"`;

  const canvasSummary = state.canvasSnapshot.length > 0
    ? `Existing shapes: ${state.canvasSnapshot.map(s => `${s.id}(${s.type})`).join(", ")}`
    : "Empty canvas";

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: `${canvasSummary}\n\nUser: "${state.userRequest}"` }
  ]);

  const content = response.content as string;
  console.log("Simple handler response:", content);
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON found in response");
    return {
      finalIntent: { intent: "error", reply: "Could not parse response" },
      messages: [new AIMessage(content)]
    };
  }
  const jsonStr = jsonMatch[0]
    .replace(/,(\s*[}\]])/g, '$1')  
    .replace(/```json/g, '')        
    .replace(/```/g, '')            
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log("🔧 Cleaned JSON:", jsonStr);
  
  try {
    const intent = JSON.parse(jsonStr);
    console.log("✅ Simple intent:", intent);
    
    return {
      finalIntent: intent,
      messages: [new AIMessage(content)]
    };
  } catch (parseError) {
    console.error(" JSON parse error:", parseError);
    console.error("Raw content:", content);
    console.error(" Attempted to parse:", jsonStr);
    
    return {
      finalIntent: { intent: "error", reply: "Invalid JSON response" },
      messages: [new AIMessage(content)]
    };
  }
}


async function handleComplexOperation(state: typeof AgentState.State) {
  const systemPrompt = `You are an advanced canvas agent with access to tools. Use them to create complex layouts.

**CRITICAL: Final Response Format**
When you have all information, respond with:
FINAL_INTENT: {valid JSON object}

- The JSON must be valid with no trailing commas
- Use double quotes for all strings
- No markdown code blocks in the JSON itself

WORKFLOW FOR COMPLEX OPERATIONS:
1. Use get_canvas_state(detailed=true) to understand current canvas
2. Use analyze_layout for flowcharts/diagrams to get positioning
3. Use search_editor_docs if you need TLDraw-specific features
4. Use calculate_arrow_path to connect shapes
5. Generate final structured intent

**CRITICAL: Intent Structure for Complex Operations**
You MUST return a CREATE intent with ALL shapes in the shapes array:

{
  "intent": "create",
  "shapes": [
    {"type": "geo", "x": 200, "y": 100, "props": {"geo": "rectangle", "w": 140, "h": 70, "text": "Start"}},
    {"type": "geo", "x": 200, "y": 220, "props": {"geo": "rectangle", "w": 140, "h": 70, "text": "Process"}},
    {"type": "arrow", "props": {"start": {"x": 270, "y": 170}, "end": {"x": 270, "y": 220}}}
  ],
  "reply": "Created flowchart with 2 boxes and connector"
}

FLOWCHART EXAMPLE:
User: "create login flowchart"
1. Call analyze_layout(operation="flowchart", shapeCount=4)
2. Get positions: [{x:100,y:100}, {x:100,y:200}, ...]
3. Create nodes at those positions
4. Use calculate_arrow_path between consecutive nodes
5. Return CREATE intent with all shapes (boxes AND arrows) in the shapes array

When you have all information, respond with:
FINAL_INTENT: {"intent": "create", "shapes": [...], "reply": "..."}`;

  const messages: BaseMessage[] = [
    new AIMessage(systemPrompt),
    new AIMessage(`Canvas: ${state.canvasSnapshot.length} shapes\nRequest: "${state.userRequest}"`)
  ];

  let continueLoop = true;
  let iterations = 0;
  const maxIterations = 5;

  while (continueLoop && iterations < maxIterations) {
    iterations++;
    
    const response = await modelWithTools.invoke(messages, {
      configurable: { canvasShapes: state.canvasSnapshot }
    });

    messages.push(response);

 
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 Iteration ${iterations}: Model calling ${response.tool_calls.length} tool(s)`);
      
      const toolNode = new ToolNode(allTools);
      const toolResults = await toolNode.invoke({ 
        messages: [response] 
      }, {
        configurable: { canvasShapes: state.canvasSnapshot }
      });
      
      messages.push(...toolResults.messages);
      
    } else {
      continueLoop = false;
      
      const content = response.content as string;
      console.log("Complex handler response:", content);
      if (content.includes("FINAL_INTENT:")) {
        const parts = content.split("FINAL_INTENT:");
        if (parts[1]) {
          const intentJson = parts[1].trim();
          const jsonMatch = intentJson.match(/\{[\s\S]*\}/);
        
          if (jsonMatch) {
            const jsonStr = jsonMatch[0]
              .replace(/,(\s*[}\]])/g, '$1') 
              .replace(/```json/g, '')       
              .replace(/```/g, '')
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log("🔧 Cleaned JSON (FINAL_INTENT):", jsonStr);
            
            try {
              const intent = JSON.parse(jsonStr);
              console.log("🎯 Complex intent:", intent);
              
              return {
                finalIntent: intent,
                messages: [new AIMessage(content)]
              };
            } catch (parseError) {
              console.error("JSON parse error (FINAL_INTENT):", parseError);
              console.error("Attempted to parse:", jsonStr);
            }
          }
        }
      }
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log("🔧 Cleaned JSON (fallback):", jsonStr);
        
        try {
          const intent = JSON.parse(jsonStr);
          console.log("Complex intent (fallback):", intent);
          return {
            finalIntent: intent,
            messages: [new AIMessage(content)]
          };
        } catch (parseError) {
          console.error("❌ JSON parse error (fallback):", parseError);
          console.error("📄 Raw content:", content);
          console.error("🔍 Attempted to parse:", jsonStr);
        }
      }
    }
  }

  // Fallback if loop exits without intent
  console.warn("⚠️ Complex handler exited without generating intent");
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
