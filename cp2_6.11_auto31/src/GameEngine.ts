import {
  Faction,
  GameState,
  GridCoord,
  Piece,
  Afterimage,
  Fragment,
  LightParticle,
  HEX_DIRECTIONS,
  GRID_SIZE,
  RHOMBUS_STEP,
  MAX_AFTERIMAGES,
  MAX_FRAGMENTS,
  COLORS,
  gridDistance,
  coordKey,
  isInBoard,
} from './types';
import { AIModule, AIAction } from './AIModule';

let idCounter = 0;
const uid = () => `obj_${++idCounter}_${Date.now().toString(36)}`;

export class GameEngine {
  public state: GameState;
  private ai: AIModule;
  private pendingActions: AIAction[] = [];
  private aiActionDelay = 0;

  constructor() {
    this.ai = new AIModule();
    this.state = this.createInitialState();
    this.spawnInitialAfterimages();
  }

  private createInitialState(): GameState {
    const pieces = this.deployPieces();
    return {
      turnNumber: 1,
      currentFaction: 'blue',
      phase: 'select',
      selectedPieceId: null,
      pieces,
      afterimages: [],
      fragments: [],
      particles: [],
      validMoves: [],
      validAttacks: [],
      winner: null,
      showSurrenderModal: false,
      modalShakePhase: 0,
      hoveredPieceId: null,
      time: 0,
    };
  }

  private spawnInitialAfterimages(): void {
    const centerPositions: GridCoord[] = [
      { q: 6, r: 6 },
      { q: 5, r: 6 },
      { q: 7, r: 6 },
      { q: 6, r: 5 },
      { q: 6, r: 7 },
      { q: 5, r: 7 },
      { q: 7, r: 5 },
    ];

    for (let i = 0; i < centerPositions.length; i++) {
      const pos = centerPositions[i];
      const faction: Faction = i % 2 === 0 ? 'blue' : 'red';
      const worldPos = this.gridToWorld(pos);

      this.state.afterimages.push({
        id: uid(),
        faction,
        gridQ: pos.q,
        gridR: pos.r,
        worldX: worldPos.x,
        worldY: worldPos.y,
        targetPieceId: null,
        velocityX: 0,
        velocityY: 0,
        lifetime: 5 + Math.random() * 3,
        bouncesLeft: 2,
        opacity: 0.7,
      });
    }
  }

  private deployPieces(): Piece[] {
    const pieces: Piece[] = [];
    const bluePositions: GridCoord[] = [];
    const redPositions: GridCoord[] = [];

    const mid = Math.floor(GRID_SIZE / 2);

    for (let i = 0; i < 5; i++) {
      bluePositions.push({ q: i, r: 0 });
      bluePositions.push({ q: i, r: 1 });
      bluePositions.push({ q: i, r: 2 });
    }
    bluePositions.splice(15);

    for (let i = GRID_SIZE - 5; i < GRID_SIZE; i++) {
      redPositions.push({ q: i, r: GRID_SIZE - 1 });
      redPositions.push({ q: i, r: GRID_SIZE - 2 });
      redPositions.push({ q: i, r: GRID_SIZE - 3 });
    }
    redPositions.splice(15);

    for (let i = 0; i < 15; i++) {
      const pos = bluePositions[i] || { q: i % 5, r: Math.floor(i / 5) };
      pieces.push(this.createPiece('blue', pos));
    }

    for (let i = 0; i < 15; i++) {
      const pos = redPositions[i] || { q: mid + (i % 5), r: GRID_SIZE - 1 - Math.floor(i / 5) };
      pieces.push(this.createPiece('red', pos));
    }

    return pieces;
  }

  private createPiece(faction: Faction, position: GridCoord): Piece {
    return {
      id: uid(),
      faction,
      position: { ...position },
      hp: 30,
      maxHp: 30,
      attack: 10,
      defense: 3,
      moveRange: 3,
      attackRange: 2,
      skillCooldown: 0,
      isMoving: false,
      movePath: [],
      moveProgress: 0,
      moveStartTime: 0,
      attackTargetId: null,
      attackPulsePhase: 0,
      flowPhase: Math.random() * Math.PI * 2,
      hasMoved: false,
      hasAttacked: false,
    };
  }

