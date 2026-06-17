import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ItemDetail from './pages/ItemDetail';
import AdminPage from './pages/AdminPage';
import PublishPage from './pages/PublishPage';
import ConfirmModal from './components/ConfirmModal';
import { useItems } from './hooks/useItems';
import './styles/components.css';
import type { Item } from './types';

function AppContent() {
  const { items, applyItem, loading } = useItems();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    item: Item | null;
  }>({
    isOpen: false,
    item: null,
  });

  const handleApply = (item: Item) => {
    setModalState({ isOpen: true, item });
  };

  const handleConfirmApply = async (applicant: string) => {
    if (modalState.item) {
      try {
        await applyItem(modalState.item.id, applicant);
      } catch (err) {
        console.error('申请失败:', err);
      }
    }
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, item: null });
  };

  return (
    <BrowserRouter>
      <Navbar isAdmin={true} currentUser="张三" />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<HomePage items={items} onApply={handleApply} loading={loading} />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/publish" element={<PublishPage />} />
        </Routes>
      </div>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmApply}
        itemName={modalState.item?.title || ''}
        defaultApplicant="张三"
      />
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}
