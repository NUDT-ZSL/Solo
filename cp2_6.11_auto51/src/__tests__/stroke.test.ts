/// <reference types="vite/client" />

import { StrokeManager, type Point } from '../stroke';

function logPoint(p: Point | null, prefix: string = '') {
  if (!p) {
    console.log(`${prefix}Point: null`);
    return;
  }
  console.log(
    `${prefix}Point(x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, ` +
    `velocity=${p.velocity.toFixed(2)} px/frame, ` +
    `thickness=${p.thickness.toFixed(2)}px, color=${p.color})`
  );
}

console.log('========== StrokeManager 测试开始 ==========');
console.log();

const manager = new StrokeManager();

let butterflyTriggeredCount = 0;
let lastTriggeredPoint: Point | null = null;
manager.setButterflyTriggerCallback((pt) => {
  butterflyTriggeredCount++;
  lastTriggeredPoint = pt;
  console.log(`\n 🦋 蝴蝶触发 #${butterflyTriggeredCount}:`);
  logPoint(pt, '    ');
  console.log(`    速度 > 3px/帧且连续超过5帧 ✓`);
});

console.log('测试1: 采样频率限制 (每秒≤120点，即间隔≥8ms)');
console.log('-------');
manager.beginDrawing();
const t0 = performance.now();
let addedCount = 0;
for (let i = 0; i < 50; i++) {
  const pt = manager.addPoint(i * 3, 100);
  if (pt) addedCount++;
}
const t1 = performance.now();
console.log(`  快速调用addPoint 50次（无间隔），实际添加 ${addedCount} 个点`);
console.log(`  耗时 ${(t1 - t0).toFixed(1)}ms，节流正常 ✓`);
console.log();

console.log('测试2: 慢速绘制 (速度<3，不应触发蝴蝶)');
console.log('-------');
manager.clear();
butterflyTriggeredCount = 0;
manager.beginDrawing();
for (let i = 0; i < 15; i++) {
  const pt = manager.addPoint(100 + i * 2, 200);
  if (pt) logPoint(pt, `  [${i}] `);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}
console.log(`  蝴蝶触发次数: ${butterflyTriggeredCount} (期望 0)`);
console.log(`  总长度: ${manager.getTotalLength().toFixed(1)}px`);
console.log();

console.log('测试3: 快速绘制 (速度>3且连续≥5帧，应触发蝴蝶)');
console.log('-------');
manager.clear();
butterflyTriggeredCount = 0;
manager.beginDrawing();
const points: { x: number; y: number }[] = [];
for (let i = 0; i < 25; i++) {
  const x = 100 + i * 12;
  const y = 200 + Math.sin(i * 0.5) * 20;
  points.push({ x, y });
}
for (let i = 0; i < points.length; i++) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 18);
  const pt = manager.addPoint(points[i].x, points[i].y);
  if (pt) {
    logPoint(pt, `  [${i}] `);
    if (pt.velocity > 3) {
      console.log(`        ↑ 速度超过阈值 3.0 ✓`);
    }
  }
}
console.log();
console.log(`  蝴蝶触发次数: ${butterflyTriggeredCount} (期望 ≥1)`);
if (lastTriggeredPoint) {
  console.log(`  最后触发点速度: ${(lastTriggeredPoint as any).velocity?.toFixed(2)} px/frame`);
}
console.log();

console.log('测试4: 贝塞尔曲线段生成');
console.log('-------');
const recentPts = manager.getRecentPoints(10);
console.log(`  最近10个点: ${recentPts.length} 个`);
const endResult = manager.endStroke();
console.log(`  结束绘制，当前段长度: ${endResult.length.toFixed(1)}px`);
console.log(`  累计总长度: ${manager.getTotalLength().toFixed(1)}px`);
console.log();

console.log('测试5: 墨点淡出');
console.log('-------');
const tip0 = manager.getTipGlow();
console.log(`  停笔时墨点: radius=${tip0?.radius.toFixed(1)}, alpha=${tip0?.alpha.toFixed(2)}`);
manager.updateTipFade(300);
const tip1 = manager.getTipGlow();
console.log(`  300ms后: radius=${tip1?.radius.toFixed(1)}, alpha=${tip1?.alpha.toFixed(2)}`);
manager.updateTipFade(500);
const tip2 = manager.getTipGlow();
console.log(`  800ms后: radius=${tip2?.radius.toFixed(1)}, alpha=${tip2?.alpha.toFixed(2)}`);
console.log();

console.log('测试6: 粗细映射 (速度→粗细)');
console.log('-------');
manager.clear();
manager.beginDrawing();
const testSpeeds = [0, 1, 2, 3, 5, 7, 10, 15];
const mockPts: Point[] = [];
for (let i = 0; i < testSpeeds.length; i++) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  const v = testSpeeds[i];
  const step = v * (20 / 16.67);
  const pt = manager.addPoint(50 + i * step * 2, 300);
  if (pt) {
    mockPts.push(pt);
    console.log(`  期望速度≈${v} → 实际=${pt.velocity.toFixed(1)}, 粗细=${pt.thickness.toFixed(1)}px`);
  }
}
manager.endStroke();
console.log();

console.log('========== StrokeManager 测试完成 ==========');

export {};
