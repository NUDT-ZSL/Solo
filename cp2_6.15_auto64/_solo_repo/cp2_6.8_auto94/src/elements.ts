import * as THREE from 'three';

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export interface ElementData {
  number: number;
  symbol: string;
  nameCN: string;
  nameEN: string;
  mass: number;
  electronConfig: string;
  valence: string;
  category: ElementCategory;
  period: number;
  group: number;
}

export const CATEGORY_COLORS: Record<ElementCategory, number> = {
  'alkali-metal': 0xff6b6b,
  'alkaline-earth': 0xffa94d,
  'transition-metal': 0x339af0,
  'post-transition': 0x748ffc,
  'metalloid': 0x63e6be,
  'nonmetal': 0x51cf66,
  'halogen': 0xffd43b,
  'noble-gas': 0xcc5de8,
  'lanthanide': 0xf783ac,
  'actinide': 0xe599f7,
};

export const CATEGORY_NAMES: Record<ElementCategory, string> = {
  'alkali-metal': '碱金属',
  'alkaline-earth': '碱土金属',
  'transition-metal': '过渡金属',
  'post-transition': '后过渡金属',
  'metalloid': '类金属',
  'nonmetal': '非金属',
  'halogen': '卤素',
  'noble-gas': '稀有气体',
  'lanthanide': '镧系',
  'actinide': '锕系',
};

export const FILTER_CATEGORIES: { key: ElementCategory | 'metal' | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'metal', label: '金属' },
  { key: 'nonmetal', label: '非金属' },
  { key: 'noble-gas', label: '稀有气体' },
  { key: 'alkali-metal', label: '碱金属' },
  { key: 'alkaline-earth', label: '碱土金属' },
  { key: 'transition-metal', label: '过渡金属' },
  { key: 'lanthanide', label: '镧系' },
  { key: 'actinide', label: '锕系' },
];

export const METAL_CATEGORIES: ElementCategory[] = [
  'alkali-metal',
  'alkaline-earth',
  'transition-metal',
  'post-transition',
  'lanthanide',
  'actinide',
];

