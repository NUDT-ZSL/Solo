import {
  RoomState,
  createRoom,
  updateDisks,
  getDiskAt,
  rotateDisk,
  checkDisksSolved,
  isNoteAt,
  getPasswordButtonAt,
  pressPasswordButton,
  isIronDoorAt,
  drawRoomBackground,
  drawStoneTable,
  drawIronDoor,
  drawPaperNote,
  drawCompartment,
  drawVictory
} from './room';

import {
  PuzzleState,
  createPuzzle,
  setPuzzlePosition,
  updatePuzzlePieces,
  getPuzzlePieceAt,
  startDragPiece,
  dragPiece,
  endDragPiece,
  drawPuzzle
} from './puzzle';

import {
  playClick,
  playSuccess,
  playDoorOpen,
  playDrag,
  playKeyTurn
} from './audio';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let room: RoomState;
let puzzle: PuzzleState | null = null;
let hintEl: HTMLElement;

let draggingPuzzlePiece: ReturnType<typeof getPuzzlePieceAt> = null;
let time = 0;
let lastFrameTime = 0;

const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

function showHint(text: string, duration = 2500): void {
  hintEl.textContent = text;
  hintEl.classList.add('show');
  setTimeout(() => hintEl.classList.remove('show'), duration);
}

function resizeCanvas(): void {
  const container = document.getElementById('game-container')!;
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;

  const scale = Math.min(containerW / GAME_WIDTH, containerH / GAME_HEIGHT);
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function handleMouseDown(e: MouseEvent): void {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);

  if (room.transitioning || room.victory) return;

  if (room.keyObtained && room.ironDoor.clickable && isIronDoorAt(room, x, y) && !room.ironDoor.unlocked) {
    startDoorSequence();
    return;
  }

  const btnIdx = getPasswordButtonAt(room, x, y);
  if (btnIdx >= 0) {
    playClick();
    const result = pressPasswordButton(room, btnIdx);
    if (result === 'correct') {
      playSuccess();
      showHint('密码正确！获得金色钥匙！');
      animateKeyObtained();
    } else if (result === 'wrong') {
      showHint('密码错误，请重试');
    }
    return;
  }

  if (isNoteAt(room, x, y)) {
    if (!room.paperNote.read) {
      room.paperNote.read = true;
      playClick();
      showHint('纸条提示：还原诗句，按诗句中字的笔画数推测密码');
    }
    return;
  }

  if (room.puzzleVisible && puzzle && !puzzle.completed) {
    const piece = getPuzzlePieceAt(puzzle, x, y);
    if (piece) {
      draggingPuzzlePiece = piece;
      startDragPiece(puzzle, piece, x, y);
      playDrag();
    }
    return;
  }

  if (!room.disksSolved) {
    const diskIdx = getDiskAt(room, x, y);
    if (diskIdx >= 0) {
      rotateDisk(room, diskIdx);
      playClick();
      if (checkDisksSolved(room)) {
        playSuccess();
        showHint('机关触发！左侧墙壁出现变化...');
        setTimeout(() => startPuzzleTransition(), 1000);
      }
    }
  }
}

function handleMouseMove(e: MouseEvent): void {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);

  for (const disk of room.disks) {
    const dx = x - disk.x;
    const dy = y - disk.y;
    disk.hovered = dx * dx + dy * dy <= disk.radius * disk.radius;
  }

  room.paperNote.hovered = isNoteAt(room, x, y);
  room.ironDoor.hovered = isIronDoorAt(room, x, y);

  for (const btn of room.passwordBox.buttons) {
    btn.hovered = x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
  }

  if (draggingPuzzlePiece && puzzle) {
    dragPiece(puzzle, draggingPuzzlePiece, x, y);
  }
}

function handleMouseUp(e: MouseEvent): void {
  if (draggingPuzzlePiece && puzzle) {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    dragPiece(puzzle, draggingPuzzlePiece, x, y);
    const completed = endDragPiece(puzzle, draggingPuzzlePiece);
    playClick();
    draggingPuzzlePiece = null;
    if (completed) {
      playSuccess();
      showHint('壁画还原！墙壁裂开了...');
      setTimeout(() => openCompartment(), 800);
    }
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    handleMouseDown({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }
  e.preventDefault();
}

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    handleMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }
  e.preventDefault();
}

