import React, { useState } from 'react';
import { useDataStore, MusicianId, Musician } from '../data/DataStore';

export const Register: React.FC = () => {
  const { musicians, setUserName, setCurrentMusician, setCurrentPage } = useDataStore();
  const [name, setName] = useState('');
  const [selectedMusician, setSelectedMusician] = useState<MusicianId | null>(null);
  const [step, setStep] = useState<'name' | 'musician'>('name');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 2) {
      setUserName(name.trim());
      setStep('musician');
    }
  };

  const handleMusicianSelect = (musician: Musician) => {
    setSelectedMusician(musician.id);
  };

  const handleStart = () => {
    if (selectedMusician) {
      setCurrentMusician(selectedMusician);
      setCurrentPage('map');
      window.location.hash = '#map';
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const getBackgroundStyle = (musician: Musician) => {
    const patterns: Record<MusicianId, string> = {
      galaxy: 'radial-gradient(circle at 20% 30%, rgba(179, 136, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(100, 181, 246, 0.3) 0%, transparent 50%)',
      jazzCat: 'repeating-linear-gradient(45deg, rgba(191, 54, 12, 0.1) 0px, rgba(191, 54, 12, 0.1) 10px, transparent 10px, transparent 20px)',
      electronicRain: 'linear-gradient(135deg, rgba(13, 71, 161, 0.2) 0%, rgba(0, 229, 255, 0.1) 100%)',
      mountainWind: 'linear-gradient(180deg, rgba(139, 195, 74, 0.1) 0%, rgba(51, 105, 30, 0.2) 100%)',
      lonelyStar: 'radial-gradient(circle at 50% 20%, rgba(100, 181, 246, 0.2) 0%, transparent 60%)'
    };
    return {
      background: `${musician.wallColor}`,
      backgroundImage: patterns[musician.id]
    };
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1 className="app-title">🎵 音符秘境</h1>
          <p className="app-subtitle">探索独立音乐人的工作室，解锁隐藏曲目</p>
        </div>

        {step === 'name' ? (
          <form onSubmit={handleNameSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="username">请输入你的昵称</label>
              <input
                id="username"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="至少2个字符"
                maxLength={20}
                className="form-input"
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={name.trim().length < 2}
              className="btn btn-primary"
            >
              下一步 →
            </button>
          </form>
        ) : (
          <div className="musician-selection">
            <h2 className="selection-title">选择你的初始导师</h2>
            <p className="selection-subtitle">每位音乐人都有独特的工作室风格和隐藏曲目</p>
            
            <div className="musician-grid">
              {musicians.map(musician => (
                <div
                  key={musician.id}
                  className={`musician-card ${selectedMusician === musician.id ? 'selected' : ''}`}
                  onClick={() => handleMusicianSelect(musician)}
                  style={getBackgroundStyle(musician)}
                >
                  <div className="musician-avatar" style={{ borderColor: musician.accentColor }}>
                    {musician.id === 'galaxy' && '🌌'}
                    {musician.id === 'jazzCat' && '🐱'}
                    {musician.id === 'electronicRain' && '🌧️'}
                    {musician.id === 'mountainWind' && '🏔️'}
                    {musician.id === 'lonelyStar' && '⭐'}
                  </div>
                  <h3 className="musician-name" style={{ color: musician.accentColor }}>
                    {musician.name}
                  </h3>
                  <p className="musician-style">{musician.style}</p>
                  <p className="musician-desc">{musician.description}</p>
                  {selectedMusician === musician.id && (
                    <div className="selected-indicator">✓ 已选择</div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={!selectedMusician}
              className="btn btn-primary btn-large"
            >
              开始探险 🚀
            </button>
          </div>
        )}
      </div>

      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #121212 0%, #1E1E2E 100%);
          padding: 20px;
        }

        .register-container {
          width: 100%;
          max-width: 900px;
          text-align: center;
        }

        .register-header {
          margin-bottom: 40px;
        }

        .app-title {
          font-size: 48px;
          color: #FFD54F;
          margin: 0 0 16px 0;
          text-shadow: 0 0 20px rgba(255, 213, 79, 0.5);
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from { text-shadow: 0 0 20px rgba(255, 213, 79, 0.5); }
          to { text-shadow: 0 0 30px rgba(255, 213, 79, 0.8), 0 0 40px rgba(255, 213, 79, 0.4); }
        }

        .app-subtitle {
          font-size: 18px;
          color: #9E9E9E;
          margin: 0;
        }

        .register-form {
          max-width: 400px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          color: #E0E0E0;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 14px 18px;
          background: #263238;
          border: 2px solid #37474F;
          border-radius: 8px;
          color: #E0E0E0;
          font-size: 16px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #FFD54F;
          box-shadow: 0 0 0 3px rgba(255, 213, 79, 0.2);
        }

        .form-input::placeholder {
          color: #607D8B;
        }

        .btn {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .btn-primary {
          background: linear-gradient(135deg, #FFD54F 0%, #FFB300 100%);
          color: #121212;
        }

        .btn-primary:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(255, 213, 79, 0.4);
        }

        .btn-primary:disabled {
          background: #455A64;
          color: #78909C;
          cursor: not-allowed;
        }

        .btn-large {
          padding: 16px 48px;
          font-size: 18px;
          margin-top: 32px;
        }

        .selection-title {
          color: #E0E0E0;
          font-size: 28px;
          margin: 0 0 8px 0;
        }

        .selection-subtitle {
          color: #9E9E9E;
          font-size: 16px;
          margin: 0 0 32px 0;
        }

        .musician-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .musician-card {
          padding: 24px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease-out;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .musician-card:hover {
          transform: translateY(-4px) scale(1.02);
        }

        .musician-card.selected {
          border-color: #FFD54F;
          box-shadow: 0 0 20px rgba(255, 213, 79, 0.4);
        }

        .musician-avatar {
          width: 64px;
          height: 64px;
          margin: 0 auto 12px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background: rgba(0, 0, 0, 0.3);
          border: 3px solid;
        }

        .musician-name {
          font-size: 18px;
          margin: 0 0 8px 0;
        }

        .musician-style {
          color: #BDBDBD;
          font-size: 13px;
          margin: 0 0 8px 0;
        }

        .musician-desc {
          color: #9E9E9E;
          font-size: 12px;
          margin: 0;
          line-height: 1.4;
        }

        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          background: #FFD54F;
          color: #121212;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .app-title {
            font-size: 32px;
          }

          .app-subtitle {
            font-size: 14px;
          }

          .musician-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .musician-card {
            padding: 16px 12px;
          }

          .musician-avatar {
            width: 48px;
            height: 48px;
            font-size: 24px;
          }

          .musician-name {
            font-size: 16px;
          }

          .musician-desc {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
