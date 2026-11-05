import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'

const spikeDir = path.resolve(import.meta.dir, '..')
const webPort = 4312
const apiPort = 4313
const baseUrl = `http://localhost:${webPort}`
const apiUrl = `http://localhost:${apiPort}`
const webOrigin = baseUrl

type ManagedProcess = {
  name: string
  child: Bun.Subprocess
  exited: Promise<number>
  exitCode?: number
}

const managedProcesses: ManagedProcess[] = []

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

async function assertHostPortIsFree(host: string, port: number): Promise<void> {
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

async function assertPortsAreFree(): Promise<void> {
  for (const port of [webPort, apiPort]) {
    await assertHostPortIsFree('127.0.0.1', port)
    await assertHostPortIsFree('::1', port)
  }
}

async function waitForPortsToBeFree(): Promise<void> {
  const deadline = Date.now() + 10_000
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      await assertPortsAreFree()
      return
    } catch (error) {
      lastError = error
      await Bun.sleep(100)
    }
  }

  throw new Error('Ports did not become reusable after process cleanup', { cause: lastError })
}

function spawnManaged(
  name: string,
  command: string[],
  extraEnv: Record<string, string>,
): ManagedProcess {
  const child = Bun.spawn({
    cmd: command,
    cwd: spikeDir,
    env: { ...process.env, ...extraEnv },
    detached: process.platform !== 'win32',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const managed: ManagedProcess = {
    name,
    child,
    exited: Promise.resolve(0),
  }
  managed.exited = child.exited.then((code) => {
    managed.exitCode = code
    return code
  })
  managedProcesses.push(managed)
  return managed
}

async function waitForReadiness(
  managed: ManagedProcess,
  url: string,
  requiredMarker: string,
): Promise<void> {
  const deadline = Date.now() + 30_000
  let lastError: unknown

  while (Date.now() < deadline) {
    const state = await Promise.race([
      fetch(url, { signal: AbortSignal.timeout(1_000) })
        .then(async (response) => {
          const body = await response.text()
          const markerPresent = body.includes(requiredMarker)
          if (response.status === 200 && markerPresent) return 'ready' as const
          lastError = new Error(
            `${managed.name} readiness returned HTTP ${response.status}; marker present: ${markerPresent}`,
          )
          return 'retry' as const
        })
        .catch((error: unknown) => {
          lastError = error
          return 'retry' as const
        }),
      managed.exited.then(() => 'exited' as const),
    ])

    if (state === 'ready') return
    if (state === 'exited') {
      throw new Error(`${managed.name} exited before readiness with code ${await managed.exited}`)
    }

    await Bun.sleep(250)
  }

  throw new Error(`Timed out waiting for ${managed.name}`, { cause: lastError })
}

async function waitForExit(managed: ManagedProcess, timeoutMs: number): Promise<number | undefined> {
  if (managed.exitCode !== undefined) return managed.exitCode
  return Promise.race([managed.exited, Bun.sleep(timeoutMs).then(() => undefined)])
}

async function stopManaged(managed: ManagedProcess): Promise<void> {
  if (managed.exitCode !== undefined) return

  let cleanupError: unknown
  if (process.platform === 'win32') {
    const result = Bun.spawnSync({
      cmd: ['taskkill', '/PID', String(managed.child.pid), '/T', '/F'],
      stdout: 'inherit',
      stderr: 'inherit',
    })
    if (result.exitCode !== 0) {
      cleanupError = new Error(`${managed.name} taskkill exited with code ${result.exitCode}`)
    }
  } else {
    try {
      process.kill(-managed.child.pid, 'SIGTERM')
    } catch (error) {
      cleanupError = error
    }
  }

  let exitCode = await waitForExit(managed, cleanupError ? 1_000 : 5_000)
  if (exitCode === undefined && process.platform !== 'win32' && !cleanupError) {
    process.kill(-managed.child.pid, 'SIGKILL')
    exitCode = await waitForExit(managed, 5_000)
  }

  if (exitCode === undefined) {
    throw new Error(`Failed to stop the complete ${managed.name} process tree`, {
      cause: cleanupError,
    })
  }
}

try {
  await assertPortsAreFree()
  run(['bun', 'run', 'typecheck'])
  run(['bun', 'run', 'build'], { VITE_M0_API_URL: apiUrl })

  const outputEntry = path.join(spikeDir, 'apps', 'web', '.output', 'server', 'index.mjs')
  if (!existsSync(outputEntry)) {
    throw new Error(`Missing Bun production server output: ${outputEntry}`)
  }

  const api = spawnManaged('API server', ['bun', 'apps/api/src/server.ts'], {
    M0_API_PORT: String(apiPort),
    M0_WEB_ORIGIN: webOrigin,
  })
  await waitForReadiness(api, `${apiUrl}/proof`, 'M0_EDEN_TYPED')

  const web = spawnManaged('web production server', ['bun', outputEntry], {
    HOST: 'localhost',
    PORT: String(webPort),
  })
  await waitForReadiness(web, `${baseUrl}/server`, '<h1>M0_EDEN_TYPED_SSR</h1>')

  run(
    [
      'bun',
      'test',
      'tests/acceptance.test.ts',
      'tests/api.test.ts',
      'tests/ssr.test.ts',
      'tests/browser.test.ts',
    ],
    { M0_BASE_URL: baseUrl, M0_API_URL: apiUrl },
  )
} catch (error) {
  process.exitCode = 1
  console.error(error)
} finally {
  for (const managed of [...managedProcesses].reverse()) {
    try {
      await stopManaged(managed)
    } catch (error) {
      process.exitCode = 1
      console.error(error)
    }
  }

  try {
    await waitForPortsToBeFree()
  } catch (error) {
    process.exitCode = 1
    console.error('Port cleanup verification failed', error)
  }
}
