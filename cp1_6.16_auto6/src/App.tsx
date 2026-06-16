import React, { useState, useEffect, useCallback } from 'react';
import type { Card, Deck, BattleState, BattleRecord, NavigationView } from './types';
import CardDeckManager from './components/CardDeckManager';
import BattleArena from './components/BattleArena';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavigationView>('deck');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [battleRecords, setBattleRecords] = useState<BattleRecord[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [aiDeck, setAiDeck] = useState<Deck | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsRes, decksRes, battlesRes, aiDeckRes] = await Promise.all([
          fetch('/api/cards'),
          fetch('/api/decks'),
          fetch('/api/battles'),
          fetch('/api/decks/ai')
        ]);
        
        const cardsData = await cardsRes.json();
        const decksData = await decksRes.json();
        const battlesData = await battlesRes.json();
        const aiDeckData = await aiDeckRes.json();
        
        setCards(cardsData);
        setBattleRecords(battlesData);
        setAiDeck(aiDeckData);
        
        if (decksData.length > 0) {
          setPlayerDeck(decksData[0]);
          setSelectedCardIds(decksData[0].cardIds);
        }
      } catch (err) {
        console.error('加载数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  const handleCardSelect = (cardId: string) => {
    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      if (prev.length >= 10) {
        showMessage('最多只能选择10张卡牌');
        return prev;
      }
      return [...prev, cardId];
    });
  };

  const handleSaveDeck = async () => {
    if (selectedCardIds.length === 0) {
      showMessage('请至少选择一张卡牌');
      return;
    }
    
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: selectedCardIds, name: '我的卡组' })
      });
      
      const deck = await res.json();
      setPlayerDeck(deck);
      showMessage('卡组保存成功！');
    } catch (err) {
      showMessage('保存卡组失败');
    }
  };

  const handleBattleStateChange = useCallback((newState: BattleState) => {
    setBattleState(newState);
  }, []);

  const handleBattleEnd = useCallback(async (finalState: BattleState) => {
    if (!playerDeck || !aiDeck || !finalState.winner) return;
    
    const recordData = {
      playerDeckId: playerDeck.id,
      aiDeckId: aiDeck.id,
      winner: finalState.winner,
      turns: finalState.turn,
      logs: finalState.logs
    };
    
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      
      const newRecord = await res.json();
      setBattleRecords(prev => [newRecord, ...prev]);
      showMessage(finalState.winner === 'player' ? '胜利！' : '失败...');
    } catch (err) {
      console.error('保存对战记录失败:', err);
    }
  }, [playerDeck, aiDeck, showMessage]);

  const startBattle = () => {
    if (!playerDeck) {
      showMessage('请先保存卡组');
      return;
    }
    if (!aiDeck) {
      showMessage('AI卡组未加载');
      return;
    }
    setCurrentView('battle');
  };

  const toggleRecordExpand = (recordId: string) => {
    setExpandedRecordId(prev => prev === recordId ? null : recordId);
  };

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#1A1A2E',
        color: '#E94560',
        fontSize: '24px'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#1A1A2E'
    }}>
      <header style={{
        height: '60px',
        background: '#16213E',
        borderBottom: '2px solid #0F3460',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <h1 style={{ color: '#E94560', fontSize: '24px', margin: 0, letterSpacing: '2px' }}>
          ⚔️ 暗影卡牌对战
        </h1>
        <nav style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setCurrentView('deck')}
            style={{
              padding: '8px 20px',
              background: currentView === 'deck' ? '#E94560' : '#0F3460',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentView !== 'deck') {
                e.currentTarget.style.background = '#E94560';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== 'deck') {
                e.currentTarget.style.background = '#0F3460';
              }
            }}
          >
            📚 卡组管理
          </button>
          <button
            onClick={startBattle}
            disabled={!playerDeck}
            style={{
              padding: '8px 20px',
              background: currentView === 'battle' ? '#E94560' : '#0F3460',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: playerDeck ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600,
              opacity: playerDeck ? 1 : 0.5,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentView !== 'battle' && playerDeck) {
                e.currentTarget.style.background = '#E94560';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== 'battle') {
                e.currentTarget.style.background = '#0F3460';
              }
            }}
          >
            ⚔️ 开始对战
          </button>
          <button
            onClick={() => setCurrentView('history')}
            style={{
              padding: '8px 20px',
              background: currentView === 'history' ? '#E94560' : '#0F3460',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentView !== 'history') {
                e.currentTarget.style.background = '#E94560';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== 'history') {
                e.currentTarget.style.background = '#0F3460';
              }
            }}
          >
            📜 对战历史
          </button>
        </nav>
      </header>

      {message && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#16213E',
          color: '#E94560',
          padding: '12px 24px',
          borderRadius: '8px',
          border: '2px solid #E94560',
          zIndex: 1000,
          fontWeight: 600,
          animation: 'slideDown 0.3s ease'
        }}>
          {message}
        </div>
      )}

      <main style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {currentView === 'deck' && (
          <CardDeckManager
            cards={cards}
            selectedCardIds={selectedCardIds}
            onCardSelect={handleCardSelect}
            onSaveDeck={handleSaveDeck}
          />
        )}
        
        {currentView === 'battle' && playerDeck && aiDeck && (
          <BattleArena
            allCards={cards}
            playerDeck={playerDeck}
            aiDeck={aiDeck}
            battleState={battleState}
            onBattleStateChange={handleBattleStateChange}
            onBattleEnd={handleBattleEnd}
            onBack={() => setCurrentView('deck')}
          />
        )}
        
        {currentView === 'history' && (
          <div style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto'
          }}>
            <h2 style={{ color: '#E94560', marginBottom: '20px', fontSize: '28px' }}>
              📜 对战历史
            </h2>
            {battleRecords.length === 0 ? (
              <p style={{ color: '#888', fontSize: '18px' }}>暂无对战记录</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {battleRecords.map(record => (
                  <div
                    key={record.id}
                    style={{
                      background: record.winner === 'player' ? '#98FB98' : '#FFB6C1',
                      padding: '16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      border: '2px solid #0F3460'
                    }}
                    onClick={() => toggleRecordExpand(record.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: '#1A1A2E',
                        fontSize: '16px'
                      }}>
                        {record.winner === 'player' ? '🏆 胜利' : '💀 失败'}
                      </span>
                      <span style={{ color: '#333', fontSize: '14px' }}>
                        回合数: {record.turns}
                      </span>
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        {new Date(record.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    {expandedRecordId === record.id && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '6px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {record.logs.map((log, idx) => (
                          <div key={idx} style={{
                            padding: '4px 8px',
                            fontSize: '13px',
                            color: '#333',
                            borderBottom: '1px solid rgba(0,0,0,0.1)'
                          }}>
                            <span style={{ fontWeight: 600, color: log.actor === 'player' ? '#1565C0' : '#C62828' }}>
                              回合{log.turn} [{log.actor === 'player' ? '玩家' : 'AI'}]
                            </span>
                            {' - '}
                            <span style={{ fontWeight: 600 }}>{log.action}</span>
                            {' - '}
                            {log.details}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (max-width: 768px) {
          header {
            flex-direction: column !important;
            height: auto !important;
            padding: 12px !important;
            gap: 12px;
          }
          nav {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
