Persistence
In tldraw, persistence means storing information about the editor's state to a database and then restoring it later.

The simplest implementation is the browser's local storage. But this also provides the hooks for a sync engine, which can send realtime incremental updates of the canvas to your backend server, allowing multiple people to collaborate on the canvas.

The "persistenceKey" prop
Both the <Tldraw> or <TldrawEditor> components support local persistence and cross-tab synchronization via the persistenceKey prop. Passing a value to this prop will persist the contents of the editor locally to the browser's IndexedDb.

import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function () {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="my-persistence-key" />
		</div>
	)
}

Copy
Using a persistenceKey will synchronize data automatically with any other tldraw component with the same persistenceKey prop, even if that component is in a different browser tab.

import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function () {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<div style={{ width: '50%', height: '100%' }}>
				<Tldraw persistenceKey="my-persistence-key" />
			</div>
			<div style={{ width: '50%', height: '100%' }}>
				<Tldraw persistenceKey="my-persistence-key" />
			</div>
		</div>
	)
}

Copy
In the example above, both editors would synchronize their document locally. They would still have two independent instance states (e.g. selections) but the document would be kept in sync and persisted under the same key.

State Snapshots
You can get a JSON snapshot of the document content and the user 'session' state using the getSnapshot function.

function SaveButton({ documentId, userId }) {
	const editor = useEditor()
	return (
		<button
			onClick={() => {
				const { document, session } = getSnapshot(editor.store)
				// If you are building a multi-user app, you probably want to store
				// the document and session states separately because the
				// session state is user-specific and normally shouldn't be shared.
				await saveDocumentState(documentId, document)
				await saveSessionState(documentId, userId, session)
			}}
		>
			Save
		</button>
	)
}

Copy
To load the snapshot back into an existing editor, use the loadSnapshot function.

function LoadButton({ documentId, userId }) {
	const editor = useEditor()
	return (
		<button
			onClick={() => {
				const document = await loadDocumentState(documentId)
				const session = await loadSessionState(documentId, userId)
				editor.setCurrentTool('select') // need to reset tool state separately
				loadSnapshot(editor.store, { document, session })
			}}
		>
			Load
		</button>
	)
}

Copy
You can also pass a snapshot as a prop to set the initial editor state.

function MyApp({ userId, documentId }) {
	const [snapshot, setSnapshot] = useState(null)

	useEffect(() => {
		async function load() {
			const document = await getDocumentState(documentId)
			const session = await getSessionState(documentId, userId)
			setSnapshot({ document, session })
		}

		load()
	}, [documentId, userId])

	return snapshot ? <Tldraw snapshot={snapshot} /> : null
}

Copy
When tldraw loads a snapshot, it will run any necessary migrations to bring the data up to the latest tldraw schema version.

The "store" prop
While it's possible to load the editor and then load data into its store, we've found it best to create the store, set its data, and then pass the store into the editor.

The store property of the <Tldraw> / <TldrawEditor> components accepts a store that you've defined outside of the component.

export default function () {
	const [store] = useState(() => {
		// Create the store
		const newStore = createTLStore()

		// Get the snapshot
		const stringified = localStorage.getItem('my-editor-snapshot')
		const snapshot = JSON.parse(stringified)

		// Load the snapshot
		loadSnapshot(newStore, snapshot)

		return newStore
	})

	return <Tldraw persistenceKey="my-persistence-key" store={store} />
}

Copy
Sometimes you won't be able to access the store's data synchronously. To handle this case, the store property also accepts a TLStoreWithStatus.

export default function () {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
		status: 'loading',
	})

	useEffect(() => {
		let cancelled = false
		async function loadRemoteSnapshot() {
			// Get the snapshot
			const snapshot = await getRemoteSnapshot()
			if (cancelled) return

			// Create the store
			const newStore = createTLStore()

			// Load the snapshot
			loadSnapshot(newStore, snapshot)

			// Update the store with status
			setStoreWithStatus({
				store: newStore,
				status: 'ready',
			})
		}

		loadRemoteSnapshot()

		return () => {
			cancelled = true
		}
	})

	return <Tldraw persistenceKey="my-persistence-key" store={storeWithStatus} />
}

Copy
Listening for changes
You can listen for incremental updates to the document state by calling editor.store.listen, e.g.

const unlisten = editor.store.listen(
	(update) => {
		console.log('update', update)
	},
	{ scope: 'document', source: 'user' }
)

Copy
These updates contain information about which records were added, removed, and updated. See HistoryEntry

The scope filter can be used to listen for changes to a specific record scope, e.g. document, session, presence, or all.

The source filter can be used to listen for changes from a specific source, e.g. user, remote, or all. (See Store.mergeRemoteChanges for more information on remote changes.)

Note that these incremental updates do not include the schema version. You should make sure that you keep a record of the latest schema version for your snapshots.

You can get the schema version by calling editor.store.schema.serialize() and the returned value can replace the schema property in the snapshot next time you need to load a snapshot. The schema does not change at runtime so you only need to do this once per session.

Handling remote changes
If you need to synchronize changes from a remote source, e.g. a multiplayer backend, you can use the editor.store.mergeRemoteChanges method. This will 'tag' the changes with the source property as 'remote' so you can filter them out when listening for changes.

myRemoteSource.on('change', (changes) => {
	editor.store.mergeRemoteChanges(() => {
		changes.forEach((change) => {
			// Apply the changes to the store
			editor.store.put(/* ... */)
		})
	})
})

Copy
