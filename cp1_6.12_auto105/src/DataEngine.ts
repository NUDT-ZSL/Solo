/**
 * DataEngine.ts - 纯函数数据处理与状态机模块
 *
 * 【职责】
 *   1. 解析 CSV 销售数据文本为结构化时序数据
 *   2. 自动检测销售额环比变化超过20%的转折点月份
 *   3. 提供时间轴回放状态机（play/pause/step/goto/speed）
 *   4. 提供数据切片、排序、配色等工具函数
 *
 * 【输入】
 *   - CSV 文本字符串（parseCSV）
 *   - SalesData 结构化数据、月份索引、产品列表等（各工具函数）
 *
 * 【输出】
 *   - SalesData: { months, series, turningPoints }
 *   - Timeline 状态机实例（createTimelineStateMachine）
 *   - 切片/累计/排序/配色后的衍生数据
 *
 * 【被依赖】
 *   - src/App.tsx: 调用 parseCSV 解析上传文件，createTimelineStateMachine 驱动回放，
 *     sortSeries / getProductColors 进行排序和配色
 *   - src/components/Visualizer.tsx: 调用 isProductTurningPoint 判断转折点高亮
 *
 * 【依赖】无外部 React 依赖，纯 TypeScript 模块
 */

export interface SalesData {
  months: string[]
  series: { product: string; values: number[] }[]
  turningPoints: string[]
}

export interface TimelineState {
  currentIndex: number
  isPlaying: boolean
  speed: number
}

export type SortType = 'value-desc' | 'value-asc' | 'name-asc'

const TURNING_POINT_THRESHOLD = 0.2
const YEAR_MONTH_COUNT = 12

export function parseCSV(csvText: string): SalesData {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('CSV文件数据不足，至少需要表头和一行数据')
  }

  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim())

  if (headers.length < 6) {
    throw new Error('CSV文件至少需要包含1列月份和5列产品线数据')
  }

  const productNames = headers.slice(1)

  if (productNames.length < 5) {
    throw new Error('至少需要5个产品线数据列')
  }

  const months: string[] = []
  const series: { product: string; values: number[] }[] = productNames.map((name) => ({
    product: name,
    values: [],
  }))

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map((v) => v.trim())
    if (values.length !== headers.length) {
      throw new Error(`第${i + 1}行数据列数与表头不匹配`)
    }

    const month = values[0]
    if (!month) {
      throw new Error(`第${i + 1}行月份不能为空`)
    }
    months.push(month)

    for (let j = 0; j < productNames.length; j++) {
      const numValue = parseFloat(values[j + 1])
      if (isNaN(numValue)) {
        throw new Error(`第${i + 1}行"${productNames[j]}"列数据不是有效数字`)
      }
      series[j].values.push(numValue)
    }
  }

  if (months.length < 12) {
    throw new Error('至少需要12个月的数据')
  }

  const turningPoints = detectTurningPoints(months, series)

  return { months, series, turningPoints }
}

/**
 * 检测转折点：
 * 1. 月环比：比较相邻月份（monthIdx vs monthIdx-1）
 * 2. 跨年环比：当 monthIdx >= 12 时，与上一年同月比较（monthIdx vs monthIdx-12）
 * 边界处理：
 *   - 前值为0：若当前值非0则视为100%变化，标记为转折点
 *   - 前值为负：取绝对值计算变化率
 *   - 当前值和前值同号且前值非0：标准环比公式
 */
function detectTurningPoints(
  months: string[],
  series: { product: string; values: number[] }[]
): string[] {
  const turningPointSet = new Set<string>()

  for (let monthIdx = 1; monthIdx < months.length; monthIdx++) {
    for (const s of series) {
      if (checkMomChange(s.values, monthIdx, 1)) {
        turningPointSet.add(months[monthIdx])
        break
      }
      if (monthIdx >= YEAR_MONTH_COUNT && checkMomChange(s.values, monthIdx, YEAR_MONTH_COUNT)) {
        turningPointSet.add(months[monthIdx])
        break
      }
    }
  }

  return Array.from(turningPointSet)
}

