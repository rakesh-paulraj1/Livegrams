import { NextResponse } from 'next/server'
import { runagent } from '../../../langchain/agent'
export async function POST(request: Request) {
        const body = await request.json()
        const message = body?.message || ''

        try {
                const answer = await runagent(message)
                console.log('agent answer', answer)

                // Normalize structured response: some agents return JSON strings for
                // fields like `shapes`. Parse if necessary so the client always gets
                // shapes as an array.
                        // cast to `any` for flexible parsing of different agent shapes
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const a: any = answer
                        const structured = a?.structuredResponse ?? a?.structured_response ?? a

                        let reply: string | undefined
                        let shapes: unknown[] = []

                        if (structured) {
                            reply = structured.reply ?? structured.reply_text

                            const rawShapes = structured.shapes ?? structured?.structured?.shapes
                            if (rawShapes) {
                                if (typeof rawShapes === 'string') {
                                    try {
                                        shapes = JSON.parse(rawShapes)
                                    } catch {
                                        // fall back to returning the raw string wrapped in an array
                                        shapes = [rawShapes]
                                    }
                                } else {
                                    shapes = rawShapes
                                }
                            }
                        }

                        if (!reply) reply = a?.output_text ?? a?.text ?? ''

                return NextResponse.json({ reply, shapes })
        } catch (err) {
                console.error('agent error', err)
                return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
        }
}
