import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import EditorState from './EditorState';
import { PlatformData, SpikeData, GoalData } from './EditorState';

interface Props {
  editorState: EditorState;
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
const PLAYER_SPEED = 200;
const JUMP_VELOCITY = 400;
const GRAVITY = 800;
const JUMP_INTERVAL = 0.8;
const PLAYER_SIZE = 20;

const EditorCanvas: React.FC<Props> = ({ editorState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const gridGroupRef = useRef<THREE.Group | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const connectionsGroupRef = useRef<THREE.Group | null>(null);
  const handlesGroupRef = useRef<THREE.Group | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);

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
  const playerRef = useRef<PlayerState | null>(null);
  const hasWonRef = useRef(false);
  const [showWin, setShowWin] = useState(false);

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

    const gridGroup = new THREE.Group();
    scene.add(gridGroup);
    gridGroupRef.current = gridGroup;

    const connectionsGroup = new THREE.Group();
    scene.add(connectionsGroup);
    connectionsGroupRef.current = connectionsGroup;

    const elementsGroup = new THREE.Group();
    scene.add(elementsGroup);
    elementsGroupRef.current = elementsGroup;

    const handlesGroup = new THREE.Group();
    scene.add(handlesGroup);
    handlesGroupRef.current = handlesGroup;

    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;

    buildGrid(gridGroup);

    return () => {
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [getCanvasSize]);

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
      if (editorState.isPlaying) return;
      const { sx, sy } = getMousePos(e);
      const wpos = screenToWorld(sx, sy);

      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
        dragStateRef.current = {
          type: 'pan', startSX: sx, startSY: sy,
          startPanX: editorState.panX, startPanY: editorState.panY,
          startElX: 0, startElY: 0, handleId: '', handleKey: '',
        };
        canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button === 0) {
        const mode = editorState.toolMode;
        if (mode === 'select') {
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
            return;
          }
          editorState.select(null);
          dragStateRef.current = {
            type: 'pan', startSX: sx, startSY: sy,
            startPanX: editorState.panX, startPanY: editorState.panY,
            startElX: 0, startElY: 0, handleId: '', handleKey: '',
          };
          canvas.style.cursor = 'grabbing';
        } else if (mode === 'platform') {
          editorState.addPlatform(wpos.x, wpos.y);
        } else if (mode === 'spike') {
          editorState.addSpike(wpos.x, wpos.y);
        } else if (mode === 'goal') {
          editorState.addGoal(wpos.x, wpos.y);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const { sx, sy } = getMousePos(e);
      const wpos = screenToWorld(sx, sy);

      if (editorState.isPlaying) return;

      const ds = dragStateRef.current;
      if (ds.type === 'pan') {
        const dx = (sx - ds.startSX) / editorState.zoom;
        const dy = (sy - ds.startSY) / editorState.zoom;
        editorState.setPan(ds.startPanX - dx, ds.startPanY + dy);
      } else if (ds.type === 'move' && ds.handleId) {
        const dx = (sx - ds.startSX) / editorState.zoom;
        const dy = (sy - ds.startSY) / editorState.zoom;
        editorState.moveElement(ds.handleId, ds.startElX + dx, ds.startElY - dy);
      } else if (ds.type === 'resize' && ds.handleId) {
        editorState.resizePlatform(ds.handleId, ds.handleKey, wpos.x, wpos.y);
      } else {
        const hit = editorState.hitTest(wpos.x, wpos.y);
        hoverRef.current = hit ? hit.id : null;

        if (editorState.toolMode === 'select') {
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
        const mode = editorState.toolMode;
        rendererRef.current && (rendererRef.current.domElement.style.cursor = mode === 'select' ? 'default' : 'crosshair');
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { sx, sy } = getMousePos(e);
      const before = screenToWorld(sx, sy);
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(2.0, editorState.zoom * factor));
      editorState.setZoom(newZoom);
      const after = screenToWorld(sx, sy);
      editorState.setPan(editorState.panX + before.x - after.x, editorState.panY + before.y - after.y);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editorState.isPlaying) {
        editorState.setPlaying(false);
        setShowWin(false);
        return;
      }
      if (e.key === 'Delete' && editorState.selectedId && !editorState.isPlaying) {
        editorState.removeElement(editorState.selectedId);
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
  }, [editorState, screenToWorld]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    let running = true;

    const animate = (time: number) => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(animate);

      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = time;

      const { w, h } = getCanvasSize();
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.zoom = editorState.zoom;
      camera.position.set(editorState.panX * editorState.zoom, -editorState.panY * editorState.zoom, 100);
      camera.updateProjectionMatrix();

      updateGridPosition();

      if (elementsGroupRef.current) {
        clearGroup(elementsGroupRef.current);
        renderElements(elementsGroupRef.current, time);
      }

      if (connectionsGroupRef.current) {
        clearGroup(connectionsGroupRef.current);
        renderConnections(connectionsGroupRef.current);
      }

      if (handlesGroupRef.current) {
        clearGroup(handlesGroupRef.current);
        if (!editorState.isPlaying && editorState.selectedId) {
          renderHandles(handlesGroupRef.current);
        }
      }

      if (playerGroupRef.current) {
        clearGroup(playerGroupRef.current);
        if (editorState.isPlaying) {
          updatePlayer(dt);
          renderPlayer(playerGroupRef.current);
        }
      }

      renderer.render(scene, camera);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [editorState, getCanvasSize]);

