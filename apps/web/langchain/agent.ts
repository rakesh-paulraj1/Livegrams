"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CanvasShape } from "./lib/editorcontroller";

// ============ MODEL SETUP ============

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
});

// ============ INTENT GENERATOR ============

async function generateIntent(userRequest: string, canvasSnapshot: CanvasShape[]) {
  const systemPrompt = `You are a canvas intent generator. You MUST respond with ONLY valid JSON, no other text.

**CRITICAL: Response Format**
- Output ONLY the JSON object
- No markdown code blocks
- No explanations before or after
- Valid JSON syntax with proper quotes and commas

**SUPPORTED OPERATIONS:**

1. CREATE shapes:
   - Intent: "create"
   - Shapes: Array of shape objects
   
2. EDIT shapes:
   - Intent: "edit"
   - id: Shape ID to edit
   - props: Properties to update
   
3. DELETE shapes:
   - Intent: "delete"
   - ids: Array of shape IDs
   
4. DELETE ALL:
   - Intent: "delete_all"

**SHAPE TYPES:**

1. **geo** (Geometric shapes):
   {
     "type": "geo",
     "x": 200,
     "y": 200,
     "props": {
       "geo": "rectangle" | "ellipse" | "triangle" | "diamond",
       "w": 100,
       "h": 100,
       "color": "black" | "blue" | "red" | "green" | "yellow"
     }
   }

2. **text** (Text boxes):
   {
     "type": "text",
     "x": 200,
     "y": 200,
     "props": {
       "text": "Your text here",
       "size": "s" | "m" | "l" | "xl",
       "color": "black"
     }
   }

3. **arrow** (Connecting lines):
   {
     "type": "arrow",
     "props": {
       "start": { "x": 100, "y": 100 },
       "end": { "x": 300, "y": 300 },
       "color": "black"
     }
   }

**POSITIONING DEFAULTS:**
- First shape: x=200, y=200
- Additional shapes: offset by 150px to right or down

**SHAPE IDs:**
- You don't need to provide IDs when creating shapes (they'll be auto-generated)
- When referencing existing shapes for edit/delete, use their full ID from canvas snapshot

**EXAMPLES:**

User: "add a blue circle"
Response:
{
  "intent": "create",
  "shapes": [
    {
      "type": "geo",
      "x": 200,
      "y": 200,
      "props": {
        "geo": "ellipse",
        "w": 100,
        "h": 100,
        "color": "blue"
      }
    }
  ],
  "reply": "Added a blue circle"
}

User: "delete shape_abc123"
Response:
{
  "intent": "delete",
  "ids": ["shape_abc123"],
  "reply": "Deleted shape"
}

User: "clear everything"
Response:
{
  "intent": "delete_all",
  "reply": "Cleared the canvas"
}

**REMEMBER:**
- Respond with ONLY the JSON object
- No markdown, no code blocks, no extra text
- Proper JSON syntax: use double quotes, no trailing commas
- For circles: use "geo": "ellipse" with equal width and height

**IMPORTANT:**
- Respond with ONLY valid JSON
- Include a "reply" field with a user-friendly message
- For circles, use geo="ellipse" with equal w and h
- Default dimensions are 100x100`;

  const canvasSummary = canvasSnapshot.length > 0
    ? `Current canvas has ${canvasSnapshot.length} shapes: ${canvasSnapshot.map(s => `${s.id}(${s.type})`).join(", ")}`
    : "Canvas is empty";

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`${canvasSummary}\n\nUser request: "${userRequest}"`)
  ]);

  const content = response.content as string;
  console.log("📝 Model response:", content);
  
  // Try to extract JSON - look for the most complete JSON object
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON intent from model response");
  }
  
  let jsonStr = jsonMatch[0];
  
  // Clean up common issues
  jsonStr = jsonStr
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
    .replace(/\n/g, ' ')             // Remove newlines
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim();
  
  console.log("🔧 Cleaned JSON:", jsonStr);
  
  try {
    const intent = JSON.parse(jsonStr);
    console.log("🎯 Generated intent:", intent);
    return intent;
  } catch (parseError) {
    console.error("❌ JSON parse error:", parseError);
    console.error("📄 Raw content:", content);
    console.error("🔍 Attempted to parse:", jsonStr);
    
    // Fallback: Try to fix common JSON issues
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const fallbackMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (fallbackMatch) {
        const fallbackJson = fallbackMatch[0]
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const intent = JSON.parse(fallbackJson);
        console.log("✅ Recovered with fallback:", intent);
        return intent;
      }
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
    }
    
    throw new Error(`Invalid JSON from model: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

// ============ MAIN EXPORT ============

export async function runCanvasAgent(
  userRequest: string,
  canvasSnapshot: CanvasShape[] = []
) {
  try {
    console.log("\n=== CANVAS AGENT STARTING ===");
    console.log("Request:", userRequest);
    console.log("Canvas:", canvasSnapshot.length, "shapes");

    const intent = await generateIntent(userRequest, canvasSnapshot);

    console.log("=== AGENT COMPLETE ===");
    console.log("Intent:", intent);

    return {
      success: true,
      complexity: "simple",
      intent: intent,
      reply: intent.reply || "Operation completed",
      usedTools: false
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
