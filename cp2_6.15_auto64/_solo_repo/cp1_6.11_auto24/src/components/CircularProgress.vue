<template>
  <svg
    class="circular-progress"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :style="`stop-color: ${startColor}; stop-opacity: 1`" />
        <stop offset="100%" :style="`stop-color: ${endColor}; stop-opacity: 1`" />
      </linearGradient>
    </defs>

    <circle
      class="progress-bg"
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="bgColor"
      :stroke-width="strokeWidth"
    />

    <circle
      class="progress-fg"
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="`url(#${gradientId})`"
      :stroke-width="strokeWidth"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      stroke-linecap="round"
      :style="{ transition: isTransitioning ? 'stroke-dashoffset 0.1s linear' : 'none' }"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  progress: number
  size?: number
  strokeWidth?: number
  status?: 'pending' | 'active' | 'completed'
}

const props = withDefaults(defineProps<Props>(), {
  size: 56,
  strokeWidth: 5,
  status: 'pending'
})

const isTransitioning = ref(true)
const gradientId = `grad-${Math.random().toString(36).slice(2, 9)}`

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const startColor = computed(() => {
  if (props.status === 'completed') return '#38A169'
  const p = Math.max(0, Math.min(100, props.progress))
  const ratio = p / 100
  return interpolateColor('#E53E3E', '#38A169', ratio)
})

const endColor = computed(() => {
  if (props.status === 'completed') return '#48BB78'
  const p = Math.max(0, Math.min(100, props.progress))
  const ratio = p / 100
  return interpolateColor('#FC8181', '#68D391', ratio)
})

const bgColor = computed(() => {
  if (props.status === 'completed') return 'rgba(56, 161, 105, 0.15)'
  return 'rgba(45, 24, 16, 0.08)'
})

const dashOffset = computed(() => {
  const p = Math.max(0, Math.min(100, props.progress))
  return circumference.value * (1 - p / 100)
})

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (c: string) => parseInt(c.slice(1), 16)
  const r1 = (hex(color1) >> 16) & 0xff
  const g1 = (hex(color1) >> 8) & 0xff
  const b1 = hex(color1) & 0xff
  const r2 = (hex(color2) >> 16) & 0xff
  const g2 = (hex(color2) >> 8) & 0xff
  const b2 = hex(color2) & 0xff

  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

watch(() => props.progress, () => {
  isTransitioning.value = true
})
</script>

<style scoped>
.circular-progress {
  display: block;
  flex-shrink: 0;
}

.progress-fg {
  transform: rotate(-90deg);
  transform-origin: center;
}
</style>
