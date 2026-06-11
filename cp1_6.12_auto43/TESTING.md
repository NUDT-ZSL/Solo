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
延迟包含三个组成部分：
1. **音频采集延迟**：麦克风硬件 + AudioContext 缓冲（约 5-30ms）
2. **信号处理延迟**：PitchTracker 缓冲区 + YIN 算法检测 + 帧间插值（约 10-30ms）
3. **渲染显示延迟**：React state 更新 → Canvas 绘制 → 浏览器合成 → 显示器刷新（约 16-50ms）

### 测试环境准备

#### 1.1 硬件要求

| 设备 | 要求 | 用途 |
|------|------|------|
| 主机 | Windows/macOS/Linux，CPU ≥ 4核 | 运行浏览器 |
| 音频输入输出 | 内置声卡或 USB 音频接口 | 方法C物理回路测试 |
| 音频线缆（可选） | 3.5mm公对公 或 虚拟音频设备 | 方法B/C loopback |

#### 1.2 软件要求

- Chrome / Edge / Brave 浏览器（版本 ≥ 100，基于 Chromium）
- 打开 Chrome DevTools（快捷键 F12 或 Ctrl+Shift+I）
- 确保浏览器支持：
  - `AudioContext.baseLatency` / `AudioContext.outputLatency`（Chrome 102+）
  - `AudioWorklet`（所有现代浏览器）
  - `performance.now()` 高分辨率计时（微秒级精度）

#### 1.3 浏览器预配置

```
步骤 1: 禁用音频自动播放限制
   - 地址栏访问 chrome://flags/#autoplay-policy
   - 选择 "No user gesture is required"
   - 点击 Relaunch 重启浏览器

步骤 2: 启用精确内存信息（可选，用于内存测试）
   - 启动 Chrome 时添加命令行参数：
     Windows: chrome.exe --enable-precise-memory-info
     macOS: open -a "Google Chrome" --args --enable-precise-memory-info

步骤 3: 确保没有其他占用音频的应用运行
   - 关闭音乐播放器、视频会议软件等
```

---

### 测试方法概览

| 方法 | 名称 | 测量内容 | 精度 | 所需设备 | 推荐度 |
|------|------|----------|------|----------|--------|
| A | API 理论验证 | PitchTracker.getLatencyStats() 内部统计 | ±1ms | 仅浏览器 | ★★★ 快速预检 |
| B | Web Audio Loopback | 浏览器内部 AudioContext 回环端到端 | ±5ms | 仅浏览器 | ★★★★ 日常验证 |
| C | 硬件物理回路 | 扬声器→麦克风物理链路真实延迟 | ±1ms | 外放+麦克风/音频线 | ★★★★★ 最终验收 |

---

### 方法 A：API 理论延迟验证（快速预检）

**原理**：通过 PitchTracker 暴露的 `getLatencyStats()` API 获取各阶段延迟的理论计算值，快速验证参数是否配置正确。

#### A.1 测试步骤

```bash
# 终端 1: 启动开发服务器
cd c:/Users/Administrator/Desktop/VersionFastPro/tasks/auto43
npm run dev
```

```
浏览器操作:
   1. 访问 http://localhost:5173
   2. F12 打开 DevTools → Console 标签
   3. 点击页面中的「开始检测」按钮，授权麦克风权限
   4. 等待 3 秒让 AudioWorklet 稳定运行
   5. 在 Console 中执行测试脚本（见下方 A.2）
```

#### A.2 可执行测试脚本

在浏览器 Console 中粘贴执行：

