/**
 * App.tsx - 主组件，负责整体布局与状态分发
 *
 * 【职责】
 *   1. 整体页面布局：顶部导航、左上筛选面板(200px)、中部图表区(60%高度)、底部时间轴(120px)
 *   2. 持有全局状态：salesData / currentIndex / isPlaying / speed / selectedProducts / sortType
 *   3. 作为 DataEngine 与 UI 组件的协调层：
 *      - 接收文件上传 → 调用 DataEngine.parseCSV → 生成 SalesData
 *      - 接收 TimelinePanel 交互 → 驱动 DataEngine 状态机 → 回写 currentIndex 等状态
 *      - 将排序/筛选后的数据切片 + productColors 传递给 Visualizer
 *
 * 【数据流向】
 *   CSV 文件 → <input type="file"> → parseCSV() → salesData (state)
 *                                                     │
 *                                                     ├──→ sortSeries() + filter → displayData ──→ Visualizer
 *                                                     ├──→ getProductColors() ──────────────────→ Visualizer
 *                                                     └──→ createTimelineStateMachine()
 *                                                              │
 *   TimelinePanel 用户交互 → onIndexChange/onPlayToggle/onSpeedChange → stateMachine 方法
 *                                                                          │
 *                                                                          └──→ onTick callback → setState → re-render
 *
 * 【被依赖】src/main.tsx → ReactDOM.render(<App />)
 * 【依赖】
 *   - src/DataEngine.ts: parseCSV, createTimelineStateMachine, getProductColors, sortSeries
 *   - src/components/Visualizer.tsx: 图表渲染
 *   - src/components/TimelinePanel.tsx: 时间轴控制
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Visualizer from './components/Visualizer'
import TimelinePanel from './components/TimelinePanel'
import {
  parseCSV,
  createTimelineStateMachine,
  getProductColors,
  sortSeries,
  type SalesData,
  type SortType,
} from './DataEngine'

const App: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [sortType, setSortType] = useState<SortType>('value-desc')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stateMachineRef = useRef<ReturnType<typeof createTimelineStateMachine> | null>(null)

  const productColors = useMemo(() => {
    if (!salesData) return {}
    return getProductColors(salesData.series.map((s) => s.product))
  }, [salesData])

  const displayData = useMemo((): SalesData | null => {
    if (!salesData) return null
    const sorted = sortSeries(salesData.series, sortType, currentIndex)
    const filtered = sorted.filter((s) => selectedProducts.includes(s.product))
    return { ...salesData, series: filtered }
  }, [salesData, sortType, currentIndex, selectedProducts])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const startTime = performance.now()
        const data = parseCSV(text)
        const parseTime = performance.now() - startTime

        if (parseTime > 200) {
          console.warn(`CSV解析耗时 ${parseTime.toFixed(2)}ms，超过200ms限制`)
        }

        if (stateMachineRef.current) {
          stateMachineRef.current.destroy()
        }

        const sm = createTimelineStateMachine(data.months.length)
        sm.onTick(() => {
          setCurrentIndex(sm.state.currentIndex)
          setIsPlaying(sm.state.isPlaying)
          setSpeed(sm.state.speed)
        })
        stateMachineRef.current = sm

        setSalesData(data)
        setSelectedProducts(data.series.map((s) => s.product))
        setCurrentIndex(0)
        setIsPlaying(false)
        setSpeed(1)
        setError(null)
        setSuccess(`数据加载成功！共 ${data.months.length} 个月，${data.series.length} 个产品线`)
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '数据解析失败')
        setSuccess(null)
      }
    }
    reader.onerror = () => {
      setError('文件读取失败')
    }
    reader.readAsText(file)
  }, [])

  const handleIndexChange = useCallback((index: number) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.goTo(index)
    } else {
      setCurrentIndex(index)
    }
  }, [])

  const handlePlayToggle = useCallback(() => {
    if (!stateMachineRef.current) return
    if (stateMachineRef.current.state.isPlaying) {
      stateMachineRef.current.pause()
    } else {
      if (
        stateMachineRef.current.state.currentIndex >=
        (salesData?.months.length || 0) - 1
      ) {
        stateMachineRef.current.goTo(0)
      }
      stateMachineRef.current.play()
    }
  }, [salesData])

  const handleSpeedChange = useCallback((newSpeed: number) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.setSpeed(newSpeed)
    } else {
      setSpeed(newSpeed)
    }
  }, [])

  const toggleProduct = useCallback((product: string) => {
    setSelectedProducts((prev) => {
      if (prev.includes(product)) {
        if (prev.length <= 1) return prev
        return prev.filter((p) => p !== product)
      }
      return [...prev, product]
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (salesData) {
      setSelectedProducts(salesData.series.map((s) => s.product))
    }
  }, [salesData])

  const handleDeselectAll = useCallback(() => {
    if (salesData && salesData.series.length > 0) {
      setSelectedProducts([salesData.series[0].product])
    }
  }, [salesData])

  useEffect(() => {
    return () => {
      if (stateMachineRef.current) {
        stateMachineRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📊</span>
          TrendNavigator
          <span className="title-sub">销售数据时间轴回放看板</span>
        </h1>
        <div className="header-actions">
          <label className="file-upload-btn">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传 CSV
          </label>
        </div>
      </header>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {!salesData && (
        <div className="empty-state">
          <div className="empty-state-content fade-in">
            <div className="empty-icon">📈</div>
            <h2>欢迎使用 TrendNavigator</h2>
            <p>上传您的销售数据 CSV 文件，开始探索数据趋势</p>
            <p className="empty-hint">CSV 格式：第一列为月份，后续列为各产品线销售额</p>
            <button
              className="primary-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              选择 CSV 文件
            </button>
          </div>
        </div>
      )}

      {salesData && (
        <div className="main-content fade-in">
          <button
            className="filter-toggle"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            筛选
          </button>

          <aside className={`filter-panel ${isFilterOpen ? 'open' : ''}`}>
            <div className="filter-header">
              <h3>产品线筛选</h3>
              <div className="filter-actions">
                <button onClick={handleSelectAll} className="link-btn">全选</button>
                <span className="filter-divider">|</span>
                <button onClick={handleDeselectAll} className="link-btn">重置</button>
              </div>
            </div>

            <div className="product-list">
              {salesData.series.map((s) => (
                <label
                  key={s.product}
                  className={`product-item ${selectedProducts.includes(s.product) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(s.product)}
                    onChange={() => toggleProduct(s.product)}
                    style={{ display: 'none' }}
                  />
                  <span
                    className="product-color-dot"
                    style={{ backgroundColor: productColors[s.product] }}
                  />
                  <span className="product-name">{s.product}</span>
                  {selectedProducts.includes(s.product) && (
                    <svg className="product-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </label>
              ))}
            </div>

            <div className="sort-section">
              <h3>排序方式</h3>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="sort-select"
              >
                <option value="value-desc">销售额降序</option>
                <option value="name-asc">产品名称</option>
              </select>
            </div>
          </aside>

          <main className="content-area">
            <div className="charts-section">
              {displayData && displayData.series.length > 0 && (
                <Visualizer
                  data={displayData}
                  currentMonthIndex={currentIndex}
                  selectedProducts={selectedProducts}
                  productColors={productColors}
                />
              )}
            </div>

            <TimelinePanel
              data={salesData}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              speed={speed}
              onIndexChange={handleIndexChange}
              onPlayToggle={handlePlayToggle}
              onSpeedChange={handleSpeedChange}
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
