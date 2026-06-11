<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import StepCard from './StepCard.vue'
import type { Step, Recipe } from '../types'

const recipeTitle = ref('红烧肉')
const rawText = ref(
`步骤1: 将500克五花肉切块，冷水下锅焯水，加入姜片和料酒去腥，焯水5分钟
步骤2: 锅中放少许油，加入30克冰糖，小火慢慢炒糖色，大约3分钟至焦糖色
步骤3: 放入焯好水的五花肉，翻炒均匀上色，加入葱段和3片八角
步骤4: 倒入2汤匙生抽、1汤匙老抽、1汤匙料酒，翻炒出香味约1分钟
步骤5: 加入没过五花肉的热水，大火烧开后转小火，盖盖炖煮45分钟
步骤6: 开盖转大火，加入适量盐调味，收汁8分钟至汤汁浓稠即可`
)
const steps = ref<Step[]>([])
const activeIndex = ref<number>(0)
const completedIds = ref<Set<string>>(new Set())
const recipes = ref<Recipe[]>([])
const flowContainer = ref<HTMLElement | null>(null)
const flowWrapper = ref<HTMLElement | null>(null)
const cardRefs = ref<any[]>([])
const parseError = ref('')
const saveMsg = ref('')
const cardWidth = ref(300)
const cardGap = ref(60)
const wrapperWidth = ref(0)
const containerWidth = ref(0)

const COMMON_INGREDIENTS = [
  '五花肉', '猪肉', '牛肉', '鸡肉', '羊肉', '鸡蛋', '豆腐', '土豆',
  '西红柿', '番茄', '黄瓜', '茄子', '青椒', '辣椒', '葱姜蒜', '葱', '姜', '蒜',
  '白菜', '青菜', '菠菜', '西兰花', '胡萝卜', '洋葱', '蘑菇', '香菇',
  '生抽', '老抽', '料酒', '盐', '糖', '冰糖', '醋', '酱油', '蚝油',
  '花椒', '八角', '桂皮', '香叶', '干辣椒', '豆瓣酱', '淀粉', '面粉',
  '米饭', '面条', '油', '香油', '鸡精', '味精', '胡椒粉'
]

function parseRecipe(): void {
  parseError.value = ''
  const text = rawText.value.trim()
  if (!text) {
    parseError.value = '请输入菜谱文本'
    return
  }
  const stepRegex = /步骤\s*(\d+)\s*[:：]\s*([\s\S]*?)(?=(?:步骤\s*\d+\s*[:：])|$)/g
  const matches = Array.from(text.matchAll(stepRegex))
  if (matches.length === 0) {
    const lines = text.split(/\n+/).filter((l) => l.trim())
    const parsed = lines.map((line, idx) => parseLine(line.trim(), idx + 1))
    steps.value = parsed.filter((s): s is Step => s != null)
  } else {
    steps.value = matches
      .map((m) => {
        const index = parseInt(m[1], 10)
        const content = m[2].trim()
        return parseLine(content, index)
      })
      .filter((s): s is Step => s != null)
  }
  if (steps.value.length === 0) {
    parseError.value = '未能解析出任何步骤，请检查格式'
    return
  }
  activeIndex.value = 0
  completedIds.value.clear()
  nextTick(() => {
    scrollToActive()
    measureLayout()
  })
}

function parseLine(content: string, index: number): Step | null {
  if (!content) return null
  const durationRegex = /(\d+(?:\.\d+)?)\s*(分钟|分|min|m|秒|sec|s)/gi
  let totalSec = 0
  let actionText = content
  const dm = Array.from(content.matchAll(durationRegex))
  if (dm.length > 0) {
    for (const m of dm) {
      const num = parseFloat(m[1])
      const unit = m[2].toLowerCase()
      if (unit.startsWith('分') || unit === 'min' || unit === 'm') {
        totalSec += Math.round(num * 60)
      } else {
        totalSec += Math.round(num)
      }
    }
    actionText = content.replace(durationRegex, '').trim()
  }
  const actionClean = actionText.replace(/[，,。.\s]+$/, '').trim()
  const titleMatch = actionClean.split(/[，,。.;；]/)[0].slice(0, 16)
  const ingredients: string[] = []
  for (const ing of COMMON_INGREDIENTS) {
    if (content.includes(ing) && !ingredients.includes(ing)) {
      ingredients.push(ing)
    }
  }
  return {
    id: uuidv4(),
    index,
    title: titleMatch || `步骤 ${index}`,
    action: actionClean || content,
    ingredients: ingredients.slice(0, 6),
    duration: totalSec,
    detail: '',
    image: ''
  }
}

