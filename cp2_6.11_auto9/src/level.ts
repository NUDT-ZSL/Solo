export interface GridPos {
    row: number;
    col: number;
}

export interface PixelPos {
    x: number;
    y: number;
}

export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT'
}

export enum CellType {
    EMPTY = 'EMPTY',
    OBSTACLE_STONE = 'OBSTACLE_STONE',
    OBSTACLE_ENERGY = 'OBSTACLE_ENERGY',
    EMITTER = 'EMITTER',
    RECEIVER = 'RECEIVER'
}

export interface Port {
    id: string;
    type: 'emitter' | 'receiver';
    position: GridPos;
    lockId?: string;
    unlocked?: boolean;
}

export interface Obstacle {
    id: string;
    type: 'stone' | 'energy' | 'moving';
    position: GridPos;
    path?: GridPos[];
    pathIndex?: number;
    moveInterval?: number;
    lastMoveTime?: number;
}

export interface EnergyLock {
    id: string;
    receiverIds: string[];
    order?: number[];
}

export interface Level {
    id: number;
    name: string;
    gridSize: { rows: number; cols: number };
    ports: Port[];
    obstacles: Obstacle[];
    locks: EnergyLock[];
}

export interface GridOffset {
    x: number;
    y: number;
    tileWidth: number;
    tileHeight: number;
}

export function gridToPixel(grid: GridPos, offset: GridOffset): PixelPos {
    const x = (grid.col - grid.row) * (offset.tileWidth / 2) + offset.x;
    const y = (grid.col + grid.row) * (offset.tileHeight / 2) + offset.y;
    return { x, y };
}

export function pixelToGrid(pixel: PixelPos, offset: GridOffset): GridPos {
    const relX = pixel.x - offset.x;
    const relY = pixel.y - offset.y;
    const col = (relX / (offset.tileWidth / 2) + relY / (offset.tileHeight / 2)) / 2;
    const row = (relY / (offset.tileHeight / 2) - relX / (offset.tileWidth / 2)) / 2;
    return { row: Math.round(row), col: Math.round(col) };
}

export function isSameGridPos(a: GridPos, b: GridPos): boolean {
    return a.row === b.row && a.col === b.col;
}

export function isInsideGrid(pos: GridPos, gridSize: { rows: number; cols: number }): boolean {
    return pos.row >= 0 && pos.row < gridSize.rows && pos.col >= 0 && pos.col < gridSize.cols;
}

export interface CollisionResult {
    hit: boolean;
    obstacle?: Obstacle;
    normalX?: number;
    normalY?: number;
    absorbed?: boolean;
}

