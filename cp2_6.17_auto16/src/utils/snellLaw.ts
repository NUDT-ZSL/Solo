import {
  RefractionAngles,
  Vector3,
  WATER_REFRACTIVE_INDEX,
  AIR_REFRACTIVE_INDEX,
  ABBE_NUMBER_WATER,
  CRITICAL_ANGLE_DEG,
  SPECTRUM_COLORS
} from '../types/physicsTypes';

const degToRad = (deg: number): number => (deg * Math.PI) / 180;
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const calculateCriticalAngle = (
  n1: number = AIR_REFRACTIVE_INDEX,
  n2: number = WATER_REFRACTIVE_INDEX
): number => {
  if (n1 >= n2) {
    return Math.asin(n2 / n1) * (180 / Math.PI);
  }
  return Math.asin(n1 / n2) * (180 / Math.PI);
};

export const calculateRefraction = (
  incidentAngleDeg: number,
  n1: number = AIR_REFRACTIVE_INDEX,
  n2: number = WATER_REFRACTIVE_INDEX
): RefractionAngles => {
  const incidentAngle = incidentAngleDeg;
  const criticalAngle = calculateCriticalAngle(n1, n2);
  const isTotalReflection = incidentAngle >= criticalAngle;

  if (isTotalReflection) {
    return {
      incidentAngle,
      refractedAngle: 90,
      criticalAngle,
      isTotalReflection: true
    };
  }

  const theta1 = degToRad(incidentAngle);
  const sinTheta2 = (n1 * Math.sin(theta1)) / n2;
  const theta2 = Math.asin(Math.min(sinTheta2, 1));
  const refractedAngle = radToDeg(theta2);

  return {
    incidentAngle,
    refractedAngle,
    criticalAngle,
    isTotalReflection: false
  };
};

export const calculateReflectivity = (
  incidentAngleDeg: number,
  n1: number = AIR_REFRACTIVE_INDEX,
  n2: number = WATER_REFRACTIVE_INDEX
): number => {
  const theta1 = degToRad(incidentAngleDeg);
  const theta2Rad = Math.asin((n1 * Math.sin(theta1)) / n2);

  if (isNaN(theta2Rad)) {
    return 1.0;
  }

  const cosTheta1 = Math.cos(theta1);
  const cosTheta2 = Math.cos(theta2Rad);

  const rs = Math.pow((n1 * cosTheta1 - n2 * cosTheta2) / (n1 * cosTheta1 + n2 * cosTheta2), 2);
  const rp = Math.pow((n2 * cosTheta1 - n1 * cosTheta2) / (n2 * cosTheta1 + n1 * cosTheta2), 2);

  return (rs + rp) / 2;
};

export const calculateDispersionOffset = (
  wavelength: number,
  baseRefractiveIndex: number = WATER_REFRACTIVE_INDEX,
  abbeNumber: number = ABBE_NUMBER_WATER
): number => {
  const referenceWavelength = 589.3;
  const deltaWavelength = wavelength - referenceWavelength;
  const maxWavelengthDelta = 300;
  const dispersionFactor = deltaWavelength / maxWavelengthDelta;
  const indexDelta = dispersionFactor * (baseRefractiveIndex - 1) / abbeNumber;

  return indexDelta;
};

export const calculateDispersionAngleOffset = (
  incidentAngleDeg: number,
  wavelength: number
): number => {
  const baseResult = calculateRefraction(incidentAngleDeg);
  if (baseResult.isTotalReflection) {
    return 0;
  }

  const nBase = WATER_REFRACTIVE_INDEX;
  const nDispersed = nBase + calculateDispersionOffset(wavelength);

  const theta1 = degToRad(incidentAngleDeg);
  const sinTheta2Base = Math.sin(theta1) / nBase;
  const sinTheta2Dispersed = Math.sin(theta1) / nDispersed;

  const theta2Base = Math.asin(Math.min(sinTheta2Base, 1));
  const theta2Dispersed = Math.asin(Math.min(sinTheta2Dispersed, 1));

  return radToDeg(theta2Dispersed - theta2Base);
};

export const calculateDispersedRayDirections = (
  incidentAngleDeg: number
): Array<{ wavelength: number; color: string; angleOffset: number; direction: Vector3 }> => {
  const baseResult = calculateRefraction(incidentAngleDeg);

  return SPECTRUM_COLORS.map((spectrum, index) => {
    const angleOffset = calculateDispersionAngleOffset(incidentAngleDeg, spectrum.wavelength);
    const refractedAngleRad = degToRad(baseResult.refractedAngle + angleOffset);

    const spacing = 0.02;
    const lateralOffset = (index - (SPECTRUM_COLORS.length - 1) / 2) * spacing;

    return {
      wavelength: spectrum.wavelength,
      color: spectrum.hex,
      angleOffset,
      direction: {
        x: Math.sin(refractedAngleRad) + lateralOffset * 0.1,
        y: -Math.cos(refractedAngleRad),
        z: 0
      }
    };
  });
};

export const runTests = (): void => {
  console.log('=== 斯涅尔定律计算测试 ===\n');

  const testCases1 = [0, 30, 45, 48.75, 60];
  console.log('测试1: 不同入射角的折射计算');
  testCases1.forEach((angle) => {
    const result = calculateRefraction(angle);
    console.log(`  入射角 ${angle}° → 折射角 ${result.refractedAngle.toFixed(2)}°, 临界角 ${result.criticalAngle.toFixed(2)}°, 全反射: ${result.isTotalReflection}`);
  });

  console.log('\n测试2: 临界角验证');
  const critical = calculateCriticalAngle(AIR_REFRACTIVE_INDEX, WATER_REFRACTIVE_INDEX);
  console.log(`  空气→水 临界角: ${critical.toFixed(4)}° (预期约 48.75°)`);
  console.log(`  误差: ${Math.abs(critical - CRITICAL_ANGLE_DEG).toFixed(4)}°`);

  console.log('\n测试3: 全反射判断');
  console.log(`  入射角 45° → 全反射? ${calculateRefraction(45).isTotalReflection} (预期 false)`);
  console.log(`  入射角 50° → 全反射? ${calculateRefraction(50).isTotalReflection} (预期 true)`);
  console.log(`  入射角 48.75° → 全反射? ${calculateRefraction(48.75).isTotalReflection} (预期 true)`);

  console.log('\n测试4: 反射率计算 (菲涅尔方程)');
  const reflectivityTest = [0, 30, 45, 48];
  reflectivityTest.forEach((angle) => {
    const reflectivity = calculateReflectivity(angle);
    console.log(`  入射角 ${angle}° → 反射率: ${(reflectivity * 100).toFixed(2)}%`);
  });

  console.log('\n测试5: 色散偏移计算 (阿贝数 55.8)');
  SPECTRUM_COLORS.forEach((color) => {
    const offset = calculateDispersionOffset(color.wavelength);
    const angleOffset = calculateDispersionAngleOffset(30, color.wavelength);
    console.log(`  ${color.name.padEnd(6)} (${color.wavelength}nm) → 折射率偏移: ${offset.toFixed(6)}, 角度偏移: ${angleOffset.toFixed(4)}°`);
  });

  console.log('\n测试6: 色散方向向量 (入射角 45°)');
  const directions = calculateDispersedRayDirections(45);
  directions.forEach((dir) => {
    console.log(`  ${dir.wavelength}nm → 方向: (${dir.direction.x.toFixed(4)}, ${dir.direction.y.toFixed(4)})`);
  });

  console.log('\n=== 所有测试完成 ===');
};

if (typeof process !== 'undefined' && process.argv && process.argv.includes('--test')) {
  runTests();
}
