<template>
  <div
    ref="cardRef"
    class="step-card"
    :class="{
      'is-active': isActive,
      'is-completed': step.status === 'completed',
      'is-pending': step.status === 'pending',
      'is-expanded': isExpanded
    }"
    :id="`step-card-${step.id}`"
    @click="toggleExpand"
  >
    <div class="card-header">
      <div class="step-badge" :class="step.status">
        <span v-if="step.status === 'completed'" class="badge-icon">✓</span>
        <span v-else>{{ step.stepNumber }}</span>
      </div>

      <div class="card-header-right">
        <CircularProgress
          v-if="step.duration > 0"
          :progress="progressPercent"
          :size="56"
          :stroke-width="5"
          :status="step.status"
        />
        <button
          v-if="step.duration > 0"
          class="play-btn"
          :class="{ playing: isPlaying }"
          @click.stop="handlePlayPause"
          :title="isPlaying ? '暂停' : '开始倒计时'"
        >
          <span v-if="!isPlaying && !isCompleted">▶</span>
          <span v-else-if="isPlaying">⏸</span>
          <span v-else>↻</span>
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="remainingTime > 0 || isPlaying" class="timer-display" :class="{ urgent: remainingTime <= 10 && remainingTime > 0 }">
        <span class="timer-value">{{ formatTime(remainingTime) }}</span>
        <span class="timer-label">{{ isPlaying ? '倒计时中' : isCompleted ? '已完成' : '剩余' }}</span>
      </div>
      <div v-else-if="step.duration === 0" class="timer-display no-duration">
        <span class="timer-icon">⏱</span>
        <span class="timer-label">无计时</span>
      </div>

      <h3 class="action-text">{{ step.action }}</h3>

      <div v-if="step.ingredients.length > 0" class="ingredients-wrap">
        <span class="ingredients-label">🥗 食材：</span>
        <div class="ingredients-list">
          <span
            v-for="(ing, idx) in step.ingredients"
            :key="idx"
            class="ingredient-tag"
          >
            {{ ing }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="isExpanded" class="card-detail">
      <div class="detail-section">
        <h4 class="detail-title">📝 详细说明</h4>
        <p class="detail-text">{{ step.detail }}</p>
      </div>

      <div v-if="step.duration > 0" class="detail-section">
        <h4 class="detail-title">⏰ 时长</h4>
        <p class="detail-text">{{ formatDuration(step.duration) }}</p>
      </div>

      <div v-if="step.imageUrl" class="detail-section">
        <h4 class="detail-title">🖼️ 配图</h4>
        <div class="image-wrap">
          <img :src="step.imageUrl" alt="步骤配图" class="step-image" @error="handleImageError" />
        </div>
      </div>

      <div class="detail-section image-upload-section">
        <h4 class="detail-title">{{ step.imageUrl ? '🔗 更新配图' : '➕ 添加配图' }}</h4>
        <div class="image-input-wrap">
          <input
            type="text"
            class="image-input"
            :value="step.imageUrl"
            @input="handleImageUrlInput"
            @click.stop
            placeholder="粘贴图片链接或上传..."
          />
          <label class="upload-btn" @click.stop>
            📁 上传
            <input type="file" accept="image/*" @change="handleFileUpload" class="hidden-input" />
          </label>
        </div>
      </div>
    </div>

    <div class="expand-hint">
      <span>{{ isExpanded ? '收起' : '展开详情' }}</span>
      <svg class="chevron" :class="{ flipped: isExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>

    <Transition name="success">
      <div v-if="showSuccess" class="success-overlay">
        <div class="success-content">
          <span class="success-icon">🎉</span>
          <span class="success-text">步骤完成！</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, defineProps, defineEmits } from 'vue'
import type { RecipeStep } from '../types'
import CircularProgress from './CircularProgress.vue'

