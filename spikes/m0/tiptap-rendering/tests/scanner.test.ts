import { expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assertChunkArtifactIsClean, scanPublicChunks } from '../scripts/scan-public-chunks'

const cleanArtifact = {
  url: 'http://localhost:4341/assets/clean.js',
  filePath: 'clean.js',
  javascript: 'console.log("public content")',
  sourceMap: { sources: ['../../src/routes/post.tsx'] },
}

async function withTempPublicDir(run: (publicDir: string) => Promise<void>): Promise<void> {
  const publicDir = await mkdtemp(path.join(import.meta.dir, '.scanner-fixture-'))
  try {
    await run(publicDir)
  } finally {
    await rm(publicDir, { recursive: true, force: true })
  }
}

test('clean public chunk passes the same scanner used for browser artifacts', () => {
  expect(() => assertChunkArtifactIsClean(cleanArtifact)).not.toThrow()
})

test('scanner rejects a chunk containing Tiptap core source', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      sourceMap: { sources: ['../../node_modules/@tiptap/core/dist/index.js'] },
    }),
  ).toThrow('Forbidden editor source')
})

test('scanner rejects package-root Tiptap source paths', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      sourceMap: { sources: ['../../@tiptap/core/dist/index.js'] },
    }),
  ).toThrow('Forbidden editor source')
})

test('scanner rejects a chunk containing ProseMirror model source', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      sourceMap: { sources: ['../../node_modules/prosemirror-model/dist/index.js'] },
    }),
  ).toThrow('Forbidden editor source')
})

test('scanner rejects package-root ProseMirror source paths', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      sourceMap: { sources: ['prosemirror-model/dist/index.js'] },
    }),
  ).toThrow('Forbidden editor source')
})

test('scanner rejects explicit ProseMirror markers in emitted JavaScript', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      javascript: 'const leaked = "prosemirror-model"',
    }),
  ).toThrow('Forbidden editor package marker')
})

test('scanner rejects explicit Tiptap markers in emitted JavaScript', () => {
  expect(() =>
    assertChunkArtifactIsClean({
      ...cleanArtifact,
      javascript: 'const leaked = "@tiptap/core"',
    }),
  ).toThrow('Forbidden editor package marker')
})

test('scanner rejects empty emitted JavaScript', () => {
  expect(() => assertChunkArtifactIsClean({ ...cleanArtifact, javascript: '  \n' })).toThrow(
    'is empty',
  )
})

test('scanner fails instead of accepting an empty chunk list', async () => {
  await expect(scanPublicChunks([], 'unused')).rejects.toThrow(
    'No browser-loaded JavaScript chunks',
  )
})

test('scanner rejects an unreadable browser-loaded chunk', async () => {
  await withTempPublicDir(async (publicDir) => {
    await expect(
      scanPublicChunks(['http://localhost:4341/assets/missing.js'], publicDir),
    ).rejects.toThrow('Cannot read browser-loaded chunk')
  })
})

test('scanner rejects a chunk with a missing source map', async () => {
  await withTempPublicDir(async (publicDir) => {
    await mkdir(path.join(publicDir, 'assets'))
    await writeFile(path.join(publicDir, 'assets', 'clean.js'), cleanArtifact.javascript)

    await expect(
      scanPublicChunks(['http://localhost:4341/assets/clean.js'], publicDir),
    ).rejects.toThrow('Cannot read a valid source map')
  })
})
