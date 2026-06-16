import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_GRID_CONFIG, MODULE_STYLES, MODULE_TYPES, ModuleType } from '../data';

export interface GridConfig {
  rows: number;
  cols: number;
  cellSize: number;
  gridLineColor: string;
  gridLineWidth: number;
  gridBgColor: string;
}

export interface CellData {
  row: number;
  col: number;
  name?: string;
}

export interface StorageItem {
  id: string;
  name: string;
  quantity: number;
  emoji?: string;
}

export interface StorageModule {
  id: string;
  type: ModuleType;
  row: number;
  col: number;
  widthCells: number;
  heightCells: number;
  items: StorageItem[];
}

export interface SearchResult {
  itemName: string;
  modules: {
    moduleId: string;
    moduleLabel: string;
    quantity: number;
    position: { row: number; col: number };
  }[];
}

class StorageLogicClass {
  private gridConfig: GridConfig;
  private cells: Map<string, CellData>;
  private modules: StorageModule[];
  private listeners: Set<() => void>;

  constructor() {
    this.gridConfig = { ...DEFAULT_GRID_CONFIG };
    this.cells = new Map();
    this.modules = [];
    this.listeners = new Set();
    this.initCells();
  }

  private initCells() {
    for (let row = 0; row < this.gridConfig.rows; row++) {
      for (let col = 0; col < this.gridConfig.cols; col++) {
        const key = `${row}-${col}`;
        this.cells.set(key, { row, col });
      }
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getGridConfig(): GridConfig {
    return { ...this.gridConfig };
  }

  getCells(): CellData[] {
    return Array.from(this.cells.values());
  }

  getCell(row: number, col: number): CellData | undefined {
    return this.cells.get(`${row}-${col}`);
  }

  setCellName(row: number, col: number, name: string) {
    const key = `${row}-${col}`;
    const cell = this.cells.get(key);
    if (cell) {
      cell.name = name;
      this.notify();
    }
  }

  getModules(): StorageModule[] {
    return [...this.modules];
  }

  getModule(id: string): StorageModule | undefined {
    return this.modules.find(m => m.id === id);
  }

  checkBoundaryCollision(
    startRow: number,
    startCol: number,
    widthCells: number,
    heightCells: number,
    excludeModuleId?: string
  ): boolean {
    const endRow = startRow + heightCells - 1;
    const endCol = startCol + widthCells - 1;

    if (
      startRow < 0 ||
      startCol < 0 ||
      endRow >= this.gridConfig.rows ||
      endCol >= this.gridConfig.cols
    ) {
      return true;
    }

    for (const module of this.modules) {
      if (excludeModuleId && module.id === excludeModuleId) continue;

      const mEndRow = module.row + module.heightCells - 1;
      const mEndCol = module.col + module.widthCells - 1;

      const overlap = !(
        endRow < module.row ||
        startRow > mEndRow ||
        endCol < module.col ||
        startCol > mEndCol
      );

      if (overlap) return true;
    }

    return false;
  }

  checkPlacementCollision(
    startRow: number,
    startCol: number,
    widthCells: number,
    heightCells: number,
    excludeModuleId?: string
  ): {
    hasCollision: boolean;
    collisionType: 'none' | 'boundary' | 'overlap';
    overlappingModuleId?: string;
  } {
    const endRow = startRow + heightCells - 1;
    const endCol = startCol + widthCells - 1;

    if (
      startRow < 0 ||
      startCol < 0 ||
      endRow >= this.gridConfig.rows ||
      endCol >= this.gridConfig.cols
    ) {
      return { hasCollision: true, collisionType: 'boundary' };
    }

    for (const module of this.modules) {
      if (excludeModuleId && module.id === excludeModuleId) continue;

      const mEndRow = module.row + module.heightCells - 1;
      const mEndCol = module.col + module.widthCells - 1;

      const overlap = !(
        endRow < module.row ||
        startRow > mEndRow ||
        endCol < module.col ||
        startCol > mEndCol
      );

      if (overlap) {
        return {
          hasCollision: true,
          collisionType: 'overlap',
          overlappingModuleId: module.id
        };
      }
    }

    return { hasCollision: false, collisionType: 'none' };
  }

  placeModule(
    type: ModuleType,
    startRow: number,
    startCol: number
  ): { success: boolean; module?: StorageModule } {
    const style = MODULE_STYLES[type];
    if (!style) return { success: false };

    if (this.checkBoundaryCollision(startRow, startCol, style.widthCells, style.heightCells)) {
      return { success: false };
    }

    const newModule: StorageModule = {
      id: uuidv4(),
      type,
      row: startRow,
      col: startCol,
      widthCells: style.widthCells,
      heightCells: style.heightCells,
      items: []
    };

    this.modules.push(newModule);
    this.notify();
    return { success: true, module: newModule };
  }

  moveModule(
    moduleId: string,
    newRow: number,
    newCol: number
  ): { success: boolean } {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module) return { success: false };

    if (
      this.checkBoundaryCollision(
        newRow,
        newCol,
        module.widthCells,
        module.heightCells,
        moduleId
      )
    ) {
      return { success: false };
    }

    module.row = newRow;
    module.col = newCol;
    this.notify();
    return { success: true };
  }

  removeModule(moduleId: string): boolean {
    const index = this.modules.findIndex(m => m.id === moduleId);
    if (index === -1) return false;
    this.modules.splice(index, 1);
    this.notify();
    return true;
  }

  addItemToModule(
    moduleId: string,
    itemName: string,
    quantity: number,
    emoji?: string
  ): { success: boolean; item?: StorageItem } {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module) return { success: false };

    const existingItem = module.items.find(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      this.notify();
      return { success: true, item: existingItem };
    }

    const newItem: StorageItem = {
      id: uuidv4(),
      name: itemName,
      quantity,
      emoji
    };

    module.items.push(newItem);
    this.notify();
    return { success: true, item: newItem };
  }

