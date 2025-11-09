"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'
import CanvasAssistant from '../../components/CanvasAssistant'

export default function App() {
	const editorRef = useRef<any | null>(null)

	const handleMount = (editor: any) => {
		editorRef.current = editor

		editor.createShape({
			type: 'text',
			x: 200,
			y: 200,
			props: {
				richText: toRichText('Hello world!'),
			},
		})

		editor.selectAll()

		editor.zoomToSelection({
			animation: { duration: 5000 },
		})
	}

	// Chat state
	
	
	return (
		<div className="flex h-screen w-full">
		
			<div className="flex-1 min-w-0">
				<div className="h-full">
					<Tldraw onMount={handleMount} />
				</div>
			</div>

		
						<CanvasAssistant editor={editorRef} />
		</div>
	)
}