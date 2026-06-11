# PitchTrainer 架构文档

## 1. 项目概述

PitchTrainer 是一个实时音高与节奏可视化训练应用，使用 TypeScript + React + Vite 构建。

## 2. 目录结构

```
PitchTrainer/
├── index.html                  # 入口页面，全局样式与动画
├── package.json                # 依赖与脚本
├── tsconfig.json               # TypeScript 严格模式配置
├── tsconfig.node.json          # Node 端 TypeScript 配置
├── vite.config.js              # Vite 构建配置
└── src/
    ├── main.tsx               # React 应用入口，初始化音频上下文
    ├── App.tsx                # 主组件，状态管理与数据流中枢
    ├── PitchTracker.ts        # 音频分析模块（音高检测）
    ├── Metronome.ts           # 节拍器模块（BPM控制 + 拍点信号）
    └── Visualizer.tsx         # Canvas 渲染组件（可视化）
```

## 3. 模块职责与调用关系

### 3.1 模块依赖图

```
index.html
    ↓ (加载)
main.tsx
    ↓ (createRoot + render)
App.tsx
    ├─ new ──→ PitchTracker
    │       ↑ (callback: PitchData)
    │
    ├─ new ──→ Metronome
    │       ↑ (callback: BeatEvent)
    │
    └─ props ─→ Visualizer.tsx
            ↑ (imperative handle: addBeat/startPlayback/syncPlaybackTime)
```

### 3.2 各文件详细职责

#### 3.2.1 `src/main.tsx`

**职责**：应用入口
- 预初始化 AudioContext（解决浏览器自动播放限制）
- 挂载 React App 组件
- DOMContentLoaded 事件监听

**导出**：无

**调用关系**：
```
main.tsx
  └─→ App.tsx (React 渲染)
```

---

#### 3.2.2 `src/App.tsx`

**职责**：状态管理中枢 + 布局编排
- 管理所有全局状态（isRunning, isRecording, bpm, pitchData 等）
- 协调 PitchTracker、Metronome、Visualizer 三者交互
- 处理录音/回放/同步逻辑
- 响应式布局计算
- 按钮交互（水波纹动画）

**核心状态**：
| 状态 | 类型 | 描述 |
|------|------|------|
| `isRunning` | boolean | 音高检测是否运行 |
| `isRecording` | boolean | 是否正在录音 |
| `isPlayingBack` | boolean | 是否正在回放 |
| `pitchData` | PitchData[] | 实时音高数据流 |
| `recordedData` | PitchData[] | 已录制的音高数据 |
| `bpm` | number | 节拍器BPM (40-200) |
| `timeSignature` | TimeSignature | 拍号 (2/4,3/4,4/4) |
| `isMobile` | boolean | 是否移动端视口 |

**核心引用**：
```typescript
import { PitchTracker, PitchData } from './PitchTracker';
import { Metronome, BeatEvent, TimeSignature } from './Metronome';
import Visualizer, { VisualizerHandle } from './Visualizer';
```

**调用关系**：
```
App.tsx
  ├─→ PitchTracker.start(handlePitchData)
  │     handlePitchData(pitchData)
  │       ├─→ setPitchData()
  │       └─→ if recording: setRecordedData()
  │
  ├─→ Metronome.start(handleBeat)
  │     handleBeat(beatEvent)
  │       ├─→ visualizerRef.addBeat(beatEvent)
  │       └─→ setActiveBeats()
  │
  └─→ Visualizer [props + ref]
        props: { pitchData, scaleName, scaleNotes, activeBeats,
                 isRecording, recordedData, isPlayingBack }
        ref methods:
          ├─ addBeat(BeatEvent)
          ├─ startPlayback(PitchData[], audioOffset)
          ├─ syncPlaybackTime(currentAudioTime)
          └─ stopPlayback()
```

---

#### 3.2.3 `src/PitchTracker.ts`

**职责**：实时音高分析
- 请求麦克风权限，获取 MediaStream
- 使用 AudioWorklet 进行低延迟音频处理
- Pitchfinder YIN 算法进行音高检测
- 帧间插值（60fps 输出）
- 输出 `{time, pitch, confidence}` 数据流

