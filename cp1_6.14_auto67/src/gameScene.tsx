import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameAction } from './commandParser';

interface GameSceneProps {
  currentAction: GameAction | null;
  onStoryEvent: (text: string) => void;
  isPaused: boolean;
  onReset: boolean;
}

const STORY_EVENTS = [
  { options: ['打开宝箱', '跳过'], results: ['你获得了神秘道具！', '你安全地离开了'] },
  { options: ['进入洞穴', '绕道而行'], results: ['你发现了一块宝石！', '你避开了危险'] },
  { options: ['帮助旅人', '继续赶路'], results: ['旅人赠送了你地图！', '你节省了时间'] },
  { options: ['挑战巨人', '悄悄溜走'], results: ['你击败了巨人！', '你明智地选择了回避'] },
  { options: ['饮下泉水', '离开水池'], results: ['你恢复了体力！', '你没有冒险'] },
];

interface SkillState {
  type: 'fireball' | 'ice' | 'shield' | null;
  startTime: number;
  duration: number;
}

export const GameScene: React.FC<GameSceneProps> = ({ currentAction, onStoryEvent, isPaused, onReset }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);
  const actionRef = useRef<GameAction | null>(null);
  const pausedRef = useRef(false);
  const resetRef = useRef(false);

  const characterPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const characterTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const moveSpeedRef = useRef(1.5);
  const isMovingRef = useRef(false);
  const moveTimerRef = useRef(0);
  const walkAnimRef = useRef(0);

  const skillStateRef = useRef<SkillState>({ type: null, startTime: 0, duration: 0 });
  const skillCooldownRef = useRef<Record<string, number>>({ fireball: 0, ice: 0, shield: 0 });
  const skillEffectRef = useRef<THREE.Group | null>(null);

  const storyTimerRef = useRef(0);
  const storyActiveRef = useRef(false);
  const storyVotesRef = useRef<Record<string, number>>({ A: 0, B: 0 });

  const particlesRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    actionRef.current = currentAction;
  }, [currentAction]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (onReset) {
      characterPosRef.current.set(0, 0, 0);
      characterTargetRef.current.set(0, 0, 0);
      isMovingRef.current = false;
      moveTimerRef.current = 0;
      skillStateRef.current = { type: null, startTime: 0, duration: 0 };
      skillCooldownRef.current = { fireball: 0, ice: 0, shield: 0 };
      storyTimerRef.current = 0;
      storyActiveRef.current = false;
      if (characterRef.current) {
        characterRef.current.position.set(0, 0, 0);
      }
    }
  }, [onReset]);

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
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5 + 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 })
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

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const hex = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 6),
        new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        })
      );
      hex.position.set(Math.cos(angle) * 1.2, 1.5, Math.sin(angle) * 1.2);
      hex.rotation.y = angle;
      group.add(hex);
    }

    group.position.copy(position);
    scene.add(group);
    skillEffectRef.current = group;
    return group;
  }, []);

  const createShieldEffect = useCallback((scene: THREE.Scene, position: THREE.Vector3) => {
    const group = new THREE.Group();
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      })
    );
    shield.position.y = 1.2;
    group.add(shield);
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

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00d4ff, 1, 20);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    const ground = createGround();
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    for (let i = 0; i < 15; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.8, 5),
        new THREE.MeshLambertMaterial({ color: 0x4a3728 })
      );
      trunk.position.y = 0.4;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1.2, 5),
        new THREE.MeshLambertMaterial({ color: 0x1a6b1a })
      );
      foliage.position.y = 1.3;
      tree.add(foliage);

      tree.position.set(
        (Math.random() - 0.5) * 30,
        0,
        (Math.random() - 0.5) * 30
      );
      if (tree.position.distanceTo(new THREE.Vector3(0, 0, 0)) > 3) {
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

      const action = actionRef.current;
      if (action && !isMovingRef.current && !skillStateRef.current.type) {
        switch (action) {
          case 'MOVE_LEFT':
          case 'MOVE_RIGHT':
          case 'MOVE_FORWARD':
          case 'MOVE_BACKWARD': {
            const dir = new THREE.Vector3(0, 0, 0);
            if (action === 'MOVE_LEFT') dir.x = -1;
            if (action === 'MOVE_RIGHT') dir.x = 1;
            if (action === 'MOVE_FORWARD') dir.z = -1;
            if (action === 'MOVE_BACKWARD') dir.z = 1;
            characterTargetRef.current.copy(characterPosRef.current).add(dir.multiplyScalar(3));
            isMovingRef.current = true;
            moveTimerRef.current = 2;
            actionRef.current = null;
            break;
          }
          case 'SKILL_FIREBALL':
          case 'SKILL_ICE':
          case 'SKILL_SHIELD': {
            const skillName = action === 'SKILL_FIREBALL' ? 'fireball' : action === 'SKILL_ICE' ? 'ice' : 'shield';
            if (now - (skillCooldownRef.current[skillName] || 0) > 8000) {
              skillStateRef.current = {
                type: skillName,
                startTime: now,
                duration: 500,
              };
              skillCooldownRef.current[skillName] = now;
              const pos = characterPosRef.current.clone();
              if (skillName === 'fireball') createFireballEffect(scene, pos);
              else if (skillName === 'ice') createIceEffect(scene, pos);
              else createShieldEffect(scene, pos);
            }
            actionRef.current = null;
            break;
          }
          case 'STORY_A':
          case 'STORY_B':
          case 'STORY_C': {
            const key = action.replace('STORY_', '');
            storyVotesRef.current[key] = (storyVotesRef.current[key] || 0) + 1;
            actionRef.current = null;
            break;
          }
        }
      }

      if (isMovingRef.current) {
        moveTimerRef.current -= delta;
        const speed = moveSpeedRef.current * delta;
        const dir = new THREE.Vector3().subVectors(characterTargetRef.current, characterPosRef.current);
        if (dir.length() > speed) {
          dir.normalize().multiplyScalar(speed);
          characterPosRef.current.add(dir);
        } else {
          characterPosRef.current.copy(characterTargetRef.current);
          isMovingRef.current = false;
        }

        walkAnimRef.current += delta * 12;
        if (characterRef.current) {
          const leftArm = characterRef.current.getObjectByName('leftArm');
          const rightArm = characterRef.current.getObjectByName('rightArm');
          const leftLeg = characterRef.current.getObjectByName('leftLeg');
          const rightLeg = characterRef.current.getObjectByName('rightLeg');
          if (leftArm) leftArm.rotation.x = Math.sin(walkAnimRef.current) * 0.5;
          if (rightArm) rightArm.rotation.x = -Math.sin(walkAnimRef.current) * 0.5;
          if (leftLeg) leftLeg.rotation.x = -Math.sin(walkAnimRef.current) * 0.5;
          if (rightLeg) rightLeg.rotation.x = Math.sin(walkAnimRef.current) * 0.5;
        }
      } else {
        if (characterRef.current) {
          const leftArm = characterRef.current.getObjectByName('leftArm');
          const rightArm = characterRef.current.getObjectByName('rightArm');
          const leftLeg = characterRef.current.getObjectByName('leftLeg');
          const rightLeg = characterRef.current.getObjectByName('rightLeg');
          if (leftArm) leftArm.rotation.x *= 0.9;
          if (rightArm) rightArm.rotation.x *= 0.9;
          if (leftLeg) leftLeg.rotation.x *= 0.9;
          if (rightLeg) rightLeg.rotation.x *= 0.9;
        }
      }

      if (skillStateRef.current.type) {
        const elapsed = now - skillStateRef.current.startTime;
        const progress = Math.min(elapsed / skillStateRef.current.duration, 1);

        if (skillEffectRef.current) {
          const effect = skillEffectRef.current;
          if (skillStateRef.current.type === 'fireball') {
            effect.position.z -= delta * 3;
            effect.scale.setScalar(1 + progress * 0.5);
            effect.children.forEach((child) => {
              if (child instanceof THREE.Points) {
                const mat = child.material as THREE.PointsMaterial;
                mat.opacity = 1 - progress;
                mat.size = 0.15 + progress * 0.1;
              }
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.8 * (1 - progress);
              }
            });
          } else if (skillStateRef.current.type === 'ice') {
            effect.scale.setScalar(progress * 2);
            effect.children.forEach((child) => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.7 * (1 - progress);
              }
            });
          } else if (skillStateRef.current.type === 'shield') {
            effect.scale.setScalar(1 + progress * 0.3);
            effect.children.forEach((child) => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.3 * (1 - progress);
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

      storyTimerRef.current += delta;
      if (storyTimerRef.current >= 30 && !storyActiveRef.current) {
        storyActiveRef.current = true;
        storyTimerRef.current = 0;
        const event = STORY_EVENTS[Math.floor(Math.random() * STORY_EVENTS.length)];
        storyVotesRef.current = { A: 0, B: 0 };

        setTimeout(() => {
          const votes = storyVotesRef.current;
          const winner = (votes.A || 0) >= (votes.B || 0) ? 'A' : 'B';
          const resultText = winner === 'A' ? event.results[0] : event.results[1];
          onStoryEvent(resultText);
          storyActiveRef.current = false;
          storyVotesRef.current = { A: 0, B: 0 };
        }, 3000);
      }

      if (characterRef.current) {
        characterRef.current.position.copy(characterPosRef.current);
        camera.position.set(
          characterPosRef.current.x,
          6,
          characterPosRef.current.z + 8
        );
        camera.lookAt(characterPosRef.current.x, 1, characterPosRef.current.z);
        pointLight.position.set(characterPosRef.current.x, 5, characterPosRef.current.z);
      }

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
  }, [createLowPolyCharacter, createGround, createFireballEffect, createIceEffect, createShieldEffect, onStoryEvent]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />;
};

export default GameScene;
