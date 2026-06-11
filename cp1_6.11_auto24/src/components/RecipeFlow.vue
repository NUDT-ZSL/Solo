<template>
  <div class="recipe-flow">
    <section class="input-section">
      <div class="input-card">
        <div class="input-header">
          <h2 class="input-title">📋 输入菜谱</h2>
          <p class="input-hint">格式示例：步骤1: 加入鸡蛋和番茄，中火翻炒2分钟</p>
        </div>

        <div class="input-body">
          <div class="title-input-wrap">
            <label class="form-label">菜谱名称</label>
            <input
              v-model="recipeTitle"
              type="text"
              class="title-input"
              placeholder="例如：番茄炒蛋"
            />
          </div>

          <div class="textarea-wrap">
            <label class="form-label">步骤内容</label>
            <textarea
              v-model="rawText"
              class="recipe-textarea"
              placeholder="粘贴或输入您的菜谱步骤...&#10;&#10;步骤1: 鸡蛋打散，加入少许盐，搅拌均匀&#10;步骤2: 热锅凉油，倒入蛋液，中火翻炒1分钟盛出&#10;步骤3: 加入番茄块，翻炒2分钟至出汁&#10;步骤4: 加入炒好的鸡蛋，加入糖和盐，翻炒30秒出锅"
              rows="8"
            ></textarea>
          </div>

          <div class="action-buttons">
            <button
              class="btn btn-primary"
              :disabled="!rawText.trim() || isParsing"
              @click="handleParse"
            >
              <span v-if="isParsing" class="btn-spinner"></span>
              {{ isParsing ? '解析中...' : '✨ 解析菜谱' }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="steps.length === 0"
              @click="handleReset"
            >
              🔄 重置
            </button>
            <button
              v-if="steps.length > 0"
              class="btn btn-success"
              @click="handleAutoStart"
            >
              ▶️ 自动开始
            </button>
          </div>

          <div v-if="errorMessage" class="error-message">
            ⚠️ {{ errorMessage }}
          </div>

          <div v-if="parseWarnings.length > 0" class="warnings-wrap">
            <p class="warnings-title">💡 解析提示（{{ parseWarnings.length }}）：</p>
            <ul class="warnings-list">
              <li v-for="(w, idx) in parseWarnings" :key="idx" class="warning-item">
                {{ w }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="sampleRecipes.length > 0" class="samples-wrap">
          <p class="samples-label">💡 试试示例菜谱：</p>
          <div class="samples-list">
            <button
              v-for="(sample, idx) in sampleRecipes"
              :key="idx"
              class="sample-btn"
              @click="loadSample(sample)"
            >
              {{ sample.name }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="steps.length > 0" class="flow-section">
      <div class="flow-header">
        <h2 class="flow-title">🍳 烹饪流程</h2>
        <div class="flow-stats">
          <span class="stat-item">
            <span class="stat-value">{{ completedCount }}</span>
            <span class="stat-label">已完成</span>
          </span>
          <span class="stat-divider">/</span>
          <span class="stat-item">
            <span class="stat-value">{{ steps.length }}</span>
            <span class="stat-label">总步骤</span>
          </span>
          <span class="stat-item total-time">
            <span class="stat-icon">⏱</span>
            <span class="stat-value">{{ formatTotalTime }}</span>
            <span class="stat-label">预计时长</span>
          </span>
        </div>
        <div v-if="completedCount === steps.length && steps.length > 0" class="all-done">
          🎉 恭喜！所有步骤已完成！
        </div>
      </div>

      <div class="progress-track-wrap">
        <div class="progress-track">
          <div
            class="progress-track-fill"
            :style="{ width: `${trackProgress}%` }"
          ></div>
          <div
            v-for="(step, idx) in steps"
            :key="step.id"
            class="progress-dot"
            :class="{ active: activeStepIndex >= idx, completed: step.status === 'completed' }"
            :style="{ left: `${(idx / Math.max(steps.length - 1, 1)) * 100}%` }"
          ></div>
        </div>
      </div>

      <div ref="flowContainerRef" class="flow-container">
        <div class="flow-grid">
          <template v-for="(step, idx) in steps" :key="step.id">
            <div class="card-slot" :style="{ order: idx }">
              <StepCard
                :step="step"
                :is-active="activeStepIndex === idx"
                @play="handleStepPlay"
                @complete="handleStepComplete"
                @update="handleStepUpdate"
              />
            </div>

            <div
              v-if="idx < steps.length - 1"
              class="connector-slot"
              :style="{ order: idx + 0.5 }"
            >
              <ConnectorLine
                :is-active="activeStepIndex > idx"
                :is-completed="steps[idx].status === 'completed'"
                direction="horizontal"
              />
            </div>
          </template>
        </div>

        <div class="mobile-flow">
          <template v-for="(step, idx) in steps" :key="`m-${step.id}`">
            <StepCard
              :step="step"
              :is-active="activeStepIndex === idx"
              @play="handleStepPlay"
              @complete="handleStepComplete"
              @update="handleStepUpdate"
            />

            <div v-if="idx < steps.length - 1" class="mobile-connector-wrap">
              <ConnectorLine
                :is-active="activeStepIndex > idx"
                :is-completed="steps[idx].status === 'completed'"
                direction="vertical"
              />
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import type { RecipeStep } from '../types'
import StepCard from './StepCard.vue'
import ConnectorLine from './ConnectorLine.vue'
import { parseRecipeText } from '../utils/recipeParser'

const rawText = ref('')
const recipeTitle = ref('')
const steps = ref<RecipeStep[]>([])
const activeStepIndex = ref(-1)
const isParsing = ref(false)
const errorMessage = ref('')
const parseWarnings = ref<string[]>([])
const flowContainerRef = ref<HTMLElement | null>(null)

const sampleRecipes = ref([
  {
    name: '🍅 番茄炒蛋',
    title: '番茄炒蛋',
    text: `步骤1: 鸡蛋3个打散，加入少许盐，搅拌均匀30秒
步骤2: 番茄2个切块，葱切葱花备用
步骤3: 热锅凉油，倒入蛋液，中火翻炒1分钟盛出
步骤4: 锅中再加少许油，加入番茄块，翻炒2分钟至出汁
步骤5: 加入炒好的鸡蛋，加入1勺糖和少许盐，翻炒30秒出锅
步骤6: 撒上葱花，装盘享用`
  },
  {
    name: '🥘 红烧肉',
    title: '家常红烧肉',
    text: `步骤1: 五花肉500克切块，冷水下锅焯水3分钟捞出
步骤2: 锅中放少许油，加入冰糖20克，小火炒糖色2分钟
步骤3: 加入五花肉翻炒上色，加入姜片和八角
步骤4: 加入生抽2勺、老抽1勺、料酒1勺，翻炒1分钟
步骤5: 加入没过肉的开水，大火烧开后转小火炖煮45分钟
步骤6: 大火收汁5分钟，撒上葱花出锅`
  },
  {
    name: '🥗 凉拌黄瓜',
    title: '凉拌黄瓜',
    text: `步骤1: 黄瓜2根洗净，拍碎切段
步骤2: 加入少许盐，腌制10分钟后倒掉水分
步骤3: 加入蒜末、小米辣、生抽2勺
步骤4: 加入香醋1勺、香油少许、白糖少许
步骤5: 搅拌均匀即可食用`
  }
])

const completedCount = computed(() =>
  steps.value.filter(s => s.status === 'completed').length
)

const trackProgress = computed(() => {
  if (steps.value.length === 0) return 0
  return (completedCount.value / steps.value.length) * 100
})

const totalDuration = computed(() =>
  steps.value.reduce((acc, s) => acc + s.duration, 0)
)

const formatTotalTime = computed(() => {
  const secs = totalDuration.value
  if (secs === 0) return '—'
  if (secs < 60) return `${secs}秒`
  const mins = Math.floor(secs / 60)
  const remain = secs % 60
  if (remain === 0) return `${mins}分钟`
  return `${mins}分${remain}秒`
})

async function handleParse() {
  if (!rawText.value.trim()) {
    errorMessage.value = '请先输入菜谱内容'
    parseWarnings.value = []
    return
  }

  isParsing.value = true
  errorMessage.value = ''
  parseWarnings.value = []

  try {
    const result = parseRecipeText(rawText.value)
    parseWarnings.value = result.warnings

    if (result.steps.length === 0) {
      errorMessage.value = '未能解析出有效步骤，请检查格式（步骤1: / Step 1 / 一、 / 1. 等）'
      isParsing.value = false
      return
    }

    steps.value = result.steps
    activeStepIndex.value = 0

    await nextTick()
    scrollToActiveStep()
  } catch (e) {
    errorMessage.value = '解析失败，请稍后重试'
  } finally {
    isParsing.value = false
  }
}

function handleReset() {
  steps.value = []
  activeStepIndex.value = -1
  errorMessage.value = ''
  parseWarnings.value = []
}

function handleAutoStart() {
  if (steps.value.length === 0) return

  const firstIncomplete = steps.value.findIndex(s => s.status !== 'completed')
  activeStepIndex.value = firstIncomplete >= 0 ? firstIncomplete : 0

  nextTick(() => {
    scrollToActiveStep()
  })
}

function handleStepPlay(stepId: string) {
  const idx = steps.value.findIndex(s => s.id === stepId)
  if (idx !== -1) {
    activeStepIndex.value = idx
  }
}

function handleStepComplete(stepId: string) {
  const idx = steps.value.findIndex(s => s.id === stepId)
  if (idx !== -1 && idx < steps.value.length - 1) {
    setTimeout(() => {
      activeStepIndex.value = idx + 1
      nextTick(() => {
        scrollToActiveStep()
      })
    }, 1500)
  }
}

function handleStepUpdate(stepId: string, updates: Partial<RecipeStep>) {
  const idx = steps.value.findIndex(s => s.id === stepId)
  if (idx !== -1) {
    steps.value[idx] = { ...steps.value[idx], ...updates }
  }
}

function scrollToActiveStep() {
  if (activeStepIndex.value < 0 || activeStepIndex.value >= steps.value.length) return

  const stepId = steps.value[activeStepIndex.value].id
  const el = document.getElementById(`step-card-${stepId}`)

  if (el && el.scrollIntoView) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })
  }
}

