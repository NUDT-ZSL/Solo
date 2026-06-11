import { EffectSystem } from '../src/effect';
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✓ ${message}`);
}
function assertApprox(actual, expected, epsilon, message) {
    if (Math.abs(actual - expected) > epsilon) {
        throw new Error(`Assertion failed: ${message} (expected ${expected} ±${epsilon}, got ${actual})`);
    }
    console.log(`✓ ${message}`);
}
function runEffectTests() {
    console.log('=== EffectSystem Tests ===\n');
    console.log('1. 初始化测试');
    let effectSys = new EffectSystem();
    assert(effectSys.getBoardOpacity() === 1, '初始棋盘透明度为1');
    assert(effectSys.isBoardFading() === false, '初始无淡入淡出');
    assert(effectSys.getParticles().length === 0, '初始无粒子');
    assert(effectSys.getPieceScale(0, 0) === 1, '棋子初始缩放为1');
    assert(effectSys.getVictoryGlow().intensity === 0, '初始无胜利光效');
    console.log('\n2. 粒子爆散测试');
    effectSys = new EffectSystem();
    effectSys.spawnBurstParticles(100, 100, 40);
    const particles = effectSys.getParticles();
    assert(particles.length === 40, '生成40个粒子');
    assert(particles.every(p => p.x === 100 && p.y === 100), '粒子初始位置正确');
    assert(particles.every(p => p.size >= 2 && p.size <= 4), '粒子大小在2-4px范围内');
    assert(particles.every(p => p.color === '#4FC3F7' || p.color === '#FF7043'), '粒子颜色为双方棋子色之一');
    assert(particles.every(p => p.life > 0), '粒子有生命时间');
    effectSys.spawnBurstParticles(100, 100, 100);
    assert(effectSys.getParticles().length <= 90, '粒子数量限制在50+40=90（每次不超50）');
    console.log('\n3. 粒子更新测试');
    effectSys = new EffectSystem();
    effectSys.spawnBurstParticles(100, 100, 5);
    const initialParticles = effectSys.getParticles().map(p => ({ x: p.x, y: p.y, life: p.life }));
    effectSys.update(100);
    const updatedParticles = effectSys.getParticles();
    assert(updatedParticles.length === 5, '100ms后仍有5个粒子');
    assert(updatedParticles.every((p, i) => p.x !== initialParticles[i].x || p.y !== initialParticles[i].y), '粒子位置发生变化');
    assert(updatedParticles.every((p, i) => p.life < initialParticles[i].life), '粒子生命值减少');
    effectSys.update(2000);
    assert(effectSys.getParticles().length === 0, '2秒后所有粒子消失');
    console.log('\n4. 落子动画测试');
    effectSys = new EffectSystem();
    effectSys.startPieceAnimation(0, 0);
    const initialScale = effectSys.getPieceScale(0, 0);
    assertApprox(initialScale, 0, 0.01, '动画开始时缩放为0');
    assert(effectSys.getPieceScale(1, 1) === 1, '未触发动画的棋子缩放为1');
    effectSys.update(120);
    const midScale = effectSys.getPieceScale(0, 0);
    assert(midScale > 0, '动画进行中缩放大于0');
    effectSys.update(500);
    const finalScale = effectSys.getPieceScale(0, 0);
    assertApprox(finalScale, 1, 0.01, '动画结束后缩放为1');
    console.log('\n5. 棋盘淡入淡出测试');
    effectSys = new EffectSystem();
    effectSys.startBoardFadeOut();
    assert(effectSys.isBoardFading() === true, '淡出开始');
    effectSys.update(150);
    const midOpacity = effectSys.getBoardOpacity();
    assert(midOpacity < 1 && midOpacity > 0, '淡出中透明度在0-1之间');
    effectSys.update(200);
    assertApprox(effectSys.getBoardOpacity(), 0, 0.01, '淡出完成后透明度为0');
    assert(effectSys.isBoardFading() === false, '淡出完成后fading状态为false');
    effectSys.startBoardFadeIn();
    assert(effectSys.isBoardFading() === true, '淡入开始');
    effectSys.update(150);
    assert(effectSys.getBoardOpacity() > 0 && effectSys.getBoardOpacity() < 1, '淡入中透明度在0-1之间');
    effectSys.update(200);
    assertApprox(effectSys.getBoardOpacity(), 1, 0.01, '淡入完成后透明度为1');
    console.log('\n6. 胜利光效测试');
    effectSys = new EffectSystem();
    const line = [[0, 0], [0, 1], [0, 2]];
    effectSys.startVictoryGlow(line);
    assert(effectSys.getVictoryGlow().line !== null, '光效线已设置');
    assert(effectSys.getVictoryGlow().intensity === 0, '光效初始强度为0');
    effectSys.update(200);
    assert(effectSys.getVictoryGlow().intensity > 0, '光效强度增加');
    effectSys.update(2000);
    assertApprox(effectSys.getVictoryGlow().intensity, 1, 0.01, '光效强度达到最大');
    effectSys.stopVictoryGlow();
    const intensityBefore = effectSys.getVictoryGlow().intensity;
    effectSys.update(200);
    assert(effectSys.getVictoryGlow().intensity < intensityBefore, '停止光效后强度减少');
    console.log('\n7. 清理测试');
    effectSys = new EffectSystem();
    effectSys.spawnBurstParticles(100, 100, 10);
    effectSys.startPieceAnimation(0, 0);
    effectSys.startVictoryGlow(line);
    effectSys.startBoardFadeOut();
    effectSys.clearAll();
    assert(effectSys.getParticles().length === 0, 'clearAll后无粒子');
    assert(effectSys.getBoardOpacity() === 1, 'clearAll后棋盘透明度为1');
    assert(effectSys.getPieceScale(0, 0) === 1, 'clearAll后棋子缩放为1');
    assert(effectSys.getVictoryGlow().intensity === 0, 'clearAll后无胜利光效');
    assert(effectSys.isBoardFading() === false, 'clearAll后无淡入淡出');
    effectSys.clearPieceAnimations();
    assert(effectSys.getPieceScale(0, 0) === 1, 'clearPieceAnimations后棋子缩放为1');
    console.log('\n=== 所有EffectSystem测试通过! ===\n');
}
runEffectTests();
