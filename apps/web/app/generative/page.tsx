"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Tldraw } from 'tldraw'

export default function GenerativePage() {
	const [messages, setMessages] = useState<{id: number; text: string; me?: boolean}[]>([
		{ id: 1, text: 'Welcome to the generative canvas chat!'},
	])
	const [text, setText] = useState('')
	const idRef = useRef(2)
	const listRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		// scroll to bottom when messages change
		const el = listRef.current
		if (el) el.scrollTop = el.scrollHeight
	}, [messages])

	function handleSend(e?: React.FormEvent) {
		if (e) e.preventDefault()
		const trimmed = text.trim()
		if (!trimmed) return
		const next = { id: idRef.current++, text: trimmed, me: true }
		setMessages((s) => [...s, next])
		setText('')
		// placeholder: could send message to server or AI here
	}

	return (
		<div style={{ display: 'flex', height: '100vh', width: '100%' }}>
			{/* Left: Canvas (flexible) */}
			<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1 }}>
					<Tldraw />
				</div>
			</div>

			{/* Right: Chat panel */}
			<div
				style={{
					width: 360,
					borderLeft: '1px solid #e6e6e6',
					display: 'flex',
					flexDirection: 'column',
					background: '#ffffff',
				}}
			>
				<div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>
					Chat
				</div>

				<div ref={listRef} style={{ padding: 12, overflowY: 'auto', flex: 1, background: '#fafafa' }}>
					{messages.map((m) => (
						<div
							key={m.id}
							style={{
								marginBottom: 10,
								display: 'flex',
								justifyContent: m.me ? 'flex-end' : 'flex-start',
							}}
						>
							<div
								style={{
									maxWidth: '80%',
									padding: '8px 12px',
									borderRadius: 8,
									background: m.me ? '#0ea5a4' : '#e5e7eb',
									color: m.me ? 'white' : 'black',
								}}
							>
								{m.text}
							</div>
						</div>
					))}
				</div>

				<form
					onSubmit={handleSend}
					style={{ padding: 12, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}
				>
					<input
						aria-label="Message"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Type a message..."
						style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
					/>
					<button
						type="submit"
						style={{ padding: '8px 12px', borderRadius: 8, background: '#06b6d4', color: 'white', border: 'none' }}
					>
						Send
					</button>
				</form>
			</div>
		</div>
	)
}