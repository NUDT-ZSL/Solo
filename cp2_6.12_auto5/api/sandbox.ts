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

const JS_DANGEROUS_MODULES = new Set([
  'child_process', 'fs', 'net', 'http', 'https', 'os', 'tls', 'dgram',
  'cluster', 'worker_threads', 'process', 'vm', 'v8', 'perf_hooks',
])

const JS_DANGEROUS_METHODS = [
  /\.exec\s*\(/, /\.execSync\s*\(/, /\.spawn\s*\(/, /\.execFile\s*\(/,
  /\.spawnSync\s*\(/, /\.fork\s*\(/, /\.readFile\s*\(/, /\.writeFile\s*\(/,
  /\.readFileSync\s*\(/, /\.writeFileSync\s*\(/, /\.createReadStream\s*\(/,
  /\.createWriteStream\s*\(/, /\.unlink\s*\(/, /\.rmdir\s*\(/, /\.mkdir\s*\(/,
  /process\.exit\s*\(/, /process\.kill\s*\(/, /process\.chdir\s*\(/,
  /global\.process/, /Function\s*\(/, /eval\s*\(/,
]

const PY_DANGEROUS_MODULES = new Set([
  'os', 'subprocess', 'sys', 'socket', 'ftplib', 'urllib', 'http',
  'https', 'telnetlib', 'smtplib', 'imaplib', 'poplib', 'shutil',
  'pathlib', 'tempfile', 'pty', 'fcntl', 'mmap', 'signal', 'ctypes',
])

const PY_DANGEROUS_PATTERNS = [
  /^__import__\s*\(/m,
  /os\.system\s*\(/,
  /os\.popen\s*\(/,
  /os\.exe[cv]l?[pe]?\s*\(/,
  /os\.spawn[vlpe]\s*\(/,
  /subprocess\.(run|Popen|call|check_output|check_call|getoutput|getstatusoutput)\s*\(/,
  /exec\s*\(/,
  /eval\s*\(/,
  /compile\s*\(/,
  /input\s*\(\s*(['"]|$|,|\))/,
  /open\s*\(\s*['"][^'"]+\.(txt|log|json|csv|py|sh|env|ini|cfg|conf|yml|yaml|xml|html|db|sqlite|bin|dat)['"]/,
  /socket\.socket\s*\(/,
  /\.connect\s*\(/,
  /\.send\s*\(/,
  /sys\.exit\s*\(/,
  /shutil\.(copy|move|rmtree|make_archive|unpack_archive)\s*\(/,
  /pickle\.loads?\s*\(/,
  /importlib\.import_module\s*\(/,
  /builtins\.__import__/,
]

const ENCODING_SUSPICIOUS = [
  /atob\s*\(/,
  /btoa\s*\(/,
  /unescape\s*\(/,
  /decodeURIComponent\s*\(/,
  /String\.fromCharCode\s*\(/,
  /Buffer\.from\s*\(/,
  /base64/i,
  /\\x[0-9a-fA-F]{2}/,
  /\\u[0-9a-fA-F]{4}/,
  /\[\][\s]*.*[\s]*\s*\(/,
]

function extractStrings(code: string): string[] {
  const strings: string[] = []
  const regex = /(['"`])(?:\\.|[^\\])*?\1/g
  let match
  while ((match = regex.exec(code)) !== null) {
    strings.push(match[0].slice(1, -1))
  }
  return strings
}

function decodeB64IfPossible(s: string): string | null {
  if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) {
    try {
      return Buffer.from(s, 'base64').toString('utf-8')
    } catch {
      return null
    }
  }
  return null
}

function validateCode(code: string, language: SnippetLanguage): ValidationResult {
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, reason: `Code exceeds maximum length of ${MAX_CODE_LENGTH / 1024}KB` }
  }

  if (code.trim().length === 0) {
    return { valid: false, reason: 'Code is empty' }
  }

  const suspiciousModules = language === 'javascript' ? JS_DANGEROUS_MODULES : PY_DANGEROUS_MODULES
  const dangerousPatterns = language === 'javascript' ? JS_DANGEROUS_METHODS : PY_DANGEROUS_PATTERNS

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return {
        valid: false,
        reason: `Code contains potentially dangerous pattern: ${pattern.toString().slice(0, 60)}`,
      }
    }
  }

  for (const pattern of ENCODING_SUSPICIOUS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        reason: 'Code contains suspicious encoding/obfuscation patterns that are blocked for security',
      }
    }
  }

  const strings = extractStrings(code)
  for (const str of strings) {
    if (str.length > 5000) continue

    const decoded = decodeB64IfPossible(str)
    if (decoded) {
      for (const mod of suspiciousModules) {
        if (decoded.includes(mod)) {
          return {
            valid: false,
            reason: 'Code contains base64-encoded references to dangerous modules',
          }
        }
      }
      for (const pattern of dangerousPatterns) {
        if (pattern.test(decoded)) {
          return {
            valid: false,
            reason: 'Code contains base64-encoded dangerous patterns',
          }
        }
      }
    }

    for (const mod of suspiciousModules) {
      if (str === mod || str.includes(mod + '.') || str.includes(mod + '/')) {
        return {
          valid: false,
          reason: `Code references dangerous module: ${mod}`,
        }
      }
    }
  }

  if (language === 'javascript') {
    for (const mod of suspiciousModules) {
      const requirePattern = new RegExp(`require\\s*\\(\\s*['"]${mod}['"]\\s*\\)`)
      if (requirePattern.test(code)) {
        return { valid: false, reason: `Code imports dangerous module: ${mod}` }
      }
      const importPattern = new RegExp(`import\\s+.*from\\s+['"]${mod}['"]`)
      if (importPattern.test(code)) {
        return { valid: false, reason: `Code imports dangerous module: ${mod}` }
      }
      const dynamicImportPattern = new RegExp(`import\\s*\\(\\s*['"]${mod}['"]\\s*\\)`)
      if (dynamicImportPattern.test(code)) {
        return { valid: false, reason: `Code dynamically imports dangerous module: ${mod}` }
      }
    }

    if (/__dirname|__filename/.test(code)) {
      return { valid: false, reason: 'Code references filesystem path variables' }
    }
  }

  if (language === 'python') {
    for (const mod of suspiciousModules) {
      const importPattern = new RegExp(`^\\s*import\\s+${mod}\\s*$`, 'm')
      if (importPattern.test(code)) {
        return { valid: false, reason: `Code imports dangerous module: ${mod}` }
      }
      const fromPattern = new RegExp(`^\\s*from\\s+${mod}\\s+import`, 'm')
      if (fromPattern.test(code)) {
        return { valid: false, reason: `Code imports from dangerous module: ${mod}` }
      }
    }

    if (/__import__|builtins|getattr.*__import__/.test(code)) {
      return { valid: false, reason: 'Code uses dynamic import mechanisms' }
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
    return `docker run --rm --network none --read-only -m 50m --pids-limit 32 --ulimit nproc=32 --ulimit fsize=1048576 node:20-alpine node -e ${escaped}`
  }
  return `docker run --rm --network none --read-only -m 50m --pids-limit 32 --ulimit nproc=32 --ulimit fsize=1048576 python:3.12-alpine python -c ${escaped}`
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

function isDockerCommandNotFound(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return (
    lower.includes("'docker' is not recognized") ||
    lower.includes('docker: command not found') ||
    lower.includes('no such file or directory') ||
    lower.includes('the system cannot find the file specified') ||
    lower.includes('docker daemon is not running') ||
    lower.includes('cannot connect to the docker daemon') ||
    lower.includes('is the docker daemon running')
  )
}

let dockerAvailableCache: boolean | null = null

async function checkDockerAvailable(): Promise<boolean> {
  if (dockerAvailableCache !== null) {
    return dockerAvailableCache
  }
  try {
    const result = await execAsync('docker --version', 5000)
    dockerAvailableCache = !result.error || !isDockerCommandNotFound(result.error)
    return dockerAvailableCache
  } catch {
    dockerAvailableCache = false
    return false
  }
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

  const dockerAvailable = await checkDockerAvailable()

  if (dockerAvailable) {
    try {
      const dockerCommand = buildDockerCommand(code, language)
      const result = await Promise.race([
        execAsync(dockerCommand, timeoutMs),
        timeoutPromise(timeoutMs),
      ])

      if (result.timedOut) {
        return result
      }

      if (result.error && isDockerCommandNotFound(result.error)) {
        dockerAvailableCache = false
        console.log('Docker became unavailable, falling back to local execution')
      } else {
        return result
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        return { output: '', error: 'Execution timed out (exceeded 10 second limit)', timedOut: true }
      }
      dockerAvailableCache = false
      console.log('Docker execution failed, falling back:', err instanceof Error ? err.message : String(err))
    }
  }

  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV === 'production') {
    return {
      output: '',
      error: 'Code execution is unavailable: Docker sandbox is not running in production',
      timedOut: false,
    }
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