interface Props {
  step: RecipeStep
  isActive: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'play', stepId: string): void
  (e: 'complete', stepId: string): void
  (e: 'update', stepId: string, updates: Partial<RecipeStep>): void
}>()

const cardRef = ref<HTMLDivElement | null>(null)
const isExpanded = ref(false)
const isPlaying = ref(false)
const showSuccess = ref(false)
const imageError = ref(false)

const remainingTime = ref(props.step.duration)
let rafId: number | null = null
let playStartWallTime = 0
let playStartRemaining = 0

const isCompleted = computed(() => props.step.status === 'completed')

const progressPercent = computed(() => {
  if (props.step.duration === 0) return 0
  if (isCompleted.value) return 100
  const elapsed = props.step.duration - remainingTime.value
  return Math.min(100, Math.max(0, (elapsed / props.step.duration) * 100))
})

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '无计时'
  if (seconds < 60) return `${seconds} 秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) return `${mins} 分钟`
  return `${mins} 分 ${secs} 秒`
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const playDingSound = () => {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
    const audioCtx = new AudioCtx()
    
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.08)
    oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.16)
    
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
    
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.4)
    
    setTimeout(() => audioCtx.close(), 500)
  } catch (e) {
    console.warn('Audio playback not available:', e)
  }
}

const tick = () => {
  if (!isPlaying.value) return

  const now = performance.now()
  const elapsedMs = now - playStartWallTime
  const elapsedSec = elapsedMs / 1000
  const newRemaining = playStartRemaining - elapsedSec

  if (newRemaining <= 0) {
    remainingTime.value = 0
    isPlaying.value = false
    handleComplete()
    return
  }

  remainingTime.value = newRemaining
  rafId = requestAnimationFrame(tick)
}

const handlePlayPause = () => {
  if (isCompleted.value) {
    remainingTime.value = props.step.duration
    isPlaying.value = false
    playStartWallTime = 0
    playStartRemaining = 0
    emit('update', props.step.id, { status: 'pending' })
    return
  }

  if (isPlaying.value) {
    const now = performance.now()
    const elapsedSec = (now - playStartWallTime) / 1000
    playStartRemaining = playStartRemaining - elapsedSec
    if (playStartRemaining < 0) playStartRemaining = 0
    remainingTime.value = playStartRemaining

    isPlaying.value = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  } else {
    isPlaying.value = true
    emit('play', props.step.id)
    playStartWallTime = performance.now()
    playStartRemaining = remainingTime.value
    rafId = requestAnimationFrame(tick)
  }
}

const handleComplete = () => {
  showSuccess.value = true
  playDingSound()
  emit('complete', props.step.id)
  emit('update', props.step.id, { status: 'completed' })

  setTimeout(() => {
    showSuccess.value = false
  }, 2000)
}

const handleImageUrlInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update', props.step.id, { imageUrl: target.value })
  imageError.value = false
}

const handleFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    const result = ev.target?.result as string
    emit('update', props.step.id, { imageUrl: result })
    imageError.value = false
  }
  reader.readAsDataURL(file)
  target.value = ''
}

const handleImageError = () => {
  imageError.value = true
}

watch(() => props.step.duration, (newDur) => {
  if (!isPlaying.value && !isCompleted.value) {
    remainingTime.value = newDur
  }
}, { immediate: true })

watch(() => props.step.status, (newStatus) => {
  if (newStatus === 'completed') {
    remainingTime.value = 0
    isPlaying.value = false
  } else if (newStatus === 'pending') {
    remainingTime.value = props.step.duration
  }
})

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<style scoped>
.step-card {
  position: relative;
  background: #FFFFFF;
  border: 2px solid rgba(45, 24, 16, 0.12);
  border-radius: var(--radius-card);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-base);
  cursor: pointer;
  overflow: hidden;
  scroll-margin-top: 120px;
  scroll-margin-bottom: 40px;
}

.step-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
  border-color: rgba(255, 107, 53, 0.3);
}

.step-card.is-active {
  border-color: var(--color-accent-start);
  border-width: 3px;
  animation: pulse 2s ease-in-out infinite;
}

.step-card.is-completed {
  background: linear-gradient(135deg, rgba(56, 161, 105, 0.05) 0%, rgba(56, 161, 105, 0.02) 100%);
  border-color: rgba(56, 161, 105, 0.4);
}

.step-card.is-pending {
  opacity: 0.85;
}

.step-card.is-expanded {
  border-color: rgba(255, 107, 53, 0.5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.step-badge {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 2px solid rgba(45, 24, 16, 0.15);
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.step-badge.active {
  background: linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end));
  color: white;
  border-color: var(--color-accent-start);
}

.step-badge.completed {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.badge-icon {
  font-size: 20px;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.play-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent-start), var(--color-accent-end));
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
}

.play-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn.playing {
  background: linear-gradient(135deg, #F56565, #FC8181);
}

.card-body {
  margin-bottom: var(--spacing-md);
}

.timer-display {
  text-align: right;
  margin-bottom: var(--spacing-sm);
}

.timer-display.no-duration {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
}

.timer-icon {
  font-size: 14px;
}

.timer-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-accent-start);
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}

.timer-display.urgent .timer-value {
  color: var(--color-danger);
  animation: urgentPulse 0.5s ease-in-out infinite alternate;
}

@keyframes urgentPulse {
  from { transform: scale(1); }
  to { transform: scale(1.05); }
}

.timer-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.timer-display.no-duration .timer-label {
  display: inline;
  margin-top: 0;
  font-size: 13px;
}

.action-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: var(--spacing-md);
}

.ingredients-wrap {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: var(--spacing-sm) var(--spacing-md);
}

.ingredients-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
  display: block;
  margin-bottom: var(--spacing-xs);
}

.ingredients-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.ingredient-tag {
  background: white;
  color: var(--color-text);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(45, 24, 16, 0.1);
}

.card-detail {
  border-top: 1px solid rgba(45, 24, 16, 0.1);
  padding-top: var(--spacing-md);
  margin-top: var(--spacing-md);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-section {
  margin-bottom: var(--spacing-md);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.detail-text {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
}

.image-wrap {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(45, 24, 16, 0.1);
}

.step-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
}

.image-input-wrap {
  display: flex;
  gap: var(--spacing-sm);
}

.image-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(45, 24, 16, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: white;
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-base);
}

.image-input:focus {
  border-color: var(--color-accent-start);
}

.upload-btn {
  padding: 8px 14px;
  background: var(--color-bg-secondary);
  border: 1px solid rgba(45, 24, 16, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
}

.upload-btn:hover {
  background: var(--color-accent-start);
  color: white;
  border-color: var(--color-accent-start);
}

.hidden-input {
  display: none;
}

.expand-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  border-top: 1px solid rgba(45, 24, 16, 0.06);
  margin-top: var(--spacing-md);
}

.chevron {
  width: 16px;
  height: 16px;
  transition: transform var(--transition-base);
}

.chevron.flipped {
  transform: rotate(180deg);
}

.success-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(56, 161, 105, 0.92), rgba(72, 187, 120, 0.92));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(var(--radius-card) - 2px);
  z-index: 10;
  pointer-events: none;
}

.success-content {
  text-align: center;
  color: white;
}

.success-icon {
  font-size: 48px;
  display: block;
  margin-bottom: var(--spacing-sm);
}

.success-text {
  font-size: 20px;
  font-weight: 700;
}

.success-enter-active,
.success-leave-active {
  animation: successPop 0.5s ease;
}

.success-leave-active {
  animation-direction: reverse;
}

@media (max-width: 768px) {
  .step-card {
    padding: var(--spacing-md);
  }

  .timer-value {
    font-size: 20px;
  }

  .action-text {
    font-size: 15px;
  }
}
</style>
