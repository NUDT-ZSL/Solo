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
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient :id="hGradId" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color: #FF6B35; stop-opacity: 1" />
          <stop offset="100%" style="stop-color: #F7C948; stop-opacity: 1" />
        </linearGradient>
      </defs>

      <line
        :x1="0"
        :y1="hHeight / 2"
        :x2="hWidth"
        :y2="hHeight / 2"
        stroke="rgba(45,24,16,0.12)"
        stroke-width="3"
        stroke-linecap="round"
      />

      <line
        v-if="isActive || isCompleted"
        :x1="0"
        :y1="hHeight / 2"
        :x2="hWidth"
        :y2="hHeight / 2"
        :stroke="isCompleted ? '#38A169' : `url(#${hGradId})`"
        stroke-width="3"
        stroke-linecap="round"
        class="base-line"
      />

      <line
        v-if="isActive && !isCompleted"
        :x1="0"
        :y1="hHeight / 2"
        :x2="hWidth"
        :y2="hHeight / 2"
        :stroke="`url(#${hGradId})`"
        stroke-width="5"
        stroke-linecap="round"
        stroke-dasharray="8, 16"
        class="flow-dash"
      />

      <circle
        v-if="isActive && !isCompleted"
        :cx="lightPos"
        :cy="hHeight / 2"
        r="5"
        fill="#FFF"
        stroke="#FF6B35"
        stroke-width="2"
        class="light-dot"
      />

      <path
        :d="arrowPathH"
        fill="none"
        :stroke="isCompleted ? '#38A169' : (isActive ? '#FF6B35' : 'rgba(45,24,16,0.2)')"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="arrow-head"
      />
    </svg>

    <svg
      v-else
      class="line-svg"
      :viewBox="`0 0 ${vWidth} ${vHeight}`"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient :id="vGradId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: #FF6B35; stop-opacity: 1" />
          <stop offset="100%" style="stop-color: #F7C948; stop-opacity: 1" />
        </linearGradient>
      </defs>

      <line
        :x1="vWidth / 2"
        :y1="0"
        :x2="vWidth / 2"
        :y2="vHeight"
        stroke="rgba(45,24,16,0.12)"
        stroke-width="3"
        stroke-linecap="round"
      />

      <line
        v-if="isActive || isCompleted"
        :x1="vWidth / 2"
        :y1="0"
        :x2="vWidth / 2"
        :y2="vHeight"
        :stroke="isCompleted ? '#38A169' : `url(#${vGradId})`"
        stroke-width="3"
        stroke-linecap="round"
        class="base-line"
      />

      <line
        v-if="isActive && !isCompleted"
        :x1="vWidth / 2"
        :y1="0"
        :x2="vWidth / 2"
        :y2="vHeight"
        :stroke="`url(#${vGradId})`"
        stroke-width="5"
        stroke-linecap="round"
        stroke-dasharray="8, 16"
        class="flow-dash"
      />

      <circle
        v-if="isActive && !isCompleted"
        :cx="vWidth / 2"
        :cy="vLightPos"
        r="5"
        fill="#FFF"
        stroke="#FF6B35"
        stroke-width="2"
        class="light-dot"
      />

      <path
        :d="arrowPathV"
        fill="none"
        :stroke="isCompleted ? '#38A169' : (isActive ? '#FF6B35' : 'rgba(45,24,16,0.2)')"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="arrow-head"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

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

const hWidth = 80
const hHeight = 40
const vWidth = 40
const vHeight = 60

const lightProgress = ref(0)
let rafId: number | null = null
let lastUpdate = 0

const lightPos = computed(() => {
  const progress = lightProgress.value / 100
  return 6 + (hWidth - 20) * progress
})

const vLightPos = computed(() => {
  const progress = lightProgress.value / 100
  return 6 + (vHeight - 20) * progress
})

const arrowPathH = computed(() => {
  const endX = hWidth - 6
  const centerY = hHeight / 2
  return `M ${endX - 8} ${centerY - 6 L ${endX} ${centerY} L ${endX - 8} ${centerY + 6}`
})

const arrowPathV = computed(() => {
  const endY = vHeight - 6
  const centerX = vWidth / 2
  return `M ${centerX - 6} ${endY - 8} L ${centerX} ${endY} L ${centerX + 6} ${endY - 8}`
})

function animate(timestamp: number) {
  if (!props.isActive || props.isCompleted) {
    rafId = null
    return
  }

  if (timestamp - lastUpdate >= 1000) {
    lastUpdate = timestamp
    lightProgress.value = (lightProgress.value + 10) % 110
  }

  rafId = requestAnimationFrame(animate)
}

onMounted(() => {
  if (props.isActive && !props.isCompleted) {
    lastUpdate = performance.now()
    rafId = requestAnimationFrame(animate)
  }
})

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
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
  opacity: 0.6;
}

.flow-dash {
  animation: dashFlow 1s linear infinite;
  opacity: 0.9;
  filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.5));
}

@keyframes dashFlow {
  from {
    stroke-dashoffset: 24;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.light-dot {
  filter: drop-shadow(0 0 6px rgba(255, 107, 53, 0.8));
}

.arrow-head {
  transition: stroke 0.3s ease;
}

.connector-line.active .arrow-head {
  filter: drop-shadow(0 0 2px rgba(255, 107, 53, 0.6));
}

.connector-line.completed .base-line {
  opacity: 0.8;
}
</style>
