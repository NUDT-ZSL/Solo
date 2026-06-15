import { Sprite, Note, Bat } from './entities';
import { PlatformManager } from './platform';
import { Renderer } from './renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const scoreEl = document.getElementById('score')!;
const heartsEl = document.getElementById('hearts')!;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  platforms.resize(canvas.width, canvas.height);
  const start = platforms.getStartPosition();
  sprite.startX = start.x;
  sprite.startY = start.y;
  sprite.respawn();
  regenerateNotes();
  renderer.resize(canvas.width, canvas.height);
});

const platforms = new PlatformManager(canvas.width, canvas.height);
const startPos = platforms.getStartPosition();
const sprite = new Sprite(startPos.x, startPos.y);
const renderer = new Renderer(canvas, ctx);

let notes: Note[] = [];
let bats: Bat[] = [];
let batTimer = 0;
const BAT_SPAWN_INTERVAL = 8;

const keys = new Set<string>();

function regenerateNotes(): void {
  notes = [];
  for (const p of platforms.platforms) {
    if (Math.random() > 0.3) {
      notes.push(new Note(p));
    }
    if (p.width > 120 && Math.random() > 0.6) {
      notes.push(new Note(p));
    }
  }
}
regenerateNotes();

function updateHud(): void {
  scoreEl.textContent = String(sprite.score);
  heartsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= sprite.lives ? ' empty' : '');
    heartsEl.appendChild(h);
  }
}
updateHud();

function resetGame(): void {
  sprite.reset();
  notes = [];
  bats = [];
  batTimer = 0;
  regenerateNotes();
  updateHud();
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
    e.preventDefault();
  }
  keys.add(e.code);
  if (e.code === 'KeyR') {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

let lastTime = performance.now();

function loop(now: number): void {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  sprite.update(dt, keys, platforms, canvas.width, canvas.height);

  for (const note of notes) {
    note.update(dt);
    if (!note.collected && note.checkCollision(sprite)) {
      note.collected = true;
      sprite.collectNote();
      renderer.spawnCollectParticles(note.x, note.y);
      updateHud();
    }
  }
  notes = notes.filter((n) => !n.collected);

  batTimer += dt;
  if (batTimer >= BAT_SPAWN_INTERVAL) {
    batTimer = 0;
    bats.push(new Bat(canvas.width, canvas.height));
  }

  for (const bat of bats) {
    bat.update(dt, sprite, canvas.width, canvas.height);
    const col = bat.checkCollision(sprite);
    if (col === 'hit') {
      sprite.loseLife();
      updateHud();
    } else if (col === 'touched') {
      sprite.triggerShake(1.5);
    }
  }
  bats = bats.filter((b) => !b.dead);

  renderer.updateParticles(dt);

  renderer.clear();
  renderer.drawPlatforms(platforms.platforms);
  for (const note of notes) renderer.drawNote(note);
  for (const bat of bats) renderer.drawBat(bat);
  renderer.drawSprite(sprite);
  renderer.drawParticles();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
