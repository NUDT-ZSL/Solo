export interface Star {
  ra: number;
  dec: number;
  magnitude: number;
  spectralType: string;
  name: string;
  distance: number;
}

const ORION_NEBULA_STARS: Star[] = [
  { ra: 5.5850, dec: -0.0543, magnitude: 1.70, spectralType: 'B', name: '参宿四 Alnitak', distance: 1260 },
  { ra: 5.6036, dec: -0.0665, magnitude: 1.77, spectralType: 'O', name: '参宿二 Alnilam', distance: 2000 },
  { ra: 5.6793, dec: -0.0998, magnitude: 2.23, spectralType: 'B', name: '参宿一 Mintaka', distance: 1200 },
  { ra: 5.5334, dec: -0.2329, magnitude: 0.50, spectralType: 'M', name: '参宿七 Betelgeuse', distance: 700 },
  { ra: 5.2423, dec: -0.1370, magnitude: 0.13, spectralType: 'B', name: '参宿五 Bellatrix', distance: 250 },
  { ra: 5.4122, dec: -0.2987, magnitude: 3.30, spectralType: 'O', name: '猎户座θ1C', distance: 1500 },
  { ra: 5.3944, dec: -0.2949, magnitude: 5.40, spectralType: 'B', name: '猎户座θ1A', distance: 1500 },
  { ra: 5.3874, dec: -0.3029, magnitude: 6.70, spectralType: 'A', name: '猎户座θ2A', distance: 1500 },
  { ra: 5.4678, dec: -0.2325, magnitude: 2.77, spectralType: 'B', name: '参宿六 Saiph', distance: 650 },
  { ra: 5.0820, dec: -0.1743, magnitude: 3.49, spectralType: 'B', name: '参宿三 Meissa', distance: 1100 }
];

const ANDROMEDA_STARS: Star[] = [
  { ra: 0.1397, dec: 0.5185, magnitude: 2.06, spectralType: 'K', name: '壁宿二 Alpheratz', distance: 97 },
  { ra: 0.1989, dec: 0.5810, magnitude: 3.27, spectralType: 'B', name: '奎宿九 Mirach', distance: 197 },
  { ra: 0.0183, dec: 0.5087, magnitude: 2.49, spectralType: 'A', name: '奎宿八 Almach', distance: 350 },
  { ra: 0.0975, dec: 0.3515, magnitude: 4.09, spectralType: 'K', name: '奎宿七', distance: 340 },
  { ra: 0.2188, dec: 0.4950, magnitude: 4.95, spectralType: 'G', name: '奎宿六', distance: 420 },
  { ra: 0.1314, dec: 0.7380, magnitude: 5.22, spectralType: 'F', name: '奎宿五', distance: 300 },
  { ra: 0.0782, dec: 0.4035, magnitude: 5.45, spectralType: 'B', name: '仙女座κ', distance: 260 },
  { ra: 0.1515, dec: 0.6633, magnitude: 4.34, spectralType: 'A', name: '仙女座ι', distance: 520 },
  { ra: 0.2847, dec: 0.6558, magnitude: 5.01, spectralType: 'M', name: '仙女座51', distance: 280 },
  { ra: 0.0507, dec: 0.5851, magnitude: 5.62, spectralType: 'F', name: '仙女座7', distance: 310 },
  { ra: 0.1093, dec: 0.5948, magnitude: 4.08, spectralType: 'B', name: '仙女座δ', distance: 100 },
  { ra: 0.1756, dec: 0.4216, magnitude: 5.16, spectralType: 'G', name: '仙女座λ', distance: 430 }
];

const ROSE_NEBULA_STARS: Star[] = [
  { ra: 6.5220, dec: 0.0829, magnitude: 5.30, spectralType: 'O', name: 'NGC 2244-W1', distance: 5200 },
  { ra: 6.5210, dec: 0.0825, magnitude: 5.60, spectralType: 'O', name: 'NGC 2244-W2', distance: 5200 },
  { ra: 6.5199, dec: 0.0820, magnitude: 6.10, spectralType: 'O', name: 'NGC 2244-W3', distance: 5200 },
  { ra: 6.5235, dec: 0.0835, magnitude: 6.50, spectralType: 'B', name: 'NGC 2244-W4', distance: 5200 },
  { ra: 6.5180, dec: 0.0815, magnitude: 6.90, spectralType: 'B', name: 'NGC 2244-S1', distance: 5200 },
  { ra: 6.5250, dec: 0.0840, magnitude: 7.20, spectralType: 'B', name: 'NGC 2244-S2', distance: 5200 },
  { ra: 6.5205, dec: 0.0800, magnitude: 7.50, spectralType: 'A', name: '玫瑰星团-A1', distance: 5200 },
  { ra: 6.5228, dec: 0.0852, magnitude: 7.80, spectralType: 'A', name: '玫瑰星团-A2', distance: 5200 }
];

export const PRESETS: Record<string, { name: string; stars: Star[] }> = {
  orion: { name: '猎户座大星云', stars: ORION_NEBULA_STARS },
  andromeda: { name: '仙女座星系', stars: ANDROMEDA_STARS },
  rose: { name: '玫瑰星云', stars: ROSE_NEBULA_STARS }
};

export function parseStarData(json: string): Star[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('星图数据格式错误：根节点应为数组');
    }
    return parsed.map((raw, idx) => {
      const s = raw as Partial<Star>;
      if (typeof s.ra !== 'number' || typeof s.dec !== 'number') {
        throw new Error(`第 ${idx} 颗恒星缺少赤经(ra)或赤纬(dec)数据`);
      }
      return {
        ra: s.ra,
        dec: s.dec,
        magnitude: typeof s.magnitude === 'number' ? s.magnitude : 5.0,
        spectralType: typeof s.spectralType === 'string' ? s.spectralType : 'G',
        name: typeof s.name === 'string' ? s.name : `Star-${idx + 1}`,
        distance: typeof s.distance === 'number' ? s.distance : 0
      };
    });
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error('JSON解析失败');
  }
}

export function getPresetStars(key: string): Star[] {
  const preset = PRESETS[key];
  if (!preset) return ORION_NEBULA_STARS;
  return preset.stars;
}

export function getPresetList(): Array<{ key: string; name: string }> {
  return Object.entries(PRESETS).map(([key, v]) => ({ key, name: v.name }));
}
