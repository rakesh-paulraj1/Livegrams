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
					<Tldraw onMount={handleMount} />
				</div>
			</div>

		<Canvas editor={editorRef} />
				{/* <CanvasAssistant editor={editorRef} /> */}
		</div>
	)
}