<template>
  <div class="result-card glass-card">
    <div v-if="!parsedResume" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3 class="empty-title">等待输入简历</h3>
      <p class="empty-desc">在左侧输入简历内容和职位描述<br>系统将自动分析匹配度</p>
    </div>

    <template v-else>
      <div class="result-header">
        <h2 class="card-title">匹配分析报告</h2>
        <div class="score-section">
          <div class="score-display">
            <span class="score-number" :style="{ color: scoreColor }">
              {{ displayScore }}
            </span>
            <span class="score-percent">%</span>
          </div>
          <div class="score-label" :style="{ color: scoreColor }">
            {{ scoreLabel }}
          </div>
          <div class="progress-bar-wrapper">
            <div
              class="progress-bar"
              :style="{
                width: displayProgress + '%',
                background: scoreGradient
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="result-grid">
        <div class="radar-section">
          <h3 class="section-title">
            <span class="title-icon">📊</span>
            技能维度分析
          </h3>
          <div ref="radarChartRef" class="radar-chart"></div>
        </div>

        <div class="info-section">
          <div class="info-card">
            <h4 class="info-title">
              <span class="title-icon">👤</span>
              简历信息
            </h4>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">工作年限</span>
                <span class="info-value">{{ parsedResume.yearsOfExperience }}年</span>
              </div>
              <div class="info-item">
                <span class="info-label">学历</span>
                <span class="info-value">{{ parsedResume.educationLevel || '未识别' }}</span>
              </div>
              <div class="info-item" v-if="parsedResume.education">
                <span class="info-label">院校</span>
                <span class="info-value">{{ parsedResume.education }}</span>
              </div>
              <div class="info-item" v-if="parsedResume.positions.length > 0">
                <span class="info-label">职位</span>
                <span class="info-value">{{ parsedResume.positions.slice(0, 2).join('、') }}</span>
              </div>
            </div>
          </div>

          <div class="info-card" v-if="matchResult">
            <h4 class="info-title">
              <span class="title-icon">📈</span>
              维度得分
            </h4>
            <div class="info-list">
              <div class="score-item">
                <div class="score-item-header">
                  <span class="info-label">技能匹配</span>
                  <span class="info-value strong">{{ matchResult.skillScore }}分</span>
                </div>
                <div class="mini-progress">
                  <div class="mini-progress-bar skill" :style="{ width: matchResult.skillScore + '%' }"></div>
                </div>
              </div>
              <div class="score-item">
                <div class="score-item-header">
                  <span class="info-label">经验匹配</span>
                  <span class="info-value strong">{{ matchResult.experienceScore }}分</span>
                </div>
                <div class="mini-progress">
                  <div class="mini-progress-bar exp" :style="{ width: matchResult.experienceScore + '%' }"></div>
                </div>
              </div>
              <div class="score-item">
                <div class="score-item-header">
                  <span class="info-label">学历匹配</span>
                  <span class="info-value strong">{{ matchResult.educationScore }}分</span>
                </div>
                <div class="mini-progress">
                  <div class="mini-progress-bar edu" :style="{ width: matchResult.educationScore + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="skills-section" v-if="matchResult">
        <div class="skills-row">
          <div class="skills-card matched">
            <h4 class="skills-title">
              <span class="skills-icon matched-icon">✓</span>
              匹配技能 ({{ matchResult.matchedSkills.length }})
            </h4>
            <div class="skills-tags">
              <span
                v-for="skill in matchResult.matchedSkills"
                :key="skill.name"
                class="skill-tag matched-tag"
                :class="{ required: skill.required }"
              >
                {{ skill.name }}
              </span>
              <span v-if="matchResult.matchedSkills.length === 0" class="empty-tags">暂无匹配技能</span>
            </div>
          </div>

          <div class="skills-card missing">
            <h4 class="skills-title">
              <span class="skills-icon missing-icon">!</span>
              缺失技能 ({{ matchResult.missingSkills.length }})
            </h4>
            <div class="skills-tags">
              <span
                v-for="skill in matchResult.missingSkills"
                :key="skill"
                class="skill-tag missing-tag"
              >
                {{ skill }}
              </span>
              <span v-if="matchResult.missingSkills.length === 0" class="empty-tags">全部匹配！</span>
            </div>
          </div>
        </div>
      </div>

      <div class="highlight-section" v-if="matchResult">
        <h3 class="section-title">
          <span class="title-icon">📝</span>
          简历文本高亮
        </h3>
        <div class="highlight-legend">
          <span class="legend-item">
            <span class="legend-color matched"></span>
            <span class="legend-text">匹配内容</span>
          </span>
          <span class="legend-item">
            <span class="legend-color unmatched"></span>
            <span class="legend-text">未匹配内容</span>
          </span>
        </div>
        <div class="highlight-text">
          <template v-for="(segment, idx) in highlightSegments" :key="idx">
            <span
              v-if="segment.type === 'matched'"
              class="highlight matched-hl"
            >{{ segment.text }}</span>
            <span
              v-else
              class="highlight unmatched-hl"
            >{{ segment.text }}</span>
          </template>
        </div>
      </div>

      <div class="suggestions-section" v-if="matchResult && matchResult.suggestions.length > 0">
        <h3 class="section-title">
          <span class="title-icon">💡</span>
          改进建议
        </h3>
        <div class="suggestions-list">
          <div
            v-for="(suggestion, idx) in matchResult.suggestions"
            :key="idx"
            class="suggestion-item"
          >
            <span class="suggestion-bullet">{{ idx + 1 }}</span>
            <span class="suggestion-text">{{ suggestion }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ParsedResume } from '../utils/parser'
