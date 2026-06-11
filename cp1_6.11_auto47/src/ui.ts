import { EmotionTag, ParticleMemorySystem, MemoryData } from './particleMemory'
import cuid from 'cuid'

const EMOTIONS: EmotionTag[] = ['喜悦', '忧伤', '怀念', '平静', '期待']

const GLOBAL_CSS = `
@keyframes emotion-bounce {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.35); }
  50%  { transform: scale(0.9); }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1.15); }
}
@keyframes timeline-flash {
  0%   { border-color: rgba(255,255,255,0.1); }
  50%  { border-color: rgba(255,255,255,0.95); box-shadow: 0 0 16px rgba(255,255,255,0.6); }
  100% { border-color: rgba(255,255,255,0.1); box-shadow: none; }
}
#timeline-scroll::-webkit-scrollbar {
  width: 4px;
}
#timeline-scroll::-webkit-scrollbar-track {
  background: transparent;
}
#timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}
#timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}
`

function injectGlobalCSS() {
  const style = document.createElement('style')
  style.id = 'crystal-memory-ui-css'
  if (!document.getElementById('crystal-memory-ui-css')) {
    style.textContent = GLOBAL_CSS
    document.head.appendChild(style)
    console.debug('[UI] 已注入全局动画 CSS')
  }
}

export class UIController {
  private particleSystem: ParticleMemorySystem
  private container: HTMLElement
  private selectedEmotion: EmotionTag = '喜悦'
  private inputPanel!: HTMLElement
  private textInput!: HTMLInputElement
  private emotionButtons: HTMLButtonElement[] = []
  private addButton!: HTMLButtonElement
  private timelinePanel!: HTMLElement
  private timelineItems: HTMLElement[] = []
  private onTimelineClick: ((clusterId: string) => void) | null = null
  private onResetCamera: (() => void) | null = null

  constructor(container: HTMLElement, particleSystem: ParticleMemorySystem) {
    this.container = container
    this.particleSystem = particleSystem
    injectGlobalCSS()
    this.createUI()
    this.bindEvents()
    console.log('[UI] 控制器已初始化')
  }

  setTimelineClickHandler(handler: (clusterId: string) => void) {
    this.onTimelineClick = handler
  }

  setResetCameraHandler(handler: () => void) {
    this.onResetCamera = handler
  }

  private createUI() {
    this.createInputPanel()
    this.createTimelinePanel()
  }

  private createInputPanel() {
    this.inputPanel = document.createElement('div')
    this.inputPanel.id = 'input-panel'
    Object.assign(this.inputPanel.style, {
      position: 'fixed',
      bottom: '30px',
      left: '30px',
      background: 'rgba(15,15,35,0.85)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '20px',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      minWidth: '290px',
      transition: 'box-shadow 0.2s ease',
    })

    const titleEl = document.createElement('div')
    titleEl.textContent = '星尘记忆'
    Object.assign(titleEl.style, {
      color: 'rgba(255,255,255,0.9)',
      fontSize: '16px',
      fontWeight: '600',
      letterSpacing: '2px',
      textAlign: 'center' as const,
    })
    this.inputPanel.appendChild(titleEl)

    this.textInput = document.createElement('input')
    this.textInput.type = 'text'
    this.textInput.maxLength = 50
    this.textInput.placeholder = '记录一个珍贵瞬间...'
    Object.assign(this.textInput.style, {
      height: '40px',
      width: '250px',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#ffffff',
      fontSize: '14px',
      padding: '0 12px',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    })
    this.textInput.addEventListener('focus', () => {
      this.textInput.style.borderColor = 'rgba(135,206,235,0.6)'
      this.textInput.style.boxShadow = '0 0 12px rgba(135,206,235,0.2)'
    })
    this.textInput.addEventListener('blur', () => {
      this.textInput.style.borderColor = 'rgba(255,255,255,0.15)'
      this.textInput.style.boxShadow = 'none'
    })
    this.inputPanel.appendChild(this.textInput)

    const emotionRow = document.createElement('div')
    Object.assign(emotionRow.style, {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      alignItems: 'center',
    })

    for (const emotion of EMOTIONS) {
      const btn = document.createElement('button')
      btn.dataset.emotion = emotion
      btn.title = emotion

      const [startColor, endColor] = this.particleSystem.getEmotionGradient(emotion)
      const isActive = emotion === this.selectedEmotion

      Object.assign(btn.style, {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: isActive ? '2px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.2)',
        background: `radial-gradient(circle, ${startColor}, ${endColor})`,
        cursor: 'pointer',
        transition: 'border-color 0.1s ease, box-shadow 0.1s ease',
        transform: isActive ? 'scale(1.15)' : 'scale(1)',
        boxShadow: isActive ? `0 0 12px ${startColor}66` : 'none',
        padding: '0',
        outline: 'none',
      })

      btn.addEventListener('click', () => this.selectEmotion(emotion))
      btn.addEventListener('mouseenter', () => {
        if (emotion !== this.selectedEmotion) {
          btn.style.transform = 'scale(1.1)'
          btn.style.boxShadow = `0 0 8px ${startColor}44`
        }
      })
      btn.addEventListener('mouseleave', () => {
        if (emotion !== this.selectedEmotion) {
          btn.style.transform = 'scale(1)'
          btn.style.boxShadow = 'none'
        }
      })

      this.emotionButtons.push(btn)
      emotionRow.appendChild(btn)
    }

    this.inputPanel.appendChild(emotionRow)

    const emotionLabel = document.createElement('div')
    emotionLabel.id = 'emotion-label'
    emotionLabel.textContent = this.selectedEmotion
    Object.assign(emotionLabel.style, {
      color: 'rgba(255,255,255,0.6)',
      fontSize: '12px',
      textAlign: 'center' as const,
      transition: 'color 0.2s ease',
    })
    this.inputPanel.appendChild(emotionLabel)

    this.addButton = document.createElement('button')
    this.addButton.textContent = '添加记忆'
    const [addStart, addEnd] = this.particleSystem.getEmotionGradient(this.selectedEmotion)
    Object.assign(this.addButton.style, {
      width: '120px',
      height: '40px',
      borderRadius: '20px',
      border: 'none',
      background: `linear-gradient(135deg, ${addStart}, ${addEnd})`,
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'box-shadow 0.3s ease, transform 0.15s ease',
      alignSelf: 'center' as const,
      outline: 'none',
      letterSpacing: '1px',
    })
    this.addButton.addEventListener('mouseenter', () => {
      this.addButton.style.boxShadow = `0 0 20px ${addStart}88`
      this.addButton.style.transform = 'scale(1.05)'
    })
    this.addButton.addEventListener('mouseleave', () => {
      this.addButton.style.boxShadow = 'none'
      this.addButton.style.transform = 'scale(1)'
    })
    this.addButton.addEventListener('click', () => this.addMemory())
    this.inputPanel.appendChild(this.addButton)

    this.container.appendChild(this.inputPanel)
  }

