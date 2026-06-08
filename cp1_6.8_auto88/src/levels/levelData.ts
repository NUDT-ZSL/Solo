import { LevelData, Gear, SteamVent, LightMechanism, EnergyCore, Platform, Boss } from './types'
import { createBoss } from './BossAI'

function createPlatform(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lightCondition: Platform['lightCondition'] = 'always'
): Platform {
  return {
    id,
    x,
    y,
    width,
    height,
    visible: lightCondition === 'always' || lightCondition === 'light-left',
    lightCondition,
  }
}

function createGear(
  id: string,
  x: number,
  y: number,
  radius: number,
  speed: number,
  clockwise = true
): Gear {
  return {
    id,
    x,
    y,
    radius,
    teethCount: Math.max(6, Math.floor(radius / 8)),
    rotationSpeed: speed,
    currentAngle: 0,
    clockwise,
  }
}

function createSteamVent(
  id: string,
  x: number,
  y: number,
  direction: SteamVent['direction'],
  intensity: number,
  changeInterval: number,
  width = 30,
  height = 30
): SteamVent {
  return {
    id,
    x,
    y,
    direction,
    intensity,
    width,
    height,
    active: true,
    changeInterval,
    timer: 0,
    particles: [],
  }
}

function createEnergyCore(id: string, x: number, y: number): EnergyCore {
  return {
    id,
    x,
    y,
    collected: false,
    glowPhase: 0,
    radius: 14,
  }
}

function createLightMechanism(
  id: string,
  x: number,
  y: number,
  linkedPlatformIds: string[],
  startDir: LightMechanism['currentDirection'] = 'left'
): LightMechanism {
  return {
    id,
    x,
    y,
    currentDirection: startDir,
    linkedPlatformIds,
    cooldown: 1.0,
    cooldownTimer: 0,
  }
}

export const level1: LevelData = {
  id: 1,
  name: '齿轮工坊',
  worldWidth: 3600,
  worldHeight: 720,
  playerStart: { x: 80, y: 500 },
  platforms: [
    createPlatform('p1_floor', 0, 620, 600, 100),
    createPlatform('p1_a', 250, 520, 120, 20),
    createPlatform('p1_b', 450, 440, 100, 20),
    createPlatform('p1_c', 650, 520, 150, 20, 'light-left'),
    createPlatform('p1_d', 650, 520, 150, 20, 'light-right'),
    createPlatform('p1_e', 850, 440, 120, 20),
    createPlatform('p1_f', 1050, 360, 100, 20),
    createPlatform('p1_g', 1200, 440, 200, 20),
    createPlatform('p1_h', 1500, 520, 150, 20, 'light-left'),
    createPlatform('p1_i', 1500, 520, 150, 20, 'light-right'),
    createPlatform('p1_j', 1700, 440, 100, 20),
    createPlatform('p1_k', 1900, 360, 80, 20),
    createPlatform('p1_l', 2100, 440, 120, 20),
    createPlatform('p1_m', 2300, 520, 200, 20),
    createPlatform('p1_boss_floor', 2600, 620, 600, 100),
    createPlatform('p1_boss_a', 2700, 500, 100, 20),
    createPlatform('p1_boss_b', 2950, 420, 100, 20),
  ],
  gears: [
    createGear('g1', 350, 420, 45, 1.5),
    createGear('g2', 900, 350, 55, 1.2, false),
    createGear('g3', 1600, 340, 40, 2.0),
    createGear('g4', 2800, 400, 50, 1.8),
  ],
  steamVents: [
    createSteamVent('sv1', 500, 620, 'up', 2, 4, 40),
    createSteamVent('sv2', 1100, 440, 'up', 2.5, 3.5, 35),
    createSteamVent('sv3', 1800, 440, 'right', 1.5, 5, 30),
    createSteamVent('sv4', 2400, 620, 'up', 2, 4, 40),
  ],
  lightMechanisms: [
    createLightMechanism('lm1', 750, 490, ['p1_c', 'p1_d']),
    createLightMechanism('lm2', 1550, 490, ['p1_h', 'p1_i']),
  ],
  energyCores: [
    createEnergyCore('ec1', 300, 490),
    createEnergyCore('ec2', 490, 410),
    createEnergyCore('ec3', 890, 410),
    createEnergyCore('ec4', 1100, 330),
    createEnergyCore('ec5', 1550, 490),
    createEnergyCore('ec6', 2150, 410),
  ],
  boss: createBoss('boss1', 2850, 548, 100),
  door: { x: 3150, y: 560, width: 40, height: 60, locked: true, levelExit: true },
  backgroundGears: [
    { x: 200, y: 300, radius: 80, speed: 0.3 },
    { x: 600, y: 200, radius: 60, speed: -0.5 },
    { x: 1000, y: 350, radius: 100, speed: 0.2 },
    { x: 1500, y: 250, radius: 70, speed: -0.4 },
    { x: 2000, y: 300, radius: 90, speed: 0.35 },
    { x: 2500, y: 200, radius: 65, speed: -0.3 },
    { x: 3000, y: 350, radius: 85, speed: 0.25 },
  ],
}

