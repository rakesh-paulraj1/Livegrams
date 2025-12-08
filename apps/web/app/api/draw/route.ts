

import { NextResponse, NextRequest } from "next/server";
import { runLayoutAgent } from "../../../langchain1/graph/layout-agent";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const message = body?.message || "";
    const canvasImage = body?.canvasImage;
    const existingLayout = body?.existingLayout;
    const useValidation = body?.useValidation !== false; // Default to true

    if (!message.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Message is required" 
        },
        { status: 400 }
      );
    }

    // Use new Layout Agent (no node-canvas!)
    const result = await runLayoutAgent({
      userRequest: message,
      canvasImage,
      existingLayout,
      maxAttempts: useValidation ? 3 : 1,
    });

    console.log("Draw API Response:", result.success ? "SUCCESS" : "FAILED");
    if (result.stats) {
      console.log(`Stats: ${result.stats.attempts} attempts, valid: ${result.stats.isValid}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Draw API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
