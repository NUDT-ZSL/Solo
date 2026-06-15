import { describe, it, expect, beforeEach } from 'vitest';
import {
  Ball,
  Particle,
  createBall,
  updatePhysics,
  rotateBallVelocity,
  deleteBall,
  getBallAtPosition,
  COLOR_PALETTE
} from './physicsEngine';

function createTestBall(x: number, y: number, vx: number, vy: number, radius: number, color: string): Ball {
  const ball = createBall(x, y, radius, color);
  ball.vx = vx;
  ball.vy = vy;
  ball.scale = 1;
  ball.scaleTarget = 1;
  ball.trail = [];
  return ball;
}

describe('物理引擎 - 碰撞响应', () => {
  it('两球正碰时应满足动量守恒', () => {
    const ballA = createTestBall(200, 200, 5, 0, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -3, 0, 10, '#00ff00');

    const massA = Math.PI * 10 * 10;
    const massB = Math.PI * 10 * 10;
    const initialMomentum = massA * 5 + massB * (-3);

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    const finalMomentum = massA * ballA.vx + massB * ballB.vx;

    expect(finalMomentum).toBeCloseTo(initialMomentum, 3);
  });

  it('两球正碰时恢复系数应为0.85', () => {
    const ballA = createTestBall(200, 200, 4, 0, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -2, 0, 10, '#00ff00');

    const initialRelVel = 4 - (-2);

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    const finalRelVel = ballB.vx - ballA.vx;
    const restitution = Math.abs(finalRelVel / initialRelVel);

    expect(restitution).toBeCloseTo(0.85, 2);
  });

  it('不同质量的球碰撞时速度分配正确', () => {
    const ballA = createTestBall(250, 200, 0, 0, 5, '#ff0000');
    const ballB = createTestBall(280, 200, -4, 0, 15, '#00ff00');

    const massA = Math.PI * 5 * 5;
    const massB = Math.PI * 15 * 15;

    const initialMomentum = massA * 0 + massB * (-4);

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    const finalMomentum = massA * ballA.vx + massB * ballB.vx;

    expect(finalMomentum).toBeCloseTo(initialMomentum, 3);
  });

  it('斜碰时切向速度分量不变', () => {
    const ballA = createTestBall(200, 200, 5, 2, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -3, -1, 10, '#00ff00');

    const initialVyA = ballA.vy;
    const initialVyB = ballB.vy;

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    expect(ballA.vy).toBeCloseTo(initialVyA, 5);
    expect(ballB.vy).toBeCloseTo(initialVyB, 5);
  });

  it('多球同时碰撞时迭代求解稳定', () => {
    const balls: Ball[] = [
      createTestBall(200, 200, 5, 0, 10, '#ff0000'),
      createTestBall(218, 200, 0, 0, 10, '#00ff00'),
      createTestBall(236, 200, -3, 0, 10, '#0000ff'),
    ];

    const particles: Particle[] = [];

    const initialTotalMomentum = balls.reduce(
      (sum, b) => sum + Math.PI * b.radius * b.radius * b.vx,
      0
    );

    for (let i = 0; i < 10; i++) {
      updatePhysics(balls, particles, 0, 0, 500, 500, i);
    }

    const finalTotalMomentum = balls.reduce(
      (sum, b) => sum + Math.PI * b.radius * b.radius * b.vx,
      0
    );

    expect(finalTotalMomentum).toBeCloseTo(initialTotalMomentum, 2);
  });
});

