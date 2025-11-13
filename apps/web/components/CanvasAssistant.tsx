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
    return editor ? new EditorController(editor) : null
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
    if (!editorController) return false
    
    try {
      const shapesToCreate = shapes.map(s => ({
        id: s.id || `${s.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: s.type || 'geo',
        x: s.x ?? 100,
        y: s.y ?? 100,
        props: s.props ?? {}
      }))


      shapesToCreate.forEach(shape => {
        if (shape.type === 'geo' && !shape.props.geo) {
          shape.props = { w: 100, h: 100, geo: 'rectangle', ...shape.props }
        }
        if (shape.type === 'text' && shape.props.text && !shape.props.richText) {
          shape.props.richText = toRichText(String(shape.props.text))
          delete shape.props.text
        }
      })

      editorController.createShapes(shapesToCreate)
      return true
    } catch (err) {
      console.error('Error executing shapes:', err)
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
          console.log('Executing server-processed instructions:', data.execution)
          
          if (!data.execution.ok) {
            console.error('❌ Server processing failed:', data.execution.error)
            setMessages((s) => [...s, { 
              id: idRef.current++, 
              text: `Error: ${data.execution.error}`, 
              from: 'bot' 
            }])
            return
          }
          
          switch (data.execution.action) {
            case 'create':
              if (data.execution.shapes?.length) {
                const success = executeShapes(data.execution.shapes)
                if (success) {
                  console.log(`✅ Created ${data.execution.shapes.length} shapes from server instructions`)
                }
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
