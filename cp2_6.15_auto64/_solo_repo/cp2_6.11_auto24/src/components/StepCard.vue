<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Step } from '../types'

const props = defineProps<{
  step: Step
  isActive: boolean
  isCompleted: boolean
}>()

const emit = defineEmits<{
  complete: [stepId: string]
  start: [stepId: string]
}>()

const expanded = ref(false)
const isPlaying = ref(false)
const showSuccess = ref(false)
const rafId = ref<number | null>(null)
const startTime = ref<number>(0)
const elapsedBeforePause = ref<number>(0)
const progressMs = ref<number>(0)

const durationMs = computed(() => props.step.duration * 1000)
const progress = computed(() => {
  if (durationMs.value <= 0) return 0
  return Math.min(1, progressMs.value / durationMs.value)
})

const remainingSec = computed(() => {
  const ms = Math.max(0, durationMs.value - progressMs.value)
  return Math.ceil(ms / 1000)
})

const radius = 34
const circumference = 2 * Math.PI * radius
const dashOffset = computed(() => circumference * (1 - progress.value))

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}
function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => {
    const h = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return `#${to(r)}${to(g)}${to(b)}`
}
const progressColor = computed(() => {
  const start = hexToRgb('#E53E3E')
  const end = hexToRgb('#38A169')
  const p = progress.value
  return rgbToHex(
    start.r + (end.r - start.r) * p,
    start.g + (end.g - start.g) * p,
    start.b + (end.b - start.b) * p
  )
})

let audioCtx: AudioContext | null = null
function playDing(): void {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    if (!audioCtx) audioCtx = new AudioCtx()
    const ctx = audioCtx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
    osc.start(now)
    osc.stop(now + 0.55)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.value = 1320
    gain2.gain.setValueAtTime(0.0001, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.7)
  } catch {
    // ignore
  }
}

function finishTimer(): void {
  progressMs.value = durationMs.value
  isPlaying.value = false
  if (rafId.value != null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  }
  showSuccess.value = true
  playDing()
  setTimeout(() => {
    showSuccess.value = false
    emit('complete', props.step.id)
  }, 700)
}

function tick(): void {
  if (!isPlaying.value) return
  const now = performance.now()
  const elapsed = elapsedBeforePause.value + (now - startTime.value)
  progressMs.value = elapsed
  if (elapsed >= durationMs.value) {
    finishTimer()
    return
  }
  rafId.value = requestAnimationFrame(tick)
}

function startTimer(): void {
  if (props.step.duration <= 0) {
    emit('complete', props.step.id)
    return
  }
  if (isPlaying.value) {
    pauseTimer()
    return
  }
  isPlaying.value = true
  startTime.value = performance.now()
  emit('start', props.step.id)
  if (rafId.value != null) cancelAnimationFrame(rafId.value)
  rafId.value = requestAnimationFrame(tick)
}

function pauseTimer(): void {
  if (rafId.value != null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  }
  if (isPlaying.value) {
    elapsedBeforePause.value += performance.now() - startTime.value
  }
  isPlaying.value = false
}

function resetTimer(): void {
  pauseTimer()
  progressMs.value = 0
  elapsedBeforePause.value = 0
}

// 页面可见性变化时校正计时（防止后台标签页节流导致偏差）
function onVisibilityChange(): void {
  if (document.hidden || !isPlaying.value) return
  // 重新校准startTime，基于真实时间差
  // elapsedBeforePause已经累积了之前的真实时间，这里只需要重新锚定当前起点
  startTime.value = performance.now()
}

// 定期补偿（每5秒校正一次），保证误差小于200ms
let compensatorTimer: number | null = null
function startCompensator(): void {
  stopCompensator()
  compensatorTimer = window.setInterval(() => {
    if (isPlaying.value && durationMs.value > 0) {
      const now = performance.now()
      const realElapsed = elapsedBeforePause.value + (now - startTime.value)
      if (realElapsed >= durationMs.value) {
        finishTimer()
      } else if (Math.abs(progressMs.value - realElapsed) > 100) {
        progressMs.value = realElapsed
      }
    }
  }, 500)
}
function stopCompensator(): void {
  if (compensatorTimer != null) {
    clearInterval(compensatorTimer)
    compensatorTimer = null
  }
}