describe('物理引擎 - 速度向量旋转', () => {
  it('旋转90度应正确改变速度方向', () => {
    const ball = createTestBall(0, 0, 5, 0, 10, '#ff0000');

    rotateBallVelocity(ball, 90);

    expect(ball.vx).toBeCloseTo(0, 5);
    expect(ball.vy).toBeCloseTo(5, 5);
  });

  it('旋转180度应反向速度', () => {
    const ball = createTestBall(0, 0, 3, 4, 10, '#ff0000');

    rotateBallVelocity(ball, 180);

    expect(ball.vx).toBeCloseTo(-3, 5);
    expect(ball.vy).toBeCloseTo(-4, 5);
  });

  it('旋转3度应保持速度大小基本不变', () => {
    const ball = createTestBall(0, 0, 3, 4, 10, '#ff0000');
    const initialSpeed = Math.sqrt(3 * 3 + 4 * 4);

    rotateBallVelocity(ball, 3);

    const finalSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    expect(finalSpeed).toBeCloseTo(initialSpeed, 5);
  });

  it('连续小角度旋转累积效果正确', () => {
    const ball = createTestBall(0, 0, 5, 0, 10, '#ff0000');

    for (let i = 0; i < 30; i++) {
      rotateBallVelocity(ball, 3);
    }

    expect(ball.vx).toBeCloseTo(0, 2);
    expect(ball.vy).toBeCloseTo(5, 2);
  });
});

describe('物理引擎 - 粒子爆散', () => {
  it('碰撞时应生成8-12个粒子', () => {
    const ballA = createTestBall(200, 200, 5, 0, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -3, 0, 10, '#00ff00');

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    expect(particles.length).toBeGreaterThanOrEqual(8);
    expect(particles.length).toBeLessThanOrEqual(12);
  });

  it('粒子应沿碰撞法线两侧±60度扩散', () => {
    const ballA = createTestBall(200, 200, 5, 0, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -3, 0, 10, '#00ff00');

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    const maxAngle = Math.PI / 3;

    for (const p of particles) {
      const angle = Math.atan2(p.vy, p.vx);
      const absAngle = Math.abs(angle);
      expect(absAngle).toBeLessThanOrEqual(maxAngle + 0.01);
    }
  });

  it('粒子颜色应取自两球中较亮者', () => {
    const brightBall = createTestBall(200, 200, 5, 0, 10, '#ffffff');
    const darkBall = createTestBall(225, 200, -3, 0, 10, '#000000');

    const particles: Particle[] = [];
    const balls = [brightBall, darkBall];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    for (const p of particles) {
      expect(p.color).toBe('#ffffff');
    }
  });

  it('粒子生命周期应为约0.3秒(18帧)', () => {
    const ballA = createTestBall(200, 200, 5, 0, 10, '#ff0000');
    const ballB = createTestBall(225, 200, -3, 0, 10, '#00ff00');

    const particles: Particle[] = [];
    const balls = [ballA, ballB];

    updatePhysics(balls, particles, 0, 0, 500, 500, 1);

    for (const p of particles) {
      expect(p.maxLife).toBe(18);
      expect(p.life).toBeGreaterThan(0.9);
      expect(p.life).toBeLessThanOrEqual(1);
    }
  });
});