function loadSample(sample: { name: string; title: string; text: string }) {
  recipeTitle.value = sample.title
  rawText.value = sample.text
  errorMessage.value = ''
  parseWarnings.value = []
}

onMounted(() => {
  if (sampleRecipes.value.length > 0) {
    loadSample(sampleRecipes.value[0])
  }
})
</script>

<style scoped>
.recipe-flow {
  width: 100%;
}

.input-section {
  margin-bottom: var(--spacing-2xl);
}

.input-card {
  background: white;
  border-radius: 16px;
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(45, 24, 16, 0.08);
}

.input-header {
  margin-bottom: var(--spacing-lg);
}

.input-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.input-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.input-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.title-input-wrap,
.textarea-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding-left: 2px;
}

.title-input {
  padding: 12px 16px;
  border: 2px solid rgba(45, 24, 16, 0.12);
  border-radius: 10px;
  font-size: 15px;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  outline: none;
  transition: all var(--transition-base);
}

.title-input:focus {
  border-color: var(--color-accent-start);
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.recipe-textarea {
  padding: 14px 16px;
  border: 2px solid rgba(45, 24, 16, 0.12);
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.7;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  outline: none;
  resize: vertical;
  min-height: 160px;
  font-family: inherit;
  transition: all var(--transition-base);
}

.recipe-textarea:focus {
  border-color: var(--color-accent-start);
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px solid transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end));
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.35);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border-color: rgba(45, 24, 16, 0.15);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(45, 24, 16, 0.06);
  border-color: rgba(45, 24, 16, 0.25);
}

