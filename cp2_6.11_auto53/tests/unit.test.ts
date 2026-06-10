import { ParticleSystem } from '../src/particle';
import { Harp } from '../src/harp';
import { Recorder } from '../src/recorder';
import { AudioSynthesizer } from '../src/audio';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

class TestRunner {
  private results: TestResult[] = [];

  assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertTrue(value: boolean, message: string): void {
    if (!value) {
      throw new Error(`${message}: expected true, got false`);
    }
  }

  assertFalse(value: boolean, message: string): void {
    if (value) {
      throw new Error(`${message}: expected false, got true`);
    }
  }

  assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): void {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`${message}: expected ~${expected}, got ${actual}`);
    }
  }

  run(name: string, fn: () => void): void {
    try {
      fn();
      this.results.push({ name, passed: true, message: 'PASS' });
    } catch (e) {
      this.results.push({ name, passed: false, message: (e as Error).message });
    }
  }

  printResults(): void {
    console.log('\n=== TEST RESULTS ===\n');
    let passCount = 0;
    
    const resultsDiv = document.getElementById('results');
    const summaryDiv = document.getElementById('summary');
    
    for (const r of this.results) {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status}  ${r.name}`);
      if (!r.passed) {
        console.log(`       ${r.message}`);
      }
      if (r.passed) passCount++;
      
      if (resultsDiv) {
        const div = document.createElement('div');
        div.className = `test ${r.passed ? 'pass' : 'fail'}`;
        div.innerHTML = `<strong>${status}</strong> ${r.name}` + 
          (r.passed ? '' : `<div class="msg">${r.message}</div>`);
        resultsDiv.appendChild(div);
      }
    }
    
    const summary = `Total: ${passCount}/${this.results.length} passed`;
    console.log(`\n${summary}\n`);
    
    if (summaryDiv) {
      summaryDiv.textContent = summary;
      summaryDiv.style.color = passCount === this.results.length ? '#6BCB77' : '#ff6b6b';
    }
  }
}

const runner = new TestRunner();

runner.run('ParticleSystem: 初始粒子数为0', () => {
  const ps = new ParticleSystem();
  runner.assertEqual(ps.getParticles().length, 0, '初始粒子数');
});

runner.run('ParticleSystem: emit后粒子数量正确', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 10);
  runner.assertEqual(ps.getParticles().length, 10, 'emit后粒子数');
});

runner.run('ParticleSystem: 刚好50个粒子时emit新粒子销毁最早的', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 50);
  const particles = ps.getParticles();
  runner.assertEqual(particles.length, 50, 'emit 50个后粒子数');
  
  const firstParticleInitialVx = particles[0].initialVx;
  const lastParticleInitialVx = particles[49].initialVx;
  
  ps.emit(100, 100, '#4ecdc4', 1);
  
  const newParticles = ps.getParticles();
  runner.assertEqual(newParticles.length, 50, '再emit 1个后仍为50个');
  runner.assertFalse(
    newParticles[0].initialVx === firstParticleInitialVx,
    '最早的粒子应该被销毁'
  );
  runner.assertTrue(
    newParticles[newParticles.length - 1].x !== 0 || newParticles[newParticles.length - 1].y !== 0,
    '最新的粒子应该在新位置'
  );
});

runner.run('ParticleSystem: 超过50个时销毁最早粒子', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 40);
  const firstId = ps.getParticles()[0].initialVx;
  
  ps.emit(100, 100, '#4ecdc4', 20);
  
  const particles = ps.getParticles();
  runner.assertEqual(particles.length, 50, '总量限制50');
  runner.assertFalse(
    particles[0].initialVx === firstId,
    '最早的粒子已被移除'
  );
});

runner.run('ParticleSystem: 每个粒子有独立的sineOffset', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 20);
  const offsets = ps.getParticles().map(p => p.sineOffset);
  const uniqueOffsets = new Set(offsets);
  runner.assertTrue(uniqueOffsets.size > 1, '粒子的sineOffset不应全部相同');
});

runner.run('ParticleSystem: 粒子有独立的sineAmplitude和sineFrequency', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 20);
  const particles = ps.getParticles();
  
  const amplitudes = new Set(particles.map(p => p.sineAmplitude.toFixed(2)));
  const frequencies = new Set(particles.map(p => p.sineFrequency.toFixed(2)));
  
  runner.assertTrue(amplitudes.size > 1, '粒子的sineAmplitude应有差异');
  runner.assertTrue(frequencies.size > 1, '粒子的sineFrequency应有差异');
});

runner.run('ParticleSystem: update后粒子位置沿正弦波变化', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 5);
  const particles = ps.getParticles();
  
  const initialPositions = particles.map(p => ({ x: p.x, y: p.y }));
  
  ps.update(0.016);
  ps.update(0.016);
  ps.update(0.016);
  
  particles.forEach((p, i) => {
    const moved = Math.abs(p.x - initialPositions[i].x) > 0.1 || 
                  Math.abs(p.y - initialPositions[i].y) > 0.1;
    runner.assertTrue(moved, `粒子 ${i} 应该移动了位置`);
  });
});

runner.run('ParticleSystem: 粒子有垂直方向向量perpX/perpY', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 5);
  
  for (const p of ps.getParticles()) {
    const dotProduct = p.initialVx * p.perpX + p.initialVy * p.perpY;
    runner.assertApproxEqual(dotProduct, 0, 0.001, '垂直向量与速度向量点积应为0');
    const perpLength = Math.sqrt(p.perpX * p.perpX + p.perpY * p.perpY);
    runner.assertApproxEqual(perpLength, 1, 0.001, '垂直向量应为单位向量');
  }
});

runner.run('ParticleSystem: 粒子生命周期结束后被销毁', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 10);
  runner.assertEqual(ps.getParticles().length, 10, '初始10个粒子');
  
  ps.update(1.0);
  runner.assertTrue(ps.getParticles().length > 0, '1秒后还有粒子存活');
  
  ps.update(1.0);
  runner.assertEqual(ps.getParticles().length, 0, '1.5秒后所有粒子被销毁');
});

runner.run('Harp: 初始琴弦未被触发', () => {
  const ps = new ParticleSystem();
  const audioSynth = new AudioSynthesizer();
  const harp = new Harp(ps, audioSynth);
  harp.setCenter(400, 300, 1);
  
  for (let i = 0; i < 12; i++) {
    runner.assertFalse(harp.getStrings()[i].isTriggered, `弦 ${i} 初始未触发`);
  }
});

runner.run('Harp: triggerString后弦被正确触发', () => {
  const ps = new ParticleSystem();
  const audioSynth = new AudioSynthesizer();
  const harp = new Harp(ps, audioSynth);
  harp.setCenter(400, 300, 1);
  
  harp.triggerString(5);
  
  const str = harp.getStrings()[5];
  runner.assertTrue(str.isTriggered, '触发后isTriggered=true');
  runner.assertEqual(str.triggerTime, 0, '触发时triggerTime=0');
  runner.assertTrue(str.vibrationAmplitude > 0, '触发后振幅>0');
});

runner.run('Harp: 0.3秒后震动强制停止', () => {
  const ps = new ParticleSystem();
  const audioSynth = new AudioSynthesizer();
  const harp = new Harp(ps, audioSynth);
  harp.setCenter(400, 300, 1);
  
  harp.triggerString(3);
  
  harp.update(0.29);
  runner.assertTrue(harp.getStrings()[3].vibrationAmplitude > 0, '0.29秒时仍在震动');
  
  harp.update(0.02);
  runner.assertEqual(harp.getStrings()[3].vibrationAmplitude, 0, '0.31秒后振幅为0');
  runner.assertFalse(harp.getStrings()[3].isTriggered, '0.31秒后isTriggered=false');
});

runner.run('Harp: 指数衰减正确 - 0.15秒时振幅约为初始的~3.16%', () => {
  const ps = new ParticleSystem();
  const audioSynth = new AudioSynthesizer();
  const harp = new Harp(ps, audioSynth);
  harp.setCenter(400, 300, 1);
  
  harp.triggerString(0);
  
  const initialAmp = harp.getStrings()[0].vibrationAmplitude;
  runner.assertTrue(initialAmp > 0, '初始振幅>0');
  
  harp.update(0.15);
  
  const currentAmp = harp.getStrings()[0].vibrationAmplitude;
  const ratio = currentAmp / initialAmp;
  
  runner.assertTrue(ratio < 0.1, '0.15秒时振幅比例应<0.1');
  runner.assertTrue(ratio > 0.001, '0.15秒时振幅比例应>0.001');
});

runner.run('Harp: 拖放滑音有正确的setTimeout队列', () => {
  const ps = new ParticleSystem();
  const audioSynth = new AudioSynthesizer();
  const harp = new Harp(ps, audioSynth);
  harp.setCenter(400, 300, 1);
  
  harp.handleDrag(2, 6);
  
  runner.assertTrue(harp.getGlideTimeouts().length === 4, '从第2弦滑到第6弦应有4个timeout');
});

runner.run('Recorder: stopPlayback重置进度', () => {
  const recorder = new Recorder();
  let progressCalled = false;
  let progressCurrent = -1;
  let progressTotal = -1;
  let stopCalled = false;
  
  recorder.onPlaybackProgress = (c: number, t: number) => {
    progressCalled = true;
    progressCurrent = c;
    progressTotal = t;
  };
  recorder.onPlaybackStop = () => { stopCalled = true; };
  
  const testData = {
    name: 'test',
    duration: 10,
    events: [{ stringIndex: 0, timestamp: 0 }],
    stringCount: 12,
    toneLevel: 'mid',
    createdAt: Date.now()
  };
  localStorage.setItem('liuguang_melody_test.json', JSON.stringify(testData));
  
  recorder.playMelody('test.json');
  recorder.stopPlayback();
  
  runner.assertTrue(progressCalled, '应调用onPlaybackProgress重置');
  runner.assertEqual(progressCurrent, 0, 'current应重置为0');
  runner.assertEqual(progressTotal, 10, 'total应是乐曲时长');
  runner.assertTrue(stopCalled, '应调用onPlaybackStop');
  
  localStorage.removeItem('liuguang_melody_test.json');
});

runner.run('Recorder: formatTime格式正确', () => {
  const recorder = new Recorder();
  runner.assertEqual(recorder.formatTime(0), '00:00', '0秒');
  runner.assertEqual(recorder.formatTime(5), '00:05', '5秒');
  runner.assertEqual(recorder.formatTime(12), '00:12', '12秒');
  runner.assertEqual(recorder.formatTime(30), '00:30', '30秒');
  runner.assertEqual(recorder.formatTime(65), '01:05', '65秒');
  runner.assertEqual(recorder.formatTime(125), '02:05', '125秒');
});

runner.run('ParticleSystem: clear清空所有粒子', () => {
  const ps = new ParticleSystem();
  ps.emit(0, 0, '#ff6b6b', 30);
  runner.assertEqual(ps.getParticles().length, 30, 'emit后有30个');
  ps.clear();
  runner.assertEqual(ps.getParticles().length, 0, 'clear后为0');
});

runner.printResults();