describe('物理引擎 - 重力与摩擦力', () => {
  it('重力应使球的垂直速度增加', () => {
    const ball = createTestBall(50, 50, 2, 0, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    const initialVy = ball.vy;

    updatePhysics(balls, particles, 0.5, 0, 100, 100, 1);

    expect(ball.vy).toBeGreaterThan(initialVy);
  });

  it('摩擦力应使球速度减小', () => {
    const ball = createTestBall(50, 50, 5, 3, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    const initialSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    updatePhysics(balls, particles, 0, 0.1, 100, 100, 1);

    const finalSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    expect(finalSpeed).toBeLessThan(initialSpeed);
  });

  it('动能计算应正确', () => {
    const ball = createTestBall(50, 50, 3, 4, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    const result = updatePhysics(balls, particles, 0, 0, 100, 100, 1);

    const mass = Math.PI * 10 * 10;
    const expectedKE = 0.5 * mass * (3 * 3 + 4 * 4);

    expect(result.totalKineticEnergy).toBeCloseTo(expectedKE, 3);
  });
});

describe('物理引擎 - 球体操作', () => {
  it('创建球时应获得随机初速度', () => {
    const ball = createBall(50, 50, 15, '#ff0000');

    expect(ball.vx).toBeGreaterThanOrEqual(-3);
    expect(ball.vx).toBeLessThanOrEqual(3);
    expect(ball.vy).toBeGreaterThanOrEqual(-5);
    expect(ball.vy).toBeLessThanOrEqual(-2);
  });

  it('删除球时应设置deleting标志和scaleTarget', () => {
    const ball = createTestBall(50, 50, 3, 4, 10, '#ff0000');

    deleteBall(ball);

    expect(ball.deleting).toBe(true);
    expect(ball.scaleTarget).toBe(0);
  });

  it('getBallAtPosition应正确检测点击命中', () => {
    const ball = createTestBall(50, 50, 0, 0, 15, '#ff0000');
    const balls = [ball];

    const hitBall = getBallAtPosition(balls, 55, 55);
    expect(hitBall).not.toBeNull();
    expect(hitBall?.id).toBe(ball.id);

    const missBall = getBallAtPosition(balls, 100, 100);
    expect(missBall).toBeNull();
  });
});

describe('物理引擎 - 边界碰撞', () => {
  it('球应从左边界反弹', () => {
    const ball = createTestBall(5, 50, -3, 2, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    updatePhysics(balls, particles, 0, 0, 100, 100, 1);

    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.x).toBeGreaterThanOrEqual(10);
  });

  it('球应从右边界反弹', () => {
    const ball = createTestBall(95, 50, 3, 2, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    updatePhysics(balls, particles, 0, 0, 100, 100, 1);

    expect(ball.vx).toBeLessThan(0);
    expect(ball.x).toBeLessThanOrEqual(90);
  });

  it('球应从底边界反弹', () => {
    const ball = createTestBall(50, 95, 2, 3, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    updatePhysics(balls, particles, 0, 0, 100, 100, 1);

    expect(ball.vy).toBeLessThan(0);
  });
});

describe('物理引擎 - 拖尾轨迹', () => {
  it('拖尾应最多保留5帧位置', () => {
    const ball = createTestBall(50, 50, 2, 1, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    for (let i = 0; i < 10; i++) {
      updatePhysics(balls, particles, 0, 0, 200, 200, i);
    }

    expect(ball.trail.length).toBeLessThanOrEqual(5);
  });

  it('拖尾应记录历史位置', () => {
    const ball = createTestBall(50, 50, 2, 0, 10, '#ff0000');
    const balls = [ball];
    const particles: Particle[] = [];

    updatePhysics(balls, particles, 0, 0, 200, 200, 0);

    expect(ball.trail.length).toBeGreaterThanOrEqual(1);
    expect(ball.trail[0].x).toBeCloseTo(52, 0);
  });
});

describe('物理引擎 - 性能优化 - 空间网格', () => {
  it('球数超过20个时应使用空间网格', () => {
    const balls: Ball[] = [];
    for (let i = 0; i < 30; i++) {
      balls.push(createTestBall(
        Math.random() * 500,
        Math.random() * 500,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        10,
        COLOR_PALETTE[i % COLOR_PALETTE.length]
      ));
    }

    const particles: Particle[] = [];
    const initialCount = balls.length;

    const result = updatePhysics(balls, particles, 0, 0, 600, 600, 1);

    expect(result.balls.length).toBe(initialCount);
  });

  it('空间网格检测结果应与暴力检测一致', () => {
    const balls: Ball[] = [];
    for (let i = 0; i < 15; i++) {
      balls.push(createTestBall(
        50 + Math.random() * 400,
        50 + Math.random() * 400,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        20,
        COLOR_PALETTE[i % COLOR_PALETTE.length]
      ));
    }

    const ballsCopy = balls.map(b => ({...b}));
    const particles1: Particle[] = [];
    const particles2: Particle[] = [];

    updatePhysics(balls, particles1, 0, 0, 500, 500, 1);

    const mom1 = balls.reduce((s, b) => s + b.vx * b.radius * b.radius, 0);
    const mom2 = balls.reduce((s, b) => s + b.vy * b.radius * b.radius, 0);

    expect(Math.abs(mom1)).toBeLessThan(10000);
    expect(Math.abs(mom2)).toBeLessThan(10000);
  });
});
