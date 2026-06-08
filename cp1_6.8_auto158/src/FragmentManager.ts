import type { Fragment, FragmentDef, Vec2 } from './types';

const SNAP_THRESHOLD = 30;
const GRID_SNAP_SPEED = 8;
const EASE_LERP = 0.15;
const MAGNETIC_STRENGTH = 2;
const DRAG_OFFSET_LERP = 0.2;

export class FragmentManager {
  fragments: Fragment[] = [];
  private gridSpacing: number = 40;
  private canvasW: number = 0;
  private canvasH: number = 0;

  init(defs: FragmentDef[], gridSpacing: number, canvasW: number, canvasH: number) {
    this.gridSpacing = gridSpacing;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.fragments = defs.map((def) => {
      const scattered = this.scatterPosition(canvasW, canvasH);
      return {
        id: def.id,
        vertices: def.vertices.map((v) => ({ ...v })),
        color: def.color,
        glowColor: def.glowColor,
        position: scattered,
        rotation: def.targetRotation + (Math.random() - 0.5) * 0.3,
        targetPosition: { ...def.targetPosition },
        targetRotation: def.targetRotation,
        gravity: def.gravity,
        magnetic: def.magnetic,
        magneticRange: def.magneticRange,
        state: 'idle',
        glowIntensity: 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        snapFrom: null,
        snapProgress: 0,
        mergeFlashTimer: 0,
      };
    });
  }

  private scatterPosition(w: number, h: number): Vec2 {
    const margin = 100;
    return {
      x: (Math.random() - 0.5) * (w - margin * 2),
      y: (Math.random() - 0.5) * (h - margin * 2),
    };
  }

  private snapToGrid(pos: Vec2): Vec2 {
    const gs = this.gridSpacing;
    return {
      x: Math.round(pos.x / gs) * gs,
      y: Math.round(pos.y / gs) * gs,
    };
  }

