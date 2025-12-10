import { Annotation } from "@langchain/langgraph";
import { PrimitiveOutput } from "../lib/llm-prompt";
import { TLDrawShape, TLArrowBinding } from "../lib/renderer";

export interface TLDrawCanvasShape {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
}

export interface DrawingRequest {
  userRequest: string;
  canvasContext?: TLDrawCanvasShape[];
}

export interface DrawingResult {
  success: boolean;
  primitives?: unknown[];
  tldrawShapes?: TLDrawShape[];
  bindings?: TLArrowBinding[];
  reply?: string;
  error?: string;
}

export const Agentstate = Annotation.Root({
  userRequest: Annotation<string>,
  canvasContext: Annotation<TLDrawCanvasShape[] | undefined>,
  modeloutput: Annotation<PrimitiveOutput["items"]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  diagramtype: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "freeform",
  }),
  validationerrors: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  attempts: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  shapes: Annotation<TLDrawShape[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  bindings: Annotation<TLArrowBinding[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  reply: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

export type AgentStateType = typeof Agentstate.State;
