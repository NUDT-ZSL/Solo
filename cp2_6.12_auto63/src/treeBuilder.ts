import * as THREE from 'three';
import { BranchSegment, LSystemParams } from './lsystem';

export interface TreeBuildResult {
  group: THREE.Group;
  branchCount: number;
  leafCount: number;
  maxDepth: number;
  branchMeshes: THREE.Mesh[][];
  leafMeshes: THREE.Mesh[][];
}

interface AnimationState {
  startTime: number;
  duration: number;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

let animationFrameId: number | null = null;
const activeAnimations: Map<string, AnimationState> = new Map();

function easeOutElastic(t: number): number {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createBranchMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
}

function createLeafMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  });
}

export function buildTree(
  segments: BranchSegment[],
  params: LSystemParams
): TreeBuildResult {
  if (!segments || segments.length === 0) {
    console.warn('buildTree: Empty segments array');
    return {
      group: new THREE.Group(),
      branchCount: 0,
      leafCount: 0,
      maxDepth: 0,
      branchMeshes: [],
      leafMeshes: [],
    };
  }

  const group = new THREE.Group();
  const maxDepth = Math.max(...segments.map(s => s.depth));
  
  const branchMeshes: THREE.Mesh[][] = Array.from({ length: maxDepth + 1 }, () => []);
  const leafMeshes: THREE.Mesh[][] = Array.from({ length: maxDepth + 1 }, () => []);
  
  let branchCount = 0;
  let leafCount = 0;

  for (const segment of segments) {
    const start = segment.start;
    const end = segment.end;
    const depth = segment.depth;

    const direction = end.clone().sub(start);
    const length = direction.length();
    
    if (length <= 0.01) continue;

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    const thickness = Math.max(0.1, 0.8 * Math.pow(params.lengthDecay, depth));
    
    const branchGeometry = new THREE.CylinderGeometry(
      thickness * 0.7,
      thickness,
      length,
      8
    );
    
    const branchMaterial = createBranchMaterial();
    const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
    
    branchMesh.position.copy(midPoint);
    branchMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    
    branchMesh.userData.depth = depth;
    branchMesh.userData.type = 'branch';
    
    group.add(branchMesh);
    branchMeshes[depth].push(branchMesh);
    branchCount++;

    if (segment.hasLeaf) {
      const leafSize = Math.max(0.3, 2 * Math.pow(params.lengthDecay, depth));
      
      for (let i = 0; i < 3; i++) {
        const leafGeometry = new THREE.ConeGeometry(leafSize * 0.3, leafSize, 4);
        const leafMaterial = createLeafMaterial();
        const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);
        
        leafMesh.position.copy(end);
        leafMesh.rotation.x = (Math.random() - 0.5) * Math.PI * 0.5;
        leafMesh.rotation.z = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        leafMesh.position.y += leafSize * 0.5;
        
        leafMesh.userData.depth = depth;
        leafMesh.userData.type = 'leaf';
        leafMesh.userData.originalScale = leafMesh.scale.clone();
        
        group.add(leafMesh);
        leafMeshes[depth].push(leafMesh);
        leafCount++;
      }
    }
  }

  return {
    group,
    branchCount,
    leafCount,
    maxDepth,
    branchMeshes,
    leafMeshes,
  };
}

export function dissolveAnimation(
  treeResult: TreeBuildResult,
  duration: number = 0.5,
  onComplete?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const { branchMeshes, leafMeshes, maxDepth } = treeResult;
    const layerDelay = 0.05;
    
    const allMeshes: { mesh: THREE.Mesh; depth: number; isLeaf: boolean }[] = [];
    
    for (let d = 0; d <= maxDepth; d++) {
      branchMeshes[d]?.forEach(m => allMeshes.push({ mesh: m, depth: d, isLeaf: false }));
      leafMeshes[d]?.forEach(m => allMeshes.push({ mesh: m, depth: d, isLeaf: true }));
    }
    
    const startTime = performance.now();
    
    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      
      allMeshes.forEach(({ mesh, depth }) => {
        const layerStartTime = depth * layerDelay;
        const layerElapsed = elapsed - layerStartTime;
        
        if (layerElapsed <= 0) return;
        
        const layerProgress = Math.min(1, layerElapsed / (duration - layerStartTime));
        const material = mesh.material as THREE.MeshStandardMaterial;
        
        if (!material.transparent) {
          material.transparent = true;
        }
        
        material.opacity = Math.max(0, 1 - easeInOutQuad(layerProgress));
        
        if (layerProgress > 0.5) {
          mesh.position.y -= easeInOutQuad((layerProgress - 0.5) * 2) * 0.5;
        }
      });
      
      if (elapsed < duration + maxDepth * layerDelay) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        allMeshes.forEach(({ mesh }) => {
          mesh.visible = false;
        });
        if (onComplete) onComplete();
        resolve();
      }
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animate();
  });
}

