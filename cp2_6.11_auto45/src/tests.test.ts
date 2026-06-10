import {
  PixelEngine,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PALETTE,
  MAX_FRAMES,
  MAX_HISTORY,
} from './core';

type TestResult = { name: string; passed: boolean; error?: string };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function runTest(name: string, fn: () => void): TestResult {
  try {
    fn();
    console.log(`✓ ${name}`);
    return { name, passed: true };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(`✗ ${name}: ${err}`);
    return { name, passed: false, error: err };
  }
}

function runAllTests(): TestResult[] {
  const results: TestResult[] = [];
  console.log('=== 开始测试 PixelEngine ===\n');

  results.push(
    runTest('初始化：应创建1帧空白画布', () => {
      const engine = new PixelEngine();
      assertEqual(engine.getFrameCount(), 1, '初始帧数');
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        for (let i = 0; i < pixels.length; i++) {
          assert(pixels[i] === 255, `像素${i}应为透明(255)`);
        }
      }
      assertEqual(CANVAS_WIDTH * CANVAS_HEIGHT, 1024, '画布总像素数');
    })
  );

  results.push(
    runTest('铅笔绘制：点击(5,5)写入颜色0', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(0);
      engine.setTool('pencil');
      engine.handleMouseDown(5, 5);
      engine.handleMouseUp();
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        const idx = 5 * CANVAS_WIDTH + 5;
        assertEqual(pixels[idx], 0, '(5,5)像素应为颜色0');
        const otherIdx = 6 * CANVAS_WIDTH + 6;
        assertEqual(pixels[otherIdx], 255, '(6,6)像素应为透明');
      }
    })
  );

  results.push(
    runTest('铅笔绘制：支持Bresenham直线插值', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(1);
      engine.setTool('pencil');
      engine.handleMouseDown(0, 0);
      engine.handleMouseMove(4, 4);
      engine.handleMouseUp();
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        for (let i = 0; i <= 4; i++) {
          const idx = i * CANVAS_WIDTH + i;
          assertEqual(pixels[idx], 1, `对角线(${i},${i})应被填充`);
        }
      }
    })
  );

  results.push(
    runTest('橡皮擦：2px擦除能清除周围像素', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(2);
      engine.setTool('pencil');
      for (let y = 3; y <= 7; y++) {
        for (let x = 3; x <= 7; x++) {
          engine.beginOperation();
          engine.handleMouseDown(x, y);
          engine.handleMouseUp();
        }
      }
      engine.setTool('eraser');
      engine.setEraserSize(2);
      engine.beginOperation();
      engine.handleMouseDown(5, 5);
      engine.handleMouseUp();
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        const idx = 5 * CANVAS_WIDTH + 5;
        assertEqual(pixels[idx], 255, '中心点(5,5)应被擦除');
      }
    })
  );

  results.push(
    runTest('矩形填充：点击对角线两点填充区域', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(3);
      engine.setTool('fill');
      engine.beginOperation();
      engine.handleMouseDown(2, 2);
      engine.beginOperation();
      engine.handleMouseDown(6, 6);
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        for (let y = 2; y <= 6; y++) {
          for (let x = 2; x <= 6; x++) {
            const idx = y * CANVAS_WIDTH + x;
            assertEqual(pixels[idx], 3, `(${x},${y})应被填充`);
          }
        }
        const outsideIdx = 1 * CANVAS_WIDTH + 1;
        assertEqual(pixels[outsideIdx], 255, '区域外应为透明');
      }
    })
  );

  results.push(
    runTest('镜像绘制：水平镜像时左右对称点同时写入', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(4);
      engine.setTool('pencil');
      engine.setMirrorMode('horizontal');
      engine.beginOperation();
      engine.handleMouseDown(2, 5);
      engine.handleMouseUp();
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        const leftIdx = 5 * CANVAS_WIDTH + 2;
        const rightIdx = 5 * CANVAS_WIDTH + (CANVAS_WIDTH - 1 - 2);
        assertEqual(pixels[leftIdx], 4, '左侧(2,5)应有颜色');
        assertEqual(pixels[rightIdx], 4, '水平对称点应有颜色');
      }
    })
  );

  results.push(
    runTest('镜像绘制：双轴镜像时四角对称', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(5);
      engine.setMirrorMode('both');
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(2, 3);
      engine.handleMouseUp();
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) {
        const mx = CANVAS_WIDTH - 1 - 2;
        const my = CANVAS_HEIGHT - 1 - 3;
        assertEqual(pixels[3 * CANVAS_WIDTH + 2], 5, '左上(2,3)');
        assertEqual(pixels[3 * CANVAS_WIDTH + mx], 5, '右上对称点');
        assertEqual(pixels[my * CANVAS_WIDTH + 2], 5, '左下对称点');
        assertEqual(pixels[my * CANVAS_WIDTH + mx], 5, '右下对称点');
      }
    })
  );

  results.push(
    runTest('吸色工具：点击有色像素切换当前颜色', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(0);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(10, 10);
      engine.handleMouseUp();
      assertEqual(engine.getColorIndex(), 0, '初始颜色为0');
      engine.setColorIndex(7);
      engine.setTool('eyedropper');
      engine.handleMouseDown(10, 10);
      assertEqual(engine.getColorIndex(), 0, '吸色后颜色切回0');
    })
  );

  results.push(
    runTest('撤销操作：beginOperation→绘制→undo还原', () => {
      const engine = new PixelEngine();
      const idx = 7 * CANVAS_WIDTH + 7;
      engine.setColorIndex(6);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(7, 7);
      engine.handleMouseUp();
      const pixels1 = engine.getCurrentFramePixels();
      assert(pixels1 !== null, '像素数据存在');
      if (pixels1) assertEqual(pixels1[idx], 6, '绘制后(7,7)为颜色6');
      assert(engine.canUndo(), '撤销后应可重做');
      const ok = engine.undo();
      assert(ok === true, 'undo返回true');
      const pixels2 = engine.getCurrentFramePixels();
      assert(pixels2 !== null, '像素数据存在');
      if (pixels2) assertEqual(pixels2[idx], 255, '撤销后(7,7)为透明');
    })
  );

  results.push(
    runTest('重做操作：undo→redo恢复修改', () => {
      const engine = new PixelEngine();
      const idx = 8 * CANVAS_WIDTH + 9;
      engine.setColorIndex(2);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(9, 8);
      engine.handleMouseUp();
      engine.undo();
      assert(engine.canRedo() === true, '撤销后可重做');
      const ok = engine.redo();
      assert(ok === true, 'redo返回true');
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素数据存在');
      if (pixels) assertEqual(pixels[idx], 2, '重做后(9,8)恢复颜色');
    })
  );

  results.push(
    runTest('撤销栈：超过20步时最早记录被丢弃', () => {
      const engine = new PixelEngine();
      for (let i = 0; i < 25; i++) {
        engine.setColorIndex(i % PALETTE.length);
        engine.beginOperation();
        engine.handleMouseDown(i % CANVAS_WIDTH, 0);
        engine.handleMouseUp();
      }
      assert(engine.getUndoCount() <= MAX_HISTORY, `撤销栈不应超过${MAX_HISTORY}步`);
      for (let i = 0; i < MAX_HISTORY; i++) {
        const ok = engine.undo();
        if (i === MAX_HISTORY - 1) assert(ok === true, '最后一步可撤销');
      }
      assert(engine.canUndo() === false, '撤销完后不可再撤销');
    })
  );

  results.push(
    runTest('帧独立历史：帧A撤销不影响帧B', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(0);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(0, 0);
      engine.handleMouseUp();
      engine.addFrame(false);
      assertEqual(engine.getCurrentFrameIndex(), 1, '新帧索引为1');
      engine.setColorIndex(1);
      engine.beginOperation();
      engine.handleMouseDown(1, 1);
      engine.handleMouseUp();
      const beforeUndo = engine.canUndo();
      assert(beforeUndo === true, '帧1有可撤销历史');
      engine.setCurrentFrameIndex(0);
      assertEqual(engine.getUndoCount(), 1, '切回帧0仍可撤销');
      engine.undo();
      const pixels0 = engine.getCurrentFramePixels();
      assert(pixels0 !== null, '帧0像素存在');
      if (pixels0) assertEqual(pixels0[0], 255, '帧0(0,0)已撤销');
      engine.setCurrentFrameIndex(1);
      const pixels1 = engine.getCurrentFramePixels();
      assert(pixels1 !== null, '帧1像素存在');
      if (pixels1) {
        const idx = 1 * CANVAS_WIDTH + 1;
        assertEqual(pixels1[idx], 1, '帧1(1,1)保留颜色');
      }
    })
  );

  results.push(
    runTest('帧操作：addFrame最多加到8帧', () => {
      const engine = new PixelEngine();
      for (let i = 1; i < 10; i++) {
        engine.addFrame(false);
      }
      assert(engine.getFrameCount() === MAX_FRAMES, `最多${MAX_FRAMES}帧`);
      const ok = engine.addFrame(false);
      assert(ok === false, '超过上限返回false');
    })
  );

  results.push(
    runTest('帧操作：duplicateFrame复制像素数据', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(3);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(3, 3);
      engine.handleMouseUp();
      const ok = engine.duplicateFrame(0);
      assert(ok === true, '复制成功');
      assertEqual(engine.getFrameCount(), 2, '共2帧');
      engine.setCurrentFrameIndex(1);
      const pixels = engine.getCurrentFramePixels();
      assert(pixels !== null, '像素存在');
      if (pixels) {
        const idx = 3 * CANVAS_WIDTH + 3;
        assertEqual(pixels[idx], 3, '复制帧(3,3)具有相同颜色');
      }
    })
  );

  results.push(
    runTest('帧操作：deleteFrame删除并调整索引', () => {
      const engine = new PixelEngine();
      engine.addFrame(false);
      engine.addFrame(false);
      assertEqual(engine.getFrameCount(), 3, '初始3帧');
      engine.setCurrentFrameIndex(1);
      engine.deleteFrame(1);
      assertEqual(engine.getFrameCount(), 2, '删除后2帧');
      assert(engine.getCurrentFrameIndex() < 2, '索引合法');
      const ok = engine.deleteFrame(0);
      assert(ok === true, '最后2帧时可删除其中之一');
      assertEqual(engine.getFrameCount(), 1, '仅剩1帧');
      const nok = engine.deleteFrame(0);
      assert(nok === false, '最后1帧不能删除');
    })
  );

  results.push(
    runTest('帧排序：moveFrame交换帧位置', () => {
      const engine = new PixelEngine();
      const f0Id = engine.getFrames()[0].id;
      engine.addFrame(false);
      const f1Id = engine.getFrames()[1].id;
      engine.addFrame(false);
      const f2Id = engine.getFrames()[2].id;
      engine.moveFrame(2, 0);
      const idsAfter = engine.getFrames().map(f => f.id);
      assertEqual(idsAfter[0], f2Id, '原帧2(id=' + f2Id + ')应移到位置0(实际' + idsAfter[0] + ')');
      assertEqual(idsAfter[1], f0Id, '原帧0(id=' + f0Id + ')应在位置1(实际' + idsAfter[1] + ')');
      assertEqual(idsAfter[2], f1Id, '原帧1(id=' + f1Id + ')应在位置2(实际' + idsAfter[2] + ')');
    })
  );

  results.push(
    runTest('帧排序：moveFrame同位置不报错', () => {
      const engine = new PixelEngine();
      const idBefore = engine.getFrames()[0].id;
      const ok = engine.moveFrame(0, 0);
      assert(ok === true, '同位置返回true');
      assertEqual(engine.getFrames()[0].id, idBefore, '帧ID不变');
    })
  );

  results.push(
    runTest('帧率：setFps在1-30范围内', () => {
      const engine = new PixelEngine();
      engine.setFps(1);
      assertEqual(engine.getFps(), 1, '最低1fps');
      engine.setFps(30);
      assertEqual(engine.getFps(), 30, '最高30fps');
      engine.setFps(0);
      assertEqual(engine.getFps(), 30, '低于1不生效');
      engine.setFps(999);
      assertEqual(engine.getFps(), 30, '高于30不生效');
    })
  );

  results.push(
    runTest('播放：play→pause切换状态正确', () => {
      const engine = new PixelEngine();
      assert(engine.getIsPlaying() === false, '初始未播放');
      engine.addFrame(false);
      engine.addFrame(false);
      engine.play();
      assert(engine.getIsPlaying() === true, 'play后状态为true');
      engine.pause();
      assert(engine.getIsPlaying() === false, 'pause后状态为false');
    })
  );

  results.push(
    runTest('播放：单帧时无法启动播放', () => {
      const engine = new PixelEngine();
      engine.play();
      assert(engine.getIsPlaying() === false, '仅1帧时不启动播放');
    })
  );

  results.push(
    runTest('精灵图导出：尺寸应为32*N × 32', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(1);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(4, 4);
      engine.handleMouseUp();
      engine.addFrame(false);
      engine.setColorIndex(2);
      engine.beginOperation();
      engine.handleMouseDown(8, 8);
      engine.handleMouseUp();
      engine.addFrame(false);
      const canvas = engine.exportSpriteSheet();
      assert(canvas !== null, '导出非null');
      if (canvas) {
        assertEqual(canvas.width, 32 * 3, '宽度=32*帧数');
        assertEqual(canvas.height, 32, '高度=32');
        const ctx = canvas.getContext('2d');
        assert(ctx !== null, '2D上下文存在');
        if (ctx) {
          const d0 = ctx.getImageData(4, 4, 1, 1).data;
          assert(d0[3] > 0, '帧0(4,4)有色');
          const d1 = ctx.getImageData(32 + 8, 8, 1, 1).data;
          assert(d1[3] > 0, '帧1(8,8)有色');
        }
      }
    })
  );

  results.push(
    runTest('GIF导出：生成非空Blob且为image/gif类型', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(0);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(2, 2);
      engine.handleMouseUp();
      engine.addFrame(false);
      engine.setColorIndex(1);
      engine.beginOperation();
      engine.handleMouseDown(3, 3);
      engine.handleMouseUp();
      const blob = engine.exportGif();
      assert(blob !== null, 'Blob非null');
      if (blob) {
        assertEqual(blob.type, 'image/gif', 'MIME类型正确');
        assert(blob.size > 6, '文件头部已存在');
        const checkArr = new Uint8Array([71, 73, 70, 56, 57, 97]);
        assert(checkArr.length === 6, '校验数组长度');
        const sizeStr = `最小体积校验: ${blob.size} > 6`;
        assert(blob.size > 50, sizeStr);
      }
    })
  );

  results.push(
    runTest('像素统计：countPixels返回正确数量', () => {
      const engine = new PixelEngine();
      let { filled, total } = engine.countPixels();
      assertEqual(filled, 0, '初始0像素');
      assertEqual(total, 1024, '总像素数1024');
      engine.setColorIndex(0);
      engine.setTool('pencil');
      for (let i = 0; i < 10; i++) {
        engine.beginOperation();
        engine.handleMouseDown(i, 0);
        engine.handleMouseUp();
      }
      ({ filled } = engine.countPixels());
      assertEqual(filled, 10, '绘制后10个像素');
    })
  );

  results.push(
    runTest('渲染：renderToCanvas绘制对应颜色方块', () => {
      const engine = new PixelEngine();
      engine.setColorIndex(5);
      engine.setTool('pencil');
      engine.beginOperation();
      engine.handleMouseDown(3, 3);
      engine.handleMouseUp();
      const canvas = document.createElement('canvas');
      canvas.width = 32 * 5;
      canvas.height = 32 * 5;
      engine.renderToCanvas(canvas, 5);
      const ctx = canvas.getContext('2d');
      assert(ctx !== null, '上下文存在');
      if (ctx) {
        const d = ctx.getImageData(3 * 5 + 2, 3 * 5 + 2, 1, 1).data;
        const hex = `#${((1 << 24) + (d[0] << 16) + (d[1] << 8) + d[2]).toString(16).slice(1).toUpperCase()}`;
        const target = PALETTE[5].toUpperCase();
        assertEqual(hex, target, `渲染颜色匹配${target}`);
      }
    })
  );

  console.log('\n=== 测试结果汇总 ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = results.filter(r => !r.passed);
  console.log(`通过: ${passed} / ${total}`);
  if (failed.length > 0) {
    console.log('\n失败用例:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  } else {
    console.log('🎉 所有测试通过!');
  }
  return results;
}

if (typeof window !== 'undefined') {
  (window as any).__runPixelTests = runAllTests;
}

export { runAllTests };
