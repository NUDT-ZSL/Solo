## 星尘织衣 — 核心算法技术方案

---

## 1. 参数化人体模型与表面采样

### 1.1 人体模型定义

使用17个椭球体基元组合逼近人体，无需加载外部模型文件。坐标系 Y轴朝上，原点在脚底，男性身高 1.75 单位。

```
Male Body Segments (center, radii, weight):
  head:          center=[0, 1.62, 0],    radii=[0.095, 0.105, 0.10],   weight=0.05
  neck:          center=[0, 1.49, 0],    radii=[0.045, 0.04, 0.04],   weight=0.02
  chest:         center=[0, 1.30, 0],    radii=[0.21, 0.16, 0.13],    weight=0.14
  abdomen:       center=[0, 1.08, 0],    radii=[0.18, 0.12, 0.12],    weight=0.09
  hip:           center=[0, 0.92, 0],    radii=[0.19, 0.08, 0.12],    weight=0.07
  leftUpperArm:  center=[-0.28,1.28, 0], radii=[0.045,0.14, 0.045],   weight=0.05, rot=[0,0,0.12]
  rightUpperArm: center=[0.28, 1.28, 0], radii=[0.045,0.14, 0.045],   weight=0.05, rot=[0,0,-0.12]
  leftForearm:   center=[-0.32,1.05,0.02],radii=[0.038,0.13,0.038],   weight=0.04, rot=[0,0,0.08]
  rightForearm:  center=[0.32,1.05,0.02],radii=[0.038,0.13,0.038],    weight=0.04, rot=[0,0,-0.08]
  leftHand:      center=[-0.36,0.90,0.03],radii=[0.03,0.05,0.02],     weight=0.015
  rightHand:     center=[0.36,0.90,0.03], radii=[0.03,0.05,0.02],     weight=0.015
  leftThigh:     center=[-0.09,0.62,0],  radii=[0.075,0.22,0.075],    weight=0.08
  rightThigh:    center=[0.09,0.62,0],   radii=[0.075,0.22,0.075],    weight=0.08
  leftShin:      center=[-0.09,0.30,0],  radii=[0.052,0.22,0.052],    weight=0.06
  rightShin:     center=[0.09,0.30,0],   radii=[0.052,0.22,0.052],    weight=0.06
  leftFoot:      center=[-0.09,0.035,0.04],radii=[0.04,0.03,0.08],   weight=0.02
  rightFoot:     center=[0.09,0.035,0.04], radii=[0.04,0.03,0.08],   weight=0.02

女性比例调整：肩宽 radii.x * 0.85，臀宽 radii.x * 1.15，胸部微调
```

### 1.2 椭球面均匀采样算法

```
函数 sampleEllipsoidSurface(center, radii, rotation, count) → Point[]
  结果 = []
  对于 i = 0 到 count-1:
    // Marsaglia方法：单位球面均匀采样
    θ = random() * 2π
    φ = arccos(2 * random() - 1)
    
    // 单位球面点
    nx = sin(φ) * cos(θ)
    ny = sin(φ) * sin(θ)
    nz = cos(φ)
    
    // 缩放至椭球面
    px = nx * radii.x
    py = ny * radii.y
    pz = nz * radii.z
    
    // 应用旋转（如有）
    若 rotation 存在:
      [px, py, pz] = applyEuler([px, py, pz], rotation)
      [nx, ny, nz] = applyEuler([nx, ny, nz], rotation)  // 法线也旋转
    
    // 平移至中心
    position = [px + center.x, py + center.y, pz + center.z]
    
    // 计算表面法线 = 椭球梯度方向
    normal = normalize([nx/radii.x², ny/radii.y², nz/radii.z²])
    若 rotation 存在: normal = applyEuler(normal, rotation)
    
    结果.push({ position, normal, bodyPartIndex })
  返回 结果
```

### 1.3 粒子初始分布

