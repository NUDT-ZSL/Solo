import { useState, useEffect } from 'react';
import CampsitePage from './pages/CampsitePage';
import EquipmentPage from './pages/EquipmentPage';
import OrderPage from './pages/OrderPage';
import { store } from './business/store';

type Tab = 'campsite' | 'equipment' | 'order';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('campsite');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate(n => n + 1);
    });
    return unsubscribe;
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'campsite':
        return <CampsitePage />;
      case 'equipment':
        return <EquipmentPage />;
      case 'order':
        return <OrderPage />;
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">⛺ 绿野营地</div>
        <div className="navbar-tabs">
          <button
            className={`navbar-tab ${activeTab === 'campsite' ? 'active' : ''}`}
            onClick={() => setActiveTab('campsite')}
          >
            营位
          </button>
          <button
            className={`navbar-tab ${activeTab === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            装备
          </button>
          <button
            className={`navbar-tab ${activeTab === 'order' ? 'active' : ''}`}
            onClick={() => setActiveTab('order')}
          >
            订单
          </button>
        </div>
      </nav>
      <div className="page-container">
        {renderPage()}
      </div>
    </div>
  );
}
