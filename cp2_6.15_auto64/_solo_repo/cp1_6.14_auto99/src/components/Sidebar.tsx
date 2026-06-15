import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleNewEndpoint = () => {
    navigate('/endpoint/new');
  };

  return (
    <aside className="sidebar">
      <div className="logo">StubBubble</div>
      <button className="sidebar-btn" onClick={handleNewEndpoint}>
        <Plus size={18} />
        新建端点
      </button>
    </aside>
  );
};
