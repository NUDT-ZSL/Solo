import { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from './components/Board';
import { useSocket } from './hooks/useSocket';
import { Card, CardStatus, User } from './types';

function App() {
  const {
    isConnected,
    currentUser,
    onlineUsers,
    onEvent,
    onBatchUpdates,
    requestInitialCards,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useSocket();

  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cardsRef = useRef<Card[]>([]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    let mounted = true;

    const loadInitialCards = async () => {
      if (!isConnected) return;
      setIsLoading(true);
      const initialCards = await requestInitialCards();
      if (mounted) {
        setCards(initialCards);
        cardsRef.current = initialCards;
        setIsLoading(false);
      }
    };

    loadInitialCards();

    return () => {
      mounted = false;
    };
  }, [isConnected, requestInitialCards]);

  const processBatchUpdate = useCallback((updates: { type: string; data: unknown }[]) => {
    setCards((prevCards) => {
      let result = [...prevCards];

      for (const update of updates) {
        const { type, data } = update;

        switch (type) {
          case 'card:added': {
            const newCard = data as Card;
            const exists = result.find((c) => c.id === newCard.id);
            if (!exists) {
              const statusCards = result.filter((c) => c.status === newCard.status);
              newCard.order = statusCards.length;
              result.push(newCard);
            }
            break;
          }

          case 'card:updated': {
            const updated = data as Partial<Card> & { id: string };
            result = result.map((c) =>
              c.id === updated.id ? { ...c, ...updated, updatedAt: Date.now() } : c
            );
            break;
          }

          case 'card:deleted': {
            const { id } = data as { id: string };
            result = result.filter((c) => c.id !== id);
            break;
          }

          case 'card:moved': {
            const moveData = data as {
              id: string;
              newStatus: CardStatus;
              newOrder: number;
              updatedCards?: Card[];
            };

            if (moveData.updatedCards && moveData.updatedCards.length > 0) {
              const updateMap = new Map<string, Card>();
              for (const c of moveData.updatedCards) {
                updateMap.set(c.id, c);
              }
              result = result.map((c) => {
                const updated = updateMap.get(c.id);
                return updated ? { ...c, ...updated } : c;
              });

              for (const c of moveData.updatedCards) {
                if (!result.find((rc) => rc.id === c.id)) {
                  result.push(c);
                }
              }
              break;
            }

            const { id, newStatus, newOrder } = moveData;
            const cardToMove = result.find((c) => c.id === id);
            if (!cardToMove) break;

            const oldStatus = cardToMove.status;
            const isSameColumn = oldStatus === newStatus;

            const targetCards = result
              .filter((c) => c.status === newStatus && c.id !== id)
              .sort((a, b) => a.order - b.order);

            const movedIndex = Math.min(
              Math.max(0, newOrder),
              targetCards.length
            );
            targetCards.splice(movedIndex, 0, { ...cardToMove, status: newStatus });
            targetCards.forEach((c, idx) => {
              c.order = idx;
            });

            let newCards: Card[];

            if (isSameColumn) {
              newCards = result.filter((c) => c.status !== newStatus);
              newCards = [...newCards, ...targetCards];
            } else {
              const sourceCards = result
                .filter((c) => c.status === oldStatus && c.id !== id)
                .sort((a, b) => a.order - b.order);
              sourceCards.forEach((c, idx) => {
                c.order = idx;
              });

              newCards = result.filter(
                (c) => c.status !== oldStatus && c.status !== newStatus
              );
              newCards = [...newCards, ...sourceCards, ...targetCards];
            }

            result = newCards;
            break;
          }
        }
      }

      cardsRef.current = result;
      return result;
    });
  }, []);

  useEffect(() => {
    const unsubBatch = onBatchUpdates(processBatchUpdate);

    const unsub1 = onEvent<Card>('card:added', (newCard) => {
      processBatchUpdate([{ type: 'card:added', data: newCard }]);
    });

    const unsub2 = onEvent<Partial<Card> & { id: string }>('card:updated', (updated) => {
      processBatchUpdate([{ type: 'card:updated', data: updated }]);
    });

    const unsub3 = onEvent<{ id: string }>('card:deleted', ({ id }) => {
      processBatchUpdate([{ type: 'card:deleted', data: { id } }]);
    });

    const unsub4 = onEvent<{
      id: string;
      newStatus: CardStatus;
      newOrder: number;
      updatedCards?: Card[];
    }>('card:moved', (moveData) => {
      processBatchUpdate([{ type: 'card:moved', data: moveData }]);
    });

    return () => {
      unsubBatch?.();
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
    };
  }, [onEvent, onBatchUpdates, processBatchUpdate]);

  const handleAddCard = useCallback(
    (card: {
      title: string;
      description: string;
      priority: Card['priority'];
      status: CardStatus;
      createdBy: string;
      creatorColor: string;
    }) => {
      addCard(card);
    },
    [addCard]
  );

  const handleUpdateCard = useCallback(
    (card: Partial<Card> & { id: string }) => {
      updateCard(card);
    },
    [updateCard]
  );

  const handleDeleteCard = useCallback(
    (id: string) => {
      deleteCard(id);
    },
    [deleteCard]
  );

  const handleMoveCard = useCallback(
    (data: { id: string; newStatus: CardStatus; newOrder: number }) => {
      const { id, newStatus, newOrder } = data;

      setCards((prevCards) => {
        const cardToMove = prevCards.find((c) => c.id === id);
        if (!cardToMove) return prevCards;

        const oldStatus = cardToMove.status;
        const isSameColumn = oldStatus === newStatus;

        const targetCards = prevCards
          .filter((c) => c.status === newStatus && c.id !== id)
          .sort((a, b) => a.order - b.order);

        const movedIndex = Math.min(
          Math.max(0, newOrder),
          targetCards.length
        );
        const movedCard = { ...cardToMove, status: newStatus };
        targetCards.splice(movedIndex, 0, movedCard);
        targetCards.forEach((c, idx) => {
          c.order = idx;
        });

        let newCards: Card[];

        if (isSameColumn) {
          newCards = prevCards.filter((c) => c.status !== newStatus);
          newCards = [...newCards, ...targetCards];
        } else {
          const sourceCards = prevCards
            .filter((c) => c.status === oldStatus && c.id !== id)
            .sort((a, b) => a.order - b.order);
          sourceCards.forEach((c, idx) => {
            c.order = idx;
          });

          newCards = prevCards.filter(
            (c) => c.status !== oldStatus && c.status !== newStatus
          );
          newCards = [...newCards, ...sourceCards, ...targetCards];
        }

        cardsRef.current = newCards;
        return newCards;
      });

      moveCard(data);
    },
    [moveCard]
  );

  const totalCards = cards.length;
  const todoCount = cards.filter((c) => c.status === 'todo').length;
  const inProgressCount = cards.filter((c) => c.status === 'in-progress').length;
  const doneCount = cards.filter((c) => c.status === 'done').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="title-icon">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            需求看板
          </h1>
          <div className="stats-bar">
            <span className="stat-item">
              <span className="stat-label">总计</span>
              <span className="stat-value">{totalCards}</span>
            </span>
            <span className="stat-item stat-todo">
              <span className="stat-label">待办</span>
              <span className="stat-value">{todoCount}</span>
            </span>
            <span className="stat-item stat-progress">
              <span className="stat-label">进行中</span>
              <span className="stat-value">{inProgressCount}</span>
            </span>
            <span className="stat-item stat-done">
              <span className="stat-label">已完成</span>
              <span className="stat-value">{doneCount}</span>
            </span>
          </div>
        </div>

        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {isConnected ? '已连接' : '连接中...'}
          </div>

          <div className="online-users">
            <span className="online-label">在线 ({onlineUsers.length})</span>
            <div className="user-avatars">
              {onlineUsers.map((user: User, idx: number) => (
                <div
                  key={user.id}
                  className="user-avatar"
                  style={{
                    backgroundColor: user.color,
                    zIndex: onlineUsers.length - idx,
                  }}
                  title={`${user.name}${user.id === currentUser?.id ? ' (你)' : ''}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {currentUser && (
            <div className="current-user">
              <div
                className="current-user-avatar"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="current-user-info">
                <span className="current-user-name">{currentUser.name}</span>
                <span className="current-user-tag">你</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>正在加载看板数据...</p>
          </div>
        ) : (
          <Board
            cards={cards}
            currentUserId={currentUser?.id ?? null}
            userColor={currentUser?.color ?? null}
            userName={currentUser?.name ?? null}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onMoveCard={handleMoveCard}
          />
        )}
      </main>
    </div>
  );
}

export default App;
