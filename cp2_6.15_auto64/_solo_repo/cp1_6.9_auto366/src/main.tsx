import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

const USER_ID_KEY = 'time_capsule_user_id';

function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `user_${timestamp}_${random}`;
}

function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

const userId = getOrCreateUserId();

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App userId={userId} />
    </BrowserRouter>
  </React.StrictMode>
);

export { userId as currentUserId };
