"use client"
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { cn } from "../utils/cn";
import { EditorController } from '../langchain1/lib/editorcontroller';
import AI_Input from './ai-inputbox'
import type { Editor } from 'tldraw'

interface CanvasProps {
  editor?: React.RefObject<Editor | null>
}
interface DrawingMessage {
  id: number
  text: string
  from: 'user' | 'bot'
  timestamp: Date
}

interface DrawingResponse {
  success: boolean
  tldrawShapes?: Array<{
    id: string
    typeName?: string
    type: string
    x: number
    y: number
    props: Record<string, unknown>
    meta?: Record<string, unknown>
    isLocked?: boolean
    rotation?: number
    opacity?: number
  }>
  bindings?: Array<{
    id: string
    typeName: "binding"
    type: "arrow"
    fromId: string
    toId: string
    props: {
      terminal: "start" | "end"
      normalizedAnchor: { x: number; y: number }
      isExact: boolean
      isPrecise: boolean
    }
    meta: Record<string, unknown>
  }>
  reply?: string
  error?: string
  stats?: {
    primitiveCount: number
    shapeCount: number
    executionTime: number
  }
}

const Canvas = ({editor}: CanvasProps) => {
  
  const [messages, setMessages] = useState<DrawingMessage[]>([
    { 
      id: 1, 
      text: 'Hello! I\'m your drawing assistant. Describe what you want to draw.', 
      from: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const idRef = useRef(2)
  const lastRequestRef = useRef<string>('')
  const messageListRef = useRef<HTMLDivElement>(null)

  const editorController = useMemo(() => {
    return editor ? new EditorController(editor) : null
  }, [editor])

  const executeShapes = useCallback((shapes: DrawingResponse['tldrawShapes'], bindings?: DrawingResponse['bindings']): boolean => {
    if (!editorController || !shapes) {
      console.error('No editor or shapes')
      return false
    }

    try {
      editorController.deleteAll();

      const shapesToCreate = shapes.map(s => ({
        id: s.id.startsWith('shape:') ? s.id : `shape:${s.id}`,
        typeName: s.typeName || 'shape',
        type: s.type || 'geo',
        x: s.x ?? 100,
        y: s.y ?? 100,
        rotation: s.rotation ?? 0,
        opacity: s.opacity ?? 1,
        isLocked: s.isLocked ?? false,
        meta: s.meta || {},
        props: { ...s.props }
      }))

      if (bindings && bindings.length > 0) {
        editorController.createShapesWithBindings(shapesToCreate, bindings)
      } else {
        editorController.createShapes(shapesToCreate)
      }
      return true
    } catch (err) {
      console.error('Error executing shapes:', err)
      return false
    }
  }, [editorController]);


  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages])



  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!editorController) {
  console.error('Editor not ready')
  return
}

    const trimmed = inputText.trim()
    if (!trimmed || isLoading) return
    
    if (trimmed === lastRequestRef.current) {
      console.log('Please avoid repeating the same message')
      return
    }
    lastRequestRef.current = trimmed
    setIsLoading(true)

    const userMsg: DrawingMessage = {
      id: idRef.current++,
      text: trimmed,
      from: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')

    const botId = idRef.current++;

    const botMsg: DrawingMessage = {
      id: botId,
      text: '...',
      from: 'bot',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, botMsg])


    try {
      const canvasContext = editorController.getShapes();
      
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          canvasContext,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const statusMap: Record<string, string> = {
        started: 'Request received...',
        generating: 'Designing shapes...',
        validating: 'Checking connections between shapes...',
        rendering: 'Rendering final layout...',
        completed: 'Finished drawing',
        error: 'Generation error',
      };

      let bestReply = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            console.log(data.status);
            if (!data) continue;
            if (data.reply && data.reply.length > bestReply.length) {
              bestReply = data.reply;
            }

            const statusText = statusMap[data.status as string];
            let textToShow = statusText;
            
            if (data.status === 'error') {
              
              hasError = true;
              textToShow = data.error || data.reply || "An error occurred please Reload the page";
              break; 
            } else if (data.status === 'rendering' || data.status === 'completed') {
              textToShow = bestReply || "Drawing completed";
            }

            if (textToShow) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId ? { ...m, text: textToShow } : m)
              );
            }
            
            if (data.status === 'rendering' && data.shapes) {
              
              executeShapes(data.shapes, data.bindings);
            }
          } catch (e) {
            console.error('Error parsing stream line:', e);
          }
        }
      if(hasError) break;
      }

      if (!hasError) {
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, text: bestReply || 'Drawing completed' } : m))
        );
      }

    } catch (err) {
      console.error('Stream error:', err);
      const errMsg: DrawingMessage = {
        id: idRef.current++,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        from: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden fixed top-4 right-4 z-50 bg-sky-600 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 transition-colors"
          aria-label="Toggle assistant"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
            />
          </svg>
        </button>
      )}

      <aside className={cn(
        'w-full lg:w-[380px] border-l-2 border-slate-200 flex flex-col bg-white text-slate-800 shadow-sm',
        'fixed lg:relative h-[100dvh] top-0 right-0 z-40 transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-14  right-4 z-10 text-slate-500 hover:text-slate-700"
          aria-label="Close assistant"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>

        <div className="px-4 pt-14 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">Canvas Assistant</div>

        <div ref={messageListRef} className="p-4 overflow-y-auto flex-1 bg-white">
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
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-200 p-3 bg-white">
          <AI_Input
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSend}
            isOpen={isOpen}
          />
        </form>
      </aside>

      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default Canvas