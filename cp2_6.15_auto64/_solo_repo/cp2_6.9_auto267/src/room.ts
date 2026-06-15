export type RuneType = 'triangle' | 'circle' | 'wave' | 'hexagram' | 'sun';

export interface DiskState {
  x: number;
  y: number;
  radius: number;
  rune: RuneType;
  angle: number;
  targetAngle: number;
  pulsePhase: number;
  hovered: boolean;
}

export interface PasswordButton {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  pressed: boolean;
  pressedTime: number;
  hovered: boolean;
}

export interface RoomState {
  width: number;
  height: number;
  scale: number;

  disks: DiskState[];
  disksSolved: boolean;
  stoneTableX: number;
  stoneTableY: number;
  stoneTableWidth: number;
  stoneTableHeight: number;

  puzzleVisible: boolean;
  puzzleFadeAlpha: number;

  compartmentOpen: boolean;
  compartmentCrackProgress: number;

  passwordBoxVisible: boolean;
  passwordBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    input: string;
    correctPassword: string;
    buttons: PasswordButton[];
    shakeTime: number;
    opened: boolean;
  };

  paperNote: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    read: boolean;
    hovered: boolean;
    poem: string;
    shuffledPoem: string;
  };

  keyObtained: boolean;
  keyAnimation: number;

  ironDoor: {
    x: number;
    y: number;
    width: number;
    height: number;
    unlocked: boolean;
    openProgress: number;
    keyInsertProgress: number;
    clickable: boolean;
    hovered: boolean;
  };

  victory: boolean;
  victoryFade: number;
  startTime: number;
  elapsedTime: number;

  transitionAlpha: number;
  transitioning: boolean;
}

const POEMS = [
  { poem: '床前明月光', password: '125' },
  { poem: '疑是地上霜', password: '379' },
  { poem: '举头望明月', password: '468' },
  { poem: '低头思故乡', password: '258' }
];

function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export function createRoom(width: number, height: number): RoomState {
  const isMobile = width < 768;
  const scale = isMobile ? 0.6 : 1;

  const tableWidth = 240 * scale;
  const tableHeight = 120 * scale;
  const tableX = (width - tableWidth) / 2;
  const tableY = height * 0.55 - tableHeight / 2;

  const diskRadius = 20 * scale;
  const diskSpacing = (tableWidth - 40 * scale) / 4;
  const runes: RuneType[] = ['triangle', 'circle', 'wave', 'hexagram', 'sun'];
  const disks: DiskState[] = runes.map((rune, i) => ({
    x: tableX + 20 * scale + i * diskSpacing,
    y: tableY + tableHeight / 2,
    radius: diskRadius,
    rune,
    angle: Math.floor(Math.random() * 8) * (Math.PI / 4),
    targetAngle: 0,
    pulsePhase: 0,
    hovered: false
  }));

  const poemData = POEMS[Math.floor(Math.random() * POEMS.length)];
  const buttonSize = 30 * scale;
  const buttonHeight = 25 * scale;
  const buttons: PasswordButton[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const val = row * 3 + col + 1;
      buttons.push({
        x: 0,
        y: 0,
        width: buttonSize,
        height: buttonHeight,
        value: val,
        pressed: false,
        pressedTime: 0,
        hovered: false
      });
    }
  }

  const corner = Math.floor(Math.random() * 4);
  let noteX = 0, noteY = 0;
  const noteW = 100 * scale, noteH = 60 * scale;
  switch (corner) {
    case 0: noteX = 20; noteY = 20; break;
    case 1: noteX = width - noteW - 20; noteY = 20; break;
    case 2: noteX = 20; noteY = height - noteH - 20; break;
    case 3: noteX = width - noteW - 20; noteY = height - noteH - 20; break;
  }

  const doorW = 160 * scale;
  const doorH = 300 * scale;

  return {
    width,
    height,
    scale,

    disks,
    disksSolved: false,
    stoneTableX: tableX,
    stoneTableY: tableY,
    stoneTableWidth: tableWidth,
    stoneTableHeight: tableHeight,

    puzzleVisible: false,
    puzzleFadeAlpha: 0,

    compartmentOpen: false,
    compartmentCrackProgress: 0,

    passwordBoxVisible: false,
    passwordBox: {
      x: 0,
      y: 0,
      width: 120 * scale,
      height: 80 * scale,
      input: '',
      correctPassword: poemData.password,
      buttons,
      shakeTime: 0,
      opened: false
    },

    paperNote: {
      x: noteX,
      y: noteY,
      width: noteW,
      height: noteH,
      visible: true,
      read: false,
      hovered: false,
      poem: poemData.poem,
      shuffledPoem: shuffleString(poemData.poem)
    },

    keyObtained: false,
    keyAnimation: 0,

    ironDoor: {
      x: width - doorW - 30,
      y: 30,
      width: doorW,
      height: doorH,
      unlocked: false,
      openProgress: 0,
      keyInsertProgress: 0,
      clickable: false,
      hovered: false
    },

    victory: false,
    victoryFade: 0,
    startTime: Date.now(),
    elapsedTime: 0,

    transitionAlpha: 0,
    transitioning: false
  };
}