import type { MatchResult as MatchResultType } from '../utils/matcher'

const props = defineProps<{
  parsedResume: ParsedResume | null
  matchResult: MatchResultType | null
}>()

const displayScore = ref(0)
const radarChartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let animationFrame: number | null = null

const targetScore = computed(() => props.matchResult?.totalScore ?? 0)

const scoreColor = computed(() => {
  const score = targetScore.value
  if (score >= 80) return '#059669'
  if (score >= 60) return '#d97706'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
})

const scoreLabel = computed(() => {
  const score = targetScore.value
  if (score >= 90) return '非常匹配'
  if (score >= 80) return '高度匹配'
  if (score >= 60) return '基本匹配'
  if (score >= 40) return '匹配度一般'
  return '匹配度较低'
})

const scoreGradient = computed(() => {
  const score = targetScore.value
  if (score >= 80) return 'linear-gradient(90deg, #10b981, #059669)'
  if (score >= 60) return 'linear-gradient(90deg, #fbbf24, #d97706)'
  if (score >= 40) return 'linear-gradient(90deg, #fb923c, #ea580c)'
  return 'linear-gradient(90deg, #f87171, #dc2626)'
})

const highlightSegments = computed(() => {
  if (!props.matchResult || !props.parsedResume) return []
  const text = props.parsedResume.rawText
  const matched = props.matchResult.matched || []

  if (!Array.isArray(matched) || matched.length === 0) {
    return [{ type: 'unmatched', text }]
  }

  const validMatched = matched.filter(seg =>
    seg && typeof seg.start === 'number' && typeof seg.end === 'number' &&
    seg.start >= 0 && seg.end <= text.length && seg.start < seg.end
  )

  if (validMatched.length === 0) {
    return [{ type: 'unmatched', text }]
  }

  const sorted = [...validMatched].sort((a, b) => a.start - b.start)
  const segments: Array<{ type: string; text: string }> = []
  let cursor = 0

  for (const seg of sorted) {
    if (seg.start > cursor) {
      segments.push({ type: 'unmatched', text: text.slice(cursor, seg.start) })
    }
    const matchedText = text.slice(seg.start, seg.end)
    if (matchedText) {
      segments.push({ type: 'matched', text: matchedText })
    }
    cursor = Math.max(cursor, seg.end)
  }

  if (cursor < text.length) {
    segments.push({ type: 'unmatched', text: text.slice(cursor) })
  }

  return segments.filter(s => s.text)
})

const displayProgress = ref(0)

