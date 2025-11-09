// Lightweight rule-based agent for parsing simple shape commands.
// Later this module can be replaced with an LLM-backed agent.

export type ParsedShape = {
  type: 'geo' | 'text' | 'arrow' | string
  x?: number
  y?: number
  props?: Record<string, any>
}

export function parseMessageToShapes(message: string): { reply: string; shapes: ParsedShape[] } {
  const lower = message.toLowerCase()
  const shapes: ParsedShape[] = []

  // Very small rule-based parsing. Examples supported:
  // "create a red rectangle at 100 100 size 200 100"
  // "add a blue circle at 200 200 radius 50"
  // "put text hello world at 300 300"

  // Rectangle
  const rectMatch = lower.match(/(create|add|put)\s+(?:a\s+)?(\w+)?\s*(rectangle|rect)\s*(?:at\s*)(\d+)\s*(\d+)\s*(?:size\s*(\d+)\s*(\d+))?/) 
  if (rectMatch) {
    const color = rectMatch[2] || 'black'
    const x = Number(rectMatch[4]) || 100
    const y = Number(rectMatch[5]) || 100
    const w = rectMatch[6] ? Number(rectMatch[6]) : 100
    const h = rectMatch[7] ? Number(rectMatch[7]) : 100
    shapes.push({
      type: 'geo',
      x,
      y,
      props: { w, h, geo: 'rectangle', color, fill: 'none' },
    })
  }

  // Circle / ellipse
  const circleMatch = lower.match(/(create|add|put)\s+(?:a\s+)?(\w+)?\s*(circle|ellipse)\s*(?:at\s*)(\d+)\s*(\d+)\s*(?:radius\s*(\d+))?/) 
  if (circleMatch) {
    const color = circleMatch[2] || 'black'
    const x = Number(circleMatch[4]) || 150
    const y = Number(circleMatch[5]) || 150
    const r = circleMatch[6] ? Number(circleMatch[6]) : 50
    // use geo ellipse with w/h = r*2
    shapes.push({
      type: 'geo',
      x,
      y,
      props: { w: r * 2, h: r * 2, geo: 'ellipse', color, fill: 'none' },
    })
  }

  // Text
  const textMatch = message.match(/(?:put|create|add)\s+text\s+"([^"]+)"\s*(?:at\s*(\d+)\s*(\d+))?/) || message.match(/(?:put|create|add)\s+text\s+([^@\n]+)\s*(?:at\s*(\d+)\s*(\d+))?/i)
  if (textMatch) {
    const text = textMatch[1].trim()
    const x = textMatch[2] ? Number(textMatch[2]) : 200
    const y = textMatch[3] ? Number(textMatch[3]) : 200
    shapes.push({
      type: 'text',
      x,
      y,
      props: { text, font: 'draw' },
    })
  }

  // Arrow (very simple)
  const arrowMatch = lower.match(/(create|add|put)\s+(?:an?\s+)?(arrow)\s*(?:from\s*(\d+)\s*(\d+)\s*to\s*(\d+)\s*(\d+))?/) 
  if (arrowMatch) {
    const fx = arrowMatch[3] ? Number(arrowMatch[3]) : 100
    const fy = arrowMatch[4] ? Number(arrowMatch[4]) : 100
    const tx = arrowMatch[5] ? Number(arrowMatch[5]) : fx + 100
    const ty = arrowMatch[6] ? Number(arrowMatch[6]) : fy
    // represent as arrow geo with props for points
    shapes.push({
      type: 'arrow',
      x: fx,
      y: fy,
      props: { from: { x: fx, y: fy }, to: { x: tx, y: ty }, color: 'black' },
    })
  }

  const reply = shapes.length
    ? `I created ${shapes.length} shape(s) for: "${message}"`
    : `I couldn't parse a shape command from: "${message}". Try: "create a red rectangle at 100 100 size 200 100" or "put text \"Hello\" at 200 200"`;

  return { reply, shapes }
}

export default { parseMessageToShapes }
