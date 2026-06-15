<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">智能简历解析与匹配工具</h1>
      <p class="app-subtitle">快速分析简历与岗位需求的匹配度</p>
    </header>

    <main class="main-content">
      <section class="input-section">
        <ResumeInput
          @resume-change="handleResumeChange"
          @jd-change="handleJdChange"
        />
      </section>

      <section class="result-section">
        <MatchResult
          :parsed-resume="parsedResume"
          :match-result="matchResult"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ResumeInput from './components/ResumeInput.vue'
import MatchResult from './components/MatchResult.vue'
import { parseResume, type ParsedResume } from './utils/parser'
import { matchResume, type MatchResult as MatchResultType } from './utils/matcher'

const resumeText = ref('')
const jdText = ref('')

const parsedResume = computed<ParsedResume | null>(() => {
  if (!resumeText.value.trim()) return null
  const start = performance.now()
  const result = parseResume(resumeText.value)
  const elapsed = performance.now() - start
  console.log(`Resume parsing took ${elapsed.toFixed(2)}ms`)
  return result
})

const matchResult = computed<MatchResultType | null>(() => {
  if (!parsedResume.value || !jdText.value.trim()) return null
  const start = performance.now()
  const result = matchResume(parsedResume.value, jdText.value)
  const elapsed = performance.now() - start
  console.log(`Matching took ${elapsed.toFixed(2)}ms`)
  return result
})

function handleResumeChange(text: string) {
  resumeText.value = text
}

function handleJdChange(text: string) {
  jdText.value = text
}

watch([resumeText, jdText], () => {}, { flush: 'sync' })
</script>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 24px;
}

.app-header {
  text-align: center;
  padding: 16px 0;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 14px;
  color: #64748b;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 24px;
  min-height: 0;
}

.input-section {
  flex: 1;
  min-width: 0;
  display: flex;
}

.result-section {
  flex: 1;
  min-width: 0;
  display: flex;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }

  .input-section,
  .result-section {
    flex: none;
    width: 100%;
  }

  .result-section {
    min-height: 600px;
  }
}

@media (max-width: 640px) {
  .app-container {
    padding: 16px;
    gap: 16px;
  }

  .app-title {
    font-size: 22px;
  }

  .main-content {
    gap: 16px;
  }
}
</style>
