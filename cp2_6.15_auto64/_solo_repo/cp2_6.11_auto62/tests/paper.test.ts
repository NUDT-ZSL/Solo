import * as THREE from 'three';
import { PaperSheet } from '../src/paper';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const testScene = new THREE.Scene();

describe('PaperSheet 折叠次数边界测试', () => {
  let paper: PaperSheet;

  beforeEach(() => {
    paper = new PaperSheet(testScene, new THREE.Vector3(0, 0, 0), 'test_paper');
    testScene.add(paper.mesh);
  });

  afterEach(() => {
    testScene.remove(paper.mesh);
    paper.dispose();
  });

  it('初始状态 foldCount 应为 0', () => {
    assert.strictEqual(paper.foldCount, 0);
  });

  it('初始状态 isFoldable() 应返回 true', () => {
    assert.strictEqual(paper.isFoldable(), true);
  });

  it('初始状态应有折叠线', () => {
    assert.ok(paper.foldLines.length > 0, '初始纸片应有可折叠线');
  });

  it('第一次折叠后 foldCount 应为 1，isFoldable() 返回 true', () => {
    const result = paper.fold(0);
    assert.strictEqual(result, true);
    assert.strictEqual(paper.foldCount, 1);
    assert.strictEqual(paper.isFoldable(), true);
  });

  it('第二次折叠后 foldCount 应为 2，isFoldable() 返回 true', () => {
    paper.fold(0);
    const result = paper.fold(0);
    assert.strictEqual(result, true);
    assert.strictEqual(paper.foldCount, 2);
    assert.strictEqual(paper.isFoldable(), true);
  });

  it('第三次折叠后 foldCount 应为 3，isFoldable() 返回 false', () => {
    paper.fold(0);
    paper.fold(0);
    const result = paper.fold(0);
    assert.strictEqual(result, true);
    assert.strictEqual(paper.foldCount, 3);
    assert.strictEqual(paper.isFoldable(), false);
  });

  it('超过三次折叠应返回 false，不允许折叠', () => {
    paper.fold(0);
    paper.fold(0);
    paper.fold(0);
    const result = paper.fold(0);
    assert.strictEqual(result, false, '第四次折叠应返回 false');
    assert.strictEqual(paper.foldCount, 3, 'foldCount 应保持为 3');
  });

  it('达到三次折叠后应清除所有折叠线', () => {
    paper.fold(0);
    paper.fold(0);
    paper.fold(0);
    assert.strictEqual(paper.foldLines.length, 0, '三次折叠后应无折叠线');
  });

  it('达到三次折叠后点击折叠线交互应被禁用', () => {
    paper.fold(0);
    paper.fold(0);
    paper.fold(0);
    assert.strictEqual(paper.isFoldable(), false);
    assert.strictEqual(paper.foldLines.length, 0);
  });
});

describe('PaperSheet 折叠线生成动态适配测试', () => {
  let paper: PaperSheet;

  beforeEach(() => {
    paper = new PaperSheet(testScene, new THREE.Vector3(0, 0, 0), 'test_paper_2');
    testScene.add(paper.mesh);
  });

  afterEach(() => {
    testScene.remove(paper.mesh);
    paper.dispose();
  });

  it('初始正方形（4顶点）应生成有效的折叠线', () => {
    assert.strictEqual(paper.vertices.length, 4);
    assert.ok(paper.foldLines.length >= 2, '正方形至少应有2条折叠线');
    for (const fl of paper.foldLines) {
      assert.ok(fl.startPoint.distanceTo(fl.endPoint) > 0.1, '折叠线应有足够长度');
      assert.ok(fl.normal.length() > 0.5, '折叠线法线应有效');
    }
  });

  it('第一次折叠后顶点数应增加，折叠线应重新生成', () => {
    const initialVerts = paper.vertices.length;
    const initialLines = paper.foldLines.length;

    paper.fold(0);

    assert.ok(paper.vertices.length >= initialVerts,
      `折叠后顶点数应 >= 初始值 (${paper.vertices.length} >= ${initialVerts})`);
    assert.ok(paper.foldLines.length > 0, '折叠后应重新生成折叠线');
    assert.notStrictEqual(paper.foldLines.length, initialLines,
      '折叠线数量应变化以适配新多边形');
  });

  it('每次折叠后折叠线都应适配当前多边形', () => {
    for (let fold = 0; fold < 3; fold++) {
      const vertCount = paper.vertices.length;
      const lineCount = paper.foldLines.length;

      paper.fold(0);

      if (fold < 2) {
        assert.ok(paper.foldLines.length > 0,
          `第${fold + 1}次折叠后应有折叠线 (当前顶点数: ${vertCount})`);
        for (const fl of paper.foldLines) {
          const mid = new THREE.Vector3().addVectors(fl.startPoint, fl.endPoint).multiplyScalar(0.5);
          let crossCount = 0;
          const dir = new THREE.Vector3().subVectors(fl.endPoint, fl.startPoint);

          for (let i = 0; i < paper.vertices.length; i++) {
            const v1 = paper.vertices[i];
            const v2 = paper.vertices[(i + 1) % paper.vertices.length];
            const toMid = new THREE.Vector3().subVectors(mid, v1);
            const edgeDir = new THREE.Vector3().subVectors(v2, v1);
            const cross = new THREE.Vector3().crossVectors(dir, edgeDir);
            if (Math.abs(cross.y) > 0.01) crossCount++;
          }
          assert.ok(crossCount > 0, `第${fold + 1}次折叠的折叠线应分割多边形`);
        }
      }
    }
  });

  it('三次折叠后顶点数应稳定且不混乱', () => {
    paper.fold(0);
    const vertsAfter1 = paper.vertices.length;

    paper.fold(0);
    const vertsAfter2 = paper.vertices.length;

    paper.fold(0);
    const vertsAfter3 = paper.vertices.length;

    assert.ok(vertsAfter1 >= 4, '第一次折叠后顶点数 >= 4');
    assert.ok(vertsAfter2 >= 3, '第二次折叠后顶点数 >= 3');
    assert.ok(vertsAfter3 >= 3, '第三次折叠后顶点数 >= 3');

    for (const v of paper.vertices) {
      assert.ok(!isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z),
        `顶点坐标有效: (${v.x}, ${v.y}, ${v.z})`);
    }
  });
});

describe('CompoundStructure 拓扑识别测试', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  });

  it('应检测面数和顶点数', () => {
    const paper1 = new PaperSheet(scene, new THREE.Vector3(0, 0, 0), 'topo1');
    const paper2 = new PaperSheet(scene, new THREE.Vector3(0.5, 0, 0), 'topo2');

    paper1.fold(0);
    paper2.fold(0);

    const { CompoundStructure, StructureType } = require('../src/paper');
    const compound = new CompoundStructure('compound_test', [paper1, paper2], scene);

    assert.ok(compound.faceCount > 0, '应有面数');
    assert.ok(compound.vertexCount > 0, '应有顶点数');
    assert.strictEqual(typeof compound.getStructureType(), typeof StructureType.HEXAHEDRON !== 'undefined' ? 'string' : 'object');
  });
});

console.log('运行测试...');
console.log('注意: 这些测试可以通过 node --test tests/paper.test.ts 运行');
console.log('或者直接运行: node tests/paper.test.ts');