```javascript
// =============================================
// 方法 A: PitchTracker API 理论延迟验证
// =============================================
async function runApiLatencyCheck() {
  console.log('%c=== PitchTracker 理论延迟验证 ===', 'color: #16c79a; font-weight: bold; font-size: 14px;');

  // 等待应用启动（如果尚未启动）
  await new Promise(r => setTimeout(r, 500));

  // 获取 App 实例中的 PitchTracker 引用
  // 注意：需要先手动点击「开始检测」按钮授权麦克风
  const tracker = window.__PITCH_TRACKER__ || 
                  (() => {
                    // 尝试从 React Fiber 查找（生产模式可能不可用）
                    console.warn('⚠️  请确保已点击「开始检测」按钮并授权麦克风');
                    return null;
                  })();

  if (!tracker) {
    console.log('%c请先手动点击「开始检测」按钮，然后重新运行此脚本', 'color: #e94560; font-weight: bold;');
    console.log('%c提示：开发模式下，App.tsx 可将 pitchTrackerRef.current 暴露到 window.__PITCH_TRACKER__', 'color: #f39c12;');
    return;
  }

  // 获取延迟统计
  const stats = tracker.getLatencyStats();
  const uptime = tracker.getUptimeMs();
  const sr = tracker.getSampleRate();
  const bs = tracker.getBufferSize();

  console.log('\n%c── 系统参数 ──', 'color: #0f3460; font-weight: bold;');
  console.log(`采样率:           ${sr} Hz`);
  console.log(`缓冲区大小:       ${bs} samples`);
  console.log(`运行时长:         ${(uptime / 1000).toFixed(2)} s`);
  console.log(`Worklet 处理帧数: ${stats.workletProcessingCount}`);

  console.log('\n%c── 延迟分解 (ms) ──', 'color: #0f3460; font-weight: bold;');
  console.log(`缓冲区延迟:       ${stats.bufferLatencyMs.toFixed(2)} ms`);
  console.log(`  计算: ${bs} samples / ${sr} Hz × 1000 = ${(bs / sr * 1000).toFixed(2)} ms`);
  console.log(`插值帧间隔:       ${stats.interpolationLatencyMs.toFixed(2)} ms`);
  console.log(`  (目标 60fps = ${(1000/60).toFixed(2)} ms/帧)`);
  console.log(`AudioContext 延迟:`);
  console.log(`  baseLatency:     ${(stats.audioContextLatency * 1000).toFixed(2)} ms`);
  console.log(`  outputLatency:   ${(stats.audioContextOutputLatency * 1000).toFixed(2)} ms`);
  console.log(`────────────────────────────`);
  console.log(`%c总估计延迟:       ${stats.totalEstimatedLatencyMs.toFixed(2)} ms`, 
              stats.totalEstimatedLatencyMs < 50 ? 'color: #16c79a; font-weight: bold;' : 'color: #e94560; font-weight: bold;');

  console.log('\n%c── 验收结论 ──', 'color: #0f3460; font-weight: bold;');
  const passEstimated = stats.totalEstimatedLatencyMs < 50;
  const passBuffer = stats.bufferLatencyMs < 20;
  const allPass = passEstimated && passBuffer;

  console.log(`缓冲区 < 20ms:      ${passBuffer ? '✅ 是' : '❌ 否'}`);
  console.log(`总估计 < 50ms:      ${passEstimated ? '✅ 是' : '❌ 否'}`);
  console.log(`预留裕量到 100ms:   ${allPass ? '✅ ' + (100 - stats.totalEstimatedLatencyMs).toFixed(1) + 'ms 裕量' : '❌ 不足'}`);
  console.log(`\n%c最终结论: ${allPass ? '✅ 理论延迟满足要求，请继续方法 B/C 做端到端验证' : '❌ 理论参数不达标，请检查 PitchTracker 配置'}`,
              allPass ? 'color: #16c79a; font-weight: bold; font-size: 13px;' : 'color: #e94560; font-weight: bold; font-size: 13px;');

  return { stats, uptime, pass: allPass };
}

// 执行
runApiLatencyCheck();
```

#### A.3 预期输出示例