watch(targetScore, (newScore) => {
  const safeScore = isNaN(newScore) ? 0 : Math.max(0, Math.min(100, newScore))
  animateScore(displayScore.value, safeScore)
  animateProgress(displayProgress.value, safeScore)
}, { immediate: true })

function animateScore(from: number, to: number) {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }

  const duration = 1000
  const startTime = performance.now()
  const diff = to - from

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOutCubic = 1 - Math.pow(1 - progress, 3)
    const easeOutElastic = progress === 1 ? 1 : (Math.pow(2, -10 * progress) * Math.sin((progress - 0.075) * (2 * Math.PI) / 0.3) + 1)
    const easeProgress = progress > 0.8 ? easeOutElastic : easeOutCubic
    displayScore.value = Math.round(from + diff * easeProgress)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  animationFrame = requestAnimationFrame(update)
}

let progressAnimationFrame: number | null = null

function animateProgress(from: number, to: number) {
  if (progressAnimationFrame) {
    cancelAnimationFrame(progressAnimationFrame)
  }

  const duration = 1200
  const startTime = performance.now()
  const diff = to - from

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 4)
    displayProgress.value = from + diff * easeProgress

    if (progress < 1) {
      progressAnimationFrame = requestAnimationFrame(update)
    }
  }

  progressAnimationFrame = requestAnimationFrame(update)
}

watch(() => [props.parsedResume, props.matchResult], () => {
  nextTick(() => {
    updateRadarChart()
  })
}, { deep: true })

function updateRadarChart() {
  if (!radarChartRef.value || !props.matchResult || !props.parsedResume) return

  if (!chartInstance) {
    chartInstance = echarts.init(radarChartRef.value)
  }

  const skillCoverage = props.parsedResume.skills.length > 0
    ? Math.round((props.matchResult.matchedSkills.length / Math.max(1, props.matchResult.matchedSkills.length + props.matchResult.missingSkills.length)) * 100)
    : 0

  const keywordMatch = props.matchResult.matched.length > 0 ? Math.min(100, 50 + props.matchResult.matched.length * 5) : 30

  const skillScore = isNaN(props.matchResult.skillScore) ? 50 : Math.max(0, Math.min(100, props.matchResult.skillScore))
  const expScore = isNaN(props.matchResult.experienceScore) ? 70 : Math.max(0, Math.min(100, props.matchResult.experienceScore))
  const eduScore = isNaN(props.matchResult.educationScore) ? 70 : Math.max(0, Math.min(100, props.matchResult.educationScore))
  const skillCov = isNaN(skillCoverage) ? 50 : Math.max(0, Math.min(100, skillCoverage))
  const kwMatch = isNaN(keywordMatch) ? 50 : Math.max(0, Math.min(100, keywordMatch))

  const indicators = [
    { name: `技能匹配\n${skillScore}分`, max: 100 },
    { name: `经验匹配\n${expScore}分`, max: 100 },
    { name: `学历匹配\n${eduScore}分`, max: 100 },
    { name: `技能覆盖\n${skillCov}分`, max: 100 },
    { name: `关键字\n${kwMatch}分`, max: 100 }
  ]

  const values = [skillScore, expScore, eduScore, skillCov, kwMatch]

  const option: echarts.EChartsOption = {
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 5,
      radius: '65%',
      center: ['50%', '55%'],
      axisName: {
        color: '#1e3a8a',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 16,
        formatter: function (value: string) {
          return '{a|' + value.replace('\n', '\\n') + '}'
        },
        rich: {
          a: {
            color: '#1e3a8a',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 16,
            align: 'center'
          }
        }
      },
      splitLine: {
        lineStyle: {
          color: '#93c5fd',
          width: 1,
          type: 'dashed'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(219, 234, 254, 0.5)',
            'rgba(191, 219, 254, 0.3)',
            'rgba(147, 197, 253, 0.2)',
            'rgba(96, 165, 250, 0.1)',
            'rgba(59, 130, 246, 0.05)'
          ]
        }
      },
      axisLine: {
        lineStyle: {
          color: '#3b82f6',
          width: 1
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#3b82f6'
        }
      },
      scale: false,
      min: 0,
      max: 100
    },
    series: [{
      type: 'radar',
      symbol: 'circle',
      symbolSize: 8,
      data: [{
        value: values,
        name: '匹配度',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.15)' }
          ])
        },
        lineStyle: {
          color: '#3b82f6',
          width: 3
        },
        itemStyle: {
          color: '#3b82f6',
          borderWidth: 3,
          borderColor: '#fff',
          shadowColor: 'rgba(59, 130, 246, 0.5)',
          shadowBlur: 10
        },
        label: {
          show: true,
          formatter: function (params: any) {
            return params.value + ''
          },
          color: '#1e3a8a',
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: '#fff',
          padding: [2, 6],
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#93c5fd'
        }
      }]
    }]
  }

  chartInstance.setOption(option, true)
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  if (progressAnimationFrame) {
    cancelAnimationFrame(progressAnimationFrame)
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.result-card {
  width: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  position: relative;
  overflow-x: hidden;
}

.result-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.result-card > * {
  position: relative;
  z-index: 1;
}

.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(31, 38, 135, 0.05);
  transition: all 0.3s ease;
}

