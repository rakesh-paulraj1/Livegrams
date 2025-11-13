"use server"

import { runCanvasAgent } from "../../langchain/canvas-agent-complete";
import { CanvasShape } from "../../langchain/lib/editorcontroller";

export async function executeCanvasCommand(
  userMessage: string,
  currentShapes: CanvasShape[]
) {
  return await runCanvasAgent(userMessage, currentShapes);
}
