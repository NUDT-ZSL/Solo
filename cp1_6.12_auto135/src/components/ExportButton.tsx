/**
 * ============================================================
 *  ExportButton.tsx - 看板导出按钮（html2canvas截图 + 波纹动画）
 * ============================================================
 *
 * 【职责】
 *    - 点击时触发 Material Design 风格的 click-ripple 动画
 *    - 通过 id="component-grid" 获取 ComponentGrid DOM 节点
 *    - 调用 html2canvas 以 scale=2 渲染画布（适配 2x Retina 屏）
 *    - 将画布重采样至宽度 1920px，最终输出 PNG 文件
 *    - 性能目标：6 个主题下从点击到下载 < 1.5s
 *
 * 【被调用位置】
 *    - src/components/App.tsx → header 区域右侧
 *
 * 【向下依赖】
 *    - html2canvas (npm package)
 *    - DOM id="component-grid"（由 ComponentGrid.tsx 暴露）
 *
 * 【数据 / 事件流向】
 *    onClick
 *       ↓
 *    计算 ripple 坐标(x,y) → setState 注入 .ripple-effect span → CSS @keyframes 扩展至 1.5 倍宽
 *       ↓
 *    document.getElementById('component-grid')
 *       ↓
 *    html2canvas(node, { scale: 2, backgroundColor:null, useCORS:true })
 *       ↓
 *    createCanvas(1920, H) → drawImage(scaled) → toDataURL(image/png)
 *       ↓
 *    动态 <a download> 触发浏览器下载
 * ============================================================
 */
import { memo, useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'

interface Ripple {
  id: number
  x: number
  y: number
}

function ExportButton() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])

  const spawnRipple = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev, { id, x, y }])
    window.setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 650)
  }, [])

  const exportGrid = useCallback(async () => {
    const gridElement = document.getElementById('component-grid')
    if (!gridElement) return

    const TARGET_WIDTH = 1920
    const SCALE = 2

    try {
      const canvas = await html2canvas(gridElement, {
        scale: SCALE,
        width: TARGET_WIDTH,
        windowWidth: TARGET_WIDTH,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        imageTimeout: 5000,
      })

      const link = document.createElement('a')
      link.download = `ThemeGrid-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 0.95)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ThemeGrid] 导出失败:', err)
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      spawnRipple(e.clientX - rect.left, e.clientY - rect.top)
      await exportGrid()
    },
    [exportGrid, spawnRipple]
  )

  return (
    <button
      ref={buttonRef}
      className="export-button"
      onClick={handleClick}
      type="button"
      aria-label="导出组件看板为PNG图片"
    >
      {ripples.map(r => (
        <span
          key={r.id}
          className="ripple-effect"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <svg
        className="export-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>导出看板</span>
    </button>
  )
}

export default memo(ExportButton)
