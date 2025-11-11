"use server"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {tldraw_docs_retrieve} from "./tools/retriver";
import * as z from "zod";
import { createAgent } from "langchain";


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",

  apiKey: process.env.GEMINI_API_KEY!,
});



const tools = [tldraw_docs_retrieve];

const Response = z.object(
  reply: z.string(),
  shapes: z.string(),
});


const agent = createAgent({
  model: model,
  tools: tools,
  systemPrompt:  "You have access to a retriever tool that provides information about shapes and editors. " +
  "Use this tool to understand how to create shapes and diagrams in the canvas. " +
  "When responding, provide two parts: `reply` (textual explanation) and `shapes` (structured data for drawing).",
  responseFormat: Response,
});


export async function runagent(message: string) {
  return await agent.invoke({
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });
}