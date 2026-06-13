export const CROSSHAIR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <line x1="12" y1="4" x2="12" y2="10" stroke="white" stroke-width="1" stroke-linecap="round"/>
  <line x1="12" y1="14" x2="12" y2="20" stroke="white" stroke-width="1" stroke-linecap="round"/>
  <line x1="4" y1="12" x2="10" y2="12" stroke="white" stroke-width="1" stroke-linecap="round"/>
  <line x1="14" y1="12" x2="20" y2="12" stroke="white" stroke-width="1" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="1.5" fill="white"/>
</svg>
`)}`

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function getCursorStyle(): string {
  if (isTouchDevice()) return 'default'
  return `url("${CROSSHAIR_SVG}") 12 12, crosshair`
}
