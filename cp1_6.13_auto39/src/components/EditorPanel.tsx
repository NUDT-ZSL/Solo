import { type RaceType, RACE_STATS } from '@/utils/battleLogic';

interface TerrainItem {
  type: string;
  label: string;
  color: string;
  moveCost: number;
  passable: boolean;
  icon: string;
}

const TERRAIN_ITEMS: TerrainItem[] = [
  { type: 'plain', label: '平原', color: '#a3e635', moveCost: 1, passable: true, icon: '🌾' },
  { type: 'forest', label: '森林', color: '#16a34a', moveCost: 2, passable: true, icon: '🌲' },
  { type: 'mountain', label: '山脉', color: '#6b7280', moveCost: 3, passable: true, icon: '⛰️' },
  { type: 'river', label: '河流', color: '#38bdf8', moveCost: Infinity, passable: false, icon: '🌊' },
];

const RACE_ITEMS: { race: RaceType; label: string; color: string; icon: string }[] = [
  { race: 'human', label: '人类', color: RACE_STATS.human.color, icon: '🛡️' },
  { race: 'elf', label: '精灵', color: RACE_STATS.elf.color, icon: '🧝' },
  { race: 'orc', label: '兽人', color: RACE_STATS.orc.color, icon: '👹' },
];

interface EditorPanelProps {
  visible: boolean;
}

export default function EditorPanel({ visible }: EditorPanelProps) {
  if (!visible) return null;

  const handleDragStart = (e: React.DragEvent, data: string) => {
    e.dataTransfer.setData('text/plain', data);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 shrink-0 overflow-y-auto"
      style={{
        width: 220,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(51, 65, 85, 0.5)',
      }}
    >
      <h2 className="text-sm font-semibold tracking-wider uppercase" style={{ color: '#94a3b8' }}>
        地形
      </h2>
      <div className="flex flex-col gap-2">
        {TERRAIN_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) =>
              handleDragStart(e, JSON.stringify({ kind: 'terrain', type: item.type, moveCost: item.moveCost, passable: item.passable }))
            }
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing select-none transition-all duration-300"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: `1px solid ${item.color}33`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = `${item.color}22`;
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}88`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(30, 41, 59, 0.8)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}33`;
            }}
          >
            <span
              className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
              style={{ background: item.color + '33', border: `2px solid ${item.color}` }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: item.type === 'mountain' ? '2px' : '50%',
                  background: item.color,
                }}
              />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                {item.icon} {item.label}
              </span>
              <span className="text-[10px]" style={{ color: '#64748b' }}>
                {item.passable ? `移动消耗 ${item.moveCost} 步` : '不可通行'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold tracking-wider uppercase mt-2" style={{ color: '#94a3b8' }}>
        种族单位
      </h2>
      <div className="flex flex-col gap-2">
        {RACE_ITEMS.map((item) => (
          <div
            key={item.race}
            draggable
            onDragStart={(e) => handleDragStart(e, JSON.stringify({ kind: 'unit', race: item.race }))}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing select-none transition-all duration-300"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: `1px solid ${item.color}33`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = `${item.color}22`;
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}88`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(30, 41, 59, 0.8)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}33`;
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background: item.color + '33', border: `2px solid ${item.color}` }}
            >
              <span style={{ color: item.color, fontWeight: 700, fontSize: 12 }}>
                {item.label[0]}
              </span>
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                {item.icon} {item.label}战士
              </span>
              <span className="text-[10px]" style={{ color: '#64748b' }}>
                ATK {RACE_STATS[item.race].baseAtk} DEF {RACE_STATS[item.race].baseDef} HP {RACE_STATS[item.race].baseHp}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: '#1e293b' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: '#475569' }}>
          拖拽地形或单位到画布上放置。点击已有地形可选中编辑。河流不可通行。
        </p>
      </div>
    </div>
  );
}
