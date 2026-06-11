<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import StepCard from './StepCard.vue'
import type { Step, Recipe } from '../types'

const recipeTitle = ref('红烧肉')
const rawText = ref(
`步骤1: 将500克五花肉切块，冷水下锅焯水，加入姜片和料酒去腥，焯水5分钟
步骤2. 锅中放少许油，加入30克冰糖，小火慢慢炒糖色，大约3分钟至焦糖色
Step 3: 放入焯好水的五花肉，翻炒均匀上色，加入葱段和3片八角
4. 倒入2汤匙生抽、1汤匙老抽、1汤匙料酒，翻炒出香味约1分钟
步骤5：加入没过五花肉的热水，大火烧开后转小火，盖盖炖煮45分钟
步骤6: 开盖转大火，加入适量盐调味，收汁8分钟至汤汁浓稠即可`
)
const steps = ref<Step[]>([])
const activeIndex = ref<number>(0)
const completedIds = ref<Set<string>>(new Set())
const recipes = ref<Recipe[]>([])
const flowContainer = ref<HTMLElement | null>(null)
const cardRefs = ref<any[]>([])
const parseError = ref('')
const saveMsg = ref('')
const screenWidth = ref(window.innerWidth)

// 流动光点状态
type Dot = { x: number; connectorIdx: number }
const lightDots = ref<Dot[]>([])
let dotsRaf: number | null = null
const dotsStartTime = ref<number>(0)

const COMMON_INGREDIENTS = [
  '五花肉', '猪肉', '牛肉', '鸡肉', '羊肉', '鸡蛋', '豆腐', '土豆',
  '西红柿', '番茄', '黄瓜', '茄子', '青椒', '辣椒', '葱姜蒜', '葱', '姜', '蒜',
  '白菜', '青菜', '菠菜', '西兰花', '胡萝卜', '洋葱', '蘑菇', '香菇',
  '生抽', '老抽', '料酒', '盐', '糖', '冰糖', '醋', '酱油', '蚝油',
  '花椒', '八角', '桂皮', '香叶', '干辣椒', '豆瓣酱', '淀粉', '面粉',
  '米饭', '面条', '油', '香油', '鸡精', '味精', '胡椒粉'
]
// 默认时长：无法解析到时，使用此值（秒），0 表示不计时（显示完成按钮）
const DEFAULT_DURATION = 0

// === 响应式布局计算 ===
type LayoutMode = 'desktop' | 'tablet' | 'mobile'
const layoutMode = computed<LayoutMode>(() => {
  const w = screenWidth.value
  if (w >= 1024) return 'desktop'
  if (w >= 768) return 'tablet'
  return 'mobile'
})
const cardComputedWidth = computed(() => {
  switch (layoutMode.value) {
    case 'desktop': return 300
    case 'tablet':  return 280
    case 'mobile':  return Math.min(360, screenWidth.value - 32)
  }
})
const columns = computed(() => layoutMode.value === 'desktop' ? 2 : 1)
const cardColGap = computed(() => layoutMode.value === 'desktop' ? 40 : 24)
const cardRowGap = computed(() => 80) // 给连接线留空间

// 网格列数/行数计算
const totalRows = computed(() => Math.ceil(steps.value.length / Math.max(1, columns.value)))
// 每个步骤的网格位置(列,行)
function getGridPos(idx: number) {
  const col = idx % columns.value
  const row = Math.floor(idx / columns.value)
  return { col, row }
}
// 容器高度（响应式）
const containerHeight = computed(() => {
  const rows = totalRows.value
  // 每张卡片估算高度 300 + rowGap连接线空间
  const estCardH = 320
  return rows * estCardH + (rows - 1) * (cardRowGap.value - estCardH + estCardH)
})

// 连接线起止坐标计算（相对flow-wrapper）
function connectorFor(idx: number): null | {
  x1: number; y1: number; x2: number; y2: number; curve: boolean
} {
  if (idx >= steps.value.length - 1) return null
  const a = getGridPos(idx)
  const b = getGridPos(idx + 1)
  const cw = cardComputedWidth.value
  const cGapX = cardColGap.value
  const cGapY = cardRowGap.value
  const cardH = 320
  const centerOffsetX = cw / 2
  const midY = 160 // 卡片中上部

  const x1 = a.col * (cw + cGapX) + centerOffsetX
  const y1 = a.row * cGapY + midY

  const x2 = b.col * (cw + cGapX) + centerOffsetX
  const y2 = b.row * cGapY + midY

  return { x1, y1, x2, y2, curve: (a.col !== b.col || a.row !== b.row) }
}

