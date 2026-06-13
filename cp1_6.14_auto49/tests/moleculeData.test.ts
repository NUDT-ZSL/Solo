import { describe, it, expect } from 'vitest';
import { generateMolecules, MoleculeData } from '../src/moleculeData';

describe('generateMolecules', () => {
  let molecules: MoleculeData[];

  beforeAll(() => {
    molecules = generateMolecules();
  });

  it('generates exactly 20 molecules', () => {
    expect(molecules.length).toBe(20);
  });

  it('each molecule has a unique name', () => {
    const names = molecules.map(m => m.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(20);
  });

  it('each molecule has valid noteTag', () => {
    const validTags = ['Citrus', 'Floral', 'Woody', 'Fruity', 'Spicy', 'Herbal', 'Musk', 'Marine'];
    for (const mol of molecules) {
      expect(validTags).toContain(mol.noteTag);
    }
  });

  it('each molecule has volatility between 0.1 and 1.0', () => {
    for (const mol of molecules) {
      expect(mol.volatility).toBeGreaterThanOrEqual(0.1);
      expect(mol.volatility).toBeLessThanOrEqual(1.0);
    }
  });

  it('each molecule has atoms and bonds arrays', () => {
    for (const mol of molecules) {
      expect(Array.isArray(mol.atoms)).toBe(true);
      expect(Array.isArray(mol.bonds)).toBe(true);
      expect(mol.atoms.length).toBeGreaterThan(0);
      expect(mol.bonds.length).toBeGreaterThan(0);
    }
  });

  it('bond indices refer to valid atom indices', () => {
    for (const mol of molecules) {
      for (const bond of mol.bonds) {
        expect(bond.atomIndex1).toBeGreaterThanOrEqual(0);
        expect(bond.atomIndex1).toBeLessThan(mol.atoms.length);
        expect(bond.atomIndex2).toBeGreaterThanOrEqual(0);
        expect(bond.atomIndex2).toBeLessThan(mol.atoms.length);
      }
    }
  });

  it('all atoms have valid symbols (C, O, N, H)', () => {
    const validSymbols = ['C', 'O', 'N', 'H'];
    for (const mol of molecules) {
      for (const atom of mol.atoms) {
        expect(validSymbols).toContain(atom.symbol);
      }
    }
  });

  it('all atoms have positive radius', () => {
    for (const mol of molecules) {
      for (const atom of mol.atoms) {
        expect(atom.radius).toBeGreaterThan(0);
      }
    }
  });

  it('all atoms have CPK color strings', () => {
    for (const mol of molecules) {
      for (const atom of mol.atoms) {
        expect(typeof atom.color).toBe('string');
        expect(atom.color.startsWith('#')).toBe(true);
      }
    }
  });

  it('molecular weight is positive and sums up', () => {
    const weights: Record<string, number> = {
      C: 12.011, O: 15.999, N: 14.007, H: 1.008,
    };
    for (const mol of molecules) {
      const calc = mol.atoms.reduce((sum, a) => sum + weights[a.symbol], 0);
      expect(mol.molecularWeight).toBeCloseTo(calc, 3);
      expect(mol.molecularWeight).toBeGreaterThan(0);
    }
  });

  it('citrus molecules have higher volatility (avg >= 0.6)', () => {
    const citrus = molecules.filter(m => m.noteTag === 'Citrus');
    const avgVol = citrus.reduce((s, m) => s + m.volatility, 0) / citrus.length;
    expect(avgVol).toBeGreaterThanOrEqual(0.6);
  });

  it('woody molecules have lower volatility (avg <= 0.5)', () => {
    const woody = molecules.filter(m => m.noteTag === 'Woody');
    const avgVol = woody.reduce((s, m) => s + m.volatility, 0) / woody.length;
    expect(avgVol).toBeLessThanOrEqual(0.5);
  });

  it('spicy/herbal molecules contain aromatic rings (6+ carbons)', () => {
    const aromaticMols = molecules.filter(m =>
      m.noteTag === 'Spicy' || m.noteTag === 'Herbal'
    );
    for (const mol of aromaticMols) {
      const carbonCount = mol.atoms.filter(a => a.symbol === 'C').length;
      expect(carbonCount).toBeGreaterThanOrEqual(6);
    }
  });

  it('bond type is either single or double', () => {
    for (const mol of molecules) {
      for (const bond of mol.bonds) {
        expect(['single', 'double']).toContain(bond.type);
      }
    }
  });

  it('molecules have diverse structure (different atom counts)', () => {
    const atomCounts = new Set(molecules.map(m => m.atoms.length));
    expect(atomCounts.size).toBeGreaterThan(5);
  });

  it('no molecule has zero bonds', () => {
    for (const mol of molecules) {
      expect(mol.bonds.length).toBeGreaterThan(0);
    }
  });
});
