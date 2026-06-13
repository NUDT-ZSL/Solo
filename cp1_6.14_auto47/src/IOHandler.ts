import { GridElement, EditorStateShape, ElementType } from './EditorState';
import { buildCollisionGrid } from './CollisionEngine';

const CURRENT_VERSION = '1.0.0';

export interface ExportedMapData {
  version: string;
  exportedAt: number;
  gridSize: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  elements: Array<{
    id: string;
    type: ElementType;
    gridX: number;
    gridY: number;
    properties: {
      opacity?: number;
      rotation?: number;
    };
  }>;
  collisionLayer: boolean[][];
  collisionStats: {
    blockedCount: number;
    passableCount: number;
    passableRatio: number;
    totalCells: number;
  };
}

const VALID_ELEMENT_TYPES: ElementType[] = [
  'grass', 'dirt', 'sand', 'water', 'rock', 'tree', 'building', 'start', 'end'
];

const isValidElementType = (t: unknown): t is ElementType => {
  return typeof t === 'string' && VALID_ELEMENT_TYPES.includes(t as ElementType);
};

const generateId = (): string => {
  return 'el_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export const exportMap = (state: EditorStateShape): ExportedMapData => {
  const canvasWidth = state.gridSize * state.cellSize;
  const canvasHeight = state.gridSize * state.cellSize;
  const collision = buildCollisionGrid(state.elements, state.gridSize);

  const expectedRows = state.gridSize;
  const expectedCols = state.gridSize;
  const actualRows = collision.collisionGrid.length;
  const actualCols = collision.collisionGrid[0]?.length || 0;

  let finalCollision: boolean[][];
  if (actualRows === expectedRows && actualCols === expectedCols) {
    finalCollision = collision.collisionGrid;
  } else {
    console.warn(
      `[IOHandler] 碰撞层维度(${actualRows}x${actualCols})与网格尺寸(${expectedRows}x${expectedCols})不匹配，已根据元素位置重新计算`
    );
    finalCollision = [];
    for (let y = 0; y < expectedRows; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < expectedCols; x++) {
        const el = state.elements.find(e => e.gridX === x && e.gridY === y);
        row.push(!!el && ['water', 'rock', 'building'].includes(el.type));
      }
      finalCollision.push(row);
    }
  }

  const blockedCount = finalCollision.flat().filter(Boolean).length;
  const totalCells = expectedRows * expectedCols;
  const passableCount = totalCells - blockedCount;
  const passableRatio = totalCells > 0 ? passableCount / totalCells : 0;

  return {
    version: CURRENT_VERSION,
    exportedAt: Date.now(),
    gridSize: state.gridSize,
    cellSize: state.cellSize,
    canvasWidth,
    canvasHeight,
    elements: state.elements.map(el => ({
      id: el.id,
      type: el.type,
      gridX: el.gridX,
      gridY: el.gridY,
      properties: {
        opacity: el.properties.opacity,
        rotation: el.properties.rotation
      }
    })),
    collisionLayer: finalCollision,
    collisionStats: {
      blockedCount,
      passableCount,
      passableRatio,
      totalCells
    }
  };
};

export const exportMapToJson = (state: EditorStateShape): string => {
  return JSON.stringify(exportMap(state), null, 2);
};

export const downloadMapJson = (state: EditorStateShape, filename: string = 'map.json'): void => {
  const json = exportMapToJson(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export interface ImportResult {
  success: boolean;
  state?: Partial<EditorStateShape>;
  error?: string;
}

const validateVersion = (version: string): { valid: boolean; warning?: string } => {
  if (version === CURRENT_VERSION) return { valid: true };
  const [major] = version.split('.').map(Number);
  const [currentMajor] = CURRENT_VERSION.split('.').map(Number);
  if (major === currentMajor) {
    return { valid: true, warning: `数据版本 ${version} 与当前版本 ${CURRENT_VERSION} 略有差异，已尝试兼容导入` };
  }
  return { valid: false };
};

export const importMap = (jsonString: string): ImportResult => {
  try {
    const raw = JSON.parse(jsonString);

    if (typeof raw !== 'object' || raw === null) {
      return { success: false, error: '无效的JSON数据：根必须为对象' };
    }

    const data = raw as Partial<ExportedMapData>;

    if (!data.version || typeof data.version !== 'string') {
      return { success: false, error: '缺少版本号字段' };
    }

    const versionCheck = validateVersion(data.version);
    if (!versionCheck.valid) {
      return {
        success: false,
        error: `不兼容的数据版本 ${data.version}，当前支持版本 ${CURRENT_VERSION}`
      };
    }

    const gridSize = typeof data.gridSize === 'number' && data.gridSize > 0 ? data.gridSize : 20;
    const cellSize = typeof data.cellSize === 'number' && data.cellSize > 0 ? data.cellSize : 60;

    if (!Array.isArray(data.elements)) {
      return { success: false, error: 'elements字段必须为数组' };
    }

    const elements: GridElement[] = [];
    for (let i = 0; i < data.elements.length; i++) {
      const rawEl = data.elements[i];
      if (typeof rawEl !== 'object' || rawEl === null) continue;

      const el = rawEl as Partial<GridElement>;
      if (!isValidElementType(el.type)) continue;
      if (typeof el.gridX !== 'number' || typeof el.gridY !== 'number') continue;
      if (el.gridX < 0 || el.gridX >= gridSize || el.gridY < 0 || el.gridY >= gridSize) continue;

      const props = el.properties || {};
      const supportsOpacity = el.type === 'water';
      elements.push({
        id: typeof el.id === 'string' ? el.id : generateId(),
        type: el.type,
        gridX: el.gridX,
        gridY: el.gridY,
        properties: {
          opacity: supportsOpacity
            ? (typeof props.opacity === 'number' ? Math.max(0.3, Math.min(1, props.opacity)) : 0.8)
            : undefined,
          rotation: typeof props.rotation === 'number' ? props.rotation % 360 : undefined
        },
        placedAt: Date.now()
      });
    }

    if (data.collisionLayer && Array.isArray(data.collisionLayer)) {
      const importedRows = data.collisionLayer.length;
      const importedCols = data.collisionLayer[0]?.length || 0;
      if (importedRows !== gridSize || importedCols !== gridSize) {
        console.warn(
          `[IOHandler] 导入的碰撞层维度(${importedRows}x${importedCols})与网格尺寸(${gridSize}x${gridSize})不匹配，已根据元素重新生成`
        );
      }
    }

    const state: Partial<EditorStateShape> = {
      gridSize,
      cellSize,
      elements,
      selectedElementId: null,
      selectedTool: null,
      toolMode: 'place',
      zoom: 1,
      panX: 0,
      panY: 0,
      showCollisionLayer: true,
      animatingCells: []
    };

    if (versionCheck.warning) {
      console.warn('[IOHandler]', versionCheck.warning);
    }

    return { success: true, state };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `解析JSON失败: ${msg}` };
  }
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file, 'utf-8');
  });
};
