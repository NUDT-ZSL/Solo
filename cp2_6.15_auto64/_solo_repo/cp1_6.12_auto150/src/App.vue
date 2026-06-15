<template>
  <div class="game-container" ref="containerRef">
    <canvas ref="canvasRef" class="game-canvas"></canvas>
    <div class="hud-overlay">
      <div class="hud-top-left ui-fade-in">
        <div class="hp-bar-wrapper">
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" :style="{ width: hpPercent + '%' }"></div>
          </div>
          <span class="hp-text">{{ currentHp }} / {{ maxHp }}</span>
        </div>
        <div class="crystal-bar-wrapper">
          <div class="crystal-icons">
            <div
              v-for="i in maxCrystals"
              :key="i"
              class="crystal-slot"
              :class="{ filled: i <= currentCrystals }"
            >
              <svg viewBox="0 0 24 24" class="crystal-icon">
                <polygon
                  points="12,1 23,12 12,23 1,12"
                  :fill="i <= currentCrystals ? '#88d8ff' : 'transparent'"
                  :stroke="i <= currentCrystals ? '#00b4d8' : '#4a6f8a'"
                  stroke-width="2"
                />
              </svg>
            </div>
          </div>
          <span class="crystal-count">{{ currentCrystals }} / {{ maxCrystals }}</span>
        </div>
        <div class="buff-list" v-if="activeBuffs.length > 0">
          <div v-for="buff in activeBuffs" :key="buff.id" class="buff-item ui-bounce-in">
            <span class="buff-name">{{ buff.name }}</span>
            <span class="buff-time">{{ (buff.remaining / 1000).toFixed(1) }}s</span>
          </div>
        </div>
      </div>
      <div class="hud-top-right ui-fade-in">
        <div class="kill-count">击杀: {{ killCount }}</div>
        <div class="floor-info">第 {{ currentFloor }} 层</div>
      </div>
      <div class="hud-center-bottom">
        <div class="controls-hint">
          <span><b>WASD</b> 移动</span>
          <span><b>空格</b> 发射冰晶</span>
          <span><b>E</b> 引爆冰晶</span>
        </div>
      </div>
    </div>
    <div v-if="gameOver" class="game-over-overlay ui-fade-in">
      <div class="game-over-panel ui-bounce-in">
        <h1 class="game-over-title">{{ victory ? '胜利！' : '游戏结束' }}</h1>
        <div class="game-over-stats">
          <div>最终层数: {{ currentFloor }}</div>
          <div>击杀数: {{ killCount }}</div>
          <div>总伤害: {{ totalDamage }}</div>
        </div>
        <button class="ice-btn restart-btn" @click="restartGame">重新开始</button>
      </div>
    </div>
    <div v-if="!gameStarted" class="start-overlay ui-fade-in">
      <div class="start-panel ui-bounce-in">
        <h1 class="game-title">FrostSpire</h1>
        <h2 class="game-subtitle">冰雪法师的试炼</h2>
        <p class="game-desc">
          在冰雪城堡中操控冰晶、冻结敌人、穿越三层迷宫。<br/>
          收集宝箱增益，击败所有怪物到达顶层！
        </p>
        <button class="ice-btn start-btn" @click="startGame">开始游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { GameEngine } from './game/GameEngine'
import type { GameState, Buff } from './game/types'

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
let engine: GameEngine | null = null

const gameStarted = ref(false)
const gameOver = ref(false)
const victory = ref(false)

const state = reactive<GameState>({
  currentHp: 100,
  maxHp: 100,
  currentCrystals: 5,
  maxCrystals: 5,
  killCount: 0,
  currentFloor: 1,
  totalDamage: 0,
  activeBuffs: []
})

const hpPercent = computed(() => Math.max(0, (state.currentHp / state.maxHp) * 100))
const currentHp = computed(() => state.currentHp)
const maxHp = computed(() => state.maxHp)
const currentCrystals = computed(() => state.currentCrystals)
const maxCrystals = computed(() => state.maxCrystals)
const killCount = computed(() => state.killCount)
const currentFloor = computed(() => state.currentFloor)
const totalDamage = computed(() => state.totalDamage)
const activeBuffs = computed(() => state.activeBuffs)

function handleStateUpdate(newState: Partial<GameState>) {
  Object.assign(state, newState)
}

function handleGameOver(isVictory: boolean) {
  gameOver.value = true
  victory.value = isVictory
}

function resizeCanvas() {
  if (!canvasRef.value || !containerRef.value) return
  const container = containerRef.value
  const canvas = canvasRef.value
  const maxWidth = container.clientWidth * 0.8
  const maxHeight = container.clientHeight * 0.9
  const aspectRatio = 10 / 6
  let width = maxWidth
  let height = width / aspectRatio
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }
  canvas.width = Math.floor(width)
  canvas.height = Math.floor(height)
  if (engine) {
    engine.resize(canvas.width, canvas.height)
  }
}