export function checkCollision(
    pixelPos: PixelPos,
    obstacles: Obstacle[],
    offset: GridOffset,
    lastPixelPos?: PixelPos
): CollisionResult {
    const gridPos = pixelToGrid(pixelPos, offset);

    for (const obstacle of obstacles) {
        if (isSameGridPos(gridPos, obstacle.position)) {
            const obstaclePixel = gridToPixel(obstacle.position, offset);

            const halfTileW = offset.tileWidth / 2;
            const halfTileH = offset.tileHeight / 2;
            const cellLeft = obstaclePixel.x - halfTileW;
            const cellRight = obstaclePixel.x + halfTileW;
            const cellTop = obstaclePixel.y - halfTileH;
            const cellBottom = obstaclePixel.y + halfTileH;

            let normalX = 0;
            let normalY = 0;

            if (lastPixelPos) {
                const prevInsideX = lastPixelPos.x >= cellLeft && lastPixelPos.x <= cellRight;
                const prevInsideY = lastPixelPos.y >= cellTop && lastPixelPos.y <= cellBottom;
                const currInsideX = pixelPos.x >= cellLeft && pixelPos.x <= cellRight;
                const currInsideY = pixelPos.y >= cellTop && pixelPos.y <= cellBottom;

                if (!prevInsideX && currInsideX) {
                    normalX = lastPixelPos.x < cellLeft ? -1 : 1;
                    normalY = 0;
                } else if (!prevInsideY && currInsideY) {
                    normalX = 0;
                    normalY = lastPixelPos.y < cellTop ? -1 : 1;
                } else {
                    const distToLeft = Math.abs(pixelPos.x - cellLeft);
                    const distToRight = Math.abs(pixelPos.x - cellRight);
                    const distToTop = Math.abs(pixelPos.y - cellTop);
                    const distToBottom = Math.abs(pixelPos.y - cellBottom);

                    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                    if (minDist === distToLeft) {
                        normalX = -1;
                        normalY = 0;
                    } else if (minDist === distToRight) {
                        normalX = 1;
                        normalY = 0;
                    } else if (minDist === distToTop) {
                        normalX = 0;
                        normalY = -1;
                    } else {
                        normalX = 0;
                        normalY = 1;
                    }
                }
            } else {
                const distToLeft = Math.abs(pixelPos.x - cellLeft);
                const distToRight = Math.abs(pixelPos.x - cellRight);
                const distToTop = Math.abs(pixelPos.y - cellTop);
                const distToBottom = Math.abs(pixelPos.y - cellBottom);

                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

                if (minDist === distToLeft) {
                    normalX = -1;
                    normalY = 0;
                } else if (minDist === distToRight) {
                    normalX = 1;
                    normalY = 0;
                } else if (minDist === distToTop) {
                    normalX = 0;
                    normalY = -1;
                } else {
                    normalX = 0;
                    normalY = 1;
                }
            }

            if (obstacle.type === 'energy') {
                return {
                    hit: true,
                    obstacle,
                    absorbed: true
                };
            }

            return {
                hit: true,
                obstacle,
                normalX,
                normalY,
                absorbed: false
            };
        }
    }

    return { hit: false };
}

export function checkGridCollision(gridPos: GridPos, obstacles: Obstacle[]): Obstacle | null {
    for (const obstacle of obstacles) {
        if (isSameGridPos(gridPos, obstacle.position)) {
            return obstacle;
        }
    }
    return null;
}

export function checkPortCollision(pos: GridPos, ports: Port[]): Port | null {
    for (const port of ports) {
        if (isSameGridPos(pos, port.position)) {
            return port;
        }
    }
    return null;
}

export function checkAllLocksUnlocked(locks: EnergyLock[], ports: Port[]): boolean {
    for (const lock of locks) {
        for (const receiverId of lock.receiverIds) {
            const receiver = ports.find(p => p.id === receiverId);
            if (!receiver || !receiver.unlocked) {
                return false;
            }
        }
    }
    return true;
}

export function getUnlockedLockCount(locks: EnergyLock[], ports: Port[]): number {
    let count = 0;
    for (const lock of locks) {
        const allUnlocked = lock.receiverIds.every(receiverId => {
            const receiver = ports.find(p => p.id === receiverId);
            return receiver && receiver.unlocked;
        });
        if (allUnlocked) count++;
    }
    return count;
}

export function updateMovingObstacles(obstacles: Obstacle[], currentTime: number): Obstacle[] {
    return obstacles.map(obstacle => {
        if (obstacle.type !== 'moving' || !obstacle.path || obstacle.path.length === 0) {
            return obstacle;
        }
        const interval = obstacle.moveInterval || 2000;
        const lastMove = obstacle.lastMoveTime || 0;
        if (currentTime - lastMove >= interval) {
            const currentIndex = obstacle.pathIndex ?? 0;
            const nextIndex = (currentIndex + 1) % obstacle.path.length;
            return {
                ...obstacle,
                position: { ...obstacle.path[nextIndex] },
                pathIndex: nextIndex,
                lastMoveTime: currentTime
            };
        }
        return obstacle;
    });
}

export function resetMovingObstacles(obstacles: Obstacle[]): Obstacle[] {
    return obstacles.map(obstacle => {
        if (obstacle.type !== 'moving' || !obstacle.path || obstacle.path.length === 0) {
            return obstacle;
        }
        return {
            ...obstacle,
            position: { ...obstacle.path[0] },
            pathIndex: 0,
            lastMoveTime: 0
        };
    });
}

