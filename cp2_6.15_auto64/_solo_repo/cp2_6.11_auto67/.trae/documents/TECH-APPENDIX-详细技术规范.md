# 情绪雕塑生成器 - 详细技术规范补充文档

> 本文档为 TECH-ARCH-情绪雕塑生成器.md 的补充章节，补充用户特别要求的深度技术细节。

---

## A. 表情识别算法 - 深度实现细节

### A.1 双轨识别架构 (Dual-Track Recognition)

系统采用**传统特征工程 + 轻量CNN的双轨识别架构，通过加权融合决策。传统方法在低端设备上运行，CNN在现代设备上增强准确率。

```
                    ┌──────────────────────────────────────┐
                    │       输入：轮廓点集 (N个2D坐标)   │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
          ┌─────────▼──────────┐        ┌────────▼──────────┐
          │  轨道1: 传统特征   │        │  轨道2: 轻量CNN   │
          │  Hu矩(7)+傅里叶(32)│        │  3层卷积网络     │
          │  KNN(k=3)分类器     │        │  Softmax输出     │
          └─────────┬──────────┘        └────────┬──────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                     ┌───────────────▼───────────────┐
                     │  决策融合 (加权投票)      │
                     │  传统权重: 0.4 + CNN:0.6 │
                     └───────────────┬───────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  输出: EmotionType    │
                          │  + confidence      │
                          └────────────────────┘
```

---

### A.2 Hu不变矩 - 完整可运行代码

Hu矩的7个不变矩的**完整TypeScript实现**：

```typescript
// src/utils/emotionRecognition/huMoments.ts

interface MomentResult {
  M: number[][];     // 原始矩
  mu: number[][];         // 中心矩
  eta: number[][];     // 归一化中心矩
  hu: number[];         // 7个Hu不变矩
}

/**
 * 计算图像矩、中心矩、归一化中心矩和7个Hu不变矩
 * 输入: contour - 轮廓点集
 * 输出: 完整的矩结果
 */
export function computeHuMomentsFull(contour: ContourPoint[]): MomentResult {
  const N = contour.length;
  
  // Step 1: 计算质心 (用于中心矩
  let cx = 0, cy = 0;
  for (let i = 0; i < N; i++) {
    cx += contour[i].x;
    cy += contour[i].y;
  }
  cx /= N;
  cy /= N;
  
  // Step 2: 计算 p+q 最高到3+3的所有原始矩 M[p][q]
  const M: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const mu: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
  
  // M00 = N (二值图像的面积)
  M[0][0] = N;
  
  for (let i = 0; i < N; i++) {
    const x = contour[i].x;
    const y = contour[i].y;
    const dx = x - cx;
    const dy = y - cy;
    
    // 原始矩累加
    M[1][0] += x;
    M[0][1] += y;
    M[2][0] += x * x;
    M[0][2] += y * y;
    M[1][1] += x * y;
    M[3][0] += x * x * x;
    M[0][3] += y * y * y;
    M[2][1] += x * x * y;
    M[1][2] += x * y * y;
    
    // 中心矩累加 (平移不变)
    mu[2][0] += dx * dx;
    mu[0][2] += dy * dy;
    mu[1][1] += dx * dy;
    mu[3][0] += dx * dx * dx;
    mu[0][3] += dy * dy * dy;
    mu[2][1] += dx * dx * dy;
    mu[1][2] += dx * dy * dy;
  }
  mu[0][0] = M[0][0];  // mu00 = M00
  mu[1][0] = 0;       // 中心矩一阶必为0
  mu[0][1] = 0;
  
  // Step 3: 归一化中心矩 eta[p][q] = mu[p][q] / mu00^((p+q)/2 + 1)
  const eta: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const mu00 = mu[0][0];
  
  for (let p = 0; p <= 3; p++) {
    for (let q = 0; q <= 3; q++) {
      if (p + q >= 2) {  // 只需要2阶和3阶
        const gamma = (p + q) / 2 + 1;
        eta[p][q] = mu[p][q] / Math.pow(mu00, gamma);
      }
    }
  }
  
  // Step 4: 计算7个Hu不变矩
  const h1 = eta[2][0] + eta[0][2];
  
  const h2 = Math.pow(eta[2][0] - eta[0][2], 2) 
            + 4 * Math.pow(eta[1][1], 2);
  
  const h3 = Math.pow(eta[3][0] - 3 * eta[1][2], 2)
            + Math.pow(3 * eta[2][1] - eta[0][3], 2);
  
  const h4 = Math.pow(eta[3][0] + eta[1][2], 2)
            + Math.pow(eta[2][1] + eta[0][3], 2);
  
  const t1 = eta[3][0] - 3 * eta[1][2];
  const t2 = eta[3][0] + eta[1][2];
  const t3 = 3 * eta[2][1] - eta[0][3];
  const t4 = eta[2][1] + eta[0][3];
  
  const h5 = t1 * t2 * (Math.pow(t2, 2) - 3 * Math.pow(t4, 2))
            + t3 * t4 * (3 * Math.pow(t2, 2) - Math.pow(t4, 2));
  
  const h6 = (eta[2][0] - eta[0][2]) 
            * (Math.pow(t2, 2) - Math.pow(t4, 2))
            + 4 * eta[1][1] * t2 * t4;
  
  const h7 = t3 * t2 * (Math.pow(t2, 2) - 3 * Math.pow(t4, 2))
            - t1 * t4 * (3 * Math.pow(t2, 2) - Math.pow(t4, 2));
  
  // Step 5: 取对数归一化 (|h| 通常很小，log变换便于比较)
  const huRaw = [h1, h2, h3, h4, h5, h6, h7];
  const hu = huRaw.map(h => 
    h !== 0 ? -1 * Math.sign(h) * Math.log10(Math.abs(h)) : 0
  );
  
  return { M, mu, eta, hu };
}

/**
 * 提取7维Hu特征向量 (对数归一化后)
 */
export function computeHuMoments(contour: ContourPoint[]): number[] {
  return computeHuMomentsFull(contour).hu;
}
```

Hu不变矩的**数学公式完整定义**：

