/// <reference types="vite/client" />

import { ButterflyManager } from '../butterfly';

console.log('========== ButterflyManager 测试开始 ==========');
console.log();

const manager = new ButterflyManager();

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

console.log('测试1: 颜色计算 (补色 + HSV偏移)');
console.log('-------');
const testColors = ['#1A1A1A', '#3D2B1F', '#FFD700', '#4ECDC4', '#FF6B6B'];
testColors.forEach((inkColor, i) => {
  console.log();
  console.log(`  [${i}] 墨迹颜色: ${inkColor}`);
  let capturedWingColor = '';
  let capturedPatternColor = '';
  const origSpawn = (ButterflyManager.prototype as any).spawn;
  (ButterflyManager.prototype as any).spawn = function(this: ButterflyManager, opts: any) {
    const bf = origSpawn.call(this, opts);
    const first = (this as any).butterflies[(this as any).butterflies.length - 1];
    if (first) {
      capturedWingColor = first.wingColor;
      capturedPatternColor = first.wingPatternColor;
    }
    return bf;
  };
  manager.clear();
  manager.spawn({ x: 200, y: 200, strokeColor: inkColor, strokeVelocity: 5 });
  (ButterflyManager.prototype as any).spawn = origSpawn;
  console.log(`     翅膀主色: ${capturedWingColor}`);
  console.log(`     纹理颜色: ${capturedPatternColor}`);
  
  const parseRgb = (s: string) => {
    const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return null;
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  };
  
  const wc = parseRgb(capturedWingColor);
  if (wc) {
    const complement = rgbToHex(255 - wc.r, 255 - wc.g, 255 - wc.b);
    console.log(`     翅膀补色验证: ${complement} (应≈淡彩而非纯反色)`);
  }
});
console.log();

console.log('测试2: 斑点生成与缩放');
console.log('-------');
manager.clear();
manager.setSizeScale(1);
manager.spawn({ x: 300, y: 300, strokeColor: '#1A1A1A', strokeVelocity: 7 });
const bfAny = manager as any;
const butterflies = bfAny.butterflies;
if (butterflies.length > 0) {
  const bf = butterflies[0];
  console.log(`  斑点数量: ${bf.spots.length} (期望 3-6)`);
  console.log(`  斑点颜色分布:`);
  const colorCounts: Record<string, number> = {};
  bf.spots.forEach((s: any, i: number) => {
    colorCounts[s.color] = (colorCounts[s.color] || 0) + 1;
    console.log(`    [${i}] 位置=(${s.offsetX.toFixed(1)},${s.offsetY.toFixed(1)}), ` +
                `半径=${s.baseRadius.toFixed(1)}, 颜色=${s.color}, 翅膀=${s.wing}`);
  });
  console.log(`  颜色统计:`, colorCounts);
  console.log(`  扇动周期: ${bf.flapPeriod.toFixed(2)}s (期望 0.6-1.2s)`);
  console.log(`  初始透明度: ${bf.baseAlpha.toFixed(2)} (期望 0.2)`);
  console.log(`  生命周期: ${bf.lifetime.toFixed(0)}ms (期望 5000-8000ms)`);
}
console.log();

console.log('测试3: 透明度淡入淡出动画');
console.log('-------');
manager.clear();
manager.spawn({ x: 400, y: 400, strokeColor: '#3D2B1F' });
const testBf = bfAny.butterflies[0];
console.log(`  时间(ms) | 透明度 | 状态`);
console.log(`  ---------|--------|------`);
const startTime = testBf.spawnTime;
const checkPoints = [0, 500, 1000, 4500, 7500, 7800];
checkPoints.forEach(t => {
  const virtualNow = startTime + t;
  const delta = 16;
  manager.update(delta, virtualNow);
  const alpha = bfAny.butterflies[0]?.baseAlpha ?? 0;
  const status = t < 1000 ? '淡入中' : (t > 4200 ? (t > 7200 ? '淡出中' : '保持') : '保持');
  console.log(`  ${String(t).padStart(7)} |  ${alpha.toFixed(2)}  | ${status}`);
});
console.log();

