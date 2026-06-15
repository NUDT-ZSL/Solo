import * as THREE from 'three';

export class Sandglass {
  public group: THREE.Group;
  private topCone: THREE.Mesh;
  private bottomCone: THREE.Mesh;
  private neck: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private boundingRadiusTop = 4;
  private neckRadius = 2;
  private topHeight = 8;
  private bottomHeight = 8;
  private glowIntensity = 0;
  private isHovered = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const coneGeo = new THREE.ConeGeometry(this.boundingRadiusTop, this.topHeight, 48, 1, true);
    const bottomConeGeo = new THREE.ConeGeometry(this.boundingRadiusTop, this.bottomHeight, 48, 1, true);

    const coneMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6a8cff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.3,
      emissive: 0x4060ff,
      emissiveIntensity: 0.15,
      depthWrite: false,
    });

    this.topCone = new THREE.Mesh(coneGeo, coneMaterial);
    this.topCone.position.y = this.topHeight / 2;

    this.bottomCone = new THREE.Mesh(bottomConeGeo, coneMaterial);
    this.bottomCone.rotation.x = Math.PI;
    this.bottomCone.position.y = -this.bottomHeight / 2;

    const neckGeo = new THREE.CylinderGeometry(this.neckRadius, this.neckRadius, 0.4, 48);
    const neckMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8aaaff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      emissive: 0x6080ff,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.2,
      depthWrite: false,
    });
    this.neck = new THREE.Mesh(neckGeo, neckMaterial);
    this.neck.position.y = 0;

    const glowGeo = new THREE.SphereGeometry(this.boundingRadiusTop + 0.25, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x6688ff) },
        uIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float rim = 1.0 - max(dot(viewDir, normal), 0.0);
          rim = pow(rim, 3.0);
          float alpha = rim * (0.25 + uIntensity * 0.6);
          gl_FragColor = vec4(uColor * (0.5 + uIntensity * 0.5), alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMaterial);
    this.glowMesh.scale.set(1.05, 1.02, 1.05);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.35,
    });

    const topEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(coneGeo, 20),
      edgeMaterial
    );
    topEdges.position.copy(this.topCone.position);

    const bottomEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bottomConeGeo, 20),
      edgeMaterial
    );
    bottomEdges.position.copy(this.bottomCone.position);
    bottomEdges.rotation.x = Math.PI;

    this.group.add(this.topCone);
    this.group.add(this.bottomCone);
    this.group.add(this.neck);
    this.group.add(this.glowMesh);
    this.group.add(topEdges);
    this.group.add(bottomEdges);
  }

  public update(delta: number, normalizedMouse: THREE.Vector2) {
    this.mouse.copy(normalizedMouse);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      [this.topCone, this.bottomCone, this.neck],
      false
    );
    this.isHovered = intersects.length > 0;

    const targetIntensity = this.isHovered ? 1.0 : 0.4;
    this.glowIntensity += (targetIntensity - this.glowIntensity) * Math.min(delta * 4, 1);

    const mat = this.glowMesh.material as THREE.ShaderMaterial;
    mat.uniforms.uIntensity.value = this.glowIntensity;
  }

  public isMouseHovered(): boolean {
    return this.isHovered;
  }

  public getNeckPosition(): THREE.Vector3 {
    return this.neck.getWorldPosition(new THREE.Vector3());
  }

  public getSandglassParams() {
    return {
      topHeight: this.topHeight,
      bottomHeight: this.bottomHeight,
      topRadius: this.boundingRadiusTop,
      neckRadius: this.neckRadius,
    };
  }
}
