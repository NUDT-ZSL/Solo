<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="title-icon">🍳</span>
          回声食谱
        </h1>
        <p class="app-subtitle">交互式菜谱导航 · 让烹饪更轻松</p>
      </div>
    </header>

    <main class="app-main">
      <RecipeFlow />
    </main>

    <footer class="app-footer">
      <p>💡 粘贴菜谱文本，自动生成带计时器的流程图</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import RecipeFlow from './components/RecipeFlow.vue'
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFFAF3 100%);
}

.app-header {
  padding: var(--spacing-2xl) var(--spacing-lg) var(--spacing-xl);
  text-align: center;
  border-bottom: 2px solid rgba(45, 24, 16, 0.08);
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(247, 201, 72, 0.05) 100%);
}

.header-content {
  max-width: 900px;
  margin: 0 auto;
}

.app-title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 800;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.title-icon {
  font-size: 1.2em;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.app-subtitle {
  font-size: clamp(14px, 2.5vw, 16px);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.app-main {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-2xl);
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  border-top: 2px solid rgba(45, 24, 16, 0.08);
  background: var(--color-bg-secondary);
}
</style>