export const ELEMENTS: ElementData[] = [
  { number: 1, symbol: 'H', nameCN: '氢', nameEN: 'Hydrogen', mass: 1.008, electronConfig: '1s¹', valence: '+1, -1', category: 'nonmetal', period: 1, group: 1 },
  { number: 2, symbol: 'He', nameCN: '氦', nameEN: 'Helium', mass: 4.003, electronConfig: '1s²', valence: '0', category: 'noble-gas', period: 1, group: 18 },
  { number: 3, symbol: 'Li', nameCN: '锂', nameEN: 'Lithium', mass: 6.941, electronConfig: '[He] 2s¹', valence: '+1', category: 'alkali-metal', period: 2, group: 1 },
  { number: 4, symbol: 'Be', nameCN: '铍', nameEN: 'Beryllium', mass: 9.012, electronConfig: '[He] 2s²', valence: '+2', category: 'alkaline-earth', period: 2, group: 2 },
  { number: 5, symbol: 'B', nameCN: '硼', nameEN: 'Boron', mass: 10.81, electronConfig: '[He] 2s² 2p¹', valence: '+3', category: 'metalloid', period: 2, group: 13 },
  { number: 6, symbol: 'C', nameCN: '碳', nameEN: 'Carbon', mass: 12.01, electronConfig: '[He] 2s² 2p²', valence: '+4, -4', category: 'nonmetal', period: 2, group: 14 },
  { number: 7, symbol: 'N', nameCN: '氮', nameEN: 'Nitrogen', mass: 14.01, electronConfig: '[He] 2s² 2p³', valence: '-3, +2, +3, +5', category: 'nonmetal', period: 2, group: 15 },
  { number: 8, symbol: 'O', nameCN: '氧', nameEN: 'Oxygen', mass: 16.00, electronConfig: '[He] 2s² 2p⁴', valence: '-2', category: 'nonmetal', period: 2, group: 16 },
  { number: 9, symbol: 'F', nameCN: '氟', nameEN: 'Fluorine', mass: 19.00, electronConfig: '[He] 2s² 2p⁵', valence: '-1', category: 'halogen', period: 2, group: 17 },
  { number: 10, symbol: 'Ne', nameCN: '氖', nameEN: 'Neon', mass: 20.18, electronConfig: '[He] 2s² 2p⁶', valence: '0', category: 'noble-gas', period: 2, group: 18 },
  { number: 11, symbol: 'Na', nameCN: '钠', nameEN: 'Sodium', mass: 22.99, electronConfig: '[Ne] 3s¹', valence: '+1', category: 'alkali-metal', period: 3, group: 1 },
  { number: 12, symbol: 'Mg', nameCN: '镁', nameEN: 'Magnesium', mass: 24.31, electronConfig: '[Ne] 3s²', valence: '+2', category: 'alkaline-earth', period: 3, group: 2 },
  { number: 13, symbol: 'Al', nameCN: '铝', nameEN: 'Aluminium', mass: 26.98, electronConfig: '[Ne] 3s² 3p¹', valence: '+3', category: 'post-transition', period: 3, group: 13 },
  { number: 14, symbol: 'Si', nameCN: '硅', nameEN: 'Silicon', mass: 28.09, electronConfig: '[Ne] 3s² 3p²', valence: '+4, -4', category: 'metalloid', period: 3, group: 14 },
  { number: 15, symbol: 'P', nameCN: '磷', nameEN: 'Phosphorus', mass: 30.97, electronConfig: '[Ne] 3s² 3p³', valence: '-3, +3, +5', category: 'nonmetal', period: 3, group: 15 },
  { number: 16, symbol: 'S', nameCN: '硫', nameEN: 'Sulfur', mass: 32.07, electronConfig: '[Ne] 3s² 3p⁴', valence: '-2, +4, +6', category: 'nonmetal', period: 3, group: 16 },
  { number: 17, symbol: 'Cl', nameCN: '氯', nameEN: 'Chlorine', mass: 35.45, electronConfig: '[Ne] 3s² 3p⁵', valence: '-1, +1, +5, +7', category: 'halogen', period: 3, group: 17 },
  { number: 18, symbol: 'Ar', nameCN: '氩', nameEN: 'Argon', mass: 39.95, electronConfig: '[Ne] 3s² 3p⁶', valence: '0', category: 'noble-gas', period: 3, group: 18 },
  { number: 19, symbol: 'K', nameCN: '钾', nameEN: 'Potassium', mass: 39.10, electronConfig: '[Ar] 4s¹', valence: '+1', category: 'alkali-metal', period: 4, group: 1 },
  { number: 20, symbol: 'Ca', nameCN: '钙', nameEN: 'Calcium', mass: 40.08, electronConfig: '[Ar] 4s²', valence: '+2', category: 'alkaline-earth', period: 4, group: 2 },
  { number: 21, symbol: 'Sc', nameCN: '钪', nameEN: 'Scandium', mass: 44.96, electronConfig: '[Ar] 3d¹ 4s²', valence: '+3', category: 'transition-metal', period: 4, group: 3 },
  { number: 22, symbol: 'Ti', nameCN: '钛', nameEN: 'Titanium', mass: 47.87, electronConfig: '[Ar] 3d² 4s²', valence: '+2, +3, +4', category: 'transition-metal', period: 4, group: 4 },
  { number: 23, symbol: 'V', nameCN: '钒', nameEN: 'Vanadium', mass: 50.94, electronConfig: '[Ar] 3d³ 4s²', valence: '+2, +3, +4, +5', category: 'transition-metal', period: 4, group: 5 },
  { number: 24, symbol: 'Cr', nameCN: '铬', nameEN: 'Chromium', mass: 52.00, electronConfig: '[Ar] 3d⁵ 4s¹', valence: '+2, +3, +6', category: 'transition-metal', period: 4, group: 6 },
  { number: 25, symbol: 'Mn', nameCN: '锰', nameEN: 'Manganese', mass: 54.94, electronConfig: '[Ar] 3d⁵ 4s²', valence: '+2, +4, +6, +7', category: 'transition-metal', period: 4, group: 7 },
  { number: 26, symbol: 'Fe', nameCN: '铁', nameEN: 'Iron', mass: 55.85, electronConfig: '[Ar] 3d⁶ 4s²', valence: '+2, +3', category: 'transition-metal', period: 4, group: 8 },
  { number: 27, symbol: 'Co', nameCN: '钴', nameEN: 'Cobalt', mass: 58.93, electronConfig: '[Ar] 3d⁷ 4s²', valence: '+2, +3', category: 'transition-metal', period: 4, group: 9 },
  { number: 28, symbol: 'Ni', nameCN: '镍', nameEN: 'Nickel', mass: 58.69, electronConfig: '[Ar] 3d⁸ 4s²', valence: '+2, +3', category: 'transition-metal', period: 4, group: 10 },
  { number: 29, symbol: 'Cu', nameCN: '铜', nameEN: 'Copper', mass: 63.55, electronConfig: '[Ar] 3d¹⁰ 4s¹', valence: '+1, +2', category: 'transition-metal', period: 4, group: 11 },
  { number: 30, symbol: 'Zn', nameCN: '锌', nameEN: 'Zinc', mass: 65.38, electronConfig: '[Ar] 3d¹⁰ 4s²', valence: '+2', category: 'transition-metal', period: 4, group: 12 },
  { number: 31, symbol: 'Ga', nameCN: '镓', nameEN: 'Gallium', mass: 69.72, electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹', valence: '+3', category: 'post-transition', period: 4, group: 13 },
  { number: 32, symbol: 'Ge', nameCN: '锗', nameEN: 'Germanium', mass: 72.63, electronConfig: '[Ar] 3d¹⁰ 4s² 4p²', valence: '+2, +4', category: 'metalloid', period: 4, group: 14 },
  { number: 33, symbol: 'As', nameCN: '砷', nameEN: 'Arsenic', mass: 74.92, electronConfig: '[Ar] 3d¹⁰ 4s² 4p³', valence: '-3, +3, +5', category: 'metalloid', period: 4, group: 15 },
  { number: 34, symbol: 'Se', nameCN: '硒', nameEN: 'Selenium', mass: 78.97, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴', valence: '-2, +4, +6', category: 'nonmetal', period: 4, group: 16 },
  { number: 35, symbol: 'Br', nameCN: '溴', nameEN: 'Bromine', mass: 79.90, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', valence: '-1, +1, +5', category: 'halogen', period: 4, group: 17 },
  { number: 36, symbol: 'Kr', nameCN: '氪', nameEN: 'Krypton', mass: 83.80, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', valence: '0', category: 'noble-gas', period: 4, group: 18 },
  { number: 37, symbol: 'Rb', nameCN: '铷', nameEN: 'Rubidium', mass: 85.47, electronConfig: '[Kr] 5s¹', valence: '+1', category: 'alkali-metal', period: 5, group: 1 },
  { number: 38, symbol: 'Sr', nameCN: '锶', nameEN: 'Strontium', mass: 87.62, electronConfig: '[Kr] 5s²', valence: '+2', category: 'alkaline-earth', period: 5, group: 2 },
  { number: 39, symbol: 'Y', nameCN: '钇', nameEN: 'Yttrium', mass: 88.91, electronConfig: '[Kr] 4d¹ 5s²', valence: '+3', category: 'transition-metal', period: 5, group: 3 },
  { number: 40, symbol: 'Zr', nameCN: '锆', nameEN: 'Zirconium', mass: 91.22, electronConfig: '[Kr] 4d² 5s²', valence: '+4', category: 'transition-metal', period: 5, group: 4 },
  { number: 41, symbol: 'Nb', nameCN: '铌', nameEN: 'Niobium', mass: 92.91, electronConfig: '[Kr] 4d⁴ 5s¹', valence: '+3, +5', category: 'transition-metal', period: 5, group: 5 },
  { number: 42, symbol: 'Mo', nameCN: '钼', nameEN: 'Molybdenum', mass: 95.95, electronConfig: '[Kr] 4d⁵ 5s¹', valence: '+4, +6', category: 'transition-metal', period: 5, group: 6 },
  { number: 43, symbol: 'Tc', nameCN: '锝', nameEN: 'Technetium', mass: 98, electronConfig: '[Kr] 4d⁵ 5s²', valence: '+4, +7', category: 'transition-metal', period: 5, group: 7 },
  { number: 44, symbol: 'Ru', nameCN: '钌', nameEN: 'Ruthenium', mass: 101.1, electronConfig: '[Kr] 4d⁷ 5s¹', valence: '+2, +4, +6', category: 'transition-metal', period: 5, group: 8 },
  { number: 45, symbol: 'Rh', nameCN: '铑', nameEN: 'Rhodium', mass: 102.9, electronConfig: '[Kr] 4d⁸ 5s¹', valence: '+3, +4', category: 'transition-metal', period: 5, group: 9 },
  { number: 46, symbol: 'Pd', nameCN: '钯', nameEN: 'Palladium', mass: 106.4, electronConfig: '[Kr] 4d¹⁰', valence: '+2, +4', category: 'transition-metal', period: 5, group: 10 },
  { number: 47, symbol: 'Ag', nameCN: '银', nameEN: 'Silver', mass: 107.9, electronConfig: '[Kr] 4d¹⁰ 5s¹', valence: '+1', category: 'transition-metal', period: 5, group: 11 },
  { number: 48, symbol: 'Cd', nameCN: '镉', nameEN: 'Cadmium', mass: 112.4, electronConfig: '[Kr] 4d¹⁰ 5s²', valence: '+2', category: 'transition-metal', period: 5, group: 12 },
  { number: 49, symbol: 'In', nameCN: '铟', nameEN: 'Indium', mass: 114.8, electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹', valence: '+3', category: 'post-transition', period: 5, group: 13 },
  { number: 50, symbol: 'Sn', nameCN: '锡', nameEN: 'Tin', mass: 118.7, electronConfig: '[Kr] 4d¹⁰ 5s² 5p²', valence: '+2, +4', category: 'post-transition', period: 5, group: 14 },
  { number: 51, symbol: 'Sb', nameCN: '锑', nameEN: 'Antimony', mass: 121.8, electronConfig: '[Kr] 4d¹⁰ 5s² 5p³', valence: '-3, +3, +5', category: 'metalloid', period: 5, group: 15 },
  { number: 52, symbol: 'Te', nameCN: '碲', nameEN: 'Tellurium', mass: 127.6, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴', valence: '-2, +4, +6', category: 'metalloid', period: 5, group: 16 },
  { number: 53, symbol: 'I', nameCN: '碘', nameEN: 'Iodine', mass: 126.9, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', valence: '-1, +5, +7', category: 'halogen', period: 5, group: 17 },
  { number: 54, symbol: 'Xe', nameCN: '氙', nameEN: 'Xenon', mass: 131.3, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', valence: '0, +2, +4, +6', category: 'noble-gas', period: 5, group: 18 },
  { number: 55, symbol: 'Cs', nameCN: '铯', nameEN: 'Caesium', mass: 132.9, electronConfig: '[Xe] 6s¹', valence: '+1', category: 'alkali-metal', period: 6, group: 1 },
  { number: 56, symbol: 'Ba', nameCN: '钡', nameEN: 'Barium', mass: 137.3, electronConfig: '[Xe] 6s²', valence: '+2', category: 'alkaline-earth', period: 6, group: 2 },
  { number: 57, symbol: 'La', nameCN: '镧', nameEN: 'Lanthanum', mass: 138.9, electronConfig: '[Xe] 5d¹ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: 3 },
  { number: 58, symbol: 'Ce', nameCN: '铈', nameEN: 'Cerium', mass: 140.1, electronConfig: '[Xe] 4f¹ 5d¹ 6s²', valence: '+3, +4', category: 'lanthanide', period: 6, group: -1 },
  { number: 59, symbol: 'Pr', nameCN: '镨', nameEN: 'Praseodymium', mass: 140.9, electronConfig: '[Xe] 4f³ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 60, symbol: 'Nd', nameCN: '钕', nameEN: 'Neodymium', mass: 144.2, electronConfig: '[Xe] 4f⁴ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 61, symbol: 'Pm', nameCN: '钷', nameEN: 'Promethium', mass: 145, electronConfig: '[Xe] 4f⁵ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 62, symbol: 'Sm', nameCN: '钐', nameEN: 'Samarium', mass: 150.4, electronConfig: '[Xe] 4f⁶ 6s²', valence: '+2, +3', category: 'lanthanide', period: 6, group: -1 },
  { number: 63, symbol: 'Eu', nameCN: '铕', nameEN: 'Europium', mass: 152.0, electronConfig: '[Xe] 4f⁷ 6s²', valence: '+2, +3', category: 'lanthanide', period: 6, group: -1 },
  { number: 64, symbol: 'Gd', nameCN: '钆', nameEN: 'Gadolinium', mass: 157.3, electronConfig: '[Xe] 4f⁷ 5d¹ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 65, symbol: 'Tb', nameCN: '铽', nameEN: 'Terbium', mass: 158.9, electronConfig: '[Xe] 4f⁹ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 66, symbol: 'Dy', nameCN: '镝', nameEN: 'Dysprosium', mass: 162.5, electronConfig: '[Xe] 4f¹⁰ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 67, symbol: 'Ho', nameCN: '钬', nameEN: 'Holmium', mass: 164.9, electronConfig: '[Xe] 4f¹¹ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 68, symbol: 'Er', nameCN: '铒', nameEN: 'Erbium', mass: 167.3, electronConfig: '[Xe] 4f¹² 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 69, symbol: 'Tm', nameCN: '铥', nameEN: 'Thulium', mass: 168.9, electronConfig: '[Xe] 4f¹³ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 70, symbol: 'Yb', nameCN: '镱', nameEN: 'Ytterbium', mass: 173.0, electronConfig: '[Xe] 4f¹⁴ 6s²', valence: '+2, +3', category: 'lanthanide', period: 6, group: -1 },
  { number: 71, symbol: 'Lu', nameCN: '镥', nameEN: 'Lutetium', mass: 175.0, electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²', valence: '+3', category: 'lanthanide', period: 6, group: -1 },
  { number: 72, symbol: 'Hf', nameCN: '铪', nameEN: 'Hafnium', mass: 178.5, electronConfig: '[Xe] 4f¹⁴ 5d² 6s²', valence: '+4', category: 'transition-metal', period: 6, group: 4 },
  { number: 73, symbol: 'Ta', nameCN: '钽', nameEN: 'Tantalum', mass: 180.9, electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²', valence: '+5', category: 'transition-metal', period: 6, group: 5 },
  { number: 74, symbol: 'W', nameCN: '钨', nameEN: 'Tungsten', mass: 183.8, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', valence: '+6', category: 'transition-metal', period: 6, group: 6 },
  { number: 75, symbol: 'Re', nameCN: '铼', nameEN: 'Rhenium', mass: 186.2, electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²', valence: '+4, +6, +7', category: 'transition-metal', period: 6, group: 7 },
  { number: 76, symbol: 'Os', nameCN: '锇', nameEN: 'Osmium', mass: 190.2, electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²', valence: '+4, +6, +8', category: 'transition-metal', period: 6, group: 8 },
  { number: 77, symbol: 'Ir', nameCN: '铱', nameEN: 'Iridium', mass: 192.2, electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²', valence: '+3, +4', category: 'transition-metal', period: 6, group: 9 },
  { number: 78, symbol: 'Pt', nameCN: '铂', nameEN: 'Platinum', mass: 195.1, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', valence: '+2, +4', category: 'transition-metal', period: 6, group: 10 },
  { number: 79, symbol: 'Au', nameCN: '金', nameEN: 'Gold', mass: 197.0, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', valence: '+1, +3', category: 'transition-metal', period: 6, group: 11 },
  { number: 80, symbol: 'Hg', nameCN: '汞', nameEN: 'Mercury', mass: 200.6, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', valence: '+1, +2', category: 'transition-metal', period: 6, group: 12 },
  { number: 81, symbol: 'Tl', nameCN: '铊', nameEN: 'Thallium', mass: 204.4, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', valence: '+1, +3', category: 'post-transition', period: 6, group: 13 },
  { number: 82, symbol: 'Pb', nameCN: '铅', nameEN: 'Lead', mass: 207.2, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', valence: '+2, +4', category: 'post-transition', period: 6, group: 14 },
  { number: 83, symbol: 'Bi', nameCN: '铋', nameEN: 'Bismuth', mass: 209.0, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', valence: '+3, +5', category: 'post-transition', period: 6, group: 15 },
  { number: 84, symbol: 'Po', nameCN: '钋', nameEN: 'Polonium', mass: 209, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', valence: '+2, +4', category: 'post-transition', period: 6, group: 16 },
  { number: 85, symbol: 'At', nameCN: '砹', nameEN: 'Astatine', mass: 210, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', valence: '-1, +5', category: 'halogen', period: 6, group: 17 },
  { number: 86, symbol: 'Rn', nameCN: '氡', nameEN: 'Radon', mass: 222, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', valence: '0', category: 'noble-gas', period: 6, group: 18 },
  { number: 87, symbol: 'Fr', nameCN: '钫', nameEN: 'Francium', mass: 223, electronConfig: '[Rn] 7s¹', valence: '+1', category: 'alkali-metal', period: 7, group: 1 },
  { number: 88, symbol: 'Ra', nameCN: '镭', nameEN: 'Radium', mass: 226, electronConfig: '[Rn] 7s²', valence: '+2', category: 'alkaline-earth', period: 7, group: 2 },
  { number: 89, symbol: 'Ac', nameCN: '锕', nameEN: 'Actinium', mass: 227, electronConfig: '[Rn] 6d¹ 7s²', valence: '+3', category: 'actinide', period: 7, group: 3 },
  { number: 90, symbol: 'Th', nameCN: '钍', nameEN: 'Thorium', mass: 232.0, electronConfig: '[Rn] 6d² 7s²', valence: '+4', category: 'actinide', period: 7, group: -1 },
  { number: 91, symbol: 'Pa', nameCN: '镤', nameEN: 'Protactinium', mass: 231.0, electronConfig: '[Rn] 5f² 6d¹ 7s²', valence: '+5', category: 'actinide', period: 7, group: -1 },
  { number: 92, symbol: 'U', nameCN: '铀', nameEN: 'Uranium', mass: 238.0, electronConfig: '[Rn] 5f³ 6d¹ 7s²', valence: '+3, +4, +5, +6', category: 'actinide', period: 7, group: -1 },
  { number: 93, symbol: 'Np', nameCN: '镎', nameEN: 'Neptunium', mass: 237, electronConfig: '[Rn] 5f⁴ 6d¹ 7s²', valence: '+3, +5, +6', category: 'actinide', period: 7, group: -1 },
  { number: 94, symbol: 'Pu', nameCN: '钚', nameEN: 'Plutonium', mass: 244, electronConfig: '[Rn] 5f⁶ 7s²', valence: '+3, +4, +6', category: 'actinide', period: 7, group: -1 },
  { number: 95, symbol: 'Am', nameCN: '镅', nameEN: 'Americium', mass: 243, electronConfig: '[Rn] 5f⁷ 7s²', valence: '+3, +4, +6', category: 'actinide', period: 7, group: -1 },
  { number: 96, symbol: 'Cm', nameCN: '锔', nameEN: 'Curium', mass: 247, electronConfig: '[Rn] 5f⁷ 6d¹ 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 97, symbol: 'Bk', nameCN: '锫', nameEN: 'Berkelium', mass: 247, electronConfig: '[Rn] 5f⁹ 7s²', valence: '+3, +4', category: 'actinide', period: 7, group: -1 },
  { number: 98, symbol: 'Cf', nameCN: '锎', nameEN: 'Californium', mass: 251, electronConfig: '[Rn] 5f¹⁰ 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 99, symbol: 'Es', nameCN: '锿', nameEN: 'Einsteinium', mass: 252, electronConfig: '[Rn] 5f¹¹ 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 100, symbol: 'Fm', nameCN: '镄', nameEN: 'Fermium', mass: 257, electronConfig: '[Rn] 5f¹² 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 101, symbol: 'Md', nameCN: '钔', nameEN: 'Mendelevium', mass: 258, electronConfig: '[Rn] 5f¹³ 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 102, symbol: 'No', nameCN: '锘', nameEN: 'Nobelium', mass: 259, electronConfig: '[Rn] 5f¹⁴ 7s²', valence: '+3', category: 'actinide', period: 7, group: -1 },
  { number: 103, symbol: 'Lr', nameCN: '铹', nameEN: 'Lawrencium', mass: 266, electronConfig: '[Rn] 5f¹⁴ 7s² 7p¹', valence: '+3', category: 'actinide', period: 7, group: -1 },
];

export interface ElementCube {
  data: ElementData;
  mesh: THREE.Mesh;
  group: THREE.Group;
  basePosition: THREE.Vector3;
  targetScale: number;
  isSelected: boolean;
  isFiltered: boolean;
  atomModel?: THREE.Group;
  highlightRing?: THREE.Mesh;
}

const CELL_SIZE = 2.5;
const GRID_OFFSET_X = -17 * CELL_SIZE / 2;
const GRID_OFFSET_Z = -6 * CELL_SIZE / 2;

export function getGridPosition(element: ElementData): THREE.Vector3 {
  let x: number;
  let z: number;

  if (element.group === -1) {
    const lanthanideStart = ELEMENTS.findIndex(e => e.number === 58);
    const actinideStart = ELEMENTS.findIndex(e => e.number === 90);
    let colOffset: number;
    let rowOffset: number;

    if (element.category === 'lanthanide') {
      colOffset = element.number - 58;
      rowOffset = 8;
    } else {
      colOffset = element.number - 90;
      rowOffset = 9;
    }
    x = (3 + colOffset) * CELL_SIZE + GRID_OFFSET_X;
    z = rowOffset * CELL_SIZE + GRID_OFFSET_Z - 1;
  } else {
    x = (element.group - 1) * CELL_SIZE + GRID_OFFSET_X;
    z = (element.period - 1) * CELL_SIZE + GRID_OFFSET_Z;
  }

  return new THREE.Vector3(x, 0, z);
}

export function createElementCube(element: ElementData): ElementCube {
  const group = new THREE.Group();
  const position = getGridPosition(element);

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const color = CATEGORY_COLORS[element.category];
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.element = element;
  group.add(mesh);

  const ringGeometry = new THREE.RingGeometry(1.3, 1.4, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(position);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  ring.userData.isHighlightRing = true;
  group.add(ring);

  return {
    data: element,
    mesh,
    group,
    basePosition: position.clone(),
    targetScale: 1,
    isSelected: false,
    isFiltered: false,
    highlightRing: ring,
  };
}

export function createAtomModel(element: ElementData, center: THREE.Vector3): THREE.Group {
  const atomGroup = new THREE.Group();
  atomGroup.position.copy(center);
  atomGroup.position.y += 0;

  const nucleusGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
  nucleus.userData.isNucleus = true;
  atomGroup.add(nucleus);

  const orbitCount = Math.min(3, Math.max(2, Math.ceil(element.number / 20)));
  const orbits: { ring: THREE.Mesh; electrons: THREE.Mesh[]; angle: number; speed: number }[] = [];

  for (let i = 0; i < orbitCount; i++) {
    const orbitRadius = 0.7 + i * 0.35;
    const tilt = (Math.random() - 0.5) * 0.8;
    const rotation = Math.random() * Math.PI;

    const curve = new THREE.EllipseCurve(
      0, 0,
      orbitRadius, orbitRadius * 0.7,
      0, 2 * Math.PI,
      false,
      0
    );
    const points = curve.getPoints(64);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x64b5f6,
      transparent: true,
      opacity: 0.5,
    });
    const orbitRing = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitRing.rotation.x = Math.PI / 2 + tilt;
    orbitRing.rotation.y = rotation;
    atomGroup.add(orbitRing);

    const electronCount = 1 + Math.floor(Math.random() * 2);
    const electrons: THREE.Mesh[] = [];
    for (let j = 0; j < electronCount; j++) {
      const electronGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const electronMaterial = new THREE.MeshBasicMaterial({ color: 0x2196f3 });
      const electron = new THREE.Mesh(electronGeometry, electronMaterial);
      electron.userData.orbitIndex = i;
      electron.userData.electronAngle = (j / electronCount) * Math.PI * 2;
      electron.userData.orbitRadius = orbitRadius;
      electron.userData.orbitTilt = tilt;
      electron.userData.orbitRotation = rotation;
      electron.userData.isElectron = true;
      electrons.push(electron);
      atomGroup.add(electron);
    }

    orbits.push({
      ring: orbitRing,
      electrons,
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.6,
    });
  }

  atomGroup.userData.orbits = orbits;
  return atomGroup;
}

export function animateAtomModel(atomGroup: THREE.Group, deltaTime: number): void {
  const orbits = atomGroup.userData.orbits as typeof createAtomModel extends (...args: any[]) => infer R ? R extends THREE.Group ? any : never : never;
  if (!orbits) return;

  orbits.forEach((orbit: { electrons: any[]; speed: number }) => {
    orbit.electrons.forEach((electron: any) => {
      electron.userData.electronAngle += orbit.speed * deltaTime;
      const angle = electron.userData.electronAngle;
      const r = electron.userData.orbitRadius;
      const tilt = electron.userData.orbitTilt;
      const rot = electron.userData.orbitRotation;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.7;

      const pos = new THREE.Vector3(x, 0, y);
      const euler = new THREE.Euler(Math.PI / 2 + tilt, rot, 0);
      pos.applyEuler(euler);
      electron.position.copy(pos);
    });
  });
}

export function createStars(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();

  for (let i = 0; i < count; i++) {
    const radius = 60 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Points(geometry, material);
}

export function searchElement(query: string): ElementData | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  return ELEMENTS.find(e =>
    e.symbol.toLowerCase() === q ||
    e.nameEN.toLowerCase() === q ||
    e.nameCN === q ||
    e.number.toString() === q
  ) || null;
}
