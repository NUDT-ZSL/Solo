export enum PuzzleCellType {
  Floor = 0,
  Wall = 1,
  DoorKey = 2,
  DoorPressure = 3,
  PressurePlate = 4,
  LightSource = 5,
  LaserFence = 6,
  Intel = 7,
  Exit = 8,
  IDCards = 9,
}

export interface Door {
  id: string;
  x: number;
  y: number;
  type: 'key' | 'pressure' | 'password';
  open: boolean;
  requiredIdCard?: string;
  passwordCode?: number[];
  linkedPlateId?: string;
  openProgress: number;
  openAnimTime: number;
}

export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  linkedDoorId: string;
  activated: boolean;
  pulsePhase: number;
}

export interface LaserFence {
  id: string;
  x: number;
  y: number;
  direction: 'horizontal' | 'vertical';
  length: number;
  active: boolean;
  linkedPlateId?: string;
  pulsePhase: number;
}

export interface IDCards {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  label: string;
  glowPhase: number;
}

export interface PasswordPuzzle {
  doorId: string;
  code: number[];
  input: number[];
  attempts: number;
  maxAttempts: number;
  solved: boolean;
  failed: boolean;
  hint: string;
}

export interface Intel {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  label: string;
  glowPhase: number;
}

export interface InteractiveObject {
  type: 'door' | 'pressurePlate' | 'laserFence' | 'idCard' | 'intel' | 'exit';
  id: string;
  x: number;
  y: number;
  label: string;
  interactable: boolean;
}

export class PuzzleManager {
  doors: Map<string, Door> = new Map();
  pressurePlates: Map<string, PressurePlate> = new Map();
  laserFences: Map<string, LaserFence> = new Map();
  idCards: Map<string, IDCards> = new Map();
  intelItems: Map<string, Intel> = new Map();
  activePasswordPuzzle: PasswordPuzzle | null = null;
  collectedIdCards: Set<string> = new Set();
  collectedIntel: Set<string> = new Set();
  totalIntel: number = 0;
  private idCounter = 0;

  private nextId(): string {
    return `obj_${this.idCounter++}`;
  }