**核心类**：`PitchTracker`

**核心方法**：
```typescript
start(callback: PitchCallback): Promise<void>
stop(): void
destroy(): void
getLatencyMs(): number  // 理论延迟 = bufferSize / sampleRate * 1000
```

**性能参数**：
| 参数 | 值 | 说明 |
|------|----|------|
| `bufferSize` | 512 | ~10.7ms @ 48kHz |
| `sampleRate` | 48000 Hz | 高采样率提高精度 |
| `targetFrameInterval` | 1000/60 ms | 60fps 插值输出 |
| `interpolation` | 指数插值 | 频率域对数插值 |

**技术栈**：
- `AudioWorklet` 替代已废弃的 `ScriptProcessorNode`
- `Pitchfinder.YIN()` 自相关音高检测算法
- `RMS` 均方根计算信号能量（置信度）

**数据输出**：
```typescript
interface PitchData {
  time: number;       // 相对时间（秒）
  pitch: number;      // 频率（Hz），范围 80-2000
  confidence: number; // 置信度，范围 0-1
}
```

**调用关系**：
```
PitchTracker
  ↓ (使用)
Pitchfinder.YIN()  ← 第三方库
  ↓ (回调)
App.handlePitchData(PitchData)
  ↓
Visualizer.props.pitchData
```

---

#### 3.2.4 `src/Metronome.ts`

**职责**：节拍器 + 拍点信号源
- BPM 控制（40-200）
- 拍号支持（2/4, 3/4, 4/4）
- 前瞻调度器（look-ahead scheduling）保证节拍精准
- 播放 click 音效（强拍 1200Hz，弱拍 800Hz）
- 输出 `BeatEvent` 拍点信号

**核心类**：`Metronome`

**核心方法**：
```typescript
start(callback: BeatCallback): void
stop(): void
setBPM(bpm: number): void
setTimeSignature(sig: TimeSignature): void
isActive(): boolean
```

**调度器参数**：
| 参数 | 值 | 说明 |
|------|----|------|
| `lookahead` | 25 ms | 调度线程调度频率 |
| `scheduleAheadTime` | 0.1 s | 预调度时长 |
| 强拍频率 | 1200 Hz | 小节第一拍 |
| 弱拍频率 | 800 Hz | 其他拍 |

**拍点事件**：
```typescript
interface BeatEvent {
  time: number;        // 相对时间（秒）
  beatNumber: number;  // 当前小节第几拍 (0-based)
  totalBeats: number;  // 每小节拍数
  isDownbeat: boolean; // 是否强拍
}
```

**调用关系**：
```
Metronome
  ├─ AudioContext (Oscillator + GainNode) 生成 click 音
  └─ window.setTimeout() 前瞻调度器
       ↓ 每拍调度
       scheduleNote()
         ├─ Oscillator.play() 播放音效
         └─ callback(BeatEvent)
             ↓
App.handleBeat(BeatEvent)
  ├─→ visualizerRef.addBeat(BeatEvent)
  └─→ setActiveBeats()
```

---

#### 3.2.5 `src/Visualizer.tsx`

**职责**：Canvas 可视化渲染
- 双缓冲绘制（消除闪烁）
- 实时音高曲线（贝塞尔曲线平滑）
- 音阶参考线（命中高亮）
- 拍点指示（竖线 + 底部圆形脉冲）
- 回放进度光标
- 录音 Ghost 轨迹（半透明保留）
- REC 录制指示

**核心组件**：`Visualizer` (forwardRef + useImperativeHandle)

**外部 API（通过 ref 调用）**：
```typescript
interface VisualizerHandle {
  addBeat(event: BeatEvent): void;
  startPlayback(data: PitchData[], audioStartTime?: number): void;
  stopPlayback(): void;
  syncPlaybackTime(currentPlaybackTime: number): void;
}
```

