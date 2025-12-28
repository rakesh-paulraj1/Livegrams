"use client"

import React, { useRef } from 'react'
import { Tldraw, toRichText,type Editor } from 'tldraw'

import 'tldraw/tldraw.css'
import Canvas from '../../components/Canvas'

export default function App() {
	const editorRef = useRef<Editor>(null)

	const handleMount = (editor: Editor) => {
		editorRef.current = editor
		editor.createShape({
			type: 'text',
			x: 200,
			y: 200,
			props: {
				richText: toRichText('Create Creative diagrams with AI agents'),
			},
		})

		editor.selectAll()

		editor.zoomToSelection({
			animation: { duration: 5000 },
		})
	}
	
	
	return (
		<div className="flex h-screen w-full">
		
			<div className="flex-1 min-w-0">
				<div className="h-full">
					<Tldraw licenseKey='tldraw-2026-04-06/WyJGbk0taGVfNSIsWyIqIl0sMTYsIjIwMjYtMDQtMDYiXQ.dCGj13tRgD8vtF5/oDcJ47JqhS/hy/BRmHeD2+UL1YNjBW62oDLEBzN7iP7pNQAZmny/oikDgmiActZspZ58VA
' onMount={handleMount}  />
				</div>
			</div>

		<Canvas editor={editorRef} />
				{/* <CanvasAssistant editor={editorRef} /> */}
			<div className="fixed bottom-10 left-4 z-60 text-sm text-gray-500 bg-white/80 px-3 py-1 rounded shadow">
				Created with <a href="https://tldraw.com" target="_blank" rel="noopener noreferrer" className="underline">tldraw</a>
			</div>
		</div>
	)
}