  public update(dt: number): void {
    this.state.time += dt;
    const s = this.state;

    for (const piece of s.pieces) {
      piece.flowPhase += dt * Math.PI;
      if (piece.attackPulsePhase > 0) {
        piece.attackPulsePhase -= dt;
      }
    }

    if (s.modalShakePhase > 0) {
      s.modalShakePhase -= dt * 8;
      if (s.modalShakePhase < 0) s.modalShakePhase = 0;
    }

    this.updateFragments(dt);
    this.updateParticles(dt);
    this.updateMovingPieces(dt);

    if (s.phase === 'ai_thinking' && !s.winner) {
      this.aiActionDelay -= dt;
      if (this.aiActionDelay <= 0) {
        this.executeNextAIAction();
      }
    }

    if (s.phase !== 'ai_thinking') {
      this.updateAfterimages(dt);
    }

    if (s.phase !== 'select' && s.phase !== 'ai_thinking' && s.phase !== 'move' && s.phase !== 'attack') {
      // pass
    }
  }

  private updateMovingPieces(dt: number): void {
    const MOVE_DURATION = 0.3;
    for (const piece of this.state.pieces) {
      if (piece.isMoving && piece.movePath.length > 0) {
        piece.moveProgress += dt / MOVE_DURATION;
        if (piece.moveProgress >= 1) {
          piece.moveProgress = 0;
          const next = piece.movePath.shift()!;
          piece.position = { ...next };

          if (piece.movePath.length === 0) {
            piece.isMoving = false;
            piece.hasMoved = true;
            this.spawnAfterimage(piece);
            this.recalculateValidActions();
            if (this.state.phase === 'move') this.state.phase = 'select';
          }
        }
      }
    }
  }

  private spawnAfterimage(piece: Piece): void {
    if (this.state.afterimages.length >= MAX_AFTERIMAGES) return;

    const gridCenter = this.gridToWorld(piece.position);
    const faction = piece.faction;
    let count = 0;
    const key = coordKey(piece.position);
    for (const img of this.state.afterimages) {
      if (coordKey({ q: img.gridQ, r: img.gridR }) === key) count++;
    }
    if (count >= 3) return;

    this.state.afterimages.push({
      id: uid(),
      faction,
      gridQ: piece.position.q,
      gridR: piece.position.r,
      worldX: gridCenter.x,
      worldY: gridCenter.y,
      targetPieceId: null,
      velocityX: 0,
      velocityY: 0,
      lifetime: 2,
      bouncesLeft: 2,
      opacity: 0.7,
    });
  }

  public gridToWorld(g: GridCoord): { x: number; y: number } {
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const halfStep = RHOMBUS_STEP * 0.5;
    const x = RHOMBUS_STEP * (cos30 * g.q + cos30 * 0.5 * g.r);
    const y = RHOMBUS_STEP * (sin30 * g.r + halfStep * 0);
    return { x, y };
  }

  private updateAfterimages(dt: number): void {
    const alivePieces = this.state.pieces.filter(p => p.hp > 0);
    const keepAfter: Afterimage[] = [];

    for (const img of this.state.afterimages) {
      if (alivePieces.length === 0) continue;

      let nearest: Piece | null = null;
      let nearestDist = Infinity;
      for (const p of alivePieces) {
        const pw = this.gridToWorld(p.position);
        const d = Math.hypot(pw.x - img.worldX, pw.y - img.worldY);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = p;
        }
      }

      if (nearest) {
        const pw = this.gridToWorld(nearest.position);
        const dx = pw.x - img.worldX;
        const dy = pw.y - img.worldY;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 80;
        img.velocityX = (dx / len) * speed;
        img.velocityY = (dy / len) * speed;
      }

      img.worldX += img.velocityX * dt;
      img.worldY += img.velocityY * dt;
      img.lifetime -= dt;

      if (nearest && nearestDist < 25) {
        if (img.bouncesLeft > 0 && Math.random() < 0.15) {
          img.bouncesLeft--;
          const dir = HEX_DIRECTIONS[Math.floor(Math.random() * HEX_DIRECTIONS.length)];
          const angle = Math.atan2(dir.r, dir.q);
          const spd = Math.hypot(img.velocityX, img.velocityY) || 80;
          img.velocityX = Math.cos(angle) * spd;
          img.velocityY = Math.sin(angle) * spd;
          img.worldX += img.velocityX * dt * 2;
          img.worldY += img.velocityY * dt * 2;
        } else {
          this.resolveAfterimageCollision(img, nearest);
          continue;
        }
      }

      if (img.lifetime <= 0) {
        this.spawnAfterimageDissolveParticles(img);
        continue;
      }

      img.opacity = Math.min(0.7, img.lifetime / 2 * 0.8 + 0.2);
      keepAfter.push(img);
    }