  removeItemFromModule(moduleId: string, itemId: string): boolean {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module) return false;

    const index = module.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    module.items.splice(index, 1);
    this.notify();
    return true;
  }

  updateItemQuantity(moduleId: string, itemId: string, quantity: number): boolean {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module) return false;

    const item = module.items.find(i => i.id === itemId);
    if (!item) return false;

    item.quantity = Math.max(0, quantity);
    if (item.quantity === 0) {
      const index = module.items.findIndex(i => i.id === itemId);
      module.items.splice(index, 1);
    }
    this.notify();
    return true;
  }

  getModuleItems(moduleId: string): StorageItem[] {
    const module = this.modules.find(m => m.id === moduleId);
    return module ? [...module.items] : [];
  }

  searchItems(keyword: string): SearchResult[] {
    const startTime = performance.now();
    const normalizedKeyword = keyword.toLowerCase().trim();

    if (!normalizedKeyword) {
      return [];
    }

    const itemMap = new Map<string, SearchResult>();

    for (const module of this.modules) {
      const moduleLabel = MODULE_STYLES[module.type]?.label || '模块';

      for (const item of module.items) {
        if (item.name.toLowerCase().includes(normalizedKeyword)) {
          const key = item.name;

          if (!itemMap.has(key)) {
            itemMap.set(key, {
              itemName: item.name,
              modules: []
            });
          }

          const result = itemMap.get(key)!;
          result.modules.push({
            moduleId: module.id,
            moduleLabel,
            quantity: item.quantity,
            position: { row: module.row, col: module.col }
          });
        }
      }
    }

    const results = Array.from(itemMap.values());
    const elapsed = performance.now() - startTime;

    if (elapsed > 100) {
      console.warn(`搜索耗时 ${elapsed.toFixed(2)}ms，超过100ms阈值`);
    }

    return results;
  }

  findFirstMatchingPosition(itemName: string): { row: number; col: number } | null {
    for (const module of this.modules) {
      for (const item of module.items) {
        if (item.name === itemName) {
          return { row: module.row, col: module.col };
        }
      }
    }
    return null;
  }

  getModuleIdsContainingItem(itemName: string): string[] {
    const moduleIds: string[] = [];
    const normalizedName = itemName.toLowerCase();

    for (const module of this.modules) {
      for (const item of module.items) {
        if (item.name.toLowerCase() === normalizedName) {
          moduleIds.push(module.id);
          break;
        }
      }
    }

    return moduleIds;
  }

  getGridPixelSize(): { width: number; height: number } {
    return {
      width: this.gridConfig.cols * this.gridConfig.cellSize,
      height: this.gridConfig.rows * this.gridConfig.cellSize
    };
  }

  pixelToGridPosition(
    pixelX: number,
    pixelY: number,
    containerOffsetX: number = 0,
    containerOffsetY: number = 0
  ): { row: number; col: number } {
    const relativeX = pixelX - containerOffsetX;
    const relativeY = pixelY - containerOffsetY;

    return {
      col: Math.floor(relativeX / this.gridConfig.cellSize),
      row: Math.floor(relativeY / this.gridConfig.cellSize)
    };
  }

  gridToPixelPosition(
    row: number,
    col: number
  ): { x: number; y: number } {
    return {
      x: col * this.gridConfig.cellSize,
      y: row * this.gridConfig.cellSize
    };
  }
}

export const StorageLogic = new StorageLogicClass();
