import { PageType } from '../App';
import { playClickSound } from '../utils/audio';

interface MenuScreenProps {
  onNavigate: (page: PageType) => void;
}

export default function MenuScreen({ onNavigate }: MenuScreenProps) {
  const handleClick = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1E1E2E',
      padding: 20,
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              backgroundColor: i % 2 === 0 ? '#FFD54F' : '#81D4FA',
              opacity: 0.3,
              borderRadius: 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div style={{
        position: 'relative',
        textAlign: 'center',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 8,
          letterSpacing: 4,
        }}>
          🐉 ⚔️ 🐲
        </div>

        <h1
          className="pixel-font"
          style={{
            fontSize: 32,
            color: '#FFD54F',
            marginBottom: 12,
            textShadow: '3px 3px 0 #E65100, 6px 6px 0 rgba(0,0,0,0.3)',
            lineHeight: 1.6,
          }}
        >
          像素怪兽对战
        </h1>
        <p
          className="pixel-font"
          style={{
            fontSize: 10,
            color: '#81D4FA',
            marginBottom: 60,
            letterSpacing: 2,
          }}
        >
          MONSTER PIXEL BATTLE
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 280,
          margin: '0 auto',
        }}>
          <button
            className="btn-pixel"
            onClick={() => handleClick('assemble')}
            style={{ fontSize: 14, padding: '16px 24px' }}
          >
            🎮 开始游戏
          </button>
          <button
            className="btn-pixel"
            onClick={() => handleClick('pokedex')}
            style={{ fontSize: 14, padding: '16px 24px' }}
          >
            📖 怪物图鉴
          </button>
          <button
            className="btn-pixel"
            onClick={() => handleClick('history')}
            style={{ fontSize: 14, padding: '16px 24px' }}
          >
            📜 战斗历史
          </button>
        </div>

        <p style={{
          marginTop: 60,
          color: '#757575',
          fontSize: 12,
          fontFamily: "'Press Start 2P', cursive",
        }}>
          组装 · 合成 · 对战
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