```
函数 generateParticleBody(particleCount, gender) → ParticleData
  bodyDef = gender == 'male' ? MALE_BODY : FEMALE_BODY
  totalWeight = sum(segment.weight for segment in bodyDef)
  
  所有点 = []
  对于 bodyDef 中每个 segment:
    count = round(particleCount * segment.weight / totalWeight)
    points = sampleEllipsoidSurface(segment.center, segment.radii, segment.rotation, count)
    
    // 沿法线外扩 0.003-0.008 单位（模拟2-6px间距的紧身衣效果）
    对于 points 中每个 point:
      offset = 0.003 + random() * 0.005
      point.position += point.normal * offset
    
    所有点.push(...points)
  
  // 补齐至精确 particleCount
  while 所有点.length < particleCount:
    随机选一段 = bodyDef[floor(random() * bodyDef.length)]
    补充点 = sampleEllipsoidSurface(随机选一段, 1)
    所有点.push(...补充点)
  
  返回 所有点
```

---

## 2. 情绪驱动粒子动力学

### 2.1 文字情感解析

```
数据结构 EmotionWord:
  word: string          // 词语
  sentiment: 'positive' | 'negative' | 'neutral'
  intensity: number     // 0.0 - 1.0
  rhythm: number        // 0.0 - 1.0，节奏间隔比

函数 parseText(text) → EmotionWord[]
  words = segmentChinese(text)  // 基于词典的前向最大匹配分词
  
  结果 = []
  对于 words 中每个 word:
    若 word 在 POSITIVE_DICT 中:
      intensity = POSITIVE_DICT[word]  // 0.3-1.0
      sentiment = 'positive'
    否则 若 word 在 NEGATIVE_DICT 中:
      intensity = NEGATIVE_DICT[word]
      sentiment = 'negative'
    否则:
      intensity = 0.1 + random() * 0.2  // 0.1-0.3
      sentiment = 'neutral'
    
    // 节奏 = 该词字符数 / 总字符数 * 标点间隔因子
    rhythm = word.length / text.length * punctuationFactor(text, word)
    
    结果.push({ word, sentiment, intensity, rhythm })
  返回 结果
```

### 2.2 情绪→粒子属性映射公式

```
颜色映射:
  positive: color = lerp(#FF6B6B, #FFD93D, intensity)
            → RGB = lerp([1.0, 0.42, 0.42], [1.0, 0.85, 0.24], intensity)
  negative: color = lerp(#6BCB77, #4D96FF, intensity)
            → RGB = lerp([0.42, 0.80, 0.47], [0.30, 0.59, 1.0], intensity)
  neutral:  color = #E0E0E0 → RGB = [0.88, 0.88, 0.88]

运动参数映射:
  流动速度 v = 0.5 + intensity * 1.5   (单位: 世界单位/秒, 范围 0.5-2.0)
  轨迹曲率 κ = intensity * π            (曲率越大, 路径越弯曲)
  脉冲频率 f = 0.5 + rhythm * 2.0      (Hz, 控制闪烁/脉冲节奏)

每词控制粒子数 = clamp(floor(2 + intensity * 3), 2, 5)
```

### 2.3 粒子表面流动算法

```
函数 computeFlowOffset(basePos, normal, time, emotionData) → offset
  v = emotionData.speed              // 流动速度
  κ = emotionData.curvature          // 轨迹曲率
  f = emotionData.pulseFreq          // 脉冲频率
  
  // 在表面切平面上构造两个正交切向量
  tangent1 = normalize(cross(normal, [0,1,0]))
  若 |tangent1| < 0.001: tangent1 = normalize(cross(normal, [1,0,0]))
  tangent2 = normalize(cross(normal, tangent1))
  
  // 沿曲线路径流动（Frenet-Serret框架简化）
  phase = time * v + emotionData.phaseOffset
  angle = κ * phase
  
  // 组合切向运动 → 粒子沿曲面螺旋流动
  offset = tangent1 * cos(angle) * 0.02 + tangent2 * sin(angle) * 0.02
  
  // 法向脉冲（呼吸感）
  offset += normal * sin(time * f * 2π) * 0.005 * emotionData.intensity
  
  返回 offset
```