**Props 输入**：
```typescript
interface VisualizerProps {
  pitchData: PitchData[];      // 实时音高数据
  scaleName: string;           // 音阶名称
  scaleNotes: number[];        // 音阶音级数组
  activeBeats: BeatEvent[];    // 拍点数据
  isRecording: boolean;        // 是否录制中
  recordedData: PitchData[];   // 已录制数据（用于Ghost轨迹）
  isPlayingBack: boolean;      // 是否回放中
}
```

**渲染性能参数**：
| 参数 | 值 | 说明 |
|------|----|------|
| `frameInterval` | 1000/30 ms | 30fps 帧率锁 |
| `MAX_DISPLAY_POINTS` | 1000 | 单帧最多绘制点（降采样） |
| `WINDOW_SECONDS` | 2 | 横轴显示时长（秒） |
| `GHOST_TRAIL_ALPHA` | 0.35 | 录制轨迹透明度 |

**绘制顺序（从后到前）**：
1. 背景径向渐变 + 网格线
2. 半音阶参考线（灰色虚线）
3. 当前音阶参考线（彩色虚线，命中高亮）
4. 录制 Ghost 轨迹（半透明）
5. 实时音高曲线（贝塞尔曲线，颜色按偏差渐变）
6. 拍点竖线
7. 回放进度光标（红色渐变竖线）
8. 底部拍点圆形脉冲指示
9. REC 录制闪烁指示
10. 当前音高信息标签（音名 + 频率 + 偏差）

**双缓冲实现**：
```
backCanvas (离屏)
  └─ draw() 所有绘制操作
     └─ frontCanvas.drawImage(backCanvas, 0, 0)
        单次绘制到可见画布，消除闪烁
```

**调用关系**：
```
Visualizer
  ├─ 输入: App.props (pitchData, scale, beats, etc.)
  ├─ 输入: App.ref.call (addBeat, startPlayback, syncPlaybackTime)
  └─ 输出: Canvas 2D 渲染
        └─ 双缓冲: backCanvas → frontCanvas (drawImage)
```

---

## 4. 完整数据流向图

### 4.1 实时检测数据流

```
  麦克风输入 (getUserMedia)
      ↓ 48kHz 单声道
  AudioWorklet Processor (512 samples buffer)
      ↓ ~10.7ms 处理延迟
  Pitchfinder.YIN() 音高检测
      ↓
  帧间指数插值 (60fps 输出)
      ↓
  App.handlePitchData(PitchData)
      ├─→ setPitchData(prev => trim(prev, 10s))
      │     ↓ (React state update)
      │   Visualizer.props.pitchData
      │     ↓ (useEffect 触发重渲染)
      │   backCanvas 绘制
      │     ↓ drawImage
      │   frontCanvas 显示
      │
      └─→ if isRecording
             ↓ 时间戳对齐 (performance.now())
           setRecordedData(prev => prev.slice(-10000))
```

### 4.2 节拍器数据流

```
  Metronome.setBPM(100) + setTimeSignature('4/4')
      ↓
  Metronome.start(handleBeat)
      ↓
  setTimeout(lookahead=25ms) 调度循环
      ↓
  计算 nextNoteTime
      ↓
  scheduleNote(beatNumber, time)
      ├─→ Oscillator (1200Hz/800Hz) 播放 click
      └─→ callback(BeatEvent)
            ↓
  App.handleBeat(BeatEvent)
      ├─→ visualizerRef.addBeat(BeatEvent)
      │     ↓ (imperative handle)
      │   Visualizer.localBeatsRef.push(beat)
      │     ↓ (draw loop 每帧读取)
      │   Canvas 绘制拍点竖线 + 底部脉冲
      │
      └─→ setActiveBeats(prev => filter old beats)
            ↓
          Visualizer.props.activeBeats
```

### 4.3 录音 → 回放数据流

