import { exec } from 'child_process'
import type { SnippetLanguage } from './store.js'

interface SandboxResult {
  output: string
  error: string | null
  timedOut: boolean
}

function escapeShell(code: string): string {
  return code.replace(/'/g, "'\\''")
}

function buildDockerCommand(code: string, language: SnippetLanguage): string {
  const escaped = escapeShell(code)
  if (language === 'javascript') {
    return `docker run --rm --network none -m 50m node:20-alpine node -e '${escaped}'`
  }
  return `docker run --rm --network none -m 50m python:3.12-alpine python -c '${escaped}'`
}

function buildFallbackCommand(code: string, language: SnippetLanguage): string {
  const escaped = escapeShell(code)
  if (language === 'javascript') {
    return `node -e '${escaped}'`
  }
  return `python -c '${escaped}'`
}

function execAsync(command: string, timeoutMs: number): Promise<SandboxResult> {
  return new Promise((resolve) => {
    exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const timedOut = error.killed || (error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
        resolve({
          output: stdout || '',
          error: stderr || error.message,
          timedOut,
        })
        return
      }
      resolve({
        output: stdout || '',
        error: stderr || null,
        timedOut: false,
      })
    })
  })
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms),
  )
}

export async function runInSandbox(
  code: string,
  language: SnippetLanguage,
): Promise<SandboxResult> {
  const timeoutMs = 10_000
  let command: string

  try {
    command = buildDockerCommand(code, language)
    const result = await Promise.race([
      execAsync(command, timeoutMs),
      timeoutPromise(timeoutMs),
    ])
    return result
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return { output: '', error: 'Execution timed out', timedOut: true }
    }
  }

  try {
    command = buildFallbackCommand(code, language)
    const result = await Promise.race([
      execAsync(command, timeoutMs),
      timeoutPromise(timeoutMs),
    ])
    return result
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return { output: '', error: 'Execution timed out', timedOut: true }
    }
  }

  return { output: '', error: 'Failed to execute code', timedOut: false }
}
