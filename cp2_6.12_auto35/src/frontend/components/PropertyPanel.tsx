import { useState, useEffect } from 'react';
import type { Item, Puzzle, PuzzleType } from '../../types';
import ItemIcon from './ItemIcon';

interface PropertyPanelProps {
  item: Item | null;
  isOpen: boolean;
  onUpdateItem: (updates: Partial<Item>) => void;
  onDeleteItem?: () => void;
  roomItems: Item[];
}

function PropertyPanel({ item, isOpen, onUpdateItem, onDeleteItem, roomItems }: PropertyPanelProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    if (item?.puzzle) {
      setPuzzle(item.puzzle);
    } else {
      setPuzzle(null);
    }
  }, [item]);

  const handlePuzzleChange = (updates: Partial<Puzzle>) => {
    const newPuzzle = { ...puzzle, ...updates } as Puzzle;
    setPuzzle(newPuzzle);
    onUpdateItem({ puzzle: newPuzzle });
  };

  const addPuzzle = (type: PuzzleType) => {
    const newPuzzle: Puzzle = {
      id: `puzzle-${Date.now()}`,
      type,
      question: type === 'number' ? '输入正确的密码' : type === 'text' ? '排列出正确的文字' : '拼出正确的图案',
      answer: '',
      hint: ''
    };
    
    if (type === 'text') {
      newPuzzle.scrambledText = '密室逃脱';
      newPuzzle.answer = '密室逃脱';
    }
    if (type === 'image') {
      newPuzzle.answer = 'solved';
    }
    
    setPuzzle(newPuzzle);
    onUpdateItem({ puzzle: newPuzzle });
  };

  const removePuzzle = () => {
    setPuzzle(null);
    onUpdateItem({ puzzle: undefined, puzzleId: undefined });
  };

  const effectTypes = [
    { value: 'open_door', label: '打开门' },
    { value: 'remove_wall', label: '移除墙壁' },
    { value: 'unlock_next_room', label: '解锁下一房间' },
    { value: 'play_audio', label: '播放音频' }
  ];

  if (!isOpen || !item) {
    return (
      <div style={{
        width: '320px',
        height: '100%',
        backgroundColor: '#1e293b',
        borderLeft: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <p>选择一个道具查看属性</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '320px',
      height: '100%',
      backgroundColor: '#1e293b',
      borderLeft: '1px solid #334155',
      overflowY: 'auto',
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #f97316'
          }}>
            <ItemIcon type={item.type} size={32} />
          </div>
          <div>
            <h3 style={{ color: '#f1f5f9', fontSize: '16px' }}>{item.name}</h3>
            <p style={{ color: '#64748b', fontSize: '13px' }}>类型：{item.type}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
            道具名称
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdateItem({ name: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
            位置
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              value={item.x}
              onChange={(e) => onUpdateItem({ x: parseInt(e.target.value) || 0 })}
              style={{
                flex: 1,
                padding: '8px 10px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
              placeholder="X"
            />
            <input
              type="number"
              value={item.y}
              onChange={(e) => onUpdateItem({ y: parseInt(e.target.value) || 0 })}
              style={{
                flex: 1,
                padding: '8px 10px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
              placeholder="Y"
            />
          </div>
        </div>

        {item.type === 'door' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                门状态
              </label>
              <div style={{
                padding: '8px 10px',
                backgroundColor: item.doorLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                border: '1px solid',
                borderColor: item.doorLocked ? '#ef4444' : '#22c55e',
                borderRadius: '6px',
                color: item.doorLocked ? '#fca5a5' : '#86efac',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {item.doorLocked ? '🔒 上锁中' : '🔓 已解锁'}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                默认状态
              </label>
              <select
                value={item.doorLocked ? 'locked' : 'unlocked'}
                onChange={(e) => onUpdateItem({ doorLocked: e.target.value === 'locked' })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  fontSize: '14px'
                }}
              >
                <option value="locked">默认上锁</option>
                <option value="unlocked">默认解锁</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <h4 style={{ color: '#f1f5f9', fontSize: '14px', marginBottom: '12px' }}>
        🧩 谜题设置
        </h4>
        
        {!puzzle ? (
          <div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>
              该道具暂未绑定谜题
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => addPuzzle('number')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textAlign: 'left'
                }}
              >
                🔢 数字密码
              </button>
              <button
                onClick={() => addPuzzle('text')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textAlign: 'left'
                }}
              >
                🔤 文字重组
              </button>
              <button
                onClick={() => addPuzzle('image')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textAlign: 'left'
                }}
              >
                🖼️ 图片拼图
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '10px',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid #f97316',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <span style={{ color: '#f97316', fontSize: '13px' }}>
                {puzzle.type === 'number' && '🔢 数字密码'}
                {puzzle.type === 'text' && '🔤 文字重组'}
                {puzzle.type === 'image' && '🖼️ 图片拼图'}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                谜题问题
              </label>
              <input
                type="text"
                value={puzzle.question}
                onChange={(e) => handlePuzzleChange({ question: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                正确答案
              </label>
              <input
                type="text"
                value={puzzle.answer}
                onChange={(e) => handlePuzzleChange({ answer: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  fontSize: '13px'
                }}
              />
            </div>

            {puzzle.type === 'text' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                  打乱的文字
                </label>
                <input
                  type="text"
                  value={puzzle.scrambledText || ''}
                  onChange={(e) => handlePuzzleChange({ scrambledText: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: '#f1f5f9',
                    fontSize: '13px'
                  }}
                  placeholder="如：密室逃脱"
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
                提示（可选）
              </label>
              <input
                type="text"
                value={puzzle.hint || ''}
                onChange={(e) => handlePuzzleChange({ hint: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f1f5f9',
                  fontSize: '13px'
                }}
                placeholder="给玩家的小提示"
              />
            </div>

            <button
              onClick={removePuzzle}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              移除谜题
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <h4 style={{ color: '#f1f5f9', fontSize: '14px', marginBottom: '12px' }}>
          ⚡ 解谜成功效果
        </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
            效果类型
          </label>
          <select
            value={item.effect?.type || ''}
            onChange={(e) => {
              const type = e.target.value as Item['effect']['type'] | '';
              if (type) {
                onUpdateItem({ effect: { type, targetId: item.effect?.targetId } });
              } else {
                onUpdateItem({ effect: undefined });
              }
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9',
              fontSize: '13px'
            }}
          >
            <option value="">无效果</option>
            {effectTypes.map(et => (
              <option key={et.value} value={et.value}>{et.label}</option>
            ))}
          </select>
        </div>

        {item.effect?.type === 'open_door' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
              目标门
            </label>
            <select
              value={item.effect?.targetId || ''}
              onChange={(e) => onUpdateItem({ effect: { ...item.effect!, targetId: e.target.value } })}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '13px'
              }}
            >
              <option value="">选择门</option>
              {roomItems.filter(i => i.type === 'door').map(door => (
                <option key={door.id} value={door.id}>{door.name}</option>
              ))}
            </select>
          </div>
        )}

        {item.effect?.type === 'remove_wall' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>
              目标墙壁位置 (x,y)
            </label>
            <input
              type="text"
              value={item.effect?.targetId || ''}
              onChange={(e) => onUpdateItem({ effect: { ...item.effect!, targetId: e.target.value } })}
              placeholder="如：5,3"
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '13px'
              }}
            />
          </div>
        )}
      </div>

      {onDeleteItem && (
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={onDeleteItem}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              borderRadius: '6px',
              fontSize: '14px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            🗑️ 删除道具
          </button>
        </div>
      )}
    </div>
  );
}

export default PropertyPanel;
