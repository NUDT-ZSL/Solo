import type { EditorMode } from './GameCanvas';

interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onBack: () => void;
  mapName: string;
  onMapNameChange: (name: string) => void;
}

export default function Toolbar({
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onBack,
  mapName,
  onMapNameChange,
}: ToolbarProps) {
  const modes: { key: EditorMode; label: string; icon: string }[] = [
    { key: 'edit', label: '编辑', icon: '✏️' },
    { key: 'preview', label: '预览', icon: '👁️' },
    { key: 'battle', label: '对战', icon: '⚔️' },
  ];

  return (
    <div
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 60,
        background: '#1e293b',
        padding: 8,
        borderTop: '1px solid #334155',
      }}
    >
      <button
        onClick={onBack}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
        style={{ color: '#94a3b8', background: 'transparent', border: '1px solid #334155' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#334155';
          (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
        }}
      >
        ← 返回
      </button>

      <div className="flex items-center gap-1 px-1">
        <input
          value={mapName}
          onChange={(e) => onMapNameChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium px-2 py-1 rounded"
          style={{ color: '#e2e8f0', width: 160, borderBottom: '1px solid #334155' }}
          placeholder="地图名称"
        />
      </div>

      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: '#0f172a', border: '1px solid #334155' }}
      >
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className="px-4 py-2 text-xs font-medium transition-all duration-300"
            style={{
              background: mode === m.key ? '#3b82f6' : 'transparent',
              color: mode === m.key ? '#fff' : '#94a3b8',
            }}
            onMouseEnter={(e) => {
              if (mode !== m.key) {
                (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
                (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== m.key) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              }
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300"
          style={{
            color: canUndo ? '#cbd5e1' : '#475569',
            background: canUndo ? '#0f172a' : 'transparent',
            border: '1px solid #334155',
            opacity: canUndo ? 1 : 0.4,
          }}
          onMouseEnter={(e) => {
            if (canUndo) (e.currentTarget as HTMLButtonElement).style.background = '#334155';
          }}
          onMouseLeave={(e) => {
            if (canUndo) (e.currentTarget as HTMLButtonElement).style.background = '#0f172a';
          }}
        >
          ↶ 撤销
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300"
          style={{
            color: canRedo ? '#cbd5e1' : '#475569',
            background: canRedo ? '#0f172a' : 'transparent',
            border: '1px solid #334155',
            opacity: canRedo ? 1 : 0.4,
          }}
          onMouseEnter={(e) => {
            if (canRedo) (e.currentTarget as HTMLButtonElement).style.background = '#334155';
          }}
          onMouseLeave={(e) => {
            if (canRedo) (e.currentTarget as HTMLButtonElement).style.background = '#0f172a';
          }}
        >
          ↷ 重做
        </button>
      </div>

      <div className="ml-auto">
        <button
          onClick={onSave}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
          style={{
            background: '#22c55e',
            color: '#fff',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#16a34a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#22c55e';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          💾 保存地图
        </button>
      </div>
    </div>
  );
}
