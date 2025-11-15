import { IntentSchema, Intent } from "./lib/intentshemas";

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
        
        const shapesWithIds = intent.shapes.map((s) => {
          let shapeId = s.id ?? `shape:${Math.random().toString(36).slice(2, 9)}`;
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
          reply: intent.reply 
        };
      }

      case "batch": {
        if (!intent.actions || intent.actions.length === 0) {
          return { ok: false, error: "Batch requires actions array" };
        }
        
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