function checkMomChange(
  values: number[],
  currentIdx: number,
  offset: number
): boolean {
  const prevIdx = currentIdx - offset
  if (prevIdx < 0) return false

  const currValue = values[currentIdx]
  const prevValue = values[prevIdx]

  if (prevValue === 0) {
    return currValue !== 0
  }

  const absPrev = Math.abs(prevValue)
  const absCurr = Math.abs(currValue)

  if (prevValue < 0 && currValue >= 0) return true
  if (prevValue >= 0 && currValue < 0) return true

  const changeRate = Math.abs((currValue - prevValue) / absPrev)
  return changeRate >= TURNING_POINT_THRESHOLD
}

export function getMonthData(data: SalesData, monthIndex: number): {
  month: string
  values: { product: string; value: number }[]
} {
  const values = data.series.map((s) => ({
    product: s.product,
    value: s.values[monthIndex] || 0,
  }))

  return {
    month: data.months[monthIndex] || '',
    values,
  }
}

export function getCumulativeData(
  data: SalesData,
  upToMonthIndex: number
): {
  months: string[]
  series: { product: string; values: number[] }[]
} {
  const months = data.months.slice(0, upToMonthIndex + 1)
  const series = data.series.map((s) => ({
    product: s.product,
    values: s.values.slice(0, upToMonthIndex + 1),
  }))

  return { months, series }
}

/**
 * 创建时间轴状态机
 * 数据流向：外部 play/pause/setSpeed 调用 → 更新内部 state → 通过 onTick 回调通知外部
 */
export function createTimelineStateMachine(totalMonths: number): {
  state: TimelineState
  goTo: (index: number) => void
  play: () => void
  pause: () => void
  setSpeed: (speed: number) => void
  step: () => void
  onTick: (callback: () => void) => void
  destroy: () => void
} {
  let state: TimelineState = {
    currentIndex: 0,
    isPlaying: false,
    speed: 1,
  }

  let tickCallback: (() => void) | null = null
  let intervalId: number | null = null

  function updateInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (state.isPlaying) {
      const intervalMs = 1000 / state.speed
      intervalId = window.setInterval(() => {
        step()
      }, intervalMs)
    }
  }

  function goTo(index: number) {
    const clampedIndex = Math.max(0, Math.min(totalMonths - 1, index))
    state = { ...state, currentIndex: clampedIndex }
    if (tickCallback) tickCallback()
  }

  function play() {
    state = { ...state, isPlaying: true }
    updateInterval()
    if (tickCallback) tickCallback()
  }

  function pause() {
    state = { ...state, isPlaying: false }
    updateInterval()
    if (tickCallback) tickCallback()
  }

  function setSpeed(speed: number) {
    state = { ...state, speed }
    updateInterval()
    if (tickCallback) tickCallback()
  }

  function step() {
    if (state.currentIndex >= totalMonths - 1) {
      pause()
      return
    }
    goTo(state.currentIndex + 1)
  }

  function onTick(callback: () => void) {
    tickCallback = callback
  }

  function destroy() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    get state() {
      return { ...state }
    },
    goTo,
    play,
    pause,
    setSpeed,
    step,
    onTick,
    destroy,
  }
}

export function sortSeries(
  series: { product: string; values: number[] }[],
  sortType: SortType,
  monthIndex: number
): { product: string; values: number[] }[] {
  const sorted = [...series]

  if (sortType === 'value-desc') {
    sorted.sort((a, b) => (b.values[monthIndex] || 0) - (a.values[monthIndex] || 0))
  } else if (sortType === 'value-asc') {
    sorted.sort((a, b) => (a.values[monthIndex] || 0) - (b.values[monthIndex] || 0))
  } else if (sortType === 'name-asc') {
    sorted.sort((a, b) => a.product.localeCompare(b.product))
  }

  return sorted
}

export function getProductColors(products: string[]): Record<string, string> {
  const palette = [
    '#00b4d8',
    '#f5c518',
    '#e63946',
    '#8ac926',
    '#9d4edd',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
  ]

  const colors: Record<string, string> = {}
  products.forEach((product, index) => {
    colors[product] = palette[index % palette.length]
  })

  return colors
}

export function isProductTurningPoint(
  data: SalesData,
  product: string,
  monthIndex: number
): boolean {
  if (monthIndex <= 0) return false

  const series = data.series.find((s) => s.product === product)
  if (!series) return false

  if (checkMomChange(series.values, monthIndex, 1)) return true
  if (monthIndex >= YEAR_MONTH_COUNT && checkMomChange(series.values, monthIndex, YEAR_MONTH_COUNT)) return true

  return false
}