const wrapperInnerWidth = computed(() => {
  return columns.value * cardComputedWidth.value + (columns.value - 1) * cardColGap.value
})
const wrapperInnerHeight = computed(() => {
  return totalRows.value * cardRowGap.value + 160 + 200
})

// 安全的渲染数组（避免模板中直接slice导致的边界问题）
const connectorCount = computed(() => Math.max(0, steps.value.length - 1))
const connectorIndices = computed(() =>
  Array.from({ length: connectorCount.value }, (_, i) => i)
)
const safeLightDots = computed(() => {
  const count = connectorCount.value
  return lightDots.value.slice(0, count)
})

// === 流动光点动画 ===
function startDotsAnimation(): void {
  stopDotsAnimation()
  dotsStartTime.value = performance.now()
  const count = connectorCount.value
  lightDots.value = Array.from({ length: count }, (_, i) => ({ x: 0, connectorIdx: i }))
  const loop = () => {
    const t = (performance.now() - dotsStartTime.value) / 1000
    for (let i = 0; i < lightDots.value.length; i++) {
      // 每个连接器偏移一点相位
      const phase = ((t + i * 0.33) % 1 + 1) % 1
      lightDots.value[i].x = phase
    }
    dotsRaf = requestAnimationFrame(loop)
  }
  dotsRaf = requestAnimationFrame(loop)
}
function stopDotsAnimation(): void {
  if (dotsRaf != null) {
    cancelAnimationFrame(dotsRaf)
    dotsRaf = null
  }
}

// 根据进度0-1计算路径上的点
function pointOnConnector(idx: number, t: number): { x: number; y: number } {
  const c = connectorFor(idx)
  if (!c) return { x: 0, y: 0 }
  return {
    x: c.x1 + (c.x2 - c.x1) * t,
    y: c.y1 + (c.y2 - c.y1) * t
  }
}

// === 解析增强 ===
function parseRecipe(): void {
  parseError.value = ''
  const text = rawText.value.trim()
  if (!text) {
    parseError.value = '请输入菜谱文本'
    return
  }

  // 多种前缀匹配：
  //  步骤1: 步骤 1： 步骤1. Step 1: STEP 2. 1) 1、 1. [1]
  const headerRegex = /(?:^\s*)(?:步骤|Step|STEP|step|第)?\s*(\d{1,3})\s*(?:[:：.、\)）]|\]\s*|(?=\s+[\u4e00-\u9fa5A-Za-z]))/gm
  const raw: string = '\n' + text
  const positions: { start: number; index: number }[] = []
  let m: RegExpExecArray | null
  while ((m = headerRegex.exec(raw)) !== null) {
    positions.push({ start: m.index + m[0].length, index: parseInt(m[1], 10) })
  }
  let parsed: Step[] = []
  if (positions.length >= 1) {
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const end = i + 1 < positions.length ? positions[i + 1].start - raw.length + text.length + 1 : text.length
      // 映射回原始text的位置
      const sInText = p.start - 1
      const eInText = i + 1 < positions.length ? positions[i + 1].start - 1 : text.length
      const slice = text.slice(Math.max(0, sInText), Math.max(0, eInText)).trim()
      if (slice) {
        const step = parseLine(slice, p.index)
        if (step) parsed.push(step)
      }
    }
  } else {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
    parsed = lines
      .map((line, i) => parseLine(line, i + 1))
      .filter((s): s is Step => s != null)
  }
  // 按序号排序
  parsed.sort((a, b) => a.index - b.index)
  // 重新赋值连续index
  parsed = parsed.map((s, i) => ({ ...s, index: i + 1 }))
  if (parsed.length === 0) {
    parseError.value = '未能解析出任何步骤，请检查格式'
    return
  }
  steps.value = parsed
  activeIndex.value = 0
  completedIds.value.clear()
  nextTick(() => {
    scrollToActive()
    startDotsAnimation()
  })
}

