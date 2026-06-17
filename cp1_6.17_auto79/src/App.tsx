import React, { useState } from 'react';
import PreviewCanvas from './components/PreviewCanvas';
import ControlPanel from './components/ControlPanel';
import { baseToken, defaultUserToken } from './types/token';
import type { DesignToken } from './types/token';
import { exportDesignToken } from './utils/tokenExport';
import './App.css';

const App: React.FC = () => {
  const [userToken, setUserToken] = useState<DesignToken>(defaultUserToken);

  const handleExport = () => {
    exportDesignToken(userToken);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">设计令牌对比板</h1>
        <p className="app-subtitle">实时预览设计参数，一键导出设计令牌</p>
      </header>
      
      <div className="app-main">
        <div className="canvas-section">
          <PreviewCanvas baseToken={baseToken} userToken={userToken} />
        </div>
        <div className="panel-section">
          <ControlPanel token={userToken} onChange={setUserToken} />
        </div>
      </div>

      <button className="export-button" onClick={handleExport}>
        导出 JSON
      </button>
    </div>
  );
};

export default App;