```
=== PitchTracker 理论延迟验证 ===

── 系统参数 ──
采样率:           48000 Hz
缓冲区大小:       512 samples
运行时长:         5.23 s
Worklet 处理帧数: 478

── 延迟分解 (ms) ──
缓冲区延迟:       10.67 ms
  计算: 512 samples / 48000 Hz × 1000 = 10.67 ms
插值帧间隔:       16.67 ms
  (目标 60fps = 16.67 ms/帧)
AudioContext 延迟:
  baseLatency:     15.00 ms
  outputLatency:   12.00 ms
────────────────────────────
总估计延迟:       54.34 ms

── 验收结论 ──
缓冲区 < 20ms:      ✅ 是
总估计 < 50ms:      ❌ 否
预留裕量到 100ms:   ❌ 不足

最终结论: ❌ 理论参数不达标（但仍 < 100ms，实际端到端需方法 B/C 验证）
```

---

### 方法 B：Web Audio Loopback 端到端测试（日常验证）

**原理**：在同一个 AudioContext 中，用 OscillatorNode 产生 1kHz 测试脉冲，通过扬声器播放，同时 PitchTracker 的麦克风采集该脉冲（需要系统音频回环或使用虚拟音频线缆）。测量从 Oscillator 调度时间到 PitchTracker 回调触发时间的差值。

#### B.1 前置准备

