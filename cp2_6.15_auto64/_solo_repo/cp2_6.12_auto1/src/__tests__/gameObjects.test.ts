import { describe, it, expect } from 'vitest';
import { checkCollision, clamp, lerp, distance, COLORS, EnemyType, ENEMY_CONFIG, DEFAULT_ENEMY_TYPE } from '../gameObjects';

describe('gameObjects - 工具函数', () => {
  describe('clamp', () => {
    it('值在范围内时返回原值', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('值小于最小值时返回最小值', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('值大于最大值时返回最大值', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('边界值正确', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('t=0 返回起始值', () => {
      expect(lerp(0, 10, 0)).toBe(0);
    });

    it('t=1 返回结束值', () => {
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('t=0.5 返回中间值', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });

    it('支持负数范围', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  describe('distance', () => {
    it('相同点距离为0', () => {
      expect(distance(0, 0, 0, 0)).toBe(0);
    });

    it('水平距离计算正确', () => {
      expect(distance(0, 0, 3, 0)).toBe(3);
    });

    it('垂直距离计算正确', () => {
      expect(distance(0, 0, 0, 4)).toBe(4);
    });

    it('勾股定理正确', () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
    });
  });

  describe('checkCollision', () => {
    it('完全重叠的圆碰撞', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 0, y: 0, radius: 5 };
      expect(checkCollision(a, b)).toBe(true);
    });

    it('部分重叠的圆碰撞', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 3, y: 4, radius: 3 };
      expect(checkCollision(a, b)).toBe(true);
    });

    it('刚好接触的圆不碰撞（严格小于）', () => {
      const a = { x: 0, y: 0, radius: 5 };
      const b = { x: 8, y: 0, radius: 3 };
      expect(checkCollision(a, b)).toBe(false);
    });

    it('分离的圆不碰撞', () => {
      const a = { x: 0, y: 0, radius: 2 };
      const b = { x: 10, y: 0, radius: 2 };
      expect(checkCollision(a, b)).toBe(false);
    });

    it('大半径包含小半径时碰撞', () => {
      const a = { x: 0, y: 0, radius: 10 };
      const b = { x: 2, y: 2, radius: 3 };
      expect(checkCollision(a, b)).toBe(true);
    });
  });
});

describe('gameObjects - 常量配置', () => {
  describe('COLORS', () => {
    it('包含所有必需的颜色', () => {
      expect(COLORS.NEON_GREEN).toBeDefined();
      expect(COLORS.NEON_RED).toBeDefined();
      expect(COLORS.SHIELD_BLUE).toBeDefined();
      expect(COLORS.NEON_ORANGE).toBeDefined();
    });

    it('颜色值为有效字符串', () => {
      expect(typeof COLORS.NEON_GREEN).toBe('string');
      expect(COLORS.NEON_GREEN.startsWith('#')).toBe(true);
    });
  });

  describe('EnemyType', () => {
    it('包含所有敌人类型', () => {
      expect(EnemyType.ASTEROID_SMALL).toBe('asteroid_small');
      expect(EnemyType.ASTEROID_MEDIUM).toBe('asteroid_medium');
      expect(EnemyType.ASTEROID_LARGE).toBe('asteroid_large');
      expect(EnemyType.FIGHTER).toBe('fighter');
      expect(EnemyType.BOSS).toBe('boss');
    });
  });

  describe('ENEMY_CONFIG', () => {
    it('所有敌人类型都有配置', () => {
      const types = Object.values(EnemyType);
      for (const type of types) {
        expect(ENEMY_CONFIG[type as EnemyType]).toBeDefined();
      }
    });

    it('配置包含必需字段', () => {
      const config = ENEMY_CONFIG[EnemyType.ASTEROID_SMALL];
      expect(config.hp).toBeGreaterThan(0);
      expect(config.radius).toBeGreaterThan(0);
      expect(config.damage).toBeGreaterThan(0);
      expect(config.score).toBeGreaterThan(0);
      expect(config.speed).toBeGreaterThan(0);
    });

    it('BOSS 有护盾配置', () => {
      const bossConfig = ENEMY_CONFIG[EnemyType.BOSS];
      expect(bossConfig.shield).toBeGreaterThan(0);
      expect(bossConfig.shieldRegen).toBeGreaterThan(0);
    });

    it('小型陨石没有护盾配置', () => {
      const smallConfig = ENEMY_CONFIG[EnemyType.ASTEROID_SMALL];
      expect(smallConfig.shield).toBeUndefined();
    });
  });

  describe('DEFAULT_ENEMY_TYPE', () => {
    it('是有效的敌人类型', () => {
      expect(ENEMY_CONFIG[DEFAULT_ENEMY_TYPE]).toBeDefined();
    });
  });
});
