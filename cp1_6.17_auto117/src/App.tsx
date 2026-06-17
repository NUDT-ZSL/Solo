import React from 'react';
import { GameProvider } from './context/GameState';
import { InventoryModule } from './modules/InventoryModule';
import { ShopModule } from './modules/ShopModule';
import { TradeModule } from './modules/TradeModule';
import './styles.css';

function App() {
  return (
    <GameProvider>
      <div className="app-container">
        <div className="main-layout">
          <div className="left-panel">
            <InventoryModule />
          </div>
          <div className="right-panel">
            <ShopModule />
          </div>
        </div>
        <TradeModule />
      </div>
    </GameProvider>
  );
}

export default App;