```
  startRecording()
      ├─→ MediaRecorder(stream).start(100)
      │     ↓ ondataavailable
      │   recordedChunksRef.push(Blob)
      │
      ├─→ recordingSyncRef = {
      │     audioStartPerformanceTime: now + 0.05,
      │     pitchStartPerformanceTime: now
      │   }
      │
      └─→ handlePitchData() 内
             ↓ 调整 time 戳
           recordedData.push({ ...data, time: adjustedTime })

  stopRecording()
      ├─→ MediaRecorder.stop()
      └─→ recordedData 完整保留

  startPlayback()
      ├─→ new Audio(Blob URL).play()
      │     ↓ oncanplay → play()
      │   audioOffset = actualStartTime - scheduledStartTime
      │
      ├─→ visualizerRef.startPlayback(recordedData, audioOffset)
      │
      └─→ setInterval(100ms) 同步
             ↓
           visualizerRef.syncPlaybackTime(audio.currentTime)
                 ↓
               playbackStartTimeRef = performance.now()/1000 - currentTime
                 ↓
               draw loop 使用同步后的时间计算视图窗口
```

## 5. 性能优化点

### 5.1 音高检测延迟优化
- **缓冲区大小**：2048 → 512 samples (~46ms → ~10.7ms @ 48kHz)
- **处理技术**：ScriptProcessorNode → AudioWorklet（主线程无阻塞）
- **插值策略**：检测帧之间指数插值到 60fps，视觉流畅无跳变
- **时间戳校正**：Worklet 内计算 `currentTime - bufferSize/sampleRate`，消除处理延迟

### 5.2 渲染性能优化
- **双缓冲**：所有绘制在离屏 backCanvas 完成，最后一次 drawImage 到 frontCanvas
- **帧率锁**：30fps，通过 `timestamp - lastFrameTime >= frameInterval` 控制
- **降采样**：超过 1000 点时自动 stride 降采样，避免绘制压力
- **二分查找**：`findSegmentData()` 用二分查找定位时间窗口，O(log n) 复杂度
- **useMemo**：音阶参考线、颜色、布局样式等均缓存

### 5.3 内存优化
- **数据裁剪**：实时数据保留最近 10 秒，录制数据最多 10000 点
- **引用清理**：所有 timer、stream、observer 在 cleanup 中释放
- **useRef 替代 state**：高频数据（beat buffer）存储在 ref 避免重渲染

## 6. 模块化设计验证矩阵

| 模块 | 职责单一性 | 松耦合度 | 可测试性 | 验证方式 |
|------|-----------|----------|----------|----------|
| PitchTracker | ✅ 仅音频分析 | ✅ 仅依赖 pitchfinder | ✅ 可单独实例化 | 输入已知频率音频，验证输出 pitch |
| Metronome | ✅ 仅节拍调度 | ✅ 独立类，无 React 依赖 | ✅ 可单独实例化 | mock AudioContext，验证 beat 间隔 |
| Visualizer | ✅ 仅 Canvas 渲染 | ✅ 仅通过 props/ref 通信 | ✅ 可单独测试 | 传入构造数据，验证绘制结果 |
| App.tsx | ✅ 仅状态编排 | ✅ 三个子模块解耦 | ⚠️ 需集成测试 | 端到端测试完整流程 |

## 7. 关键交互时序图

```
用户点击「开始检测」
    ↓
App.startDetection()
    ├─→ new PitchTracker()
    └─→ PitchTracker.start(handlePitchData)
          ├─ getUserMedia() 麦克风授权
          ├─ AudioWorklet 初始化
          └─ 开始输出 PitchData

用户滑动 BPM 滑块
    ↓
onChange → setBpm(120)
    ↓
useEffect([bpm]) → metronomeRef.setBPM(120)
    ↓
Metronome 调度器使用新 BPM 计算 nextNoteTime

用户点击「开始录音」
    ↓
App.startRecording()
    ├─ MediaRecorder 启动
    ├─ recordingSyncRef 记录时间戳基准
    └─ handlePitchData 内开始写入 recordedData

用户点击「回放」
    ↓
App.startPlayback()
    ├─ Audio.play() 启动音频
    ├─ 计算 audioOffset 对齐延迟
    ├─ visualizerRef.startPlayback(data, offset)
    └─ 每 100ms syncPlaybackTime(audio.currentTime)
          ↓
        Visualizer 调整 playbackStartTimeRef
          ↓
        曲线动画与音频严格同步
```
