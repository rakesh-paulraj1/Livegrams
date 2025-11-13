import { IntentSchema, Intent } from "./lib/intentshemas";

// Return type for processed intents
export interface ProcessResult {
  ok: boolean;
  error?: string;
  details?: Record<string, unknown>;
  action?: string;
  shapes?: Array<{
    id?: string;
    type: string;
    x?: number;
    y?: number;
    props?: Record<string, unknown>;
  }>;
  id?: string;
  props?: Record<string, unknown>;
  ids?: string[];
  count?: number;
  requiresConfirmation?: boolean;
  message?: string;
  actions?: ProcessResult[];
  reply?: string;
}

// Server-side intent processor - validates and prepares execution instructions
export async function processIntent(raw: unknown): Promise<ProcessResult> {
  const parse = IntentSchema.safeParse(raw);
  if (!parse.success) {
    return { 
      ok: false, 
      error: "Invalid intent shape", 
      details: parse.error.format() 
    };
  }
  
  const intent = parse.data as Intent;

  try {
    switch (intent.intent) {
      case "create": {
        if (!intent.shapes || intent.shapes.length > 50) {
          return { ok: false, error: "Too many shapes (max 50)" };
        }
        
        // Prepare shapes with IDs for client execution
        // TLDraw requires shape IDs to start with "shape:"
        const shapesWithIds = intent.shapes.map((s) => {
          let shapeId = s.id ?? `shape:${Math.random().toString(36).slice(2, 9)}`;
          // Ensure ID starts with "shape:"
          if (!shapeId.startsWith("shape:")) {
            shapeId = `shape:${shapeId}`;
          }
          return {
            ...s,
            id: shapeId
          };
        });
        
        return { 
          ok: true, 
          action: "create", 
          shapes: shapesWithIds,
          count: shapesWithIds.length, 
          reply: intent.reply 
        };
      }

      case "edit": {
        if (!intent.id || !intent.props) {
          return { ok: false, error: "Edit requires id and props" };
        }
        // Ensure ID starts with "shape:"
        let shapeId = intent.id;
        if (!shapeId.startsWith("shape:")) {
          shapeId = `shape:${shapeId}`;
        }
        return { 
          ok: true, 
          action: "edit", 
          id: shapeId, 
          props: intent.props,
          reply: intent.reply 
        };
      }

      case "delete": {
        if (!intent.ids || intent.ids.length === 0) {
          return { ok: false, error: "Delete requires shape IDs" };
        }
        // Ensure all IDs start with "shape:"
        const shapeIds = intent.ids.map(id => 
          id.startsWith("shape:") ? id : `shape:${id}`
        );
        return { 
          ok: true, 
          action: "delete", 
          ids: shapeIds,
          count: shapeIds.length, 
          reply: intent.reply 
        };
      }

      case "delete_all": {
        return { 
          ok: true, 
          action: "delete_all", 
          requiresConfirmation: true, 
          message: "This will clear the entire canvas. Are you sure?",
          reply: intent.reply 
        };
      }

      case "batch": {
        if (!intent.actions || intent.actions.length === 0) {
          return { ok: false, error: "Batch requires actions array" };
        }
        
        // Process each action in the batch
        const processedActions = [];
        for (const action of intent.actions) {
          const result = await processIntent(action);
          if (result.ok) {
            processedActions.push(result);
          } else {
            return { ok: false, error: `Batch action failed: ${result.error}` };
          }
        }
        
        return { 
          ok: true, 
          action: "batch", 
          actions: processedActions,
          count: processedActions.length,
          reply: intent.reply 
        };
      }

      default:
        return { ok: false, error: "Unknown intent type" };
    }
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}