  private createTimelinePanel() {
    this.timelinePanel = document.createElement('div')
    this.timelinePanel.id = 'timeline-panel'
    Object.assign(this.timelinePanel.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: '200px',
      height: '100vh',
      background: 'rgba(15,15,35,0.7)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    })

    const header = document.createElement('div')
    header.textContent = '时间轴'
    Object.assign(header.style, {
      color: 'rgba(255,255,255,0.7)',
      fontSize: '13px',
      fontWeight: '600',
      letterSpacing: '2px',
      textAlign: 'center' as const,
      padding: '20px 0 12px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    })
    this.timelinePanel.appendChild(header)

    const scrollArea = document.createElement('div')
    scrollArea.id = 'timeline-scroll'
    Object.assign(scrollArea.style, {
      flex: '1',
      overflowY: 'auto' as const,
      padding: '12px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    })
    scrollArea.style.scrollbarWidth = 'thin'
    scrollArea.style.scrollbarColor = 'rgba(255,255,255,0.15) transparent'
    this.timelinePanel.appendChild(scrollArea)

    const emptyHint = document.createElement('div')
    emptyHint.id = 'timeline-empty'
    emptyHint.textContent = '暂无记忆'
    Object.assign(emptyHint.style, {
      color: 'rgba(255,255,255,0.3)',
      fontSize: '12px',
      marginTop: '20px',
    })
    scrollArea.appendChild(emptyHint)

    this.container.appendChild(this.timelinePanel)
  }

  private selectEmotion(emotion: EmotionTag) {
    if (emotion === this.selectedEmotion) return
    this.selectedEmotion = emotion

    console.log(`[UI] 切换情感标签: ${emotion}`)

    for (const btn of this.emotionButtons) {
      const em = btn.dataset.emotion as EmotionTag
      const [s, e] = this.particleSystem.getEmotionGradient(em)
      const isActive = em === emotion

      if (isActive) {
        btn.style.animation = 'emotion-bounce 0.2s ease forwards'
        btn.style.border = '2px solid rgba(255,255,255,0.8)'
        btn.style.boxShadow = `0 0 12px ${s}66`
        setTimeout(() => {
          btn.style.animation = ''
          btn.style.transform = 'scale(1.15)'
        }, 210)
      } else {
        btn.style.animation = ''
        btn.style.border = '2px solid rgba(255,255,255,0.2)'
        btn.style.boxShadow = 'none'
        btn.style.transform = 'scale(1)'
      }
    }

    const label = document.getElementById('emotion-label')
    if (label) {
      label.textContent = emotion
      const [ls] = this.particleSystem.getEmotionGradient(emotion)
      label.style.color = ls
      setTimeout(() => {
        label.style.color = 'rgba(255,255,255,0.6)'
      }, 350)
    }

    const [start, end] = this.particleSystem.getEmotionGradient(emotion)
    this.addButton.style.background = `linear-gradient(135deg, ${start}, ${end})`
    this.addButton.onmouseenter = () => {
      this.addButton.style.boxShadow = `0 0 20px ${start}88`
      this.addButton.style.transform = 'scale(1.05)'
    }
  }

  private addMemory() {
    const text = this.textInput.value.trim()
    if (!text || text.length < 1) {
      console.debug('[UI] 输入为空, 跳过添加')
      return
    }
    if (text.length > 50) {
      console.warn(`[UI] 文本长度超过50字: ${text.length}`)
      return
    }

    const memory: MemoryData = {
      id: cuid(),
      text,
      emotion: this.selectedEmotion,
      timestamp: Date.now(),
    }

    const cluster = this.particleSystem.addMemory(memory)
    if (!cluster) {
      this.showToast('粒子已达上限, 请先清理一些记忆')
      return
    }

    this.textInput.value = ''
    this.addTimelineItem(cluster)
    console.log(`[UI] 已提交记忆: "${text}" [${this.selectedEmotion}] -> ${cluster.id}`)
  }

  private showToast(message: string) {
    const toast = document.createElement('div')
    toast.textContent = message
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      top: '40px',
      transform: 'translateX(-50%)',
      background: 'rgba(255,80,80,0.85)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '13px',
      zIndex: '10000',
      opacity: '0',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      pointerEvents: 'none' as const,
    })
    document.body.appendChild(toast)
    requestAnimationFrame(() => {
      toast.style.opacity = '1'
      toast.style.transform = 'translateX(-50%) translateY(8px)'
    })
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(-50%)'
      setTimeout(() => toast.remove(), 350)
    }, 2000)
  }

  addTimelineItem(cluster: { id: string; memory: MemoryData }) {
    const scrollArea = document.getElementById('timeline-scroll')
    const emptyHint = document.getElementById('timeline-empty')
    if (emptyHint && emptyHint.parentNode) {
      emptyHint.parentNode.removeChild(emptyHint)
    }

    const item = document.createElement('div')
    item.dataset.clusterId = cluster.id
    const [startColor, endColor] = this.particleSystem.getEmotionGradient(cluster.memory.emotion)

    Object.assign(item.style, {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${startColor}, ${endColor})`,
      border: '2px solid rgba(255,255,255,0.1)',
      cursor: 'pointer',
      transition: 'border-color 0.1s ease, transform 0.1s ease, box-shadow 0.1s ease',
      flexShrink: '0',
      position: 'relative' as const,
    })

    const tooltip = document.createElement('div')
    tooltip.textContent = `${cluster.memory.emotion} · ${cluster.memory.text.substring(0, 10)}${cluster.memory.text.length > 10 ? '...' : ''}`
    Object.assign(tooltip.style, {
      position: 'absolute',
      right: '50px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(15,15,35,0.9)',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '12px',
      padding: '6px 10px',
      borderRadius: '6px',
      whiteSpace: 'nowrap' as const,
      pointerEvents: 'none' as const,
      opacity: '0',
      transition: 'opacity 0.2s ease',
      border: '1px solid rgba(255,255,255,0.1)',
    })
    item.appendChild(tooltip)

    item.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1'
      item.style.transform = 'scale(1.15)'
      item.style.boxShadow = `0 0 10px ${startColor}66`
    })
    item.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0'
      item.style.transform = 'scale(1)'
      item.style.boxShadow = 'none'
    })

    item.addEventListener('click', () => {
      console.log(`[UI] 点击时间轴缩略图: ${cluster.id} "${cluster.memory.text}"`)
      item.style.animation = 'timeline-flash 0.2s ease'
      setTimeout(() => {
        item.style.animation = ''
      }, 220)
      this.onTimelineClick?.(cluster.id)
    })

    if (scrollArea) {
      scrollArea.appendChild(item)
      this.timelineItems.push(item)
      scrollArea.scrollTop = scrollArea.scrollHeight
      console.debug(`[UI] 已添加时间轴项目, 当前共 ${this.timelineItems.length} 项`)
    }
  }

  private bindEvents() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (document.activeElement === this.textInput) {
        if (e.key === 'Enter') {
          this.addMemory()
        }
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        console.log('[UI] 快捷键 R: 重置相机')
        this.onResetCamera?.()
      }
      if (e.key === 'c' || e.key === 'C') {
        console.log('[UI] 快捷键 C: 清除高亮')
        this.particleSystem.clearHighlight()
      }
      if (e.key === 'Escape') {
        console.log('[UI] 快捷键 ESC: 退出召回')
        this.particleSystem.dismissRecall()
      }
    })
  }
}
