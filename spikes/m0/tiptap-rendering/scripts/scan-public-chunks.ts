import { readFile } from 'node:fs/promises'
import path from 'node:path'

export interface ChunkArtifact {
  url: string
  filePath: string
  javascript: string
  sourceMap: { sources: string[] }
}

export interface ScannedChunk {
  url: string
  filePath: string
  mapPath: string
  sources: string[]
}

const forbiddenSourcePatterns = [
  /(^|\/)@tiptap\/[^/]+\//,
  /(^|\/)prosemirror-[^/]+\//,
]

const forbiddenJavaScriptMarkers = ['@tiptap/', 'prosemirror-']

export function assertChunkArtifactIsClean(artifact: ChunkArtifact): void {
  if (artifact.javascript.trim().length === 0) {
    throw new Error(`Emitted chunk ${artifact.filePath} is empty`)
  }

  const sources = artifact.sourceMap.sources
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(`Source map for ${artifact.filePath} has no sources`)
  }

  for (const source of sources) {
    const normalized = source.replaceAll('\\', '/')
    if (forbiddenSourcePatterns.some((pattern) => pattern.test(normalized))) {
      throw new Error(`Forbidden editor source ${JSON.stringify(source)} in ${artifact.filePath}`)
    }
  }

  for (const marker of forbiddenJavaScriptMarkers) {
    if (artifact.javascript.includes(marker)) {
      throw new Error(`Forbidden editor package marker ${JSON.stringify(marker)} in ${artifact.filePath}`)
    }
  }
}

async function loadChunkArtifact(url: string, publicDir: string): Promise<ScannedChunk & {
  javascript: string
  sourceMap: { sources: string[] }
}> {
  const pathname = decodeURIComponent(new URL(url).pathname)
  const publicRoot = path.resolve(publicDir)
  const filePath = path.resolve(publicRoot, `.${pathname}`)
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Chunk URL escapes the public output directory: ${url}`)
  }

  let javascript: string
  try {
    javascript = await readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(`Cannot read browser-loaded chunk ${filePath}`, { cause: error })
  }

  const mappingComment = javascript.match(/\/\/# sourceMappingURL=(\S+)/)
  const mapPath = mappingComment
    ? path.resolve(path.dirname(filePath), mappingComment[1])
    : `${filePath}.map`

  let sourceMap: { sources: string[] }
  try {
    sourceMap = JSON.parse(await readFile(mapPath, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read a valid source map for ${filePath} at ${mapPath}`, { cause: error })
  }

  return { url, filePath, mapPath, javascript, sourceMap, sources: sourceMap.sources }
}

export async function scanPublicChunks(urls: string[], publicDir: string): Promise<ScannedChunk[]> {
  if (urls.length === 0) {
    throw new Error('No browser-loaded JavaScript chunks were recorded')
  }

  const scanned: ScannedChunk[] = []
  for (const url of [...new Set(urls)].sort()) {
    const artifact = await loadChunkArtifact(url, publicDir)
    assertChunkArtifactIsClean(artifact)
    scanned.push({
      url: artifact.url,
      filePath: artifact.filePath,
      mapPath: artifact.mapPath,
      sources: artifact.sourceMap.sources,
    })
  }
  return scanned
}
