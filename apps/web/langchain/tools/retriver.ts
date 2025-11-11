import { tool } from "@langchain/core/tools"
import { getPineconeStore, retrieveSchema, type ChunkMetadata } from "./webscraper"

export const tldraw_docs_retrieve = tool(
  async ({ query, k = 4 }: { query: string; k?: number }) => {
    try {
      const store = await getPineconeStore()
      const results = await store.similaritySearch(query, k) as Array<{ pageContent: string; metadata?: ChunkMetadata }>
      const serialized = results
        .map((r, i) => `Source: ${r.metadata?.docId ?? r.metadata?.source ?? "<unknown>"} | chunk: ${r.metadata?.chunkIndex ?? i}\n${r.pageContent}`)
        .join('\n\n---\n\n')
      return { content: serialized, artifacts: results }
    } catch (err) {
      console.error("tldraw_docs_retrieve error", err)
      return { content: "", artifacts: [] }
    }
  },
  {
    name: "tldraw_docs_retrieve",
    description: "Return relevant tldraw docs chunks for a query (shapes/editor).",
    schema: retrieveSchema,
    responseFormat: "content_and_artifact",
  }
)