---

## 3. 三种动态模式详细设计

### 3.1 模式1：星尘斗篷

```
参数: 扩散半径 R ∈ [30, 60]px ≈ [0.075, 0.15]世界单位

函数 updateCloakMode(particle, time, deltaTime):
  若 particle.bodyPart ∈ {chest, leftUpperArm, rightUpperArm, neck}:
    // 肩部区域 → 扩散源
    R = 0.075 + particle.randomSeed * 0.075   // 30-60px映射
    phase = time * 1.5 + particle.randomSeed * 2π
    expansionFactor = (sin(phase) + 1) * 0.5   // 0~1 循环
    
    // 扩散方向：从肩部中心向外
    shoulderCenter = [0, 1.35, 0]
    dir = normalize(particle.basePosition - shoulderCenter)
    
    // 外扩 + 回流
    offset = dir * R * expansionFactor
    // 添加轻微上扬（斗篷飘起效果）
    offset.y += R * 0.3 * expansionFactor * sin(phase * 0.7)
    
    particle.position = particle.basePosition + offset + emotionOffset
    particle.opacity = 1.0 - expansionFactor * 0.4  // 扩散时略微透明
  
  否则:
    // 非肩部粒子 → 受扩散波及的涟漪效果
    distToShoulder = distance(particle.basePosition, [0, 1.35, 0])
    ripplePhase = time * 2.0 - distToShoulder * 5.0  // 波从肩部向外传播
    rippleAmp = max(0, 0.02 * (1.0 - distToShoulder * 0.8))
    offset = particle.normal * sin(ripplePhase) * rippleAmp
    
    particle.position = particle.basePosition + offset + emotionOffset
```

### 3.2 模式2：流光长袍

```
参数: 旋转周期 T ∈ [3, 5]秒, 螺旋半径 r = 0.03世界单位

函数 updateRobeMode(particle, time, deltaTime):
  T = 3.0 + particle.randomSeed * 2.0   // 3-5秒周期
  ω = 2π / T                             // 角速度
  θ = ω * time + particle.randomSeed * 2π
  
  若 particle.basePosition.y < 0.92:  // 腰部以下
    // 向下垂坠
    yRatio = (0.92 - particle.basePosition.y) / 0.92  // 0(腰)~1(脚)
    droopOffset = -0.05 * yRatio * yRatio  // 二次下垂曲线
    
    // 螺旋上旋（两侧反向）
    spiralSign = particle.basePosition.x > 0 ? 1 : -1
    spiralOffset = [
      cos(θ * spiralSign) * r * (1 + yRatio),
      sin(θ * spiralSign * 0.5) * r * 0.5,
      sin(θ * spiralSign) * r * (1 + yRatio)
    ]
    
    // 裙摆展开
    flareFactor = yRatio * yRatio * 0.15
    flareDir = normalize([particle.basePosition.x, 0, particle.basePosition.z])
    flareOffset = flareDir * flareFactor * (1 + sin(θ * 0.5) * 0.3)
    
    particle.position = particle.basePosition + [0, droopOffset, 0] + spiralOffset + flareOffset + emotionOffset
  
  否则:  // 腰部以上
    // 沿身体两侧螺旋纹理
    side = particle.basePosition.x > 0 ? 1 : -1
    spiralOffset = [
      cos(θ * side) * r * 0.5,
      sin(θ) * r * 0.3,
      sin(θ * side) * r * 0.5
    ]
    particle.position = particle.basePosition + spiralOffset + emotionOffset
```

### 3.3 模式3：辉光铠甲

