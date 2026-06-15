export interface Element {
  symbol: string;
  name: string;
  atomicNumber: number;
  weight: number;
  category: ElementCategory;
  electronShells: number[];
  period: number;
  group: number;
  row: number;
  col: number;
  isLanthanide?: boolean;
  isActinide?: boolean;
}

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth-metal': '#ffa94d',
  'transition-metal': '#ffd43b',
  'post-transition-metal': '#69db7c',
  'metalloid': '#38d9a9',
  'nonmetal': '#66cc99',
  'halogen': '#4dabf7',
  'noble-gas': '#9999ff',
  'lanthanide': '#ff8cc6',
  'actinide': '#da77f2',
};

export const CATEGORY_GLOW: Record<ElementCategory, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth-metal': '#ffa94d',
  'transition-metal': '#ffd54f',
  'post-transition-metal': '#69db7c',
  'metalloid': '#38d9a9',
  'nonmetal': '#81c784',
  'halogen': '#4dabf7',
  'noble-gas': '#9999ff',
  'lanthanide': '#ff8cc6',
  'actinide': '#da77f2',
};

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'alkali-metal': '碱金属',
  'alkaline-earth-metal': '碱土金属',
  'transition-metal': '过渡金属',
  'post-transition-metal': '贫金属',
  'metalloid': '准金属',
  'nonmetal': '非金属',
  'halogen': '卤素',
  'noble-gas': '稀有气体',
  'lanthanide': '镧系元素',
  'actinide': '锕系元素',
};

