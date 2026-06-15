import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { AudioAnalyzer, ColorGradient } from './AudioAnalyzer';

export interface StarData {
  id: string;
  gradient: ColorGradient;
  audioUrl: string;
  duration: number;
  playCount: number;
  mergeCount: number;
  ownerId: string;
  waveform: number[];
  createdAt: number;
}

interface StarMeshGroup {
  group: THREE.Group;
  core: THREE.Mesh;
  glow: THREE.Mesh;
  trail: THREE.Points;
  data: StarData;
  baseScale: number;
  breathPhase: number;
  breathSpeed: number;
  driftVelocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  hovered: boolean;
  hoverScale: number;
}

interface ExplosionParticle {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

interface MergeAnimation {
  fromId: string;
  toId: string;
  progress: number;
  fromStartPos: THREE.Vector3;
}

interface StarFieldProps {
  stars: StarData[];
  onStarClick: (star: StarData) => void;
  onStarHover: (star: StarData | null) => void;
  currentUserId: string;
}

export function StarField({ stars, onStarClick, onStarHover, currentUserId }: StarFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starMapRef = useRef<Map<string, StarMeshGroup>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(-999, -999));
  const explosionsRef = useRef<ExplosionParticle[]>([]);
  const mergeAnimsRef = useRef<MergeAnimation[]>([]);
  const frameIdRef = useRef(0);
  const prevStarsRef = useRef<StarData[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentHoverAudioRef = useRef<HTMLAudioElement | null>(null);

  const createStarMesh = useCallback((data: StarData): StarMeshGroup => {
    const group = new THREE.Group();
    const mergeScale = 1 + data.mergeCount * 0.15;
    const baseScale = 0.4 * mergeScale;

    const coreGeo = new THREE.SphereGeometry(baseScale, 32, 32);
    const color1 = new THREE.Color(data.gradient.start);
    const color2 = new THREE.Color(data.gradient.end);
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: color1 },
        uColor2: { value: color2 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          float t = (vPosition.y + 0.5) * 0.5 + sin(uTime * 0.5) * 0.1;
          vec3 color = mix(uColor1, uColor2, clamp(t, 0.0, 1.0));
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          color += rim * 0.3;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(baseScale * 1.8, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color1.clone().lerp(color2, 0.5) },
        uOpacity: { value: 0.3 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(uColor, intensity * uOpacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const trailCount = 50;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailOpacities = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3] = (Math.random() - 0.5) * baseScale * 2;
      trailPositions[i * 3 + 1] = (Math.random() - 0.5) * baseScale * 2;
      trailPositions[i * 3 + 2] = (Math.random() - 0.5) * baseScale * 2;
      trailOpacities[i] = Math.random();
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: color1.clone().lerp(color2, 0.3),
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    group.add(trail);

    const spread = 25;
    group.position.set(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread * 1.2,
      (Math.random() - 0.5) * spread
    );

    return {
      group,
      core,
      glow,
      trail,
      data,
      baseScale,
      breathPhase: Math.random() * Math.PI * 2,
      breathSpeed: 0.5 + Math.random() * 0.5,
      driftVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.002
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.003
      ),
      hovered: false,
      hoverScale: 1,
    };
  }, []);

  const createExplosion = useCallback((position: THREE.Vector3, gradient: ColorGradient) => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const color1 = new THREE.Color(gradient.start);
    const color2 = new THREE.Color(gradient.end);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.05 + Math.random() * 0.15;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      const c = color1.clone().lerp(color2, Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const mesh = new THREE.Points(geo, mat);
    sceneRef.current?.add(mesh);

    explosionsRef.current.push({
      mesh,
      velocities,
      life: 0,
      maxLife: 2,
    });
  }, []);

  const playHoverAudio = useCallback((audioUrl: string) => {
    if (currentHoverAudioRef.current) {
      currentHoverAudioRef.current.pause();
      currentHoverAudioRef.current.currentTime = 0;
    }
    let audio = audioCacheRef.current.get(audioUrl);
    if (!audio) {
      audio = new Audio(audioUrl);
      audioCacheRef.current.set(audioUrl, audio);
    }
    audio.currentTime = 0;
    audio.volume = 0;
    audio.play().catch(() => {});
    const fadeInterval = setInterval(() => {
      if (audio && audio.volume < 0.7) {
        audio.volume = Math.min(audio.volume + 0.1, 0.7);
      } else {
        clearInterval(fadeInterval);
      }
    }, 50);
    setTimeout(() => {
      if (audio && !audio.paused) {
        const fadeOut = setInterval(() => {
          if (audio && audio.volume > 0.05) {
            audio.volume = Math.max(audio.volume - 0.1, 0);
          } else {
            audio?.pause();
            clearInterval(fadeOut);
          }
        }, 50);
      }
    }, 1800);
    currentHoverAudioRef.current = audio;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e27, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const bgStarCount = 2000;
    const bgPositions = new Float32Array(bgStarCount * 3);
    for (let i = 0; i < bgStarCount; i++) {
      bgPositions[i * 3] = (Math.random() - 0.5) * 200;
      bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    const bgMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const bgStars = new THREE.Points(bgGeo, bgMat);
    scene.add(bgStars);

    const ambient = new THREE.AmbientLight(0x334466, 0.5);
    scene.add(ambient);

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleClick = () => {
      if (!cameraRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const cores: THREE.Mesh[] = [];
      starMapRef.current.forEach((s) => cores.push(s.core));
      const intersects = raycasterRef.current.intersectObjects(cores);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        starMapRef.current.forEach((s) => {
          if (s.core === hit) {
            createExplosion(s.group.position.clone(), s.data.gradient);
            onStarClick(s.data);
          }
        });
      }
    };
    window.addEventListener('click', handleClick);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      starMapRef.current.forEach((star) => {
        star.group.position.add(star.driftVelocity);
        star.group.rotation.x += star.rotationSpeed.x;
        star.group.rotation.y += star.rotationSpeed.y;
        star.group.rotation.z += star.rotationSpeed.z;

        const bounds = 28;
        ['x', 'y', 'z'].forEach((axis) => {
          const pos = star.group.position[axis as 'x' | 'y' | 'z'];
          if (Math.abs(pos) > bounds) {
            star.driftVelocity[axis as 'x' | 'y' | 'z'] *= -1;
          }
        });

        star.breathPhase += delta * star.breathSpeed;
        const breathScale = 1 + Math.sin(star.breathPhase) * 0.06;
        const targetHoverScale = star.hovered ? 1.25 : 1;
        star.hoverScale += (targetHoverScale - star.hoverScale) * 0.1;
        const finalScale = breathScale * star.hoverScale;
        star.group.scale.setScalar(finalScale);

        (star.core.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
        const glowMat = star.glow.material as THREE.ShaderMaterial;
        glowMat.uniforms.uOpacity.value = 0.25 + Math.sin(star.breathPhase) * 0.1;

        const trailPos = star.trail.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < trailPos.count; i++) {
          trailPos.setX(i, trailPos.getX(i) + (Math.random() - 0.5) * 0.01);
          trailPos.setY(i, trailPos.getY(i) + (Math.random() - 0.5) * 0.01);
          trailPos.setZ(i, trailPos.getZ(i) + (Math.random() - 0.5) * 0.01);
        }
        trailPos.needsUpdate = true;
      });

      if (cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const cores: THREE.Mesh[] = [];
        starMapRef.current.forEach((s) => cores.push(s.core));
        const intersects = raycasterRef.current.intersectObjects(cores);
        let hoveredEntry: StarMeshGroup | null = null;
        for (const s of starMapRef.current.values()) {
          s.hovered = false;
        }
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          for (const s of starMapRef.current.values()) {
            if (s.core === hit) {
              s.hovered = true;
              hoveredEntry = s;
              break;
            }
          }
        }
        onStarHover(hoveredEntry ? hoveredEntry.data : null);
        if (hoveredEntry) {
          playHoverAudio(hoveredEntry.data.audioUrl);
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'default';
        }
      }

      explosionsRef.current = explosionsRef.current.filter((exp) => {
        exp.life += delta;
        if (exp.life >= exp.maxLife) {
          scene.remove(exp.mesh);
          exp.mesh.geometry.dispose();
          (exp.mesh.material as THREE.Material).dispose();
          return false;
        }
        const positions = exp.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) {
          positions.setX(i, positions.getX(i) + exp.velocities[i * 3]);
          positions.setY(i, positions.getY(i) + exp.velocities[i * 3 + 1]);
          positions.setZ(i, positions.getZ(i) + exp.velocities[i * 3 + 2]);
          exp.velocities[i * 3] *= 0.98;
          exp.velocities[i * 3 + 1] *= 0.98;
          exp.velocities[i * 3 + 2] *= 0.98;
        }
        positions.needsUpdate = true;
        (exp.mesh.material as THREE.PointsMaterial).opacity = 1 - exp.life / exp.maxLife;
        return true;
      });

      mergeAnimsRef.current = mergeAnimsRef.current.filter((anim) => {
        anim.progress += delta * 1.5;
        if (anim.progress >= 1) {
          const toStar = starMapRef.current.get(anim.toId);
          if (toStar) {
            const newMergeScale = 1 + toStar.data.mergeCount * 0.15;
            toStar.baseScale = 0.4 * newMergeScale;
            toStar.core.geometry.dispose();
            toStar.core.geometry = new THREE.SphereGeometry(toStar.baseScale, 32, 32);
          }
          return false;
        }
        const fromStar = starMapRef.current.get(anim.fromId);
        const toStar = starMapRef.current.get(anim.toId);
        if (fromStar && toStar) {
          const t = anim.progress;
          const ease = t * t * (3 - 2 * t);
          fromStar.group.position.lerpVectors(anim.fromStartPos, toStar.group.position, ease);
          fromStar.group.scale.setScalar(1 - ease);
        }
        return true;
      });

      bgStars.rotation.y += 0.0001;
      bgStars.rotation.x += 0.00005;

      camera.position.x += (mouseRef.current.x * 2 - camera.position.x) * 0.01;
      camera.position.y += (mouseRef.current.y * 1.5 - camera.position.y) * 0.01;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const prevIds = new Set(prevStarsRef.current.map((s) => s.id));
    const currIds = new Set(stars.map((s) => s.id));

    stars.forEach((starData) => {
      if (!prevIds.has(starData.id)) {
        const meshGroup = createStarMesh(starData);
        scene.add(meshGroup.group);
        starMapRef.current.set(starData.id, meshGroup);
      } else {
        const existing = starMapRef.current.get(starData.id);
        if (existing) {
          existing.data = starData;
          const newMergeScale = 1 + starData.mergeCount * 0.15;
          const newBaseScale = 0.4 * newMergeScale;
          if (Math.abs(newBaseScale - existing.baseScale) > 0.01) {
            existing.baseScale = newBaseScale;
            existing.core.geometry.dispose();
            existing.core.geometry = new THREE.SphereGeometry(newBaseScale, 32, 32);
            const glowScale = newBaseScale * 1.8;
            existing.glow.geometry.dispose();
            existing.glow.geometry = new THREE.SphereGeometry(glowScale, 32, 32);
          }
          const color1 = new THREE.Color(starData.gradient.start);
          const color2 = new THREE.Color(starData.gradient.end);
          (existing.core.material as THREE.ShaderMaterial).uniforms.uColor1.value = color1;
          (existing.core.material as THREE.ShaderMaterial).uniforms.uColor2.value = color2;
          (existing.glow.material as THREE.ShaderMaterial).uniforms.uColor.value = color1.clone().lerp(color2, 0.5);
          (existing.trail.material as THREE.PointsMaterial).color = color1.clone().lerp(color2, 0.3);
        }
      }
    });

    prevStarsRef.current.forEach((oldStar) => {
      if (!currIds.has(oldStar.id)) {
        const meshGroup = starMapRef.current.get(oldStar.id);
        if (meshGroup) {
          scene.remove(meshGroup.group);
          meshGroup.core.geometry.dispose();
          (meshGroup.core.material as THREE.Material).dispose();
          meshGroup.glow.geometry.dispose();
          (meshGroup.glow.material as THREE.Material).dispose();
          meshGroup.trail.geometry.dispose();
          (meshGroup.trail.material as THREE.Material).dispose();
          starMapRef.current.delete(oldStar.id);
        }
      }
    });

    prevStarsRef.current = stars;
  }, [stars, createStarMesh]);

  const triggerMerge = useCallback((fromId: string, toId: string) => {
    const fromStar = starMapRef.current.get(fromId);
    const toStar = starMapRef.current.get(toId);
    if (!fromStar || !toStar) return;
    mergeAnimsRef.current.push({
      fromId,
      toId,
      progress: 0,
      fromStartPos: fromStar.group.position.clone(),
    });
  }, []);

  const triggerExplosion = useCallback((starId: string) => {
    const star = starMapRef.current.get(starId);
    if (star) {
      createExplosion(star.group.position.clone(), star.data.gradient);
    }
  }, [createExplosion]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}

export type { StarFieldProps, MergeAnimation };