```
参数: 密集区密度增加50%, 能量场厚度 ∈ [10, 20]px ≈ [0.025, 0.05]世界单位

函数 updateArmorMode(particle, time, deltaTime):
  isArmorZone = particle.bodyPart ∈ {chest, abdomen, leftUpperArm, rightUpperArm,
                                      leftForearm, rightForearm, leftThigh, rightThigh,
                                      leftShin, rightShin}
  
  若 isArmorZone:
    // 密集护甲层：粒子向身体表面收缩（密度增加50%的表现）
    shrinkFactor = 0.3 + sin(time * 2.0 + particle.randomSeed * 6.28) * 0.1
    targetPos = particle.basePosition - particle.normal * shrinkFactor * 0.01
    
    // 护甲层微颤（能量感）
    jitter = [
      sin(time * 8 + particle.randomSeed * 100) * 0.002,
      cos(time * 7 + particle.randomSeed * 200) * 0.002,
      sin(time * 9 + particle.randomSeed * 300) * 0.002
    ]
    
    particle.position = targetPos + jitter + emotionOffset
    particle.opacity = 0.9 + sin(time * 3) * 0.1
    particle.effectiveSize = particle.baseSize * 1.3  // 略大→密集感
  
  否则:
    // 外围能量场：半透明光晕
    fieldThickness = 0.025 + particle.randomSeed * 0.025  // 10-20px映射
    pulsePhase = time * 1.5 + particle.randomSeed * 2π
    fieldOffset = particle.normal * (fieldThickness + sin(pulsePhase) * 0.01)
    
    particle.position = particle.basePosition + fieldOffset + emotionOffset
    particle.opacity = 0.15 + sin(pulsePhase) * 0.1  // 半透明脉动
    particle.effectiveSize = particle.baseSize * 2.0   // 更大更模糊→光晕感
```

---

## 4. 相机控制与阻尼缓动

### 4.1 球坐标相机

```
结构 CameraState:
  targetTheta: number    // 目标方位角（绕Y轴）
  targetPhi: number      // 目标仰角
  targetRadius: number   // 目标距离
  currentTheta: number
  currentPhi: number
  currentRadius: number
  damping: 0.9           // 阻尼系数

函数 updateCamera(state, deltaTime):
  // 阻尼缓动：每帧当前值向目标值靠近，保留 10% 差值
  factor = 1.0 - state.damping  // = 0.1
  state.currentTheta += (state.targetTheta - state.currentTheta) * factor
  state.currentPhi += (state.targetPhi - state.currentPhi) * factor
  state.currentRadius += (state.targetRadius - state.currentRadius) * factor
  
  // 限制仰角 [-30°, 60°]
  state.currentPhi = clamp(state.currentPhi, -0.524, 1.047)
  // 限制缩放 [0.5x, 3x] 基础距离
  baseDistance = 3.0
  state.currentRadius = clamp(state.currentRadius, baseDistance*0.5, baseDistance*3.0)
  
  // 球坐标→笛卡尔坐标
  camera.position.x = state.currentRadius * sin(state.currentPhi) * sin(state.currentTheta)
  camera.position.y = state.currentRadius * cos(state.currentPhi) + 0.875  // 看向身体中心
  camera.position.z = state.currentRadius * sin(state.currentPhi) * cos(state.currentTheta)
  camera.lookAt(0, 0.875, 0)
```

### 4.2 鼠标拖拽旋转

```
onMouseDown → isDragging = true, 记录 lastMouseX, lastMouseY
onMouseMove:
  若 isDragging:
    deltaX = (currentX - lastX) * 0.005
    deltaY = (currentY - lastY) * 0.005
    cameraState.targetTheta -= deltaX   // 水平拖拽→绕Y轴旋转
    cameraState.targetPhi += deltaY     // 垂直拖拽→仰角变化
    rotationDelta = length(deltaX, deltaY)  // 用于彗星尾迹
onMouseUp → isDragging = false
onWheel:
  cameraState.targetRadius += event.deltaY * 0.003
```

---

## 5. 彗星尾迹效果

