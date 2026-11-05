import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'

const spikeDir = path.resolve(import.meta.dir, '..')
const port = 4311
const baseUrl = `http://localhost:${port}`
let server: Bun.Subprocess | undefined
let serverExit: Promise<number> | undefined
let serverExitCode: number | undefined

function run(command: string[], extraEnv: Record<string, string> = {}): void {
  const result = Bun.spawnSync({
    cmd: command,
    cwd: spikeDir,
    env: { ...process.env, ...extraEnv },
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`${command.join(' ')} exited with code ${result.exitCode}`)
  }
}

async function assertHostPortIsFree(host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', (error) => {
      reject(new Error(`Required port ${port} on ${host} is unavailable`, { cause: error }))
    })
    probe.listen(port, host, () => {
      probe.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })
}

async function assertPortIsFree(): Promise<void> {
  await assertHostPortIsFree('127.0.0.1')
  await assertHostPortIsFree('::1')
}

async function waitForReadiness(): Promise<void> {
  const deadline = Date.now() + 30_000
  let lastError: unknown

  while (Date.now() < deadline) {
    const exited = await Promise.race([
      fetch(`${baseUrl}/server`, { signal: AbortSignal.timeout(1_000) })
        .then(async (response) => {
          const html = await response.text()
          const hasServerMarker = html.includes('<h1>M0_SERVER_RENDERED</h1>')
          if (response.status === 200 && hasServerMarker) return 'ready' as const
          lastError = new Error(
            `Readiness returned HTTP ${response.status}; SSR marker present: ${hasServerMarker}`,
          )
          return 'retry' as const
        })
        .catch((error: unknown) => {
          lastError = error
          return 'retry' as const
        }),
      serverExit?.then(() => 'exited' as const) ?? new Promise<'retry'>(() => {}),
    ])

    if (exited === 'ready') return
    if (exited === 'exited') {
      throw new Error(`Production server exited before readiness with code ${await serverExit}`)
    }

    await Bun.sleep(250)
  }

  throw new Error('Timed out waiting for the production server', { cause: lastError })
}

async function waitForServerExit(timeoutMs: number): Promise<number | undefined> {
  if (serverExitCode !== undefined) return serverExitCode
  if (!serverExit) return undefined
  return Promise.race([serverExit, Bun.sleep(timeoutMs).then(() => undefined)])
}

async function stopServer(): Promise<void> {
  if (!server || serverExitCode !== undefined) return

  let cleanupError: unknown
  if (process.platform === 'win32') {
    const result = Bun.spawnSync({
      cmd: ['taskkill', '/PID', String(server.pid), '/T', '/F'],
      stdout: 'inherit',
      stderr: 'inherit',
    })
    if (result.exitCode !== 0) {
      cleanupError = new Error(`taskkill exited with code ${result.exitCode}`)
    }
  } else {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch (error) {
      cleanupError = error
    }
  }

  let exitCode = await waitForServerExit(cleanupError ? 1_000 : 5_000)
  if (exitCode === undefined && process.platform !== 'win32' && !cleanupError) {
    process.kill(-server.pid, 'SIGKILL')
    exitCode = await waitForServerExit(5_000)
  }

  if (exitCode === undefined) {
    throw new Error('Failed to stop the complete production server process tree', {
      cause: cleanupError,
    })
  }
}

try {
  await assertPortIsFree()
  run(['bun', 'run', 'typecheck'])
  run(['bun', 'run', 'build'])

  const outputEntry = path.join(spikeDir, '.output', 'server', 'index.mjs')
  if (!existsSync(outputEntry)) {
    throw new Error(`Missing Bun production server output: ${outputEntry}`)
  }

  server = Bun.spawn({
    cmd: ['bun', outputEntry],
    cwd: spikeDir,
    env: { ...process.env, HOST: 'localhost', PORT: String(port) },
    detached: process.platform !== 'win32',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  serverExit = server.exited.then((code) => {
    serverExitCode = code
    return code
  })

  await waitForReadiness()
  run(
    ['bun', 'test', 'tests/acceptance.test.ts', 'tests/ssr.test.ts', 'tests/browser.test.ts'],
    { M0_BASE_URL: baseUrl },
  )
} catch (error) {
  process.exitCode = 1
  console.error(error)
} finally {
  try {
    await stopServer()
  } catch (error) {
    process.exitCode = 1
    console.error(error)
  }
}
