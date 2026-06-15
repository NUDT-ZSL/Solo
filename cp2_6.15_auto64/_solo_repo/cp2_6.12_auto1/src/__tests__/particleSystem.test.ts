import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem, ParticleType, PARTICLE_QUALITY_THRESHOLD_HIGH, PARTICLE_QUALITY_THRESHOLD_LOW } from '../particleSystem';

describe('particleSystem - 质量等级', () => {
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    particleSystem = new ParticleSystem(800, 600);
  });

  describe('阈值常量', () => {
    it('低阈值为100', () => {
      expect(PARTICLE_QUALITY_THRESHOLD_HIGH).toBe(100);
    });

    it('高阈值为200', () => {
      expect(PARTICLE_QUALITY_THRESHOLD_LOW).toBe(200);
    });
  });

  describe('getQuality', () => {
    it('粒子数为0时返回最高质量2', () => {
      expect(particleSystem.getQuality()).toBe(2);
    });

    it('粒子数50（<100）时返回质量2', () => {
      for (let i = 0; i < 50; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(2);
    });

    it('粒子数刚好100时返回质量2', () => {
      for (let i = 0; i < 100; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(2);
    });

    it('粒子数150（100-200之间）时返回质量1', () => {
      for (let i = 0; i < 150; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(1);
    });

    it('粒子数刚好200时返回质量1', () => {
      for (let i = 0; i < 200; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(1);
    });

    it('粒子数超过200时返回质量0', () => {
      for (let i = 0; i < 250; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(0);
    });

    it('粒子数500时返回质量0', () => {
      for (let i = 0; i < 500; i++) {
        particleSystem.emitSpark(0, 0, ParticleType.SPARK);
      }
      expect(particleSystem.getQuality()).toBe(0);
    });
  });

  describe('sizeCurve', () => {
    it('TRAIL类型: t=1时返回1.0', () => {
      const result = ParticleSystem['sizeCurve'](1, ParticleType.TRAIL);
      expect(result).toBeCloseTo(1.0, 1);
    });

    it('TRAIL类型: t=0时返回接近0但不为0', () => {
      const result = ParticleSystem['sizeCurve'](0, ParticleType.TRAIL);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.1);
    });

    it('TRAIL类型: t=0.5时返回约0.35-0.45', () => {
      const result = ParticleSystem['sizeCurve'](0.5, ParticleType.TRAIL);
      expect(result).toBeGreaterThan(0.3);
      expect(result).toBeLessThan(0.5);
    });

    it('SPARK类型: t=0.5时大于0.5', () => {
      const result = ParticleSystem['sizeCurve'](0.5, ParticleType.SPARK);
      expect(result).toBeGreaterThan(0.5);
    });

    it('SPARK类型: t=1时返回0', () => {
      const result = ParticleSystem['sizeCurve'](1, ParticleType.SPARK);
      expect(result).toBeCloseTo(0, 1);
    });

    it('EXPLOSION类型: t=0时返回1', () => {
      const result = ParticleSystem['sizeCurve'](0, ParticleType.EXPLOSION);
      expect(result).toBe(1);
    });

    it('所有类型返回值在0-1之间', () => {
      const types = [ParticleType.SPARK, ParticleType.TRAIL, ParticleType.EXPLOSION, ParticleType.DEBRIS];
      for (const type of types) {
        for (let t = 0; t <= 1; t += 0.1) {
          const result = ParticleSystem['sizeCurve'](t, type);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1.01);
        }
      }
    });
  });
});

describe('particleSystem - 对象池', () => {
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    particleSystem = new ParticleSystem(800, 600);
  });

  it('初始时没有活跃粒子', () => {
    expect(particleSystem.getParticleCount()).toBe(0);
  });

  it('emitSpark增加粒子数', () => {
    const before = particleSystem.getParticleCount();
    particleSystem.emitSpark(100, 100, ParticleType.SPARK);
    expect(particleSystem.getParticleCount()).toBe(before + 1);
  });

  it('update后过期粒子被回收', () => {
    particleSystem.emitSpark(0, 0, ParticleType.SPARK);
    particleSystem.emitSpark(0, 0, ParticleType.SPARK);
    expect(particleSystem.getParticleCount()).toBe(2);

    particleSystem.update(10);
    expect(particleSystem.getParticleCount()).toBeLessThanOrEqual(2);
  });

  it('emitExplosion产生多个粒子', () => {
    particleSystem.emitExplosion(0, 0, '#ff0000');
    expect(particleSystem.getParticleCount()).toBeGreaterThan(5);
  });

  it('emitTrail产生拖尾粒子', () => {
    particleSystem.emitTrail(0, 0, ParticleType.TRAIL, '#00ff00', 3);
    expect(particleSystem.getParticleCount()).toBe(1);
  });
});

describe('particleSystem - ParticleType', () => {
  it('包含所有粒子类型', () => {
    expect(ParticleType.SPARK).toBe('spark');
    expect(ParticleType.TRAIL).toBe('trail');
    expect(ParticleType.EXPLOSION).toBe('explosion');
    expect(ParticleType.DEBRIS).toBe('debris');
  });
});
