import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MoleculeVisualizer } from '../src/visualizer';
import { generateMolecules } from '../src/moleculeData';

describe('MoleculeVisualizer', () => {
  let scene: THREE.Scene;
  let visualizer: MoleculeVisualizer;
  let molecules: ReturnType<typeof generateMolecules>;

  beforeEach(() => {
    scene = new THREE.Scene();
    molecules = generateMolecules();
    visualizer = new MoleculeVisualizer(scene);
    visualizer.buildMolecules(molecules);
  });

  describe('particle system', () => {
    it('initial particle count is 0', () => {
      expect(visualizer.getParticleCount()).toBe(0);
    });

    it('particles increase over time when volatility > 0', () => {
      visualizer.updateVolatilityScale(1.0);
      visualizer.update(0.1);
      const count1 = visualizer.getParticleCount();
      visualizer.update(1.0);
      const count2 = visualizer.getParticleCount();
      expect(count2).toBeGreaterThan(count1);
    });

    it('no particles when volatility scale is 0', () => {
      visualizer.updateVolatilityScale(0);
      for (let i = 0; i < 60; i++) {
        visualizer.update(1 / 60);
      }
      expect(visualizer.getParticleCount()).toBe(0);
    });

    it('particle count never exceeds MAX_PARTICLES (4000) even with high volatility', () => {
      visualizer.updateVolatilityScale(2.0);
      for (let i = 0; i < 300; i++) {
        visualizer.update(0.1);
      }
      expect(visualizer.getParticleCount()).toBeLessThanOrEqual(4000);
    });

    it('when over limit, oldest particles are removed first', () => {
      const v = visualizer as any;

      for (let i = 0; i < 4010; i++) {
        const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        v.particles.push({
          mesh,
          velocity: new THREE.Vector3(0, 0, 0),
          life: i * 0.001,
          maxLife: 10,
          moleculeIndex: 0,
        });
      }

      expect(v.particles.length).toBe(4010);

      const oldestLifeBefore = v.particles[0].life;
      visualizer.update(0.001);

      expect(v.particles.length).toBe(4000);

      const oldestLifeAfter = v.particles[0].life;
      expect(oldestLifeAfter).toBeGreaterThan(oldestLifeBefore);
    });

    it('particle speed scales with volatility', () => {
      visualizer.updateVolatilityScale(0.2);
      visualizer.update(0.05);
      const v = visualizer as any;
      const particlesSlow = [...v.particles];

      v.particles = [];
      v.particlePool = [];

      visualizer.updateVolatilityScale(1.0);
      visualizer.update(0.05);
      const particlesFast = [...v.particles];

      if (particlesSlow.length > 0 && particlesFast.length > 0) {
        const avgSpeedSlow = particlesSlow
          .slice(0, 20)
          .reduce((s, p: any) => s + p.velocity.length(), 0) / Math.min(20, particlesSlow.length);
        const avgSpeedFast = particlesFast
          .slice(0, 20)
          .reduce((s, p: any) => s + p.velocity.length(), 0) / Math.min(20, particlesFast.length);
        expect(avgSpeedFast).toBeGreaterThan(avgSpeedSlow);
      }
    });
  });

  describe('highlightMolecule', () => {
    it('sets selected molecule atoms to opacity 1.0', () => {
      visualizer.highlightMolecule(3);
      const mgs = visualizer.getMoleculeGroups();
      const selected = mgs[3];
      for (const mesh of selected.atomMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.opacity).toBe(1.0);
        expect(mat.transparent).toBe(true);
      }
    });

    it('dims non-selected molecule atoms to opacity 0.3', () => {
      visualizer.highlightMolecule(5);
      const mgs = visualizer.getMoleculeGroups();
      for (let i = 0; i < mgs.length; i++) {
        if (i === 5) continue;
        for (const mesh of mgs[i].atomMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          expect(mat.opacity).toBe(0.3);
          expect(mat.transparent).toBe(true);
        }
      }
    });

    it('selected molecule bonds turn cyan (#00ffff)', () => {
      visualizer.highlightMolecule(7);
      const mgs = visualizer.getMoleculeGroups();
      const selected = mgs[7];
      for (const mesh of selected.bondMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.color.getHex()).toBe(0x00ffff);
      }
    });

    it('non-selected bonds keep original colors but dim', () => {
      const mgs = visualizer.getMoleculeGroups();
      const origColors = mgs[2].originalBondColors.slice();

      visualizer.highlightMolecule(5);

      const nonSelected = mgs[2];
      for (let j = 0; j < nonSelected.bondMeshes.length; j++) {
        const mat = nonSelected.bondMeshes[j].material as THREE.MeshStandardMaterial;
        expect(mat.color.getHex()).toBe(origColors[j]);
        expect(mat.opacity).toBeLessThan(0.5);
      }
    });

    it('selected molecule emissive intensity is 1.5x base', () => {
      const mgs = visualizer.getMoleculeGroups();
      const baseIntensity = mgs[3].baseEmissiveIntensity;

      visualizer.highlightMolecule(3);

      const selected = mgs[3];
      for (const mesh of selected.atomMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        expect(mat.emissiveIntensity).toBeCloseTo(baseIntensity * 1.5, 5);
      }
    });
  });

  describe('clearHighlight', () => {
    it('restores all molecules to full opacity after highlight', () => {
      visualizer.highlightMolecule(3);
      visualizer.clearHighlight();

      const mgs = visualizer.getMoleculeGroups();
      for (const mg of mgs) {
        for (const mesh of mg.atomMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          expect(mat.opacity).toBe(1.0);
        }
      }
    });

    it('restores bond colors to original after highlight', () => {
      const mgs = visualizer.getMoleculeGroups();
      const firstOrig = mgs[0].originalBondColors.slice();

      visualizer.highlightMolecule(5);
      visualizer.clearHighlight();

      for (let j = 0; j < mgs[0].bondMeshes.length; j++) {
        const mat = mgs[0].bondMeshes[j].material as THREE.MeshStandardMaterial;
        expect(mat.color.getHex()).toBe(firstOrig[j]);
      }
    });

    it('selected index is -1 after clear', () => {
      visualizer.highlightMolecule(3);
      visualizer.clearHighlight();
      expect(visualizer.getSelectedIndex()).toBe(-1);
    });
  });

  describe('double bond rendering', () => {
    it('double bonds create two cylinders (not one)', () => {
      const mgs = visualizer.getMoleculeGroups();
      let foundDoubleBond = false;

      for (let i = 0; i < mgs.length && !foundDoubleBond; i++) {
        const molData = molecules[i];
        const doubleBondCount = molData.bonds.filter(b => b.type === 'double').length;
        if (doubleBondCount > 0) {
          expect(mgs[i].bondMeshes.length).toBeGreaterThan(doubleBondCount);
          foundDoubleBond = true;
        }
      }

      expect(foundDoubleBond).toBe(true);
    });

    it('double bond cylinders are parallel and separated by correct spacing', () => {
      const mgs = visualizer.getMoleculeGroups();

      for (let molIdx = 0; molIdx < molecules.length; molIdx++) {
        const molData = molecules[molIdx];
        const mg = mgs[molIdx];

        let bondMeshIdx = 0;
        for (const bond of molData.bonds) {
          if (bond.type === 'double') {
            const cyl1 = mg.bondMeshes[bondMeshIdx];
            const cyl2 = mg.bondMeshes[bondMeshIdx + 1];

            const pos1 = cyl1.position.clone();
            const pos2 = cyl2.position.clone();
            const dist = pos1.distanceTo(pos2);

            expect(dist).toBeCloseTo(0.3, 1);
            bondMeshIdx += 2;
          } else {
            bondMeshIdx += 1;
          }
        }
      }
    });
  });

  describe('updateVolatilityScale', () => {
    it('changing volatility scale affects emission rate', () => {
      visualizer.updateVolatilityScale(0.1);
      visualizer.update(0.5);
      const lowCount = visualizer.getParticleCount();

      visualizer.updateVolatilityScale(1.0);
      visualizer.update(0.5);
      const highCount = visualizer.getParticleCount();

      expect(highCount).toBeGreaterThan(lowCount);
    });
  });
});