function handleTouchEnd(e: TouchEvent): void {
  if (e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    handleMouseUp({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
  }
  e.preventDefault();
}

function startPuzzleTransition(): void {
  room.transitioning = true;
  room.transitionAlpha = 0;

  const fadeIn = () => {
    room.transitionAlpha += 0.04;
    if (room.transitionAlpha >= 1) {
      room.transitionAlpha = 1;
      room.puzzleVisible = true;
      puzzle = createPuzzle(room.scale);
      const px = room.width * 0.05;
      const py = room.height * 0.2;
      setPuzzlePosition(puzzle, px, py);
      setTimeout(fadeOut, 300);
    } else {
      requestAnimationFrame(fadeIn);
    }
  };

  const fadeOut = () => {
    room.transitionAlpha -= 0.04;
    if (room.transitionAlpha <= 0) {
      room.transitionAlpha = 0;
      room.transitioning = false;
      showHint('拖拽拼图碎片交换位置，还原壁画');
    } else {
      requestAnimationFrame(fadeOut);
    }
  };

  fadeIn();
}

function openCompartment(): void {
  room.transitioning = true;
  room.transitionAlpha = 0;

  const crack = () => {
    room.compartmentCrackProgress += 0.05;
    if (room.compartmentCrackProgress >= 1) {
      room.compartmentCrackProgress = 1;
      room.compartmentOpen = true;
      room.puzzleVisible = false;
      puzzle = null;
      setTimeout(() => {
        room.passwordBoxVisible = true;
        room.transitioning = false;
        showHint('暗格中有一个密码盒！找到纸条推测密码');
      }, 500);
    } else {
      requestAnimationFrame(crack);
    }
  };
  crack();
}

function animateKeyObtained(): void {
  const animate = () => {
    room.keyAnimation += 0.02;
    if (room.keyAnimation < 1) {
      requestAnimationFrame(animate);
    } else {
      room.keyAnimation = 1;
    }
  };
  animate();
}

function startDoorSequence(): void {
  room.ironDoor.unlocked = true;
  room.ironDoor.clickable = false;
  playKeyTurn();

  const insertKey = () => {
    room.ironDoor.keyInsertProgress += 0.02;
    if (room.ironDoor.keyInsertProgress >= 1) {
      room.ironDoor.keyInsertProgress = 1;
      setTimeout(() => {
        playDoorOpen();
        openDoor();
      }, 500);
    } else {
      requestAnimationFrame(insertKey);
    }
  };
  insertKey();
}

function openDoor(): void {
  const animate = () => {
    room.ironDoor.openProgress += 0.015;
    if (room.ironDoor.openProgress >= 1) {
      room.ironDoor.openProgress = 1;
      setTimeout(() => startVictory(), 500);
    } else {
      requestAnimationFrame(animate);
    }
  };
  animate();
}

function startVictory(): void {
  room.victory = true;
  room.elapsedTime = (Date.now() - room.startTime) / 1000;

  const fade = () => {
    room.victoryFade += 0.015;
    if (room.victoryFade < 1) {
      requestAnimationFrame(fade);
    }
  };
  fade();
}

function gameLoop(timestamp: number): void {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  time += delta;

  updateDisks(room);

  if (puzzle) {
    updatePuzzlePieces(puzzle);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoomBackground(ctx, room, time);
  drawStoneTable(ctx, room, time);
  drawIronDoor(ctx, room, time);
  drawPaperNote(ctx, room, time);
  drawCompartment(ctx, room, time);

  if (puzzle && room.puzzleVisible) {
    ctx.save();
    ctx.globalAlpha = 1 - room.transitionAlpha * 0.5;
    drawPuzzle(ctx, puzzle, time);
    ctx.restore();
  }

  if (room.transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${room.transitionAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawVictory(ctx, room);

  requestAnimationFrame(gameLoop);
}

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  hintEl = document.getElementById('hint')!;

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  resizeCanvas();

  room = createRoom(GAME_WIDTH, GAME_HEIGHT);

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  window.addEventListener('resize', resizeCanvas);

  showHint('点击石台上的圆盘旋转符文，将所有符文对齐至上方箭头', 4000);

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
