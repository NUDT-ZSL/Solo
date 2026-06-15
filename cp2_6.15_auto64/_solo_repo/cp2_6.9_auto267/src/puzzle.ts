export interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  currentRow: number;
  currentCol: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  swapCandidate: number | null;
}

export interface PuzzleState {
  pieces: PuzzlePiece[];
  rows: number;
  cols: number;
  pieceWidth: number;
  pieceHeight: number;
  areaX: number;
  areaY: number;
  areaWidth: number;
  areaHeight: number;
  completed: boolean;
  thumbnailCanvas: HTMLCanvasElement | null;
  referenceImage: HTMLCanvasElement | null;
}

const ROWS = 4;
const COLS = 3;

function generateMuralImage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, '#E8C978');
  gradient.addColorStop(0.5, '#C8A55E');
  gradient.addColorStop(1, '#8B6914');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 300, 400);

  ctx.strokeStyle = '#5C4A1E';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(150, 200, 30 + i * 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#5C4A1E';
  ctx.beginPath();
  ctx.moveTo(150, 60);
  ctx.lineTo(180, 120);
  ctx.lineTo(120, 120);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(150, 170, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#5C4A1E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(100, 230);
  ctx.bezierCurveTo(120, 250, 130, 270, 150, 270);
  ctx.bezierCurveTo(170, 270, 180, 250, 200, 230);
  ctx.stroke();

  ctx.fillStyle = '#5C4A1E';
  drawStar(ctx, 80, 320, 5, 15, 7);
  drawStar(ctx, 220, 320, 6, 15, 7);
  drawStar(ctx, 150, 360, 8, 18, 9);

  ctx.strokeStyle = '#5C4A1E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(50, 350);
  ctx.lineTo(250, 350);
  ctx.stroke();

  return canvas;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

export function createPuzzle(scale: number = 1): PuzzleState {
  const baseWidth = 300;
  const baseHeight = 400;
  const areaWidth = baseWidth * scale;
  const areaHeight = baseHeight * scale;

  const pieceWidth = areaWidth / COLS;
  const pieceHeight = areaHeight / ROWS;

  const referenceImage = generateMuralImage();
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = 60;
  thumbnailCanvas.height = 80;
  const thumbCtx = thumbnailCanvas.getContext('2d')!;
  thumbCtx.drawImage(referenceImage, 0, 0, 60, 80);
  thumbCtx.strokeStyle = '#C8A55E';
  thumbCtx.lineWidth = 2;
  thumbCtx.strokeRect(0, 0, 60, 80);

  const pieces: PuzzlePiece[] = [];
  const positions: { row: number; col: number }[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      positions.push({ row: r, col: c });
    }
  }

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let posIndex = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      const currentPos = positions[posIndex++];
      pieces.push({
        id,
        row: r,
        col: c,
        currentRow: currentPos.row,
        currentCol: currentPos.col,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        width: pieceWidth,
        height: pieceHeight,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        swapCandidate: null
      });
    }
  }

  return {
    pieces,
    rows: ROWS,
    cols: COLS,
    pieceWidth,
    pieceHeight,
    areaX: 0,
    areaY: 0,
    areaWidth,
    areaHeight,
    completed: false,
    thumbnailCanvas,
    referenceImage
  };
}

export function setPuzzlePosition(state: PuzzleState, x: number, y: number): void {
  state.areaX = x;
  state.areaY = y;

  for (const piece of state.pieces) {
    piece.targetX = x + piece.currentCol * piece.width;
    piece.targetY = y + piece.currentRow * piece.height;
    piece.x = piece.targetX;
    piece.y = piece.targetY;
  }
}

export function updatePuzzlePieces(state: PuzzleState): void {
  for (const piece of state.pieces) {
    if (!piece.isDragging) {
      piece.x += (piece.targetX - piece.x) * 0.15;
      piece.y += (piece.targetY - piece.y) * 0.15;
    }
  }
}

export function getPuzzlePieceAt(state: PuzzleState, mx: number, my: number): PuzzlePiece | null {
  for (let i = state.pieces.length - 1; i >= 0; i--) {
    const p = state.pieces[i];
    if (mx >= p.x && mx <= p.x + p.width && my >= p.y && my <= p.y + p.height) {
      return p;
    }
  }
  return null;
}

export function startDragPiece(_state: PuzzleState, piece: PuzzlePiece, mx: number, my: number): void {
  piece.isDragging = true;
  piece.dragOffsetX = mx - piece.x;
  piece.dragOffsetY = my - piece.y;
}