function startGame() {
  gameStarted.value = true
  gameOver.value = false
  state.currentHp = 100
  state.maxHp = 100
  state.currentCrystals = 5
  state.maxCrystals = 5
  state.killCount = 0
  state.currentFloor = 1
  state.totalDamage = 0
  state.activeBuffs = []
  if (canvasRef.value) {
    engine = new GameEngine(canvasRef.value, handleStateUpdate, handleGameOver)
    resizeCanvas()
    engine.start()
  }
}

function restartGame() {
  if (engine) {
    engine.stop()
    engine = null
  }
  startGame()
}

let resizeTimer: number | null = null
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => resizeCanvas(), 100)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (engine) engine.stop()
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at top, #2a3a6a 0%, #1a1a2e 50%, #0f0f1e 100%);
  overflow: hidden;
}

.game-canvas {
  display: block;
  border-radius: 12px;
  box-shadow:
    0 0 40px rgba(0, 180, 216, 0.3),
    0 0 80px rgba(0, 150, 199, 0.15),
    inset 0 0 30px rgba(136, 216, 255, 0.1);
  background: #ffffff;
}

.hud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.hud-top-left {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hp-bar-wrapper {
  position: relative;
  width: 200px;
}

.hp-bar-bg {
  width: 200px;
  height: 16px;
  background: #8b0000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.hp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444 0%, #ff6666 100%);
  border-radius: 8px;
  transition: width 120ms ease-out;
}

.hp-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  line-height: 16px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.crystal-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crystal-icons {
  display: flex;
  gap: 4px;
}

.crystal-slot {
  width: 24px;
  height: 24px;
  transition: transform 120ms ease-out;
}

.crystal-slot.filled {
  transform: scale(1);
  filter: drop-shadow(0 0 6px rgba(136, 216, 255, 0.7));
}

.crystal-icon {
  width: 100%;
  height: 100%;
}

.crystal-count {
  font-size: 14px;
  color: #88d8ff;
  text-shadow: 0 0 8px rgba(136, 216, 255, 0.6);
}

.buff-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.buff-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(0, 180, 216, 0.25);
  border: 1px solid rgba(136, 216, 255, 0.4);
  border-radius: 6px;
  min-width: 160px;
  backdrop-filter: blur(4px);
}

.buff-name {
  font-size: 13px;
  color: #a8efff;
}

.buff-time {
  font-size: 12px;
  color: #88d8ff;
}

.hud-top-right {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.kill-count {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.3),
    2px 2px 4px rgba(0, 0, 0, 0.5);
}

.floor-info {
  font-size: 18px;
  color: #88d8ff;
  text-shadow: 0 0 8px rgba(136, 216, 255, 0.5);
}

.hud-center-bottom {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.controls-hint {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(26, 26, 46, 0.7);
  border: 1px solid rgba(136, 216, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(4px);
  font-size: 14px;
  color: #c0d8e8;
}

.controls-hint b {
  color: #88d8ff;
  margin-right: 4px;
}

.start-overlay,
.game-over-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 15, 30, 0.85);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.start-panel,
.game-over-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 48px 56px;
  background:
    linear-gradient(135deg, rgba(42, 58, 106, 0.8) 0%, rgba(26, 26, 46, 0.9) 100%);
  border: 2px solid rgba(136, 216, 255, 0.3);
  border-radius: 20px;
  box-shadow:
    0 0 40px rgba(0, 180, 216, 0.3),
    0 0 80px rgba(0, 150, 199, 0.2);
}

.game-title {
  font-size: 56px;
  color: #88d8ff;
  text-shadow:
    0 0 20px rgba(136, 216, 255, 0.8),
    0 0 40px rgba(0, 180, 216, 0.6);
  letter-spacing: 6px;
}

.game-subtitle {
  font-size: 22px;
  color: #a8c8e0;
  margin-top: -8px;
  letter-spacing: 2px;
}

.game-desc {
  font-size: 16px;
  color: #c0d8e8;
  text-align: center;
  line-height: 1.8;
  max-width: 400px;
}

.start-btn,
.restart-btn {
  width: 120px;
  height: 120px;
  font-size: 20px;
  margin-top: 12px;
}

.game-over-title {
  font-size: 42px;
  color: #88d8ff;
  text-shadow: 0 0 16px rgba(136, 216, 255, 0.6);
  letter-spacing: 4px;
}

.game-over-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 28px;
  background: rgba(0, 180, 216, 0.12);
  border: 1px solid rgba(136, 216, 255, 0.25);
  border-radius: 12px;
  font-size: 18px;
  color: #c0e8ff;
  min-width: 240px;
}

.game-over-stats > div {
  display: flex;
  justify-content: space-between;
}
</style>
