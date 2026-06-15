import { Starfield } from './starfield';
import { Ship } from './ship';
import { Minerals } from './minerals';
import { BlackHole } from './blackhole';

const LOGICAL_W = 1600;
const LOGICAL_H = 900;

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D not supported');

const starfield = new Starfield();
const ship = new Ship();
const minerals = new Minerals();
const blackhole = new BlackHole();

let lastTime = 0;
let redFlashTimer = 0;
let redFlashMax = 1;

const mouse = {
  x: LOGICAL_W / 2,
  y: LOGICAL_H / 2,
  prevX: LOGICAL_W / 2,
  prevY: LOGICAL_H / 2,
  deltaX: 0,
  deltaY: 0
};

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas(): void {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const ratio = LOGICAL_W / LOGICAL_H;
  let w: number;
  let h: number;
  if (winW / winH > ratio) {
    h = winH;
    w = h * ratio;
  } else {
    w = winW;
    h = w / ratio;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  scale = (w / LOGICAL_W) * dpr;
  offsetX = (winW - w) / 2 * dpr;
  offsetY = (winH - h) / 2 * dpr;
  starfield.resize(LOGICAL_W, LOGICAL_H);
  minerals.resize(LOGICAL_W, LOGICAL_H);
  blackhole.resize(LOGICAL_W, LOGICAL_H);
  if (ship.x === 0 && ship.y === 0) {
    ship.init(LOGICAL_W, LOGICAL_H);
  }
}

window.addEventListener('resize', resizeCanvas);

function clientToLogical(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (canvas.width / rect.width) - offsetX;
  const py = (clientY - rect.top) * (canvas.height / rect.height) - offsetY;
  return {
    x: px / scale,
    y: py / scale
  };
}

window.addEventListener('mousemove', (e) => {
  const { x, y } = clientToLogical(e.clientX, e.clientY);
  if (x >= 0 && x <= LOGICAL_W && y >= 0 && y <= LOGICAL_H) {
    mouse.x = x;
    mouse.y = y;
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    minerals.refreshAroundShip();
  }
});

resizeCanvas();
minerals.refresh();

function step(now: number): void {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(0.05, rawDt);

  mouse.deltaX = mouse.x - mouse.prevX;
  mouse.deltaY = mouse.y - mouse.prevY;
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;

  if (!ship.isDead()) {
    ship.setTarget(mouse.x, mouse.y, mouse.deltaX, mouse.deltaY);
  }

  const grav = blackhole.update(dt, ship.x, ship.y, minerals.getPositions());
  if (grav.hasBlackHole && !ship.isDead()) {
    ship.applyGravityPull(grav.pullX, grav.pullY);
    ship.setDangerLevel(grav.dangerT);
  } else {
    ship.setDangerLevel(0);
  }

  ship.update(dt);

  minerals.setShipPos(ship.x, ship.y);
  minerals.update(dt, ship.x, ship.y, ship.getRadius());

  if (grav.collided) {
    redFlashTimer = redFlashMax;
    ship.triggerExplode();
  }

  if (redFlashTimer > 0) {
    redFlashTimer -= dt;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050514';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  starfield.draw(ctx);
  minerals.draw(ctx);
  blackhole.draw(ctx);
  ship.draw(ctx);

  if (redFlashTimer > 0) {
    const t = redFlashTimer / redFlashMax;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    const a = 0.45 * (0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 6)));
    ctx.fillStyle = `rgba(200, 0, 0, ${a})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.restore();
  }

  requestAnimationFrame(step);
}

requestAnimationFrame((t) => {
  lastTime = t;
  step(t);
});
