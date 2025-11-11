import * as z from "zod"
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { Pinecone } from "@pinecone-database/pinecone"
import { PineconeStore } from "@langchain/pinecone"


export type ChunkMetadata = { source?: string; docId?: string; chunkIndex?: number; [k: string]: unknown }
export type Document = { pageContent: string; metadata: ChunkMetadata }

export const retrieveSchema = z.object({ query: z.string(), k: z.number().optional() })

const apiKey = process.env.GOOGLE_API_KEY 
export const embeddings = new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004",apiKey:  apiKey })

console.log("pinecone api key:",process.env.PINECONE_API_KEY);
export async function getPineconeStore(indexName = "tl-draw") {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY not set in environment")
  }
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" })
  const pineconeIndex = pinecone.index(indexName)
  const store = new PineconeStore(embeddings, { pineconeIndex })
  return store
}

export async function ingestChunksToPinecone({
  docId,
  chunks,
  indexName = "tl-draw",
}: {
  docId: string
  chunks: string[]
  indexName?: string
}) {
  if (!chunks || chunks.length === 0) return { docId, chunks: 0 }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" })
  const pineconeIndex = pinecone.index(indexName)
  const vectorStore = new PineconeStore(embeddings, { pineconeIndex })

  const documents = chunks.map((chunk, idx) => ({
    pageContent: chunk,
    metadata: { docId, chunkIndex: idx, text: chunk },
  }))
  await vectorStore.addDocuments(documents)

  return { docId, chunks: chunks.length, upserted: chunks.length }
}

export async function buildIndex() {

  try {
  const pages = ["https://tldraw.dev/docs/shapes", "https://tldraw.dev/docs/editor"]
    const docsToIngest: Document[] = []
    for (const url of pages) {
      try {
        const loader = new CheerioWebBaseLoader(url,{
  selector: "p",
})
        const loaded = await loader.load()
        for (const d of loaded) {
          docsToIngest.push({ pageContent: d.pageContent, metadata: { source: url, ...d.metadata } })
        }
      } catch (err) {
        console.warn("Failed to load", url, err)
      }
    }

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
    for (const d of docsToIngest) {
      const parts = await splitter.splitText(d.pageContent)
      const docId = `${d.metadata.source ?? "tldraw"}`
      await ingestChunksToPinecone({ docId, chunks: parts })
    }

    console.log("[webscraper] finished indexing to Pinecone")
    return { success: true }
  } catch (err) {
    console.error("[webscraper] buildIndex failed", err)
    return { success: false, error: String(err) }
  }
}

