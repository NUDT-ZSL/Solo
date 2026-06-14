import React, { useState, useCallback } from 'react';
import { Edit3, X, Download, MapPin } from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import PlanCard from './PlanCard';
import DetailModal from './DetailModal';
import LoadingSpinner from './LoadingSpinner';
import { exportToPDF } from '../utils/exportPDF';
import type { DayPlan } from '../utils/types';

const PlanFeed: React.FC = () => {
  const { plan, isLoading, error, reorderDays, removeDay } = useTravel();
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCardClick = useCallback((dayPlan: DayPlan) => {
    if (!isEditMode) {
      setSelectedDay(dayPlan);
      setIsModalOpen(true);
    }
  }, [isEditMode]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedDay(null), 300);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    reorderDays(draggedIndex, dropIndex);
  }, [draggedIndex, reorderDays]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      reorderDays(index, index - 1);
    }
  }, [reorderDays]);

  const handleMoveDown = useCallback((index: number) => {
    if (plan && index < plan.dailyPlans.length - 1) {
      reorderDays(index, index + 1);
    }
  }, [plan, reorderDays]);

  const handleDelete = useCallback((dayId: string) => {
    if (window.confirm('确定要删除这一天的行程吗？')) {
      removeDay(dayId);
    }
  }, [removeDay]);

  const handleExportPDF = useCallback(() => {
    if (plan) {
      exportToPDF(plan);
    }
  }, [plan]);

  if (isLoading) {
    return (
      <main className="plan-feed">
        <LoadingSpinner />
      </main>
    );
  }

  if (error) {
    return (
      <main className="plan-feed">
        <div className="error-state">
          <p className="error-message">{error}</p>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="plan-feed">
        <div className="empty-state">
          <MapPin size={64} className="empty-icon" />
          <h2 className="empty-title">开始规划您的旅行</h2>
          <p className="empty-desc">在左侧输入目的地、天数和偏好，点击"生成计划"按钮</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="feed-header">
        <div className="feed-header-content">
          <div>
            <h1 className="feed-title">
              {plan.destination}
              <span className="feed-subtitle">{plan.days} 天旅行计划</span>
            </h1>
            <div className="feed-meta">
              <span className="meta-tag">{plan.budget}预算</span>
              {plan.preferences.map(p => (
                <span key={p} className="meta-tag">{p}</span>
              ))}
            </div>
          </div>
          <div className="feed-actions">
            <button
              className={`edit-btn ${isEditMode ? 'active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? <><X size={18} /> 完成</> : <><Edit3 size={18} /> 编辑</>}
            </button>
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <main className={`plan-feed ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="cards-grid">
          {plan.dailyPlans.map((dayPlan, index) => (
            <PlanCard
              key={dayPlan.id}
              dayPlan={dayPlan}
              index={index}
              isEditMode={isEditMode}
              onCardClick={() => handleCardClick(dayPlan)}
              onDelete={() => handleDelete(dayPlan.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragging={draggedIndex === index}
            />
          ))}
        </div>
      </main>

      {plan && (
        <button
          className="export-fab"
          onClick={handleExportPDF}
          title="导出PDF"
        >
          <Download size={24} />
        </button>
      )}

      {isModalOpen && selectedDay && (
        <DetailModal
          dayPlan={selectedDay}
          destination={plan.destination}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default PlanFeed;
