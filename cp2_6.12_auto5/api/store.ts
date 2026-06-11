export type SnippetLanguage = 'javascript' | 'python'

export interface Snippet {
  id: string
  title: string
  description: string
  code: string
  language: SnippetLanguage
  createdAt: string
}

const snippets = new Map<string, Snippet>()
const rateLimits = new Map<string, number[]>()

export function getSnippet(id: string): Snippet | undefined {
  return snippets.get(id)
}

export function saveSnippet(snippet: Snippet): void {
  snippets.set(snippet.id, snippet)
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 5

  let timestamps = rateLimits.get(ip) || []
  timestamps = timestamps.filter((ts) => now - ts < windowMs)

  if (timestamps.length >= maxRequests) {
    rateLimits.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  rateLimits.set(ip, timestamps)
  return true
}

export function cleanupOldRateLimits(): void {
  const now = Date.now()
  const windowMs = 60_000

  for (const [ip, timestamps] of rateLimits.entries()) {
    const filtered = timestamps.filter((ts) => now - ts < windowMs)
    if (filtered.length === 0) {
      rateLimits.delete(ip)
    } else {
      rateLimits.set(ip, filtered)
    }
  }
}
