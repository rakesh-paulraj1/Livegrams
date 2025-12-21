import { StateGraph, START, END } from "@langchain/langgraph";
import { Agentstate, DrawingRequest, DrawingResult } from "./utils/states";
import {
  corenode,
  validateNode,
  renderNode,
  shouldValidate,
  shouldRetry,
} from "./utils/nodes";

const graph = new StateGraph(Agentstate)
  .addNode("generate", corenode)
  .addNode("validate", validateNode)
  .addNode("render", renderNode)
  .addEdge(START, "generate")
  .addConditionalEdges("generate", shouldValidate, {
    validate: "validate",
    render: "render",
    __end__: END,
  })
  .addConditionalEdges("validate", shouldRetry, {
    generate: "generate",
    render: "render",
  })
  .addEdge("render", END)
  .compile();

export async function runPrimitiveAgent(
  request: DrawingRequest
): Promise<DrawingResult> {
  const result = await graph.invoke({
    userRequest: request.userRequest,
    canvasContext: request.canvasContext,
  });

  return {
    success: true,
    primitives: result.modeloutput,
    tldrawShapes: result.shapes,
    bindings: result.bindings,
    reply: result.reply,
    status: result.status,
  };
}

export async function* streamPrimitiveAgent(request: DrawingRequest) {
  const stream = await graph.stream(
    {
      userRequest: request.userRequest,
      canvasContext: request.canvasContext,
    },
    { streamMode: "updates" }
  );

  for await (const update of stream) {
    yield Object.values(update)[0];
  }

  yield { status: "completed" };
}

export type { DrawingRequest, DrawingResult } from "./utils/states";
