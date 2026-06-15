## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "sceneManager.ts"
    "main.ts" --> "mazeGenerator.ts"
    "main.ts" --> "particleSystem.ts"
    "mazeGenerator.ts" --> "sceneManager.ts"
    "particleSystem.ts" --> "sceneManager.ts"
```

## 2. 技术说明
- **前端框架**：原生 TypeScript（无React/Vue），专注于Three.js 3D渲染
- **构建工具**：Vite，提供快速热更新和构建
- **3D引擎**：Three.js + @types/three 类型定义
- **开发语言**：TypeScript 严格模式，目标ES2020，模块ESNext

## 3. 文件结构
| 文件路径 | 用途 |
|---------|------|
| package.json | 项目依赖：three、@types/three、typescript、vite，启动脚本npm run dev |
| index.html | 入口页面，全屏Canvas，左上角UI面板 |
| tsconfig.json | TypeScript配置，严格模式，ES2020 |
| vite.config.js | Vite基础构建配置 |
| src/main.ts | 主入口，初始化、游戏循环、事件处理、重构逻辑 |
| src/sceneManager.ts | 场景管理：Scene、Camera、Renderer、Light，addWall、addParticle方法 |
| src/mazeGenerator.ts | 迷宫生成算法，9x9网格，墙体位置和路径矩阵，调用sceneManager.addWall |
| src/particleSystem.ts | 粒子系统管理：生成、运动、交互检测，调用sceneManager.addParticle |

## 4. 核心模块设计

### 4.1 sceneManager.ts
```typescript
interface WallData {
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  baseHSL: { h: number; s: number; l: number };
}

interface ParticleData {
  mesh: THREE.Object3D;
  basePosition: THREE.Vector3;
  angle: number;
  phase: number;
  radius: number;
}

class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  walls: WallData[];
  particles: ParticleData[];
  
  constructor(container: HTMLElement);
  addWall(x: number, z: number, height: number, color: THREE.Color): THREE.Mesh;
  addParticle(position: THREE.Vector3, color: THREE.Color, size: number): THREE.Object3D;
  clearWalls(): void;
  clearParticles(): void;
  updateCameraView(mode: 'follow' | 'top', target?: THREE.Vector3): void;
  render(): void;
  onResize(): void;
}
```

### 4.2 mazeGenerator.ts
```typescript
interface MazeCell {
  x: number;
  z: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

interface MazeResult {
  cells: MazeCell[][];
  wallPositions: { x: number; z: number; isHorizontal: boolean }[];
}

function generateMaze(size: number): MazeResult;
function createMazeWalls(sceneManager: SceneManager, size: number): void;
```

### 4.3 particleSystem.ts
```typescript
interface Particle {
  object: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseY: number;
  angle: number;
  isExploding?: boolean;
  life?: number;
}

class ParticleSystem {
  sceneManager: SceneManager;
  particles: Particle[];
  
  constructor(sceneManager: SceneManager);
  generateParticles(count: number, mazeSize: number): void;
  update(deltaTime: number): void;
  checkCollision(cursorPosition: THREE.Vector3): Particle | null;
  explodeParticle(particle: Particle): void;
  clear(): void;
}
```

### 4.4 main.ts 核心逻辑
```typescript
// 状态管理
interface GameState {
  cursorPosition: THREE.Vector3;
  cursorVelocity: THREE.Vector3;
  isTopView: boolean;
  viewTransition: number; // 0-1
  reconstructionCooldown: number;
  isReconstructing: boolean;
  fadeOpacity: number;
  autoReconstructTimer: number;
}

// 主循环
// 1. 更新光标位置（WASD输入）
// 2. 检测墙体碰撞
// 3. 自动前进逻辑
// 4. 更新粒子系统
// 5. 检测粒子碰撞
// 6. 视角切换动画
// 7. 墙体呼吸效果
// 8. 重构计时器和冷却
// 9. 渲染
```

## 5. 迷宫生成算法
采用深度优先搜索(DFS)回溯算法生成完美迷宫：
1. 初始化9x9网格，所有单元格标记为未访问
2. 从起点开始，随机选择未访问的相邻单元格
3. 打通两单元格之间的墙，标记新单元格为已访问，压栈
4. 若无未访问邻居则出栈回溯
5. 直至栈为空，生成完成
6. 将内部墙转换为3D墙体位置

## 6. 性能优化
- **材质复用**：相同颜色墙体共享材质实例，修改uniform实现呼吸效果
- **粒子合批**：使用THREE.Points替代多个Sprite减少Draw Call
- **碰撞检测优化**：只检测光标附近网格单元的墙体
- **重构动画**：使用透明度线性插值，避免频繁重建几何体
- **帧率监控**：目标30fps+，粒子总数控制在80以内
