import type { RootNode } from './rootSystem'

export interface UICallbacks {
  onTimeScaleChange: (scale: number) => void
}

export interface UIState {
  wheatTotalWater: number
  cornTotalWater: number
  wheatWaterRate: number
  cornWaterRate: number
  timeScale: number
}

let hoverTooltip: HTMLDivElement | null = null
let wheatTotalEl: HTMLElement | null = null
let cornTotalEl: HTMLElement | null = null
let wheatRateEl: HTMLElement | null = null
let cornRateEl: HTMLElement | null = null
let timeScaleButtons: HTMLButtonElement[] = []

const timeScaleOptions = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 5, label: '5x' },
  { value: 10, label: '10x' }
]

export function createUI(container: HTMLElement, callbacks: UICallbacks): void {
  const leftPanel = createLeftPanel()
  container.appendChild(leftPanel)

  const rightPanel = createRightPanel(callbacks)
  container.appendChild(rightPanel)

  hoverTooltip = createHoverTooltip()
  document.body.appendChild(hoverTooltip)

  const mobilePanel = createMobilePanel(callbacks)
  container.appendChild(mobilePanel)

  wheatTotalEl = document.getElementById('wheat-total')
  cornTotalEl = document.getElementById('corn-total')
  wheatRateEl = document.getElementById('wheat-rate')
  cornRateEl = document.getElementById('corn-rate')
  timeScaleButtons = Array.from(document.querySelectorAll('.time-btn')) as HTMLButtonElement[]

  handleResponsive()
  window.addEventListener('resize', handleResponsive)
}