export function growInAnimation(
  treeResult: TreeBuildResult,
  duration: number = 2,
  onComplete?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const { branchMeshes, leafMeshes, maxDepth } = treeResult;
    const layerDelay = 0.05;
    
    const allMeshes: { mesh: THREE.Mesh; depth: number; isLeaf: boolean }[] = [];
    
    for (let d = 0; d <= maxDepth; d++) {
      branchMeshes[d]?.forEach(m => {
        allMeshes.push({ mesh: m, depth: d, isLeaf: false });
        m.visible = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0;
        m.scale.set(0.01, 0.01, 0.01);
      });
      leafMeshes[d]?.forEach(m => {
        allMeshes.push({ mesh: m, depth: d, isLeaf: true });
        m.visible = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0;
        m.scale.set(0.01, 0.01, 0.01);
      });
    }
    
    const startTime = performance.now();
    
    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      
      allMeshes.forEach(({ mesh, depth, isLeaf }) => {
        const layerStartTime = depth * layerDelay;
        const layerElapsed = elapsed - layerStartTime;
        
        if (layerElapsed <= 0) return;
        
        const layerProgress = Math.min(1, layerElapsed / (duration - layerStartTime));
        const material = mesh.material as THREE.MeshStandardMaterial;
        
        material.opacity = Math.min(1, easeInOutQuad(layerProgress));
        
        const scaleProgress = isLeaf 
          ? easeOutElastic(layerProgress)
          : easeInOutQuad(layerProgress);
        
        mesh.scale.setScalar(Math.max(0.01, scaleProgress));
        
        if (layerProgress >= 1) {
          material.transparent = false;
        }
      });
      
      if (elapsed < duration + maxDepth * layerDelay) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
        resolve();
      }
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animate();
  });
}

export function playbackGrowthAnimation(
  treeResult: TreeBuildResult,
  layerDuration: number = 0.3,
  onProgress?: (currentLayer: number, totalLayers: number) => void,
  onComplete?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const { branchMeshes, leafMeshes, maxDepth } = treeResult;
    
    for (let d = 0; d <= maxDepth; d++) {
      [...branchMeshes[d], ...leafMeshes[d]].forEach(m => {
        m.visible = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0;
        m.scale.set(0.01, 0.01, 0.01);
      });
    }
    
    let currentLayer = 0;
    const totalLayers = maxDepth + 1;
    
    function showLayer(layer: number) {
      const layerMeshes = [...branchMeshes[layer], ...leafMeshes[layer]];
      const startTime = performance.now();
      
      layerMeshes.forEach(m => {
        m.visible = true;
      });
      
      function animate() {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(1, elapsed / layerDuration);
        
        layerMeshes.forEach(m => {
          const mat = m.material as THREE.MeshStandardMaterial;
          const scale = easeOutElastic(progress);
          m.scale.setScalar(Math.max(0.01, scale));
          mat.opacity = Math.min(1, progress);
          
          if (progress >= 1) {
            mat.transparent = false;
          }
        });
        
        if (elapsed < layerDuration) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          if (onProgress) onProgress(layer + 1, totalLayers);
          
          if (layer < maxDepth) {
            currentLayer = layer + 1;
            showLayer(currentLayer);
          } else {
            if (onComplete) onComplete();
            resolve();
          }
        }
      }
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animate();
    }
    
    if (onProgress) onProgress(0, totalLayers);
    showLayer(0);
  });
}

export function createParticleBurst(position: THREE.Vector3, count: number = 50): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(5 + Math.random() * 10);
    
    velocities.push(velocity);
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  (geometry as any).userData.velocities = velocities;
  
  const material = new THREE.PointsMaterial({
    color: 0x00ff88,
    size: 0.3,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
  });
  
  return new THREE.Points(geometry, material);
}

export function dissolveParticles(
  particles: THREE.Points,
  duration: number = 1,
  onComplete?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const velocities = (particles.geometry as any).userData.velocities as THREE.Vector3[];
    const material = particles.material as THREE.PointsMaterial;
    
    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);
      
      for (let i = 0; i < velocities.length; i++) {
        const vel = velocities[i];
        positions[i * 3] += vel.x * 0.016;
        positions[i * 3 + 1] += vel.y * 0.016;
        positions[i * 3 + 2] += vel.z * 0.016;
        
        vel.y -= 0.1;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      material.opacity = Math.max(0, 1 - progress);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        particles.visible = false;
        if (onComplete) onComplete();
        resolve();
      }
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animate();
  });
}

export function gatherParticles(
  particles: THREE.Points,
  targetPosition: THREE.Vector3,
  duration: number = 1.2,
  onComplete?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const material = particles.material as THREE.PointsMaterial;
    
    particles.visible = true;
    material.opacity = 1;
    
    const startPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 20;
      const height = Math.random() * 40;
      
      startPositions[i] = targetPosition.x + Math.cos(angle) * radius;
      startPositions[i + 1] = targetPosition.y + height;
      startPositions[i + 2] = targetPosition.z + Math.sin(angle) * radius;
      
      positions[i] = startPositions[i];
      positions[i + 1] = startPositions[i + 1];
      positions[i + 2] = startPositions[i + 2];
    }
    
    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeInOutQuad(progress);
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = startPositions[i] + (targetPosition.x - startPositions[i]) * easedProgress;
        positions[i + 1] = startPositions[i + 1] + (targetPosition.y - startPositions[i + 1]) * easedProgress;
        positions[i + 2] = startPositions[i + 2] + (targetPosition.z - startPositions[i + 2]) * easedProgress;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      if (progress > 0.7) {
        material.opacity = 1 - (progress - 0.7) / 0.3;
      }
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        particles.visible = false;
        if (onComplete) onComplete();
        resolve();
      }
    }
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animate();
  });
}