  findFragmentAt(worldX: number, worldY: number): Fragment | null {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      if (f.state === 'merged') continue;
      if (this.pointInFragment(worldX, worldY, f)) return f;
    }
    return null;
  }

  private pointInFragment(px: number, py: number, f: Fragment): boolean {
    const verts = this.getWorldVertices(f);
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  getWorldVertices(f: Fragment): Vec2[] {
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);
    return f.vertices.map((v) => ({
      x: f.position.x + v.x * cos - v.y * sin,
      y: f.position.y + v.x * sin + v.y * cos,
    }));
  }

  startDrag(fragment: Fragment, worldX: number, worldY: number) {
    if (fragment.state === 'merged') return;
    fragment.state = 'dragging';
    fragment.glowIntensity = 1.0;
  }

  updateDrag(fragment: Fragment, worldX: number, worldY: number) {
    if (fragment.state !== 'dragging') return;
    const targetX = worldX;
    const targetY = worldY;
    fragment.position.x += (targetX - fragment.position.x) * DRAG_OFFSET_LERP;
    fragment.position.y += (targetY - fragment.position.y) * DRAG_OFFSET_LERP;
    fragment.rotation += (fragment.targetRotation - fragment.rotation) * 0.1;
  }

  endDrag(fragment: Fragment): { snapped: boolean; merged: boolean } {
    if (fragment.state !== 'dragging') return { snapped: false, merged: false };

    if (fragment.gravity) {
      const gridPos = this.snapToGrid(fragment.position);
      fragment.snapFrom = { ...fragment.position };
      fragment.position = gridPos;
      fragment.state = 'snapping';
      fragment.snapProgress = 0;
      return { snapped: true, merged: false };
    }

    fragment.state = 'idle';
    const merged = this.checkMerge(fragment);
    this.applyMagneticEffect(fragment);
    return { snapped: false, merged };
  }

  checkMerge(fragment: Fragment): boolean {
    const dx = fragment.position.x - fragment.targetPosition.x;
    const dy = fragment.position.y - fragment.targetPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rotDiff = Math.abs(fragment.rotation - fragment.targetRotation);

    if (dist < SNAP_THRESHOLD && rotDiff < 0.3) {
      fragment.state = 'merged';
      fragment.position = { ...fragment.targetPosition };
      fragment.rotation = fragment.targetRotation;
      fragment.glowIntensity = 2.0;
      fragment.mergeFlashTimer = 0.8;
      return true;
    }
    return false;
  }

  applyMagneticEffect(source: Fragment) {
    if (source.magnetic === 'none') return;
    for (const f of this.fragments) {
      if (f.id === source.id || f.state === 'merged' || f.state === 'dragging') continue;
      const dx = f.position.x - source.position.x;
      const dy = f.position.y - source.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < source.magneticRange && dist > 1) {
        const force = MAGNETIC_STRENGTH * (1 - dist / source.magneticRange);
        const nx = dx / dist;
        const ny = dy / dist;
        if (source.magnetic === 'attract') {
          f.position.x -= nx * force;
          f.position.y -= ny * force;
        } else if (source.magnetic === 'repel') {
          f.position.x += nx * force;
          f.position.y += ny * force;
        }
      }
    }
  }

  allMerged(): boolean {
    return this.fragments.every((f) => f.state === 'merged');
  }

  getNextMergeable(): Fragment | null {
    return this.fragments.find((f) => f.state !== 'merged') || null;
  }

  update(dt: number) {
    for (const f of this.fragments) {
      f.pulsePhase += dt * 3;

      if (f.state === 'idle') {
        f.glowIntensity += (0.4 - f.glowIntensity) * dt * 3;
      }

      if (f.state === 'snapping' && f.snapFrom) {
        f.snapProgress += dt * GRID_SNAP_SPEED;
        if (f.snapProgress >= 1) {
          f.snapProgress = 1;
          f.snapFrom = null;
          f.state = 'idle';
          this.checkMerge(f);
          this.applyMagneticEffect(f);
        }
      }

      if (f.mergeFlashTimer > 0) {
        f.mergeFlashTimer -= dt;
        f.glowIntensity = 1.5 + Math.sin(f.mergeFlashTimer * 20) * 0.5;
        if (f.mergeFlashTimer <= 0) {
          f.glowIntensity = 0.8;
          f.mergeFlashTimer = 0;
        }
      }

      if (f.state === 'merged' && f.mergeFlashTimer <= 0) {
        f.glowIntensity += (0.8 - f.glowIntensity) * dt * 2;
      }
    }
  }

  reset(canvasW: number, canvasH: number) {
    for (const f of this.fragments) {
      const scattered = this.scatterPosition(canvasW, canvasH);
      f.position = scattered;
      f.rotation = f.targetRotation + (Math.random() - 0.5) * 0.3;
      f.state = 'idle';
      f.glowIntensity = 0.4;
      f.mergeFlashTimer = 0;
      f.snapFrom = null;
      f.snapProgress = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, hintId: number | null) {
    for (const f of this.fragments) {
      const worldVerts = this.getWorldVertices(f);
      const screenVerts = worldVerts.map((v) => ({
        x: centerX + v.x,
        y: centerY + v.y,
      }));

      const pulse = f.state === 'idle' ? Math.sin(f.pulsePhase) * 0.1 : 0;
      const alpha = f.state === 'merged' ? 0.5 : 0.25 + pulse;
      const isHinted = hintId === f.id && f.state !== 'merged';

      if (isHinted) {
        const hintPulse = (Math.sin(f.pulsePhase * 2) + 1) / 2;
        ctx.shadowColor = f.glowColor;
        ctx.shadowBlur = 30 + hintPulse * 20;
      } else {
        ctx.shadowColor = f.glowColor;
        ctx.shadowBlur = 8 * f.glowIntensity;
      }

      ctx.beginPath();
      ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
      for (let i = 1; i < screenVerts.length; i++) {
        ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.strokeStyle = f.glowColor;
      ctx.lineWidth = isHinted ? 3 : 2;
      ctx.globalAlpha = 0.6 + f.glowIntensity * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (f.mergeFlashTimer > 0) {
        ctx.beginPath();
        ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
        for (let i = 1; i < screenVerts.length; i++) {
          ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
        }
        ctx.closePath();
        const flashAlpha = Math.sin(f.mergeFlashTimer * 30) * 0.3 + 0.2;
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fill();
      }

      if (f.gravity && f.state !== 'merged') {
        this.drawGravityIcon(ctx, centerX + f.position.x, centerY + f.position.y - 25);
      }
      if (f.magnetic !== 'none' && f.state !== 'merged') {
        this.drawMagneticIcon(ctx, centerX + f.position.x + 20, centerY + f.position.y - 20, f.magnetic);
      }
    }
  }

  private drawGravityIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,255,209,0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G', x, y);
    ctx.restore();
  }

  private drawMagneticIcon(ctx: CanvasRenderingContext2D, x: number, y: number, type: 'attract' | 'repel') {
    ctx.save();
    ctx.fillStyle = type === 'attract' ? 'rgba(255,215,0,0.6)' : 'rgba(255,0,170,0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(type === 'attract' ? 'M+' : 'M-', x, y);
    ctx.restore();
  }

  drawTargetOutlines(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
    for (const f of this.fragments) {
      if (f.state === 'merged') continue;
      const cos = Math.cos(f.targetRotation);
      const sin = Math.sin(f.targetRotation);
      const screenVerts = f.vertices.map((v) => ({
        x: centerX + f.targetPosition.x + v.x * cos - v.y * sin,
        y: centerY + f.targetPosition.y + v.x * sin + v.y * cos,
      }));

      ctx.beginPath();
      ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
      for (let i = 1; i < screenVerts.length; i++) {
        ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
      }
      ctx.closePath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