console.log('测试4: 蝴蝶上限60只，超出淘汰最旧');
console.log('-------');
manager.clear();
for (let i = 0; i < 75; i++) {
  manager.spawn({
    x: 100 + (i % 10) * 50,
    y: 100 + Math.floor(i / 10) * 50,
    strokeColor: '#1A1A1A'
  });
  if ((i + 1) % 15 === 0) {
    console.log(`  生成 ${i + 1} 只 → 当前活跃 ${manager.getCount()} 只`);
  }
}
console.log(`  最终数量: ${manager.getCount()} (期望 60)`);
const remaining = bfAny.butterflies;
if (remaining.length > 0) {
  const minId = Math.min(...remaining.map((b: any) => b.id));
  const maxId = Math.max(...remaining.map((b: any) => b.id));
  console.log(`  剩余ID范围: ${minId} - ${maxId} (应无1-15的ID)`);
  console.log(`  已淘汰最早ID: ${minId > 1 ? `1-${minId - 1}` : '无'}`);
}
console.log();

console.log('测试5: 扩散蝴蝶 (isSpread=true)');
console.log('-------');
manager.clear();
const spreadTarget = { x: 400, y: 350 };
manager.spawn({
  x: 200, y: 200, strokeColor: '#1A1A1A',
  isSpread: true, spreadTarget, spreadDuration: 2000
});
const spreadBf = bfAny.butterflies[0];
console.log(`  初始位置: (${spreadBf.x.toFixed(1)}, ${spreadBf.y.toFixed(1)})`);
console.log(`  目标位置: (${spreadTarget.x}, ${spreadTarget.y})`);
console.log(`  时间(ms) | X位置   | Y位置   | 尺寸`);
console.log(`  ---------|---------|---------|------`);
for (let t = 0; t <= 2000; t += 500) {
  manager.update(16, spreadBf.spawnTime + t);
  const b = bfAny.butterflies[0];
  console.log(`  ${String(t).padStart(7)} | ${b.x.toFixed(1).padStart(7)} | ${b.y.toFixed(1).padStart(7)} | ${b.size.toFixed(1)}`);
}
console.log();

console.log('测试6: 拖尾光晕历史记录');
console.log('-------');
manager.clear();
manager.spawn({ x: 100, y: 100, strokeColor: '#4ECDC4' });
for (let i = 0; i < 30; i++) {
  bfAny.butterflies[0].x += 5 + Math.sin(i * 0.3) * 2;
  bfAny.butterflies[0].y += Math.cos(i * 0.3) * 2;
  manager.update(16, performance.now());
}
const trailBf = bfAny.butterflies[0];
console.log(`  拖尾点数量: ${trailBf.trail.length} (期望 ≤20)`);
if (trailBf.trail.length > 0) {
  console.log(`  拖尾点透明度梯度:`);
  for (let i = 0; i < trailBf.trail.length; i += 4) {
    const p = trailBf.trail[i];
    console.log(`    [${String(i).padStart(2)}] alpha=${p.alpha.toFixed(2)}, pos=(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
  }
}
console.log();

console.log('测试7: 移动端尺寸缩放50%');
console.log('-------');
manager.clear();
manager.setSizeScale(0.5);
manager.spawn({ x: 300, y: 300, strokeColor: '#FFD700', strokeVelocity: 5 });
const mobileBf = bfAny.butterflies[0];
console.log(`  移动端蝴蝶尺寸: ${mobileBf.size.toFixed(1)}px (期望 10-25px)`);
manager.setSizeScale(1);
manager.spawn({ x: 400, y: 400, strokeColor: '#FFD700', strokeVelocity: 5 });
const desktopBf = bfAny.butterflies[1];
console.log(`  桌面端蝴蝶尺寸: ${desktopBf.size.toFixed(1)}px (期望 20-50px)`);
console.log();

console.log('========== ButterflyManager 测试完成 ==========');

export {};
