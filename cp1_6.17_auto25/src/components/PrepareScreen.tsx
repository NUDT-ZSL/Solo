import { useState } from 'react';
import { PageType } from '../App';
import { Monster } from '../utils/monsterData';
import MonsterSprite from './MonsterSprite';
import { playClickSound, playDragStartSound, playDropSound } from '../utils/audio';

interface PrepareScreenProps {
  team: Monster[];
  onRemove: (monsterId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onNavigate: (page: PageType) => void;
}

export default function PrepareScreen({ team, onRemove, onReorder, onNavigate }: PrepareScreenProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const playSoundAndNav = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  const canStartBattle = team.length > 0;

  const handleDragStart = (index: number, e: React.DragEvent) => {
    playDragStartSound();
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      playDropSound();
      onReorder(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E1E2E',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <button className="btn-pixel" onClick={() => playSoundAndNav('menu')}>
            ← 返回菜单
          </button>
          <h2 className="pixel-font" style={{ color: '#FFD54F', fontSize: 18 }}>
            ⚔️ 出战准备
          </h2>
          <button className="btn-pixel" onClick={() => playSoundAndNav('assemble')}>
            + 组装怪兽
          </button>
        </div>

        <div style={{
          backgroundColor: '#2D2D44',
          borderRadius: 12,
          padding: 32,
          marginBottom: 24,
        }}>
          <div className="pixel-font" style={{
            color: '#81D4FA',
            fontSize: 11,
            marginBottom: 20,
          }}>
            队伍 {team.length}/3 · 拖拽卡片调整出战顺序
          </div>

          {team.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#757575',
              fontFamily: "'Press Start 2P', cursive",
              fontSize: 12,
              lineHeight: 2,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <div>队伍空空如也</div>
              <button
                className="btn-pixel"
                onClick={() => playSoundAndNav('assemble')}
                style={{ marginTop: 24 }}
              >
                去组装怪兽
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              minHeight: 240,
            }}>
              {[0, 1, 2].map(slotIndex => {
                const monster = team[slotIndex];
                const isDragging = dragIndex === slotIndex;
                const isOver = dragOverIndex === slotIndex && dragIndex !== slotIndex;

                return (
                  <div
                    key={slotIndex}
                    onDragOver={(e) => handleDragOver(slotIndex, e)}
                    onDrop={() => handleDrop(slotIndex)}
                    onDragLeave={() => setDragOverIndex(null)}
                    style={{
                      width: 140,
                      minHeight: 200,
                      position: 'relative',
                      border: isOver ? '2px dashed #81D4FA' : '2px dashed transparent',
                      borderRadius: 8,
                      padding: 4,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {monster ? (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(slotIndex, e)}
                        onDragEnd={handleDragEnd}
                        style={{
                          width: 140,
                          backgroundColor: '#F5F5F5',
                          borderRadius: 8,
                          boxShadow: `1px 1px 0 #BDBDBD, 2px 2px 0 #BDBDBD`,
                          padding: 12,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          opacity: isDragging ? 0.5 : 1,
                          transform: isDragging ? 'rotate(3deg) scale(0.95)' : 'none',
                          transition: 'all 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{
                          textAlign: 'center',
                          color: '#37474F',
                          fontSize: 10,
                          fontFamily: "'Press Start 2P', cursive",
                          marginBottom: 8,
                          lineHeight: 1.5,
                        }}>
                          {monster.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          marginBottom: 8,
                        }}>
                          <MonsterSprite parts={monster.parts} size={100} />
                        </div>
                        <div style={{
                          fontSize: 9,
                          color: '#546E7A',
                          lineHeight: 1.8,
                          fontFamily: "'Press Start 2P', cursive",
                        }}>
                          <div>❤️ HP: {monster.maxHp}</div>
                          <div>⚔️ ATK: {monster.attack}</div>
                          <div>⚡ SPD: {monster.speed}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            onRemove(monster.id);
                          }}
                          style={{
                            marginTop: 10,
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#E53935',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 9,
                            fontFamily: "'Press Start 2P', cursive",
                          }}
                        >
                          移除
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: 140,
                        height: 220,
                        border: '2px dashed #455A64',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#616161',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 10,
                      }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
                        空位
                      </div>
                    )}

                    <div style={{
                      position: 'absolute',
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: slotIndex === 0 ? '#FFD54F' : '#455A64',
                      color: slotIndex === 0 ? '#1E1E2E' : '#FFFFFF',
                      borderRadius: 10,
                      padding: '2px 10px',
                      fontSize: 9,
                      fontFamily: "'Press Start 2P', cursive",
                      whiteSpace: 'nowrap',
                    }}>
                      {slotIndex === 0 ? '先锋' : slotIndex === 1 ? '中锋' : '后卫'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
        }}>
          <button
            className="btn-pixel"
            disabled={!canStartBattle}
            onClick={() => playSoundAndNav('battle')}
            style={{
              fontSize: 14,
              padding: '16px 40px',
              background: canStartBattle ? 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' : undefined,
            }}
          >
            ⚔️ 开始战斗
          </button>
        </div>
      </div>
    </div>
  );
}
