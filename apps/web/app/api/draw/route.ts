

import { NextResponse, NextRequest } from "next/server";
import { runPrimitiveAgent } from "../../../langchain1/agentt";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const message = body?.message || "";
    const canvasContext = body?.canvasContext;

    if (!message.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Message is required" 
        },
        { status: 400 }
      );
    }

    const result = await runPrimitiveAgent({
      userRequest: message,
      canvasContext,
    });

    console.log("Draw API Response:", result.success ? "SUCCESS" : "FAILED");

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
