import { Constellation } from './types'

export interface UIManager {
  showConstellationInfo: (data: Constellation) => void
  hideConstellationInfo: () => void
  isVisible: () => boolean
  destroy: () => void
}

const SLIDE_IN_DURATION = 300
const SLIDE_OUT_DURATION = 200

export function createUIManager(container: HTMLElement): UIManager {
  let panel: HTMLDivElement | null = null
  let visible = false

  function ensurePanel(): HTMLDivElement {
    if (panel) return panel
    panel = document.createElement('div')
    panel.className = 'constellation-panel'
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 340px;
      max-height: calc(100vh - 40px);
      background: rgba(10, 10, 30, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 20px;
      color: #E0E0E0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transform: translateX(400px);
      opacity: 0;
      transition: transform ${SLIDE_IN_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${SLIDE_IN_DURATION}ms ease-out;
      overflow-y: auto;
      z-index: 1000;
      box-sizing: border-box;
    `
    panel.addEventListener('wheel', (e: Event) => {
      e.stopPropagation()
    })
    panel.addEventListener('click', (e: Event) => {
      e.stopPropagation()
    })
    container.appendChild(panel)
    return panel
  }

  function renderContent(data: Constellation): void {
    if (!panel) return
    const mainStarsHTML = data.mainStars && data.mainStars.length > 0
      ? `<div style="margin-top: 16px;">
           <div style="font-size: 14px; color: #90CAF9; margin-bottom: 8px; font-weight: 600;">主要恒星</div>
           <div style="font-size: 13px; color: #B0B0B0; line-height: 1.8;">
             ${data.mainStars.map(s => `<span style="display: inline-block; background: rgba(144, 202, 249, 0.1); padding: 2px 8px; border-radius: 4px; margin: 2px 4px 2px 0;">${s}</span>`).join('')}
           </div>
         </div>`
      : ''

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-size: 18px; color: #E0E0E0; font-weight: 600; letter-spacing: 0.5px;">${data.name}</div>
          <div style="font-size: 12px; color: #808080; margin-top: 4px; font-style: italic;">${data.nameEn}</div>
        </div>
        <button class="close-btn" style="background: none; border: none; color: #808080; font-size: 24px; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s;">&times;</button>
      </div>
      <div style="font-size: 14px; color: #B0B0B0; line-height: 1.6; margin-bottom: 4px;">
        ${data.description}
      </div>
      ${mainStarsHTML}
      <div style="margin-top: 16px;">
        <div style="font-size: 14px; color: #FFD54F; margin-bottom: 8px; font-weight: 600;">神话故事</div>
        <div style="font-size: 14px; color: #B0B0B0; line-height: 1.6;">
          ${data.mythology}
        </div>
      </div>
    `

    const closeBtn = panel.querySelector('.close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        hideConstellationInfo()
      })
      closeBtn.addEventListener('mouseenter', () => {
        (closeBtn as HTMLElement).style.color = '#E0E0E0'
      })
      closeBtn.addEventListener('mouseleave', () => {
        (closeBtn as HTMLElement).style.color = '#808080'
      })
    }
  }

  function showConstellationInfo(data: Constellation): void {
    const p = ensurePanel()
    renderContent(data)
    p.style.transition = `transform ${SLIDE_IN_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${SLIDE_IN_DURATION}ms ease-out`
    requestAnimationFrame(() => {
      if (panel) {
        panel.style.transform = 'translateX(0)'
        panel.style.opacity = '1'
      }
    })
    visible = true
  }

  function hideConstellationInfo(): void {
    if (!panel) return
    panel.style.transition = `transform ${SLIDE_OUT_DURATION}ms cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity ${SLIDE_OUT_DURATION}ms ease-in`
    panel.style.transform = 'translateX(400px)'
    panel.style.opacity = '0'
    setTimeout(() => {
      if (panel) {
        panel.style.transition = `transform ${SLIDE_IN_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${SLIDE_IN_DURATION}ms ease-out`
      }
    }, SLIDE_OUT_DURATION)
    visible = false
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && visible) {
      hideConstellationInfo()
    }
  }

  function handleClick(e: MouseEvent): void {
    if (!visible || !panel) return
    if (e.target instanceof Node && panel.contains(e.target)) return
    hideConstellationInfo()
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('click', handleClick)

  return {
    showConstellationInfo,
    hideConstellationInfo,
    isVisible: () => visible,
    destroy() {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClick)
      if (panel && panel.parentNode) {
        panel.parentNode.removeChild(panel)
      }
      panel = null
    }
  }
}
