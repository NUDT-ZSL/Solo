import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AuctionState, AuctionAction } from './types';
import { generateItems, generateUsers } from './data-generator';
import { auctionReducer, generateAutoBid } from './auction-engine';
import AuctionRoom from './components/AuctionRoom';

const initialState: AuctionState = {
  items: generateItems(),
  users: generateUsers(),
  currentActiveIndex: 0,
  bidFeed: [],
  manualPauseUntil: 0,
};

function App() {
  const [state, dispatch] = useReducer(auctionReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    dispatch({ type: 'START_NEXT' });
  }, []);

  useEffect(() => {
    const tickInterval = setInterval(() => {
      dispatch({ type: 'TICK', payload: 1 });
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleBid = () => {
      const delay = 1000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        const bid = generateAutoBid(stateRef.current, Date.now());
        if (bid) {
          dispatch({ type: 'BID', payload: bid });
        }
        scheduleBid();
      }, delay);
    };

    scheduleBid();
    return () => clearTimeout(timeout);
  }, []);

  const handleManualBid = useCallback((itemId: string, amount: number) => {
    dispatch({ type: 'MANUAL_BID', payload: { itemId, amount } });
  }, []);

  return <AuctionRoom
    items={state.items}
    users={state.users}
    currentActiveIndex={state.currentActiveIndex}
    bidFeed={state.bidFeed}
    onManualBid={handleManualBid}
  />;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const style = document.createElement('style');
style.textContent = `
  @keyframes feedFadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes stampIn {
    0% { transform: translate(-50%, -50%) rotate(-15deg) scale(2); opacity: 0; }
    60% { transform: translate(-50%, -50%) rotate(-15deg) scale(0.9); opacity: 1; }
    100% { transform: translate(-50%, -50%) rotate(-15deg) scale(1); opacity: 1; }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(251,191,36,0.1); }
    50% { box-shadow: 0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2); }
  }

  .glow-card {
    animation: glowPulse 2s ease-in-out infinite;
  }

  .bid-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(245,158,11,0.4);
  }

  .bid-btn:active {
    transform: scale(0.95);
  }

  .cards-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .cards-scroll::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
    border-radius: 3px;
  }
  .cards-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 3px;
  }

  .feed-scroll::-webkit-scrollbar {
    width: 4px;
  }
  .feed-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .feed-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
  }

  .feed-item-enter {
    animation: feedFadeIn 0.2s ease;
  }

  button, .bid-btn {
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }

  @media (max-width: 768px) {
    aside {
      display: none;
    }
  }
`;
document.head.appendChild(style);