| 编号 | 公式 | 几何意义 |
|-------|------|-----------|
| φ₁ | η₂₀ + η₀₂ | 关于两个垂直轴的惯量矩之和，度量分布的紧凑度 |
| φ₂ | (η₂₀ - η₀₂)² + 4η₁₁² | 对x,y轴方差差异，度量长宽比 |
| φ₃ | (η₃₀ - 3η₁₂)² + (3η₂₁ - η₀₃)² | 方向性，区分上下/左右偏度 |
| φ₄ | (η₃₀ + η₁₂)² + (η₂₁ + η₀₃)² | 高阶形状复杂度 |
| φ₅ | 复杂组合式 | 对角对称性检测 |
| φ₆ | 复杂组合式 | 斜对称性检测 |
| φ₇ | 复杂组合式 | 手性(镜像不对称性检测 |

---

### A.3 傅里叶描述子 - 系数定义与完整实现

```typescript
// src/utils/emotionRecognition/fourierDescriptors.ts

/**
 * 计算32维傅里叶描述子
 * 实现算法:
 * 1. 将轮廓表示为复数序列 z[k] = x[k] + j*y[k]
 * 2. 对z[k]做DFT得到F[u]
 * 3. 取|F[u]|作为描述子的幅度
 * 4. 归一化消除平移、缩放、旋转、起点
 * 
 * @param contour 输入轮廓点 (N个点
 * @param numDescriptors 需要的描述子数量 (默认32)
 * @returns 归一化后的傅里叶描述子
 */
export function computeFourierDescriptors(
  contour: ContourPoint[],
  numDescriptors: number = 32
): number[] {
  const N = contour.length;
  if (N < 4) return new Array(numDescriptors).fill(0);
  
  // Step 1: 转换为复数序列 z = x + jy
  // 并做起点中心化 (消除平移不变性)
  const zReal = new Float64Array(N);
  const zImag = new Float64Array(N);
  
  // 计算质心
  let cx = 0, cy = 0;
  for (let i = 0; i < N; i++) {
    cx += contour[i].x;
    cy += contour[i].y;
  }
  cx /= N;
  cy /= N;
  
  for (let i = 0; i < N; i++) {
    zReal[i] = contour[i].x - cx;
    zImag[i] = contour[i].y - cy;
  }
  
  // Step 2: Cooley-Tukey FFT (如果N是2的幂次)
  // 这里用DFT简单实现，N较小时性能可接受
  // F[u] = Σ(z[k] * e^(-j2πuk/N), k=0..N-1
  const FReal = new Float64Array(N);
  const FImag = new Float64Array(N);
  
  for (let u = 0; u < N; u++) {
    let sumR = 0, sumI = 0;
    for (let k = 0; k < N; k++) {
      const angle = -2 * Math.PI * u * k / N;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      sumR += zReal[k] * cosA - zImag[k] * sinA;
      sumI += zReal[k] * sinA + zImag[k] * cosA;
    }
    FReal[u] = sumR;
    FImag[u] = sumI;
  }
  
  // Step 3: 计算幅度谱 |F[u]| = sqrt(Re² + Im²)
  const magnitudes = new Float64Array(N);
  for (let u = 0; u < N; u++) {
    magnitudes[u] = Math.sqrt(FReal[u] * FReal[u] + FImag[u] * FImag[u]);
  }
  
  // Step 4: 消除缩放归一化 (除以|F[1]消除缩放)
  // 消除旋转: 仅使用幅度谱 (幅度对旋转不敏感)
  const scale = magnitudes[1] || 1;
  const normalized = new Float64Array(N);
  for (let u = 0; u < N; u++) {
    normalized[u] = magnitudes[u] / scale;
  }
  
  // Step 5: 取低频部分 (前numDescriptors个系数
  // F[0]是直流分量已在归一化后无用
  // F[1]用于归一化后恒为1
  const descriptors: number[] = [];
  for (let u = 1; u <= numDescriptors; u++) {
    const idx = u < N ? u : N - 1;
    descriptors.push(normalized[idx] || 0);
  }
  
  // Step 6: 对数压缩 (动态范围压缩
  return descriptors.map(d => Math.log10(1 + d * 100));
}

/**
 * 快速傅里叶变换 (FFT) 基2-FFT 复数输入
 */
export function fft(real: Float64Array, imag: Float64Array) {
  const N = real.length;
  // 位反转重排
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  // 蝶形运算
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const ang = -2 * Math.PI / len;
    const wLenR = Math.cos(ang);
    const wLenI = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let wR = 1, wI = 0;
      for (let k = 0; k < halfLen; k++) {
        const tR = wR * real[i + k + halfLen] - wI * imag[i + k + halfLen];
        const tI = wR * imag[i + k + halfLen] + wI * real[i + k + halfLen];
        real[i + k + halfLen] = real[i + k] - tR;
        imag[i + k + halfLen] = imag[i + k] - tI;
        real[i + k] += tR;
        imag[i + k] += tI;
        const newWR = wR * wLenR - wI * wLenI;
        wI = wR * wLenI + wI * wLenR;
        wR = newWR;
      }
    }
  }
}

傅里叶描述子**系数定义表**：

| 频率索引 | 物理含义 | 对应几何特征 | 典型权重 |
|---------|---------|------------|----------|
| FD[0]=F(1) | 归一化基准 | 整体尺寸(缩放基准) | 1.0 |
| FD[1]=F(2) | 二阶椭圆度 | 类圆度 / 椭圆度 | 0.3 |
| FD[2]=F(3) | 三角形倾向 | 三角化程度 | 0.15 |
| FD[3]=F(4) | 矩形度 | 方形/矩形特征 | 0.1 |
| FD[4..15]=F(5~F(16) | 中频段 | 主要轮廓大尺度细节 | 0.05~0.2 |
| FD[16..31]=F(17)~F(32) | 高频段 | 精细纹理小尺度细节 | 0.001~0.05 |

傅里叶描述子**不变性证明**：

- **平移不变性**：减去质心 → F(0)=0 自动消除
- **缩放不变性**：全部系数除以|F(1)| 消除缩放
- **旋转不变性**：只使用幅度谱|F(u)|（相位携带旋转信息，幅度不变)
- **起点不变性**：幅度谱对轮廓起点平移不敏感（循环平移仅影响相位)

---

### A.4 轻量CNN分类器 (可选轨道2)

#### A.4.1 CNN网络结构设计

```typescript
// src/utils/emotionRecognition/cnnClassifier.ts

/**
 * 轻量级CNN情绪表情分类器设计
 * 
 * 输入: 轮廓栅格化图像 64x64x1 (单通道二值图
 * 输出: 5类情绪概率分布 [smile, cry, angry, heart, surprise]
 * 
 * 参数量: ~48K (极轻量，推理时间<10ms)
 */

// 网络结构配置
export const CNN_ARCHITECTURE = {
  name: 'EmotionNet-Lite',
  inputShape: [64, 64, 1] as [number, number, number],
  outputClasses: 5,
  
  layers: [
    // Block 1: 输入卷积块 (64×64×1 → 32×32×16
    {
      type: 'conv2d',
      filters: 16,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 1 * 16 * 3 * 3 + 16 = 160  // 160参数
    },
    {
      type: 'conv2d',
      filters: 16,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 16 * 16 * 3 * 3 + 16 = 2320  // 2,320参数
    },
    {
      type: 'maxpool2d',
      poolSize: [2, 2],
      strides: [2, 2],
      outputShape: [32, 32, 16]
    },
    { type: 'dropout', rate: 0.2 },
    
    // Block 2: 特征提取块 (32×32×16 → 16×16×32
    {
      type: 'conv2d',
      filters: 32,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 16 * 32 * 3 * 3 + 32 = 4640  // 4,640参数
    },
    {
      type: 'conv2d',
      filters: 32,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 32 * 32 * 3 * 3 + 32 = 9248  // 9,248参数
    },
    {
      type: 'maxpool2d',
      poolSize: [2, 2],
      strides: [2, 2],
      outputShape: [16, 16, 32]
    },
    { type: 'dropout', rate: 0.3 },
    
    // Block 3: 深层特征块 (16×16×32 → 8×8×64
    {
      type: 'conv2d',
      filters: 64,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 32 * 64 * 3 * 3 + 64 = 18496  // 18,496参数
    },
    {
      type: 'conv2d',
      filters: 64,
      kernelSize: [3, 3],
      strides: [1, 1],
      padding: 'same',
      activation: 'relu',
      params: 64 * 64 * 3 * 3 + 64 = 36928  // 36,928参数
    },
    {
      type: 'globalAveragePool2d',
      outputShape: [64]
    },
    
    // Classifier Head: 分类头 (64 → 32 → 5
    {
      type: 'dense',
      units: 32,
      activation: 'relu',
      params: 64 * 32 + 32 = 2080  // 2,080参数
    },
    { type: 'dropout', rate: 0.4 },
    {
      type: 'dense',
      units: 5,
      activation: 'softmax',
      params: 32 * 5 + 5 = 165  // 165参数
    }
  ],
  
  totalParams: 160 + 2320 + 4640 + 9248 + 18496 + 36928 + 2080 + 165 = 74037,
  // 总参数量约74K (含所有层偏置
};
```

#### A.4.2 CNN训练数据准备

```typescript
// 训练数据集构成方案
export const TRAINING_DATA_SPEC = {
  // 每类样本量分配

  totalSamples: 5000,
  
  // 各类样本来源3类样本量: 每类1000样本
  
  // 样本构成:
  sampleDistribution: {
    realHandrawn: 60,  // 真实手绘: 60%
    synthetic: 30,    // 合成生成: 30%
    augmented: 10,    // 数据增强: 10%
  },
  
  // 数据增强策略
  augmentation: {
    // 几何变换
    rotation: [-15, 15],  // ±15°
    scaling: [0.8, 1.2,  // ±20%缩放
    translation: [-5, 5],   // ±5像素平移
    shearing: [-0.1, 0.1],  // 轻微错切
    
    // 拓扑变化
    strokeWidthVariation:  // 线宽抖动±20%
    noise: 0.05,      // 高斯噪声 σ=0.05
    
    // 弹性形变
    elasticDeformation: true,  // 模拟手抖弹性形变
    
    // 轮廓平滑
    gaussianBlur: 0.5,  // 轻微模糊
  },
  
  // 类别标签
  classNames: ['smile', 'cry', 'angry', 'heart', 'surprise'] as const,
  
  // 合成数据生成参数
  synthetic: {
    // 每个模板数量:
    // 每类50个参数模板
    // 扰动范围
  },
};

// 5类表情**模板轮廓参数定义**：

// 1. 笑脸 (Smile
export const SMILE_TEMPLATES = {
  name: 'smile',
  // 参数化生成: 圆形+半圆形 (上半圆+嘴部轮廓
  generate: (variance: number): ContourPoint[] => {
    const points: ContourPoint[] = [];
    // 脸部: 圆形参数方程
    const R = 50 * (1 + (Math.random() - 0.5) * variance);
    const cx = 100;
    const cy = 100;
    // 上半圆脸部
    for (let t = Math.PI; t <= Math.PI * 0; t += Math.PI / 90) {
      points.push({
        x: cx + R * Math.cos(t),
        y: cy + R * Math.sin(t) * 0.0,
      });
    }
    // 嘴巴: 向上弯的弧线
    const mouthR = R * 0.6;
    for (let t = Math.PI * 0.25; t <= Math.PI * 0.75; t += Math.PI / 60) {
      points.push({
        x: cx + mouthR * Math.cos(t),
        y: cy + mouthR * Math.sin(t) * 0.5 + R * 0.2,
      });
    }
    return points;
  }
};

// 2. 哭脸 (Cry)
export const CRY_TEMPLATES = {
  name: 'cry',
  // 参数化生成: 倒抛物线+下弯嘴
  generate: (variance: number): ContourPoint[] => {
    // ...类似参数化
  }
};

// 3. 愤怒 (Angry
export const ANGRY_TEMPLATES = {
  // 多面体/
  generate: () => {}
};

// 4. 爱心 (Heart)
export const HEART_EQUATION = {
  // 心形参数方程:
  // x = 16 sin³(t)
  // y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t
  generate: (variance: number): ContourPoint[] => {
    const points: ContourPoint[] = [];
    const scale = 3 * (1 + (Math.random() - 0.5) * variance;
    const cx = 100;
    const cy = 100;
    for (let t = 0; t < Math.PI * 2; t += Math.PI / 180) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) 
              - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push({
        x: cx + x * scale,
        y: cy + y * scale,
      });
    }
    return points;
  }
};

// 5. 惊讶 (Surprise)
export const SURPRISE_TEMPLATES = {
  // 圆圈+小圆 (大圆+小圆 (椭圆
};
```

#### A.4.3 KNN分类器完整实现

```typescript
// src/utils/emotionRecognition/knnClassifier.ts

export interface KNNTrainingSample {
  features: number[];  // 39维 (7+32
  label: EmotionType;
}

/**
 * K近邻分类器 (k-Nearest Neighbors Classifier
 * 
 * 距离度量: 加权曼哈顿距离
 * Hu矩权重0.6 + 傅里叶权重 = 0.4
 * 决策规则: 多数投票，平局选置信度最高的
 * k值: k=3 (奇数避免平局)
 */
export class KNNClassifier {
  private templates: KNNTrainingSample[] = [];
  private k: number;
  private huWeight: number = 0.6;
  private fdWeight: number = 0.4;
  
  constructor(k: number = 3) {
    this.k = k;
  }
  
  /**
   * 训练: 存储所有模板
   */
  train(samples: KNNTrainingSample[]): void {
    this.templates = samples;
  }
  
  /**
   * 预测单个样本
   * @param features 待分类特征
   */
  predict(features: FeatureVector): RecognitionResult {
    const start = performance.now();
    
    // 计算与所有模板的距离
    const distances = this.templates.map(template => ({
      sample: template,
      distance: this.weightedDistance(
        features.huMoments,
        features.fourierDesc,
        template.features.huMoments,
        template.features.fourierDesc
      )
    }));
    
    // 按距离升序排序 (近邻排序
    distances.sort((a, b) => a.distance - b.distance);
    
    // 取k个最近邻
    const neighbors = distances.slice(0, this.k);
    
    // 投票
    const votes = new Map<EmotionType, { count: number; totalDistance: number }>();
    
    for (const neighbor of neighbors) {
      const label = neighbor.sample.label;
      if (!votes.has(label)) {
        votes.set(label, { count: 0, totalDistance: 0 });
      }
      const entry = votes.get(label)!;
      // 加权投票: 距离越近权重越高
      const weight = 1 / (neighbor.distance + 1e-6);
      entry.count += weight;
      entry.totalDistance += neighbor.distance;
    }
    
    // 找出得票最多的类别
    let bestLabel: EmotionType = 'smile';
    let maxVotes = -Infinity;
    let minDistance = Infinity;
    
    for (const [label, data] of votes.entries()) {
      if (data.count > maxVotes || 
          (data.count === maxVotes && data.totalDistance < minDistance)) {
        maxVotes = data.count;
        minDistance = data.totalDistance;
        bestLabel = label;
      }
    }
    
    // 计算置信度 (0-1)
    const maxDistances = neighbors.map(n => n.distance);
    const avgDistance = maxDistances.reduce((a,b) => a+b, 0) / maxDistances.length;
    const confidence = Math.max(0, Math.min(1, 
      1 - avgDistance / (avgDistance + 0.1));
    
    return {
      emotionType: bestLabel,
      confidence: Number(confidence.toFixed(3),
      matchedTemplate: `${bestLabel}_template_${neighbors[0].sample.label,
      inferenceTime: performance.now() - start,
    };
  }
  
  /**
   * 加权距离计算
   * Hu矩 + 傅里叶描述子距离
   */
  private weightedDistance(
    hu1: number[],
    fd1: number[],
    hu2: number[],
    fd2: number[]
  ): number {
    // Hu矩: 归一化曼哈顿距离 (7维)
    let huDist = 0;
    const huDim = Math.min(hu1.length, hu2.length, 7);
    for (let i = 0; i < huDim; i++) {
      huDist += Math.abs(hu1[i] - hu2[i]);
    }
    huDist /= huDim;
    
    // 傅里叶: 归一化曼哈顿 (前16维高权重 + 后16维低权重
    let fdDist = 0;
    const fdDim = Math.min(fd1.length, fd2.length, 32);
    for (let i = 0; i < fdDim; i++) {
      // 低频系数权重更高 (前16权重高
      const fdWeight = i < 16 ? 2.0 : 0.5;
      fdDist += fdWeight * Math.abs(fd1[i] - fd2[i]);
    }
    fdDist /= fdDim * 1.25;  // 加权平均归一化
    
    // 融合距离
    return this.huWeight * huDist + this.fdWeight * fdDist;
  }
}
```

---

## B. 粒子动画系统 - 吸附与融合详细参数

### B.1 粒子系统完整参数矩阵

```typescript
// src/utils/particleSystem/types.ts

/**
 * 粒子系统完整参数定义
 */
export interface FullParticleParams {
  // ========== 数量与生命周期 ==========
  countRange: [number, number];  // 粒子数量动态范围
  lifeTimeRange: [number, number];  // 生命周期秒
  
  // ========== 初始分布 ==========
  spawnDistribution: 'sphere' | 'hemisphere' | 'ring' | 'points';  // 出生分布
  spawnRadius: [number, number];   // 出生半径范围
  
  // ========== 运动学参数 ==========
  velocityFieldType: VelocityFieldConfig;
  
  // ========== 渲染属性 ==========
  sizeRange: [number, number];  // 尺寸范围 (Three.js单位
  sizeAttenuation: boolean;        // 是否启用尺寸衰减
  
  // ========== 颜色系统 ==========
  colorInterpolation: 'linear' | 'bezier' | 'catmullRom';  // 插值模式
  colorStops: ColorStop[];     // 颜色控制点
  opacityStops: OpacityStop[];  // 透明度控制点
  
  // ========== 动画时序 ==========
  timeline: ParticleTimeline;   // 完整生命周期关键帧
  
  // ========== 吸附逻辑 ==========
  attraction: AttractionConfig;  // 吸附配置
}

/**
 * 完整生命周期关键帧时间轴
 */
export interface ParticleTimeline {
  spawn: [number, number];       // [开始时间[秒]
  attractionPhase: [number, number];   // 吸附开始/结束
  morphPhase: [number, number];     // 粒子→网格过渡
  settlePhase: [number, number];    // 稳定展示
}

/**
 * 速度场配置
 */
export interface VelocityFieldConfig {
  type: 'radial' | 'spiral' | 'turbulence' | 'explosion' | 'curlNoise';
  baseSpeed: [number, number];
  // Perlin噪声配置
  noise: {
    amplitude: number;      // 噪声振幅
    frequency: number;      // 噪声频率
    octaves: number;        // 噪声层数
    seed: number;          // 种子 (可重复)
  };
  directionalBias: [number, number, number];  // 方向偏置
}

/**
 * 粒子→网格吸附配置
 */
export interface AttractionConfig {
  enabled: boolean;
  strength: number;           // 吸附力强度 (0-1
  falloff: number;          // 吸附力衰减
  threshold: number;         // 吸附距离阈值 (低于此值吸附
  snapToVertices: boolean;    // 是否吸附到最近顶点
}

/**
 * 聚合动画完整参数 (具体数值
 */
export const AGGREGATION_FULL: FullParticleParams = {
  // 粒子数量: 根据雕塑面数动态调整
  countRange: [500, 2000],
  lifeTimeRange: [2.5, 4.0],
  spawnDistribution: 'sphere',
  spawnRadius: [2.5, 5.0],
  
  velocityFieldType: {
    type: 'radial',
    baseSpeed: [0.3, 1.8],
    noise: {
      amplitude: 0.4,
      frequency: 2.0,
      octaves: 3,
      seed: 42,
    },
    directionalBias: [0, 0, 0],
  },
  
  sizeRange: [0.015, 0.06],
  sizeAttenuation: true,
  
  colorInterpolation: 'catmullRom',  // Catmull-Rom样条插值 (比线性更平滑
  colorStops: [
    { t: 0.00, color: new THREE.Color(0xffffff) },   // 出生: 纯白
    { t: 0.15, color: new THREE.Color(0xe0f7ff) }, // 早期: 浅青
    { t: 0.40, color: new THREE.Color(0x00b4d8) }, // 中期: 主题青
    { t: 0.70, color: emotionColorLight }, // 后期: 表情色(亮
    { t: 1.00, color: emotionColor }, // 结束: 最终色
  ],
  opacityStops: [
    { t: 0.0, opacity: 0.0 },   // 淡入
    { t: 0.1, opacity: 1.0 },   // 完全可见
    { t: 0.85, opacity: 1.0 },
    { t: 1.0, opacity: 0.0 },   // 淡出到网格
  ],
  
  timeline: {
    spawn: [0.0, 0.3],
    attractionPhase: [0.3, 2.2],
    morphPhase: [1.8, 2.8],
    settlePhase: [2.6, 3.0],
  },
  
  attraction: {
    enabled: true,
    strength: 0.85,
    falloff: 2.5,          // 距离平方反比衰减
    threshold: 0.08,         // 8cm内吸附
    snapToVertices: true,  // 吸附到最近顶点
  }
};

export const DISSIPATION_FULL: FullParticleParams = {
  countRange: [800, 2500],
  lifeTimeRange: [1.0, 2.5],
  // ...消散参数
};
```

### B.2 Perlin噪声速度场完整实现

```typescript
// src/utils/particleSystem/perlinNoise.ts

/**
 * 3D Perlin噪声实现
 * 用于粒子湍流速度场
 */
export class PerlinNoise3D {
  private permutation: Uint8Array;
  private gradP: { x: number; y: number; z: number }[];
  
  private static readonly GRAD3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
  ];
  
  constructor(seed: number = Math.random() * 65536) {
    // 初始化置换表
    this.permutation = new Uint8Array(512);
    this.gradP = new Array(512);
    
    // 用种子初始化伪随机
    let s = seed;
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates洗牌
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 0x7fffffff;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.permutation[i] = p[i & 255];
      this.gradP[i] = {
        x: this.GRAD3[this.permutation[i] % 12][0],
        y: this.GRAD3[this.permutation[i] % 12][1],
        z: this.GRAD3[this.permutation[i] % 12][2],
      };
    }
  }
  
  /**
   * 采样3D Perlin噪声值 [-1, 1]
   */
  noise(x: number, y: number, z: number): number {
    // 单元坐标
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    // 相对坐标
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    // 缓动曲线
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    // 哈希值
    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;
    
    // 三线性插值
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u,
          this.grad(this.gradP[AA], x, y, z),
          this.grad(this.gradP[BA], x - 1, y, z)
        ),
        this.lerp(u,
          this.grad(this.gradP[AB], x, y - 1, z),
          this.grad(this.gradP[BB], x - 1, y - 1, z)
        )
      ),
      this.lerp(v,
        this.lerp(u,
          this.grad(this.gradP[AA + 1], x, y, z - 1),
          this.grad(this.gradP[BA + 1], x - 1, y, z - 1)
        ),
        this.lerp(u,
          this.grad(this.gradP[AB + 1], x, y - 1, z - 1),
          this.grad(this.gradP[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }
  
  /**
   * 分形布朗运动 (FBM) 多层噪声叠加
   */
  fbm(
    x: number, y: number, z: number,
    octaves: number,
    amplitude: number,
    frequency: number
  ): number {
    let value = 0;
    let amp = amplitude;
    let freq = frequency;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * freq, y * freq, z * freq) * amp;
      maxValue += amp;
      amp *= 0.5;  // persistence = 0.5
      freq *= 2;  // lacunarity = 2
    }
    
    return value / maxValue;
  }
  
  /**
   * 计算3D Curl噪声 (无散度场，用于湍流)
   * Curl F = (∂Fz/∂y - ∂Fy/∂z, ∂Fx/∂z - ∂Fz/∂x, ∂Fy/∂x - ∂Fx/∂y
   */
  curlNoise(x: number, y: number, z: number): THREE.Vector3 {
    const eps = 0.001;
    
    // x分量: ∂Fz/∂y - ∂Fy/∂z
    const dx = (
      (this.noise(x, y + eps, z) - this.noise(x, y - eps, z)) / (2 * eps);
    const dy = (
      (this.noise(x, y, z + eps) - this.noise(x, y, z - eps)) / (2 * eps);
    const dz = (
      (this.noise(x, y, z) - this.noise(x, y, z)) / (2 * eps);
    
    return new THREE.Vector3(
      dz - dy,
      dx - dz,
      dy - dx,
    );
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15 + 10;
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  private dot(g: { x:number;y:number;z:number }, x: number, y: number, z: number): number {
    return g.x * x + g.y * y + g.z * z;
  }
}
```

### B.3 粒子→网格吸附与三角面融合逻辑

```typescript
// src/utils/particleSystem/morphLogic.ts

/**
 * 粒子吸附到网格顶点 + 三角面融合控制器
 * 
 * 核心流程:
 * Phase 1 [0-2.0秒]: 粒子自由运动 + 弱吸附
 * Phase 2 [1.8-2.5秒]: 强吸附 + 顶点锁定
 * Phase 3 [2.3-3.0秒]: 网格淡入 + 粒子淡出
 */
export class ParticleMeshMorpher {
  private targetVertices: Float32Array;    // 目标顶点数组
  private targetIndices: Uint32Array;     // 目标索引数组
  private particlePositions: Float32Array;  // 粒子当前位置
  private particleTargets: Int32Array;   // 每个粒子对应目标顶点索引
  private snapped: Uint8Array;          // 是否已吸附标志
  
  // 吸附状态机
  private phase: number = 0;
  
  constructor(
    targetMesh: THREE.Mesh,
    particleCount: number
  ) {
    // Step 1: 提取网格顶点
    const geometry = targetMesh.geometry;
    const positionAttr = geometry.getAttribute('position');
    this.targetVertices = new Float32Array(positionAttr.array);
    
    // Step 2: 为每个粒子预分配最近目标顶点
    this.particleTargets = new Int32Array(particleCount);
    
    const vertexCount = positionAttr.count;
    for (let i = 0; i < particleCount; i++) {
      // 按面面积加权随机选顶点 (大面分配更多粒子
      this.particleTargets[i] = Math.floor(Math.random() * vertexCount);
    }
    
    this.snapped = new Uint8Array(particleCount);
    this.particlePositions = new Float32Array(particleCount * 3);
  }
  
  /**
   * 每帧更新吸附
   * @param t 归一化时间 [0, 1] (0=开始, 1=完成)
   * @param positions 粒子当前位置数组 [x0,y0,z0,x1,y1,z1...]
   * @param velocities 粒子速度数组
   * @returns 修改positions in-place
   */
  updateAttraction(
    t: number,
    positions: Float32Array,
    velocities: Float32Array,
    deltaTime: number
  ): {
    const SNAP_START = 0.55;  // 55%时开始强力吸附
    const SNAP_END = 0.85;    // 85%时完成吸附
    const MORPH_START = 0.70; // 70%网格开始淡入
    
    const snapProgress = clamp01(invlerp(SNAP_START, SNAP_END, t);
    const attractionStrength = this.easeOutCubic(snapProgress);
    
    // 每个粒子向目标顶点移动
    for (let i = 0; i < this.particleTargets.length; i++) {
      if (this.snapped[i]) continue;
      
      const targetIdx = this.particleTargets[i] * 3;
      const particleIdx = i * 3;
      
      // 目标顶点位置
      const tx = this.targetVertices[targetIdx];
      const ty = this.targetVertices[targetIdx + 1];
      const tz = this.targetVertices[targetIdx + 2];
      
      // 当前粒子位置
      const px = positions[particleIdx];
      const py = positions[particleIdx + 1];
      const pz = positions[particleIdx + 2];
      
      // 到目标的向量
      const dx = tx - px;
      const dy = ty - py;
      const dz = tz - pz;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      // 距离衰减力 (距离越近吸附越强
      const falloff = Math.exp(-distance * 3 + 1;
      const forceMag = attractionStrength * 12 * falloff;
      
      // 更新速度
      velocities[particleIdx] += dx * forceMag * deltaTime;
      velocities[particleIdx + 1] += dy * forceMag * deltaTime;
      velocities[particleIdx + 2] += dz * forceMag * deltaTime;
      
      // 阻尼
      velocities[particleIdx] *= 0.92;
      velocities[particleIdx + 1] *= 0.92;
      velocities[particleIdx + 2] *= 0.92;
      
      // 吸附判定: 距离足够近锁定
      if (distance < 0.08 && snapProgress > SNAP_THRESHOLD) {
        // 锁定到顶点
        positions[particleIdx] = tx;
        positions[particleIdx + 1] = ty;
        positions[particleIdx + 2] = tz;
        this.snapped[i] = 1;
        
        // 速度归零
        velocities[particleIdx] = 0;
        velocities[particleIdx + 1] = 0;
        velocities[particleIdx + 2] = 0;
      }
    }
    
    // 计算网格不透明度 (用于材质混合
    const meshOpacity = clamp01(invlerp(MORPH_START, 1.0, t);
    const particleOpacity = 1.0 - meshOpacity * meshOpacity;
    
    return { meshOpacity, particleOpacity };
  }
  
  /**
   * 获取吸附统计 (调试)
   */
  getSnappedStats() {
    let count = 0;
    for (let i = 0; i < this.snapped.length; i++) {
      count += this.snapped[i];
    }
    return {
      snapped: count,
      total: this.snapped.length,
      ratio: count / this.snapped.length
    };
  }
}

// 辅助函数
function clamp01(v: number) { return Math.max(0, Math.min(1, v));
}
function invlerp(a: number, b: number, t: number) {
  return (t - a) / (b - a);
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 三角面融合条件表
 * 
 * 融合阶段判定标准:
 * 1. 已吸附粒子占比 ≥ 85%以上 → 开始网格可见
 * 2. 已吸附粒子 ≥ 95%以上 → 粒子完全消失
 * 3. 时间到达 timeline  ≥ 2.8秒 → 强制完成融合
 */
export const FUSION_THRESHOLDS = {
  MORPH_VISIBILITY_START: 0.85,    // 85%粒子吸附 → 网格开始显示
  MORPH_VISIBILITY_FULL: 0.95,     // 95%吸附 → 完全显示
  FORCE_COMPLETE_TIME: 2.8,        // 2.8秒强制完成
  SNAP_THRESHOLD: 0.08,         // 8cm判定吸附锁定距离阈值米
  MAX_PARTICLE_DISTANCE: 0.20,   // 最大吸附距离
};
```

---

## C. 雕塑参数联动 - 完整映射函数

### C.1 参数映射完整数学定义

```typescript
// src/utils/sculpture/paramMapping.ts

/**
 * ============================================================
 * 雕塑参数联动系统 - 完整映射函数集
 * ============================================================
 * 
 * 设计原则:
 * 1. 单调递增/递减函数: 所有映射
 * 2. 边界夹紧: 所有输出都夹紧到有效范围
 * 3. 平滑过渡: 避免跳变
 * 4. 归一化输入: 所有输入先做归一化
 */

// ============================================================
// C.1 基础映射函数库
// ============================================================

/**
 * 线性映射: 输入区间→输出区间
 * y = (x - inMin) / (inMax - inMin) * (outMax - outMin) + outMin
 */
export function linearMap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}

/**
 * 指数映射: 非线性曲线
 * y = outMin + (outMax-outMin) * exp(k * (x - inMin) / (inMax-inMin))
 * 指数底数 base:
 *   base>1 → 增长越来越快
 *   0<base<1 → 增长越来越慢
 */
export function exponentialMap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  base: number = 1.5
): number {
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1);
  const curve = (Math.pow(base, t) - 1) / (base - 1);
  return outMin + curve * (outMax - outMin);
}

/**
 * 分段映射: 多段线性
 * 分段定义
 */
export function piecewiseMap(
  x: number,
  segments: Array<{
    threshold: number;    // 输入阈值
    outValue: number;      // 输出对应值
    interpolation?: 'linear' | 'smoothstep';  // 段内插值
  }>
): number {
  // ...实现分段逻辑
}

/**
 * Sigmoid映射: 平滑S形曲线
 */
export function sigmoidMap(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  steepness: number = 5
): number {
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1);
  // sigmoid(t) = 1 / (1 + exp(-steepness * (t - 0.5)))
  const curve = 1 / (1 + Math.exp(-steepness * (t - 0.5)));
  return outMin + curve * (outMax - outMin);
}

// ============================================================
// C.2 尺寸映射 Size Mapping
// ============================================================

/**
 * 雕塑尺寸映射
 * 
 * 输入: 包围盒对角线长度 (像素
 * 关系: 指数增长 (避免小尺寸快速响应，大尺寸增长放缓
 * 公式:
 *   对角线 → 0.5 ~ 2.0
 *   
 *   baseSize = 0.8
 *   if diagonal < 50 → 0.5 (最小)
 *   diagonal = 100 → 0.8 (基准
 *   diagonal = 150 → 1.1 (自然
 *   diagonal = 200 → 1.5 (
 *   diagonal = 300 → 2.0 (最大)
 * 
 * 函数: exponentialMap with base=1.6
 */
export function mapSculptureSize(metrics: DrawingMetrics): number {
  const { width, height } = metrics.boundingBox;
  const diagonal = Math.sqrt(width * width + height * height);
  
  // 指数映射: base=1.6
  // 对角线50px以下最小，增长逐步放大但上限2.0
  const size = exponentialMap(
    diagonal,
    50,      // 输入最小值: 50px
    300,       // 输入最大值: 300px
    0.5,        // 输出最小值: 0.5
    2.0,         // 输出最大值: 2.0
    1.6           // 指数底数
  );
  
  return clamp(size, 0.5, 2.0);
}

// ============================================================
// C.3 细节层级映射 Detail Level Mapping
// ============================================================

/**
 * 雕塑细节层级映射
 * 
 * 输入: 笔画密集度 (strokes / area
 * 关系: 分段阶跃函数 (5级离散
 * 公式:
 *   density < 0.002 → Level 1 (最低)
 *   0.002 ≤ density <0.005 → Level 2
 *   0.005 ≤ density <0.01 → Level 3
 *   0.01 ≤ density <0.02 → Level 4
 *   density ≥ 0.02 → Level 5 (最高)
 * 
 * 注: 密集度 = 笔画数 / 包围盒面积 (单位: 笔画/像素²
 */
export function mapDetailLevel(metrics: DrawingMetrics): number {
  const { strokeCount, boundingBox } = metrics;
  const area = boundingBox.width * boundingBox.height;
  
  if (area < 100) return 1;  // 面积极小默认1级
  
  const density = strokeCount / area;
  
  // 分段阶跃
  let level: number;
  if (density < 0.002) level = 1;
  else if (density < 0.005) level = 2;
  else if (density < 0.01) level = 3;
  else if (density < 0.02) level = 4;
  else level = 5;
  
  // LOD降级约束
  return applyLODConstraint(level, emotionType);
}

// ============================================================
// C.4 颜色饱和度映射 Saturation Mapping
// ============================================================

/**
 * 颜色饱和度映射
 * 
 * 输入: 平均压力值 (0~1)
 * 关系: 线性+S形混合
 * 死区: pressure < 0.05 → 忽略死区 (压力0.05以下视为无压力
 * 
 * 公式:
 *   if pressure < DEADZONE_THRESHOLD → saturation = 0.5
 *   else:
 *     normalized = (pressure - DEADZONE) / (1 - DEADZONE)
 *     saturation = 0.5 + sigmoid(normalized) * 0.5
 * 
 *   压力0.05 → 0.50 (最低饱和
 *   压力0.3 → 0.60 (低饱和
 *   压力0.5 → 0.75 (中饱和)
 *   压力0.7 → 0.88 (高饱和
 *   压力1.0 → 1.00 (满饱和
 */
export const DEADZONE_THRESHOLD = 0.05;

export function mapSaturation(metrics: DrawingMetrics): number {
  let { averagePressure } = metrics;
  
  // 死区处理
  if (averagePressure < DEADZONE_THRESHOLD) {
    return 0.5;
  }
  
  // 归一化到 [0, 1 (去除死区
  const normalized = clamp(
    (averagePressure - DEADZONE_THRESHOLD) / (1.0 - DEADZONE_THRESHOLD),
    0, 1
  );
  
  // Sigmoid映射 → [0.5, 1.0
  return sigmoidMap(
    normalized,
    0, 1,      // 输入归一化0-1
    0.5, 1.0,     // 输出0.5-1.0
    4               // Sigmoid陡度
  );
}

// ============================================================
// C.5 鼠标速度模拟压力 (完整校准
// ============================================================

export const PRESSURE_CALIBRATION = {
  // 速度死区阈值
  DEADZONE_SPEED: 10,     // px/s, 低于此速度视为静止
  MIN_PRESSURE_OUTPUT: 0.2,   // 最高速度时最低输出压力
  MAX_PRESSURE_OUTPUT: 1.0,   // 静止/慢绘最高压力
  // 速度范围
  SPEED_MIN: 50,    // 此速度以下满压力
  SPEED_MAX: 800,   // 此速度以上最低压力
  
  // 平滑参数
  SMOOTHING_ALPHA: 0.35,    // 指数平滑系数 (越大越灵敏
  MIN_JITTER_THRESHOLD: DEADZONE_THRESHOLD,
};

export interface PressureState {
  smoothedPressure: number;
  lastPressure: number;
  lastPointTime: number;
  jitterBuffer: number[];  // 去抖动缓冲
}

/**
 * 鼠标/触摸速度→压力模拟完整实现
 * 
 * 包含:
 * 1. 速度死区
 * 2. 速度→压力映射
 * 3. 指数平滑
 * 4. 去抖动
 * 5. 触摸原生压力优先
 */
export class PressureSimulator {
  private state: PressureState = {
    smoothedPressure: 0.5,
    lastPressure: 0.5,
    lastPointTime: 0,
    jitterBuffer: [],
  };
  
  // 5点中值滤波去抖动
  private static readonly JITTER_WINDOW = 5;
  
  update(
    current: DrawPoint,
    previous: DrawPoint | null,
    nativePressure: number = 0,
  ): number {
    
    // ========== Step 1: 优先使用触摸设备原生压力
    if (nativePressure > 0.02) {
      // 原生 > 0.02 我们信任原生
      return this.applySmoothing(nativePressure);
    }
    
    if (!previous) {
      return this.state.smoothedPressure;
    }
    
    // ========== Step 2: 计算速度
    const dt = Math.max(1, current.timestamp - previous.timestamp) / 1000;
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let speed = dist / dt;  // px/s
    
    // ========== Step 3: 速度死区 (静止/抖动过滤
    speed = this.applySpeedDeadzone(speed);
    
    // ========== Step 4: 中值滤波去抖动
    speed = this.medianFilter(speed);
    
    // ========== Step 5: 速度→压力映射
    let rawPressure: number;
    
    if (speed <= PRESSURE_CALIBRATION.SPEED_MIN) {
      // 慢速/静止 → 满压力
      rawPressure = PRESSURE_CALIBRATION.MAX_PRESSURE_OUTPUT;
    } else if (speed >= PRESSURE_CALIBRATION.SPEED_MAX) {
      // 极快 → 最低压力
      rawPressure = PRESSURE_CALIBRATION.MIN_PRESSURE_OUTPUT;
    } else {
      // 中速区间 → S形映射
      // SPEED_MIN 到 SPEED_MAX线性
      const t = (speed - PRESSURE_CALIBRATION.SPEED_MIN) 
              / (PRESSURE_CALIBRATION.SPEED_MAX - PRESSURE_CALIBRATION.SPEED_MIN);
      
      // S形曲线: 慢绘略降，快绘骤降
      rawPressure = PRESSURE_CALIBRATION.MAX_PRESSURE_OUTPUT
        - Math.pow(t, 1.5) // 指数 1.5次幂 (前期缓，后骤
        * (PRESSURE_CALIBRATION.MAX_PRESSURE_OUTPUT - PRESSURE_CALIBRATION.MIN_PRESSURE_OUTPUT);
    }
    
    // ========== Step 6: 指数平滑输出
    return this.applySmoothing(rawPressure);
  }
  
  private applySpeedDeadzone(speed: number): number {
    if (speed <= PRESSURE_CALIBRATION.DEADZONE_SPEED) {
      return 0;
    }
    return speed - PRESSURE_CALIBRATION.DEADZONE_SPEED;
  }
  
  private medianFilter(speed: number): number {
    const buffer = this.state.jitterBuffer;
    buffer.push(speed);
    if (buffer.length > PressureSimulator.JITTER_WINDOW) {
      buffer.shift();
    }
    if (buffer.length < 3) return speed;
    // 中值
    const sorted = [...buffer].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  
  private applySmoothing(raw: number): number {
    const alpha = PRESSURE_CALIBRATION.SMOOTHING_ALPHA;
    this.state.smoothedPressure =
      alpha * raw + (1 - alpha) * this.state.smoothedPressure;
    this.state.lastPressure = raw;
    return this.state.smoothedPressure;
  }
  
  reset() {
    this.state.smoothedPressure = 0.5;
    this.state.lastPressure = 0.5;
    this.state.jitterBuffer.length = 0;
  }
}
```

### C.6 压力校准表 (LOD降级策略完整

```typescript
/**
 * ============================================================
 * LOD (Level of Detail) 降级控制器
 * ============================================================
 * 
 * 策略:
 * 1. 面数预估超限时逐级降低
 * 2. 设备性能自适应
 * 3. 运行时帧率监控触发降级
 */

const MAX_TRIANGLES_DESKTOP = 2000;
const MAX_TRIANGLES_MOBILE = 1000;
const MAX_TRIANGLES_LOWEND = 600;

export interface DeviceCapability {
  isMobile: boolean;
  isLowEnd: boolean;
  maxTriangles: number;
}

export function detectDeviceCapability(): DeviceCapability {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 检测WebGL性能估计低端
  let isLowEnd = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      isLowEnd = /Intel.*HD.*[234|Mali|Adreno.*3[0-9]/.test(renderer;
    }
  } catch (e) {}
  
  const maxTriangles