/**
 * Canvas API Route - Primitive-Based Drawing
 * 
 * POST /api/draw
 * 
 * Request:
 * {
 *   "message": "draw a bus",
 *   "canvasImage": "data:image/jpeg;base64,..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "primitives": [...],
 *   "tldrawShapes": [...],
 *   "reply": "Created 6 shapes...",
 *   "stats": { ... }
 * }
 */

import { NextResponse, NextRequest } from "next/server";
import { drawWithPrimitives } from "../../../langchain1/agent";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const message = body?.message || "";
    const canvasImage = body?.canvasImage;

    if (!message.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Message is required" 
        },
        { status: 400 }
      );
    }

    console.log("📨 Draw API Request:", message);

    const result = await drawWithPrimitives({
      userRequest: message,
      canvasImage
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
