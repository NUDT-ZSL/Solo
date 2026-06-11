# PitchTrainer 性能测试文档

## 概述

本文档描述了 PitchTrainer 应用的性能约束验证方法和测试步骤。所有性能指标必须达到或超过设计目标。

---

## 性能指标汇总

| 指标 | 目标值 | 测试方法 | 验收标准 |
|------|--------|----------|----------|
| 音高检测延迟 | < 100ms | 音频脉冲触发法 | 95% 样本延迟 < 100ms |
| 渲染帧率 | ≥ 30fps | requestAnimationFrame 计时 | 连续60秒平均帧率 ≥ 30fps |
| 内存泄漏 | ≤ 50MB / 5分钟 | Chrome DevTools 内存快照 | 5分钟运行后增长 ≤ 50MB |
| 音频-视频同步 | < 50ms | 时间戳对比法 | 回放时音画偏差 < 50ms |
| 响应式布局 | 正确适配 | 视口尺寸调整 | <768px 时布局无错乱 |

---

## 1. 音高检测延迟测试

### 测试目的

验证从麦克风输入到 Canvas 曲线显示的端到端延迟是否 < 100ms。

### 测试环境准备

1. **硬件**：
   - 音频接口（支持 loopback 或外放+麦克风回路）
   - 连接：扬声器 → 麦克风（物理回路）或使用虚拟音频线缆

