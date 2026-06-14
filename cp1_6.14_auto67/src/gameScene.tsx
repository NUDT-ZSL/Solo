import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameAction } from './commandParser';

interface GameSceneProps {
  executeAction: GameAction | null;
  isPaused: boolean;
  onReset: boolean;
}

interface SkillState {
  type: 'fireball' | 'ice' | 'shield' | null;
  startTime: number;
  duration: number;
}

export const GameScene: React.FC<GameSceneProps> = ({ executeAction, isPaused, onReset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);
  const actionQueueRef = useRef<GameAction[]>([]);
  const pausedRef = useRef(false);
  const lastActionIdRef = useRef(0);
  const prevActionRef = useRef<GameAction | null>(null);

  const characterPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const characterTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const moveSpeedRef = useRef(1.5);
  const isMovingRef = useRef(false);
  const walkAnimRef = useRef(0);

  const skillStateRef = useRef<SkillState>({ type: null, startTime: 0, duration: 0 });
  const skillEffectRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (onReset) {
      characterPosRef.current.set(0, 0, 0);
      characterTargetRef.current.set(0, 0, 0);
      isMovingRef.current = false;
      walkAnimRef.current = 0;
      skillStateRef.current = { type: null, startTime: 0, duration: 0 };
      if (characterRef.current) {
        characterRef.current.position.set(0, 0, 0);
        const leftArm = characterRef.current.getObjectByName('leftArm');
        const rightArm = characterRef.current.getObjectByName('rightArm');
        const leftLeg = characterRef.current.getObjectByName('leftLeg');
        const rightLeg = characterRef.current.getObjectByName('rightLeg');
        if (leftArm) leftArm.rotation.x = 0;
        if (rightArm) rightArm.rotation.x = 0;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
      }
      if (skillEffectRef.current && sceneRef.current) {
        sceneRef.current.remove(skillEffectRef.current);
        skillEffectRef.current = null;
      }
    }
  }, [onReset]);

  useEffect(() => {
    if (executeAction && executeAction !== prevActionRef.current) {
      prevActionRef.current = executeAction;
      actionQueueRef.current.push(executeAction);
    }
  }, [executeAction]);

  const createLowPolyCharacter = useCallback(() => {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x00d4ff });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
    const limbMat = new THREE.MeshLambertMaterial({ color: 0x1a1a3e });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), bodyMat);
    body.position.y = 1.2;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
    head.position.y = 1.85;
    group.add(head);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), limbMat);
    leftArm.position.set(-0.5, 1.2, 0);
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), limbMat);
    rightArm.position.set(0.5, 1.2, 0);
    rightArm.name = 'rightArm';
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), limbMat);
    leftLeg.position.set(-0.15, 0.5, 0);
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), limbMat);
    rightLeg.position.set(0.15, 0.5, 0);
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.6, 4),
      new THREE.MeshLambertMaterial({ color: 0xe85d3a })
    );
    hat.position.y = 2.35;
    group.add(hat);

    return group;
  }, []);

  const createGround = useCallback(() => {
    const groundGeo = new THREE.PlaneGeometry(40, 40, 20, 20);
    const positions = groundGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      positions.setZ(i, Math.sin(x * 0.5) * 0.1 + Math.cos(z * 0.5) * 0.1);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
    return new THREE.Mesh(groundGeo, groundMat);
  }, []);

  const createFireballEffect = useCallback((scene: THREE.Scene, position: THREE.Vector3) => {
    const group = new THREE.Group();
    const particleCount = 80;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.7 + 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.25 + Math.random() * 0.5;
      colors[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 })
    );
    core.position.y = 1.5;
    group.add(core);

    group.position.copy(position);
    scene.add(group);
    skillEffectRef.current = group;
    return group;
  }, []);

  const createIceEffect = useCallback((scene: THREE.Scene, position: THREE.Vector3) => {
    const group = new THREE.Group();

    for (let ring = 0; ring < 3; ring++) {
      const count = 8 + ring * 4;
      const radius = 0.6 + ring * 0.6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const hex = new THREE.Mesh(
          new THREE.CircleGeometry(0.25, 6),
          new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
          })
        );
        hex.position.set(Math.cos(angle) * radius, 1.2 + ring * 0.3, Math.sin(angle) * radius);
        hex.rotation.y = angle;
        hex.rotation.x = Math.random() * 0.5;
        group.add(hex);
      }
    }

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7 })
    );
    core.position.y = 1.5;
    group.add(core);

    group.position.copy(position);
    scene.add(group);
    skillEffectRef.current = group;
    return group;
  }, []);

  const createShieldEffect = useCallback((scene: THREE.Scene, position: THREE.Vector3) => {
    const group = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const shield = new THREE.Mesh(
        new THREE.SphereGeometry(1.1 + i * 0.15, 20, 20),
        new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.25 - i * 0.05,
          side: THREE.DoubleSide,
          wireframe: i === 2,
        })
      );
      shield.position.y = 1.2;
      group.add(shield);
    }

    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.8 })
    );
    inner.position.y = 1.2;
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    group.position.copy(position);
    scene.add(group);
    skillEffectRef.current = group;
    return group;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b1a);
    scene.fog = new THREE.Fog(0x0b0b1a, 15, 30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 6, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x404060, 0.65);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00d4ff, 1.2, 25);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    const ground = createGround();
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    for (let i = 0; i < 20; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.8, 5),
        new THREE.MeshLambertMaterial({ color: 0x4a3728 })
      );
      trunk.position.y = 0.4;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.3, 5),
        new THREE.MeshLambertMaterial({ color: 0x1a6b1a })
      );
      foliage.position.y = 1.3;
      tree.add(foliage);

      tree.position.set(
        (Math.random() - 0.5) * 32,
        0,
        (Math.random() - 0.5) * 32
      );
      if (tree.position.distanceTo(new THREE.Vector3(0, 0, 0)) > 3.5) {
        scene.add(tree);
      }
    }

    const character = createLowPolyCharacter();
    characterRef.current = character;
    scene.add(character);

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (pausedRef.current) {
        renderer.render(scene, camera);
        return;
      }

      const delta = clock.getDelta();
      const now = Date.now();

      while (actionQueueRef.current.length > 0 && !isMovingRef.current && !skillStateRef.current.type) {
        const action = actionQueueRef.current.shift()!;

        switch (action) {
          case 'MOVE_LEFT':
          case 'MOVE_RIGHT':
          case 'MOVE_FORWARD':
          case 'MOVE_BACKWARD': {
            const dir = new THREE.Vector3(0, 0, 0);
            if (action === 'MOVE_LEFT') dir.x = -3;
            if (action === 'MOVE_RIGHT') dir.x = 3;
            if (action === 'MOVE_FORWARD') dir.z = -3;
            if (action === 'MOVE_BACKWARD') dir.z = 3;
            characterTargetRef.current.copy(characterPosRef.current).add(dir);
            isMovingRef.current = true;
            break;
          }
          case 'SKILL_FIREBALL': {
            skillStateRef.current = { type: 'fireball', startTime: now, duration: 500 };
            createFireballEffect(scene, characterPosRef.current.clone());
            break;
          }
          case 'SKILL_ICE': {
            skillStateRef.current = { type: 'ice', startTime: now, duration: 500 };
            createIceEffect(scene, characterPosRef.current.clone());
            break;
          }
          case 'SKILL_SHIELD': {
            skillStateRef.current = { type: 'shield', startTime: now, duration: 500 };
            createShieldEffect(scene, characterPosRef.current.clone());
            break;
          }
          case 'STORY_A':
          case 'STORY_B':
          case 'STORY_C':
            break;
        }
      }

      if (isMovingRef.current) {
        const speed = moveSpeedRef.current * delta;
        const dir = new THREE.Vector3().subVectors(characterTargetRef.current, characterPosRef.current);
        if (dir.length() > speed) {
          dir.normalize().multiplyScalar(speed);
          characterPosRef.current.add(dir);
        } else {
          characterPosRef.current.copy(characterTargetRef.current);
          isMovingRef.current = false;
        }

        walkAnimRef.current += delta * 14;
        if (characterRef.current) {
          const leftArm = characterRef.current.getObjectByName('leftArm');
          const rightArm = characterRef.current.getObjectByName('rightArm');
          const leftLeg = characterRef.current.getObjectByName('leftLeg');
          const rightLeg = characterRef.current.getObjectByName('rightLeg');
          if (leftArm) leftArm.rotation.x = Math.sin(walkAnimRef.current) * 0.6;
          if (rightArm) rightArm.rotation.x = -Math.sin(walkAnimRef.current) * 0.6;
          if (leftLeg) leftLeg.rotation.x = -Math.sin(walkAnimRef.current) * 0.6;
          if (rightLeg) rightLeg.rotation.x = Math.sin(walkAnimRef.current) * 0.6;
        }
      } else {
        if (characterRef.current) {
          const leftArm = characterRef.current.getObjectByName('leftArm');
          const rightArm = characterRef.current.getObjectByName('rightArm');
          const leftLeg = characterRef.current.getObjectByName('leftLeg');
          const rightLeg = characterRef.current.getObjectByName('rightLeg');
          if (leftArm) leftArm.rotation.x *= 0.85;
          if (rightArm) rightArm.rotation.x *= 0.85;
          if (leftLeg) leftLeg.rotation.x *= 0.85;
          if (rightLeg) rightLeg.rotation.x *= 0.85;
        }
      }

      if (skillStateRef.current.type) {
        const elapsed = now - skillStateRef.current.startTime;
        const progress = Math.min(elapsed / skillStateRef.current.duration, 1);

        if (skillEffectRef.current) {
          const effect = skillEffectRef.current;
          if (skillStateRef.current.type === 'fireball') {
            effect.position.z -= delta * 4;
            effect.position.y = progress * 0.5;
            effect.scale.setScalar(1 + progress * 0.8);
            effect.children.forEach((child) => {
              if (child instanceof THREE.Points) {
                const mat = child.material as THREE.PointsMaterial;
                mat.opacity = 1 - progress;
                mat.size = 0.18 + progress * 0.15;
              }
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.85 * (1 - progress);
              }
            });
          } else if (skillStateRef.current.type === 'ice') {
            effect.scale.setScalar(0.3 + progress * 2);
            effect.rotation.y += delta * 3;
            effect.children.forEach((child) => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = (0.75 - progress * 0.7) * (child.geometry instanceof THREE.OctahedronGeometry ? 1 : 0.9);
              }
            });
          } else if (skillStateRef.current.type === 'shield') {
            effect.scale.setScalar(0.7 + progress * 0.6);
            effect.rotation.y += delta * 2;
            effect.children.forEach((child) => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                if (!mat.wireframe) {
                  mat.opacity = (0.25 - progress * 0.2);
                }
              }
            });
          }
        }

        if (progress >= 1) {
          if (skillEffectRef.current) {
            scene.remove(skillEffectRef.current);
            skillEffectRef.current = null;
          }
          skillStateRef.current = { type: null, startTime: 0, duration: 0 };
        }
      }

      if (characterRef.current) {
        characterRef.current.position.copy(characterPosRef.current);
        if (isMovingRef.current) {
          const target = characterTargetRef.current;
          const current = characterPosRef.current;
          const angle = Math.atan2(target.x - current.x, -(target.z - current.z));
          characterRef.current.rotation.y = angle;
        }
      }

      camera.position.set(
        characterPosRef.current.x,
        6,
        characterPosRef.current.z + 8
      );
      camera.lookAt(characterPosRef.current.x, 1, characterPosRef.current.z);
      pointLight.position.set(characterPosRef.current.x, 5, characterPosRef.current.z);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createLowPolyCharacter, createGround, createFireballEffect, createIceEffect, createShieldEffect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

export default GameScene;
