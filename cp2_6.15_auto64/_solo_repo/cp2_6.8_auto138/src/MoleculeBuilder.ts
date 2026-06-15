import * as THREE from 'three';

export interface AtomData {
  id: number;
  position: { x: number; y: number; z: number };
  radius: number;
  color: string;
  symbol?: string;
}

export interface BondData {
  id: number;
  atomA: number;
  atomB: number;
}

export interface MoleculeData {
  atoms: AtomData[];
  bonds: BondData[];
}

export class MoleculeBuilder {
  public atoms: Map<number, { data: AtomData; mesh: THREE.Mesh; labelEl: HTMLElement }> = new Map();
  public bonds: Map<number, { data: BondData; mesh: THREE.Mesh; labelEl: HTMLElement; particles: THREE.Points[] }> = new Map();
  public atomGroup: THREE.Group;
  public bondGroup: THREE.Group;
  public particleGroup: THREE.Group;
  public angleLabels: Map<string, HTMLElement> = new Map();

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private nextAtomId = 1;
  private nextBondId = 1;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.atomGroup = new THREE.Group();
    this.bondGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    this.scene.add(this.atomGroup);
    this.scene.add(this.bondGroup);
    this.scene.add(this.particleGroup);
  }

  getNextAtomId(): number {
    return this.nextAtomId;
  }

  getNextBondId(): number {
    return this.nextBondId;
  }

  addAtom(
    position: THREE.Vector3,
    radius: number,
    color: string,
    symbol?: string
  ): number {
    const id = this.nextAtomId++;
    const atomData: AtomData = {
      id,
      position: { x: position.x, y: position.y, z: position.z },
      radius,
      color,
      symbol: symbol || this.getSymbolByColor(color),
    };

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.3,
      roughness: 0.4,
      emissive: new THREE.Color(color).multiplyScalar(0.1),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { type: 'atom', atomId: id };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.atomGroup.add(mesh);

    const labelEl = document.createElement('div');
    labelEl.className = 'atom-label';
    labelEl.textContent = `${atomData.symbol}${id}`;
    document.getElementById('app')!.appendChild(labelEl);

    this.atoms.set(id, { data: atomData, mesh, labelEl });
    this.updateAngles();

    return id;
  }

  removeAtom(atomId: number): void {
    const atom = this.atoms.get(atomId);
    if (!atom) return;

    this.atomGroup.remove(atom.mesh);
    atom.mesh.geometry.dispose();
    (atom.mesh.material as THREE.Material).dispose();
    atom.labelEl.remove();

    const bondsToRemove: number[] = [];
    this.bonds.forEach((bond, bondId) => {
      if (bond.data.atomA === atomId || bond.data.atomB === atomId) {
        bondsToRemove.push(bondId);
      }
    });
    bondsToRemove.forEach((id) => this.removeBond(id));

    this.atoms.delete(atomId);
    this.updateAngles();
  }

  addBond(atomAId: number, atomBId: number): number | null {
    if (atomAId === atomBId) return null;

    const exists = Array.from(this.bonds.values()).some(
      (b) =>
        (b.data.atomA === atomAId && b.data.atomB === atomBId) ||
        (b.data.atomA === atomBId && b.data.atomB === atomAId)
    );
    if (exists) return null;

    const atomA = this.atoms.get(atomAId);
    const atomB = this.atoms.get(atomBId);
    if (!atomA || !atomB) return null;

    const id = this.nextBondId++;
    const bondData: BondData = { id, atomA: atomAId, atomB: atomBId };

    const { mesh, particles } = this.createBondMesh(atomA, atomB);
    mesh.userData = { type: 'bond', bondId: id };
    this.bondGroup.add(mesh);
    particles.forEach((p) => this.particleGroup.add(p));

    const labelEl = document.createElement('div');
    labelEl.className = 'bond-label';
    document.getElementById('app')!.appendChild(labelEl);

    this.bonds.set(id, { data: bondData, mesh, labelEl, particles });
    this.updateBond(id);
    this.updateAngles();

    return id;
  }

  removeBond(bondId: number): void {
    const bond = this.bonds.get(bondId);
    if (!bond) return;

    this.bondGroup.remove(bond.mesh);
    bond.mesh.geometry.dispose();
    (bond.mesh.material as THREE.Material).dispose();
    bond.particles.forEach((p) => {
      this.particleGroup.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
    bond.labelEl.remove();
    this.bonds.delete(bondId);
    this.updateAngles();
  }

  private createBondMesh(
    atomA: { data: AtomData; mesh: THREE.Mesh },
    atomB: { data: AtomData; mesh: THREE.Mesh }
  ): { mesh: THREE.Mesh; particles: THREE.Points[] } {
    const dir = new THREE.Vector3()
      .subVectors(atomB.mesh.position, atomA.mesh.position);
    const length = dir.length();

    const geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 16);
    geometry.translate(0, length / 2, 0);
    geometry.rotateX(Math.PI / 2);

    const colorA = new THREE.Color(atomA.data.color);
    const colorB = new THREE.Color(atomB.data.color);
    const avgColor = colorA.clone().lerp(colorB, 0.5);

    const material = new THREE.MeshStandardMaterial({
      color: avgColor,
      transparent: true,
      opacity: 0.85,
      metalness: 0.2,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const particles: THREE.Points[] = [];
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array([0, 0, 0]);
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMatA = new THREE.PointsMaterial({
      color: colorA,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particleMatB = new THREE.PointsMaterial({
      color: colorB,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    particles.push(new THREE.Points(particleGeom.clone(), particleMatA));
    particles.push(new THREE.Points(particleGeom.clone(), particleMatB));

    return { mesh, particles };
  }

  updateBond(bondId: number): void {
    const bond = this.bonds.get(bondId);
    if (!bond) return;

    const atomA = this.atoms.get(bond.data.atomA);
    const atomB = this.atoms.get(bond.data.atomB);
    if (!atomA || !atomB) return;

    const posA = atomA.mesh.position;
    const posB = atomB.mesh.position;
    const dir = new THREE.Vector3().subVectors(posB, posA);
    const length = dir.length();

    bond.mesh.position.copy(posA);
    bond.mesh.lookAt(posB);
    bond.mesh.rotateY(Math.PI / 2);

    bond.mesh.scale.z = length / (bond.mesh.geometry as THREE.CylinderGeometry).parameters.height;

    bond.particles[0].position.copy(posA);
    bond.particles[1].position.copy(posB);

    const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
    this.updateLabelPosition(bond.labelEl, midPoint);
    bond.labelEl.textContent = `${length.toFixed(2)}`;
  }

  updateAtomPosition(atomId: number, position: THREE.Vector3): void {
    const atom = this.atoms.get(atomId);
    if (!atom) return;

    atom.mesh.position.copy(position);
    atom.data.position = { x: position.x, y: position.y, z: position.z };
    this.updateLabelPosition(atom.labelEl, position);

    this.bonds.forEach((bond) => {
      if (bond.data.atomA === atomId || bond.data.atomB === atomId) {
        this.updateBond(bond.data.id);
      }
    });

    this.updateAngles();
  }

  updateLabels(): void {
    this.atoms.forEach((atom) => {
      this.updateLabelPosition(atom.labelEl, atom.mesh.position);
    });
    this.bonds.forEach((bond) => {
      const atomA = this.atoms.get(bond.data.atomA);
      const atomB = this.atoms.get(bond.data.atomB);
      if (atomA && atomB) {
        const midPoint = new THREE.Vector3()
          .addVectors(atomA.mesh.position, atomB.mesh.position)
          .multiplyScalar(0.5);
        this.updateLabelPosition(bond.labelEl, midPoint);
      }
    });
    this.updateAngles();
  }

  private updateLabelPosition(el: HTMLElement, worldPos: THREE.Vector3): void {
    const vector = worldPos.clone().project(this.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = vector.z > 1 ? 'none' : 'block';
  }

  updateAngles(): void {
    this.angleLabels.forEach((el) => el.remove());
    this.angleLabels.clear();

    const angleMap = new Map<number, { neighbors: number[] }>();
    this.atoms.forEach((_, id) => {
      angleMap.set(id, { neighbors: [] });
    });

    this.bonds.forEach((bond) => {
      angleMap.get(bond.data.atomA)?.neighbors.push(bond.data.atomB);
      angleMap.get(bond.data.atomB)?.neighbors.push(bond.data.atomA);
    });

    angleMap.forEach((data, centerId) => {
      if (data.neighbors.length < 2) return;

      const centerAtom = this.atoms.get(centerId);
      if (!centerAtom) return;

      for (let i = 0; i < data.neighbors.length; i++) {
        for (let j = i + 1; j < data.neighbors.length; j++) {
          const aId = data.neighbors[i];
          const bId = data.neighbors[j];
          const atomA = this.atoms.get(aId);
          const atomB = this.atoms.get(bId);
          if (!atomA || !atomB) continue;

          const v1 = new THREE.Vector3()
            .subVectors(atomA.mesh.position, centerAtom.mesh.position)
            .normalize();
          const v2 = new THREE.Vector3()
            .subVectors(atomB.mesh.position, centerAtom.mesh.position)
            .normalize();

          const angleRad = v1.angleTo(v2);
          const angleDeg = (angleRad * 180) / Math.PI;

          const bisector = new THREE.Vector3()
            .addVectors(v1, v2)
            .normalize()
            .multiplyScalar(0.8);
          const labelPos = new THREE.Vector3().addVectors(
            centerAtom.mesh.position,
            bisector
          );

          const labelEl = document.createElement('div');
          labelEl.className = 'angle-label';
          labelEl.textContent = `${angleDeg.toFixed(1)}°`;
          document.getElementById('app')!.appendChild(labelEl);
          this.updateLabelPosition(labelEl, labelPos);
          this.angleLabels.set(`${centerId}-${aId}-${bId}`, labelEl);
        }
      }
    });
  }

  private getSymbolByColor(color: string): string {
    const map: Record<string, string> = {
      '#FF3333': 'O',
      '#FFFFFF': 'H',
      '#3366FF': 'N',
      '#33CC33': 'Cl',
      '#FFCC00': 'S',
      '#9933FF': 'P',
      '#FF6600': 'C',
      '#888888': 'X',
    };
    return map[color.toUpperCase()] || 'X';
  }

  clearAll(): void {
    const atomIds = Array.from(this.atoms.keys());
    atomIds.forEach((id) => this.removeAtom(id));

    this.angleLabels.forEach((el) => el.remove());
    this.angleLabels.clear();

    this.nextAtomId = 1;
    this.nextBondId = 1;
  }

  toJSON(): MoleculeData {
    return {
      atoms: Array.from(this.atoms.values()).map((a) => a.data),
      bonds: Array.from(this.bonds.values()).map((b) => b.data),
    };
  }

  fromJSON(data: MoleculeData): void {
    this.clearAll();

    data.atoms.forEach((atom) => {
      const id = this.addAtom(
        new THREE.Vector3(atom.position.x, atom.position.y, atom.position.z),
        atom.radius,
        atom.color,
        atom.symbol
      );
      this.nextAtomId = Math.max(this.nextAtomId, id + 1);
    });

    const idMap = new Map<number, number>();
    let idx = 1;
    data.atoms.forEach((atom) => {
      idMap.set(atom.id, idx++);
    });

    data.bonds.forEach((bond) => {
      const aId = idMap.get(bond.atomA);
      const bId = idMap.get(bond.atomB);
      if (aId !== undefined && bId !== undefined) {
        const id = this.addBond(aId, bId);
        if (id !== null) {
          this.nextBondId = Math.max(this.nextBondId, id + 1);
        }
      }
    });
  }

  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this.atoms.forEach((atom) => {
      box.expandByObject(atom.mesh);
    });
    return box;
  }

  dispose(): void {
    this.atoms.forEach((atom) => {
      atom.mesh.geometry.dispose();
      (atom.mesh.material as THREE.Material).dispose();
      atom.labelEl.remove();
    });
    this.bonds.forEach((bond) => {
      bond.mesh.geometry.dispose();
      (bond.mesh.material as THREE.Material).dispose();
      bond.particles.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      bond.labelEl.remove();
    });
    this.angleLabels.forEach((el) => el.remove());
    this.atoms.clear();
    this.bonds.clear();
    this.angleLabels.clear();
  }
}