export const level2: LevelData = {
  id: 2,
  name: '蒸汽熔炉',
  worldWidth: 4200,
  worldHeight: 720,
  playerStart: { x: 80, y: 500 },
  platforms: [
    createPlatform('p2_floor1', 0, 620, 500, 100),
    createPlatform('p2_a', 200, 520, 100, 20),
    createPlatform('p2_b', 400, 440, 80, 20, 'light-left'),
    createPlatform('p2_b2', 400, 440, 80, 20, 'light-right'),
    createPlatform('p2_c', 600, 360, 100, 20),
    createPlatform('p2_d', 800, 440, 120, 20),
    createPlatform('p2_e', 1000, 520, 150, 20),
    createPlatform('p2_f', 1200, 440, 80, 20, 'light-left'),
    createPlatform('p2_f2', 1200, 440, 80, 20, 'light-right'),
    createPlatform('p2_g', 1400, 360, 100, 20),
    createPlatform('p2_h', 1600, 280, 80, 20),
    createPlatform('p2_i', 1800, 360, 120, 20),
    createPlatform('p2_j', 2000, 440, 100, 20, 'light-left'),
    createPlatform('p2_j2', 2000, 440, 100, 20, 'light-right'),
    createPlatform('p2_k', 2200, 360, 80, 20),
    createPlatform('p2_l', 2400, 440, 150, 20),
    createPlatform('p2_m', 2600, 520, 200, 20),
    createPlatform('p2_n', 2900, 440, 100, 20, 'light-left'),
    createPlatform('p2_n2', 2900, 440, 100, 20, 'light-right'),
    createPlatform('p2_o', 3100, 360, 80, 20),
    createPlatform('p2_floor2', 3300, 620, 700, 100),
    createPlatform('p2_boss_a', 3400, 500, 100, 20),
    createPlatform('p2_boss_b', 3650, 420, 100, 20),
    createPlatform('p2_boss_c', 3550, 300, 80, 20),
  ],
  gears: [
    createGear('g2_1', 500, 330, 50, 1.8),
    createGear('g2_2', 900, 350, 60, 1.5, false),
    createGear('g2_3', 1300, 350, 45, 2.2),
    createGear('g2_4', 1700, 230, 40, 2.5, false),
    createGear('g2_5', 2300, 310, 55, 1.6),
    createGear('g2_6', 3000, 310, 45, 2.0, false),
    createGear('g2_7', 3600, 350, 50, 1.8),
  ],
  steamVents: [
    createSteamVent('sv2_1', 350, 620, 'up', 2.5, 3.5, 45),
    createSteamVent('sv2_2', 700, 440, 'up', 2, 4, 35),
    createSteamVent('sv2_3', 1050, 520, 'right', 1.8, 4.5, 30),
    createSteamVent('sv2_4', 1500, 360, 'up', 3, 3, 40),
    createSteamVent('sv2_5', 1900, 440, 'left', 2, 4, 35),
    createSteamVent('sv2_6', 2500, 620, 'up', 2.5, 3.5, 45),
    createSteamVent('sv2_7', 3200, 620, 'up', 2, 4, 40),
  ],
  lightMechanisms: [
    createLightMechanism('lm2_1', 450, 410, ['p2_b', 'p2_b2']),
    createLightMechanism('lm2_2', 1250, 410, ['p2_f', 'p2_f2']),
    createLightMechanism('lm2_3', 2050, 410, ['p2_j', 'p2_j2']),
    createLightMechanism('lm2_4', 2950, 410, ['p2_n', 'p2_n2']),
  ],
  energyCores: [
    createEnergyCore('ec2_1', 250, 490),
    createEnergyCore('ec2_2', 640, 330),
    createEnergyCore('ec2_3', 850, 410),
    createEnergyCore('ec2_4', 1250, 410),
    createEnergyCore('ec2_5', 1640, 250),
    createEnergyCore('ec2_6', 1850, 330),
    createEnergyCore('ec2_7', 2240, 330),
    createEnergyCore('ec2_8', 2950, 410),
  ],
  boss: createBoss('boss2', 3700, 548, 150),
  door: { x: 3850, y: 560, width: 40, height: 60, locked: true, levelExit: true },
  backgroundGears: [
    { x: 300, y: 280, radius: 90, speed: 0.3 },
    { x: 700, y: 180, radius: 65, speed: -0.5 },
    { x: 1100, y: 300, radius: 100, speed: 0.25 },
    { x: 1600, y: 200, radius: 75, speed: -0.35 },
    { x: 2100, y: 280, radius: 85, speed: 0.4 },
    { x: 2600, y: 180, radius: 60, speed: -0.45 },
    { x: 3100, y: 300, radius: 95, speed: 0.3 },
    { x: 3600, y: 200, radius: 70, speed: -0.25 },
  ],
}

export const levels: LevelData[] = [level1, level2]