  useEffect(() => {
    if (editorState.isPlaying) {
      const startPlat = editorState.getLeftmostPlatform();
      if (startPlat) {
        playerRef.current = {
          x: startPlat.x + startPlat.width / 2 - PLAYER_SIZE / 2,
          y: startPlat.y + startPlat.height,
          vx: PLAYER_SPEED,
          vy: 0,
          grounded: true,
          jumpTimer: 0,
        };
      } else {
        playerRef.current = { x: 0, y: 100, vx: PLAYER_SPEED, vy: 0, grounded: false, jumpTimer: 0 };
      }
      hasWonRef.current = false;
      setShowWin(false);
    } else {
      playerRef.current = null;
    }
  }, [editorState, editorState.isPlaying]);

  const buildGrid = (group: THREE.Group) => {
    const gridColor = 0x2a2a3e;
    const gridPositions: number[] = [];
    for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
      gridPositions.push(i, -GRID_EXTENT, 0, i, GRID_EXTENT, 0);
      gridPositions.push(-GRID_EXTENT, i, 0, GRID_EXTENT, i, 0);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.5 });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
    gridLines.name = 'grid';
    group.add(gridLines);
  };

  const updateGridPosition = () => {
    if (!gridGroupRef.current) return;
    const grid = gridGroupRef.current.children[0] as THREE.LineSegments;
    if (!grid) return;
    const snapX = Math.floor(editorState.panX / GRID_SIZE) * GRID_SIZE;
    const snapY = Math.floor(editorState.panY / GRID_SIZE) * GRID_SIZE;
    grid.position.set(snapX, snapY, 0);
  };

  const clearGroup = (group: THREE.Group) => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: any) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    }
  };

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
    shape.moveTo(x, y);
    shape.lineTo(x + 12, y + 20);
    shape.lineTo(x + 24, y);
    shape.closePath();
    return shape;
  };

  const renderElements = (group: THREE.Group, time: number) => {
    for (const el of editorState.elements) {
      if (el.type === 'platform') {
        const p = el as PlatformData;
        const shape = createRoundedRectShape(p.x, p.y, p.width, p.height, 4);
        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        const borderShape = createRoundedRectShape(p.x - 1, p.y - 1, p.width + 2, p.height + 2, 5);
        const hole = createRoundedRectShape(p.x, p.y, p.width, p.height, 4);
        borderShape.holes.push(hole);
        const borderGeo = new THREE.ShapeGeometry(borderShape);
        const borderMat = new THREE.MeshBasicMaterial({ color: 0x2a7acc });
        const borderMesh = new THREE.Mesh(borderGeo, borderMat);
        group.add(borderMesh);

        if (!editorState.isPlaying && el.id === hoverRef.current) {
          const label = `平台 (${Math.round(p.x)}, ${Math.round(p.y)}) ${p.width}x${p.height}`;
          renderLabel(group, p.x + p.width / 2, p.y + p.height + 14, label);
        }
      } else if (el.type === 'spike') {
        const s = el as SpikeData;
        const shape = createSpikeShape(s.x, s.y);
        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        group.add(new THREE.Mesh(geo, mat));

        if (!editorState.isPlaying && el.id === hoverRef.current) {
          const label = `尖刺 (${Math.round(s.x)}, ${Math.round(s.y)})`;
          renderLabel(group, s.x + 12, s.y + 20 + 14, label);
        }
      } else if (el.type === 'goal') {
        const g = el as GoalData;
        const breathe = 0.8 + 0.3 * (0.5 + 0.5 * Math.sin(time / 1000 * Math.PI));
        const radius = 20 * breathe;
        const geo = new THREE.CircleGeometry(radius, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(g.x + 20, g.y + 20, 0);
        group.add(mesh);

        if (!editorState.isPlaying && el.id === hoverRef.current) {
          const label = `终点 (${Math.round(g.x)}, ${Math.round(g.y)})`;
          renderLabel(group, g.x + 20, g.y + 40 + 14, label);
        }
      }
    }
  };

  const renderLabel = (group: THREE.Group, x: number, y: number, text: string) => {
    const canvas = document.createElement('canvas');
    const padding = 16;
    const fontSize = 16;
    const tempCtx = canvas.getContext('2d')!;
    tempCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const textWidth = tempCtx.measureText(text).width;
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    roundRect(ctx, 0, 0, canvas.width, canvas.height, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, 10);
    sprite.scale.set(canvas.width * 0.5, canvas.height * 0.5, 1);
    group.add(sprite);
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };

  const renderConnections = (group: THREE.Group) => {
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
        group.add(dashLine);
      }
    }
  };

  const renderHandles = (group: THREE.Group) => {
    const sel = editorState.getSelected();
    if (!sel || sel.type !== 'platform') return;
    const p = sel as PlatformData;
    const handles = [
      { x: p.x, y: p.y + p.height, cursor: 'tl' },
      { x: p.x + p.width, y: p.y + p.height, cursor: 'tr' },
      { x: p.x, y: p.y, cursor: 'bl' },
      { x: p.x + p.width, y: p.y, cursor: 'br' },
      { x: p.x, y: p.y + p.height / 2, cursor: 'ml' },
      { x: p.x + p.width, y: p.y + p.height / 2, cursor: 'mr' },
      { x: p.x + p.width / 2, y: p.y + p.height, cursor: 'mt' },
      { x: p.x + p.width / 2, y: p.y, cursor: 'mb' },
    ];
    for (const h of handles) {
      const hGeo = new THREE.PlaneGeometry(8, 8);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const hMesh = new THREE.Mesh(hGeo, hMat);
      hMesh.position.set(h.x, h.y, 5);
      group.add(hMesh);
    }
  };

  const updatePlayer = (dt: number) => {
    if (!playerRef.current || hasWonRef.current) return;
    const player = playerRef.current;
    const platforms = editorState.getPlatforms();
    const spikes = editorState.getSpikes();
    const goals = editorState.getGoals();

    player.vy -= GRAVITY * dt;
    player.jumpTimer += dt;

    if (player.grounded && player.jumpTimer >= JUMP_INTERVAL) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
      player.jumpTimer = 0;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.grounded = false;
    for (const plat of platforms) {
      const px1 = plat.x;
      const px2 = plat.x + plat.width;
      const py1 = plat.y;
      const py2 = plat.y + plat.height;

      const bx1 = player.x;
      const bx2 = player.x + PLAYER_SIZE;
      const by1 = player.y;
      const by2 = player.y + PLAYER_SIZE;

      if (bx2 > px1 && bx1 < px2 && by1 < py2 && by2 > py1) {
        const prevBottom = by1 - player.vy * dt;
        if (player.vy <= 0 && prevBottom >= py2 - 1) {
          player.y = py2;
          player.vy = 0;
          player.grounded = true;
        } else if (player.vy > 0 && by2 - player.vy * dt <= py1 + 1) {
          player.y = py1 - PLAYER_SIZE;
          player.vy = 0;
        }
      }
    }

    if (player.y < -500) {
      resetPlayer();
    }

    for (const spike of spikes) {
      const sx = spike.x + 2;
      const sy = spike.y + 2;
      const sw = 20;
      const sh = 18;
      if (
        player.x + PLAYER_SIZE > sx &&
        player.x < sx + sw &&
        player.y + PLAYER_SIZE > sy &&
        player.y < sy + sh
      ) {
        resetPlayer();
        return;
      }
    }

    for (const goal of goals) {
      const gcx = goal.x + 20;
      const gcy = goal.y + 20;
      const pcx = player.x + PLAYER_SIZE / 2;
      const pcy = player.y + PLAYER_SIZE / 2;
      const dx = pcx - gcx;
      const dy = pcy - gcy;
      if (dx * dx + dy * dy < 25 * 25) {
        if (!hasWonRef.current) {
          hasWonRef.current = true;
          setShowWin(true);
        }
        return;
      }
    }
  };

  const resetPlayer = () => {
    if (!playerRef.current) return;
    const startPlat = editorState.getLeftmostPlatform();
    if (startPlat) {
      playerRef.current.x = startPlat.x + startPlat.width / 2 - PLAYER_SIZE / 2;
      playerRef.current.y = startPlat.y + startPlat.height;
    } else {
      playerRef.current.x = 0;
      playerRef.current.y = 100;
    }
    playerRef.current.vx = PLAYER_SPEED;
    playerRef.current.vy = 0;
    playerRef.current.grounded = true;
    playerRef.current.jumpTimer = 0;
  };

  const renderPlayer = (group: THREE.Group) => {
    if (!playerRef.current) return;
    const p = playerRef.current;
    const pGeo = new THREE.PlaneGeometry(PLAYER_SIZE, PLAYER_SIZE);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.set(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2, 10);
    group.add(pMesh);
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: '#1a1a2e',
      }}
    >
      {showWin && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#2ecc71',
            color: '#ffffff',
            padding: '32px 64px',
            borderRadius: '12px',
            fontSize: '28px',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(46, 204, 113, 0.4)',
          }}>
            通关！
            <div style={{ fontSize: '14px', marginTop: '12px', fontWeight: 'normal', opacity: 0.9 }}>
              按 Esc 退出预览
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorCanvas;
