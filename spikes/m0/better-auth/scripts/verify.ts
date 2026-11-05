import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'

const spikeDir = path.resolve(import.meta.dir, '..')
const appPort = 4314
const databasePort = 4315
const baseUrl = `http://localhost:${appPort}`
const databaseUrl = `postgres://postgres:m0_local_only@127.0.0.1:${databasePort}/m0_auth`
const containerName = `kelpo-m0-better-auth-${process.pid}`

type ManagedProcess = {
  name: string
  child: Bun.Subprocess
  exited: Promise<number>
  exitCode?: number
}

const managedProcesses: ManagedProcess[] = []
let ownsDatabaseContainer = false

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
  for (const port of [appPort, databasePort]) {
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

  throw new Error('Ports did not become reusable after resource cleanup', { cause: lastError })
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

function startDatabase(): void {
  run([
    'docker',
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--env',
    'POSTGRES_PASSWORD=m0_local_only',
    '--env',
    'POSTGRES_DB=m0_auth',
    '--publish',
    `127.0.0.1:${databasePort}:5432`,
    'postgres:16-alpine',
  ])
  ownsDatabaseContainer = true
}

async function waitForDatabase(): Promise<void> {
  const deadline = Date.now() + 60_000
  let lastExitCode: number | undefined

  while (Date.now() < deadline) {
    const result = Bun.spawnSync({
      cmd: ['docker', 'exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'm0_auth'],
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (result.exitCode === 0) return
    lastExitCode = result.exitCode
    await Bun.sleep(500)
  }

  throw new Error(`PostgreSQL did not become ready; last pg_isready exit code: ${lastExitCode}`)
}

function stopDatabase(): void {
  if (!ownsDatabaseContainer) return
  const result = Bun.spawnSync({
    cmd: ['docker', 'rm', '--force', containerName],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (result.exitCode !== 0) {
    throw new Error(`Database container cleanup exited with code ${result.exitCode}`)
  }
  ownsDatabaseContainer = false
}

try {
  await assertPortsAreFree()
  run(['bun', 'run', 'typecheck'])
  run(['bun', 'run', 'build'])

  for (const output of ['dist/index.html', 'dist/client.js']) {
    if (!existsSync(path.join(spikeDir, output))) {
      throw new Error(`Missing production browser output: ${output}`)
    }
  }

  startDatabase()
  await waitForDatabase()

  const app = spawnManaged('Elysia app', ['bun', 'src/server.ts'], {
    M0_APP_PORT: String(appPort),
    M0_BASE_URL: baseUrl,
    M0_DATABASE_URL: databaseUrl,
    M0_AUTH_SECRET: randomBytes(32).toString('hex'),
  })
  await waitForReadiness(app, `${baseUrl}/health`, 'M0_AUTH_READY')

  run(
    [
      'bun',
      'test',
      'tests/acceptance.test.ts',
      'tests/session.test.ts',
      'tests/passkey.test.ts',
    ],
    { M0_BASE_URL: baseUrl },
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
    stopDatabase()
  } catch (error) {
    process.exitCode = 1
    console.error(error)
  }

  try {
    await waitForPortsToBeFree()
  } catch (error) {
    process.exitCode = 1
    console.error('Port cleanup verification failed', error)
  }
}
