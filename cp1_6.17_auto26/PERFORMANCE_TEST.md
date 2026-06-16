# 性能测试指南 - 帧率测试验证

## 测试目标
验证拖拽、平移、缩放动画的帧率稳定在 **45FPS** 以上。

## 测试工具
- Chrome DevTools Performance 面板
- Chrome 版本 120+

## 测试步骤

### 1. 准备工作
1. 启动开发服务器：`npm run dev`
2. 打开 Chrome 浏览器访问：`http://localhost:5177`
3. 打开 DevTools：按 `F12` 或 `Ctrl+Shift+I`

### 2. 性能面板配置
1. 切换到 **Performance** 面板
2. 勾选 **Screenshots**（可选，便于回放）
3. 点击 **Settings** ⚙️ 图标
4. 配置：
   - CPU: `No throttling`（或根据目标设备选择 `4x slowdown`）
   - Network: `No throttling`

### 3. 测试场景

#### 场景1：卡片拖拽
1. 点击 Performance 面板的 **Record** 按钮 (●)
2. 用鼠标拖拽任意一张卡片，持续拖拽 3-5 秒
3. 执行快速移动、慢速移动等不同速度
4. 点击 **Stop** 结束录制

#### 场景2：画布平移
1. 点击 **Record**
2. 在画布空白处按住鼠标拖动，进行平移操作
3. 测试快速平移和缓慢平移
4. 持续 3-5 秒后停止

#### 场景3：画布缩放
1. 点击 **Record**
2. 按住 `Ctrl` + 鼠标滚轮，在 0.5x - 4x 范围内缩放
3. 测试快速缩放和逐步缩放
4. 持续 3-5 秒后停止

#### 场景4：框选操作
1. 点击 **Record**
2. 在画布上按住 Shift + 鼠标拖动进行框选
3. 测试不同大小的选择框
4. 持续 3-5 秒后停止

### 4. 结果分析
1. 在 Performance 面板中找到 **Frames** 区域
2. 查看帧率图表（FPS 线）
3. 帧率判定标准：
   - ✅ 绿色：≥ 60FPS（优秀）
   - ✅ 黄色：45-59FPS（达标）
   - ❌ 红色：< 45FPS（不达标）
4. 检查 **Main** 线程中的任务执行时间：
   - 单帧渲染时间应 < 22ms (1000/45)
   - 长任务（>50ms）应极少

### 5. 测试用例列表

| 测试场景 | 操作方式 | 最低要求 |
|---------|---------|---------|
| 卡片拖拽 | 鼠标拖动卡片移动 | ≥ 45FPS |
| 画布平移 | 空白处拖动平移 | ≥ 45FPS |
| 画布缩放 | Ctrl+滚轮缩放 | ≥ 45FPS |
| 框选操作 | Shift+拖动选择 | ≥ 45FPS |
| 多卡拖拽 | 框选后同时拖动多张 | ≥ 45FPS |
| 主题切换 | 切换不同色调主题 | 动画流畅 |

### 6. 性能优化点（已实现）

- ✅ 使用 `transform: translate3d()` 硬件加速
- ✅ 使用 `will-change: transform` 提示浏览器优化
- ✅ `requestAnimationFrame` 批量渲染
- ✅ `React.memo` 避免不必要重渲染
- ✅ `useMemo` / `useCallback` 缓存计算结果和回调
- ✅ AABB 碰撞检测算法优化

### 7. 性能监控脚本

```javascript
// 在浏览器 Console 中运行以下脚本进行 FPS 监控
let frames = 0;
let lastTime = performance.now();
let fps = 60;

const measure = () => {
  frames++;
  const now = performance.now();
  const delta = now - lastTime;
  if (delta >= 1000) {
    fps = Math.round((frames * 1000) / delta);
    console.log(`FPS: ${fps}`, fps >= 45 ? '✅' : '❌');
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(measure);
};
requestAnimationFrame(measure);
```

### 8. 验收标准

1. 所有测试场景帧率稳定在 **45FPS** 以上
2. 无明显卡顿、掉帧现象
3. 拖拽操作流畅，无延迟感
4. 缩放操作平滑，无跳跃感
5. 移动端（模拟）同样满足帧率要求
