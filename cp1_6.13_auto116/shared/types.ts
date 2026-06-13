export interface Layer {
  id: string;
  name: string;
  age: string;
  lithology: string;
  description: string;
  thickness: number;
  color: string;
  fossils: string[];
  position: number;
  eraIndex: number;
}

export interface Marker {
  _id?: string;
  id: string;
  position: { x: number; y: number; z: number };
  label: string;
  layerId: string;
  createdAt: string;
}

export interface FossilData {
  id: string;
  type: 'ammonite' | 'trilobite';
  position: { x: number; y: number; z: number };
  layerId: string;
}

export interface RippleEffect {
  id: string;
  position: { x: number; y: number; z: number };
  layerId: string;
}

export const LITHOLOGY_COLORS: Record<string, string> = {
  sandstone: '#d4a373',
  shale: '#6b705c',
  limestone: '#a8dadc',
  mudstone: '#cb997e',
  granite: '#b5838d',
};

export const LITHOLOGY_NAMES: Record<string, string> = {
  sandstone: '砂岩',
  shale: '页岩',
  limestone: '石灰岩',
  mudstone: '泥岩',
  granite: '花岗岩',
};

export const ERAS = [
  { name: '寒武纪', era: '古生代' },
  { name: '奥陶纪', era: '古生代' },
  { name: '志留纪', era: '古生代' },
  { name: '泥盆纪', era: '古生代' },
  { name: '石炭纪', era: '古生代' },
  { name: '二叠纪', era: '古生代' },
  { name: '三叠纪', era: '中生代' },
  { name: '侏罗纪', era: '中生代' },
  { name: '白垩纪', era: '中生代' },
  { name: '白垩纪晚期', era: '中生代' },
  { name: '古近纪', era: '新生代' },
  { name: '新近纪', era: '新生代' },
  { name: '第四纪', era: '新生代' },
];

export const FOSSIL_TYPES = [
  '菊石化石',
  '箭石碎片',
  '三叶虫化石',
  '腕足类化石',
  '珊瑚化石',
  '海绵化石',
  '鱼化石',
  '植物叶片化石',
  '贝壳化石',
  '海百合茎',
];

export const LITHOLOGY_DESCRIPTIONS: Record<string, string[]> = {
  sandstone: [
    '细粒砂岩，富含铁质结核',
    '中粒石英砂岩，交错层理发育',
    '粗粒砂岩，含砾石透镜体',
    '长石砂岩，具粒序层理',
  ],
  shale: [
    '黑色页岩，富含笔石化石',
    '灰色页岩，水平层理发育',
    '碳质页岩，植物化石丰富',
    '油页岩，有机质含量高',
  ],
  limestone: [
    '生物碎屑灰岩，含大量腕足类',
    '鲕粒灰岩，具粒序结构',
    '微晶灰岩，质地纯净',
    '礁灰岩，珊瑚化石富集',
  ],
  mudstone: [
    '紫红色泥岩，干裂构造发育',
    '灰绿色泥岩，含黄铁矿结核',
    '钙质泥岩，化石保存完整',
    '粉砂质泥岩，具波状层理',
  ],
  granite: [
    '中粒花岗岩，斑状结构',
    '片麻状花岗岩，具定向构造',
    '黑云母花岗岩，暗色矿物较多',
    '钾长花岗岩，肉红色',
  ],
};
