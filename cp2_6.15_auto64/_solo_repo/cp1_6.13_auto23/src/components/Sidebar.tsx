import { memo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Palette } from '../types';
import { generateCSSGradient } from '../utils/colorUtils';

interface SidebarProps {
  palettes: Palette[];
  selectedId: string | null;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  compact?: boolean;
}

interface PaletteItemProps {
  palette: Palette;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

const PaletteItem = memo(function PaletteItem({
  palette,
  selected,
  onSelect,
  onDelete,
  onRename
}: PaletteItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(palette.name);
  const [hovered, setHovered] = useState(false);

  const gradientStyle = { background: generateCSSGradient(palette) };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditName(palette.name);
  };

  const commitEdit = () => {
    onRename(editName);
    setEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={startEdit}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        gap: 12,
        borderRadius: 10,
        cursor: 'pointer',
        background: selected ? 'rgba(99,102,241,0.12)' : hovered ? 'rgba(99,102,241,0.06)' : 'transparent',
        transition: 'background-color 0.2s ease',
        border: selected ? '1px solid rgba(129,140,248,0.35)' : '1px solid transparent',
        marginBottom: 6,
        position: 'relative'
      }}
    >
      <div
        style={{
          width: selected ? 56 : 48,
          height: selected ? 56 : 48,
          borderRadius: '50%',
          flexShrink: 0,
          ...gradientStyle,
          border: selected ? '2px solid #6366f1' : '2px solid transparent',
          boxShadow: selected ? '0 0 16px rgba(129,140,248,0.35)' : 'none',
          opacity: selected ? 1 : 0.6,
          transition: 'all 0.2s ease'
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#e0e0f0',
              background: 'rgba(255,255,255,0.08)',
              padding: '4px 8px',
              borderRadius: 6,
              width: '100%',
              outline: 'none',
              border: '1px solid #6366f1'
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#e0e0f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {palette.name}
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: '#8888a0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {palette.type === 'linear' ? '线性' : '径向'} · {palette.colorStops.length} 节点
        </div>
      </div>
      {hovered && !editing && (
        <button
          onClick={handleDelete}
          title="删除色板"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'rgba(255,107,107,0.2)',
            color: '#ff6b6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.2)')}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
});

export function Sidebar({
  palettes,
  selectedId,
  onAdd,
  onDelete,
  onSelect,
  onRename,
  compact = false
}: SidebarProps) {
  return (
    <div
      style={{
        padding: compact ? 8 : 16,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '4px 4px 12px',
          borderBottom: '1px solid #3a3a4e'
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#818cf8', letterSpacing: '-0.3px' }}>
            PaletteForge
          </div>
          <div style={{ fontSize: 12, color: '#8888a0', marginTop: 2 }}>
            {palettes.length} 个色板
          </div>
        </div>
        <button
          onClick={onAdd}
          title="新建色板"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#3a3a4e',
            color: '#e0e0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#4a4a5e';
            e.currentTarget.style.color = '#818cf8';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#3a3a4e';
            e.currentTarget.style.color = '#e0e0f0';
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {palettes.map(palette => (
          <PaletteItem
            key={palette.id}
            palette={palette}
            selected={palette.id === selectedId}
            onSelect={() => onSelect(palette.id)}
            onDelete={() => onDelete(palette.id)}
            onRename={(name: string) => onRename(palette.id, name)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(129,140,248,0.08)',
          border: '1px solid rgba(129,140,248,0.2)',
          fontSize: 11,
          color: '#aaaaca',
          lineHeight: 1.5
        }}
      >
        💡 双击色板可重命名<br />
        Ctrl+单击节点可删除
      </div>
    </div>
  );
}