**方案 B1 - 使用虚拟音频设备（推荐，精度最高）**：
- Windows: 安装 [VB-CABLE Virtual Audio Device](https://vb-audio.com/Cable/)
- macOS: 启用「音频 MIDI 设置」中的「聚集设备」或安装 BlackHole
- 将系统默认输出设为虚拟设备，将 PitchTracker 的输入也设为同一虚拟设备

**方案 B2 - 使用物理外放+麦克风（简单，但易受环境干扰）**：
- 笔记本电脑内置扬声器对准内置麦克风即可
- 测试环境保持安静，关闭其他声源

#### B.2 测试脚本

首先，在 App.tsx 开发模式下暴露 PitchTracker 引用（只需改一次，方便测试）：

```tsx
// 在 App.tsx 的 startDetection 函数末尾添加：
if (import.meta.env.DEV) {
  (window as unknown as { __PITCH_TRACKER__: unknown }).__PITCH_TRACKER__ = pitchTrackerRef.current;
}
```

然后启动应用，点击「开始检测」后，在 Console 中执行：

```javascript
// =============================================
// 方法 B: Web Audio Loopback 端到端延迟测试
// =============================================
async function runLoopbackLatencyTest(numSamples = 30) {
  console.log('%c=== Loopback 端到端延迟测试 ===', 'color: #16c79a; font-weight: bold; font-size: 14px;');
  console.log(`样本数: ${numSamples}，预计耗时: ${Math.ceil(numSamples * 0.6)} 秒`);

  if (!window.__PITCH_TRACKER__) {
    console.log('%c❌ 请先点击「开始检测」并确保 App 暴露了 window.__PITCH_TRACKER__', 'color: #e94560; font-weight: bold;');
    return;
  }

  const results = [];
  const pulseTimestamps = [];  // [{ pulseAudioTime, pulsePerfTime }]
  const detectedPulses = [];   // [{ detectedPerfTime, pitch, confidence }]

  // ---- 步骤 1: 安装 PitchTracker 回调钩子 ----
  const tracker = window.__PITCH_TRACKER__;
  const originalCallback = tracker._callback || null;  // 可能需要改 PitchTracker 暴露

  // 由于 PitchTracker.callback 是 private，我们换一种方式：
  // 通过 Monkey-patch window 的方式检测新的音高数据到达 state
  let latestPitchTime = 0;
  let latestPitchPerf = 0;
  const origSetPitchData = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'); // 占位

  // 实际操作：我们通过监听 AudioWorklet 消息来测量
  // 先记录原始的 port.onmessage
  const origOnMessage = tracker.workletNode?.port.onmessage;
  if (origOnMessage) {
    tracker.workletNode.port.onmessage = (event) => {
      if (event.data?.type === 'audio') {
        latestPitchPerf = performance.now();
      }
      origOnMessage.call(tracker.workletNode.port, event);
    };
  }

  // ---- 步骤 2: 创建脉冲发生器 ----
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 1000;  // 1kHz 测试音
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  gainNode.gain.value = 0;
  oscillator.start();

  // 等待 AudioContext 稳定
  await new Promise(r => setTimeout(r, 300));

  // ---- 步骤 3: 发送 N 个脉冲并记录 ----
  for (let i = 0; i < numSamples; i++) {
    // 等待脉冲间隔（避免重叠）
    await new Promise(r => setTimeout(r, 500));

    // 检测脉冲前的基线（确认为静音）
    const baselinePerf = latestPitchPerf;

    // 调度脉冲：在 audioCtx.currentTime + 0.05 处播放 50ms
    const pulseAudioTime = audioCtx.currentTime + 0.05;
    const pulsePerfTime = performance.now() + 50;  // 预估 performance.now() 时间点

    pulseTimestamps.push({ pulseAudioTime, pulsePerfTime, index: i });

    gainNode.gain.setValueAtTime(0, pulseAudioTime - 0.001);
    gainNode.gain.setValueAtTime(0.3, pulseAudioTime);
    gainNode.gain.setValueAtTime(0, pulseAudioTime + 0.05);

    // 等待脉冲被处理（最多 300ms）
    const pulseStartPerf = pulsePerfTime;
    let detected = false;

    for (let wait = 0; wait < 300; wait += 10) {
      await new Promise(r => setTimeout(r, 10));
      if (latestPitchPerf > pulseStartPerf) {
        const latency = latestPitchPerf - pulsePerfTime;
        if (latency > 0 && latency < 500) {  // 合理范围：0-500ms
          results.push(latency);
          detected = true;
          console.log(`  脉冲 ${String(i + 1).padStart(2)}: 延迟 ${latency.toFixed(1)} ms`);
        }
        break;
      }
    }

    if (!detected) {
      console.log(`  脉冲 ${String(i + 1).padStart(2)}: ⚠️ 未检测到（可能环境噪声或音量不足）`);
    }
  }

  // ---- 步骤 4: 清理 ----
  oscillator.stop();
  await audioCtx.close();

  // 恢复原始 onmessage
  if (origOnMessage && tracker.workletNode) {
    tracker.workletNode.port.onmessage = origOnMessage;
  }

  // ---- 步骤 5: 统计分析 ----
  console.log('\n%c── 统计结果 ──', 'color: #0f3460; font-weight: bold;');
  console.log(`有效样本: ${results.length} / ${numSamples}`);

  if (results.length === 0) {
    console.log('%c❌ 未采集到有效样本，请检查音频回环设置', 'color: #e94560; font-weight: bold;');
    return { results: [], pass: false };
  }

  const sum = results.reduce((a, b) => a + b, 0);
  const avg = sum / results.length;
  const sorted = [...results].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];

  // 标准差
  const variance = results.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / results.length;
  const stdDev = Math.sqrt(variance);

  console.log(`平均延迟:   ${avg.toFixed(1)} ms`);
  console.log(`中位延迟:   ${p50.toFixed(1)} ms`);
  console.log(`最小延迟:   ${min.toFixed(1)} ms`);
  console.log(`最大延迟:   ${max.toFixed(1)} ms`);
  console.log(`P95 延迟:   ${p95.toFixed(1)} ms`);
  console.log(`P99 延迟:   ${p99.toFixed(1)} ms`);
  console.log(`标准差:     ${stdDev.toFixed(1)} ms`);

  // ---- 步骤 6: 验收 ----
  console.log('\n%c── 验收 ──', 'color: #0f3460; font-weight: bold;');
  const passP95 = p95 < 100;
  const passMax = max < 150;
  const passAvg = avg < 50;
  const allPass = passP95 && passMax && passAvg;

  console.log(`P95 < 100ms:  ${passP95 ? '✅' : '❌'}  (${p95.toFixed(1)}ms)`);
  console.log(`Max < 150ms:  ${passMax ? '✅' : '❌'}  (${max.toFixed(1)}ms)`);
  console.log(`Avg < 50ms:   ${passAvg ? '✅' : '❌'}  (${avg.toFixed(1)}ms)`);

  console.log(`\n%c最终结论: ${allPass ? '✅ 端到端延迟满足 <100ms 要求' : '❌ 延迟不达标，需要优化'}`,
              allPass ? 'color: #16c79a; font-weight: bold; font-size: 13px;' : 'color: #e94560; font-weight: bold; font-size: 13px;');

  // 绘制延迟分布直方图（ASCII 版）
  console.log('\n%c── 延迟分布直方图 ──', 'color: #0f3460; font-weight: bold;');
  const bucketSize = 10; // 10ms 一个桶
  const maxBucket = Math.ceil(max / bucketSize) * bucketSize;
  const buckets = {};
  results.forEach(r => {
    const b = Math.floor(r / bucketSize) * bucketSize;
    buckets[b] = (buckets[b] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(buckets));
  Object.keys(buckets).sort((a, b) => Number(a) - Number(b)).forEach(bucket => {
    const count = buckets[bucket];
    const barLen = Math.round((count / maxCount) * 30);
    const bar = '█'.repeat(barLen) + '░'.repeat(30 - barLen);
    const rangeLabel = `${bucket}-${Number(bucket) + bucketSize}ms`.padStart(10);
    console.log(`${rangeLabel} ${bar} ${count} 样本`);
  });

  return { results, avg, p50, p95, p99, min, max, stdDev, pass: allPass };
}

// 执行测试（30 个样本）
runLoopbackLatencyTest(30);
```

#### B.3 预期输出

```
=== Loopback 端到端延迟测试 ===
样本数: 30，预计耗时: 18 秒
  脉冲  1: 延迟 42.3 ms
  脉冲  2: 延迟 38.7 ms
  ...
  脉冲 30: 延迟 45.1 ms

── 统计结果 ──
有效样本: 30 / 30
平均延迟:   41.2 ms
中位延迟:   40.5 ms
最小延迟:   35.8 ms
最大延迟:   52.3 ms
P95 延迟:   48.7 ms
P99 延迟:   52.3 ms
标准差:     4.2 ms

── 验收 ──
P95 < 100ms:  ✅  (48.7ms)
Max < 150ms:  ✅  (52.3ms)
Avg < 50ms:   ✅  (41.2ms)

最终结论: ✅ 端到端延迟满足 <100ms 要求

── 延迟分布直方图 ──
  30-40ms ████████████████░░░░░░░░░░░░ 12 样本
  40-50ms ██████████████████████░░░░░░ 15 样本
  50-60ms ███░░░░░░░░░░░░░░░░░░░░░░░░░  3 样本
```

---

### 方法 C：硬件物理回路真实延迟测量（最终验收）

**原理**：使用外部信号发生器产生精确时间戳的音频脉冲，同时通过高速录音软件同步录制扬声器输出和麦克风输入，离线分析两者时间差。适用于最终交付验收。

#### C.1 所需工具

| 工具 | 用途 | 下载链接 |
|------|------|----------|
| Audacity | 录制和分析音频，测量脉冲时间差 | https://www.audacityteam.org/ |
| 音频线（3.5mm公对公） | 连接扬声器输出到麦克风输入 | 本地电子市场或网购 |
| 或：物理扬声器 + 麦克风 | 真实物理链路测试 | 内置设备即可 |

#### C.2 测试步骤

```
步骤 1: 硬件连接（两种方案二选一）

   方案 C1 (推荐-有线):
   ┌─────────────┐    3.5mm音频线     ┌─────────────┐
   │ 电脑 扬声器输出│──────────────────│电脑 麦克风输入│
   └─────────────┘                    └─────────────┘

   方案 C2 (无线-物理):
   ┌──────────┐    声波(空气)    ┌──────────┐
   │ 扬声器    │ ──────────────→ │ 麦克风    │
   └──────────┘                  └──────────┘
   (距离 10-30cm，减少房间反射)

步骤 2: Audacity 配置
   - 打开 Audacity
   - 编辑 → 首选项 → 音频设置
   - 采样率: 48000 Hz
   - 采样格式: 32-bit float
   - 声道: 1 (单声道) 或 2 (立体声，分别录输入输出)
   - 点击「录制」按钮开始预录

步骤 3: 产生脉冲序列
   - 打开浏览器访问 PitchTrainer
   - F12 → Console，执行以下 JavaScript 产生 10 个间隔 1 秒的 1kHz 脉冲：
```

```javascript
// 在浏览器中执行：生成可被 Audacity 录制的脉冲序列
async function generateCalibrationPulses() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 1000;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.value = 0;
  osc.start();

  console.log('开始生成 10 个校准脉冲...');
  for (let i = 0; i < 10; i++) {
    const t = audioCtx.currentTime + 0.5 + i * 1.0;
    gain.gain.setValueAtTime(0, t - 0.001);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.setValueAtTime(0, t + 0.05);
    console.log(`脉冲 ${i + 1}: 调度在 ${t.toFixed(3)}s`);
  }

  await new Promise(r => setTimeout(r, 11000));
  osc.stop();
  await audioCtx.close();
  console.log('完成！请停止 Audacity 录音');
}

generateCalibrationPulses();
```

```
步骤 4: Audacity 离线分析
   - 停止 Audacity 录音
   - 放大波形找到 10 个脉冲
   - 使用「选择工具」测量每个脉冲上升沿的时间位置
   - 计算: 延迟 = 麦克风检测到的时间 - 脉冲产生的理论时间
   - 注意: 如使用方案 C1（有线），延迟主要来自系统；方案 C2 需额外减去声波传播时间 (距离/343m/s)

步骤 5: 同时测量 PitchTrainer 检测延迟
   - 在 Audacity 录制的同时，PitchTrainer 也在运行
   - PitchTrainer 的 Console 中会输出检测到脉冲的时间戳
   - 对比 Audacity 中脉冲到达时间和 PitchTracker 回调时间，计算应用层处理延迟
```

#### C.3 记录模板

| 脉冲编号 | Audacity检测时间(s) | PitchTracker检测时间(perf ms) | 相对延迟(ms) | 备注 |
|----------|---------------------|--------------------------------|-------------|------|
| 1 | 0.5123 | 542.1 | 42.1 | |
| 2 | 1.5098 | 1538.4 | 38.6 | |
| ... | ... | ... | ... | |
| 10 | 9.5112 | 9544.8 | 43.7 | |
| **P95** | - | - | **45.2 ms** | |
| **Max** | - | - | **46.8 ms** | |

---

### 验收标准（三种方法通用）

| 指标 | 阈值 | 说明 |
|------|------|------|
| P95 延迟 | < 100ms | **硬性指标**，95%的样本必须达标 |
| 最大延迟 | < 150ms | 允许偶发抖动，但不得超过 |
| 平均延迟 | < 50ms | 推荐指标，确保流畅体验 |
| 丢包率 | < 5% | 脉冲检测成功率 ≥ 95% |

### 常见问题排查

| 问题 | 可能原因 | 排查方法 |
|------|----------|----------|
| 检测不到脉冲 | 音量太低 / 麦克风静音 | 检查系统音量，Audacity 看波形幅度 |
| 延迟 > 200ms | 浏览器标签后台被节流 | 确保页面在前台，检查 chrome://discards |
| 延迟波动大 (标准差 > 20ms) | 系统繁忙 / GC 干扰 | 关闭其他应用，测试时不操作页面 |
| 方法 A 显示 __PITCH_TRACKER__ 未定义 | App 未暴露引用 | 按 B.2 节修改 App.tsx |

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
