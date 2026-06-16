import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import ProjectList from './components/ProjectList';
import Whiteboard from './components/Whiteboard';
import './index.css';

const SOCKET_URL = '';

const WhiteboardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userName] = useState(`用户${Math.floor(Math.random() * 1000)}`);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  if (!socket || !boardId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        加载中...
      </div>
    );
  }

  return <Whiteboard boardId={boardId} socket={socket} userName={userName} />;
};

const App: React.FC = () => {
  const [userName] = useState(`用户${Math.floor(Math.random() * 1000)}`);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList userName={userName} />} />
        <Route path="/board/:boardId" element={<WhiteboardPage />} />
      </Routes>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