    this.state.afterimages = keepAfter;
  }

  private resolveAfterimageCollision(img: Afterimage, target: Piece): void {
    if (target.faction === img.faction) {
      target.hp = Math.min(target.maxHp, target.hp + 3);
      const tw = this.gridToWorld(target.position);
      for (let i = 0; i < 6; i++) {
        this.state.particles.push({
          x: tw.x,
          y: tw.y,
          vx: (Math.random() - 0.5) * 30,
          vy: -40 - Math.random() * 40,
          lifetime: 0.6,
          maxLifetime: 0.6,
          color: COLORS.energyGreen,
          size: 3,
        });
      }
    } else {
      target.hp -= 5;
      const tw = this.gridToWorld(target.position);
      const col = target.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 80;
        this.state.fragments.push({
          id: uid(),
          color: col,
          x: tw.x,
          y: tw.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: 2 + Math.random() * 2,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * Math.PI * 4,
          lifetime: 0.5,
          maxLifetime: 0.5,
          opacity: 0.8,
          lastHitTime: 0,
        });
      }
      if (target.hp <= 0) {
        this.onPieceDestroyed(target);
      }
    }
  }

  private spawnAfterimageDissolveParticles(img: Afterimage): void {
    const col = img.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
    for (let i = 0; i < 4; i++) {
      this.state.particles.push({
        x: img.worldX,
        y: img.worldY,
        vx: (Math.random() - 0.5) * 20,
        vy: -20 - Math.random() * 20,
        lifetime: 0.4,
        maxLifetime: 0.4,
        color: col,
        size: 2,
      });
    }
  }

  private updateFragments(dt: number): void {
    const alivePieces = this.state.pieces.filter(p => p.hp > 0);
    const keep: Fragment[] = [];

    for (const f of this.state.fragments) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 80 * dt;
      f.rotation += f.rotationSpeed * dt;
      f.lifetime -= dt;
      f.lastHitTime = Math.max(0, f.lastHitTime - dt);

      for (const target of alivePieces) {
        if (target.hp <= 0) continue;
        const tw = this.gridToWorld(target.position);
        const d = Math.hypot(tw.x - f.x, tw.y - f.y);
        if (d < 22 && f.lastHitTime <= 0) {
          target.hp -= 10;
          f.lastHitTime = 0.2;
          if (target.hp <= 0) {
            this.onPieceDestroyed(target);
          }
        }
      }

      if (f.lifetime <= 0) continue;
      f.opacity = Math.min(1, f.lifetime / f.maxLifetime);
      keep.push(f);
    }

    if (keep.length > MAX_FRAGMENTS) {
      keep.splice(0, keep.length - MAX_FRAGMENTS);
    }
    this.state.fragments = keep;
  }

  private updateParticles(dt: number): void {
    const keep: LightParticle[] = [];
    for (const p of this.state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.lifetime -= dt;
      if (p.lifetime > 0) keep.push(p);
    }
    this.state.particles = keep;
  }

  private onPieceDestroyed(piece: Piece): void {
    piece.hp = 0;
    const pos = this.gridToWorld(piece.position);
    const color = piece.faction === 'blue' ? COLORS.techBlue : COLORS.warningRed;
    const baseAngle = Math.atan2(piece.position.r - 6, piece.position.q - 6);

    for (let i = 0; i < 80; i++) {
      const cone = (Math.random() - 0.5) * (Math.PI / 3);
      const a = baseAngle + cone + Math.PI * (0.5 + Math.random());
      const sp = 150 + Math.random() * 150;
      this.state.fragments.push({
        id: uid(),
        color,
        x: pos.x + (Math.random() - 0.5) * 8,
        y: pos.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 2 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * Math.PI * 2 * 2,
        lifetime: 1,
        maxLifetime: 1,
        opacity: 0.7,
        lastHitTime: 0,
      });
    }

    this.checkWinner();
  }

  private checkWinner(): void {
    const blueAlive = this.state.pieces.filter(p => p.faction === 'blue' && p.hp > 0).length;
    const redAlive = this.state.pieces.filter(p => p.faction === 'red' && p.hp > 0).length;
    if (blueAlive === 0) this.state.winner = 'red';
    else if (redAlive === 0) this.state.winner = 'blue';
  }

  public selectPiece(pieceId: string): void {
    const s = this.state;
    if (s.phase === 'ai_thinking' || s.winner) return;
    const piece = s.pieces.find(p => p.id === pieceId);
    if (!piece || piece.hp <= 0) return;
    if (piece.faction !== s.currentFaction) return;

    s.selectedPieceId = pieceId;
    s.phase = 'select';
    this.recalculateValidActions();
  }

  private recalculateValidActions(): void {
    const s = this.state;
    s.validMoves = [];
    s.validAttacks = [];
    if (!s.selectedPieceId) return;

    const piece = s.pieces.find(p => p.id === s.selectedPieceId);
    if (!piece || piece.hp <= 0) return;

    const occupied = new Set(
      s.pieces.filter(p => p.hp > 0 && p.id !== piece.id).map(p => coordKey(p.position))
    );

    if (!piece.hasMoved) {
      const visited = new Map<string, number>();
      const queue: { c: GridCoord; d: number }[] = [{ c: piece.position, d: 0 }];
      visited.set(coordKey(piece.position), 0);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.d >= piece.moveRange) continue;
        for (const dir of HEX_DIRECTIONS) {
          const nx = { q: cur.c.q + dir.q, r: cur.c.r + dir.r };
          const k = coordKey(nx);
          if (!isInBoard(nx) || visited.has(k) || occupied.has(k)) continue;
          visited.set(k, cur.d + 1);
          s.validMoves.push(nx);
          queue.push({ c: nx, d: cur.d + 1 });
        }
      }
    }

    if (!piece.hasAttacked) {
      for (const enemy of s.pieces) {
        if (enemy.faction === piece.faction || enemy.hp <= 0) continue;
        if (gridDistance(piece.position, enemy.position) <= piece.attackRange) {
          s.validAttacks.push(enemy.id);
        }
      }
    }
  }

  public movePieceTo(target: GridCoord): void {
    const s = this.state;
    if (!s.selectedPieceId || s.phase === 'ai_thinking' || s.winner) return;
    const piece = s.pieces.find(p => p.id === s.selectedPieceId);
    if (!piece || piece.hasMoved || piece.hp <= 0) return;

    const isValid = s.validMoves.some(m => m.q === target.q && m.r === target.r);
    if (!isValid) return;

    const path = this.findPath(piece.position, target);
    if (path.length === 0) return;

    piece.movePath = path;
    piece.moveProgress = 0;
    piece.isMoving = true;
    s.phase = 'move';
    s.validMoves = [];
  }

  private findPath(start: GridCoord, end: GridCoord): GridCoord[] {
    if (coordKey(start) === coordKey(end)) return [];

    interface Node {
      c: GridCoord;
      g: number;
      f: number;
      parent: Node | null;
    }

    const occupied = new Set(
      this.state.pieces.filter(p => p.hp > 0).map(p => coordKey(p.position))
    );
    occupied.delete(coordKey(start));
    occupied.delete(coordKey(end));

    const open: Node[] = [{ c: start, g: 0, f: gridDistance(start, end), parent: null }];
    const closed = new Set<string>();

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift()!;
      const k = coordKey(cur.c);
      if (k === coordKey(end)) {
        const path: GridCoord[] = [];
        let n: Node | null = cur;
        while (n && n.parent) {
          path.unshift(n.c);
          n = n.parent;
        }
        return path;
      }
      if (closed.has(k)) continue;
      closed.add(k);

      for (const dir of HEX_DIRECTIONS) {
        const nx = { q: cur.c.q + dir.q, r: cur.c.r + dir.r };
        const nk = coordKey(nx);
        if (!isInBoard(nx) || closed.has(nk)) continue;
        if (occupied.has(nk) && nk !== coordKey(end)) continue;
        const g = cur.g + 1;
        const h = gridDistance(nx, end);
        open.push({ c: nx, g, f: g + h, parent: cur });
      }
    }

    return [];
  }

  public attackPiece(targetId: string): void {
    const s = this.state;
    if (!s.selectedPieceId || s.phase === 'ai_thinking' || s.winner) return;
    const attacker = s.pieces.find(p => p.id === s.selectedPieceId);
    const target = s.pieces.find(p => p.id === targetId);
    if (!attacker || !target) return;
    if (attacker.hasAttacked || attacker.hp <= 0 || target.hp <= 0) return;
    if (!s.validAttacks.includes(targetId)) return;

    const damage = Math.max(1, attacker.attack - target.defense);
    target.hp -= damage;
    target.attackPulsePhase = 1;
    attacker.hasAttacked = true;
    s.phase = 'attack';

    setTimeout(() => {
      if (target.hp <= 0) {
        this.onPieceDestroyed(target);
      }
      this.recalculateValidActions();
      if (this.state.phase === 'attack') this.state.phase = 'select';
    }, 400);
  }

  public endTurn(): void {
    const s = this.state;
    if (s.phase === 'ai_thinking' || s.winner) return;

    s.selectedPieceId = null;
    s.validMoves = [];
    s.validAttacks = [];

    const nextFaction: Faction = s.currentFaction === 'blue' ? 'red' : 'blue';
    if (nextFaction === 'blue') {
      s.turnNumber++;
    }
    s.currentFaction = nextFaction;

    for (const p of s.pieces) {
      if (p.faction === nextFaction) {
        p.hasMoved = false;
        p.hasAttacked = false;
        p.skillCooldown = Math.max(0, p.skillCooldown - 1);
      }
    }

    if (nextFaction === 'red') {
      s.phase = 'ai_thinking';
      this.pendingActions = this.ai.decide(s, 'red');
      this.aiActionDelay = 0.3;
    } else {
      s.phase = 'select';
    }
  }

  private executeNextAIAction(): void {
    const s = this.state;
    if (this.pendingActions.length === 0) {
      s.phase = 'select';
      this.endTurn();
      return;
    }

    const action = this.pendingActions.shift()!;
    if (action.type === 'move' && action.pieceId && action.target) {
      s.selectedPieceId = action.pieceId;
      this.recalculateValidActions();
      this.movePieceTo(action.target);
      this.aiActionDelay = 0.4;
    } else if (action.type === 'attack' && action.pieceId && action.targetPieceId) {
      s.selectedPieceId = action.pieceId;
      this.recalculateValidActions();
      this.attackPiece(action.targetPieceId);
      this.aiActionDelay = 0.5;
    } else if (action.type === 'end') {
      this.aiActionDelay = 0.3;
      setTimeout(() => this.endTurn(), 200);
    } else {
      this.aiActionDelay = 0.05;
    }
  }

  public showSurrender(): void {
    this.state.showSurrenderModal = true;
    this.state.modalShakePhase = 1;
  }

  public confirmSurrender(): void {
    if (!this.state.showSurrenderModal) return;
    this.state.winner = this.state.currentFaction === 'blue' ? 'red' : 'blue';
    this.state.showSurrenderModal = false;
  }

  public cancelSurrender(): void {
    this.state.showSurrenderModal = false;
  }

  public restart(): void {
    this.state = this.createInitialState();
    this.spawnInitialAfterimages();
  }

  public findPieceAtWorld(wx: number, wy: number): Piece | null {
    const alive = this.state.pieces.filter(p => p.hp > 0);
    for (const p of alive) {
      const w = this.gridToWorld(p.position);
      if (Math.hypot(w.x - wx, w.y - wy) < 24) return p;
    }
    return null;
  }

  public findGridAtWorld(wx: number, wy: number): GridCoord | null {
    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const w = this.gridToWorld({ q, r });
        const dx = wx - w.x;
        const dy = wy - w.y;
        const cos30 = Math.cos(Math.PI / 6);
        const half = RHOMBUS_STEP / 2;
        if (Math.abs(dx) < cos30 * half && Math.abs(dy) < half && Math.abs(dx) / cos30 + Math.abs(dy) < half) {
          return { q, r };
        }
      }
    }
    return null;
  }
}
