import { ConstellationData } from './constellations'

export interface UIManager {
  showConstellationInfo: (data: ConstellationData) => void
  hideConstellationInfo: () => void
  isVisible: () => boolean
  destroy: () => void
}

export function createUIManager(container: HTMLElement): UIManager {
  let panel: HTMLDivElement | null = null
  let visible = false

  function ensurePanel() {
    if (panel) return panel
    panel = document.createElement('div')
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
      transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out;
      overflow-y: auto;
      z-index: 1000;
    `
    panel.addEventListener('wheel', (e) => {
      e.stopPropagation()
    })
    panel.addEventListener('click', (e) => {
      e.stopPropagation()
    })
    container.appendChild(panel)
    return panel
  }

  function renderContent(data: ConstellationData) {
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
        <button id="closeBtn" style="background: none; border: none; color: #808080; font-size: 20px; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s;" onmouseover="this.style.color='#E0E0E0'" onmouseout="this.style.color='#808080'">&times;</button>
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
    const closeBtn = panel.querySelector('#closeBtn')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        hideConstellationInfo()
      })
    }
  }

  function showConstellationInfo(data: ConstellationData) {
    const p = ensurePanel()
    renderContent(data)
    requestAnimationFrame(() => {
      p.style.transform = 'translateX(0)'
      p.style.opacity = '1'
    })
    visible = true
  }

  function hideConstellationInfo() {
    if (!panel) return
    panel.style.transform = 'translateX(400px)'
    panel.style.opacity = '0'
    panel.style.transition = 'transform 0.2s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.2s ease-in'
    setTimeout(() => {
      if (panel) {
        panel.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out'
      }
    }, 200)
    visible = false
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && visible) {
      hideConstellationInfo()
    }
  }

  function handleClick(e: MouseEvent) {
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