export function cloneLevel(level: Level): Level {
    return {
        ...level,
        ports: level.ports.map(p => ({ ...p, position: { ...p.position }, unlocked: p.unlocked ?? false })),
        obstacles: level.obstacles.map(o => ({
            ...o,
            position: { ...o.position },
            path: o.path ? o.path.map(p => ({ ...p })) : undefined
        })),
        locks: level.locks.map(l => ({ ...l, receiverIds: [...l.receiverIds], order: l.order ? [...l.order] : undefined }))
    };
}

export const LEVELS: Level[] = [
    {
        id: 1,
        name: '初始跃迁',
        gridSize: { rows: 7, cols: 7 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 3, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 3, col: 5 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 2,
        name: '折射初试',
        gridSize: { rows: 8, cols: 8 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 1, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 6, col: 6 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 1, col: 4 } },
            { id: 'stone-2', type: 'stone', position: { row: 4, col: 6 } }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 3,
        name: '镜面回廊',
        gridSize: { rows: 9, cols: 9 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 1, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 7, col: 7 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 1, col: 5 } },
            { id: 'stone-2', type: 'stone', position: { row: 4, col: 7 } },
            { id: 'stone-3', type: 'stone', position: { row: 7, col: 3 } },
            { id: 'energy-1', type: 'energy', position: { row: 3, col: 3 } }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 4,
        name: '分岔迷途',
        gridSize: { rows: 9, cols: 9 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 4, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 1, col: 7 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 2, col: 3 } },
            { id: 'stone-2', type: 'stone', position: { row: 4, col: 4 } },
            { id: 'stone-3', type: 'stone', position: { row: 6, col: 3 } },
            { id: 'stone-4', type: 'stone', position: { row: 2, col: 5 } },
            { id: 'stone-5', type: 'stone', position: { row: 6, col: 5 } },
            { id: 'energy-1', type: 'energy', position: { row: 4, col: 6 } }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 5,
        name: '混沌迷宫',
        gridSize: { rows: 10, cols: 10 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 1, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 8, col: 8 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 1, col: 5 } },
            { id: 'stone-2', type: 'stone', position: { row: 5, col: 1 } },
            { id: 'stone-3', type: 'stone', position: { row: 8, col: 4 } },
            { id: 'stone-4', type: 'stone', position: { row: 4, col: 8 } },
            { id: 'energy-1', type: 'energy', position: { row: 3, col: 6 } },
            { id: 'moving-1', type: 'moving', position: { row: 4, col: 4 }, path: [
                { row: 4, col: 4 },
                { row: 4, col: 6 },
                { row: 6, col: 6 },
                { row: 6, col: 4 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 6,
        name: '时序迷阵',
        gridSize: { rows: 10, cols: 10 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 1, col: 2 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 8, col: 7 }, lockId: 'lock-1', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 1, col: 6 } },
            { id: 'stone-2', type: 'stone', position: { row: 5, col: 2 } },
            { id: 'stone-3', type: 'stone', position: { row: 5, col: 7 } },
            { id: 'stone-4', type: 'stone', position: { row: 8, col: 3 } },
            { id: 'moving-1', type: 'moving', position: { row: 3, col: 4 }, path: [
                { row: 3, col: 4 },
                { row: 3, col: 6 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 },
            { id: 'moving-2', type: 'moving', position: { row: 6, col: 5 }, path: [
                { row: 6, col: 5 },
                { row: 8, col: 5 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] }
        ]
    },
    {
        id: 7,
        name: '双锁之门',
        gridSize: { rows: 10, cols: 11 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 5, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 2, col: 9 }, lockId: 'lock-1', unlocked: false },
            { id: 'receiver-2', type: 'receiver', position: { row: 7, col: 9 }, lockId: 'lock-2', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 2, col: 4 } },
            { id: 'stone-2', type: 'stone', position: { row: 7, col: 4 } },
            { id: 'stone-3', type: 'stone', position: { row: 5, col: 6 } },
            { id: 'energy-1', type: 'energy', position: { row: 2, col: 6 } },
            { id: 'energy-2', type: 'energy', position: { row: 7, col: 6 } }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] },
            { id: 'lock-2', receiverIds: ['receiver-2'] }
        ]
    },
    {
        id: 8,
        name: '三联核心',
        gridSize: { rows: 11, cols: 11 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 5, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 1, col: 9 }, lockId: 'lock-1', unlocked: false },
            { id: 'receiver-2', type: 'receiver', position: { row: 5, col: 9 }, lockId: 'lock-2', unlocked: false },
            { id: 'receiver-3', type: 'receiver', position: { row: 9, col: 9 }, lockId: 'lock-3', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 1, col: 4 } },
            { id: 'stone-2', type: 'stone', position: { row: 5, col: 4 } },
            { id: 'stone-3', type: 'stone', position: { row: 9, col: 4 } },
            { id: 'stone-4', type: 'stone', position: { row: 3, col: 6 } },
            { id: 'stone-5', type: 'stone', position: { row: 7, col: 6 } },
            { id: 'energy-1', type: 'energy', position: { row: 1, col: 6 } },
            { id: 'energy-2', type: 'energy', position: { row: 9, col: 6 } },
            { id: 'moving-1', type: 'moving', position: { row: 5, col: 6 }, path: [
                { row: 5, col: 6 },
                { row: 5, col: 7 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] },
            { id: 'lock-2', receiverIds: ['receiver-2'] },
            { id: 'lock-3', receiverIds: ['receiver-3'] }
        ]
    },
    {
        id: 9,
        name: '量子终局',
        gridSize: { rows: 12, cols: 12 },
        ports: [
            { id: 'emitter-1', type: 'emitter', position: { row: 1, col: 1 } },
            { id: 'receiver-1', type: 'receiver', position: { row: 1, col: 10 }, lockId: 'lock-1', unlocked: false },
            { id: 'receiver-2', type: 'receiver', position: { row: 10, col: 1 }, lockId: 'lock-2', unlocked: false },
            { id: 'receiver-3', type: 'receiver', position: { row: 10, col: 10 }, lockId: 'lock-3', unlocked: false }
        ],
        obstacles: [
            { id: 'stone-1', type: 'stone', position: { row: 3, col: 3 } },
            { id: 'stone-2', type: 'stone', position: { row: 3, col: 8 } },
            { id: 'stone-3', type: 'stone', position: { row: 8, col: 3 } },
            { id: 'stone-4', type: 'stone', position: { row: 8, col: 8 } },
            { id: 'stone-5', type: 'stone', position: { row: 5, col: 5 } },
            { id: 'stone-6', type: 'stone', position: { row: 6, col: 6 } },
            { id: 'energy-1', type: 'energy', position: { row: 1, col: 5 } },
            { id: 'energy-2', type: 'energy', position: { row: 5, col: 1 } },
            { id: 'energy-3', type: 'energy', position: { row: 10, col: 5 } },
            { id: 'energy-4', type: 'energy', position: { row: 5, col: 10 } },
            { id: 'moving-1', type: 'moving', position: { row: 4, col: 5 }, path: [
                { row: 4, col: 5 },
                { row: 4, col: 7 },
                { row: 7, col: 7 },
                { row: 7, col: 5 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 },
            { id: 'moving-2', type: 'moving', position: { row: 2, col: 6 }, path: [
                { row: 2, col: 6 },
                { row: 9, col: 6 }
            ], pathIndex: 0, moveInterval: 2000, lastMoveTime: 0 }
        ],
        locks: [
            { id: 'lock-1', receiverIds: ['receiver-1'] },
            { id: 'lock-2', receiverIds: ['receiver-2'] },
            { id: 'lock-3', receiverIds: ['receiver-3'] }
        ]
    }
];

export function getLevelById(id: number): Level | undefined {
    return LEVELS.find(l => l.id === id);
}