function parseLine(content: string, index: number): Step | null {
  if (!content) return null
  // 时长解析：支持 中文/英文 分钟 分 min m 秒 sec s，以及 "半分钟" "1.5分钟"
  const durationRegex = /(\d+(?:\.\d+)?)\s*(分钟|分|钟|min|mins|m|秒|sec|secs|s)|(半)\s*(分钟|分)/gi
  let totalSec = 0
  let actionText = content
  let hasTime = false
  const dm = Array.from(content.matchAll(durationRegex))
  if (dm.length > 0) {
    hasTime = true
    for (const m of dm) {
      if (m[3] === '半') {
        totalSec += 30
      } else {
        const num = parseFloat(m[1])
        const unit = (m[2] || '').toLowerCase()
        if (unit.startsWith('分') || unit === '钟' || unit === 'min' || unit === 'mins' || unit === 'm') {
          totalSec += Math.round(num * 60)
        } else {
          totalSec += Math.round(num)
        }
      }
    }
    actionText = content.replace(durationRegex, '').trim()
  }
  // 进一步去除前缀序号残留（如内容开头还有 "1"）
  actionText = actionText.replace(/^\s*\d{1,3}\s*[:：.、\)）]\s*/, '').trim()
  const actionClean = actionText.replace(/[，,。.\s]+$/, '').trim()
  const titleMatch = actionClean.split(/[，,。.;；!！?？]/)[0].slice(0, 18) || `步骤 ${index}`
  const ingredients: string[] = []
  for (const ing of COMMON_INGREDIENTS) {
    if (content.includes(ing) && !ingredients.includes(ing)) {
      ingredients.push(ing)
    }
  }
  return {
    id: uuidv4(),
    index,
    title: titleMatch,
    action: actionClean || content,
    ingredients: ingredients.slice(0, 6),
    duration: hasTime ? totalSec : DEFAULT_DURATION,
    detail: '',
    image: ''
  }
}

// === 滚动到活动步骤到视野中央 ===
function scrollToActive(): void {
  nextTick(() => {
    if (activeIndex.value < 0 || activeIndex.value >= steps.value.length) return
    const el = cardRefs.value[activeIndex.value]
    if (!el || !el.$el) return
    const cardEl: HTMLElement = el.$el
    const container = flowContainer.value
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const elRect = cardEl.getBoundingClientRect()
    const deltaTop = elRect.top - cRect.top - (cRect.height - elRect.height) / 2
    const targetTop = container.scrollTop + deltaTop
    container.scrollTo({ top: Math.max(0, targetTop), left: 0, behavior: 'smooth' })
  })
}

// === 事件 ===
function onStart(stepId: string): void {
  const idx = steps.value.findIndex((s) => s.id === stepId)
  if (idx !== -1 && idx !== activeIndex.value) {
    activeIndex.value = idx
    scrollToActive()
  }
}
function onComplete(stepId: string): void {
  completedIds.value.add(stepId)
  const idx = steps.value.findIndex((s) => s.id === stepId)
  if (idx !== -1 && idx < steps.value.length - 1) {
    activeIndex.value = idx + 1
    nextTick(scrollToActive)
  } else if (idx === steps.value.length - 1) {
    activeIndex.value = -1
  }
}

// === API ===
async function loadRecipes(): Promise<void> {
  try {
    const res = await axios.get('/api/recipes')
    recipes.value = res.data as Recipe[]
  } catch { /* ignore */ }
}
async function saveRecipe(): Promise<void> {
  if (steps.value.length === 0) {
    parseRecipe()
    if (steps.value.length === 0) return
  }
  try {
    const res = await axios.post('/api/recipes', {
      title: recipeTitle.value || '未命名菜谱',
      rawText: rawText.value,
      steps: steps.value
    })
    recipes.value.unshift(res.data)
    saveMsg.value = '✓ 保存成功'
    setTimeout(() => (saveMsg.value = ''), 2000)
  } catch {
    saveMsg.value = '✗ 保存失败'
    setTimeout(() => (saveMsg.value = ''), 2000)
  }
}
function loadRecipe(recipe: Recipe): void {
  recipeTitle.value = recipe.title
  rawText.value = recipe.rawText
  parseRecipe()
}
async function deleteRecipe(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  try {
    await axios.delete(`/api/recipes/${id}`)
    recipes.value = recipes.value.filter((r) => r.id !== id)
  } catch { /* ignore */ }
}
function setCardRef(el: any, idx: number): void {
  cardRefs.value[idx] = el
}
function onResize(): void {
  screenWidth.value = window.innerWidth
  startDotsAnimation()
}

watch(
  () => steps.value.length,
  () => startDotsAnimation()
)

