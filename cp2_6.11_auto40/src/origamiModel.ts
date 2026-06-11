import * as THREE from 'three';
import type { Triangle, FaceData } from './faceGenerator';

interface FaceMesh {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  group: THREE.Group;
  triangle: Triangle;
  hingeAxis: THREE.Vector3;
  hingePoint: THREE.Vector3;
  targetAngle: number;
  breathFrequency: number;
  breathAmplitude: number;
  breathPhase: number;
  isHighlighted: boolean;
  baseMaterial: THREE.MeshLambertMaterial;
  highlightMaterial: THREE.MeshLambertMaterial;
}

export interface OrigamiModelCallbacks {
  onFaceClick: (faceIndex: number, screenPos: { x: number; y: number }) => void;
}

export class OrigamiModel {
  public group: THREE.Group;
  private faces: FaceMesh[] = [];
  private animationProgress: number = 0;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private unfoldAnimationDuration: number = 2000;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = (2 * Math.PI) / 12000;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private callbacks: OrigamiModelCallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private dampingFactor: number = 0.9;
  private cameraTarget: THREE.Vector3;
  private cameraDistance: number = 300;
  private isCameraAnimating: boolean = false;
  private cameraAnimationStart: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private cameraAnimationProgress: number = 0;
  private highlightedFaceIndex: number = -1;
  private initialCameraPosition: THREE.Vector3;
  private initialCameraTarget: THREE.Vector3;
  private clock: THREE.Clock;
  private faceData: FaceData | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, callbacks: OrigamiModelCallbacks) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.callbacks = callbacks;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.initialCameraPosition = camera.position.clone();
    this.initialCameraTarget = this.cameraTarget.clone();

    this.clock = new THREE.Clock();

    this.setupInteraction();
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.rotationVelocity = { x: 0, y: 0 };
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.previousMouse.x;
        const dy = e.clientY - this.previousMouse.y;
        
        const rotationSpeed = 0.005;
        this.rotationVelocity.y = dx * rotationSpeed;
        this.rotationVelocity.x = dy * rotationSpeed;

        this.previousMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.isDragging) {
        const wasDragging = Math.abs(this.rotationVelocity.x) > 0.001 || Math.abs(this.rotationVelocity.y) > 0.001;
        this.isDragging = false;
        
        if (!wasDragging) {
          this.handleClick(e);
        }
      }
    });

    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.cameraDistance *= 1 + e.deltaY * zoomSpeed;
      this.cameraDistance = Math.max(150, Math.min(900, this.cameraDistance));
    }, { passive: false });
  }

  private handleClick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.faces.map(f => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const faceIndex = this.faces.findIndex(f => f.mesh === clickedMesh);
      
      if (faceIndex >= 0) {
        this.setHighlightedFace(faceIndex);
        this.callbacks.onFaceClick(faceIndex, { x: e.clientX, y: e.clientY });
      }
    }
  }

  public clearHighlight(): void {
    this.setHighlightedFace(-1);
  }

  private setHighlightedFace(index: number): void {
    if (this.highlightedFaceIndex >= 0 && this.highlightedFaceIndex < this.faces.length) {
      const prevFace = this.faces[this.highlightedFaceIndex];
      prevFace.mesh.material = prevFace.baseMaterial;
      prevFace.edges.material = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.6 
      });
      prevFace.isHighlighted = false;
    }

    this.highlightedFaceIndex = index;

    if (index >= 0 && index < this.faces.length) {
      const face = this.faces[index];
      face.mesh.material = face.highlightMaterial;
      face.edges.material = new THREE.LineBasicMaterial({ 
        color: 0x00B4FF, 
        transparent: true, 
        opacity: 1 
      });
      face.isHighlighted = true;
    }
  }

  public buildModel(faceData: FaceData): void {
    this.clearModel();
    this.faceData = faceData;

    const { triangles, imageWidth, imageHeight } = faceData;
    const scale = 200 / Math.max(imageWidth, imageHeight);
    const offsetX = -imageWidth * scale / 2;
    const offsetY = imageHeight * scale / 2;

    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i];
      
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        tri.a.x * scale + offsetX, -(tri.a.y * scale) + offsetY, 0,
        tri.b.x * scale + offsetX, -(tri.b.y * scale) + offsetY, 0,
        tri.c.x * scale + offsetX, -(tri.c.y * scale) + offsetY, 0
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();

      const color = new THREE.Color(tri.color.r / 255, tri.color.g / 255, tri.color.b / 255);
      
      const baseMaterial = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });

      const highlightMaterial = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1,
        emissive: 0x00B4FF,
        emissiveIntensity: 0.3
      });

      const mesh = new THREE.Mesh(geometry, baseMaterial);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0 
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);

      const group = new THREE.Group();
      group.add(mesh);
      group.add(edges);

      const { hingeAxis, hingePoint, targetAngle } = this.calculateHinge(i, triangles, scale, offsetX, offsetY);

      const faceMesh: FaceMesh = {
        mesh,
        edges,
        group,
        triangle: tri,
        hingeAxis,
        hingePoint,
        targetAngle,
        breathFrequency: 0.3 + Math.random() * 0.5,
        breathAmplitude: 2 + Math.random() * 2,
        breathPhase: Math.random() * Math.PI * 2,
        isHighlighted: false,
        baseMaterial,
        highlightMaterial
      };

      this.group.add(group);
      this.faces.push(faceMesh);
    }

    this.startUnfoldAnimation();
  }

  private calculateHinge(
    index: number, 
    triangles: Triangle[], 
    scale: number, 
    offsetX: number, 
    offsetY: number
  ): { hingeAxis: THREE.Vector3; hingePoint: THREE.Vector3; targetAngle: number } {
    const tri = triangles[index];
    const neighborIndices = tri.neighbors;
    
    let hingeEdge: { start: THREE.Vector3; end: THREE.Vector3 } | null = null;

    if (neighborIndices.length > 0) {
      const neighborIdx = neighborIndices[Math.floor(Math.random() * neighborIndices.length)];
      const neighbor = triangles[neighborIdx];
      
      const triPoints = [tri.a, tri.b, tri.c];
      const neighborPoints = [neighbor.a, neighbor.b, neighbor.c];
      
      const sharedPoints: THREE.Vector3[] = [];
      
      for (const tp of triPoints) {
        for (const np of neighborPoints) {
          if (Math.abs(tp.x - np.x) < 0.5 && Math.abs(tp.y - np.y) < 0.5) {
            sharedPoints.push(new THREE.Vector3(
              tp.x * scale + offsetX,
              -(tp.y * scale) + offsetY,
              0
            ));
            break;
          }
        }
      }

      if (sharedPoints.length >= 2) {
        hingeEdge = { start: sharedPoints[0], end: sharedPoints[1] };
      }
    }

    if (!hingeEdge) {
      const points = [tri.a, tri.b, tri.c];
      hingeEdge = {
        start: new THREE.Vector3(points[0].x * scale + offsetX, -(points[0].y * scale) + offsetY, 0),
        end: new THREE.Vector3(points[1].x * scale + offsetX, -(points[1].y * scale) + offsetY, 0)
      };
    }

    const axis = new THREE.Vector3().subVectors(hingeEdge.end, hingeEdge.start).normalize();
    const midPoint = new THREE.Vector3().addVectors(hingeEdge.start, hingeEdge.end).multiplyScalar(0.5);

    const foldDir = Math.random() > 0.5 ? 1 : -1;
    const angles = [Math.PI / 2, Math.PI * 0.75];
    const targetAngle = angles[Math.floor(Math.random() * angles.length)] * foldDir;

    return {
      hingeAxis: axis,
      hingePoint: midPoint,
      targetAngle
    };
  }

  private clearModel(): void {
    for (const face of this.faces) {
      this.group.remove(face.group);
      face.mesh.geometry.dispose();
      face.baseMaterial.dispose();
      face.highlightMaterial.dispose();
      face.edges.geometry.dispose();
      (face.edges.material as THREE.Material).dispose();
    }
    this.faces = [];
    this.faceData = null;
  }

  private startUnfoldAnimation(): void {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animationProgress = 0;
  }

  public startResetAnimation(): void {
    this.isCameraAnimating = true;
    this.cameraAnimationStart = {
      position: this.camera.position.clone(),
      target: this.cameraTarget.clone()
    };
    this.cameraAnimationProgress = 0;

    this.animationProgress = 1;
    this.isAnimating = true;
    this.animationStartTime = performance.now();

    setTimeout(() => {
      this.startUnfoldAnimation();
    }, 1000);
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  public isAutoRotateEnabled(): boolean {
    return this.autoRotate;
  }

  public getFaceData(index: number): { triangle: Triangle; faceData: FaceData } | null {
    if (!this.faceData || index < 0 || index >= this.faces.length) {
      return null;
    }
    return {
      triangle: this.faces[index].triangle,
      faceData: this.faceData
    };
  }

  public getFaceCount(): number {
    return this.faces.length;
  }

  public update(): void {
    const elapsed = this.clock.getElapsedTime();
    const now = performance.now();

    if (this.isAnimating) {
      const elapsedAnim = now - this.animationStartTime;
      const rawProgress = Math.min(1, elapsedAnim / this.unfoldAnimationDuration);
      const easedProgress = this.easeOutCubic(rawProgress);
      
      if (this.animationProgress <= 1 && rawProgress >= this.animationProgress) {
        this.animationProgress = easedProgress;
      } else {
        this.animationProgress = 1 - this.easeOutCubic(rawProgress);
      }

      if (rawProgress >= 1) {
        this.isAnimating = false;
        this.animationProgress = this.animationProgress > 0.5 ? 1 : 0;
      }
    }

    if (this.autoRotate && !this.isDragging) {
      this.rotationVelocity.y = this.autoRotateSpeed * 16;
    }

    if (Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001) {
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3(1, 0, 0);
      
      const quaternionY = new THREE.Quaternion().setFromAxisAngle(up, this.rotationVelocity.y);
      const quaternionX = new THREE.Quaternion().setFromAxisAngle(right, this.rotationVelocity.x);
      
      this.group.quaternion.premultiply(quaternionY);
      this.group.quaternion.premultiply(quaternionX);

      if (!this.isDragging) {
        this.rotationVelocity.x *= this.dampingFactor;
        this.rotationVelocity.y *= this.dampingFactor;
      }
    }

    if (this.isCameraAnimating && this.cameraAnimationStart) {
      this.cameraAnimationProgress += 0.016;
      const t = this.easeInOutCubic(Math.min(1, this.cameraAnimationProgress));

      this.camera.position.lerpVectors(
        this.cameraAnimationStart.position,
        this.initialCameraPosition,
        t
      );
      this.cameraTarget.lerpVectors(
        this.cameraAnimationStart.target,
        this.initialCameraTarget,
        t
      );

      if (t >= 1) {
        this.isCameraAnimating = false;
        this.cameraAnimationStart = null;
        this.group.quaternion.identity();
        this.rotationVelocity = { x: 0, y: 0 };
      }
    }

    for (const face of this.faces) {
      const angle = face.targetAngle * this.animationProgress;
      
      face.group.position.copy(face.hingePoint).negate();
      face.group.position.applyAxisAngle(face.hingeAxis, angle);
      face.group.position.add(face.hingePoint);

      const rotationQuat = new THREE.Quaternion().setFromAxisAngle(face.hingeAxis, angle);
      face.group.quaternion.copy(rotationQuat);

      const breathOffset = Math.sin(elapsed * face.breathFrequency * Math.PI * 2 + face.breathPhase) * face.breathAmplitude;
      const breathDir = new THREE.Vector3(0, 0, 1);
      breathDir.applyQuaternion(rotationQuat);
      breathDir.multiplyScalar(breathOffset * this.animationProgress);
      
      face.group.position.add(breathDir);

      const edgeMat = face.edges.material as THREE.LineBasicMaterial;
      if (this.animationProgress < 0.95) {
        edgeMat.opacity = this.animationProgress * 0.6;
      } else if (!face.isHighlighted) {
        edgeMat.opacity = 0.6;
      }
    }

    if (!this.isCameraAnimating) {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.camera.position.copy(this.cameraTarget).add(
        direction.multiplyScalar(-this.cameraDistance)
      );
    }
    
    this.camera.lookAt(this.cameraTarget);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    this.clearModel();
    this.scene.remove(this.group);
  }
}
