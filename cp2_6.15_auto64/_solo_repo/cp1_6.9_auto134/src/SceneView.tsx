import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SandSystem, PARTICLE_COUNT, SAND_AREA } from './SandSystem';

interface SceneViewProps {
  sandSystem: SandSystem;
  onFpsUpdate: (fps: number) => void;
}

interface SandParticlesProps {
  sandSystem: SandSystem;
}

const SandParticles: React.FC<SandParticlesProps> = ({ sandSystem }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const glowPointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    sandSystem.update(delta);

    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
      const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;

      posAttr.array.set(sandSystem.positions);
      colorAttr.array.set(sandSystem.colors);
      sizeAttr.array.set(sandSystem.sizes);

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    if (glowPointsRef.current) {
      const geometry = glowPointsRef.current.geometry;
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      posAttr.array.set(sandSystem.positions);
      posAttr.needsUpdate = true;
    }
  });

  const { geometry, glowGeometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT), 1));

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    glowGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));

    return { geometry: geo, glowGeometry: glowGeo };
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vHighlight;
        void main() {
          vColor = color;
          vHighlight = size > 3.5 ? 1.0 : 0.0;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vHighlight;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          vec3 color = vColor;
          if (vHighlight > 0.5) {
            float spec = pow(1.0 - dist, 8.0);
            color += vec3(spec * 0.8);
          }
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.3;
          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  return (
    <group>
      <points ref={glowPointsRef} geometry={glowGeometry} material={glowMaterial} />
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
};

interface ScanLightProps {
  sandSystem: SandSystem;
}

const ScanLight: React.FC<ScanLightProps> = ({ sandSystem }) => {
  const coneRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const data = sandSystem.getScanLightData();
    if (coneRef.current) {
      coneRef.current.position.copy(data.position);
      const direction = data.direction.clone();
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
      coneRef.current.quaternion.copy(quaternion);
    }
  });

  const coneGeometry = useMemo(() => {
    const height = SAND_AREA * 2;
    const radius = Math.tan(((30 * Math.PI) / 180) / 2) * height;
    return new THREE.ConeGeometry(radius, height, 64, 1, true);
  }, []);

  const coneMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topAlpha: { value: 0.0 },
        bottomAlpha: { value: 0.0 },
        edgeColor: { value: new THREE.Color(0.8, 0.9, 1.0) },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying float vY;
        void main() {
          vPosition = position;
          vY = (position.y + 50.0) / 100.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        varying float vY;
        uniform float topAlpha;
        uniform float bottomAlpha;
        uniform vec3 edgeColor;
        void main() {
          float dist = length(vPosition.xz);
          float radiusAtY = (50.0 - vPosition.y) * tan(15.0 * 3.14159 / 180.0);
          float edgeFactor = 1.0 - smoothstep(radiusAtY * 0.95, radiusAtY, dist);
          float alpha = mix(0.6, 0.0, 1.0 - vY);
          alpha = mix(alpha, 0.0, 1.0 - edgeFactor);
          vec3 color = mix(vec3(1.0), edgeColor, 1.0 - edgeFactor);
          gl_FragColor = vec4(color, alpha * 0.4);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  return (
    <group ref={coneRef}>
      <mesh geometry={coneGeometry} material={coneMaterial} />
    </group>
  );
};

interface RippleRingsProps {
  sandSystem: SandSystem;
}

const RippleRings: React.FC<RippleRingsProps> = ({ sandSystem }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const ripples = sandSystem.getRipplesData();
    const meshCount = groupRef.current.children.length;

    for (let i = 0; i < Math.max(meshCount, ripples.length); i++) {
      if (i < ripples.length) {
        let mesh: THREE.Mesh;
        if (i < meshCount) {
          mesh = groupRef.current.children[i] as THREE.Mesh;
          mesh.visible = true;
        } else {
          const ringGeometry = new THREE.RingGeometry(1, 1, 64);
          const ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
              uProgress: { value: 0 },
            },
            vertexShader: `
              varying float vProgress;
              varying float vRadial;
              uniform float uProgress;
              void main() {
                vProgress = uProgress;
                vRadial = position.x;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              varying float vProgress;
              varying float vRadial;
              void main() {
                float alpha = 0.5 * (1.0 - vProgress);
                float fade = smoothstep(0.95, 1.0, vProgress) * 0.0 + smoothstep(0.0, 0.1, vProgress);
                gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * fade);
              }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          mesh = new THREE.Mesh(ringGeometry, ringMaterial);
          groupRef.current.add(mesh);
        }

        const ripple = ripples[i];
        const radius = ripple.maxRadius * ripple.progress;
        const innerRadius = Math.max(0, radius - 0.1);
        const outerRadius = radius + 0.1;

        (mesh.material as THREE.ShaderMaterial).uniforms.uProgress.value = ripple.progress;
        (mesh.material as THREE.ShaderMaterial).needsUpdate = true;

        mesh.geometry.dispose();
        mesh.geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);

        mesh.position.set(ripple.center.x, 0.3, ripple.center.y);
        mesh.rotation.x = -Math.PI / 2;
      } else if (i < meshCount) {
        (groupRef.current.children[i] as THREE.Mesh).visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
};

const SceneBackground: React.FC = () => {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1F2833');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;
  }, [scene]);

  return null;
};

interface FpsTrackerProps {
  onFpsUpdate: (fps: number) => void;
}

const FpsTracker: React.FC<FpsTrackerProps> = ({ onFpsUpdate }) => {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 1000) {
      onFpsUpdate(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  return null;
};

interface ClickHandlerProps {
  sandSystem: SandSystem;
  onCameraZoom?: (zoomDelta: number) => void;
}

const ClickHandler: React.FC<ClickHandlerProps> = ({ sandSystem }) => {
  const { camera, gl } = useThree();
  const clickAnimRef = useRef<{ active: boolean; progress: number }>({ active: false, progress: 0 });
  const origCamPosRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (clickAnimRef.current.active && origCamPosRef.current) {
      clickAnimRef.current.progress += 0.12;
      const t = clickAnimRef.current.progress;
      
      if (t < 1) {
        const pulseT = t < 0.5 ? t * 2 : 2 - t * 2;
        const zoomAmount = -0.2 * Math.sin(pulseT * Math.PI);
        const dir = camera.position.clone().normalize();
        camera.position.copy(
          origCamPosRef.current.clone().add(dir.multiplyScalar(zoomAmount))
        );
      } else {
        camera.position.copy(origCamPosRef.current);
        clickAnimRef.current = { active: false, progress: 0 };
        origCamPosRef.current = null;
      }
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);

      if (intersect) {
        sandSystem.addRipple(intersect.x, intersect.z);
        
        if (!clickAnimRef.current.active) {
          origCamPosRef.current = camera.position.clone();
          clickAnimRef.current = { active: true, progress: 0 };
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [gl, camera, sandSystem]);

  return null;
};

interface SceneContentProps extends SceneViewProps {}

const SceneContent: React.FC<SceneContentProps> = ({ sandSystem, onFpsUpdate }) => {
  return (
    <>
      <SceneBackground />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />
      <SandParticles sandSystem={sandSystem} />
      <ScanLight sandSystem={sandSystem} />
      <RippleRings sandSystem={sandSystem} />
      <ClickHandler sandSystem={sandSystem} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 + Math.PI / 6}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        enableDamping
        dampingFactor={0.05}
      />
      <FpsTracker onFpsUpdate={onFpsUpdate} />
    </>
  );
};

const SceneView: React.FC<SceneViewProps> = ({ sandSystem, onFpsUpdate }) => {
  return (
    <Canvas
      camera={{ position: [0, 15, 15], fov: 60, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ cursor: 'crosshair' }}
    >
      <SceneContent sandSystem={sandSystem} onFpsUpdate={onFpsUpdate} />
    </Canvas>
  );
};

export default SceneView;
