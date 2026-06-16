import { useState, useEffect, useCallback } from 'react';
import ItemList from './ItemList';
import ItemForm from './ItemForm';
import ItemDetail from './ItemDetail';

export interface Item {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  status: 'available' | 'borrowed';
  borrower: string | null;
  borrowDate: string | null;
}

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmBorrowItem, setConfirmBorrowItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  const handleRequestBorrow = (item: Item) => {
    setConfirmBorrowItem(item);
  };

  const handleConfirmBorrow = async () => {
    if (!confirmBorrowItem) return;
    try {
      const res = await fetch(`/api/items/${confirmBorrowItem.id}/borrow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrower: '当前用户' })
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
        if (selectedItem && selectedItem.id === updated.id) {
          setSelectedItem(updated);
        }
      }
    } catch (err) {
      console.error('Borrow failed:', err);
    }
    setConfirmBorrowItem(null);
  };

  const handleCancelBorrow = () => {
    setConfirmBorrowItem(null);
  };

  const handleReturn = async (item: Item) => {
    try {
      const res = await fetch(`/api/items/${item.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
        if (selectedItem && selectedItem.id === updated.id) {
          setSelectedItem(updated);
        }
      }
    } catch (err) {
      console.error('Return failed:', err);
    }
  };

  const handleItemAdded = () => {
    setShowForm(false);
    fetchItems();
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <span className="brand-icon">🌿</span>
            <span>社区工具共享图书馆</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + 添加物品
          </button>
        </div>
      </nav>

      <main className="main-content">
        <ItemList
          items={items}
          loading={loading}
          onItemClick={handleItemClick}
          onBorrow={handleRequestBorrow}
          onReturn={handleReturn}
        />
      </main>

      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          allItems={items}
          onClose={handleCloseDetail}
          onBorrow={handleRequestBorrow}
          onReturn={handleReturn}
        />
      )}

      {showForm && (
        <ItemForm onClose={() => setShowForm(false)} onSuccess={handleItemAdded} />
      )}

      {confirmBorrowItem && (
        <div className="modal-overlay" onClick={handleCancelBorrow}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">确认借用</h3>
            <p className="confirm-item-name">「{confirmBorrowItem.name}」</p>
            <div className="confirm-notice">
              <div className="notice-icon">⚠️</div>
              <div className="notice-text">
                <strong>借用须知：</strong>
                <p>请确认已与物品所有者沟通，借用期间请妥善保管物品，按时归还并保持物品完好。如有损坏请及时与所有者联系。</p>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="btn btn-outline" onClick={handleCancelBorrow}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirmBorrow}>
                确认借用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
