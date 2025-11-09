import { NextResponse } from 'next/server'
import { parseMessageToShapes } from '../../../langchain/agent'

export async function POST(request: Request) {
    const body = await request.json()
    const message = body?.message || ''

    // Use our lightweight agent to parse the message into shapes
    const { reply, shapes } = parseMessageToShapes(message)

    return NextResponse.json({ reply, shapes })
}
