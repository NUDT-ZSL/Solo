import { MazeManager } from './mazeManager';
import { Renderer } from './renderer';
import { AudioManager } from './audioManager';
import type { MirrorShard } from './mazeManager';

const canvas = document.getElementById('maze-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const manager = new MazeManager();
const renderer = new Renderer(canvas);
const audio = new AudioManager();

let mouseX = 0;
let mouseY = 0;
let mouseOnCanvas = false;
let draggingShard: MirrorShard | null = null;
let lastTime = performance.now();
let loopDetectedAt = 0;
const LOOP_COOLDOWN = 500;

function resizeCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.resize(w, h);
  if (manager.canvasWidth === 0) {
    manager.init(w, h);
  } else {
    manager.resize(w, h);
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
audio.init();

canvas.addEventListener('mouseenter', () => {
  mouseOnCanvas = true;
  audio.resume();
});

canvas.addEventListener('mouseleave', () => {
  mouseOnCanvas = false;
  if (draggingShard) {
    const now = performance.now();
    handleDragEnd(now);
  }
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  renderer.setMouse(mouseX, mouseY, mouseOnCanvas);

  if (draggingShard) {
    manager.updateDrag(draggingShard, mouseX, mouseY);
  } else if (mouseOnCanvas) {
    const hovered = manager.getShardAt(mouseX, mouseY);
    if (hovered) {
      manager.triggerCrack(hovered, mouseX, mouseY, performance.now());
    }
  }
});

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return;
  if (manager.levelTransition.active) return;
  audio.resume();
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  const shard = manager.getShardAt(mouseX, mouseY);
  if (shard) {
    draggingShard = shard;
    manager.startDrag(shard, mouseX, mouseY);
    manager.triggerCrack(shard, mouseX, mouseY, performance.now());
  }
});

function handleDragEnd(now: number): void {
  if (!draggingShard) return;
  const result = manager.endDrag(draggingShard, now);
  const shard = draggingShard;
  draggingShard = null;

  if (result.broken) {
    audio.playBreakSound();
  }

  if (result.aligned) {
    for (const nid of shard.neighbors) {
      const neighbor = manager.shards.find(s => s.id === nid);
      if (!neighbor) continue;
      const diff = Math.abs(shard.rotation - neighbor.rotation);
      const normalized = Math.min(diff, Math.abs(diff - Math.PI * 2), Math.abs(diff + Math.PI * 2));
      if (normalized < 5 * Math.PI / 180) {
        const added = manager.addPath(shard, neighbor, now);
        if (added) {
          audio.playGlassClick();
        }
      }
    }

    if (now - loopDetectedAt > LOOP_COOLDOWN) {
      const loopCheck = manager.checkLoops(now);
      if (loopCheck.found) {
        loopDetectedAt = now;
        manager.spawnRipple(loopCheck.centerX, loopCheck.centerY, now);
        audio.playRippleWhoosh();
        setTimeout(() => {
          manager.startLevelTransition(performance.now());
        }, 350);
      }
    }
  }
}

window.addEventListener('mouseup', () => {
  if (draggingShard) {
    handleDragEnd(performance.now());
  }
});

function loop(now: number): void {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  manager.update(now, dt);
  renderer.render(manager, now);

  requestAnimationFrame(loop);
}

requestAnimationFrame((t) => {
  lastTime = t;
  loop(t);
});