function createLeftPanel(): HTMLDivElement {
  const panel = document.createElement('div')
  panel.id = 'left-panel'
  applyStyles(panel, {
    position: 'absolute',
    left: '20px',
    top: '20px',
    width: '240px',
    padding: '16px',
    backgroundColor: 'rgba(30, 30, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    color: '#FFFFFF',
    zIndex: '10',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  })

  panel.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      植物水分状态
    </div>

    <div style="margin-bottom: 16px;">
      <div style="padding-left: 8px; border-left: 3px solid #8B5E3C; margin-bottom: 8px;">
        <span style="font-size: 14px; font-weight: 600;">深根系小麦</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
        <span style="color: rgba(255, 255, 255, 0.7);">总吸水量</span>
        <span id="wheat-total" style="font-weight: 600; color: #00BFFF;">0 单位</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
        <span style="color: rgba(255, 255, 255, 0.7);">吸水速率</span>
        <span id="wheat-rate" style="font-weight: 600; color: #00BFFF;">0.0/秒</span>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <div style="padding-left: 8px; border-left: 3px solid #2E8B57; margin-bottom: 8px;">
        <span style="font-size: 14px; font-weight: 600;">浅根系玉米</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
        <span style="color: rgba(255, 255, 255, 0.7);">总吸水量</span>
        <span id="corn-total" style="font-weight: 600; color: #00BFFF;">0 单位</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
        <span style="color: rgba(255, 255, 255, 0.7);">吸水速率</span>
        <span id="corn-rate" style="font-weight: 600; color: #00BFFF;">0.0/秒</span>
      </div>
    </div>

    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">图例说明</div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #8B5E3C;"></div>
        <span style="color: rgba(255, 255, 255, 0.7);">小麦根系</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #2E8B57;"></div>
        <span style="color: rgba(255, 255, 255, 0.7);">玉米根系</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #00BFFF;"></div>
        <span style="color: rgba(255, 255, 255, 0.7);">水分子</span>
      </div>
    </div>
  `

  return panel
}

function createRightPanel(callbacks: UICallbacks): HTMLDivElement {
  const panel = document.createElement('div')
  panel.id = 'right-panel'
  applyStyles(panel, {
    position: 'absolute',
    right: '20px',
    top: '20px',
    width: '280px',
    padding: '16px',
    backgroundColor: 'rgba(30, 30, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    color: '#FFFFFF',
    zIndex: '10',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  })

  panel.innerHTML = `
    <div style="font-size: 16px; font-weight: bold; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
      控制面板
    </div>

    <div style="margin-bottom: 16px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: rgba(255, 255, 255, 0.9);">时间加速</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="time-buttons">
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px; color: rgba(255, 255, 255, 0.9);">操作提示</div>
      <div style="font-size: 12px; line-height: 1.8; color: rgba(255, 255, 255, 0.6);">
        <p style="margin: 0;">• 鼠标拖拽旋转视角</p>
        <p style="margin: 0;">• 滚轮缩放场景</p>
        <p style="margin: 0;">• 悬停根节点查看详情</p>
        <p style="margin: 0;">• 点击根节点高亮子节点</p>
      </div>
    </div>
  `

  const buttonContainer = panel.querySelector('#time-buttons') as HTMLDivElement
  timeScaleOptions.forEach((option, index) => {
    const btn = document.createElement('button')
    btn.className = 'time-btn'
    btn.textContent = option.label
    btn.dataset.scale = String(option.value)
    applyStyles(btn, {
      flex: '1',
      minWidth: '55px',
      padding: '8px 12px',
      border: 'none',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      backgroundColor: index === 0 ? '#5C6BC0' : '#3F51B5',
      fontFamily: 'inherit'
    })

    btn.addEventListener('mouseenter', () => {
      if (btn.dataset.active !== 'true') {
        btn.style.backgroundColor = '#5C6BC0'
      }
    })
    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.active !== 'true') {
        btn.style.backgroundColor = '#3F51B5'
      }
    })
    btn.addEventListener('mousedown', () => {
      btn.style.backgroundColor = '#303F9F'
    })
    btn.addEventListener('mouseup', () => {
      btn.style.backgroundColor = '#5C6BC0'
    })
    btn.addEventListener('click', () => {
      timeScaleButtons.forEach((b) => {
        b.dataset.active = 'false'
        b.style.backgroundColor = '#3F51B5'
      })
      btn.dataset.active = 'true'
      btn.style.backgroundColor = '#5C6BC0'
      callbacks.onTimeScaleChange(Number(btn.dataset.scale))
    })

    if (index === 0) {
      btn.dataset.active = 'true'
    }

    buttonContainer.appendChild(btn)
  })

  return panel
}

function createHoverTooltip(): HTMLDivElement {
  const tooltip = document.createElement('div')
  tooltip.id = 'hover-tooltip'
  applyStyles(tooltip, {
    position: 'fixed',
    padding: '12px',
    backgroundColor: 'rgba(30, 30, 46, 0.95)',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '12px',
    zIndex: '100',
    pointerEvents: 'none',
    minWidth: '160px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    opacity: '0',
    transition: 'opacity 200ms ease-in-out',
    WebkitTransition: 'opacity 200ms ease-in-out',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    visibility: 'hidden'
  })

  tooltip.innerHTML = `
    <div id="tooltip-title" style="font-size: 13px; font-weight: bold; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"></div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span style="color: rgba(255, 255, 255, 0.7);">深度:</span>
      <span id="tooltip-depth" style="font-weight: 600;"></span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span style="color: rgba(255, 255, 255, 0.7);">毛细根数量:</span>
      <span id="tooltip-capillary" style="font-weight: 600;"></span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span style="color: rgba(255, 255, 255, 0.7);">含水量:</span>
      <span id="tooltip-water" style="font-weight: 600;"></span>
    </div>
    <div style="margin-top: 8px; height: 6px; background-color: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
      <div id="tooltip-water-bar" style="height: 100%; background-color: #00BFFF; border-radius: 3px; transition: width 0.3s ease; width: 0%;"></div>
    </div>
  `

  return tooltip
}

function createMobilePanel(callbacks: UICallbacks): HTMLDivElement {
  const panel = document.createElement('div')
  panel.id = 'mobile-panel'
  applyStyles(panel, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    padding: '12px',
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    zIndex: '10',
    display: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  })

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="flex: 1; padding-left: 8px; border-left: 3px solid #8B5E3C; margin-right: 8px;">
        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">小麦</div>
        <div id="mobile-wheat-total" style="font-size: 16px; font-weight: bold; color: #00BFFF;">0</div>
      </div>
      <div style="flex: 1; padding-left: 8px; border-left: 3px solid #2E8B57;">
        <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">玉米</div>
        <div id="mobile-corn-total" style="font-size: 16px; font-weight: bold; color: #00BFFF;">0</div>
      </div>
    </div>
    <div style="display: flex; align-items: center;">
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8); margin-right: 10px;">速度</div>
      <div style="display: flex; gap: 6px;" id="mobile-time-buttons">
      </div>
    </div>
  `

  const buttonContainer = panel.querySelector('#mobile-time-buttons') as HTMLDivElement
  timeScaleOptions.forEach((option, index) => {
    const btn = document.createElement('button')
    btn.className = 'mobile-time-btn'
    btn.textContent = option.label
    btn.dataset.scale = String(option.value)
    applyStyles(btn, {
      padding: '6px 14px',
      border: 'none',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      backgroundColor: index === 0 ? '#5C6BC0' : '#3F51B5',
      fontFamily: 'inherit'
    })

    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-time-btn').forEach((b) => {
        ;(b as HTMLButtonElement).style.backgroundColor = '#3F51B5'
      })
      btn.style.backgroundColor = '#5C6BC0'
      callbacks.onTimeScaleChange(Number(btn.dataset.scale))
    })

    buttonContainer.appendChild(btn)
  })

  return panel
}