export function layoutPasswordBox(state: RoomState): void {
  const box = state.passwordBox;
  const startX = box.x + (box.width - (3 * box.buttons[0].width + 2 * 5 * state.scale)) / 2;
  const startY = box.y + 20 * state.scale;
  const gap = 5 * state.scale;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      box.buttons[idx].x = startX + col * (box.buttons[idx].width + gap);
      box.buttons[idx].y = startY + row * (box.buttons[idx].height + gap);
    }
  }
}

export function checkDisksSolved(state: RoomState): boolean {
  for (const disk of state.disks) {
    const normalized = ((disk.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (Math.abs(normalized) > 0.1 && Math.abs(normalized - Math.PI * 2) > 0.1) {
      return false;
    }
  }
  state.disksSolved = true;
  return true;
}

export function rotateDisk(state: RoomState, diskIndex: number): void {
  const disk = state.disks[diskIndex];
  disk.targetAngle += Math.PI / 4;
  disk.pulsePhase = 1;
}

export function getDiskAt(state: RoomState, mx: number, my: number): number {
  for (let i = 0; i < state.disks.length; i++) {
    const d = state.disks[i];
    const dx = mx - d.x;
    const dy = my - d.y;
    if (dx * dx + dy * dy <= d.radius * d.radius) {
      return i;
    }
  }
  return -1;
}

export function updateDisks(state: RoomState): void {
  for (const disk of state.disks) {
    disk.angle += (disk.targetAngle - disk.angle) * 0.2;
    if (disk.pulsePhase > 0) {
      disk.pulsePhase -= 0.05;
    }
  }
}

export function isNoteAt(state: RoomState, mx: number, my: number): boolean {
  const n = state.paperNote;
  return n.visible && mx >= n.x && mx <= n.x + n.width && my >= n.y && my <= n.y + n.height;
}

export function getPasswordButtonAt(state: RoomState, mx: number, my: number): number {
  if (!state.passwordBoxVisible || state.passwordBox.opened) return -1;
  for (let i = 0; i < state.passwordBox.buttons.length; i++) {
    const b = state.passwordBox.buttons[i];
    if (mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height) {
      return i;
    }
  }
  return -1;
}

export function pressPasswordButton(state: RoomState, index: number): 'correct' | 'wrong' | 'input' | null {
  if (index < 0) return null;
  const box = state.passwordBox;
  if (box.input.length >= 3) return null;

  const btn = box.buttons[index];
  btn.pressed = true;
  btn.pressedTime = 1;
  box.input += btn.value.toString();

  if (box.input.length === 3) {
    if (box.input === box.correctPassword) {
      box.opened = true;
      state.keyObtained = true;
      state.ironDoor.clickable = true;
      return 'correct';
    } else {
      box.shakeTime = 1;
      setTimeout(() => { box.input = ''; }, 500);
      return 'wrong';
    }
  }
  return 'input';
}

export function isIronDoorAt(state: RoomState, mx: number, my: number): boolean {
  const d = state.ironDoor;
  return d.clickable && mx >= d.x && mx <= d.x + d.width && my >= d.y && my <= d.y + d.height;
}

function drawRune(ctx: CanvasRenderingContext2D, rune: RuneType, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#C8A55E';
  ctx.fillStyle = '#C8A55E';
  ctx.lineWidth = 2;

  switch (rune) {
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(size * 0.55, size * 0.4);
      ctx.lineTo(-size * 0.55, size * 0.4);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'wave':
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, 0);
      ctx.bezierCurveTo(-size * 0.3, -size * 0.4, size * 0.3, size * 0.4, size * 0.6, 0);
      ctx.stroke();
      break;
    case 'hexagram': {
      const r = size * 0.55;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.3);
      ctx.lineTo(r * 0.5, -r * 0.3);
      ctx.lineTo(0, r * 0.6);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'sun':
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.35, Math.sin(a) * size * 0.35);
        ctx.lineTo(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

export function drawRoomBackground(ctx: CanvasRenderingContext2D, state: RoomState, _time: number): void {
  const { width, height } = state;

  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
  bgGrad.addColorStop(0, '#3A2818');
  bgGrad.addColorStop(1, '#0D0805');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const brickSize = 16;
  const floorY = height * 0.7;
  ctx.save();
  for (let y = floorY; y < height; y += brickSize) {
    const rowOffset = ((y - floorY) / brickSize) % 2 === 0 ? 0 : brickSize / 2;
    for (let x = -brickSize + rowOffset; x < width; x += brickSize) {
      const shade = 30 + Math.sin(x * 0.1 + y * 0.05) * 10;
      ctx.fillStyle = `rgb(${shade + 10}, ${shade + 5}, ${shade})`;
      ctx.fillRect(x, y, brickSize - 1, brickSize - 1);
    }
  }
  ctx.restore();

  const wallGrad = ctx.createLinearGradient(0, 0, 0, floorY);
  wallGrad.addColorStop(0, '#2A1F10');
  wallGrad.addColorStop(1, '#1A1208');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, width, floorY);
}

export function drawStoneTable(ctx: CanvasRenderingContext2D, state: RoomState, time: number): void {
  const { stoneTableX: tx, stoneTableY: ty, stoneTableWidth: tw, stoneTableHeight: th } = state;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty + th + 20, tw / 2, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tableGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
  tableGrad.addColorStop(0, '#5A4A3A');
  tableGrad.addColorStop(0.3, '#4A3C2C');
  tableGrad.addColorStop(1, '#3A2C1C');
  ctx.fillStyle = tableGrad;
  ctx.beginPath();
  ctx.moveTo(tx + 10, ty);
  ctx.lineTo(tx + tw - 10, ty);
  ctx.lineTo(tx + tw, ty + th);
  ctx.lineTo(tx, ty + th);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2A1C0C';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const disk of state.disks) {
    ctx.save();
    const glowIntensity = disk.hovered ? 15 + Math.sin(time * 0.01) * 5 : (state.disksSolved ? 20 : 5);
    ctx.shadowColor = state.disksSolved ? '#FFD700' : '#C8A55E';
    ctx.shadowBlur = glowIntensity;

    const pulseScale = 1 + disk.pulsePhase * 0.2;
    const r = disk.radius * pulseScale;

    const diskGrad = ctx.createRadialGradient(disk.x - 3, disk.y - 3, 2, disk.x, disk.y, r);
    diskGrad.addColorStop(0, '#6A5A4A');
    diskGrad.addColorStop(1, '#2A1F10');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(disk.x, disk.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = state.disksSolved ? '#FFD700' : '#C8A55E';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(disk.x, disk.y);
    ctx.rotate(disk.angle);
    drawRune(ctx, disk.rune, 0, 0, disk.radius);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = state.disksSolved ? '#FFD700' : '#C8A55E';
    ctx.beginPath();
    ctx.moveTo(disk.x, disk.y - disk.radius - 12);
    ctx.lineTo(disk.x - 6, disk.y - disk.radius - 4);
    ctx.lineTo(disk.x + 6, disk.y - disk.radius - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawIronDoor(ctx: CanvasRenderingContext2D, state: RoomState, time: number): void {
  const d = state.ironDoor;
  const openOffset = d.openProgress * d.width * 0.8;

  ctx.save();
  if (d.hovered && d.clickable && !d.unlocked) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15 + Math.sin(time * 0.008) * 5;
  }

  const flicker = Math.sin(time * 0.015) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 215, 0, ${flicker * 0.3 * (1 - d.openProgress)})`;
  ctx.fillRect(d.x + d.width / 2 - 2, d.y + 20, 4, d.height - 40);

  const doorGrad = ctx.createLinearGradient(d.x, 0, d.x + d.width, 0);
  doorGrad.addColorStop(0, '#3A3A3A');
  doorGrad.addColorStop(0.5, '#5A5A5A');
  doorGrad.addColorStop(1, '#3A3A3A');
  ctx.fillStyle = doorGrad;
  ctx.fillRect(d.x - openOffset, d.y, d.width, d.height);

  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 3;
  ctx.strokeRect(d.x - openOffset, d.y, d.width, d.height);

  ctx.fillStyle = '#2A2A2A';
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 10; j++) {
      const bx = d.x - openOffset + 10 + i * (d.width - 20) / 6;
      const by = d.y + 10 + j * (d.height - 20) / 10;
      ctx.fillRect(bx, by, (d.width - 20) / 6 - 4, (d.height - 20) / 10 - 4);
    }
  }

  if (d.clickable && !d.unlocked) {
    const lockX = d.x - openOffset + d.width - 25;
    const lockY = d.y + d.height / 2 - 10;
    ctx.fillStyle = '#C8A55E';
    ctx.fillRect(lockX, lockY, 15, 20);
    ctx.beginPath();
    ctx.arc(lockX + 7.5, lockY, 6, Math.PI, 0);
    ctx.strokeStyle = '#C8A55E';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (d.keyInsertProgress > 0) {
      ctx.save();
      ctx.translate(lockX + 7.5, lockY + 10);
      ctx.rotate(d.keyInsertProgress * Math.PI / 2);
      drawKey(ctx, 20 * state.scale);
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawKey(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(-size * 0.6, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-size * 0.6, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#2A1F10';
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(-size * 0.3, -size * 0.08, size * 0.8, size * 0.16);
  ctx.strokeRect(-size * 0.3, -size * 0.08, size * 0.8, size * 0.16);

  ctx.fillRect(size * 0.3, size * 0.08, size * 0.08, size * 0.15);
  ctx.fillRect(size * 0.45, size * 0.08, size * 0.06, size * 0.1);
}

export function drawPaperNote(ctx: CanvasRenderingContext2D, state: RoomState, time: number): void {
  const n = state.paperNote;
  if (!n.visible) return;

  ctx.save();
  if (n.hovered) {
    ctx.shadowColor = '#C8A55E';
    ctx.shadowBlur = 10 + Math.sin(time * 0.01) * 3;
  }

  ctx.fillStyle = '#E8D8A8';
  ctx.fillRect(n.x, n.y, n.width, n.height);

  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 1;
  ctx.strokeRect(n.x, n.y, n.width, n.height);

  ctx.fillStyle = '#3A2818';
  ctx.font = `${11 * state.scale}px serif`;
  ctx.textAlign = 'center';

  const titleY = n.y + 18 * state.scale;
  ctx.fillText('纸条', n.x + n.width / 2, titleY);

  ctx.font = `${10 * state.scale}px serif`;
  const poemY = n.y + 38 * state.scale;
  ctx.fillText(n.shuffledPoem, n.x + n.width / 2, poemY);

  if (n.read) {
    ctx.font = `${9 * state.scale}px serif`;
    ctx.fillStyle = '#6A5030';
    ctx.fillText(`原句: ${n.poem}`, n.x + n.width / 2, n.y + 52 * state.scale);
  }
  ctx.restore();
}

export function drawCompartment(ctx: CanvasRenderingContext2D, state: RoomState, time: number): void {
  if (!state.puzzleVisible && state.compartmentCrackProgress <= 0) return;

  const cx = state.width * 0.18;
  const cy = state.height * 0.35;
  const cw = 100 * state.scale;
  const ch = 120 * state.scale;

  ctx.save();
  if (state.compartmentCrackProgress > 0) {
    ctx.strokeStyle = `rgba(0,0,0,${state.compartmentCrackProgress})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 10, cy + 30);
    ctx.lineTo(cx - 5, cy + 60);
    ctx.lineTo(cx + 15, cy + 90);
    ctx.lineTo(cx, cy + ch + 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - 5);
    ctx.lineTo(cx + 20, cy + 40);
    ctx.lineTo(cx + 40, cy + 80);
    ctx.stroke();
  }

  if (state.compartmentOpen) {
    const innerGrad = ctx.createRadialGradient(cx + cw / 2, cy + ch / 2, 0, cx + cw / 2, cy + ch / 2, cw);
    innerGrad.addColorStop(0, '#3A2818');
    innerGrad.addColorStop(1, '#0D0805');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(cx, cy, cw, ch);

    ctx.strokeStyle = '#2A1F10';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx, cy, cw, ch);

    if (state.passwordBoxVisible && !state.passwordBox.opened) {
      drawPasswordBox(ctx, state, time, cx + (cw - state.passwordBox.width) / 2, cy + (ch - state.passwordBox.height) / 2);
    }

    if (state.passwordBox.opened && !state.keyObtained) {
    }

    if (state.keyObtained && state.keyAnimation < 1) {
      const keyScale = state.scale * (0.5 + state.keyAnimation * 0.5);
      ctx.save();
      ctx.translate(cx + cw / 2, cy + ch / 2 + Math.sin(time * 0.005) * 5);
      ctx.scale(keyScale, keyScale);
      ctx.globalAlpha = 1 - state.keyAnimation;
      drawKey(ctx, 40);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawPasswordBox(ctx: CanvasRenderingContext2D, state: RoomState, time: number, x: number, y: number): void {
  const box = state.passwordBox;
  box.x = x;
  box.y = y;
  layoutPasswordBox(state);

  ctx.save();
  if (box.shakeTime > 0) {
    ctx.translate(Math.sin(time * 0.1) * 3 * box.shakeTime, 0);
    box.shakeTime -= 0.02;
  }

  ctx.shadowColor = '#C8A55E';
  ctx.shadowBlur = 8;

  const boxGrad = ctx.createLinearGradient(x, y, x, y + box.height);
  boxGrad.addColorStop(0, '#8B6914');
  boxGrad.addColorStop(0.5, '#B8860B');
  boxGrad.addColorStop(1, '#6B4914');
  ctx.fillStyle = boxGrad;
  ctx.fillRect(x, y, box.width, box.height);

  ctx.strokeStyle = '#5C4A1E';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, box.width, box.height);

  ctx.fillStyle = '#1A1208';
  const displayW = box.width - 20 * state.scale;
  const displayH = 16 * state.scale;
  ctx.fillRect(x + (box.width - displayW) / 2, y + 4 * state.scale, displayW, displayH);

  ctx.fillStyle = box.input.length === 3 && box.input !== box.correctPassword ? '#FF4444' : '#FFD700';
  ctx.font = `bold ${12 * state.scale}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayText = box.input.padEnd(3, '_');
  ctx.fillText(displayText, x + box.width / 2, y + 4 * state.scale + displayH / 2);

  for (const btn of box.buttons) {
    if (btn.pressedTime > 0) {
      btn.pressedTime -= 0.05;
      if (btn.pressedTime <= 0) btn.pressed = false;
    }

    ctx.save();
    const pressedOffset = btn.pressed ? 2 : 0;
    if (btn.hovered || btn.pressed) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = btn.pressed ? 10 + Math.sin(time * 0.05) * 5 : 5;
    }

    const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
    btnGrad.addColorStop(0, '#CD950C');
    btnGrad.addColorStop(1, '#8B6914');
    ctx.fillStyle = btnGrad;
    ctx.fillRect(btn.x, btn.y + pressedOffset, btn.width, btn.height);

    ctx.strokeStyle = '#5C4A1E';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y + pressedOffset, btn.width, btn.height);

    ctx.fillStyle = '#2A1F10';
    ctx.font = `bold ${12 * state.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.value.toString(), btn.x + btn.width / 2, btn.y + pressedOffset + btn.height / 2);

    ctx.restore();
  }
  ctx.restore();
}

export function drawVictory(ctx: CanvasRenderingContext2D, state: RoomState): void {
  if (state.victoryFade <= 0) return;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${state.victoryFade})`;
  ctx.fillRect(0, 0, state.width, state.height);

  if (state.victoryFade > 0.5) {
    const textAlpha = Math.min(1, (state.victoryFade - 0.5) * 2);
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.font = `bold ${48 * state.scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('逃出生天', state.width / 2, state.height / 2 - 40);

    const minutes = Math.floor(state.elapsedTime / 60);
    const seconds = Math.floor(state.elapsedTime % 60);
    ctx.font = `${20 * state.scale}px sans-serif`;
    ctx.shadowBlur = 15;
    ctx.fillText(`用时: ${minutes}分${seconds.toString().padStart(2, '0')}秒`, state.width / 2, state.height / 2 + 30);
  }
  ctx.restore();
}
