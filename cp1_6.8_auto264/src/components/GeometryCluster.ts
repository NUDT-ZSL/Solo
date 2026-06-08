import * as THREE from 'three';

interface GeoItem {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  rotSpeed: THREE.Vector3;
  floatOffset: number;
  floatAmplitude: number;
  baseY: number;
}

const glowVertexShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const glowFragmentShader = `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  rim = pow(rim, 3.0) * uIntensity;
  gl_FragColor = vec4(uColor, rim);
}
`;

export class GeometryCluster {
  group: THREE.Group;
  private items: GeoItem[] = [];

  constructor() {
    this.group = new THREE.Group();

    const configs: Array<{
      geo: THREE.BufferGeometry;
      pos: THREE.Vector3;
      color: THREE.Color;
      edgeColor: THREE.Color;
      rotSpeed: THREE.Vector3;
      scale: number;
    }> = [
      {
        geo: new THREE.IcosahedronGeometry(1.8, 0),
        pos: new THREE.Vector3(-5, 0, 2),
        color: new THREE.Color(0.85, 0.88, 0.98),
        edgeColor: new THREE.Color(0.6, 0.7, 1.0),
        rotSpeed: new THREE.Vector3(0.003, 0.005, 0.002),
        scale: 1.0,
      },
      {
        geo: new THREE.OctahedronGeometry(1.4, 0),
        pos: new THREE.Vector3(4, 1.5, -1),
        color: new THREE.Color(0.9, 0.85, 0.98),
        edgeColor: new THREE.Color(0.7, 0.55, 1.0),
        rotSpeed: new THREE.Vector3(0.004, 0.003, 0.006),
        scale: 1.0,
      },
      {
        geo: new THREE.TorusGeometry(1.6, 0.5, 16, 48),
        pos: new THREE.Vector3(0, -0.5, 3),
        color: new THREE.Color(0.88, 0.9, 0.96),
        edgeColor: new THREE.Color(0.5, 0.65, 1.0),
        rotSpeed: new THREE.Vector3(0.002, 0.006, 0.003),
        scale: 1.0,
      },
      {
        geo: new THREE.TorusKnotGeometry(1.2, 0.35, 64, 8, 2, 3),
        pos: new THREE.Vector3(-3, 2, -3),
        color: new THREE.Color(0.92, 0.88, 0.96),
        edgeColor: new THREE.Color(0.65, 0.5, 1.0),
        rotSpeed: new THREE.Vector3(0.003, 0.004, 0.002),
        scale: 1.0,
      },
      {
        geo: new THREE.SphereGeometry(1.2, 32, 24),
        pos: new THREE.Vector3(5, -1, 1),
        color: new THREE.Color(0.9, 0.92, 0.98),
        edgeColor: new THREE.Color(0.55, 0.75, 1.0),
        rotSpeed: new THREE.Vector3(0.002, 0.003, 0.001),
        scale: 1.0,
      },
    ];

    for (const cfg of configs) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.15,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.5,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(cfg.geo, mat);
      mesh.position.copy(cfg.pos);
      mesh.scale.setScalar(cfg.scale);

      const edgesGeo = new THREE.EdgesGeometry(cfg.geo, 15);
      const edgesMat = new THREE.LineBasicMaterial({
        color: cfg.edgeColor,
        transparent: true,
        opacity: 0.7,
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      const glowMat = new THREE.ShaderMaterial({
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        uniforms: {
          uColor: { value: cfg.edgeColor.clone() },
          uIntensity: { value: 1.5 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      const glowMesh = new THREE.Mesh(cfg.geo.clone(), glowMat);
      glowMesh.scale.setScalar(1.15);
      mesh.add(glowMesh);

      this.group.add(mesh);

      this.items.push({
        mesh,
        edges,
        rotSpeed: cfg.rotSpeed,
        floatOffset: Math.random() * Math.PI * 2,
        floatAmplitude: 0.15 + Math.random() * 0.1,
        baseY: cfg.pos.y,
      });
    }
  }

  update(elapsed: number): void {
    for (const item of this.items) {
      item.mesh.rotation.x += item.rotSpeed.x;
      item.mesh.rotation.y += item.rotSpeed.y;
      item.mesh.rotation.z += item.rotSpeed.z;
      item.mesh.position.y =
        item.baseY + Math.sin(elapsed * 0.5 + item.floatOffset) * item.floatAmplitude;
    }
  }

  getMeshes(): THREE.Mesh[] {
    return this.items.map((i) => i.mesh);
  }
}
