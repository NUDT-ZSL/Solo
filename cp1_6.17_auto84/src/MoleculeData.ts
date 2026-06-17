export interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  atom1Index: number;
  atom2Index: number;
  order: number;
}

export interface Molecule {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface ElementInfo {
  symbol: string;
  name: string;
  nameEn: string;
  atomicNumber: number;
  color: string;
  vdwRadius: number;
  covalentRadius: number;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

const ELEMENT_DATA: Record<string, ElementInfo> = {
  H: { symbol: 'H', name: '氢', nameEn: 'Hydrogen', atomicNumber: 1, color: '#FFFFFF', vdwRadius: 1.20, covalentRadius: 0.31, metalness: 0.0, roughness: 0.8, clearcoat: 0.2, clearcoatRoughness: 0.4 },
  C: { symbol: 'C', name: '碳', nameEn: 'Carbon', atomicNumber: 6, color: '#505050', vdwRadius: 1.70, covalentRadius: 0.77, metalness: 0.6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 },
  N: { symbol: 'N', name: '氮', nameEn: 'Nitrogen', atomicNumber: 7, color: '#3050F8', vdwRadius: 1.55, covalentRadius: 0.75, metalness: 0.2, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  O: { symbol: 'O', name: '氧', nameEn: 'Oxygen', atomicNumber: 8, color: '#FF2D2D', vdwRadius: 1.52, covalentRadius: 0.73, metalness: 0.15, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 },
};

export function getElementInfo(element: string): ElementInfo {
  return ELEMENT_DATA[element] || { symbol: element, name: element, nameEn: element, atomicNumber: 0, color: '#FF00FF', vdwRadius: 1.5, covalentRadius: 0.7, metalness: 0.3, roughness: 0.5 };
}

const MOLECULES: Record<string, Molecule> = {
  H2O: {
    name: '水',
    formula: 'H₂O',
    atoms: [
      { element: 'O', x: 0, y: 0, z: 0 },
      { element: 'H', x: 0.7572, y: 0.5858, z: 0 },
      { element: 'H', x: -0.7572, y: 0.5858, z: 0 },
    ],
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 1 },
      { atom1Index: 0, atom2Index: 2, order: 1 },
    ],
  },
  CO2: {
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      { element: 'C', x: 0, y: 0, z: 0 },
      { element: 'O', x: 1.16, y: 0, z: 0 },
      { element: 'O', x: -1.16, y: 0, z: 0 },
    ],
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 2 },
      { atom1Index: 0, atom2Index: 2, order: 2 },
    ],
  },
  CH4: {
    name: '甲烷',
    formula: 'CH₄',
    atoms: (() => {
      const d = 1.09;
      const cos1095 = Math.cos(Math.PI - 109.5 * Math.PI / 180);
      const sin1095 = Math.sin(Math.PI - 109.5 * Math.PI / 180);
      return [
        { element: 'C', x: 0, y: 0, z: 0 },
        { element: 'H', x: d, y: 0, z: 0 },
        { element: 'H', x: d * cos1095, y: d * sin1095 * Math.cos(0), z: d * sin1095 * Math.sin(0) },
        { element: 'H', x: d * cos1095, y: d * sin1095 * Math.cos(2 * Math.PI / 3), z: d * sin1095 * Math.sin(2 * Math.PI / 3) },
        { element: 'H', x: d * cos1095, y: d * sin1095 * Math.cos(4 * Math.PI / 3), z: d * sin1095 * Math.sin(4 * Math.PI / 3) },
      ];
    })(),
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 1 },
      { atom1Index: 0, atom2Index: 2, order: 1 },
      { atom1Index: 0, atom2Index: 3, order: 1 },
      { atom1Index: 0, atom2Index: 4, order: 1 },
    ],
  },
  C6H6: {
    name: '苯',
    formula: 'C₆H₆',
    atoms: (() => {
      const cc = 1.40;
      const ch = 1.09;
      const atoms: Atom[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        atoms.push({ element: 'C', x: cc * Math.cos(angle), y: cc * Math.sin(angle), z: 0 });
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        const r = cc + ch;
        atoms.push({ element: 'H', x: r * Math.cos(angle), y: r * Math.sin(angle), z: 0 });
      }
      return atoms;
    })(),
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 2 },
      { atom1Index: 1, atom2Index: 2, order: 1 },
      { atom1Index: 2, atom2Index: 3, order: 2 },
      { atom1Index: 3, atom2Index: 4, order: 1 },
      { atom1Index: 4, atom2Index: 5, order: 2 },
      { atom1Index: 5, atom2Index: 0, order: 1 },
      { atom1Index: 0, atom2Index: 6, order: 1 },
      { atom1Index: 1, atom2Index: 7, order: 1 },
      { atom1Index: 2, atom2Index: 8, order: 1 },
      { atom1Index: 3, atom2Index: 9, order: 1 },
      { atom1Index: 4, atom2Index: 10, order: 1 },
      { atom1Index: 5, atom2Index: 11, order: 1 },
    ],
  },
};

export function getMolecule(name: string): Molecule | undefined {
  return MOLECULES[name];
}

export function getMoleculeNames(): string[] {
  return Object.keys(MOLECULES);
}

export type DisplayMode = 'ballStick' | 'spaceFill' | 'wireframe';