  loadFromGrid(grid: number[][]): void {
    this.doors.clear();
    this.pressurePlates.clear();
    this.laserFences.clear();
    this.idCards.clear();
    this.intelItems.clear();
    this.activePasswordPuzzle = null;
    this.collectedIdCards.clear();
    this.collectedIntel.clear();
    this.idCounter = 0;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        switch (cell) {
          case PuzzleCellType.DoorKey:
            this.addKeyDoor(x, y);
            break;
          case PuzzleCellType.DoorPressure:
            this.addPressureDoor(x, y);
            break;
          case PuzzleCellType.PressurePlate:
            this.addPressurePlate(x, y);
            break;
          case PuzzleCellType.LaserFence:
            this.addLaserFence(x, y);
            break;
          case PuzzleCellType.IDCards:
            this.addIDCard(x, y);
            break;
          case PuzzleCellType.Intel:
            this.addIntel(x, y);
            break;
        }
      }
    }

    this.linkPressurePlatesToDoors();
    this.linkLaserFencesToPlates();
    this.totalIntel = this.intelItems.size;
  }

  addKeyDoor(x: number, y: number, requiredCard?: string): Door {
    const id = this.nextId();
    const code = [
      Math.floor(Math.random() * 4) + 1,
      Math.floor(Math.random() * 4) + 1,
      Math.floor(Math.random() * 4) + 1,
      Math.floor(Math.random() * 4) + 1,
    ];
    const door: Door = {
      id,
      x,
      y,
      type: 'key',
      open: false,
      requiredIdCard: requiredCard || id,
      passwordCode: code,
      openProgress: 0,
      openAnimTime: 0,
    };
    this.doors.set(id, door);
    return door;
  }

  addPressureDoor(x: number, y: number): Door {
    const id = this.nextId();
    const door: Door = {
      id,
      x,
      y,
      type: 'pressure',
      open: false,
      openProgress: 0,
      openAnimTime: 0,
    };
    this.doors.set(id, door);
    return door;
  }

  addPasswordDoor(x: number, y: number, code?: number[]): Door {
    const id = this.nextId();
    const door: Door = {
      id,
      x,
      y,
      type: 'password',
      open: false,
      passwordCode: code || [
        Math.floor(Math.random() * 4) + 1,
        Math.floor(Math.random() * 4) + 1,
        Math.floor(Math.random() * 4) + 1,
        Math.floor(Math.random() * 4) + 1,
      ],
      openProgress: 0,
      openAnimTime: 0,
    };
    this.doors.set(id, door);
    return door;
  }

  addPressurePlate(x: number, y: number): PressurePlate {
    const id = this.nextId();
    const plate: PressurePlate = {
      id,
      x,
      y,
      linkedDoorId: '',
      activated: false,
      pulsePhase: 0,
    };
    this.pressurePlates.set(id, plate);
    return plate;
  }

  addLaserFence(x: number, y: number, direction: 'horizontal' | 'vertical' = 'horizontal', length: number = 1): LaserFence {
    const id = this.nextId();
    const fence: LaserFence = {
      id,
      x,
      y,
      direction,
      length,
      active: true,
      pulsePhase: Math.random() * Math.PI * 2,
    };
    this.laserFences.set(id, fence);
    return fence;
  }

  addIDCard(x: number, y: number, label: string = 'ID卡'): IDCards {
    const id = this.nextId();
    const card: IDCards = {
      id,
      x,
      y,
      collected: false,
      label,
      glowPhase: Math.random() * Math.PI * 2,
    };
    this.idCards.set(id, card);
    return card;
  }

  addIntel(x: number, y: number, label: string = '情报'): Intel {
    const id = this.nextId();
    const item: Intel = {
      id,
      x,
      y,
      collected: false,
      label,
      glowPhase: Math.random() * Math.PI * 2,
    };
    this.intelItems.set(id, item);
    return item;
  }

  private linkPressurePlatesToDoors(): void {
    const plates = Array.from(this.pressurePlates.values());
    const pressureDoors = Array.from(this.doors.values()).filter(d => d.type === 'pressure');

    for (let i = 0; i < plates.length && i < pressureDoors.length; i++) {
      plates[i].linkedDoorId = pressureDoors[i].id;
      pressureDoors[i].linkedPlateId = plates[i].id;
    }
  }

  private linkLaserFencesToPlates(): void {
    const fences = Array.from(this.laserFences.values());
    const plates = Array.from(this.pressurePlates.values());

    for (let i = 0; i < fences.length && i < plates.length; i++) {
      fences[i].linkedPlateId = plates[i].id;
    }
  }

  activatePressurePlate(plateId: string): boolean {
    const plate = this.pressurePlates.get(plateId);
    if (!plate) return false;

    plate.activated = true;

    if (plate.linkedDoorId) {
      const door = this.doors.get(plate.linkedDoorId);
      if (door && !door.open) {
        door.open = true;
        door.openAnimTime = 0;
      }
    }

    for (const fence of this.laserFences.values()) {
      if (fence.linkedPlateId === plateId) {
        fence.active = false;
      }
    }

    return true;
  }

  deactivatePressurePlate(plateId: string): void {
    const plate = this.pressurePlates.get(plateId);
    if (!plate) return;

    plate.activated = false;

    if (plate.linkedDoorId) {
      const door = this.doors.get(plate.linkedDoorId);
      if (door && door.type === 'pressure') {
        door.open = false;
        door.openAnimTime = 0;
      }
    }

    for (const fence of this.laserFences.values()) {
      if (fence.linkedPlateId === plateId) {
        fence.active = true;
      }
    }
  }

  tryOpenKeyDoor(doorId: string): { success: boolean; needCard?: string; needPassword?: boolean } {
    const door = this.doors.get(doorId);
    if (!door || door.type !== 'key' || door.open) return { success: false };

    if (door.requiredIdCard && this.collectedIdCards.has(door.requiredIdCard)) {
      return { success: false, needPassword: true };
    }

    return { success: false, needCard: door.requiredIdCard };
  }

  startPasswordPuzzle(doorId: string): PasswordPuzzle | null {
    const door = this.doors.get(doorId);
    if (!door || !door.passwordCode) return null;

    const puzzle: PasswordPuzzle = {
      doorId,
      code: door.passwordCode,
      input: [],
      attempts: 0,
      maxAttempts: 3,
      solved: false,
      failed: false,
      hint: this.generateHint(door.passwordCode),
    };
    this.activePasswordPuzzle = puzzle;
    return puzzle;
  }

  private generateHint(code: number[]): string {
    const first = code[0];
    const sum = code.reduce((a, b) => a + b, 0);
    return `首码:${first} 数位和:${sum}`;
  }

  submitPasswordDigit(digit: number): { correct: boolean; complete: boolean; failed: boolean } {
    if (!this.activePasswordPuzzle || this.activePasswordPuzzle.solved || this.activePasswordPuzzle.failed) {
      return { correct: false, complete: false, failed: true };
    }

    const puzzle = this.activePasswordPuzzle;
    puzzle.input.push(digit);

    const index = puzzle.input.length - 1;
    if (puzzle.input[index] !== puzzle.code[index]) {
      puzzle.attempts++;
      puzzle.input = [];
      if (puzzle.attempts >= puzzle.maxAttempts) {
        puzzle.failed = true;
        return { correct: false, complete: false, failed: true };
      }
      return { correct: false, complete: false, failed: false };
    }

    if (puzzle.input.length === puzzle.code.length) {
      puzzle.solved = true;
      const door = this.doors.get(puzzle.doorId);
      if (door) {
        door.open = true;
        door.openAnimTime = 0;
      }
      return { correct: true, complete: true, failed: false };
    }

    return { correct: true, complete: false, failed: false };
  }

  closePasswordPuzzle(): void {
    this.activePasswordPuzzle = null;
  }

  collectIDCard(cardId: string): boolean {
    const card = this.idCards.get(cardId);
    if (!card || card.collected) return false;
    card.collected = true;
    this.collectedIdCards.add(card.id);
    return true;
  }

  collectIntel(intelId: string): boolean {
    const intel = this.intelItems.get(intelId);
    if (!intel || intel.collected) return false;
    intel.collected = true;
    this.collectedIntel.add(intel.id);
    return true;
  }

  isDoorOpen(x: number, y: number): boolean {
    for (const door of this.doors.values()) {
      if (door.x === x && door.y === y) return door.open;
    }
    return false;
  }

  isDoorAt(x: number, y: number): Door | null {
    for (const door of this.doors.values()) {
      if (door.x === x && door.y === y) return door;
    }
    return null;
  }

  isLaserActiveAt(x: number, y: number): boolean {
    for (const fence of this.laserFences.values()) {
      if (!fence.active) continue;
      if (fence.direction === 'horizontal') {
        for (let i = 0; i < fence.length; i++) {
          if (fence.x + i === x && fence.y === y) return true;
        }
      } else {
        for (let i = 0; i < fence.length; i++) {
          if (fence.x === x && fence.y + i === y) return true;
        }
      }
    }
    return false;
  }

  getInteractiveObjectAt(x: number, y: number): InteractiveObject | null {
    for (const door of this.doors.values()) {
      if (door.x === x && door.y === y && !door.open) {
        return {
          type: 'door',
          id: door.id,
          x,
          y,
          label: door.type === 'key' ? '门禁(需ID卡+密码)' : door.type === 'password' ? '门禁(密码锁)' : '门禁(机关)',
          interactable: true,
        };
      }
    }

    for (const plate of this.pressurePlates.values()) {
      if (plate.x === x && plate.y === y) {
        return {
          type: 'pressurePlate',
          id: plate.id,
          x,
          y,
          label: plate.activated ? '压力板(已激活)' : '压力板(踩踏激活)',
          interactable: true,
        };
      }
    }

    for (const card of this.idCards.values()) {
      if (card.x === x && card.y === y && !card.collected) {
        return {
          type: 'idCard',
          id: card.id,
          x,
          y,
          label: card.label,
          interactable: true,
        };
      }
    }

    for (const intel of this.intelItems.values()) {
      if (intel.x === x && intel.y === y && !intel.collected) {
        return {
          type: 'intel',
          id: intel.id,
          x,
          y,
          label: intel.label,
          interactable: true,
        };
      }
    }

    return null;
  }

  updateAnimations(dt: number): void {
    for (const door of this.doors.values()) {
      if (door.open && door.openProgress < 1) {
        door.openAnimTime += dt;
        door.openProgress = Math.min(1, door.openAnimTime / 0.6);
      } else if (!door.open && door.openProgress > 0) {
        door.openAnimTime += dt;
        door.openProgress = Math.max(0, 1 - door.openAnimTime / 0.4);
      }
    }

    for (const plate of this.pressurePlates.values()) {
      plate.pulsePhase += dt * 3;
    }

    for (const fence of this.laserFences.values()) {
      fence.pulsePhase += dt * 5;
    }

    for (const card of this.idCards.values()) {
      card.glowPhase += dt * 2;
    }

    for (const intel of this.intelItems.values()) {
      intel.glowPhase += dt * 2.5;
    }
  }

  getProgress(): { idCardsCollected: number; totalIdCards: number; intelCollected: number; totalIntel: number } {
    return {
      idCardsCollected: this.collectedIdCards.size,
      totalIdCards: this.idCards.size,
      intelCollected: this.collectedIntel.size,
      totalIntel: this.totalIntel,
    };
  }
}
