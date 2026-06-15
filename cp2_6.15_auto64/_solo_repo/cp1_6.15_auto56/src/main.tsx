import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getMockActivities } from './mockData';

const initialData = getMockActivities();
console.log('初始加载活动数据:', initialData.length, '个活动');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
