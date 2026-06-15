<template>
  <div class="input-card glass-card">
    <div class="card-header">
      <h2 class="card-title">信息输入</h2>
      <p class="card-desc">粘贴简历文本和职位描述，实时分析匹配度</p>
    </div>

    <div class="input-group">
      <div class="input-label">
        <span class="label-icon">📄</span>
        <span>简历内容</span>
      </div>
      <div class="textarea-wrapper">
        <textarea
          v-model="resumeText"
          class="input-textarea"
          placeholder="粘贴简历文本内容...

示例：
张三 | 高级前端工程师
5年前端开发经验，精通Vue.js/React，熟悉TypeScript
2018.06 - 至今 某科技公司 高级前端工程师
负责公司核心产品的前端架构设计与开发
教育背景：XX大学 计算机科学与技术 本科
技能：Vue、React、TypeScript、Node.js、Webpack、Vite、MySQL、Docker"
          rows="10"
          @input="emitResume"
        ></textarea>
        <div class="textarea-actions">
          <label class="upload-btn" :for="'resume-upload'">
            <span>📎 上传文件</span>
            <input
              id="resume-upload"
              type="file"
              accept=".txt,.md,.doc,.docx"
              class="file-input"
              @change="handleFileUpload"
            />
          </label>
          <button
            v-if="resumeText"
            class="clear-btn"
            @click="clearResume"
          >
            清空
          </button>
        </div>
      </div>
      <div class="char-count">{{ resumeText.length }} 字符</div>
    </div>

    <div class="divider"></div>

    <div class="input-group">
      <div class="input-label">
        <span class="label-icon">💼</span>
        <span>职位描述 (JD)</span>
      </div>
      <div class="textarea-wrapper">
        <textarea
          v-model="jdText"
          class="input-textarea"
          placeholder="粘贴职位描述...

示例：
高级前端工程师
岗位职责：
1. 负责公司核心产品的前端开发工作
2. 参与前端架构设计和技术选型
3. 带领初级工程师进行技术攻关

任职要求：
1. 5年以上前端开发经验
2. 精通Vue.js或React框架，熟悉TypeScript
3. 熟悉Node.js，有后端开发经验者优先
4. 本科学历，计算机相关专业
5. 熟悉Webpack、Vite等构建工具
加分项：有微服务架构经验、熟悉Docker"
          rows="8"
          @input="emitJd"
        ></textarea>
        <div class="textarea-actions">
          <label class="upload-btn" :for="'jd-upload'">
            <span>📎 上传文件</span>
            <input
              id="jd-upload"
              type="file"
              accept=".txt,.md,.doc,.docx"
              class="file-input"
              @change="handleJdFileUpload"
            />
          </label>
          <button
            v-if="jdText"
            class="clear-btn"
            @click="clearJd"
          >
            清空
          </button>
        </div>
      </div>
      <div class="char-count">{{ jdText.length }} 字符</div>
    </div>

    <div class="sample-buttons">
      <button class="sample-btn" @click="loadSample">
        📝 加载示例数据
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'resume-change', text: string): void
  (e: 'jd-change', text: string): void
}>()

const resumeText = ref('')
const jdText = ref('')

function emitResume() {
  emit('resume-change', resumeText.value)
}

function emitJd() {
  emit('jd-change', jdText.value)
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await readFileAsText(file)
    resumeText.value = text
    emitResume()
  } catch (err) {
    console.error('Failed to read file:', err)
  }
  target.value = ''
}

async function handleJdFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await readFileAsText(file)
    jdText.value = text
    emitJd()
  } catch (err) {
    console.error('Failed to read file:', err)
  }
  target.value = ''
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

function clearResume() {
  resumeText.value = ''
  emitResume()
}

function clearJd() {
  jdText.value = ''
  emitJd()
}

function loadSample() {
  resumeText.value = `张三 | 高级前端工程师
电话：138-0000-0000 | 邮箱：zhangsan@example.com

工作经验：5年
2019.06 - 至今 | 某互联网科技有限公司 | 高级前端工程师
- 负责公司电商平台前端架构设计与开发，日活用户超50万
- 使用Vue.js 3 + TypeScript重构老旧项目，页面加载速度提升40%
- 主导微前端架构落地，实现多团队并行开发
- 带领3人前端小组，完成技术选型和代码规范制定

2017.07 - 2019.05 | XX信息技术有限公司 | 前端开发工程师
- 参与公司后台管理系统开发，使用React + Ant Design
- 负责数据可视化模块，使用ECharts实现复杂图表展示

教育背景
2013.09 - 2017.06 | XX大学 | 计算机科学与技术 | 本科

专业技能
- 前端框架：Vue.js (精通)、React (熟练)、Next.js (熟悉)
- 编程语言：TypeScript (精通)、JavaScript (精通)、Node.js (熟练)
- 构建工具：Webpack (熟练)、Vite (精通)、Rollup (熟悉)
- 数据库：MySQL (熟悉)、MongoDB (了解)、Redis (了解)
- 其他：Docker (了解)、Git (精通)、敏捷开发 (熟练)
- UI设计：Figma (熟悉)、响应式设计 (精通)`

  jdText.value = `高级前端工程师

岗位职责：
1. 负责公司核心产品的前端架构设计与开发工作
2. 主导前端技术选型，制定开发规范和最佳实践
3. 带领团队完成复杂功能的技术攻关
4. 优化前端性能，提升用户体验
5. 与产品、设计、后端团队紧密协作

任职要求：
1. 4年以上前端开发经验，有大型项目经验者优先
2. 精通Vue.js或React框架，深入理解其原理
3. 熟练掌握TypeScript，有大型TS项目经验
4. 熟悉Node.js开发，有后端开发经验者优先
5. 熟悉Webpack、Vite等前端构建工具
6. 本科及以上学历，计算机相关专业
7. 具备良好的沟通能力和团队协作精神

加分项：
1. 有微前端架构经验
2. 熟悉Docker、Kubernetes等容器化技术
3. 有数据可视化开发经验
4. 参与过开源项目或有技术博客`

  emitResume()
  emitJd()
}
</script>

<style scoped>
.input-card {
  width: 100%;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: relative;
  overflow: hidden;
}

.input-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 10% 10%, rgba(147, 197, 253, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 90%, rgba(191, 219, 254, 0.12) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.input-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.03) 60deg, transparent 120deg, transparent 180deg, rgba(255,255,255,0.03) 240deg, transparent 300deg);
  animation: glassShine 20s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes glassShine {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.input-card > * {
  position: relative;
  z-index: 1;
}

.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.35);
  border-left: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 22px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 16px 48px rgba(0, 0, 0, 0.3),
    0 4px 16px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  transform: translateY(-3px);
}

.card-header {
  margin-bottom: 4px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 4px;
}

.card-desc {
  font-size: 13px;
  color: #64748b;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.label-icon {
  font-size: 16px;
}

.textarea-wrapper {
  position: relative;
}

.input-textarea {
  width: 100%;
  padding: 14px 16px 40px 16px;
  border: 1.5px solid #dbeafe;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.8);
  resize: vertical;
  transition: all 0.2s ease;
  font-family: inherit;
}

.input-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: rgba(255, 255, 255, 0.95);
}

.input-textarea::placeholder {
  color: #94a3b8;
  font-size: 13px;
}

.textarea-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover {
  background: rgba(59, 130, 246, 0.2);
}

.file-input {
  display: none;
}

.clear-btn {
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #dbeafe, transparent);
}

.sample-buttons {
  display: flex;
  justify-content: center;
}

.sample-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.sample-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.sample-btn:active {
  transform: translateY(0);
}
</style>