2. **软件**：
   - Chrome 浏览器（版本 ≥ 100）
   - 打开 Chrome DevTools (F12)
   - 安装 [Web Audio Timer](https://chrome.google.com/webstore/) 扩展（可选）

### 测试步骤

#### 方法 A：手动脉冲测试（简单版）

```
步骤 1: 打开应用，进入开发者模式
   - 访问 chrome://flags/#autoplay-policy
   - 设置为 "No user gesture is required"
   - 重启浏览器

步骤 2: 启动 PitchTrainer
   - npm run dev
   - 访问 http://localhost:5173

步骤 3: 打开 DevTools Console
   - F12 → Console 标签
   - 执行以下代码注入延迟测量钩子：
```

```javascript
// 在 Console 中执行，注入延迟测量
const originalAddData = window.visualizerRef?.current?.addData;
if (originalAddData) {
  window.pulseTimestamps = [];
  window.visualizerRef.current.addData = function(pitchData) {
    const now = performance.now();
    if (window.expectedPulseTime) {
      const latency = now - window.expectedPulseTime;
      window.pulseTimestamps.push(latency);
      console.log(`检测到音高脉冲，延迟: ${latency.toFixed(1)}ms`);
      window.expectedPulseTime = null;
    }
    return originalAddData.call(this, pitchData);
  };
  console.log('延迟测量钩子已安装');
}
```

```
步骤 4: 产生音频脉冲
   - 点击「开始检测」按钮，授权麦克风
   - 使用手机或另一设备播放 1kHz 正弦波脉冲（持续 50ms）
   - 在播放瞬间记录系统时间（或使用 console.time）

步骤 5: 重复测试
   - 执行 20 次脉冲测试
   - 记录每次的延迟值
```

#### 方法 B：自动化测试（精确版）

使用 Web Audio API 内部生成测试信号，通过 loopback 测量：

```javascript
// 在浏览器 Console 中执行自动化测试
async function runLatencyTest(numSamples = 20) {
  const results = [];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = 1000;
  gainNode.gain.value = 0;
  oscillator.start();
  
  // 确保 PitchTracker 已启动
  console.log('开始延迟测试，共', numSamples, '次');
  
  for (let i = 0; i < numSamples; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 发送脉冲
    const pulseTime = audioCtx.currentTime;
    window.expectedPulseTime = performance.now();
    gainNode.gain.setValueAtTime(0.5, pulseTime);
    gainNode.gain.setValueAtTime(0, pulseTime + 0.05);
    
    // 等待检测
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (window.pulseTimestamps?.length > 0) {
      results.push(window.pulseTimestamps[window.pulseTimestamps.length - 1]);
    }
  }
  
  // 统计结果
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const max = Math.max(...results);
  const min = Math.min(...results);
  const sorted = [...results].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  console.log('========== 延迟测试结果 ==========');
  console.log(`样本数: ${results.length}`);
  console.log(`平均延迟: ${avg.toFixed(1)}ms`);
  console.log(`最小延迟: ${min.toFixed(1)}ms`);
  console.log(`最大延迟: ${max.toFixed(1)}ms`);
  console.log(`95百分位: ${p95.toFixed(1)}ms`);
  console.log(`是否通过: ${p95 < 100 ? '✅ 是' : '❌ 否'}`);
  console.log('所有样本:', results.map(r => r.toFixed(1) + 'ms').join(', '));
  
  oscillator.stop();
  return { avg, max, min, p95, results };
}

// 运行测试
runLatencyTest(20);
```

### 验收标准

- ✅ 95% 样本延迟 < 100ms
- ✅ 最大延迟 < 150ms
- ✅ 平均延迟 < 50ms

---

## 2. 帧率稳定性测试

### 测试目的

验证应用在持续运行时的渲染帧率是否稳定在 30fps 以上。

### 测试工具

- Chrome DevTools Performance 面板
- 或使用 `requestAnimationFrame` 手动计时

### 测试步骤

#### 方法 A：DevTools Performance 面板

```
步骤 1: 打开应用并启动检测
   - npm run dev
   - 访问 http://localhost:5173
   - 点击「开始检测」，确保音高曲线在滚动

步骤 2: 开启性能录制
   - F12 → Performance 标签
   - 点击录制按钮（●）
   - 保持页面运行，不要最小化
   - 录制 60 秒后停止

步骤 3: 分析结果
   - 在 Timeline 中查看 FPS 曲线图
   - 观察 Frame 区块的帧间距
   - 统计帧率数据
```

#### 方法 B：代码注入监控

```javascript
// 在 Console 中执行帧率监控
function startFPSMonitor(duration = 60) {
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsHistory = [];
  const startTime = performance.now();
  
  function measure() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;
    
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      fpsHistory.push(fps);
      console.log(`[${fpsHistory.length}s] FPS: ${fps}`);
      frameCount = 0;
      lastTime = now;
    }
    
    if (now - startTime < duration * 1000) {
      requestAnimationFrame(measure);
    } else {
      // 统计结果
      const avg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
      const min = Math.min(...fpsHistory);
      const below30 = fpsHistory.filter(f => f < 30).length;
      
      console.log('========== 帧率测试结果 ==========');
      console.log(`测试时长: ${duration}秒`);
      console.log(`平均帧率: ${avg.toFixed(1)}fps`);
      console.log(`最低帧率: ${min}fps`);
      console.log(`<30fps次数: ${below30}次`);
      console.log(`是否通过: ${avg >= 30 && min >= 25 ? '✅ 是' : '❌ 否'}`);
      console.log('每秒FPS:', fpsHistory.join(', '));
    }
  }
  
  requestAnimationFrame(measure);
  console.log(`帧率监控已启动，持续 ${duration} 秒...`);
}

// 运行监控
startFPSMonitor(60);
```

### 验收标准

- ✅ 平均帧率 ≥ 30fps
- ✅ 最低帧率 ≥ 25fps（允许短暂掉帧）
- ✅ 没有超过 500ms 的长帧阻塞
- ✅ 帧率波动 < 10fps

---

## 3. 内存泄漏测试

### 测试目的

验证应用长时间运行（5分钟）后内存增长是否控制在 50MB 以内。

### 测试工具

- Chrome DevTools Memory 面板
- 堆快照（Heap Snapshot）功能

### 测试步骤

```
步骤 1: 准备测试环境
   - 关闭所有其他浏览器标签页
   - 打开 Chrome 任务管理器 (Shift+Esc)
   - 访问 chrome://settings/system，关闭「继续运行后台应用」

步骤 2: 启动应用
   - npm run dev
   - 访问 http://localhost:5173
   - 等待页面完全加载（10秒）

步骤 3: 获取基准内存快照
   - F12 → Memory 标签
   - 选择「Heap snapshot」
   - 点击「Take snapshot」
   - 记录快照名称：Baseline (T0)
   - 在任务管理器中记录内存占用

步骤 4: 开始持续运行
   - 点击「开始检测」按钮，授权麦克风
   - 开启节拍器（BPM=120, 4/4）
   - 开始录音（30秒后自动停止）
   - 回放录音
   - 重复以上操作：检测→录音→回放，循环进行

步骤 5: 定时记录内存
   - 每 1 分钟记录一次任务管理器中的内存值
   - 在 1 分钟、3 分钟、5 分钟时分别拍摄堆快照：
     * Snapshot T1 (1分钟)
     * Snapshot T3 (3分钟)
     * Snapshot T5 (5分钟)

步骤 6: 分析堆快照
   - 在 Memory 面板中选择「Summary」视图
   - 对比 T0 和 T5 的内存占用：
     * Total JS heap size
     * DOM node count
     * Event listener count
   - 选择「Comparison」视图，对比 T0 → T5：
     * #New：新增对象数量
     * #Deleted：删除对象数量
     * #Delta：净增长
     * Size Delta：内存净增长

步骤 7: 检查泄漏点
   - 在 Comparison 视图中按 Size Delta 降序排列
   - 检查是否有异常增长的对象：
     * 数组（Array）是否持续增长
     * PitchData 对象是否未被回收
     * 闭包（Closure）是否持有引用
     * DOM 节点是否未被清理
     * Timer / EventListener 是否未移除
```

### 自动化内存监控脚本

```javascript
// 在 Console 中执行内存监控
function startMemoryMonitor(durationMinutes = 5) {
  const samples = [];
  const intervalMs = 10000; // 每10秒采样一次
  const endTime = Date.now() + durationMinutes * 60 * 1000;
  
  function sample() {
    if (window.performance?.memory) {
      const mem = window.performance.memory;
      const usedMB = (mem.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const totalMB = (mem.totalJSHeapSize / 1024 / 1024).toFixed(1);
      const limitMB = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
      
      samples.push({
        time: new Date().toLocaleTimeString(),
        usedMB: parseFloat(usedMB),
        totalMB: parseFloat(totalMB)
      });
      
      console.log(`[${samples.length * 10}s] 内存: ${usedMB}MB / ${totalMB}MB (限制: ${limitMB}MB)`);
    }
    
    if (Date.now() < endTime) {
      setTimeout(sample, intervalMs);
    } else {
      // 统计结果
      const baseline = samples[0];
      const final = samples[samples.length - 1];
      const growth = final.usedMB - baseline.usedMB;
      const maxUsed = Math.max(...samples.map(s => s.usedMB));
      
      console.log('========== 内存测试结果 ==========');
      console.log(`测试时长: ${durationMinutes}分钟`);
      console.log(`初始内存: ${baseline.usedMB}MB`);
      console.log(`最终内存: ${final.usedMB}MB`);
      console.log(`峰值内存: ${maxUsed}MB`);
      console.log(`内存增长: ${growth.toFixed(1)}MB`);
      console.log(`是否通过: ${growth <= 50 ? '✅ 是' : '❌ 否'}`);
      
      // 绘制简单的内存趋势图
      console.log('\n内存趋势（每10秒）:');
      const maxVal = maxUsed;
      samples.forEach((s, i) => {
        const barLen = Math.round((s.usedMB / maxVal) * 40);
        const bar = '█'.repeat(barLen) + '░'.repeat(40 - barLen);
        console.log(`${String(i * 10).padStart(3)}s ${bar} ${s.usedMB}MB`);
      });
    }
  }
  
  // 启用精确内存测量（需要Chrome支持）
  if (window.performance?.memory) {
    console.log(`内存监控已启动，持续 ${durationMinutes} 分钟...`);
    sample();
  } else {
    console.log('❌ 当前浏览器不支持 performance.memory API');
    console.log('请使用 Chrome 浏览器并开启 --enable-precise-memory-info 标志');
  }
}

// 运行监控
startMemoryMonitor(5);
```

### 常见泄漏点检查清单

| 检查项 | 预期结果 | 检查方法 |
|--------|----------|----------|
| PitchData 数组 | 仅保留 2 秒窗口数据 | 在 T5 快照中搜索 `PitchData`，查看数组长度 |
| requestAnimationFrame | 停止后取消 | 在 Comparison 中查看 `animationFrame` 回调 |
| setTimeout/setInterval | 清除所有定时器 | 搜索 `Timer`，查看 `#Delta` |
| EventListener | 移除所有监听器 | 搜索 `EventListener`，DOM 节点监听器数 |
| MediaRecorder | 正确停止 | 搜索 `MediaRecorder`，确认已销毁 |
| AudioContext | 正确关闭 | 搜索 `AudioContext`，确认无残留 |
| Canvas 缓冲区 | 无内存膨胀 | 搜索 `HTMLCanvasElement`，数量稳定 |

### 验收标准

- ✅ 5 分钟内存增长 ≤ 50MB
- ✅ 堆快照中没有持续增长的对象数组
- ✅ 停止检测后，PitchData 对象被回收
- ✅ DOM 节点数量稳定（波动 < 100）
- ✅ EventListener 数量稳定

---

## 4. 音频-视频同步测试

### 测试目的

验证录音回放时，音频播放与音高曲线动画是否同步（偏差 < 50ms）。

### 测试步骤

```
步骤 1: 准备测试音频
   - 使用音频编辑软件生成一个 10 秒的测试音频
   - 在第 0s, 2s, 4s, 6s, 8s 处插入 1kHz 脉冲（50ms 持续）

步骤 2: 录制脉冲音频
   - 启动 PitchTrainer
   - 点击「开始检测」→「开始录音」
   - 播放测试音频（通过扬声器或音频线输入）
   - 10 秒后点击「停止录音」

步骤 3: 检查录制数据
   - 在 Console 中查看录制的音高数据：
```

```javascript
// 检查录制数据中的脉冲位置
const recordedData = window.appRef?.current?.getRecordingData?.() || [];
console.log('录制数据点数:', recordedData.length);

// 找出音高接近 1kHz 的点
const pulsePoints = recordedData.filter(d => 
  d.confidence > 0.8 && Math.abs(d.pitch - 1000) < 50
);

console.log('检测到的脉冲点:');
pulsePoints.forEach((p, i) => {
  console.log(`  脉冲${i+1}: ${p.time.toFixed(3)}s (音高: ${p.pitch.toFixed(0)}Hz)`);
});

// 计算与预期位置的偏差
const expectedPositions = [0, 2, 4, 6, 8];
pulsePoints.slice(0, 5).forEach((p, i) => {
  const deviation = Math.abs(p.time - expectedPositions[i]) * 1000;
  console.log(`  脉冲${i+1} 偏差: ${deviation.toFixed(1)}ms`);
});
```

```
步骤 4: 回放同步测试
   - 点击「回放」按钮
   - 在 Console 中执行同步监控：
```

```javascript
// 监控回放同步
function monitorPlaybackSync() {
  const visualizer = window.visualizerRef?.current;
  const audio = document.querySelector('audio');
  
  if (!visualizer || !audio) {
    console.log('❌ 找不到 visualizer 或 audio 元素');
    return;
  }
  
  const samples = [];
  const interval = setInterval(() => {
    if (audio.paused) {
      clearInterval(interval);
      analyzeResults();
      return;
    }
    
    const audioTime = audio.currentTime;
    const visualTime = visualizer.getCurrentPlaybackTime?.() || 0;
    const diff = Math.abs(audioTime - visualTime) * 1000;
    
    samples.push({ audioTime, visualTime, diff });
    
    if (samples.length % 10 === 0) {
      console.log(`[${samples.length}] 音频: ${audioTime.toFixed(3)}s, 曲线: ${visualTime.toFixed(3)}s, 偏差: ${diff.toFixed(1)}ms`);
    }
  }, 100);
  
  function analyzeResults() {
    const avgDiff = samples.reduce((a, b) => a + b.diff, 0) / samples.length;
    const maxDiff = Math.max(...samples.map(s => s.diff));
    
    console.log('========== 回放同步测试结果 ==========');
    console.log(`样本数: ${samples.length}`);
    console.log(`平均偏差: ${avgDiff.toFixed(1)}ms`);
    console.log(`最大偏差: ${maxDiff.toFixed(1)}ms`);
    console.log(`是否通过: ${maxDiff < 50 ? '✅ 是' : '❌ 否'}`);
  }
  
  console.log('回放同步监控已启动...');
}

// 启动监控后点击回放
monitorPlaybackSync();
```

### 验收标准

- ✅ 回放时音画最大偏差 < 50ms
- ✅ 录制的脉冲点位置误差 < 20ms
- ✅ 回放进度条与音频播放同步

---

## 5. 响应式布局测试

### 测试目的

验证页面在宽度 < 768px 时布局是否正确适配。

### 测试步骤

```
步骤 1: 使用 DevTools 设备模拟器
   - F12 → 点击「切换设备工具栏」（Ctrl+Shift+M）
   - 在设备列表中选择「Responsive」
   - 设置宽度为 767px（刚好小于断点）

步骤 2: 检查布局
   - Canvas 区域是否在顶部，占视口高度的约 55%
   - 控制面板是否在底部，占视口高度的约 45%
   - 所有按钮和滑块是否可点击、可拖动
   - 文字是否清晰可读

步骤 3: 测试各种视口尺寸
   - 宽度: 320px (iPhone SE)
   - 宽度: 375px (iPhone 12 Pro)
   - 宽度: 425px (Pixel 5)
   - 宽度: 768px (iPad Mini) → 应为桌面布局

步骤 4: 横竖屏切换
   - 点击设备工具栏的「旋转」按钮
   - 检查布局是否正确调整
   - Canvas 尺寸是否重新计算
```

### 自动化布局测试

```javascript
// 在 Console 中执行布局测试
function testResponsiveLayout() {
  const testWidths = [320, 375, 425, 767, 768, 1024, 1280];
  const results = [];
  
  // 获取原始尺寸
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  
  testWidths.forEach(width => {
    // 模拟视口宽度（需要手动调整，此脚本仅检查当前状态）
    const canvasEl = document.querySelector('canvas');
    const panelEl = document.querySelector('.control-panel');
    const isMobile = width < 768;
    
    const canvasRect = canvasEl?.getBoundingClientRect();
    const panelRect = panelEl?.getBoundingClientRect();
    
    const layoutVertical = panelRect && canvasRect && 
      Math.abs(panelRect.left - canvasRect.left) < 10; // 垂直布局
    
    const layoutHorizontal = panelRect && canvasRect && 
      Math.abs(panelRect.top - canvasRect.top) < 10; // 水平布局
    
    const pass = isMobile ? layoutVertical : layoutHorizontal;
    
    results.push({
      width,
      isMobile,
      layout: isMobile ? 'vertical' : 'horizontal',
      canvasWidth: canvasRect?.width?.toFixed(0) || 'N/A',
      canvasHeight: canvasRect?.height?.toFixed(0) || 'N/A',
      pass
    });
    
    console.log(`宽度 ${width}px: ${pass ? '✅' : '❌'} ${isMobile ? '移动端' : '桌面端'}布局, Canvas: ${canvasRect?.width?.toFixed(0)}x${canvasRect?.height?.toFixed(0)}`);
  });
  
  const allPass = results.every(r => r.pass);
  console.log('\n========== 响应式测试结果 ==========');
  console.log(`是否通过: ${allPass ? '✅ 是' : '❌ 否'}`);
  
  return results;
}

// 运行测试（需要手动调整窗口大小）
testResponsiveLayout();
```

### 验收标准

- ✅ 宽度 < 768px 时使用垂直布局（Canvas 在上，面板在下）
- ✅ 宽度 ≥ 768px 时使用水平布局（Canvas 在左，面板在右）
- ✅ Canvas 始终填满可用空间
- ✅ 所有交互元素可正常操作
- ✅ 没有元素溢出或重叠

---

## 6. 完整测试执行清单

### 测试前准备

```
□ 安装依赖: npm install
□ 启动开发服务器: npm run dev
□ 打开 Chrome 浏览器，访问 http://localhost:5173
□ 打开 DevTools (F12)
□ 授权麦克风权限
□ 准备测试音频（1kHz 脉冲）
```

### 测试执行顺序

| 顺序 | 测试项 | 预计耗时 | 文档位置 |
|------|--------|----------|----------|
| 1 | 响应式布局测试 | 5 分钟 | 第 5 节 |
| 2 | 音高检测延迟测试 | 10 分钟 | 第 1 节 |
| 3 | 帧率稳定性测试 | 2 分钟 | 第 2 节 |
| 4 | 音频-视频同步测试 | 10 分钟 | 第 4 节 |
| 5 | 内存泄漏测试 | 10 分钟（等待） | 第 3 节 |
| 6 | 构建验证 | 2 分钟 | 第 7 节 |

### 测试结果记录表

| 测试项 | 结果 | 数值 | 测试时间 | 测试人员 |
|--------|------|------|----------|----------|
| 音高检测延迟 (P95) | ✅/❌ | ____ ms | | |
| 平均帧率 | ✅/❌ | ____ fps | | |
| 5分钟内存增长 | ✅/❌ | ____ MB | | |
| 回放最大偏差 | ✅/❌ | ____ ms | | |
| 响应式布局 | ✅/❌ | 7个尺寸 | | |
| TypeScript 构建 | ✅/❌ | 0错误 | | |

---

## 7. 构建验证

### 测试目的

确保所有修改不引入 TypeScript 编译错误，且生产构建成功。

### 测试步骤

```bash
# 步骤 1: 清理旧的构建产物
rm -rf dist node_modules/.vite

# 步骤 2: 安装依赖（确保完整）
npm install

# 步骤 3: 运行 TypeScript 类型检查和构建
npm run build

# 预期输出:
# - tsc 编译无错误
# - vite 构建成功
# - dist 目录包含以下文件:
#   - dist/index.html
#   - dist/assets/index-*.js
#   - dist/assets/index-*.css
```

### 常见构建错误处理

| 错误信息 | 可能原因 | 修复方法 |
|----------|----------|----------|
| `'xxx' is declared but never read` | 未使用变量 | 删除变量或重命名为 `_xxx` |
| `Property 'xxx' does not exist on type 'yyy'` | 类型不匹配 | 修复类型定义或添加类型断言 |
| `Object is possibly 'undefined'` | 空值检查 | 添加 `?.` 或 `!` 断言 |

### 验收标准

- ✅ `npm run build` 执行成功，退出码为 0
- ✅ TypeScript 编译无错误（noEmitOnError: true）
- ✅ 构建产物在 `dist` 目录中
- ✅ 构建后文件大小合理（< 500KB gzipped）

---

## 附录 A：性能优化监控面板

为方便测试，可以在应用中添加性能监控面板：

```javascript
// 在 App.tsx 中添加开发模式性能监控
const usePerformanceMonitor = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const stats = {
        fps: 0,
        latency: 0,
        memory: 0,
        frameTime: 0
      };
      
      // FPS 监控
      let lastTime = performance.now();
      let frameCount = 0;
      
      function updateFPS() {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          stats.fps = Math.round((frameCount * 1000) / (now - lastTime));
          frameCount = 0;
          lastTime = now;
        }
        requestAnimationFrame(updateFPS);
      }
      requestAnimationFrame(updateFPS);
      
      // 在 Console 中暴露 stats
      window.__PERF_STATS__ = stats;
      
      console.log('%c性能监控已启用', 'color: #16c79a; font-weight: bold;');
      console.log('使用 __PERF_STATS__ 查看实时性能数据');
    }
  }, []);
};
```

---

## 附录 B：测试数据生成脚本

```javascript
// 生成模拟音高数据用于测试
function generateTestPitchData(duration = 30, sampleRate = 60) {
  const data = [];
  const totalSamples = duration * sampleRate;
  
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // 生成接近 A4 (440Hz) 的波动音高
    const baseFreq = 440;
    const vibrato = Math.sin(t * 5) * 2; // 5Hz 颤音，±2Hz
    const drift = Math.sin(t * 0.1) * 10; // 缓慢漂移，±10Hz
    const noise = (Math.random() - 0.5) * 1; // 随机噪声
    
    const pitch = baseFreq + vibrato + drift + noise;
    const confidence = 0.8 + Math.random() * 0.2;
    
    data.push({
      time: t,
      pitch,
      confidence
    });
  }
  
  return data;
}

// 使用测试数据
const testData = generateTestPitchData(30, 60);
console.log(`生成 ${testData.length} 个测试数据点`);
```

---

**文档版本**: v1.0
**最后更新**: 2025-07-01
**适用版本**: PitchTrainer v1.0.0
