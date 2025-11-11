import { buildIndex } from './webscraper.ts'

async function main() {
  try {
    console.log('[build-index] starting tldraw docs indexing')
    const res = await buildIndex()
    console.log('[build-index] result:', res)
    process.exit(0)
  } catch (err) {
    console.error('[build-index] failed', err)
    process.exit(1)
  }
}

main()
