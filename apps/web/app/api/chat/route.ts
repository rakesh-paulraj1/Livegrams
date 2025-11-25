import { NextResponse } from 'next/server'
// import { runCanvasAgent } from '../../../langchain/agent'
import { runCanvasAgent } from '../../../langchain/newagent'
import { processIntent } from '../../../langchain/intentinterpretetr'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
        const body = await request.json()
        const message = body?.message || ''
        const canvasSnapshot = body?.canvasSnapshot || []
        const canvasImage = body?.canvasImage

        try {
                const agentResult = await runCanvasAgent(message, canvasSnapshot, canvasImage)
                console.log('Agent result:', agentResult)
                if (!agentResult.success || !agentResult.intent) {
                        return NextResponse.json({ 
                                success: false, 
                                error: agentResult.error || 'Agent failed to generate intent',
                                reply: agentResult.reply 
                        }, { status: 500 })
                }

               
                const execution = await processIntent(agentResult.intent)
                console.log('Processed execution:', execution)

                const response = {
                        success: true,
                        usedTools: agentResult.usedTools,
                        intent: agentResult.intent,
                        reply: agentResult.reply,
                        execution
                }
               
                return NextResponse.json(response)
        } catch (err) {
                console.error('Agent error:', err)
                return NextResponse.json({ 
                        success: false, 
                        error: String(err),
                        reply: 'Error processing your request'
                }, { status: 500 })
        }
}
