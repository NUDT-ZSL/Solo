import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus } from './event-bus';
import { parseEngine } from './parse-engine';
import { worldState, initializeGame, GameState, Item } from './world-state';

interface LogEntry {
  text: string;
  type: 'system' | 'user' | 'response' | 'error';
  id: number;
}

function App() {
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((text: string, type: LogEntry['type']) => {
    logIdRef.current += 1;
    const entry: LogEntry = { text, type, id: logIdRef.current };
    setGameLog(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    const intro = initializeGame();
    addLog(intro, 'system');
    setGameState(worldState.getState());

    const handleStateChange = (state: GameState) => {
      setGameState(state);
    };

    eventBus.on('state:change', handleStateChange);

    return () => {
      eventBus.off('state:change', handleStateChange);
    };
  }, [addLog]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameLog]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [panelOpen]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userInput = input.trim();
    addLog(`> ${userInput}`, 'user');
    setInput('');

    const parsed = parseEngine.parse(userInput);

    if (parsed.error) {
      addLog(parsed.error, 'error');
      return;
    }

    let response = '';

    switch (parsed.verb) {
      case 'north':
      case 'south':
      case 'east':
      case 'west':
        response = worldState.movePlayer(parsed.verb);
        break;
      case 'go':
        if (parsed.noun && ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'].includes(parsed.noun)) {
          response = worldState.movePlayer(parsed.noun);
        } else {
          response = 'Go where? Try north, south, east, or west.';
        }
        break;
      case 'look':
        response = worldState.lookAround();
        break;
      case 'take':
        response = worldState.takeItem(parsed.noun);
        break;
      case 'drop':
        response = worldState.dropItem(parsed.noun);
        break;
      case 'use':
        response = worldState.useItem(parsed.noun, parsed.target);
        break;
      case 'examine':
        response = worldState.examineItem(parsed.noun);
        break;
      case 'inventory':
        response = worldState.showInventory();
        break;
      case 'help':
        response = worldState.showHelp();
        break;
      case 'open':
        response = worldState.useItem(parsed.noun, parsed.target);
        break;
      default:
        response = "I'm not sure what you mean.";
    }

    addLog(response, 'response');
  }, [input, addLog]);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getItemName = (itemId: string): string => {
    if (!gameState) return itemId;
    const item = gameState.items.find(i => i.id === itemId);
    return item?.name || itemId;
  };

  const currentRoom = gameState?.rooms.find(r => r.id === gameState.currentRoom);
  const roomItems = currentRoom ? worldState.getRoomItems(currentRoom.id) : [];
  const visitedCount = gameState?.visitedRooms.length || 0;
  const totalRooms = gameState?.rooms.length || 0;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleContainerClick}
    >
      <div
        style={{
          width: '800px',
          height: '600px',
          backgroundColor: '#161b22',
          borderRadius: '8px',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Courier New', monospace",
          fontSize: '16px',
          lineHeight: '1.6',
          position: 'relative'
        }}
      >
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#30363d #161b22'
          }}
        >
          {gameLog.map((entry) => (
            <div
              key={entry.id}
              style={{
                color: entry.type === 'user'
                  ? '#8b949e'
                  : entry.type === 'response'
                  ? '#3fb950'
                  : entry.type === 'error'
                  ? '#f85149'
                  : '#3fb950',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '8px',
                opacity: entry.id === gameLog[gameLog.length - 1]?.id ? 1 : 0.85
              }}
            >
              {entry.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#3fb950', marginRight: '8px' }}>&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontFamily: "'Courier New', monospace",
              fontSize: '16px',
              lineHeight: '1.6',
              caretColor: '#3fb950'
            }}
            autoFocus
            spellCheck={false}
          />
        </form>
      </div>

      {panelOpen && (
        <div
          style={{
            position: 'absolute',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '240px',
            backgroundColor: '#21262d',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
            fontFamily: "'Courier New', monospace",
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <span style={{ color: '#8b949e', fontWeight: 'bold' }}>STATUS</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPanelOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>Location</div>
            <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
              {currentRoom?.name || '---'}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>Items Here</div>
            <div style={{ color: '#d29922' }}>
              {roomItems.length > 0 ? (
                roomItems.map((itemId) => (
                  <div key={itemId} style={{ marginBottom: '2px' }}>
                    • {getItemName(itemId)}
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.6 }}>None</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>Inventory</div>
            <div style={{ color: '#3fb950' }}>
              {gameState && gameState.inventory.length > 0 ? (
                gameState.inventory.map((itemId) => (
                  <div key={itemId} style={{ marginBottom: '2px' }}>
                    • {getItemName(itemId)}
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.6 }}>Empty</div>
              )}
            </div>
          </div>

          <div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>Exploration</div>
            <div style={{ color: '#8b949e' }}>
              {visitedCount} / {totalRooms} rooms visited
            </div>
          </div>
        </div>
      )}

      {!panelOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPanelOpen(true);
          }}
          style={{
            position: 'absolute',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '80px',
            backgroundColor: '#21262d',
            borderRadius: '4px 0 0 4px',
            border: 'none',
            color: '#8b949e',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: "'Courier New', monospace",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ◀
        </button>
      )}
    </div>
  );
}

export default App;
