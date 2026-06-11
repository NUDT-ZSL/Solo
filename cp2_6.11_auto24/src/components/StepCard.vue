<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
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
const progressMs = ref(0)

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

function playDing(): void {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.55)
    osc.onended = () => ctx.close()
  } catch {
    // ignore
  }
}

function tick(): void {
  if (!isPlaying.value) return
  const now = performance.now()
  const elapsed = elapsedBeforePause.value + (now - startTime.value)
  progressMs.value = elapsed
  if (elapsed >= durationMs.value) {
    progressMs.value = durationMs.value
    isPlaying.value = false
    rafId.value = null
    showSuccess.value = true
    playDing()
    setTimeout(() => {
      showSuccess.value = false
      emit('complete', props.step.id)
    }, 700)
    return
  }
  rafId.value = requestAnimationFrame(tick)
}

function startTimer(): void {
  if (props.step.duration <= 0) return
  if (isPlaying.value) {
    pauseTimer()
    return
  }
  isPlaying.value = true
  startTime.value = performance.now()
  emit('start', props.step.id)
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

watch(
  () => props.isActive,
  (v) => {
    if (!v) pauseTimer()
  }
)

onUnmounted(() => {
  if (rafId.value != null) cancelAnimationFrame(rafId.value)
})

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
    @click="expanded = !expanded"
  >
    <div v-if="showSuccess" class="success-toast">
      ✓ 完成
    </div>

    <div class="card-header">
      <div class="step-badge">
        <span>{{ step.index }}</span>
      </div>
      <div class="step-title">
        <h3>{{ step.title || `步骤 ${step.index}` }}</h3>
        <p v-if="step.duration > 0" class="duration-label">
          ⏱ 约 {{ Math.floor(step.duration / 60) || '' }}
          <template v-if="Math.floor(step.duration / 60) > 0">分</template>
          {{ step.duration % 60 || '' }}
          <template v-if="step.duration % 60 > 0">秒</template>
        </p>
      </div>

      <div class="progress-ring" v-if="step.duration > 0">
        <svg :width="80" :height="80" :viewBox="'0 0 80 80'">
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
            style="transition: stroke 0.2s linear"
          />
        </svg>
        <div class="ring-center">
          <button
            class="play-btn"
            :class="{ playing: isPlaying }"
            @click.stop="startTimer"
          >
            <span v-if="!isPlaying">▶</span>
            <span v-else>❚❚</span>
          </button>
          <div class="ring-time">{{ remainingSec }}s</div>
        </div>
      </div>
      <div v-else class="progress-ring no-timer">
        <button
          class="skip-btn"
          @click.stop="emit('complete', step.id)"
        >
          完成
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
          <strong>详细说明：</strong>{{ step.detail }}
        </div>
        <div v-if="step.image" class="detail-image">
          <img :src="step.image" alt="步骤配图" @click.stop />
        </div>
        <label class="image-upload">
          <span>添加配图链接：</span>
          <input
            type="text"
            placeholder="输入图片URL"
            :value="step.image || ''"
            @click.stop
            @input.stop="($event) => (step.image = ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="detail-input">
          <span>详细说明：</span>
          <textarea
            rows="3"
            placeholder="添加步骤的详细操作说明..."
            :value="step.detail || ''"
            @click.stop
            @input.stop="($event) => (step.detail = ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>
      </div>
    </Transition>

    <div class="expand-hint">
      <span>{{ expanded ? '收起 ▲' : '展开详情 ▼' }}</span>
    </div>
  </div>
</template>

<style scoped>
.step-card {
  position: relative;
  width: 300px;
  background: #ffffff;
  border: 2px solid rgba(45, 24, 16, 0.15);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(45, 24, 16, 0.15);
  transition: all 0.3s ease;
  flex-shrink: 0;
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
  opacity: 0.7;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: rgba(56, 161, 105, 0.4);
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
}
.play-btn:hover {
  transform: scale(1.1);
  background: #FF6B35;
}
.play-btn.playing {
  background: #FF6B35;
}
.ring-time {
  font-size: 10px;
  font-weight: 600;
  color: #2D1810;
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
  transition: background 0.2s ease;
}
.skip-btn:hover {
  background: #38A169;
}
.card-body {
  border-top: 1px dashed rgba(45, 24, 16, 0.15);
  padding-top: 12px;
}
.action-text {
  font-size: 13px;
  line-height: 1.6;
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
  line-height: 1.6;
  color: #4a2c1c;
  background: rgba(255, 248, 240, 0.8);
  padding: 8px 10px;
  border-radius: 8px;
}
.detail-text strong {
  color: #2D1810;
}
.detail-image img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
.image-upload,
.detail-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(45, 24, 16, 0.7);
}
.image-upload input,
.detail-input textarea {
  padding: 6px 10px;
  border: 1px solid rgba(45, 24, 16, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #2D1810;
  background: #FFF8F0;
  outline: none;
  transition: border-color 0.2s ease;
  resize: vertical;
}
.image-upload input:focus,
.detail-input textarea:focus {
  border-color: #FF6B35;
}
.expand-hint {
  margin-top: 10px;
  text-align: center;
  font-size: 11px;
  color: rgba(45, 24, 16, 0.5);
  cursor: pointer;
  padding-top: 6px;
}
.success-toast {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #38A169, #68D391);
  color: #fff;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(56, 161, 105, 0.45);
  animation: toastIn 0.5s ease both;
  z-index: 10;
}
@keyframes toastIn {
  0% {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
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
  max-height: 500px;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .step-card {
    width: 280px;
  }
}
@media (max-width: 767px) {
  .step-card {
    width: 100%;
  }
}
</style>