export function dragPiece(state: PuzzleState, piece: PuzzlePiece, mx: number, my: number): void {
  if (!piece.isDragging) return;
  piece.x = mx - piece.dragOffsetX;
  piece.y = my - piece.dragOffsetY;

  piece.swapCandidate = null;
  const centerX = piece.x + piece.width / 2;
  const centerY = piece.y + piece.height / 2;

  for (const other of state.pieces) {
    if (other.id === piece.id) continue;
    const ox = state.areaX + other.currentCol * piece.width;
    const oy = state.areaY + other.currentRow * piece.height;
    if (centerX >= ox && centerX <= ox + piece.width && centerY >= oy && centerY <= oy + piece.height) {
      piece.swapCandidate = other.id;
      break;
    }
  }
}

export function endDragPiece(state: PuzzleState, piece: PuzzlePiece): boolean {
  if (!piece.isDragging) return false;
  piece.isDragging = false;

  if (piece.swapCandidate !== null) {
    const other = state.pieces.find(p => p.id === piece.swapCandidate);
    if (other) {
      const tempRow = piece.currentRow;
      const tempCol = piece.currentCol;
      piece.currentRow = other.currentRow;
      piece.currentCol = other.currentCol;
      other.currentRow = tempRow;
      other.currentCol = tempCol;
    }
    piece.swapCandidate = null;
  }

  piece.targetX = state.areaX + piece.currentCol * piece.width;
  piece.targetY = state.areaY + piece.currentRow * piece.height;

  return checkPuzzleCompleted(state);
}

export function checkPuzzleCompleted(state: PuzzleState): boolean {
  for (const piece of state.pieces) {
    if (piece.row !== piece.currentRow || piece.col !== piece.currentCol) {
      state.completed = false;
      return false;
    }
  }
  state.completed = true;
  return true;
}

export function drawPuzzle(ctx: CanvasRenderingContext2D, state: PuzzleState, time: number): void {
  if (!state.referenceImage) return;

  ctx.save();
  ctx.shadowColor = '#C8A55E';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#2A1F10';
  ctx.fillRect(state.areaX - 10, state.areaY - 10, state.areaWidth + 20, state.areaHeight + 20);
  ctx.restore();

  ctx.fillStyle = '#C8A55E';
  ctx.fillRect(state.areaX, state.areaY, state.areaWidth, state.areaHeight);

  ctx.strokeStyle = 'rgba(92, 74, 30, 0.3)';
  ctx.lineWidth = 1;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      ctx.strokeRect(
        state.areaX + c * state.pieceWidth,
        state.areaY + r * state.pieceHeight,
        state.pieceWidth,
        state.pieceHeight
      );
    }
  }

  for (const piece of state.pieces) {
    if (piece.isDragging) continue;
    drawPiece(ctx, state, piece);
  }

  for (const piece of state.pieces) {
    if (piece.isDragging) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      drawPiece(ctx, state, piece);
      ctx.restore();

      if (piece.swapCandidate !== null) {
        const other = state.pieces.find(p => p.id === piece.swapCandidate);
        if (other) {
          ctx.save();
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10 + Math.sin(time * 0.01) * 5;
          ctx.strokeRect(
            state.areaX + other.currentCol * piece.width,
            state.areaY + other.currentRow * piece.height,
            piece.width,
            piece.height
          );
          ctx.restore();
        }
      }
    }
  }

  if (state.thumbnailCanvas) {
    ctx.save();
    ctx.shadowColor = '#C8A55E';
    ctx.shadowBlur = 8;
    ctx.drawImage(state.thumbnailCanvas, state.areaX, state.areaY - 95);
    ctx.fillStyle = '#C8A55E';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('参照图', state.areaX + 30, state.areaY - 100);
    ctx.restore();
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, state: PuzzleState, piece: PuzzlePiece): void {
  if (!state.referenceImage) return;

  const srcX = piece.col * (state.referenceImage.width / state.cols);
  const srcY = piece.row * (state.referenceImage.height / state.rows);
  const srcW = state.referenceImage.width / state.cols;
  const srcH = state.referenceImage.height / state.rows;

  ctx.drawImage(
    state.referenceImage,
    srcX, srcY, srcW, srcH,
    piece.x, piece.y, piece.width, piece.height
  );

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(piece.x, piece.y, piece.width, piece.height);
}
