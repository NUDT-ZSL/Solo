import * as THREE from 'three';

export interface Bubble {
  id: number;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  baseSpeed: number;
  radius: number;
  color: THREE.Color;
  highlighted: boolean;
  wobblePhase: number;
  wobbleSpeed: number;
}

export interface LavaLampParams {
  temperature: number;
  bubbleCount: number;
  refractionIndex: number;
}

export class LavaLamp {
  public group: THREE.Group;
  public bubbles: Bubble[] = [];
  public container!: THREE.Mesh;
  public innerLiquid!: THREE.Mesh;
  public params: LavaLampParams;
  
  private nextId = 0;
  private containerHeight = 5;
  private containerRadius = 1.3;
  private bubbleMaterial: THREE.MeshPhysicalMaterial;
  private raycaster = new THREE.Raycaster();
  
  constructor(scene: THREE.Scene, params: LavaLampParams) {
    this.params = params;
    this.group = new THREE.Group();
    scene.add(this.group);
    
    this.createContainer();
    this.createInnerLiquid();
    
    this.bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.3,
      thickness: 0.5,
      ior: params.refractionIndex,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0xff3300,
      emissiveIntensity: 0.2
    });
    
    for (let i = 0; i < params.bubbleCount; i++) {
      this.addBubble();
    }
  }
  
  private createContainer(): void {
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.15,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.3,
      ior: 1.5,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0
    });
    
    const containerGroup = new THREE.Group();
    
    const bottomSphereGeo = new THREE.SphereGeometry(this.containerRadius, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottomSphere = new THREE.Mesh(bottomSphereGeo, glassMaterial);
    bottomSphere.position.y = -this.containerHeight / 2;
    bottomSphere.rotation.x = Math.PI;
    containerGroup.add(bottomSphere);
    
    const topSphereGeo = new THREE.SphereGeometry(this.containerRadius, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2);
    const topSphere = new THREE.Mesh(topSphereGeo, glassMaterial);
    topSphere.position.y = this.containerHeight / 2;
    containerGroup.add(topSphere);
    
    const cylinderGeo = new THREE.CylinderGeometry(this.containerRadius, this.containerRadius, this.containerHeight, 48, 1, true);
    const cylinder = new THREE.Mesh(cylinderGeo, glassMaterial);
    containerGroup.add(cylinder);
    
    this.container = new THREE.Mesh(new THREE.SphereGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    this.container.visible = false;
    containerGroup.add(this.container);
    
    this.group.add(containerGroup);
    
    const baseGeo = new THREE.CylinderGeometry(this.containerRadius * 1.1, this.containerRadius * 1.2, 0.4, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x222233,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -this.containerHeight / 2 - 0.2;
    this.group.add(base);
    
    const topCapGeo = new THREE.CylinderGeometry(this.containerRadius * 0.9, this.containerRadius * 1.0, 0.3, 48);
    const topCap = new THREE.Mesh(topCapGeo, baseMat);
    topCap.position.y = this.containerHeight / 2 + 0.15;
    this.group.add(topCap);
  }
  
  private createInnerLiquid(): void {
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a0a1a,
      transparent: true,
      opacity: 0.4,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.8,
      thickness: 1.0,
      ior: 1.33
    });
    
    const liquidGroup = new THREE.Group();
    
    const bottomGeo = new THREE.SphereGeometry(this.containerRadius * 0.97, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottom = new THREE.Mesh(bottomGeo, liquidMaterial);
    bottom.position.y = -this.containerHeight / 2;
    bottom.rotation.x = Math.PI;
    liquidGroup.add(bottom);
    
    const topGeo = new THREE.SphereGeometry(this.containerRadius * 0.97, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, liquidMaterial);
    top.position.y = this.containerHeight / 2;
    liquidGroup.add(top);
    
    const cylGeo = new THREE.CylinderGeometry(this.containerRadius * 0.97, this.containerRadius * 0.97, this.containerHeight, 32, 1, true);
    const cyl = new THREE.Mesh(cylGeo, liquidMaterial);
    liquidGroup.add(cyl);
    
    this.innerLiquid = new THREE.Mesh(new THREE.SphereGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    this.innerLiquid.visible = false;
    liquidGroup.add(this.innerLiquid);
    
    this.group.add(liquidGroup);
  }
  
  private randomWarmColor(): THREE.Color {
    const hue = 15 + Math.random() * 30;
    const saturation = 80 + Math.random() * 20;
    const lightness = 45 + Math.random() * 15;
    return new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);
  }
  
  private addBubble(initialRadius?: number, initialPos?: THREE.Vector3, initialColor?: THREE.Color): Bubble {
    const radius = initialRadius ?? (0.2 + Math.random() * 0.4);
    const color = initialColor ?? this.randomWarmColor();
    
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = this.bubbleMaterial.clone();
    material.color = color.clone();
    material.emissive = color.clone();
    material.emissiveIntensity = 0.15;
    
    const mesh = new THREE.Mesh(geometry, material);
    
    if (initialPos) {
      mesh.position.copy(initialPos);
    } else {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.containerRadius - radius - 0.1);
      mesh.position.set(
        Math.cos(angle) * r,
        -this.containerHeight / 2 + Math.random() * this.containerHeight,
        Math.sin(angle) * r
      );
    }
    
    this.group.add(mesh);
    
    const bubble: Bubble = {
      id: this.nextId++,
      mesh,
      velocity: new THREE.Vector3(0, (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.4), 0),
      baseSpeed: 0.1 + Math.random() * 0.4,
      radius,
      color,
      highlighted: false,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random() * 1.5
    };
    
    this.bubbles.push(bubble);
    return bubble;
  }
  
  private removeBubble(bubble: Bubble): void {
    this.group.remove(bubble.mesh);
    bubble.mesh.geometry.dispose();
    (bubble.mesh.material as THREE.Material).dispose();
    const idx = this.bubbles.indexOf(bubble);
    if (idx >= 0) this.bubbles.splice(idx, 1);
  }
  
  public setBubbleCount(count: number): void {
    count = Math.max(5, Math.min(20, count));
    this.params.bubbleCount = count;
    
    while (this.bubbles.length < count) {
      this.addBubble();
    }
    
    while (this.bubbles.length > count) {
      let smallestIdx = 0;
      for (let i = 1; i < this.bubbles.length; i++) {
        if (this.bubbles[i].radius < this.bubbles[smallestIdx].radius) {
          smallestIdx = i;
        }
      }
      const bubble = this.bubbles[smallestIdx];
      
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < this.bubbles.length; i++) {
        if (i === smallestIdx) continue;
        const d = bubble.mesh.position.distanceTo(this.bubbles[i].mesh.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      
      if (nearestIdx >= 0) {
        const target = this.bubbles[nearestIdx];
        const newRadius = Math.min(0.6, Math.cbrt(Math.pow(target.radius, 3) + Math.pow(bubble.radius, 3)));
        const totalVolume = Math.pow(target.radius, 3) + Math.pow(bubble.radius, 3);
        const targetRatio = Math.pow(target.radius, 3) / totalVolume;
        const bubbleRatio = Math.pow(bubble.radius, 3) / totalVolume;
        
        target.color = new THREE.Color(
          target.color.r * targetRatio + bubble.color.r * bubbleRatio,
          target.color.g * targetRatio + bubble.color.g * bubbleRatio,
          target.color.b * targetRatio + bubble.color.b * bubbleRatio
        );
        target.radius = newRadius;
        this.updateBubbleGeometry(target);
      }
      
      this.removeBubble(bubble);
    }
  }
  
  private updateBubbleGeometry(bubble: Bubble): void {
    bubble.mesh.geometry.dispose();
    bubble.mesh.geometry = new THREE.SphereGeometry(bubble.radius, 32, 32);
    const mat = bubble.mesh.material as THREE.MeshPhysicalMaterial;
    mat.color = bubble.color.clone();
    mat.emissive = bubble.color.clone();
  }
  
  public setTemperature(t: number): void {
    this.params.temperature = Math.max(0, Math.min(100, t));
  }
  
  public setRefractionIndex(ior: number): void {
    this.params.refractionIndex = Math.max(1.3, Math.min(1.5, ior));
    for (const bubble of this.bubbles) {
      (bubble.mesh.material as THREE.MeshPhysicalMaterial).ior = this.params.refractionIndex;
    }
  }
  
  public handleClick(
    camera: THREE.PerspectiveCamera,
    mouseX: number,
    mouseY: number,
    domElement: HTMLElement
  ): Bubble | null {
    const rect = domElement.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const y = -((mouseY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const meshes = this.bubbles.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      for (const bubble of this.bubbles) {
        if (bubble.mesh === hitMesh) {
          for (const b of this.bubbles) {
            if (b !== bubble && b.highlighted) {
              b.highlighted = false;
              (b.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.15;
            }
          }
          bubble.highlighted = !bubble.highlighted;
          (bubble.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 
            bubble.highlighted ? 0.5 : 0.15;
          return bubble.highlighted ? bubble : null;
        }
      }
    }
    return null;
  }
  
  public update(deltaTime: number): void {
    const tempFactor = 0.5 + (this.params.temperature / 100) * 1.5;
    const halfHeight = this.containerHeight / 2;
    const innerRadius = this.containerRadius * 0.95;
    
    for (const bubble of this.bubbles) {
      const speedMod = bubble.highlighted ? 0.5 : 1.0;
      
      bubble.wobblePhase += bubble.wobbleSpeed * deltaTime;
      
      const buoyancy = (bubble.radius - 0.4) * 2.0;
      bubble.velocity.y += buoyancy * deltaTime * tempFactor;
      
      const maxSpeed = bubble.baseSpeed * tempFactor * speedMod;
      if (bubble.velocity.y > maxSpeed) bubble.velocity.y = maxSpeed;
      if (bubble.velocity.y < -maxSpeed) bubble.velocity.y = -maxSpeed;
      
      bubble.velocity.y *= 0.98;
      
      bubble.velocity.x = Math.sin(bubble.wobblePhase) * 0.1 * tempFactor;
      bubble.velocity.z = Math.cos(bubble.wobblePhase * 0.7) * 0.1 * tempFactor;
      
      bubble.mesh.position.addScaledVector(bubble.velocity, deltaTime);
      
      const distFromCenter = Math.sqrt(
        bubble.mesh.position.x ** 2 + bubble.mesh.position.z ** 2
      );
      const maxRadial = innerRadius - bubble.radius;
      if (distFromCenter > maxRadial) {
        const scale = maxRadial / distFromCenter;
        bubble.mesh.position.x *= scale;
        bubble.mesh.position.z *= scale;
      }
      
      const topLimit = halfHeight - bubble.radius;
      const bottomLimit = -halfHeight + bubble.radius;
      
      if (bubble.mesh.position.y > topLimit) {
        bubble.mesh.position.y = topLimit;
        bubble.velocity.y = -Math.abs(bubble.velocity.y) * 0.6;
      }
      if (bubble.mesh.position.y < bottomLimit) {
        bubble.mesh.position.y = bottomLimit;
        bubble.velocity.y = Math.abs(bubble.velocity.y) * 0.6;
      }
    }
    
    this.handleCollisions();
  }
  
  private handleCollisions(): void {
    const toMerge: Array<[Bubble, Bubble]> = [];
    const toSplit: Bubble[] = [];
    
    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        const a = this.bubbles[i];
        const b = this.bubbles[j];
        const dist = a.mesh.position.distanceTo(b.mesh.position);
        const minDist = a.radius + b.radius;
        
        if (dist < minDist * 0.85 && Math.random() < 0.02) {
          toMerge.push([a, b]);
        } else if (dist < minDist) {
          const overlap = minDist - dist;
          const dir = new THREE.Vector3()
            .subVectors(a.mesh.position, b.mesh.position)
            .normalize();
          
          a.mesh.position.addScaledVector(dir, overlap * 0.5);
          b.mesh.position.addScaledVector(dir, -overlap * 0.5);
          
          const relVel = new THREE.Vector3().subVectors(a.velocity, b.velocity);
          const velAlongNormal = relVel.dot(dir);
          
          if (velAlongNormal > 0) {
            const impulse = velAlongNormal * 0.8;
            a.velocity.addScaledVector(dir, -impulse);
            b.velocity.addScaledVector(dir, impulse);
          }
        }
      }
    }
    
    const mergedIds = new Set<number>();
    for (const [a, b] of toMerge) {
      if (mergedIds.has(a.id) || mergedIds.has(b.id)) continue;
      if (this.bubbles.length <= 5) continue;
      
      mergedIds.add(a.id);
      mergedIds.add(b.id);
      
      const totalVolume = Math.pow(a.radius, 3) + Math.pow(b.radius, 3);
      const newRadius = Math.min(0.6, Math.cbrt(totalVolume));
      const aRatio = Math.pow(a.radius, 3) / totalVolume;
      const bRatio = Math.pow(b.radius, 3) / totalVolume;
      
      const newPos = new THREE.Vector3()
        .addScaledVector(a.mesh.position, aRatio)
        .addScaledVector(b.mesh.position, bRatio);
      
      const newColor = new THREE.Color(
        a.color.r * aRatio + b.color.r * bRatio,
        a.color.g * aRatio + b.color.g * bRatio,
        a.color.b * aRatio + b.color.b * bRatio
      );
      
      this.removeBubble(a);
      this.removeBubble(b);
      
      const merged = this.addBubble(newRadius, newPos, newColor);
      merged.velocity.copy(a.velocity).add(b.velocity).multiplyScalar(0.5);
    }
    
    for (const bubble of this.bubbles) {
      if (bubble.radius > 0.5 && Math.random() < 0.003 && this.bubbles.length < 20) {
        toSplit.push(bubble);
      }
    }
    
    for (const bubble of toSplit) {
      if (this.bubbles.length >= 20) break;
      
      const splitCount = 2 + Math.floor(Math.random() * 2);
      const volumePerBubble = Math.pow(bubble.radius, 3) / splitCount;
      const newRadius = Math.max(0.2, Math.cbrt(volumePerBubble));
      
      for (let k = 0; k < splitCount; k++) {
        const angle = (k / splitCount) * Math.PI * 2;
        const offset = new THREE.Vector3(
          Math.cos(angle) * bubble.radius * 0.5,
          (Math.random() - 0.5) * bubble.radius * 0.5,
          Math.sin(angle) * bubble.radius * 0.5
        );
        const newPos = new THREE.Vector3().copy(bubble.mesh.position).add(offset);
        
        const hueShift = (Math.random() - 0.5) * 10 / 360;
        const hsl = { h: 0, s: 0, l: 0 };
        bubble.color.getHSL(hsl);
        const newColor = new THREE.Color().setHSL(
          Math.max(15 / 360, Math.min(45 / 360, hsl.h + hueShift)),
          hsl.s,
          hsl.l
        );
        
        const nb = this.addBubble(newRadius, newPos, newColor);
        nb.velocity.copy(bubble.velocity).multiplyScalar(0.7);
        nb.velocity.x += (Math.random() - 0.5) * 0.2;
        nb.velocity.z += (Math.random() - 0.5) * 0.2;
      }
      
      this.removeBubble(bubble);
    }
  }
  
  public dispose(): void {
    for (const bubble of [...this.bubbles]) {
      this.removeBubble(bubble);
    }
    this.bubbleMaterial.dispose();
  }
}