onMounted(() => {
  parseRecipe()
  loadRecipes()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  stopDotsAnimation()
  window.removeEventListener('resize', onResize)
})

// SVG path 生成(贝塞尔曲线连接两点)
function svgPath(c: { x1: number; y1: number; x2: number; y2: number; curve: boolean }): string {
  if (!c.curve || Math.abs(c.y2 - c.y1) < 5) {
    const mx = (c.x1 + c.x2) / 2
    const my = c.y1
    return `M ${c.x1} ${c.y1} L ${c.x2} ${c.y2}`
  }
  // 跨行连接：先走水平到一半，再垂直下，再水平（平滑）
  const midY = (c.y1 + c.y2) / 2
  const cp1x = c.x1, cp1y = midY
  const cp2x = c.x2, cp2y = midY
  return `M ${c.x1} ${c.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${c.x2} ${c.y2}`
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="brand">
        <div class="brand-icon">🍳</div>
        <div class="brand-text">
          <h1>回声食谱</h1>
          <p>交互式菜谱导航 · 让做菜更从容</p>
        </div>
      </div>
      <div class="layout-badge" :title="`布局模式: ${layoutMode}`">
        {{ layoutMode === 'desktop' ? '🖥 桌面 · 双列' : layoutMode === 'tablet' ? '📱 平板 · 单列' : '📲 手机 · 自适应' }}
      </div>
    </header>

    <section class="input-section">
      <div class="input-card">
        <div class="input-row">
          <div class="field-group grow">
            <label>菜谱名称</label>
            <input v-model="recipeTitle" type="text" placeholder="给菜谱起个名字" />
          </div>
          <div class="field-group">
            <label>&nbsp;</label>
            <button class="btn btn-primary" @click="parseRecipe">✨ 解析菜谱</button>
          </div>
          <div class="field-group">
            <label>&nbsp;</label>
            <button class="btn btn-success" @click="saveRecipe">
              💾 保存
              <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
            </button>
          </div>
        </div>
        <div class="field-group">
          <label>菜谱文本（支持 步骤1: / Step 1: / 1. / 1、 多种写法，自动识别时长）</label>
          <textarea
            v-model="rawText"
            rows="7"
            placeholder="支持写法示例：&#10;步骤1: 把水烧开，煮5分钟&#10;步骤2. 加入鸡蛋&#10;Step 3: 小火慢炖30秒&#10;4、捞起过凉水即可"
          ></textarea>
        </div>
        <div class="parse-meta" v-if="steps.length > 0">
          ✅ 已解析出 <b>{{ steps.length }}</b> 个步骤，
          其中 <b>{{ steps.filter(s => s.duration > 0).length }}</b> 步带自动计时，
          总时长约 <b>{{ Math.ceil(steps.reduce((a, s) => a + s.duration, 0) / 60) || '<1' }}</b> 分钟
        </div>
        <p v-if="parseError" class="error-msg">{{ parseError }}</p>

        <div v-if="recipes.length > 0" class="recipe-list">
          <div class="list-title">
            <span>📚 已保存菜谱</span>
            <span class="list-count">{{ recipes.length }} 份</span>
          </div>
          <div class="recipe-chips">
            <div
              v-for="r in recipes"
              :key="r.id"
              class="recipe-chip"
              @click="loadRecipe(r)"
            >
              <span class="chip-title">{{ r.title }}</span>
              <span class="chip-steps">{{ r.steps.length }}步</span>
              <button class="chip-del" @click="deleteRecipe(r.id, $event)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="flow-section" v-if="steps.length > 0">
      <div class="flow-toolbar">
        <div class="progress-info">
          <span class="info-label">进度</span>
          <span class="info-value">{{ completedIds.size }} / {{ steps.length }}</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(completedIds.size / steps.length) * 100}%` }"
            ></div>
          </div>
        </div>
        <div class="active-info" v-if="activeIndex >= 0 && activeIndex < steps.length">
          <span class="info-label">当前步骤</span>
          <span class="info-value highlight">
            步骤 {{ steps[activeIndex].index }} · {{ steps[activeIndex].title }}
          </span>
        </div>
        <div class="active-info done" v-else-if="completedIds.size === steps.length">
          <span class="info-label">🎉 全部完成，享受美味！</span>
        </div>
      </div>

      <div class="flow-container" ref="flowContainer">
        <div
          class="flow-wrapper"
          :style="{
            width: `${wrapperInnerWidth}px`,
            height: `${wrapperInnerHeight}px`
          }"
        >
          <!-- SVG 连接线层 -->
          <svg
            class="connector-svg"
            :width="wrapperInnerWidth"
            :height="wrapperInnerHeight"
            :viewBox="`0 0 ${wrapperInnerWidth} ${wrapperInnerHeight}`"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FF6B35" />
                <stop offset="100%" stop-color="#F7C948" />
              </linearGradient>
              <linearGradient id="lineGradientV" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FF6B35" />
                <stop offset="100%" stop-color="#F7C948" />
              </linearGradient>
              <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="arrowHead"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#F7C948" />
              </marker>
            </defs>
            <template v-for="(_, idx) in steps.slice(0, -1)" :key="`line-${idx}`">
              <path
                v-if="connectorFor(idx)"
                :d="svgPath(connectorFor(idx)!)"
                :stroke="connectorFor(idx)!.curve ? 'url(#lineGradientV)' : 'url(#lineGradient)'"
                stroke-width="3"
                stroke-linecap="round"
                fill="none"
                marker-end="url(#arrowHead)"
                opacity="0.85"
              />
            </template>
            <!-- 流动光点 (RAF驱动) -->
            <template v-for="(dot, i) in lightDots" :key="`dot-${i}`">
              <circle
                v-if="connectorFor(i)"
                :cx="pointOnConnector(i, dot.x).x"
                :cy="pointOnConnector(i, dot.x).y"
                r="7"
                fill="#FF6B35"
                filter="url(#dotGlow)"
              />
              <circle
                v-if="connectorFor(i)"
                :cx="pointOnConnector(i, dot.x).x"
                :cy="pointOnConnector(i, dot.x).y"
                r="3"
                fill="#FFF8F0"
              />
            </template>
          </svg>

          <!-- 卡片层：绝对定位 -->
          <template v-for="(step, idx) in steps" :key="step.id">
            <div
              class="card-slot"
              :style="{
                left: `${getGridPos(idx).col * (cardComputedWidth + cardColGap)}px`,
                top: `${getGridPos(idx).row * cardRowGap}px`,
                width: `${cardComputedWidth}px`
              }"
            >
              <StepCard
                :ref="(el: any) => setCardRef(el, idx)"
                :step="step"
                :is-active="idx === activeIndex"
                :is-completed="completedIds.has(step.id)"
                @start="onStart"
                @complete="onComplete"
              />
            </div>
          </template>
        </div>
      </div>

      <div class="flow-hint">
        <span>↓ 上下滑动 · 点击卡片展开详情与配图 · 点击 ▶ 开始计时</span>
      </div>
    </section>

    <footer class="app-footer">
      <p>🍽️ 回声食谱 · 让每一道菜都有回响</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(255, 203, 141, 0.25) 0%, transparent 60%),
    radial-gradient(900px 500px at 110% 20%, rgba(255, 107, 53, 0.14) 0%, transparent 60%),
    linear-gradient(180deg, #FFF8F0 0%, #FFEFDC 100%);
  padding: 24px 0 60px;
}
.app-header {
  max-width: 1200px;
  margin: 0 auto 28px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #FF6B35 0%, #F7C948 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3);
}
.brand-text h1 {
  font-size: 26px;
  font-weight: 800;
  color: #2D1810;
  letter-spacing: 0.5px;
}
.brand-text p {
  font-size: 13px;
  color: rgba(45, 24, 16, 0.6);
  margin-top: 2px;
}
.layout-badge {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(45, 24, 16, 0.1);
  border-radius: 20px;
  font-size: 12px;
  color: rgba(45, 24, 16, 0.65);
  font-weight: 500;
}
.input-section {
  max-width: 1200px;
  margin: 0 auto 32px;
  padding: 0 24px;
}
.input-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 28px rgba(45, 24, 16, 0.1);
  border: 1px solid rgba(45, 24, 16, 0.08);
}
.input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-group.grow {
  flex: 1;
  min-width: 220px;
}
.field-group label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(45, 24, 16, 0.75);
}
.field-group input,
.field-group textarea {
  padding: 10px 14px;
  border: 1.5px solid rgba(45, 24, 16, 0.15);
  border-radius: 10px;
  font-size: 14px;
  color: #2D1810;
  background: #FFFAF4;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  line-height: 1.6;
  font-family: inherit;
}
.field-group input:focus,
.field-group textarea:focus {
  border-color: #FF6B35;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
}
.field-group textarea {
  resize: vertical;
  min-height: 120px;
}
.parse-meta {
  margin-top: 14px;
  padding: 10px 14px;
  background: linear-gradient(90deg, rgba(255, 107, 53, 0.08), rgba(247, 201, 72, 0.1));
  border-radius: 10px;
  font-size: 13px;
  color: #4a2c1c;
}
.parse-meta b {
  color: #FF6B35;
}
.btn {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary {
  background: linear-gradient(135deg, #FF6B35, #F7C948);
  color: #fff;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.45);
}
.btn-success {
  background: #2D1810;
  color: #fff;
}
.btn-success:hover {
  background: #38A169;
}
.save-msg {
  font-size: 12px;
  opacity: 0.9;
}
.error-msg {
  margin-top: 10px;
  color: #E53E3E;
  font-size: 13px;
  font-weight: 500;
}
.recipe-list {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px dashed rgba(45, 24, 16, 0.12);
}
.list-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #2D1810;
}
.list-count {
  font-size: 12px;
  color: rgba(45, 24, 16, 0.5);
  font-weight: 500;
}
.recipe-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.recipe-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 14px;
  background: #FFFAF4;
  border: 1.5px solid rgba(45, 24, 16, 0.12);
  border-radius: 22px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.recipe-chip:hover {
  border-color: #FF6B35;
  background: #FFF3EA;
  transform: translateY(-1px);
}
.chip-title {
  font-size: 13px;
  font-weight: 600;
  color: #2D1810;
}
.chip-steps {
  font-size: 11px;
  color: rgba(45, 24, 16, 0.55);
  background: rgba(45, 24, 16, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}
.chip-del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(229, 62, 62, 0.12);
  color: #E53E3E;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.chip-del:hover {
  background: #E53E3E;
  color: #fff;
}
.flow-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
.flow-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  border: 1px solid rgba(45, 24, 16, 0.08);
  margin-bottom: 18px;
}
.progress-info,
.active-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.info-label {
  font-size: 12px;
  color: rgba(45, 24, 16, 0.6);
  font-weight: 600;
}
.info-value {
  font-size: 14px;
  font-weight: 700;
  color: #2D1810;
}
.info-value.highlight {
  color: #FF6B35;
}
.active-info.done .info-label {
  font-size: 15px;
  font-weight: 700;
  color: #38A169;
}
.progress-bar {
  width: 160px;
  height: 6px;
  background: rgba(45, 24, 16, 0.1);
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF6B35, #38A169);
  border-radius: 6px;
  transition: width 0.4s ease;
}
.flow-container {
  max-height: calc(100vh - 220px);
  min-height: 500px;
  overflow: auto;
  padding: 30px 10px 50px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 16px;
  border: 1px solid rgba(45, 24, 16, 0.08);
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  position: relative;
}
.flow-container::-webkit-scrollbar {
  width: 10px;
}
.flow-container::-webkit-scrollbar-track {
  background: rgba(45, 24, 16, 0.05);
  border-radius: 10px;
}
.flow-container::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #FF6B35, #F7C948);
  border-radius: 10px;
}
.flow-wrapper {
  position: relative;
  margin: 0 auto;
}
.connector-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}
.card-slot {
  position: absolute;
  z-index: 1;
  will-change: transform;
}
.flow-hint {
  text-align: center;
  padding: 14px 0 4px;
  font-size: 12px;
  color: rgba(45, 24, 16, 0.55);
}
.app-footer {
  margin-top: 40px;
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: rgba(45, 24, 16, 0.5);
}

/* 响应式：手机居中单列 */
@media (max-width: 767px) {
  .app-header {
    padding: 0 16px;
    margin-bottom: 20px;
  }
  .brand-text h1 {
    font-size: 22px;
  }
  .input-section {
    padding: 0 16px;
  }
  .input-card {
    padding: 18px;
  }
  .input-row {
    gap: 12px;
  }
  .field-group.grow {
    min-width: 100%;
    width: 100%;
  }
  .flow-section {
    padding: 0 16px;
  }
  .flow-toolbar {
    padding: 12px 14px;
    gap: 14px;
  }
  .progress-bar {
    width: 100px;
  }
}

/* 平板：单列 */
@media (min-width: 768px) and (max-width: 1023px) {
  .flow-wrapper {
    margin: 0 auto;
  }
}
</style>
