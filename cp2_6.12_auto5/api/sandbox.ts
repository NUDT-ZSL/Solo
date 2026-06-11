import { exec } from 'child_process'
import type { SnippetLanguage } from './store.js'

interface SandboxResult {
  output: string
  error: string | null
  timedOut: boolean
}

interface ValidationResult {
  valid: boolean
  reason?: string
}

const MAX_CODE_LENGTH = 10 * 1024

const JS_DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /require\s*\(\s*['"]fs['"]\s*\)/,
  /require\s*\(\s*['"]net['"]\s*\)/,
  /require\s*\(\s*['"]http['"]\s*\)/,
  /require\s*\(\s*['"]https['"]\s*\)/,
  /import\s*\(\s*['"]child_process['"]\s*\)/,
  /import\s*\(\s*['"]fs['"]\s*\)/,
  /child_process/,
  /execSync/,
  /spawn\s*\(/,
  /execFile/,
  /process\.exit/,
  /process\.kill/,
  /process\.chdir/,
  /process\.cwd/,
  /__dirname/,
  /__filename/,
  /global\.process/,
  /Function\s*\(/,
]

const PY_DANGEROUS_PATTERNS = [
  /^\s*import\s+os\s*$/m,
  /^\s*import\s+subprocess\s*$/m,
  /^\s*from\s+os\s+import/m,
  /^\s*from\s+subprocess\s+import/m,
  /os\.system\s*\(/,
  /os\.popen\s*\(/,
  /os\.exec/,
  /os\.spawn/,
  /subprocess\.(run|Popen|call|check_output|check_call)\s*\(/,
  /open\s*\(\s*['"][^'"]*\.(txt|log|json|csv|py|sh|env|ini|cfg|conf)['"]/,
  /eval\s*\(\s*(.*__import__|exec|compile|open|input)/,
  /exec\s*\(/,
  /__import__\s*\(\s*['"](os|subprocess|sys|socket|ftplib|urllib)['"]/,
  /socket\.socket/,
  /import\s+socket/,
  /import\s+urllib/,
  /import\s+ftplib/,
]

function validateCode(code: string, language: SnippetLanguage): ValidationResult {
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, reason: `Code exceeds maximum length of ${MAX_CODE_LENGTH / 1024}KB` }
  }

  if (code.trim().length === 0) {
    return { valid: false, reason: 'Code is empty' }
  }

  const patterns = language === 'javascript' ? JS_DANGEROUS_PATTERNS : PY_DANGEROUS_PATTERNS

  for (const pattern of patterns) {
    if (pattern.test(code)) {
      return {
        valid: false,
        reason: `Code contains potentially dangerous pattern blocked for security: ${pattern.toString().slice(0, 50)}...`,
      }
    }
  }

  return { valid: true }
}

function escapeShellArg(code: string): string {
  if (process.platform === 'win32') {
    return '"' + code.replace(/"/g, '""') + '"'
  }
  return "'" + code.replace(/'/g, "'\\''") + "'"
}

function buildDockerCommand(code: string, language: SnippetLanguage): string {
  const escaped = escapeShellArg(code)
  if (language === 'javascript') {
    return `docker run --rm --network none --read-only -m 50m --pids-limit 32 --ulimit nproc=32 node:20-alpine node -e ${escaped}`
  }
  return `docker run --rm --network none --read-only -m 50m --pids-limit 32 --ulimit nproc=32 python:3.12-alpine python -c ${escaped}`
}

function buildFallbackCommand(code: string, language: SnippetLanguage): string {
  const escaped = escapeShellArg(code)
  if (language === 'javascript') {
    return `node -e ${escaped}`
  }
  return `python -c ${escaped}`
}

function execAsync(command: string, timeoutMs: number): Promise<SandboxResult> {
  return new Promise((resolve) => {
    try {
      exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          const timedOut = Boolean(
            error.killed ||
            (error as NodeJS.ErrnoException).code === 'ETIMEDOUT' ||
            (error.message && error.message.toLowerCase().includes('timed out'))
          )
          resolve({
            output: stdout || '',
            error: (stderr || error.message || 'Unknown execution error').toString(),
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
    } catch (err) {
      resolve({
        output: '',
        error: err instanceof Error ? err.message : 'Failed to start execution',
        timedOut: false,
      })
    }
  })
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms),
  )
}

function isDockerError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return (
    lower.includes('docker') ||
    lower.includes('not found') ||
    lower.includes('no such file') ||
    lower.includes('daemon') ||
    lower.includes('cannot connect')
  )
}

export async function runInSandbox(
  code: string,
  language: SnippetLanguage,
): Promise<SandboxResult> {
  const timeoutMs = 10_000

  const validation = validateCode(code, language)
  if (!validation.valid) {
    return {
      output: '',
      error: validation.reason || 'Code validation failed',
      timedOut: false,
    }
  }

  try {
    const dockerCommand = buildDockerCommand(code, language)
    const result = await Promise.race([
      execAsync(dockerCommand, timeoutMs),
      timeoutPromise(timeoutMs),
    ])

    if (result.timedOut) {
      return result
    }

    if (result.error && isDockerError(result.error)) {
      console.log('Docker unavailable, falling back to local execution:', result.error.slice(0, 120))
    } else {
      return result
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return { output: '', error: 'Execution timed out (exceeded 10 second limit)', timedOut: true }
    }
    console.log('Docker execution failed, falling back:', err instanceof Error ? err.message : String(err))
  }

  try {
    const fallbackCommand = buildFallbackCommand(code, language)
    const result = await Promise.race([
      execAsync(fallbackCommand, timeoutMs),
      timeoutPromise(timeoutMs),
    ])
    return result
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return { output: '', error: 'Execution timed out (exceeded 10 second limit)', timedOut: true }
    }
  }

  return { output: '', error: 'Failed to execute code: all execution methods failed', timedOut: false }
}