.btn-success {
  background: linear-gradient(135deg, var(--color-success), #48BB78);
  color: white;
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.25);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(56, 161, 105, 0.35);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px 16px;
  background: rgba(229, 62, 62, 0.08);
  border: 1px solid rgba(229, 62, 62, 0.2);
  color: var(--color-danger);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.samples-wrap {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid rgba(45, 24, 16, 0.08);
}

.samples-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.samples-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.sample-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(247, 201, 72, 0.08));
  border: 1px solid rgba(255, 107, 53, 0.2);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  transition: all var(--transition-base);
}

.sample-btn:hover {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(247, 201, 72, 0.15));
  border-color: var(--color-accent-start);
  transform: translateY(-1px);
}

.flow-section {
  margin-top: var(--spacing-2xl);
}

.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.flow-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.flow-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: white;
  padding: 10px 20px;
  border-radius: 30px;
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(45, 24, 16, 0.06);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-accent-start);
}

.stat-item.total-time .stat-value {
  color: var(--color-text);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.stat-icon {
  font-size: 16px;
}

.stat-divider {
  font-size: 18px;
  color: rgba(45, 24, 16, 0.2);
  font-weight: 700;
}

.all-done {
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(56, 161, 105, 0.1), rgba(72, 187, 120, 0.1));
  border: 1px solid rgba(56, 161, 105, 0.3);
  border-radius: 30px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-success);
}

.progress-track-wrap {
  margin-bottom: var(--spacing-xl);
  padding: 0 var(--spacing-md);
}

.progress-track {
  position: relative;
  height: 6px;
  background: rgba(45, 24, 16, 0.08);
  border-radius: 3px;
  overflow: visible;
}

.progress-track-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent-start), var(--color-accent-end));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  border: 3px solid rgba(45, 24, 16, 0.15);
  transition: all var(--transition-base);
  z-index: 1;
}

.progress-dot.active {
  border-color: var(--color-accent-start);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.15);
}

.progress-dot.completed {
  background: var(--color-success);
  border-color: var(--color-success);
}

.flow-container {
  width: 100%;
}

.flow-grid {
  display: none;
}

.mobile-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

.mobile-flow > :deep(.step-card) {
  width: 100%;
  max-width: 100%;
}

.mobile-connector-wrap {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md) 0;
}

@media (min-width: 1024px) {
  .mobile-flow {
    display: none;
  }

  .flow-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-lg) var(--spacing-2xl);
    align-items: start;
    position: relative;
  }

  .card-slot {
    width: 100%;
    max-width: 300px;
    justify-self: center;
  }

  .connector-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    position: relative;
  }

  .card-slot:nth-child(4n + 1),
  .card-slot:nth-child(4n + 2) {
    order: unset;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .mobile-flow {
    display: flex;
  }

  .flow-grid {
    display: none;
  }

  .mobile-flow > :deep(.step-card) {
    max-width: 280px;
  }
}

@media (max-width: 767px) {
  .input-card {
    padding: var(--spacing-lg);
    border-radius: 12px;
  }

  .flow-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .flow-stats {
    width: 100%;
    justify-content: center;
  }

  .btn {
    flex: 1;
    min-width: 120px;
  }

  .samples-list {
    flex-direction: column;
    align-items: stretch;
  }

  .sample-btn {
    width: 100%;
  }
}
</style>
