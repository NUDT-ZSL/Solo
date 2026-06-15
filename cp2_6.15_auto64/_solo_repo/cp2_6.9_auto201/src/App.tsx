import React, { useState, useEffect, useRef, useCallback } from 'react';
import Wheel from './Wheel';
import Sidebar from './Sidebar';
import { getBeans, getFlavors, getCombination } from './api';
import type { CoffeeBean, Flavor, Combination } from './api';

const App: React.FC = () => {
  const [beanList, setBeanList] = useState<CoffeeBean[]>([]);
  const [flavorList, setFlavorList] = useState<Flavor[]>([]);
  const [selectedBeanId, setSelectedBeanId] = useState<number | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [combination, setCombination] = useState<Combination | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [beans, flavors] = await Promise.all([getBeans(), getFlavors()]);
        setBeanList(beans);
        setFlavorList(flavors);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const selectedBean = beanList.find(b => b.id === selectedBeanId) || null;
  const selectedFlavor = flavorList.find(f => f.id === selectedFlavorId) || null;

  const animateScore = useCallback((targetScore: number) => {
    setDisplayScore(0);
    const duration = 1500;
    const increment = 2;
    const totalFrames = (targetScore / increment);
    const frameInterval = duration / totalFrames;
    let currentScore = 0;
    let lastUpdateTime = 0;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateTime >= frameInterval) {
        currentScore = Math.min(currentScore + increment, targetScore);
        setDisplayScore(currentScore);
        lastUpdateTime = timestamp;
      }

      if (currentScore < targetScore) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleSpin = useCallback((beanId: number) => {
    setSelectedBeanId(beanId);
    setSelectedFlavorId(null);
    setCombination(null);
  }, []);

  const handleAddFlavor = useCallback(async (flavorId: number) => {
    if (selectedBeanId === null) {
      return;
    }

    setSelectedFlavorId(flavorId);
    setIsLoading(true);
    setIsSaved(false);

    try {
      const result = await getCombination(selectedBeanId, flavorId);
      setCombination(result);
      setShowModal(true);
      animateScore(result.score);
    } catch (error) {
      console.error('Failed to get combination:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBeanId, animateScore]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaved(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="app">
      <h1 className="app-title">咖啡风味轮盘</h1>
      <p className="app-subtitle">探索咖啡豆与风味的完美搭配</p>

      <div className="main-container">
        <Wheel
          beanList={beanList}
          onSpin={handleSpin}
          selectedBeanId={selectedBeanId}
          selectedBeanName={selectedBean?.name || null}
        />

        <Sidebar
          selectedBean={selectedBean}
          flavorList={flavorList}
          selectedFlavorId={selectedFlavorId}
          combination={combination}
          onAddFlavor={handleAddFlavor}
        />
      </div>

      {showModal && combination && selectedBean && selectedFlavor && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-bean">{selectedBean.name}</span>
              <span className="modal-plus">+</span>
              <span className="modal-flavor">{selectedFlavor.name}</span>
            </div>

            <div className="modal-body">
              <div className="modal-score-section">
                <span className="modal-score-label">搭配评分</span>
                <span className="modal-score">{displayScore}</span>
              </div>
              <div className="modal-aroma-section">
                <p className="modal-aroma">{combination.aroma}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleSave}
              >
                <span className="heart-icon">{isSaved ? '♥' : '♡'}</span>
                {isSaved ? '已收藏' : '保存到收藏'}
              </button>
              <button className="close-btn" onClick={handleCloseModal}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '16px 24px',
          borderRadius: '8px',
          color: '#FFF8E7',
          fontFamily: "'Montserrat', sans-serif",
          zIndex: 200
        }}>
          正在探索风味组合...
        </div>
      )}
    </div>
  );
};

export default App;
