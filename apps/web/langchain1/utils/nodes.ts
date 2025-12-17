

import { getGeminiModel } from "../lib/gemini";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PrimitiveOutputSchema } from "../lib/llm-prompt";
import { validatePrimitives, type DiagramType } from "../lib/primitive-validator";
import { Primitive } from "../lib/primitives";
import { renderPrimitives } from "../lib/renderer";
import { AgentStateType } from "./states";
import { RESPONSE_FORMAT_RULES,CORE_CONTENT_GENERATOR } from "../lib/llm-prompt";



const model = getGeminiModel();


const structuredModel = model.withStructuredOutput(PrimitiveOutputSchema);

export async function corenode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  console.log(`[Generate] Attempt ${state.attempts + 1}`);

  let promptText = state.userRequest;

  if (state.canvasContext && state.canvasContext.length > 0) {
    const limitedContext = state.canvasContext.slice(0, 20);
    promptText += `\n\nExisting shapes on canvas (avoid overlapping):\n${JSON.stringify(limitedContext)}`;
  }

  if (state.validationerrors.length > 0 && state.modeloutput.length > 0) {
    promptText += `
--- VALIDATION FEEDBACK ---
Your previous output had these issues:
${state.validationerrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Previous primitives:
${JSON.stringify(state.modeloutput, null, 2)}

Please fix these issues and regenerate.
`;
  }

  let MAIN_PROMPT=RESPONSE_FORMAT_RULES;
   

  if(state.attempts==0){
    MAIN_PROMPT+=CORE_CONTENT_GENERATOR;
  }


  const messages = [
    new SystemMessage(MAIN_PROMPT),
    new HumanMessage(promptText),
  ];

  try {
    const output = await structuredModel.invoke(messages);

    if (!output || !output.items || !Array.isArray(output.items)) {
      return {
        modeloutput: [],
        diagramtype: "freeform",
        attempts: state.attempts + 1,
        reply: "Failed to generate valid shapes. Please try again.",
      };
    }

    return {
      modeloutput: output.items,
      diagramtype: output.diagramType || "freeform",
      attempts: state.attempts + 1,
      reply: output.description || `Created ${output.items.length} shapes`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    const errorStack = error instanceof Error && error.stack ? error.stack : '';
    console.error("[Generate] LLM Error:", errorMsg, errorStack);
    const reply = `Error generating shapes. Please try a simpler request.\nDetails: ${errorMsg}`;

    return {
      modeloutput: [],
      diagramtype: "freeform",
      attempts: state.attempts + 1,
      reply,
    };
  }
}

export function validateNode(state: AgentStateType): Partial<AgentStateType> {
  console.log(`[Validate] Checking ${state.modeloutput.length} primitives`);

  const result = validatePrimitives(state.modeloutput as Primitive[], state.diagramtype as DiagramType);

  if (result.errors.length > 0) {
    console.log(`Found ${result.errors.length} errors`);
  } else {
    console.log(`Validation passed`);
  }

  return {
    validationerrors: result.errors,
  };
}

export function renderNode(state: AgentStateType): Partial<AgentStateType> {
  console.log(`[Render] Converting to TLDraw shapes`);

  const result = renderPrimitives(state.modeloutput as Primitive[]);

  return {
    shapes: result.shapes,
    bindings: result.bindings,
  };
}

export function shouldValidate(state: AgentStateType): "validate" | "render" {
  if (state.diagramtype === "freeform") {
    console.log(`[Route] Skip validation for freeform`);
    return "render";
  }

  console.log(`[Route] Validating structured diagram`);
  return "validate";
}

export function shouldRetry(state: AgentStateType): "generate" | "render" {
  const maxAttempts = 3;
  if (state.validationerrors.length === 0) {
    return "render";
  }
  if (state.attempts >= maxAttempts) {
    return "render";
  }
  return "generate";
}
