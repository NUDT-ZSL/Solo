import { BlockType, BLOCK_COLORS, BLOCK_NAMES } from '../game/WorldManager';

interface ToolbarProps {
  currentBlock: number;
  onBlockChange: (block: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

const BLOCK_TYPES = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.WATER,
  BlockType.WOOD,
  BlockType.SAND,
];

export default function Toolbar({
  currentBlock,
  onBlockChange,
  showGrid,
  onToggleGrid,
}: ToolbarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          方块
        </span>
        <button
          onClick={onToggleGrid}
          style={{
            background: showGrid ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#ffffff',
            fontSize: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={showGrid ? '隐藏网格' : '显示网格'}
        >
          {showGrid ? '网格' : '网格'}
        </button>
      </div>

      {BLOCK_TYPES.map((blockType, index) => (
        <button
          key={blockType}
          onClick={() => onBlockChange(blockType)}
          style={{
            width: '56px',
            height: '56px',
            border: currentBlock === blockType ? '2px solid #ffffff' : '2px solid transparent',
            borderRadius: '8px',
            background: BLOCK_COLORS[blockType],
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
            boxShadow:
              currentBlock === blockType
                ? '0 0 16px rgba(255, 255, 255, 0.6), inset 0 0 8px rgba(0, 0, 0, 0.3)'
                : 'inset 0 0 8px rgba(0, 0, 0, 0.3)',
            transform: currentBlock === blockType ? 'scale(1.1)' : 'scale(1)',
          }}
          title={`${BLOCK_NAMES[blockType]} (${index + 1})`}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '6px',
              fontSize: '10px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            }}
          >
            {index + 1}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              right: '4px',
              height: '4px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '2px',
            }}
          />
        </button>
      ))}

      <div
        style={{
          marginTop: '8px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '11px',
            marginBottom: '6px',
          }}
        >
          操作说明
        </div>
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            lineHeight: '1.6',
          }}
        >
          <div>左键: 放置方块</div>
          <div>右键: 移除方块</div>
          <div>WASD: 移动</div>
          <div>空格: 跳跃</div>
          <div>1-6: 切换方块</div>
        </div>
      </div>
    </div>
  );
}