.glass-card:hover {
  box-shadow: 
    0 12px 40px rgba(31, 38, 135, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(31, 38, 135, 0.05);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.6;
}

.result-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e3a8a;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.score-display {
  display: flex;
  align-items: baseline;
}

.score-number {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  transition: color 0.3s ease;
}

.score-percent {
  font-size: 28px;
  font-weight: 600;
  color: #64748b;
  margin-left: 4px;
}

.score-label {
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.progress-bar-wrapper {
  width: 100%;
  max-width: 300px;
  height: 10px;
  background: linear-gradient(90deg, #e2e8f0, #f1f5f9);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

.progress-bar-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}

.progress-bar {
  height: 100%;
  border-radius: 6px;
  position: relative;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.score-display {
  display: flex;
  align-items: baseline;
  animation: scorePop 0.5s ease-out;
}

@keyframes scorePop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.score-number {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  transition: color 0.3s ease;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: scorePulse 2s ease-in-out infinite;
}

@keyframes scorePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 16px;
}

.radar-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

.radar-chart {
  width: 100%;
  height: 240px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

.info-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.info-value.strong {
  font-weight: 600;
}

.score-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.mini-progress {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.mini-progress-bar.skill {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.mini-progress-bar.exp {
  background: linear-gradient(90deg, #10b981, #059669);
}

.mini-progress-bar.edu {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.skills-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skills-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.skills-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

.skills-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.skills-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.matched-icon {
  background: #d1fae5;
  color: #059669;
}

.missing-icon {
  background: #fee2e2;
  color: #dc2626;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.matched-tag {
  background: #d1fae5;
  color: #059669;
}

.matched-tag.required {
  background: #a7f3d0;
  font-weight: 600;
}

.missing-tag {
  background: #fee2e2;
  color: #dc2626;
}

.empty-tags {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.highlight-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

.highlight-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.matched {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
}

.legend-color.unmatched {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border: 1px solid #94a3b8;
}

.legend-text {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.highlight-text {
  font-size: 13px;
  line-height: 1.8;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
}

.highlight {
  display: inline;
  transition: all 0.2s ease;
}

.highlight.matched-hl {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
  border-bottom: 2px solid #f59e0b;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.highlight.unmatched-hl {
  background: rgba(241, 245, 249, 0.5);
  color: #64748b;
  padding: 1px 2px;
  border-radius: 2px;
  opacity: 0.85;
  text-decoration: line-through;
  text-decoration-color: #cbd5e1;
  text-decoration-thickness: 1px;
}

.highlight.matched-hl:hover {
  background: linear-gradient(135deg, #fde68a, #fcd34d);
  transform: scale(1.02);
}

.suggestions-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.suggestion-bullet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 1px;
}

.suggestion-text {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

@media (max-width: 1024px) {
  .result-grid,
  .skills-row {
    grid-template-columns: 1fr;
  }

  .radar-chart {
    height: 280px;
  }
}

@media (max-width: 640px) {
  .result-card {
    padding: 16px;
    gap: 16px;
  }

  .score-number {
    font-size: 48px;
  }

  .radar-chart {
    height: 240px;
  }
}
</style>
