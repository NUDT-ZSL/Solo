<template>
  <div
    class="connector-line"
    :class="{
      horizontal: direction === 'horizontal',
      vertical: direction === 'vertical',
      active: isActive,
      completed: isCompleted
    }"
  >
    <svg
      v-if="direction === 'horizontal'"
      class="line-svg"
      :viewBox="`0 0 ${hWidth} ${hHeight}`"
    >
      <defs>
        <linearGradient :id="hGradId" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
          <stop :offset="'0%'" :stop-color="gradientStart" />
          <stop :offset="'100%'" :stop-color="gradientEnd" />
        </linearGradient>
        <filter :id="hGlowId">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        :x1="4"
        :y1="hHeight / 2"
        :x2="hWidth - 4"
        :y2="hHeight / 2"
        stroke="rgba(45,24,16,0.1)"
        stroke-width="3"
        stroke-linecap="round"
      />

      <line
        v-if="isActive || isCompleted"
        :x1="4"
        :y1="hHeight / 2"
        :x2="hWidth - 4"
        :y2="hHeight / 2"
        :stroke="isCompleted ? '#38A169' : `url(#${hGradId})`"
        stroke-width="3"
        stroke-linecap="round"
        class="base-line"
      />

      <line
        v-if="isActive && !isCompleted"
        :x1="4"
        :y1="hHeight / 2"
        :x2="hWidth - 4"
        :y2="hHeight / 2"
        :stroke="`url(#${hGradId})`"
        stroke-width="4"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
        class="flow-dash-line"
        :filter="`url(#${hGlowId})`"
      />

      <circle
        v-if="isActive && !isCompleted"
        :cx="currentLightPos"
        :cy="hHeight / 2"
        r="4"
        fill="white"
        :stroke="`url(#${hGradId})`"
        stroke-width="2"
        class="light-dot"
        :filter="`url(#${hGlowId})`"
      />

      <path
        :d="arrowPathH"
        fill="none"
        :stroke="isCompleted ? '#38A169' : (isActive ? '#FF6B35' : 'rgba(45,24,16,0.18)')"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="arrow-head"
      />
    </svg>

    <svg
      v-else
      class="line-svg"
      :viewBox="`0 0 ${vWidth} ${vHeight}`"
    >
      <defs>
        <linearGradient :id="vGradId" x1="0%" y1="0%" x2="0%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop :offset="'0%'" :stop-color="gradientStart" />
          <stop :offset="'100%'" :stop-color="gradientEnd" />
        </linearGradient>
        <filter :id="vGlowId">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line
        :x1="vWidth / 2"
        :y1="4"
        :x2="vWidth / 2"
        :y2="vHeight - 4"
        stroke="rgba(45,24,16,0.1)"
        stroke-width="3"
        stroke-linecap="round"
      />

      <line
        v-if="isActive || isCompleted"
        :x1="vWidth / 2"
        :y1="4"
        :x2="vWidth / 2"
        :y2="vHeight - 4"
        :stroke="isCompleted ? '#38A169' : `url(#${vGradId})`"
        stroke-width="3"
        stroke-linecap="round"
        class="base-line"
      />

      <line
        v-if="isActive && !isCompleted"
        :x1="vWidth / 2"
        :y1="4"
        :x2="vWidth / 2"
        :y2="vHeight - 4"
        :stroke="`url(#${vGradId})`"
        stroke-width="4"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
        class="flow-dash-line"
        :filter="`url(#${vGlowId})`"
      />

      <circle
        v-if="isActive && !isCompleted"
        :cx="vWidth / 2"
        :cy="vCurrentLightPos"
        r="4"
        fill="white"
        :stroke="`url(#${vGradId})`"
        stroke-width="2"
        class="light-dot"
        :filter="`url(#${vGlowId})`"
      />

      <path
        :d="arrowPathV"
        fill="none"
        :stroke="isCompleted ? '#38A169' : (isActive ? '#FF6B35' : 'rgba(45,24,16,0.18)')"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="arrow-head"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  isActive?: boolean
  isCompleted?: boolean
  direction?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  isCompleted: false,
  direction: 'horizontal'
})

const hGradId = `hgrad-${Math.random().toString(36).slice(2, 9)}`
const vGradId = `vgrad-${Math.random().toString(36).slice(2, 9)}`
const hGlowId = `hglow-${Math.random().toString(36).slice(2, 9)}`
const vGlowId = `vglow-${Math.random().toString(36).slice(2, 9)}`

const hWidth = 80
const hHeight = 40
const vWidth = 40
const vHeight = 60

const lightProgress = ref(0)
const dashOffset = ref(0)
let rafId: number | null = null
let animStartTime = 0
let pauseProgress = 0

const gradientStart = computed(() => {
  if (props.isCompleted) return '#38A169'
  if (!props.isActive) return 'rgba(45,24,16,0.2)'
  return '#FF6B35'
})

const gradientEnd = computed(() => {
  if (props.isCompleted) return '#48BB78'
  if (!props.isActive) return 'rgba(45,24,16,0.15)'
  return '#F7C948'
})

const dashArray = '8, 16'

const currentLightPos = computed(() => {
  const padding = 8
  const range = hWidth - padding * 2
  return padding + range * lightProgress.value
})

const vCurrentLightPos = computed(() => {
  const padding = 8
  const range = vHeight - padding * 2
  return padding + range * lightProgress.value
})

const arrowPathH = computed(() => {
  const endX = hWidth - 6
  const centerY = hHeight / 2
  return `M ${endX - 8} ${centerY - 6} L ${endX} ${centerY} L ${endX - 8} ${centerY + 6}`
})

const arrowPathV = computed(() => {
  const endY = vHeight - 6
  const centerX = vWidth / 2
  return `M ${centerX - 6} ${endY - 8} L ${centerX} ${endY} L ${centerX + 6} ${endY - 8}`
})

function startAnimation() {
  animStartTime = performance.now() - pauseProgress * 1000
  rafId = requestAnimationFrame(animate)
}

function stopAnimation() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  pauseProgress = lightProgress.value * 10
}

function animate(timestamp: number) {
  if (!props.isActive || props.isCompleted) {
    rafId = null
    return
  }

  const elapsed = timestamp - animStartTime
  const cycleDuration = 10000

  const progress = (elapsed % cycleDuration) / cycleDuration
  lightProgress.value = progress

  dashOffset.value = -(elapsed / 50) % 24

  rafId = requestAnimationFrame(animate)
}

watch(() => props.isActive, (newVal) => {
  if (newVal && !props.isCompleted) {
    startAnimation()
  } else {
    stopAnimation()
    if (!newVal) {
      lightProgress.value = 0
      dashOffset.value = 0
      pauseProgress = 0
    }
  }
})

watch(() => props.isCompleted, (newVal) => {
  if (newVal) {
    stopAnimation()
    lightProgress.value = 1
    dashOffset.value = 0
  }
})

onMounted(() => {
  if (props.isActive && !props.isCompleted) {
    startAnimation()
  }
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<style scoped>
.connector-line {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.connector-line.horizontal {
  width: 80px;
  height: 40px;
}

.connector-line.vertical {
  width: 40px;
  height: 60px;
}

.line-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.base-line {
  transition: stroke 0.4s ease;
}

.flow-dash-line {
  opacity: 0.85;
}

.light-dot {
  transition: none;
}

.arrow-head {
  transition: stroke 0.3s ease;
}

.connector-line.active .arrow-head {
  filter: drop-shadow(0 0 2px rgba(255, 107, 53, 0.5));
}

.connector-line.completed .base-line {
  opacity: 0.8;
}
</style>
