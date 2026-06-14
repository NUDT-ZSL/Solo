import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import EditorState from './EditorState';
import { ToolMode } from '../App';

interface Props {
  editorState: EditorState;
  toolMode: ToolMode;
  isPlaying: boolean;
  onWin: () => void;
  onForceUpdate: () => void;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  jumpTimer: number;
}

const GRID_SIZE = 50;
const GRID_EXTENT = 2000;

const EditorCanvas: React.FC<Props> = ({ editorState, toolMode, isPlaying, onWin, onForceUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rafRef = useRef<number>(0);
  const dragStateRef = useRef<{
    type: 'pan' | 'move' | 'resize' | 'none';
    startSX: number;
    startSY: number;
    startPanX: number;
    startPanY: number;
    startElX: number;
    startElY: number;
    handleId: string;
    handleKey: string;
  }>({ type: 'none', startSX: 0, startSY: 0, startPanX: 0, startPanY: 0, startElX: 0, startElY: 0, handleId: '', handleKey: '' });
  const hoverRef = useRef<string | null>(null);
  const mouseWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerRef = useRef<PlayerState | null>(null);
  const playerMeshRef = useRef<THREE.Mesh | null>(null);
  const lastTimeRef = useRef<number>(0);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  const hasWonRef = useRef(false);

  const getCanvasSize = useCallback(() => {
    if (!containerRef.current) return { w: 1280, h: 720 };
    return { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { w, h } = getCanvasSize();
    return editorState.screenToWorld(sx, sy, w, h);
  }, [editorState, getCanvasSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x1a1a2e);
    renderer.setPixelRatio(window.devicePixelRatio);
    const { w, h } = getCanvasSize();
    renderer.setSize(w, h);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -10000, 10000);
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    return () => {
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return;
      const { w, h } = getCanvasSize();
      rendererRef.current.setSize(w, h);
      cameraRef.current.left = -w / 2;
      cameraRef.current.right = w / 2;
      cameraRef.current.top = h / 2;
      cameraRef.current.bottom = -h / 2;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [getCanvasSize]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const canvas = rendererRef.current.domElement;

    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isPlaying) return;
      const { sx, sy } = getMousePos(e);
      const wpos = screenToWorld(sx, sy);
      mouseWorldRef.current = wpos;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        dragStateRef.current = {
          type: 'pan', startSX: sx, startSY: sy,
          startPanX: editorState.panX, startPanY: editorState.panY,
          startElX: 0, startElY: 0, handleId: '', handleKey: '',
        };
        canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button === 0) {
        if (toolMode === 'select') {
          const handleHit = editorState.hitTestHandle(wpos.x, wpos.y);
          if (handleHit) {
            dragStateRef.current = {
              type: 'resize', startSX: sx, startSY: sy,
              startPanX: 0, startPanY: 0,
              startElX: wpos.x, startElY: wpos.y,
              handleId: handleHit.id, handleKey: handleHit.handle,
            };
            return;
          }
          const hit = editorState.hitTest(wpos.x, wpos.y);
          if (hit) {
            editorState.select(hit.id);
            dragStateRef.current = {
              type: 'move', startSX: sx, startSY: sy,
              startPanX: 0, startPanY: 0,
              startElX: hit.x, startElY: hit.y,
              handleId: hit.id, handleKey: '',
            };
            onForceUpdate();
            return;
          }
          editorState.select(null);
          dragStateRef.current = {
            type: 'pan', startSX: sx, startSY: sy,
            startPanX: editorState.panX, startPanY: editorState.panY,
            startElX: 0, startElY: 0, handleId: '', handleKey: '',
          };
          canvas.style.cursor = 'grabbing';
          onForceUpdate();
        } else if (toolMode === 'platform') {
          editorState.addPlatform(wpos.x, wpos.y);
          onForceUpdate();
        } else if (toolMode === 'spike') {
          editorState.addSpike(wpos.x, wpos.y);
          onForceUpdate();
        } else if (toolMode === 'goal') {
          editorState.addGoal(wpos.x, wpos.y);
          onForceUpdate();
        }
      }

      if (e.button === 2) {
        dragStateRef.current = {
          type: 'pan', startSX: sx, startSY: sy,
          startPanX: editorState.panX, startPanY: editorState.panY,
          startElX: 0, startElY: 0, handleId: '', handleKey: '',
        };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const { sx, sy } = getMousePos(e);
      const wpos = screenToWorld(sx, sy);
      mouseWorldRef.current = wpos;

      if (isPlaying) return;

      const ds = dragStateRef.current;
      if (ds.type === 'pan') {
        const dx = (sx - ds.startSX) / editorState.zoom;
        const dy = (sy - ds.startSY) / editorState.zoom;
        editorState.panX = ds.startPanX - dx;
        editorState.panY = ds.startPanY + dy;
      } else if (ds.type === 'move' && ds.handleId) {
        const dx = (sx - ds.startSX) / editorState.zoom;
        const dy = (sy - ds.startSY) / editorState.zoom;
        const el = editorState.elements.find(e => e.id === ds.handleId);
        if (el) {
          el.x = Math.round(ds.startElX + dx);
          el.y = Math.round(ds.startElY - dy);
        }
        onForceUpdate();
      } else if (ds.type === 'resize' && ds.handleId) {
        editorState.resizePlatform(ds.handleId, ds.handleKey, wpos.x, wpos.y);
        onForceUpdate();
      } else {
        const hit = editorState.hitTest(wpos.x, wpos.y);
        hoverRef.current = hit ? hit.id : null;

        if (toolMode === 'select') {
          const handleHit = editorState.hitTestHandle(wpos.x, wpos.y);
          if (handleHit) {
            const cursors: Record<string, string> = {
              tl: 'nwse-resize', br: 'nwse-resize',
              tr: 'nesw-resize', bl: 'nesw-resize',
              ml: 'ew-resize', mr: 'ew-resize',
              mt: 'ns-resize', mb: 'ns-resize',
            };
            canvas.style.cursor = cursors[handleHit.handle] || 'default';
          } else if (hit) {
            canvas.style.cursor = 'move';
          } else {
            canvas.style.cursor = 'default';
          }
        } else {
          canvas.style.cursor = 'crosshair';
        }
      }
    };

    const onMouseUp = () => {
      if (dragStateRef.current.type !== 'none') {
        dragStateRef.current = { type: 'none', startSX: 0, startSY: 0, startPanX: 0, startPanY: 0, startElX: 0, startElY: 0, handleId: '', handleKey: '' };
        canvas.style.cursor = toolMode === 'select' ? 'default' : 'crosshair';
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = getMousePos(e);
      const before = screenToWorld(sx, sy);
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      editorState.zoom = Math.max(0.5, Math.min(2.0, editorState.zoom * factor));
      const after = screenToWorld(sx, sy);
      editorState.panX += before.x - after.x;
      editorState.panY += before.y - after.y;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && editorState.selectedId && !isPlaying) {
        editorState.removeElement(editorState.selectedId);
        onForceUpdate();
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPlaying, toolMode, editorState, screenToWorld, onForceUpdate]);

  useEffect(() => {
    if (isPlaying) {
      const startPlat = editorState.getLeftmostPlatform();
      if (startPlat) {
        playerRef.current = {
          x: startPlat.x + startPlat.width / 2 - 10,
          y: startPlat.y + startPlat.height + 10,
          vx: 200,
          vy: 0,
          grounded: false,
          jumpTimer: 0,
        };
      } else {
        playerRef.current = { x: 0, y: 100, vx: 200, vy: 0, grounded: false, jumpTimer: 0 };
      }
      hasWonRef.current = false;
    } else {
      playerRef.current = null;
    }
  }, [isPlaying, editorState]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaying) {
        onForceUpdate();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isPlaying, onForceUpdate]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    let running = true;

    const createRoundedRectShape = (x: number, y: number, w: number, h: number, r: number): THREE.Shape => {
      const shape = new THREE.Shape();
      const absW = Math.abs(w);
      const absH = Math.abs(h);
      const clampedR = Math.min(r, absW / 2, absH / 2);
      shape.moveTo(x + clampedR, y);
      shape.lineTo(x + absW - clampedR, y);
      shape.quadraticCurveTo(x + absW, y, x + absW, y + clampedR);
      shape.lineTo(x + absW, y + absH - clampedR);
      shape.quadraticCurveTo(x + absW, y + absH, x + absW - clampedR, y + absH);
      shape.lineTo(x + clampedR, y + absH);
      shape.quadraticCurveTo(x, y + absH, x, y + absH - clampedR);
      shape.lineTo(x, y + clampedR);
      shape.quadraticCurveTo(x, y, x + clampedR, y);
      return shape;
    };

    const createSpikeShape = (x: number, y: number): THREE.Shape => {
      const shape = new THREE.Shape();
      shape.moveTo(x, y + 20);
      shape.lineTo(x + 12, y);
      shape.lineTo(x + 24, y + 20);
      shape.closePath();
      return shape;
    };

    const animate = (time: number) => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(animate);

      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = time;

      while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material) {
          if (Array.isArray((child as any).material)) {
            (child as any).material.forEach((m: any) => m.dispose());
          } else {
            (child as any).material.dispose();
          }
        }
      }

      const { w, h } = getCanvasSize();
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.zoom = editorState.zoom;
      camera.position.set(editorState.panX * editorState.zoom, -editorState.panY * editorState.zoom, 100);
      camera.updateProjectionMatrix();

      const gridColor = 0x2a2a3e;
      const gridPositions: number[] = [];
      for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
        gridPositions.push(i, -GRID_EXTENT, 0, i, GRID_EXTENT, 0);
        gridPositions.push(-GRID_EXTENT, i, 0, GRID_EXTENT, i, 0);
      }
      const gridGeo = new THREE.BufferGeometry();
      gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
      const gridMat = new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.5 });
      scene.add(new THREE.LineSegments(gridGeo, gridMat));

      const platforms = editorState.getPlatforms();

      for (let i = 0; i < platforms.length; i++) {
        for (let j = i + 1; j < platforms.length; j++) {
          const a = platforms[i];
          const b = platforms[j];
          const ax = a.x + a.width / 2;
          const ay = a.y + a.height / 2;
          const bx = b.x + b.width / 2;
          const by = b.y + b.height / 2;
          const dashGeo = new THREE.BufferGeometry();
          dashGeo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, 0, bx, by, 0], 3));
          const dashMat = new THREE.LineDashedMaterial({
            color: 0xffd43b,
            dashSize: 5,
            gapSize: 3,
            transparent: true,
            opacity: 0.6,
          });
          const dashLine = new THREE.Line(dashGeo, dashMat);
          dashLine.computeLineDistances();
          scene.add(dashLine);
        }
      }

      for (const el of editorState.elements) {
        if (el.type === 'platform') {
          const p = el as any;
          const shape = createRoundedRectShape(p.x, p.y, p.width, p.height, 4);
          const geo = new THREE.ShapeGeometry(shape);
          const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
          const mesh = new THREE.Mesh(geo, mat);
          scene.add(mesh);

          const edgeShape = createRoundedRectShape(p.x, p.y, p.width, p.height, 4);
          const edgeGeo = new THREE.ShapeGeometry(edgeShape);
          const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2a7acc, side: THREE.BackSide });
          const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
          edgeMesh.scale.set(1 + 2 / Math.max(p.width, 1), 1 + 2 / Math.max(p.height, 1), 1);
          edgeMesh.position.set(
            p.x + p.width / 2,
            p.y + p.height / 2,
            -0.1
          );
          edgeMesh.geometry.translate(-(p.x + p.width / 2), -(p.y + p.height / 2), 0);
          scene.add(edgeMesh);

          if (el.id === editorState.selectedId && !isPlaying) {
            const handles = [
              { x: p.x, y: p.y },
              { x: p.x + p.width, y: p.y },
              { x: p.x, y: p.y + p.height },
              { x: p.x + p.width, y: p.y + p.height },
              { x: p.x, y: p.y + p.height / 2 },
              { x: p.x + p.width, y: p.y + p.height / 2 },
              { x: p.x + p.width / 2, y: p.y },
              { x: p.x + p.width / 2, y: p.y + p.height },
            ];
            for (const h of handles) {
              const hGeo = new THREE.PlaneGeometry(8, 8);
              const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
              const hMesh = new THREE.Mesh(hGeo, hMat);
              hMesh.position.set(h.x, h.y, 1);
              scene.add(hMesh);
            }
          }
        } else if (el.type === 'spike') {
          const s = el as any;
          const shape = createSpikeShape(s.x, s.y);
          const geo = new THREE.ShapeGeometry(shape);
          const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
          scene.add(new THREE.Mesh(geo, mat));
        } else if (el.type === 'goal') {
          const g = el as any;
          const breathe = 0.8 + 0.3 * (0.5 + 0.5 * Math.sin(time / 1000 * Math.PI));
          const radius = 20 * breathe;
          const geo = new THREE.CircleGeometry(radius, 32);
          const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(g.x + 20, g.y + 20, 0);
          scene.add(mesh);
        }

        if (!isPlaying && el.id === hoverRef.current) {
          let labelX = 0, labelY = 0, label = '';
          if (el.type === 'platform') {
            const p = el as any;
            labelX = p.x + p.width / 2;
            labelY = p.y - 14;
            label = `平台 (${Math.round(p.x)}, ${Math.round(p.y)}) ${p.width}x${p.height}`;
          } else if (el.type === 'spike') {
            const s = el as any;
            labelX = s.x + 12;
            labelY = s.y - 14;
            label = `尖刺 (${Math.round(s.x)}, ${Math.round(s.y)})`;
          } else if (el.type === 'goal') {
            const g = el as any;
            labelX = g.x + 20;
            labelY = g.y - 14;
            label = `终点 (${Math.round(g.x)}, ${Math.round(g.y)})`;
          }
          const bgGeo = new THREE.PlaneGeometry(label.length * 7.2 + 12, 20);
          const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 });
          const bgMesh = new THREE.Mesh(bgGeo, bgMat);
          bgMesh.position.set(labelX, labelY, 2);
          scene.add(bgMesh);
        }
      }

      if (isPlaying && playerRef.current) {
        const player = playerRef.current;
        const GRAVITY = 800;
        const JUMP_VEL = 400;
        const JUMP_INTERVAL = 0.8;
        const PW = 20;
        const PH = 20;

        if (!hasWonRef.current) {
          player.vy -= GRAVITY * dt;
          player.jumpTimer += dt;

          if (player.grounded && player.jumpTimer >= JUMP_INTERVAL) {
            player.vy = JUMP_VEL;
            player.grounded = false;
            player.jumpTimer = 0;
          }

          player.x += player.vx * dt;
          player.y += player.vy * dt;

          player.grounded = false;
          for (const plat of platforms) {
            if (
              player.x + PW > plat.x &&
              player.x < plat.x + plat.width &&
              player.y > plat.y &&
              player.y - PH < plat.y + plat.height &&
              player.vy <= 0
            ) {
              const prevY = player.y - player.vy * dt;
              if (prevY - PH >= plat.y + plat.height - 2 || prevY >= plat.y) {
                player.y = plat.y + plat.height + PH;
                player.vy = 0;
                player.grounded = true;
              }
            }
          }

          if (player.y < -500) {
            const startPlat = editorState.getLeftmostPlatform();
            if (startPlat) {
              player.x = startPlat.x + startPlat.width / 2 - 10;
              player.y = startPlat.y + startPlat.height + 10;
            } else {
              player.x = 0;
              player.y = 100;
            }
            player.vy = 0;
            player.jumpTimer = 0;
          }

          for (const spike of editorState.getSpikes()) {
            const sx = spike.x;
            const sy = spike.y;
            if (
              player.x + PW > sx + 4 &&
              player.x < sx + 20 &&
              player.y > sy + 2 &&
              player.y - PH < sy + 18
            ) {
              const startPlat = editorState.getLeftmostPlatform();
              if (startPlat) {
                player.x = startPlat.x + startPlat.width / 2 - 10;
                player.y = startPlat.y + startPlat.height + 10;
              } else {
                player.x = 0;
                player.y = 100;
              }
              player.vy = 0;
              player.jumpTimer = 0;
            }
          }

          for (const goal of editorState.getGoals()) {
            const gcx = goal.x + 20;
            const gcy = goal.y + 20;
            const pcx = player.x;
            const pcy = player.y - PH / 2;
            const dx = pcx - gcx;
            const dy = pcy - gcy;
            if (dx * dx + dy * dy < 30 * 30) {
              if (!hasWonRef.current) {
                hasWonRef.current = true;
                onWinRef.current();
              }
            }
          }
        }

        const pGeo = new THREE.PlaneGeometry(PW, PH);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(player.x, player.y - PH / 2, 5);
        scene.add(pMesh);
        playerMeshRef.current = pMesh;
      }

      renderer.render(scene, camera);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, editorState, getCanvasSize, toolMode]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: '#1a1a2e',
      }}
    />
  );
};

export default EditorCanvas;