function measureLayout(): void {
  if (!flowContainer.value) return
  const rect = flowContainer.value.getBoundingClientRect()
  containerWidth.value = rect.width
  updateCardMetrics()
}

function updateCardMetrics(): void {
  if (!flowContainer.value) return
  const w = containerWidth.value
  if (w < 768) {
    cardWidth.value = Math.min(360, w - 32)
    cardGap.value = 24
  } else if (w < 1024) {
    cardWidth.value = 280
    cardGap.value = 24
  } else {
    cardWidth.value = 300
    cardGap.value = 60
  }
  wrapperWidth.value =
    steps.value.length * cardWidth.value +
    Math.max(0, steps.value.length - 1) * cardGap.value
}

watch(
  () => steps.value.length,
  () => updateCardMetrics()
)

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
    nextTick(() => {
      scrollToActive()
    })
  } else if (idx === steps.value.length - 1) {
    activeIndex.value = -1
  }
}

function scrollToActive(): void {
  nextTick(() => {
    if (activeIndex.value < 0) return
    const el = cardRefs.value[activeIndex.value]
    if (!el || !el.$el) return
    const cardEl: HTMLElement = el.$el
    const container = flowContainer.value
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    const scrollLeft =
      container.scrollLeft +
      (cardRect.left - containerRect.left) -
      (containerRect.width - cardWidth.value) / 2
    container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    })
  })
}

async function loadRecipes(): Promise<void> {
  try {
    const res = await axios.get('/api/recipes')
    recipes.value = res.data as Recipe[]
  } catch {
    // ignore
  }
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
  steps.value = [...recipe.steps]
  activeIndex.value = 0
  completedIds.value.clear()
  nextTick(() => {
    scrollToActive()
    measureLayout()
  })
}

async function deleteRecipe(id: string, e: Event): Promise<void> {
  e.stopPropagation()
  try {
    await axios.delete(`/api/recipes/${id}`)
    recipes.value = recipes.value.filter((r) => r.id !== id)
  } catch {
    // ignore
  }
}

function setCardRef(el: any, idx: number): void {
  cardRefs.value[idx] = el
}

function handleResize(): void {
  measureLayout()
  scrollToActive()
}

onMounted(() => {
  parseRecipe()
  loadRecipes()
  window.addEventListener('resize', handleResize)
})

