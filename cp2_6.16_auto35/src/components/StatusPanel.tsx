import { GameState, GamePhase, Equipment } from '../game/types';

interface StatusPanelProps {
  gameState: GameState;
}

function EquipmentBadge({ item }: { item: Equipment }) {
  let icon = '⚔';
  let color = '#ffaa00';
  switch (item.type) {
    case 'attack':
      icon = '⚔';
      color = '#ffaa44';
      break;
    case 'heal':
      icon = '♥';
      color = '#ff6666';
      break;
    case 'defense':
      icon = '🛡';
      color = '#66aaff';
      break;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '6px',
        transition: 'background 0.15s ease',
      }}
    >
      <span
        style={{
          fontSize: '16px',
          color,
          width: '20px',
          textAlign: 'center',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#e0e0e0',
          fontFamily: 'Roboto Mono, monospace',
        }}
      >
        {item.displayName}
      </span>
    </div>
  );
}

export function StatusPanel({ gameState }: StatusPanelProps) {
  const { player, floor, inventory, phase, monsters } = gameState;

  const hpPercent = (player.hp / player.maxHp) * 100;
  const atkReference = 20;
  const atkPercent = Math.min(100, (player.attack / atkReference) * 100);

  const boss = monsters.find((m) => m.isBoss);

  return (
    <div
      style={{
        width: '250px',
        height: '100%',
        background: '#16213e',
        borderRadius: '12px',
        padding: '20px 18px',
        color: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow:
          '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#c9a66b',
            textAlign: 'center',
            marginBottom: '4px',
            letterSpacing: '2px',
            textShadow: '0 0 12px rgba(201, 166, 107, 0.3)',
          }}
        >
          暗影回廊
        </h2>
        <p
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '11px',
            color: 'rgba(224, 224, 224, 0.5)',
            textAlign: 'center',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          Shadow Corridor
        </p>
      </div>

      <div
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(201, 166, 107, 0.3), transparent)',
        }}
      />

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '12px',
              color: 'rgba(224, 224, 224, 0.7)',
              letterSpacing: '1px',
            }}
          >
            楼层
          </span>
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '15px',
              fontWeight: 600,
              color: phase === GamePhase.BOSS ? '#ff6666' : '#c9a66b',
            }}
          >
            {phase === GamePhase.BOSS ? 'BOSS层' : `${floor}F`}
          </span>
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '12px',
              color: 'rgba(224, 224, 224, 0.7)',
              letterSpacing: '1px',
            }}
          >
            生命值
          </span>
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ff6b6b',
            }}
          >
            {player.hp} / {player.maxHp}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '14px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '7px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${hpPercent}%`,
              background:
                'linear-gradient(180deg, #ff6b6b 0%, #c92a2a 100%)',
              borderRadius: '6px',
              transition: 'width 0.25s ease-in-out',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          />
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '12px',
              color: 'rgba(224, 224, 224, 0.7)',
              letterSpacing: '1px',
            }}
          >
            攻击力
          </span>
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffd43b',
            }}
          >
            {player.attack}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '10px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '5px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${atkPercent}%`,
              background:
                'linear-gradient(180deg, #ffd43b 0%, #fab005 100%)',
              borderRadius: '4px',
              transition: 'width 0.25s ease-in-out',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          />
        </div>
      </div>

      {player.defense > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(102, 170, 255, 0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 170, 255, 0.2)',
          }}
        >
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '12px',
              color: 'rgba(224, 224, 224, 0.7)',
              letterSpacing: '1px',
            }}
          >
            🛡 防御力
          </span>
          <span
            style={{
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '14px',
              fontWeight: 600,
              color: '#66aaff',
            }}
          >
            +{player.defense}
          </span>
        </div>
      )}

      {boss && boss.hp > 0 && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(139, 0, 0, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(139, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '12px',
                color: '#ff6666',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              ⚠ BOSS
            </span>
            <span
              style={{
                fontFamily: 'Roboto Mono, monospace',
                fontSize: '12px',
                fontWeight: 600,
                color: '#ff9999',
              }}
            >
              {boss.hp} / {boss.maxHp}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '10px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid rgba(255,100,100,0.3)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(boss.hp / boss.maxHp) * 100}%`,
                background:
                  'linear-gradient(180deg, #ff4444 0%, #8b0000 100%)',
                borderRadius: '4px',
                transition: 'width 0.25s ease-in-out',
                boxShadow: '0 0 8px rgba(255, 0, 0, 0.5)',
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(201, 166, 107, 0.3), transparent)',
        }}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <h3
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(224, 224, 224, 0.85)',
            marginBottom: '10px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🎒</span>
          装备栏
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'Roboto Mono, monospace',
              fontSize: '11px',
              color: 'rgba(224, 224, 224, 0.4)',
            }}
          >
            {inventory.length}/3
          </span>
        </h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {inventory.length === 0 ? (
            <p
              style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 224, 0.3)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '16px 0',
              }}
            >
              尚未拾取任何装备
            </p>
          ) : (
            inventory.map((item) => (
              <EquipmentBadge key={item.id} item={item} />
            ))
          )}
        </div>
      </div>

      <div
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(201, 166, 107, 0.3), transparent)',
        }}
      />

      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <h4
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '11px',
            color: 'rgba(224, 224, 224, 0.5)',
            marginBottom: '6px',
            letterSpacing: '1px',
          }}
        >
          操作说明
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 10px',
            fontSize: '11px',
            color: 'rgba(224, 224, 224, 0.6)',
            fontFamily: 'Roboto Mono, monospace',
          }}
        >
          <span
            style={{
              color: '#c9a66b',
              fontWeight: 600,
            }}
          >
            W/A/S/D
          </span>
          <span>移动 / 攻击</span>
          <span
            style={{
              color: '#c9a66b',
              fontWeight: 600,
            }}
          >
            ↑←↓→
          </span>
          <span>移动 / 攻击</span>
          <span
            style={{
              color: '#c9a66b',
              fontWeight: 600,
            }}
          >
            R
          </span>
          <span>重新开始</span>
        </div>
      </div>
    </div>
  );
}
