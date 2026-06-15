import type { Block, LayoutConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_BLOCK_SIZE = 120;
export const BLOCK_BORDER_RADIUS = 8;
export const BLOCK_GAP = 20;
export const CANVAS_GRID_SIZE = 4;

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  display: 'flex',
  position: 'static',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'stretch',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gridTemplateRows: 'repeat(2, 1fr)',
};

export const createDefaultBlocks = (): Block[] => [
  {
    id: uuidv4(),
    x: 40,
    y: 40,
    width: DEFAULT_BLOCK_SIZE,
    height: DEFAULT_BLOCK_SIZE,
    backgroundColor: '#3B82F6',
  },
  {
    id: uuidv4(),
    x: 40 + DEFAULT_BLOCK_SIZE + BLOCK_GAP,
    y: 40,
    width: DEFAULT_BLOCK_SIZE,
    height: DEFAULT_BLOCK_SIZE,
    backgroundColor: '#F59E0B',
  },
  {
    id: uuidv4(),
    x: 40 + (DEFAULT_BLOCK_SIZE + BLOCK_GAP) * 2,
    y: 40,
    width: DEFAULT_BLOCK_SIZE,
    height: DEFAULT_BLOCK_SIZE,
    backgroundColor: '#10B981',
  },
];
