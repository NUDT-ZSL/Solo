import type { DesignToken } from '../types'

export function exportTokenToJSON(token: DesignToken): void {
  const jsonString = JSON.stringify(token, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'design-tokens.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function serializeToken(token: DesignToken): string {
  return JSON.stringify(token, null, 2)
}
