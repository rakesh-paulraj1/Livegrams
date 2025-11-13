"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import AI_Input from './ai-inputbox'
import useChatApi from '../hooks/useChatApi'
import { toRichText } from 'tldraw'
import { EditorController, CanvasShape } from '../langchain/lib/editorcontroller'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}



export default function CanvasAssistant({
  className = 'w-[480px] border-l-2 border-slate-200 flex flex-col bg-white text-slate-800 shadow-sm',
  editor,
}: {
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor?: React.RefObject<any>
}) {
  const editorController = useMemo(() => {
    console.log('🔧 Initializing EditorController, editor ref:', editor)
    const controller = editor ? new EditorController(editor) : null
    console.log('🔧 EditorController created:', controller ? 'YES' : 'NO')
    return controller
  }, [editor])
  const [messages, setMessages] = useState<{ id: number; text: string; from: 'user' | 'bot'; complexity?: 'simple' | 'complex'; usedTools?: boolean }[]>([
    { id: 1, text: 'Hello — I am your canvas assistant. Ask me to create shapes or describe a scene.', from: 'bot' },
  ])
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const idRef = useRef(2)
  const listRef = useRef<HTMLDivElement | null>(null)
  const lastRequestRef = useRef<string>('')

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const { sendMessage, loading } = useChatApi()

    const getCanvasSnapshot = (): CanvasShape[] => {
    if (!editorController) return []
    try {
      const shapes = editorController.getShapes()
      // Limit to first 10 shapes and only essential properties to reduce payload size
      return shapes.slice(0, 10).map(shape => ({
        id: shape.id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        props: {
          // Only include essential props
          geo: shape.props?.geo,
          color: shape.props?.color,
          w: shape.props?.w,
          h: shape.props?.h
        }
      }))
    } catch (err) {
      console.error('Error getting canvas snapshot:', err)
      return []
    }
  }

  const executeShapes = (shapes: CanvasShape[]) => {
    if (!editorController) {
      console.error('❌ No editorController available')
      return false
    }
    
    try {
      console.log('🎨 Executing shapes:', shapes)
      
      const shapesToCreate = shapes.map(s => {
        // Generate ID if missing
        const shapeId = s.id || `shape:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Ensure ID starts with "shape:"
        const finalId = shapeId.startsWith('shape:') ? shapeId : `shape:${shapeId}`
        
        const shape = {
          id: finalId,
          type: s.type || 'geo',
          x: s.x ?? 100,
          y: s.y ?? 100,
          props: { ...s.props }
        }
        
        console.log('📦 Prepared shape:', shape)
        return shape
      })

      // Process props for specific shape types
      shapesToCreate.forEach(shape => {
        // For geo shapes, ensure required props
        if (shape.type === 'geo') {
          if (!shape.props.geo) {
            shape.props.geo = 'rectangle'
          }
          if (!shape.props.w) shape.props.w = 100
          if (!shape.props.h) shape.props.h = 100
          if (!shape.props.color) shape.props.color = 'black'
          
          // Handle text in geo shapes
          if (shape.props.text && !shape.props.richText) {
            shape.props.richText = toRichText(String(shape.props.text))
            delete shape.props.text
          }
        }
        
        // For text shapes
        if (shape.type === 'text') {
          if (shape.props.text && !shape.props.richText) {
            shape.props.richText = toRichText(String(shape.props.text))
            delete shape.props.text
          }
          if (!shape.props.size) shape.props.size = 'm'
          if (!shape.props.color) shape.props.color = 'black'
        }
        
        // For arrow shapes
        if (shape.type === 'arrow') {
          if (!shape.props.color) shape.props.color = 'black'
          // Arrows need start and end points
          if (!shape.props.start) {
            shape.props.start = { x: shape.x, y: shape.y }
          }
          if (!shape.props.end) {
            shape.props.end = { x: (shape.x || 0) + 100, y: (shape.y || 0) + 100 }
          }
        }
        
        console.log('✅ Final shape to create:', shape)
      })

      console.log('🚀 Creating shapes via EditorController:', shapesToCreate)
      editorController.createShapes(shapesToCreate)
      console.log('✅ Shapes created successfully')
      return true
    } catch (err) {
      console.error('❌ Error executing shapes:', err)
      console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace')
      return false
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    
    // Prevent duplicate requests
    if (isProcessing) {
      console.log('⏳ Request already in progress, ignoring duplicate')
      return
    }
    
    // Prevent sending same message twice in a row
    if (trimmed === lastRequestRef.current) {
      console.log('⚠️ Duplicate message detected, ignoring')
      return
    }
    
    lastRequestRef.current = trimmed
    setIsProcessing(true)
    
    const next = { id: idRef.current++, text: trimmed, from: 'user' as const }
    setMessages((s) => [...s, next])
    setText('')

    try {
      const canvasSnapshot = getCanvasSnapshot()
      console.log('📸 Canvas snapshot:', canvasSnapshot.length, 'shapes')

      const data = await sendMessage(trimmed, canvasSnapshot)
      const reply = data?.reply ?? ''
      
      // Add bot response with complexity info
      setMessages((s) => [...s, { 
        id: idRef.current++, 
        text: reply, 
        from: 'bot',
        complexity: data?.complexity,
        usedTools: data?.usedTools
      }])

      // Handle server-processed execution instructions
      if (data?.execution && editorController) {
        try {
          console.log('🔄 Executing server-processed instructions:', data.execution)
          
          if (!data.execution.ok) {
            console.error('❌ Server processing failed:', data.execution.error)
            setMessages((s) => [...s, { 
              id: idRef.current++, 
              text: `Error: ${data.execution.error}`, 
              from: 'bot' 
            }])
            return
          }
          
          console.log('✅ Execution action:', data.execution.action)
          console.log('📊 Execution data:', JSON.stringify(data.execution, null, 2))
          
          switch (data.execution.action) {
            case 'create':
              console.log('🎨 CREATE action detected')
              if (data.execution.shapes?.length) {
                console.log(`🔢 Number of shapes to create: ${data.execution.shapes.length}`)
                console.log('📋 Shapes:', data.execution.shapes)
                
                const success = executeShapes(data.execution.shapes)
                if (success) {
                  console.log(`✅ Successfully created ${data.execution.shapes.length} shapes`)
                } else {
                  console.error('❌ Failed to create shapes')
                  setMessages((s) => [...s, { 
                    id: idRef.current++, 
                    text: 'Failed to create shapes on canvas', 
                    from: 'bot' 
                  }])
                }
              } else {
                console.warn('⚠️ No shapes provided in create action')
              }
              break
              
            case 'edit':
              if (data.execution.id && data.execution.props) {
                try {
                  editorController.updateShape(data.execution.id, data.execution.props)
                  console.log(`✅ Updated shape ${data.execution.id} from server instructions`)
                } catch (err) {
                  console.error(`❌ Error updating shape ${data.execution.id}:`, err)
                }
              }
              break
              
            case 'delete':
              if (data.execution.ids?.length) {
                try {
                  editorController.deleteShapes(data.execution.ids)
                  console.log(`✅ Deleted ${data.execution.ids.length} shapes from server instructions`)
                } catch (err) {
                  console.error('❌ Error deleting shapes:', err)
                }
              }
              break
              
            case 'delete_all':
              if (data.execution.requiresConfirmation) {
                const confirmed = window.confirm(data.execution.message || 'Clear entire canvas?')
                if (confirmed) {
                  editorController.deleteAll()
                  console.log('✅ Cleared canvas after confirmation')
                  setMessages((s) => [...s, { 
                    id: idRef.current++, 
                    text: 'Canvas cleared', 
                    from: 'bot' 
                  }])
                } else {
                  console.log('❌ Canvas clear cancelled by user')
                  setMessages((s) => [...s, { 
                    id: idRef.current++, 
                    text: 'Canvas clear cancelled', 
                    from: 'bot' 
                  }])
                }
              }
              break
              
            case 'batch':
              if (data.execution.actions?.length) {
                console.log(`🔄 Processing batch with ${data.execution.actions.length} actions`)
                // Process each action in the batch
                for (const action of data.execution.actions) {
                  // This is a simplified approach - in production you'd want proper batch handling
                  console.log('🔄 Batch action:', action.action)
                }
              }
              break
              
            default:
              console.log('ℹ️ Server action processed:', data.execution.action)
          }
          
        } catch (err) {
          console.error('❌ Error executing server instructions:', err)
        }
      }
      
   
      else if (data?.shapes?.length || data?.action || data?.intent) {
        console.error(' No EditorController available for shape operations')
        setMessages((s) => [...s, { 
          id: idRef.current++, 
          text: 'Error: Canvas editor not available', 
          from: 'bot' 
        }])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessages((s) => [...s, { id: idRef.current++, text: `Error: ${errMsg}`, from: 'bot' }])
    } finally {
      setIsProcessing(false)
    }
  }


  return (
    <aside className={className}>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">Canvas Assistant</div>

      <div ref={listRef} className="p-4 overflow-y-auto flex-1 bg-white">
        {messages.map((m) => (
          <div key={m.id} className={cn('mb-3 flex flex-col', m.from === 'user' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                m.from === 'user' ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-900 border border-slate-100',
                'max-w-[80%] py-2 px-3 rounded-lg'
              )}
            >
              {m.text}
            </div>
            {m.from === 'bot' && m.complexity && (
              <div className="mt-1 text-xs flex items-center gap-2">
                <span className={cn(
                  'px-2 py-0.5 rounded-full font-medium',
                  m.complexity === 'simple' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                )}>
                  {m.complexity}
                </span>
                {m.usedTools && (
                  <span className="text-slate-500">🔧 tools used</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

     <AI_Input
        value={text}
        onChange={setText}
        onSubmit={handleSend}
      />
      
      {(loading || isProcessing) && (
        <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t">
          ⏳ Processing your request...
        </div>
      )}
    </aside>
  )
}