watch(
  () => props.isActive,
  (v) => {
    if (!v) pauseTimer()
  }
)

watch(isPlaying, (v) => {
  if (v) startCompensator()
  else stopCompensator()
})

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopCompensator()
  if (rafId.value != null) cancelAnimationFrame(rafId.value)
  if (audioCtx) {
    audioCtx.close().catch(() => {})
  }
})

function toggleExpand(e: Event): void {
  // 避免点击内部按钮时触发
  const target = e.target as HTMLElement
  if (target.closest('.no-expand')) return
  expanded.value = !expanded.value
}

defineExpose({ startTimer, pauseTimer, resetTimer })
</script>

<template>
  <div
    class="step-card"
    :class="{
      active: isActive,
      completed: isCompleted,
      expanded: expanded
    }"
    @click="toggleExpand"
  >
    <Transition name="toast">
      <div v-if="showSuccess" class="success-toast">
        ✓ 完成
      </div>
    </Transition>

    <div class="card-header">
      <div class="step-badge">
        <span v-if="!isCompleted">{{ step.index }}</span>
        <span v-else>✓</span>
      </div>
      <div class="step-title">
        <h3>{{ step.title || `步骤 ${step.index}` }}</h3>
        <p v-if="step.duration > 0" class="duration-label">
          ⏱ 约 {{ Math.floor(step.duration / 60) || '' }}
          <template v-if="Math.floor(step.duration / 60) > 0">分</template>
          {{ step.duration % 60 || '' }}
          <template v-if="step.duration % 60 > 0">秒</template>
        </p>
        <p v-else class="duration-label no-time">无需计时</p>
      </div>

      <div class="progress-ring" v-if="step.duration > 0">
        <svg :width="80" :height="80" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            :r="radius"
            stroke="rgba(45,24,16,0.1)"
            stroke-width="6"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            :r="radius"
            :stroke="progressColor"
            stroke-width="6"
            fill="none"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 40 40)"
            style="transition: stroke 0.15s linear; will-change: stroke-dashoffset"
          />
        </svg>
        <div class="ring-center">
          <button
            class="play-btn no-expand"
            :class="{ playing: isPlaying }"
            @click.stop="startTimer"
            :title="isPlaying ? '暂停' : '开始'"
          >
            <span v-if="!isPlaying">▶</span>
            <span v-else>❚❚</span>
          </button>
          <div class="ring-time">{{ remainingSec }}s</div>
        </div>
      </div>
      <div v-else class="progress-ring no-timer">
        <button
          class="skip-btn no-expand"
          @click.stop="emit('complete', step.id)"
        >
          完成 →
        </button>
      </div>
    </div>

    <div class="card-body">
      <p class="action-text">{{ step.action }}</p>
      <div v-if="step.ingredients && step.ingredients.length" class="ingredients">
        <span class="ing-label">食材：</span>
        <span
          v-for="(ing, i) in step.ingredients"
          :key="i"
          class="ing-tag"
        >
          {{ ing }}
        </span>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="card-detail">
        <div v-if="step.detail" class="detail-text">
          <strong>📝 详细说明：</strong>{{ step.detail }}
        </div>
        <div v-if="step.image" class="detail-image">
          <img :src="step.image" alt="步骤配图" @click.stop />
        </div>
        <label class="image-upload no-expand">
          <span>🖼 添加配图链接：</span>
          <input
            type="text"
            placeholder="粘贴图片URL，例如 https://..."
            :value="step.image || ''"
            @click.stop
            @input.stop="($event: Event) => { step.image = ($event.target as HTMLInputElement).value }"
          />
        </label>
        <label class="detail-input no-expand">
          <span>📖 详细说明：</span>
          <textarea
            rows="3"
            placeholder="补充这个步骤的详细操作要点..."
            :value="step.detail || ''"
            @click.stop
            @input.stop="($event: Event) => { step.detail = ($event.target as HTMLTextAreaElement).value }"
          ></textarea>
        </label>
      </div>
    </Transition>

    <div class="expand-hint" @click.stop="expanded = !expanded">
      <span class="no-expand">
        {{ expanded ? '收起详情 ▲' : '展开详情与配图 ▼' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.step-card {
  position: relative;
  width: 100%;
  background: #ffffff;
  border: 2px solid rgba(45, 24, 16, 0.12);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(45, 24, 16, 0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease;
  user-select: none;
}
.step-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(45, 24, 16, 0.22);
}
.step-card.active {
  border-color: #FF6B35;
  box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.15), 0 10px 28px rgba(255, 107, 53, 0.25);
  transform: translateY(-4px);
}
.step-card.completed {
  opacity: 0.78;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: rgba(56, 161, 105, 0.45);
}
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.step-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B35, #F7C948);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.35);
}
.completed .step-badge {
  background: linear-gradient(135deg, #38A169, #68D391);
  box-shadow: 0 2px 8px rgba(56, 161, 105, 0.4);
}
.step-title {
  flex: 1;
  min-width: 0;
}
.step-title h3 {
  font-size: 15px;
  font-weight: 600;
  color: #2D1810;
  margin-bottom: 4px;
  line-height: 1.4;
}
.duration-label {
  font-size: 12px;
  color: #FF6B35;
  font-weight: 500;
}
.duration-label.no-time {
  color: rgba(45, 24, 16, 0.5);
}
.progress-ring {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2D1810;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;
  line-height: 1;
}
.play-btn:hover {
  transform: scale(1.12);
  background: #FF6B35;
}
.play-btn.playing {
  background: #FF6B35;
}
.ring-time {
  font-size: 10px;
  font-weight: 700;
  color: #2D1810;
  font-variant-numeric: tabular-nums;
}
.progress-ring.no-timer {
  display: flex;
  align-items: center;
  justify-content: center;
}
.skip-btn {
  padding: 8px 14px;
  background: #2D1810;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  transition: background 0.2s ease, transform 0.2s ease;
}
.skip-btn:hover {
  background: #38A169;
  transform: scale(1.05);
}
.card-body {
  border-top: 1px dashed rgba(45, 24, 16, 0.15);
  padding-top: 12px;
  cursor: pointer;
}
.action-text {
  font-size: 13px;
  line-height: 1.65;
  color: #4a2c1c;
  margin-bottom: 10px;
}
.ingredients {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.ing-label {
  color: rgba(45, 24, 16, 0.6);
}
.ing-tag {
  background: rgba(255, 107, 53, 0.12);
  color: #D04A1A;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}
.card-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(45, 24, 16, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-text {
  font-size: 12px;
  line-height: 1.7;
  color: #4a2c1c;
  background: rgba(255, 248, 240, 0.85);
  padding: 10px 12px;
  border-radius: 8px;
}
.detail-text strong {
  color: #2D1810;
}
.detail-image img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  border: 1px solid rgba(45, 24, 16, 0.1);
}
.image-upload,
.detail-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: rgba(45, 24, 16, 0.7);
}
.image-upload input,
.detail-input textarea {
  padding: 7px 11px;
  border: 1px solid rgba(45, 24, 16, 0.2);
  border-radius: 7px;
  font-size: 12px;
  color: #2D1810;
  background: #FFFAF4;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
  resize: vertical;
  font-family: inherit;
}
.image-upload input:focus,
.detail-input textarea:focus {
  border-color: #FF6B35;
  background: #fff;
}
.expand-hint {
  margin-top: 10px;
  text-align: center;
  font-size: 11px;
  color: rgba(45, 24, 16, 0.5);
  padding-top: 6px;
  cursor: pointer;
  transition: color 0.2s ease;
}
.expand-hint:hover {
  color: #FF6B35;
}
.success-toast {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #38A169, #68D391);
  color: #fff;
  padding: 7px 22px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(56, 161, 105, 0.5);
  z-index: 10;
  white-space: nowrap;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.9);
}
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease, margin 0.3s ease, padding 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  margin-top: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 520px;
}
</style>
