/**
 * src/main.tsx
 *
 * 应用入口文件
 *
 * 数据流向：本文件 → 渲染 App.tsx → App.tsx 管理 fetch 和状态分发
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