const rawElements: Omit<Element, 'row' | 'col'>[] = [
  { symbol: 'H', name: '氢', atomicNumber: 1, weight: 1.008, category: 'nonmetal', electronShells: [1], period: 1, group: 1 },
  { symbol: 'He', name: '氦', atomicNumber: 2, weight: 4.003, category: 'noble-gas', electronShells: [2], period: 1, group: 18 },
  { symbol: 'Li', name: '锂', atomicNumber: 3, weight: 6.941, category: 'alkali-metal', electronShells: [2, 1], period: 2, group: 1 },
  { symbol: 'Be', name: '铍', atomicNumber: 4, weight: 9.012, category: 'alkaline-earth-metal', electronShells: [2, 2], period: 2, group: 2 },
  { symbol: 'B', name: '硼', atomicNumber: 5, weight: 10.81, category: 'metalloid', electronShells: [2, 3], period: 2, group: 13 },
  { symbol: 'C', name: '碳', atomicNumber: 6, weight: 12.01, category: 'nonmetal', electronShells: [2, 4], period: 2, group: 14 },
  { symbol: 'N', name: '氮', atomicNumber: 7, weight: 14.01, category: 'nonmetal', electronShells: [2, 5], period: 2, group: 15 },
  { symbol: 'O', name: '氧', atomicNumber: 8, weight: 16.00, category: 'nonmetal', electronShells: [2, 6], period: 2, group: 16 },
  { symbol: 'F', name: '氟', atomicNumber: 9, weight: 19.00, category: 'halogen', electronShells: [2, 7], period: 2, group: 17 },
  { symbol: 'Ne', name: '氖', atomicNumber: 10, weight: 20.18, category: 'noble-gas', electronShells: [2, 8], period: 2, group: 18 },
  { symbol: 'Na', name: '钠', atomicNumber: 11, weight: 22.99, category: 'alkali-metal', electronShells: [2, 8, 1], period: 3, group: 1 },
  { symbol: 'Mg', name: '镁', atomicNumber: 12, weight: 24.31, category: 'alkaline-earth-metal', electronShells: [2, 8, 2], period: 3, group: 2 },
  { symbol: 'Al', name: '铝', atomicNumber: 13, weight: 26.98, category: 'post-transition-metal', electronShells: [2, 8, 3], period: 3, group: 13 },
  { symbol: 'Si', name: '硅', atomicNumber: 14, weight: 28.09, category: 'metalloid', electronShells: [2, 8, 4], period: 3, group: 14 },
  { symbol: 'P', name: '磷', atomicNumber: 15, weight: 30.97, category: 'nonmetal', electronShells: [2, 8, 5], period: 3, group: 15 },
  { symbol: 'S', name: '硫', atomicNumber: 16, weight: 32.07, category: 'nonmetal', electronShells: [2, 8, 6], period: 3, group: 16 },
  { symbol: 'Cl', name: '氯', atomicNumber: 17, weight: 35.45, category: 'halogen', electronShells: [2, 8, 7], period: 3, group: 17 },
  { symbol: 'Ar', name: '氩', atomicNumber: 18, weight: 39.95, category: 'noble-gas', electronShells: [2, 8, 8], period: 3, group: 18 },
  { symbol: 'K', name: '钾', atomicNumber: 19, weight: 39.10, category: 'alkali-metal', electronShells: [2, 8, 8, 1], period: 4, group: 1 },
  { symbol: 'Ca', name: '钙', atomicNumber: 20, weight: 40.08, category: 'alkaline-earth-metal', electronShells: [2, 8, 8, 2], period: 4, group: 2 },
  { symbol: 'Sc', name: '钪', atomicNumber: 21, weight: 44.96, category: 'transition-metal', electronShells: [2, 8, 9, 2], period: 4, group: 3 },
  { symbol: 'Ti', name: '钛', atomicNumber: 22, weight: 47.87, category: 'transition-metal', electronShells: [2, 8, 10, 2], period: 4, group: 4 },
  { symbol: 'V', name: '钒', atomicNumber: 23, weight: 50.94, category: 'transition-metal', electronShells: [2, 8, 11, 2], period: 4, group: 5 },
  { symbol: 'Cr', name: '铬', atomicNumber: 24, weight: 52.00, category: 'transition-metal', electronShells: [2, 8, 13, 1], period: 4, group: 6 },
  { symbol: 'Mn', name: '锰', atomicNumber: 25, weight: 54.94, category: 'transition-metal', electronShells: [2, 8, 13, 2], period: 4, group: 7 },
  { symbol: 'Fe', name: '铁', atomicNumber: 26, weight: 55.85, category: 'transition-metal', electronShells: [2, 8, 14, 2], period: 4, group: 8 },
  { symbol: 'Co', name: '钴', atomicNumber: 27, weight: 58.93, category: 'transition-metal', electronShells: [2, 8, 15, 2], period: 4, group: 9 },
  { symbol: 'Ni', name: '镍', atomicNumber: 28, weight: 58.69, category: 'transition-metal', electronShells: [2, 8, 16, 2], period: 4, group: 10 },
  { symbol: 'Cu', name: '铜', atomicNumber: 29, weight: 63.55, category: 'transition-metal', electronShells: [2, 8, 18, 1], period: 4, group: 11 },
  { symbol: 'Zn', name: '锌', atomicNumber: 30, weight: 65.38, category: 'transition-metal', electronShells: [2, 8, 18, 2], period: 4, group: 12 },
  { symbol: 'Ga', name: '镓', atomicNumber: 31, weight: 69.72, category: 'post-transition-metal', electronShells: [2, 8, 18, 3], period: 4, group: 13 },
  { symbol: 'Ge', name: '锗', atomicNumber: 32, weight: 72.63, category: 'metalloid', electronShells: [2, 8, 18, 4], period: 4, group: 14 },
  { symbol: 'As', name: '砷', atomicNumber: 33, weight: 74.92, category: 'metalloid', electronShells: [2, 8, 18, 5], period: 4, group: 15 },
  { symbol: 'Se', name: '硒', atomicNumber: 34, weight: 78.97, category: 'nonmetal', electronShells: [2, 8, 18, 6], period: 4, group: 16 },
  { symbol: 'Br', name: '溴', atomicNumber: 35, weight: 79.90, category: 'halogen', electronShells: [2, 8, 18, 7], period: 4, group: 17 },
  { symbol: 'Kr', name: '氪', atomicNumber: 36, weight: 83.80, category: 'noble-gas', electronShells: [2, 8, 18, 8], period: 4, group: 18 },
  { symbol: 'Rb', name: '铷', atomicNumber: 37, weight: 85.47, category: 'alkali-metal', electronShells: [2, 8, 18, 8, 1], period: 5, group: 1 },
  { symbol: 'Sr', name: '锶', atomicNumber: 38, weight: 87.62, category: 'alkaline-earth-metal', electronShells: [2, 8, 18, 8, 2], period: 5, group: 2 },
  { symbol: 'Y', name: '钇', atomicNumber: 39, weight: 88.91, category: 'transition-metal', electronShells: [2, 8, 18, 9, 2], period: 5, group: 3 },
  { symbol: 'Zr', name: '锆', atomicNumber: 40, weight: 91.22, category: 'transition-metal', electronShells: [2, 8, 18, 10, 2], period: 5, group: 4 },
  { symbol: 'Nb', name: '铌', atomicNumber: 41, weight: 92.91, category: 'transition-metal', electronShells: [2, 8, 18, 12, 1], period: 5, group: 5 },
  { symbol: 'Mo', name: '钼', atomicNumber: 42, weight: 95.95, category: 'transition-metal', electronShells: [2, 8, 18, 13, 1], period: 5, group: 6 },
  { symbol: 'Tc', name: '锝', atomicNumber: 43, weight: 98.00, category: 'transition-metal', electronShells: [2, 8, 18, 13, 2], period: 5, group: 7 },
  { symbol: 'Ru', name: '钌', atomicNumber: 44, weight: 101.1, category: 'transition-metal', electronShells: [2, 8, 18, 15, 1], period: 5, group: 8 },
  { symbol: 'Rh', name: '铑', atomicNumber: 45, weight: 102.9, category: 'transition-metal', electronShells: [2, 8, 18, 16, 1], period: 5, group: 9 },
  { symbol: 'Pd', name: '钯', atomicNumber: 46, weight: 106.4, category: 'transition-metal', electronShells: [2, 8, 18, 18], period: 5, group: 10 },
  { symbol: 'Ag', name: '银', atomicNumber: 47, weight: 107.9, category: 'transition-metal', electronShells: [2, 8, 18, 18, 1], period: 5, group: 11 },
  { symbol: 'Cd', name: '镉', atomicNumber: 48, weight: 112.4, category: 'transition-metal', electronShells: [2, 8, 18, 18, 2], period: 5, group: 12 },
  { symbol: 'In', name: '铟', atomicNumber: 49, weight: 114.8, category: 'post-transition-metal', electronShells: [2, 8, 18, 18, 3], period: 5, group: 13 },
  { symbol: 'Sn', name: '锡', atomicNumber: 50, weight: 118.7, category: 'post-transition-metal', electronShells: [2, 8, 18, 18, 4], period: 5, group: 14 },
  { symbol: 'Sb', name: '锑', atomicNumber: 51, weight: 121.8, category: 'metalloid', electronShells: [2, 8, 18, 18, 5], period: 5, group: 15 },
  { symbol: 'Te', name: '碲', atomicNumber: 52, weight: 127.6, category: 'metalloid', electronShells: [2, 8, 18, 18, 6], period: 5, group: 16 },
  { symbol: 'I', name: '碘', atomicNumber: 53, weight: 126.9, category: 'halogen', electronShells: [2, 8, 18, 18, 7], period: 5, group: 17 },
  { symbol: 'Xe', name: '氙', atomicNumber: 54, weight: 131.3, category: 'noble-gas', electronShells: [2, 8, 18, 18, 8], period: 5, group: 18 },
  { symbol: 'Cs', name: '铯', atomicNumber: 55, weight: 132.9, category: 'alkali-metal', electronShells: [2, 8, 18, 18, 8, 1], period: 6, group: 1 },
  { symbol: 'Ba', name: '钡', atomicNumber: 56, weight: 137.3, category: 'alkaline-earth-metal', electronShells: [2, 8, 18, 18, 8, 2], period: 6, group: 2 },
  { symbol: 'La', name: '镧', atomicNumber: 57, weight: 138.9, category: 'lanthanide', electronShells: [2, 8, 18, 18, 9, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Ce', name: '铈', atomicNumber: 58, weight: 140.1, category: 'lanthanide', electronShells: [2, 8, 18, 19, 9, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Pr', name: '镨', atomicNumber: 59, weight: 140.9, category: 'lanthanide', electronShells: [2, 8, 18, 21, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Nd', name: '钕', atomicNumber: 60, weight: 144.2, category: 'lanthanide', electronShells: [2, 8, 18, 22, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Pm', name: '钷', atomicNumber: 61, weight: 145.0, category: 'lanthanide', electronShells: [2, 8, 18, 23, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Sm', name: '钐', atomicNumber: 62, weight: 150.4, category: 'lanthanide', electronShells: [2, 8, 18, 24, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Eu', name: '铕', atomicNumber: 63, weight: 152.0, category: 'lanthanide', electronShells: [2, 8, 18, 25, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Gd', name: '钆', atomicNumber: 64, weight: 157.3, category: 'lanthanide', electronShells: [2, 8, 18, 25, 9, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Tb', name: '铽', atomicNumber: 65, weight: 158.9, category: 'lanthanide', electronShells: [2, 8, 18, 27, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Dy', name: '镝', atomicNumber: 66, weight: 162.5, category: 'lanthanide', electronShells: [2, 8, 18, 28, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Ho', name: '钬', atomicNumber: 67, weight: 164.9, category: 'lanthanide', electronShells: [2, 8, 18, 29, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Er', name: '铒', atomicNumber: 68, weight: 167.3, category: 'lanthanide', electronShells: [2, 8, 18, 30, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Tm', name: '铥', atomicNumber: 69, weight: 168.9, category: 'lanthanide', electronShells: [2, 8, 18, 31, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Yb', name: '镱', atomicNumber: 70, weight: 173.0, category: 'lanthanide', electronShells: [2, 8, 18, 32, 8, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Lu', name: '镥', atomicNumber: 71, weight: 175.0, category: 'lanthanide', electronShells: [2, 8, 18, 32, 9, 2], period: 6, group: 3, isLanthanide: true },
  { symbol: 'Hf', name: '铪', atomicNumber: 72, weight: 178.5, category: 'transition-metal', electronShells: [2, 8, 18, 32, 10, 2], period: 6, group: 4 },
  { symbol: 'Ta', name: '钽', atomicNumber: 73, weight: 180.9, category: 'transition-metal', electronShells: [2, 8, 18, 32, 11, 2], period: 6, group: 5 },
  { symbol: 'W', name: '钨', atomicNumber: 74, weight: 183.8, category: 'transition-metal', electronShells: [2, 8, 18, 32, 12, 2], period: 6, group: 6 },
  { symbol: 'Re', name: '铼', atomicNumber: 75, weight: 186.2, category: 'transition-metal', electronShells: [2, 8, 18, 32, 13, 2], period: 6, group: 7 },
  { symbol: 'Os', name: '锇', atomicNumber: 76, weight: 190.2, category: 'transition-metal', electronShells: [2, 8, 18, 32, 14, 2], period: 6, group: 8 },
  { symbol: 'Ir', name: '铱', atomicNumber: 77, weight: 192.2, category: 'transition-metal', electronShells: [2, 8, 18, 32, 15, 2], period: 6, group: 9 },
  { symbol: 'Pt', name: '铂', atomicNumber: 78, weight: 195.1, category: 'transition-metal', electronShells: [2, 8, 18, 32, 17, 1], period: 6, group: 10 },
  { symbol: 'Au', name: '金', atomicNumber: 79, weight: 197.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 18, 1], period: 6, group: 11 },
  { symbol: 'Hg', name: '汞', atomicNumber: 80, weight: 200.6, category: 'transition-metal', electronShells: [2, 8, 18, 32, 18, 2], period: 6, group: 12 },
  { symbol: 'Tl', name: '铊', atomicNumber: 81, weight: 204.4, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 18, 3], period: 6, group: 13 },
  { symbol: 'Pb', name: '铅', atomicNumber: 82, weight: 207.2, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 18, 4], period: 6, group: 14 },
  { symbol: 'Bi', name: '铋', atomicNumber: 83, weight: 209.0, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 18, 5], period: 6, group: 15 },
  { symbol: 'Po', name: '钋', atomicNumber: 84, weight: 209.0, category: 'metalloid', electronShells: [2, 8, 18, 32, 18, 6], period: 6, group: 16 },
  { symbol: 'At', name: '砹', atomicNumber: 85, weight: 210.0, category: 'halogen', electronShells: [2, 8, 18, 32, 18, 7], period: 6, group: 17 },
  { symbol: 'Rn', name: '氡', atomicNumber: 86, weight: 222.0, category: 'noble-gas', electronShells: [2, 8, 18, 32, 18, 8], period: 6, group: 18 },
  { symbol: 'Fr', name: '钫', atomicNumber: 87, weight: 223.0, category: 'alkali-metal', electronShells: [2, 8, 18, 32, 18, 8, 1], period: 7, group: 1 },
  { symbol: 'Ra', name: '镭', atomicNumber: 88, weight: 226.0, category: 'alkaline-earth-metal', electronShells: [2, 8, 18, 32, 18, 8, 2], period: 7, group: 2 },
  { symbol: 'Ac', name: '锕', atomicNumber: 89, weight: 227.0, category: 'actinide', electronShells: [2, 8, 18, 32, 18, 9, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Th', name: '钍', atomicNumber: 90, weight: 232.0, category: 'actinide', electronShells: [2, 8, 18, 32, 18, 10, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Pa', name: '镤', atomicNumber: 91, weight: 231.0, category: 'actinide', electronShells: [2, 8, 18, 32, 20, 9, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'U', name: '铀', atomicNumber: 92, weight: 238.0, category: 'actinide', electronShells: [2, 8, 18, 32, 21, 9, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Np', name: '镎', atomicNumber: 93, weight: 237.0, category: 'actinide', electronShells: [2, 8, 18, 32, 22, 9, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Pu', name: '钚', atomicNumber: 94, weight: 244.0, category: 'actinide', electronShells: [2, 8, 18, 32, 24, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Am', name: '镅', atomicNumber: 95, weight: 243.0, category: 'actinide', electronShells: [2, 8, 18, 32, 25, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Cm', name: '锔', atomicNumber: 96, weight: 247.0, category: 'actinide', electronShells: [2, 8, 18, 32, 25, 9, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Bk', name: '锫', atomicNumber: 97, weight: 247.0, category: 'actinide', electronShells: [2, 8, 18, 32, 27, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Cf', name: '锎', atomicNumber: 98, weight: 251.0, category: 'actinide', electronShells: [2, 8, 18, 32, 28, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Es', name: '锿', atomicNumber: 99, weight: 252.0, category: 'actinide', electronShells: [2, 8, 18, 32, 29, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Fm', name: '镄', atomicNumber: 100, weight: 257.0, category: 'actinide', electronShells: [2, 8, 18, 32, 30, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Md', name: '钔', atomicNumber: 101, weight: 258.0, category: 'actinide', electronShells: [2, 8, 18, 32, 31, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'No', name: '锘', atomicNumber: 102, weight: 259.0, category: 'actinide', electronShells: [2, 8, 18, 32, 32, 8, 2], period: 7, group: 3, isActinide: true },
  { symbol: 'Lr', name: '铹', atomicNumber: 103, weight: 266.0, category: 'actinide', electronShells: [2, 8, 18, 32, 32, 8, 3], period: 7, group: 3, isActinide: true },
  { symbol: 'Rf', name: '𬬻', atomicNumber: 104, weight: 267.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 10, 2], period: 7, group: 4 },
  { symbol: 'Db', name: '𬭊', atomicNumber: 105, weight: 268.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 11, 2], period: 7, group: 5 },
  { symbol: 'Sg', name: '𬭳', atomicNumber: 106, weight: 269.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 12, 2], period: 7, group: 6 },
  { symbol: 'Bh', name: '𬭛', atomicNumber: 107, weight: 270.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 13, 2], period: 7, group: 7 },
  { symbol: 'Hs', name: '𬭶', atomicNumber: 108, weight: 277.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 14, 2], period: 7, group: 8 },
  { symbol: 'Mt', name: '鿏', atomicNumber: 109, weight: 278.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 15, 2], period: 7, group: 9 },
  { symbol: 'Ds', name: '𫟼', atomicNumber: 110, weight: 281.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 16, 2], period: 7, group: 10 },
  { symbol: 'Rg', name: '𬬭', atomicNumber: 111, weight: 282.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 17, 2], period: 7, group: 11 },
  { symbol: 'Cn', name: '鿔', atomicNumber: 112, weight: 285.0, category: 'transition-metal', electronShells: [2, 8, 18, 32, 32, 18, 2], period: 7, group: 12 },
  { symbol: 'Nh', name: '鿭', atomicNumber: 113, weight: 286.0, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 32, 18, 3], period: 7, group: 13 },
  { symbol: 'Fl', name: '𫓧', atomicNumber: 114, weight: 289.0, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 32, 18, 4], period: 7, group: 14 },
  { symbol: 'Mc', name: '镆', atomicNumber: 115, weight: 290.0, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 32, 18, 5], period: 7, group: 15 },
  { symbol: 'Lv', name: '𫟷', atomicNumber: 116, weight: 293.0, category: 'post-transition-metal', electronShells: [2, 8, 18, 32, 32, 18, 6], period: 7, group: 16 },
  { symbol: 'Ts', name: '石田', atomicNumber: 117, weight: 294.0, category: 'halogen', electronShells: [2, 8, 18, 32, 32, 18, 7], period: 7, group: 17 },
  { symbol: 'Og', name: '气奥', atomicNumber: 118, weight: 294.0, category: 'noble-gas', electronShells: [2, 8, 18, 32, 32, 18, 8], period: 7, group: 18 },
];

function computeGridPosition(el: Omit<Element, 'row' | 'col'>): Element {
  let row: number;
  let col: number;

  if (el.isLanthanide) {
    row = 9;
    col = el.atomicNumber - 57 + 3;
  } else if (el.isActinide) {
    row = 10;
    col = el.atomicNumber - 89 + 3;
  } else {
    row = el.period;
    col = el.group;
  }

  return { ...el, row, col };
}

export const elements: Element[] = rawElements.map(computeGridPosition);

export const getElementByAtomicNumber = (n: number): Element | undefined =>
  elements.find((e) => e.atomicNumber === n);

export const lanthanides = elements.filter((e) => e.isLanthanide);
export const actinides = elements.filter((e) => e.isActinide);
export const mainTableElements = elements.filter((e) => !e.isLanthanide && !e.isActinide);