export function updateUI(state: UIState): void {
  if (wheatTotalEl) {
    wheatTotalEl.textContent = `${state.wheatTotalWater.toFixed(0)} 单位`
  }
  if (cornTotalEl) {
    cornTotalEl.textContent = `${state.cornTotalWater.toFixed(0)} 单位`
  }
  if (wheatRateEl) {
    wheatRateEl.textContent = `${state.wheatWaterRate.toFixed(1)}/秒`
  }
  if (cornRateEl) {
    cornRateEl.textContent = `${state.cornWaterRate.toFixed(1)}/秒`
  }

  const mobileWheat = document.getElementById('mobile-wheat-total')
  const mobileCorn = document.getElementById('mobile-corn-total')
  if (mobileWheat) mobileWheat.textContent = state.wheatTotalWater.toFixed(0)
  if (mobileCorn) mobileCorn.textContent = state.cornTotalWater.toFixed(0)
}

export function showHoverTooltip(node: RootNode, x: number, y: number): void {
  if (!hoverTooltip) return

  const titleEl = document.getElementById('tooltip-title')
  const depthEl = document.getElementById('tooltip-depth')
  const capillaryEl = document.getElementById('tooltip-capillary')
  const waterEl = document.getElementById('tooltip-water')
  const waterBar = document.getElementById('tooltip-water-bar')

  const plantTypeName = node.plantType === 'wheat' ? '小麦' : '玉米'

  if (titleEl) titleEl.textContent = `${plantTypeName}根节点`
  if (depthEl) depthEl.textContent = `${Math.abs(node.position.y).toFixed(2)} 单位`
  if (capillaryEl) capillaryEl.textContent = String(node.capillaryCount)
  if (waterEl) waterEl.textContent = `${node.waterContent.toFixed(1)}%`
  if (waterBar) waterBar.style.width = `${node.waterContent}%`

  hoverTooltip.style.left = `${x + 15}px`
  hoverTooltip.style.top = `${y + 15}px`
  hoverTooltip.style.visibility = 'visible'

  void hoverTooltip.offsetWidth
  hoverTooltip.style.opacity = '1'
}

export function hideHoverTooltip(): void {
  if (!hoverTooltip) return
  hoverTooltip.style.opacity = '0'
  setTimeout(() => {
    if (hoverTooltip && hoverTooltip.style.opacity === '0') {
      hoverTooltip.style.visibility = 'hidden'
    }
  }, 200)
}

function handleResponsive(): void {
  const isMobile = window.innerWidth < 768
  const leftPanel = document.getElementById('left-panel')
  const rightPanel = document.getElementById('right-panel')
  const mobilePanel = document.getElementById('mobile-panel')

  if (leftPanel) leftPanel.style.display = isMobile ? 'none' : 'block'
  if (rightPanel) rightPanel.style.display = isMobile ? 'none' : 'block'
  if (mobilePanel) mobilePanel.style.display = isMobile ? 'block' : 'none'
}

function applyStyles(element: HTMLElement, styles: { [key: string]: string }): void {
  Object.assign(element.style, styles)
}
