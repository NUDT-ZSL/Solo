import * as THREE from 'three';
import { MoleculeData, Atom, Bond, ElementType, ELEMENT_PROPERTIES, ActiveSite } from '../types';
import { MoleculeMesh } from './SceneManager';

export class MoleculeLoader {
  private atomGeometry: THREE.SphereGeometry;
  private bondGeometry: THREE.CylinderGeometry;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private color: THREE.Color = new THREE.Color();

  constructor() {
    this.atomGeometry = new THREE.SphereGeometry(1, 16, 12);
    this.bondGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
    this.bondGeometry.translate(0, 0.5, 0);
  }

  public createMoleculeMesh(data: MoleculeData): MoleculeMesh {
    const group = new THREE.Group();
    group.name = data.type === 'receptor' ? 'Receptor' : 'Ligand';

    const atomCount = data.atoms.length;
    const bondCount = data.bonds.length;

    const originalPositions = new Float32Array(atomCount * 3);
    const atomPositions = new Float32Array(atomCount * 3);
    const bondPositions = new Float32Array(bondCount * 2 * 3);

    const elements = [...new Set(data.atoms.map(a => a.element))];
    const atomMaterials: Record<string, THREE.MeshPhongMaterial> = {};
    
    elements.forEach(element => {
      const props = ELEMENT_PROPERTIES[element as ElementType];
      atomMaterials[element] = new THREE.MeshPhongMaterial({
        color: props.color,
        shininess: 50,
        specular: 0x333333
      });
    });

    const atomsPerElement: Record<string, Atom[]> = {};
    data.atoms.forEach(atom => {
      if (!atomsPerElement[atom.element]) {
        atomsPerElement[atom.element] = [];
      }
      atomsPerElement[atom.element].push(atom);
    });

    const elementMeshes: THREE.InstancedMesh[] = [];
    const elementOffsets: Record<string, number> = {};
    let currentOffset = 0;

    Object.entries(atomsPerElement).forEach(([element, atoms]) => {
      const material = atomMaterials[element];
      const instancedMesh = new THREE.InstancedMesh(
        this.atomGeometry.clone(),
        material,
        atoms.length
      );
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      
      elementOffsets[element] = currentOffset;
      
      const props = ELEMENT_PROPERTIES[element as ElementType];
      const scale = props.vanDerWaalsRadius * 0.4;
      
      atoms.forEach((atom, localIndex) => {
        const globalIndex = currentOffset + localIndex;
        
        originalPositions[globalIndex * 3] = atom.x;
        originalPositions[globalIndex * 3 + 1] = atom.y;
        originalPositions[globalIndex * 3 + 2] = atom.z;
        
        atomPositions[globalIndex * 3] = atom.x;
        atomPositions[globalIndex * 3 + 1] = atom.y;
        atomPositions[globalIndex * 3 + 2] = atom.z;
        
        this.dummy.position.set(atom.x, atom.y, atom.z);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.updateMatrix();
        instancedMesh.setMatrixAt(localIndex, this.dummy.matrix);
        
        if (material) {
          this.color.setHex(props.color);
          instancedMesh.setColorAt(localIndex, this.color);
        }
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      
      elementMeshes.push(instancedMesh);
      group.add(instancedMesh);
      currentOffset += atoms.length;
    });

    const combinedAtomsMesh = this.combineInstancedMeshes(elementMeshes, atomCount);

    const bondMaterial = new THREE.MeshPhongMaterial({
      color: 0xAAAAAA,
      transparent: true,
      opacity: 0.7,
      shininess: 30
    });

    const bondsMesh = new THREE.InstancedMesh(
      this.bondGeometry.clone(),
      bondMaterial,
      bondCount
    );
    bondsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const atomMap = new Map<number, Atom>();
    data.atoms.forEach(atom => atomMap.set(atom.id, atom));

    data.bonds.forEach((bond, index) => {
      const atom1 = atomMap.get(bond.atom1);
      const atom2 = atomMap.get(bond.atom2);
      
      if (atom1 && atom2) {
        bondPositions[index * 6] = atom1.x;
        bondPositions[index * 6 + 1] = atom1.y;
        bondPositions[index * 6 + 2] = atom1.z;
        bondPositions[index * 6 + 3] = atom2.x;
        bondPositions[index * 6 + 4] = atom2.y;
        bondPositions[index * 6 + 5] = atom2.z;
        
        this.positionBond(bondsMesh, index, atom1, atom2, bond.order);
      }
    });
    bondsMesh.instanceMatrix.needsUpdate = true;
    group.add(bondsMesh);

    if (data.initialPosition) {
      group.position.set(
        data.initialPosition.x,
        data.initialPosition.y,
        data.initialPosition.z
      );
    }

    const result: MoleculeMesh = {
      group,
      atoms: combinedAtomsMesh,
      bonds: bondsMesh,
      atomPositions,
      bondPositions,
      originalPositions,
      data
    };

    if (data.activeSite && data.type === 'receptor') {
      result.activeSiteHighlight = this.createActiveSiteHighlight(data.activeSite);
      group.add(result.activeSiteHighlight);
    }

    return result;
  }

  private combineInstancedMeshes(
    meshes: THREE.InstancedMesh[],
    totalCount: number
  ): THREE.InstancedMesh {
    const combinedMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 50,
      specular: 0x333333
    });

    const combinedMesh = new THREE.InstancedMesh(
      this.atomGeometry.clone(),
      combinedMaterial,
      totalCount
    );
    combinedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    let globalIndex = 0;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    meshes.forEach(mesh => {
      const count = mesh.count;
      const matrix = new THREE.Matrix4();
      const instanceColor = mesh.instanceColor;
      
      for (let i = 0; i < count; i++) {
        mesh.getMatrixAt(i, matrix);
        combinedMesh.setMatrixAt(globalIndex, matrix);
        
        if (instanceColor) {
          const r = instanceColor.getX(i);
          const g = instanceColor.getY(i);
          const b = instanceColor.getZ(i);
          color.setRGB(r, g, b);
          combinedMesh.setColorAt(globalIndex, color);
        }
        
        globalIndex++;
      }
      
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    combinedMesh.instanceMatrix.needsUpdate = true;
    if (combinedMesh.instanceColor) {
      combinedMesh.instanceColor.needsUpdate = true;
    }

    return combinedMesh;
  }

  private positionBond(
    mesh: THREE.InstancedMesh,
    index: number,
    atom1: Atom,
    atom2: Atom,
    order: number
  ): void {
    const dx = atom2.x - atom1.x;
    const dy = atom2.y - atom1.y;
    const dz = atom2.z - atom1.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    this.dummy.position.set(atom1.x, atom1.y, atom1.z);
    this.dummy.scale.set(order > 1 ? 1.3 : 1, length, order > 1 ? 1.3 : 1);
    
    const axis = new THREE.Vector3(dx, dy, dz).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    this.dummy.quaternion.copy(quaternion);
    
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
  }

  private createActiveSiteHighlight(activeSite: ActiveSite): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(activeSite.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      activeSite.center.x,
      activeSite.center.y,
      activeSite.center.z
    );
    mesh.visible = false;
    
    return mesh;
  }

  public getAtomPosition(atoms: Atom[], atomId: number): THREE.Vector3 | null {
    const atom = atoms.find(a => a.id === atomId);
    if (!atom) return null;
    return new THREE.Vector3(atom.x, atom.y, atom.z);
  }

  public calculateBondLength(atom1: Atom, atom2: Atom): number {
    const dx = atom2.x - atom1.x;
    const dy = atom2.y - atom1.y;
    const dz = atom2.z - atom1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public getCenterOfMass(atoms: Atom[]): THREE.Vector3 {
    let totalMass = 0;
    let cx = 0, cy = 0, cz = 0;
    
    atoms.forEach(atom => {
      const props = ELEMENT_PROPERTIES[atom.element];
      totalMass += props.mass;
      cx += atom.x * props.mass;
      cy += atom.y * props.mass;
      cz += atom.z * props.mass;
    });
    
    return new THREE.Vector3(
      cx / totalMass,
      cy / totalMass,
      cz / totalMass
    );
  }

  public getBoundingBox(data: MoleculeData): THREE.Box3 {
    const box = new THREE.Box3();
    data.atoms.forEach(atom => {
      box.expandByPoint(new THREE.Vector3(atom.x, atom.y, atom.z));
    });
    return box;
  }

  public dispose(): void {
    this.atomGeometry.dispose();
    this.bondGeometry.dispose();
  }
}
