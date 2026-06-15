import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import useActivityStore from '@/store';
import Home from '@/pages/Home';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export default function App() {
  const {
    setCurrentVote,
    updateVoteOptions,
    endVote,
    addBarrage,
    setEmojiRain,
    resetEmojiRain,
  } = useActivityStore();

  const initSocket = useCallback(() => {
    const s = getSocket();

    s.on('connect', () => {
      console.log('Socket connected');
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    s.on('vote_start', (vote: Parameters<typeof setCurrentVote>[0]) => {
      setCurrentVote(vote);
    });

    s.on('vote_update', (vote: Parameters<typeof setCurrentVote>[0]) => {
      setCurrentVote(vote);
    });

    s.on('vote_end', (data: { voteId: string; winnerId: string | null }) => {
      endVote(data.winnerId);
    });

    s.on('barrage', (data: { id: string; text: string; color: string; timestamp: number }) => {
      addBarrage(data);
    });

    s.on('emoji_rain', (data: { type: string }) => {
      setEmojiRain(data.type);
    });

    s.on('state_sync', (data: {
      currentVote: Parameters<typeof setCurrentVote>[0] | null;
      emojiRainActive: boolean;
      emojiRainType: string | null;
    }) => {
      if (data.currentVote) {
        if (data.currentVote.active) {
          setCurrentVote(data.currentVote);
        } else {
          setCurrentVote(data.currentVote);
          endVote(null);
        }
      }
      if (data.emojiRainType) {
        setEmojiRain(data.emojiRainType);
      } else {
        resetEmojiRain();
      }
    });

    return s;
  }, [setCurrentVote, updateVoteOptions, endVote, addBarrage, setEmojiRain, resetEmojiRain]);

  useEffect(() => {
    const s = initSocket();
    return () => {
      s.disconnect();
    };
  }, [initSocket]);

  return <Home />;
}

export { getSocket };
