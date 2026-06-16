import { useState, useMemo } from 'react';
import { PageType } from '../App';
import { loadPokedex, loadBattleLogs } from '../utils/storage';
import { PokedexEntry, Monster, Part, PartType, createMonsterFromParts, getPartById, calculatePower } from '../utils/monsterData';
import MonsterSprite from './MonsterSprite';
import { playClickSound } from '../utils/audio';

interface PokedexScreenProps {
  onNavigate: (page: PageType) => void;
}

export default function PokedexScreen({ onNavigate }: PokedexScreenProps) {
  const playSoundAndNav = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  const [selectedEntry, setSelectedEntry] = useState<PokedexEntry | null>(null);
  const pokedex = useMemo(() => loadPokedex(), []);
  const battleLogs = useMemo(() => loadBattleLogs(), []);
  const unlockedCount = pokedex.length;
  const totalPossible = Math.pow(6, 4);

  const selectedMonster = useMemo((): Monster | null => {
    if (!selectedEntry) return null;
    const parts: { [key: string]: Part | undefined } = {};
    selectedEntry.partIds.forEach(id => {
      const part = getPartById(id);
      if (part) parts[part.type] = part;
    });
    return createMonsterFromParts({
      head: (parts.head as Part) || null,
      torso: (parts.torso as Part) || null,
      legs: (parts.legs as Part) || null,
      tail: (parts.tail as Part) || null,
    });
  }, [selectedEntry]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E1E2E',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 1100,
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
            📖 怪物图鉴
          </h2>
          <div className="pixel-font" style={{ color: '#81D4FA', fontSize: 10 }}>
            {unlockedCount} / {totalPossible}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{
            flex: 1,
            backgroundColor: '#2D2D44',
            borderRadius: 12,
            padding: 20,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }} className="scrollbar">
            {pokedex.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#757575',
                padding: '60px 20px',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: 12,
                lineHeight: 2,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <div>暂无解锁的怪物</div>
                <div style={{ marginTop: 12, fontSize: 10 }}>
                  组装怪兽后将自动收录图鉴
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}>
                {pokedex.sort((a, b) => b.unlockedAt - a.unlockedAt).map(entry => {
                  const parts: { [key: string]: Part | undefined } = {};
                  entry.partIds.forEach(id => {
                    const part = getPartById(id);
                    if (part) parts[part.type] = part;
                  });
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => { playClickSound(); setSelectedEntry(entry); }}
                      style={{
                        width: 120,
                        height: 140,
                        backgroundColor: '#ECEFF1',
                        borderRadius: 8,
                        padding: 8,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: isSelected ? '3px solid #90A4AE' : '3px solid transparent',
                        boxShadow: isSelected ? '0 0 16px rgba(144, 164, 174, 0.5)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.border = '3px solid #90A4AE';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.border = '3px solid transparent';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <MonsterSprite
                        parts={{
                          head: (parts.head as Part) || null,
                          torso: (parts.torso as Part) || null,
                          legs: (parts.legs as Part) || null,
                          tail: (parts.tail as Part) || null,
                        }}
                        size={96}
                      />
                      <div style={{
                        fontSize: 9,
                        color: '#37474F',
                        marginTop: 4,
                        fontFamily: "'Press Start 2P', cursive",
                        textAlign: 'center',
                      }}>
                        {entry.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{
            width: 300,
            backgroundColor: '#2D2D44',
            borderRadius: 12,
            padding: 20,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }} className="scrollbar">
            {selectedMonster ? (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 16,
                  padding: 16,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%)`,
                }}>
                  <MonsterSprite
                    parts={selectedMonster.parts}
                    size={180}
                  />
                </div>

                <h3 className="pixel-font" style={{
                  color: '#FFD54F',
                  fontSize: 12,
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                  {selectedMonster.name}
                </h3>

                <div style={{
                  display: 'grid',
                  gap: 10,
                  marginBottom: 20,
                }}>
                  <StatBar label="❤️ HP" value={selectedMonster.maxHp} max={300} color="#E53935" />
                  <StatBar label="⚔️ ATK" value={selectedMonster.attack} max={80} color="#FF9800" />
                  <StatBar label="⚡ SPD" value={selectedMonster.speed} max={50} color="#00BCD4" />
                </div>

                <div style={{
                  backgroundColor: '#1E1E2E',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}>
                  <div className="pixel-font" style={{
                    color: '#81D4FA',
                    fontSize: 10,
                    marginBottom: 8,
                  }}>
                    战斗力评分
                  </div>
                  <div className="pixel-font" style={{
                    color: '#FFD54F',
                    fontSize: 24,
                    textAlign: 'center',
                  }}>
                    {calculatePower(selectedMonster)}
                  </div>
                </div>

                <div style={{
                  fontSize: 11,
                  color: '#B0BEC5',
                  lineHeight: 2,
                }}>
                  <div><strong style={{ color: '#FFD54F' }}>头部:</strong> {selectedMonster.parts.head?.name}</div>
                  <div><strong style={{ color: '#FFD54F' }}>躯干:</strong> {selectedMonster.parts.torso?.name}</div>
                  <div><strong style={{ color: '#FFD54F' }}>腿部:</strong> {selectedMonster.parts.legs?.name}</div>
                  <div><strong style={{ color: '#FFD54F' }}>尾部:</strong> {selectedMonster.parts.tail?.name}</div>
                </div>
              </div>
            ) : (
              <div style={{
                color: '#757575',
                textAlign: 'center',
                padding: '40px 20px',
                fontSize: 12,
                lineHeight: 2,
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div>点击左侧怪物卡片</div>
                <div>查看详细属性</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        fontSize: 10,
        color: '#B0BEC5',
        fontFamily: "'Press Start 2P', cursive",
      }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{
        height: 10,
        backgroundColor: '#1E1E2E',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}