```
每粒子额外数据:
  prevPositions: Vec3[6]   // 最近6帧位置（0.1秒@60fps）
  trailActive: boolean
  trailOpacity: number

函数 updateTrails(rotationDeltaMagnitude):
  若 rotationDeltaMagnitude > 0.002:
    // 旋转中 → 激活尾迹
    对于每个粒子:
      // 将当前位置推入历史队列
      shift(prevPositions)  // 移除最老的
      push(currentPosition) // 加入最新的
      trailActive = true
      trailOpacity = 1.0
  否则:
    // 停止旋转 → 尾迹淡出
    对于每个粒子:
      trailOpacity *= 0.85  // 每帧衰减
      若 trailOpacity < 0.01: trailActive = false

渲染：
  mainPoints: 使用当前位置，正常渲染
  trailPoints: 使用 prevPositions[3]（3帧前位置），opacity = trailOpacity * 0.4
  → 在当前和3帧前位置之间产生5-10px的视觉拖尾
```

---

## 6. 录制与回放

### 6.1 录制格式

```typescript
interface RecordingJSON {
  version: 1
  particleCount: number
  keyframeFps: number          // 自适应关键帧率
  duration: number             // 秒
  bodyBounds: { min: [number,number,number], max: [number,number,number] }
  initialColors: number[]      // 初始颜色 (Uint8 RGB per particle)
  initialOpacities: number[]   // 初始透明度 (Uint8 per particle)
  frames: string[]             // 每帧: base64编码的量化位置数据
}

// 位置量化：Float32 → Int16
quantize(pos, bounds) = floor((pos - bounds.min) / (bounds.max - bounds.min) * 65535)
dequantize(val, bounds) = val / 65535 * (bounds.max - bounds.min) + bounds.min
```

### 6.2 自适应关键帧率

```
bytesPerFrame = particleCount * 6   // 3轴 * 2字节(Int16)
maxBase64Size = bytesPerFrame * 1.33
maxFrames = floor(10_000_000 / maxBase64Size)  // 10MB上限
keyframeFps = max(3, floor(maxFrames / 30))    // 至少3fps

5000粒子: bytesPerFrame=30KB, maxFrames≈250, keyframeFps≈8fps
8000粒子: bytesPerFrame=48KB, maxFrames≈156, keyframeFps≈5fps
```

### 6.3 回放插值

```
函数 interpolateFrame(frameA, frameB, t):
  // t ∈ [0, 1]，在两个关键帧之间线性插值
  对于每个粒子 i:
    position[i] = lerp(dequantize(frameA[i]), dequantize(frameB[i]), t)
    color[i] = lerp(frameA.colors[i], frameB.colors[i], t)  // 颜色可从模式+情绪重建
    opacity[i] = lerp(frameA.opacities[i], frameB.opacities[i], t)
```

---

## 7. 性能预算分析

### 7.1 单帧计算耗时预估 (8000粒子)

| 操作 | 预估耗时 |
|------|----------|
| 位置更新 (3模式 + 情绪偏移) | 3-5ms |
| 颜色/透明度更新 | 1-2ms |
| BufferAttribute上传GPU | 1-2ms |
| 尾迹计算 | 1-2ms |
| 相机阻尼更新 | <0.1ms |
| **总计** | **6-11ms** ≤ 12ms ✓ |

### 7.2 内存预估 (8000粒子)

| 数据 | 大小 |
|------|------|
| positions (Float32 * 3) | 96KB |
| basePositions | 96KB |
| colors | 96KB |
| normals | 96KB |
| opacities + sizes + misc | 96KB |
| prevPositions (6帧) | 576KB |
| Three.js渲染资源 | ~50MB |
| **总计** | **~51MB** ≤ 200MB ✓ |

### 7.3 优化策略

- 所有粒子数据使用 Float32Array，避免对象创建和GC
- 模式更新函数内联，无函数调用开销
- BufferAttribute.needsUpdate = true 仅标记修改的属性
- 尾迹点使用独立 Points 对象，仅激活时渲染
- 录制时异步写入，不阻塞主线程
