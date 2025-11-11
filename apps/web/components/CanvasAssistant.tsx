"use client"

import React, { useEffect, useRef, useState } from 'react'
import AI_Input from './ai-inputbox'
import useChatApi from '../hooks/useChatApi'

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}


export default function CanvasAssistant({
  className = 'w-[480px] border-l-2 border-slate-200 flex flex-col bg-white text-slate-800 shadow-sm',
  editor,
}: {
  className?: string
  editor?: React.RefObject<any>
}) {
  const [messages, setMessages] = useState<{ id: number; text: string; from: 'user' | 'bot' }[]>([
    { id: 1, text: 'Hello — I am your canvas assistant. Ask me to create shapes or describe a scene.', from: 'bot' },
  ])
  const [text, setText] = useState('')
  const idRef = useRef(2)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const { sendMessage } = useChatApi()

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const next = { id: idRef.current++, text: trimmed, from: 'user' as const }
    setMessages((s) => [...s, next])
    setText('')

    try {
      const data = await sendMessage(trimmed)
      const reply = data?.reply ?? ''
      setMessages((s) => [...s, { id: idRef.current++, text: reply, from: 'bot' }])

      const shapes = data?.shapes ?? []
      if (shapes?.length && editor?.current) {
        try {
          editor.current.run(() => {
            const toCreate = shapes.map((s: any) => {
              if (s.type === 'geo') {
                return { type: 'geo', x: s.x ?? 100, y: s.y ?? 100, props: s.props ?? {} }
              }
              if (s.type === 'text') {
                return { type: 'text', x: s.x ?? 100, y: s.y ?? 100, props: { text: s.props?.text ?? s.props?.text ?? '', font: s.props?.font ?? 'draw' } }
              }
              if (s.type === 'arrow') {
                // represent arrow using TLArrow or geo arrow; use type 'arrow' and props from agent
                return { type: 'arrow', x: s.x ?? 100, y: s.y ?? 100, props: s.props ?? {} }
              }
              // fallback: create a geo rectangle
              return { type: 'geo', x: s.x ?? 100, y: s.y ?? 100, props: s.props ?? { w: 100, h: 100, geo: 'rectangle' } }
            })
            // createShapes expects an array of shapes
            try {
              editor.current.createShapes(toCreate)
            } catch (err) {
              // fallback to createShape per item
                        console.error('Error creating shapes on editor', err)

              toCreate.forEach((shape: any) => editor.current.createShape(shape))
            }
          })
        } catch (err) {
          console.error('Error creating shapes on editor', err)
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessages((s) => [...s, { id: idRef.current++, text: `Error: ${errMsg}`, from: 'bot' }])
    }
  }


  return (
    <aside className={className}>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700">Canvas Assistant</div>

      <div ref={listRef} className="p-4 overflow-y-auto flex-1 bg-white">
        {messages.map((m) => (
          <div key={m.id} className={cn('mb-3 flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
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

     <AI_Input
        value={text}
        onChange={setText}
        onSubmit={handleSend}
      />
    </aside>
  )
}
