import { useState } from 'react';
import { WorldManager } from '../game/WorldManager';
import { PlayerController } from '../game/PlayerController';
import { GameEngine } from '../game/GameEngine';

interface WorldControlsProps {
  world: WorldManager;
  player: PlayerController;
  engine: GameEngine | null;
  currentWorldId: string | null;
  onWorldIdChange: (id: string | null) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export default function WorldControls({
  world,
  player,
  engine,
  currentWorldId,
  onWorldIdChange,
  onShowToast,
}: WorldControlsProps) {
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadId, setLoadId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const worldData = world.serialize();
      
      let response;
      if (currentWorldId) {
        response = await fetch(`/world/${currentWorldId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'PixelRealm World',
            ...worldData,
          }),
        });
      } else {
        response = await fetch('/world', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'PixelRealm World',
            ...worldData,
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save world');
      }

      const data = await response.json();
      if (data.id) {
        onWorldIdChange(data.id);
        onShowToast(`世界已保存! ID: ${data.id}`, 'success');
      } else {
        onShowToast('世界已更新!', 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      onShowToast('保存失败，请检查服务器是否运行', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!loadId.trim()) {
      onShowToast('请输入世界ID', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/world/${loadId.trim()}`);
      
      if (!response.ok) {
        throw new Error('World not found');
      }

      const data = await response.json();
      
      world.deserialize({
        width: data.width,
        height: data.height,
        blocks: data.blocks,
        playerStart: data.playerStart,
      });
      
      player.resetPosition();
      
      if (engine) {
        engine.requestFullRedraw();
      }
      
      onWorldIdChange(data.id);
      setShowLoadModal(false);
      setLoadId('');
      onShowToast(`世界已加载: ${data.name || 'Unnamed World'}`, 'success');
    } catch (error) {
      console.error('Load error:', error);
      onShowToast('加载失败，请检查ID是否正确', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNew = () => {
    world.clear();
    player.resetPosition();
    onWorldIdChange(null);
    
    if (engine) {
      engine.requestFullRedraw();
    }
    
    onShowToast('新世界已创建', 'success');
  };

  const buttonStyle = {
    borderRadius: '8px',
    padding: '10px 18px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '12px',
          zIndex: 100,
        }}
      >
        <button
          onClick={handleNew}
          disabled={isLoading}
          style={{
            ...buttonStyle,
            background: '#6b7280',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4b5563';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#6b7280';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          新建世界
        </button>
        <button
          onClick={() => setShowLoadModal(true)}
          disabled={isLoading}
          style={{
            ...buttonStyle,
            background: '#10b981',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          加载世界
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            ...buttonStyle,
            background: currentWorldId ? '#f59e0b' : '#3b82f6',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = currentWorldId ? '#d97706' : '#2563eb';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = currentWorldId ? '#f59e0b' : '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isLoading ? '保存中...' : currentWorldId ? '更新世界' : '保存世界'}
        </button>
      </div>

      {currentWorldId && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '8px 16px',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
          }}
        >
          ID: <span style={{ fontFamily: 'monospace' }}>{currentWorldId}</span>
        </div>
      )}

      {showLoadModal && (
        <div
          onClick={() => setShowLoadModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(30, 30, 46, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              width: '360px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                margin: '0 0 16px 0',
                fontSize: '20px',
                fontWeight: 600,
              }}
            >
              加载世界
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0 0 20px 0',
                fontSize: '14px',
              }}
            >
              请输入要加载的世界ID
            </p>
            <input
              type="text"
              value={loadId}
              onChange={(e) => setLoadId(e.target.value)}
              placeholder="输入世界ID..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLoad();
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '20px',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowLoadModal(false)}
                style={{
                  ...buttonStyle,
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleLoad}
                disabled={isLoading || !loadId.trim()}
                style={{
                  ...buttonStyle,
                  opacity: isLoading || !loadId.trim() ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && loadId.trim()) {
                    e.currentTarget.style.background = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isLoading ? '加载中...' : '加载'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