function getConnectorPosition(idx: number): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = idx * (cardWidth.value + cardGap.value) + cardWidth.value
  const y1 = 200
  const x2 = (idx + 1) * (cardWidth.value + cardGap.value)
  const y2 = 200
  return { x1, y1, x2, y2 }
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
    </header>

    <section class="input-section">
      <div class="input-card">
        <div class="input-row">
          <div class="field-group grow">
            <label>菜谱名称</label>
            <input
              v-model="recipeTitle"
              type="text"
              placeholder="给菜谱起个名字"
            />
          </div>
          <div class="field-group">
            <label>&nbsp;</label>
            <button class="btn btn-primary" @click="parseRecipe">
              ✨ 解析菜谱
            </button>
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
          <label>菜谱文本（格式：步骤X: 操作描述 时长）</label>
          <textarea
            v-model="rawText"
            rows="6"
            placeholder="步骤1: 把水烧开，煮5分钟&#10;步骤2: 加入鸡蛋，煮8分钟&#10;步骤3: 捞起过凉水，即可"
          ></textarea>
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
          <span class="info-value">
            {{ completedIds.size }} / {{ steps.length }}
          </span>
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
        <div class="active-info done" v-else-if="completedIds.size === steps.length && steps.length > 0">
          <span class="info-label">🎉 全部完成</span>
        </div>
      </div>

      <div
        class="flow-container"
        ref="flowContainer"
      >
        <div
          class="flow-wrapper"
          ref="flowWrapper"
          :style="{ width: `${wrapperWidth}px` }"
        >
          <svg
            class="connector-svg"
            :viewBox="`0 0 ${wrapperWidth} 400`"
            :width="wrapperWidth"
            :height="400"
          >
            <defs>
              <linearGradient
                id="lineGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stop-color="#FF6B35" />
                <stop offset="100%" stop-color="#F7C948" />
              </linearGradient>
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
            <template v-for="(_, idx) in steps.slice(0, -1)" :key="idx">
              <g>
                <line
                  :x1="getConnectorPosition(idx).x1"
                  :y1="getConnectorPosition(idx).y1"
                  :x2="getConnectorPosition(idx).x2"
                  :y2="getConnectorPosition(idx).y2"
                  stroke="url(#lineGradient)"
                  stroke-width="3"
                  stroke-linecap="round"
                  marker-end="url(#arrowHead)"
                  opacity="0.85"
                />
                <circle
                  r="6"
                  fill="#FF6B35"
                  :stroke="completedIds.has(steps[idx].id) ? '#38A169' : '#FF6B35'"
                  stroke-width="2"
                >
                  <animateMotion
                    :dur="'1s'"
                    repeatCount="indefinite"
                    begin="0s"
                  >
                    <mpath />
                    <animate
                      attributeName="path"
                      :values="`M ${getConnectorPosition(idx).x1} ${getConnectorPosition(idx).y1} L ${getConnectorPosition(idx).x2} ${getConnectorPosition(idx).y2}`;
                               `M ${getConnectorPosition(idx).x1} ${getConnectorPosition(idx).y1} L ${getConnectorPosition(idx).x2} ${getConnectorPosition(idx).y2}`"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </animateMotion>
                  <animate
                    attributeName="cx"
                    :values="`${getConnectorPosition(idx).x1};${getConnectorPosition(idx).x2}`"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    :values="`${getConnectorPosition(idx).y1};${getConnectorPosition(idx).y2}`"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            </template>
          </svg>

          <div
            class="cards-row"
            :style="{ gap: `${cardGap}px` }"
          >
            <StepCard
              v-for="(step, idx) in steps"
              :key="step.id"
              :ref="(el: any) => setCardRef(el, idx)"
              :step="step"
              :is-active="idx === activeIndex"
              :is-completed="completedIds.has(step.id)"
              @start="onStart"
              @complete="onComplete"
              :style="{ width: `${cardWidth}px` }"
            />
          </div>
        </div>
      </div>

      <div class="flow-hint">
        <span>← 左右滑动查看更多步骤 · 点击卡片展开详情 · 点击 ▶ 开始计时</span>
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
  background: linear-gradient(180deg, #FFF8F0 0%, #FFEFDC 100%);
  padding: 24px 0 60px;
}
.app-header {
  max-width: 1200px;
  margin: 0 auto 28px;
  padding: 0 24px;
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
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
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
.btn {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
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
  margin-left: 6px;
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
  overflow-x: auto;
  overflow-y: visible;
  padding: 20px 4px 28px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  position: relative;
}
.flow-container::-webkit-scrollbar {
  height: 8px;
}
.flow-container::-webkit-scrollbar-track {
  background: rgba(45, 24, 16, 0.06);
  border-radius: 8px;
}
.flow-container::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #FF6B35, #F7C948);
  border-radius: 8px;
}
.flow-wrapper {
  position: relative;
  padding-top: 0;
  min-height: 400px;
}
.connector-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}
.cards-row {
  display: flex;
  position: relative;
  z-index: 1;
  padding-top: 0;
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
</style>
