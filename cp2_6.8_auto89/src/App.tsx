import { useState, useEffect, useRef, useCallback } from 'react';
import type { Board, User, Action, WSMessage } from './Types';
import EntryPage from './components/EntryPage';
import TopBar from './components/TopBar';
import HistoryPanel from './components/HistoryPanel';
import BoardView from './components/Board';

export default function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<Action[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selfUserId, setSelfUserId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    wsRef.current = socket;
    setWs(socket);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (event) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(msg);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'JOINED':
        setRoomCode(msg.payload.roomCode);
        setBoard(msg.payload.board);
        setUsers(msg.payload.users);
        setHistory(msg.payload.history);
        setSelfUserId(msg.payload.selfUserId);
        setError('');
        break;
      case 'USER_JOINED':
      case 'USER_LEFT':
        setUsers(msg.payload.users);
        break;
      case 'STATE_UPDATED':
        setBoard(msg.payload.board);
        if (msg.payload.action) {
          setHistory((prev) => {
            const next = [...prev, msg.payload.action];
            return next.slice(-50);
          });
        }
        break;
      case 'ROLLBACKED':
        setBoard(msg.payload.board);
        setHistory(msg.payload.history);
        break;
      case 'ERROR':
        setError(msg.payload.message);
        break;
    }
  }, []);

  const sendMessage = useCallback((type: string, payload?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const handleCreateBoard = (nickname: string) => {
    sendMessage('CREATE_BOARD', { nickname });
  };

  const handleJoinBoard = (roomCode: string, nickname: string) => {
    sendMessage('JOIN_BOARD', { roomCode, nickname });
  };

  const handleAddCard = (listId: string, title: string, content: string) => {
    sendMessage('ADD_CARD', { listId, title, content });
  };

  const handleMoveCard = (
    cardId: string,
    fromListId: string,
    toListId: string,
    toIndex: number
  ) => {
    sendMessage('MOVE_CARD', { cardId, fromListId, toListId, toIndex });
  };

  const handleRollback = (actionIndex: number) => {
    sendMessage('ROLLBACK', { actionIndex });
  };

  const handleExit = () => {
    setBoard(null);
    setUsers([]);
    setHistory([]);
    setRoomCode('');
    setError('');
    if (wsRef.current) {
      wsRef.current.close();
      const socket = new WebSocket('ws://localhost:3001');
      wsRef.current = socket;
      setWs(socket);
      socket.onopen = () => setConnected(true);
      socket.onclose = () => setConnected(false);
      socket.onerror = () => setConnected(false);
      socket.onmessage = (event) => {
        let msg: WSMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        handleMessage(msg);
      };
    }
  };

  const toggleHistory = () => setHistoryOpen((prev) => !prev);
  const closeHistory = () => setHistoryOpen(false);

  if (!board) {
    return (
      <EntryPage
        connected={connected}
        error={error}
        onCreate={handleCreateBoard}
        onJoin={handleJoinBoard}
      />
    );
  }

  return (
    <div className="main-layout">
      <TopBar
        roomCode={roomCode}
        users={users}
        selfUserId={selfUserId}
        onExit={handleExit}
        onToggleHistory={toggleHistory}
      />
      <div className="content-area">
        <HistoryPanel
          history={history}
          onRollback={handleRollback}
          isOpen={historyOpen}
          onClose={closeHistory}
        />
        <BoardView
          board={board}
          onAddCard={handleAddCard}
          onMoveCard={handleMoveCard}
        />
      </div>
    </div>
  );
}
