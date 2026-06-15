import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GardenGrid from '@/components/GardenGrid';
import PlantCard from '@/components/PlantCard';
import Modal from '@/components/Modal';
import { useGarden } from '@/hooks/useGarden';
import { PLANT_TYPES, getPlantType, getRarityStars, getStageName } from '@/types';
import type { Plant } from '@/types';

const GardenPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    plants,
    myGarden,
    loading,
    fetchMyGarden,
    plantSeed,
    waterPlant,
    fertilizePlant,
    harvestPlant,
    startGrowthTimer,
    stopGrowthTimer,
  } = useGarden();

  const [gridSize, setGridSize] = useState(9);
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [experience, setExperience] = useState(() => {
    const saved = localStorage.getItem('gardenExp');
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    fetchMyGarden();
    startGrowthTimer();
    return () => stopGrowthTimer();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setGridSize(window.innerWidth < 480 ? 5 : 9);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCellClick = useCallback((index: number, plant?: Plant) => {
    if (plant) {
      setSelectedPlant(plant);
      setDetailModalOpen(true);
    } else {
      setSelectedCell(index);
      setPlantModalOpen(true);
    }
  }, []);

  const handleSelectPlant = useCallback(async (plantTypeId: string) => {
    if (selectedCell === null || !myGarden) return;
    await plantSeed(myGarden.id, plantTypeId, selectedCell);
    setPlantModalOpen(false);
    setSelectedCell(null);
  }, [selectedCell, myGarden, plantSeed]);

  const handleWater = useCallback(async () => {
    if (!selectedPlant) return;
    const updated = await waterPlant(selectedPlant.id);
    if (updated) setSelectedPlant(updated);
  }, [selectedPlant, waterPlant]);

  const handleFertilize = useCallback(async () => {
    if (!selectedPlant) return;
    const updated = await fertilizePlant(selectedPlant.id);
    if (updated) setSelectedPlant(updated);
  }, [selectedPlant, fertilizePlant]);

  const handleHarvest = useCallback(async () => {
    if (!selectedPlant) return;
    const pt = getPlantType(selectedPlant.plantType);
    const exp = pt.rarity * 10;
    const newExp = experience + exp;
    setExperience(newExp);
    localStorage.setItem('gardenExp', String(newExp));
    await harvestPlant(selectedPlant.id);
    setDetailModalOpen(false);
    setSelectedPlant(null);
  }, [selectedPlant, experience, harvestPlant]);

  const matureCount = useMemo(() => plants.filter(p => p.growthProgress >= 100).length, [plants]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '4px' }}>
            🌱 {myGarden?.name || '我的植物园'}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            已种植 {plants.length}/81 株 · 成熟 {matureCount} 株 · 经验 {experience}
          </div>
        </div>
        <button
          onClick={() => navigate('/explore')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)')}
        >
          🔍 去探索
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ flex: '0 0 auto' }}>
          {loading ? (
            <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>加载中...</div>
          ) : (
            <GardenGrid
              plants={plants}
              gridSize={gridSize}
              onCellClick={handleCellClick}
            />
          )}
        </div>

        <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '12px' }}>植物图鉴</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {plants.slice(0, 6).map(p => (
              <PlantCard
                key={p.id}
                plant={p}
                onWater={() => waterPlant(p.id)}
                onFertilize={() => fertilizePlant(p.id)}
                onHarvest={async () => {
                  const pt = getPlantType(p.plantType);
                  const exp = pt.rarity * 10;
                  const newExp = experience + exp;
                  setExperience(newExp);
                  localStorage.setItem('gardenExp', String(newExp));
                  await harvestPlant(p.id);
                }}
                onClick={() => {
                  setSelectedPlant(p);
                  setDetailModalOpen(true);
                }}
              />
            ))}
            {plants.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                点击网格空格开始种植吧~
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={plantModalOpen} onClose={() => { setPlantModalOpen(false); setSelectedCell(null); }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginBottom: '16px' }}>选择植物</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
          {PLANT_TYPES.map(pt => (
            <div
              key={pt.id}
              onClick={() => handleSelectPlant(pt.id)}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: pt.color + '15',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = pt.color;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-light)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '6px' }}>{pt.emoji}</div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>{pt.name}</div>
              <div style={{ textAlign: 'center', color: pt.color, fontSize: '12px', marginTop: '2px' }}>{getRarityStars(pt.rarity)}</div>
              <div style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '11px', marginTop: '4px' }}>{pt.description}</div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => { setDetailModalOpen(false); setSelectedPlant(null); }} width={360} slideUp>
        {selectedPlant && (() => {
          const pt = getPlantType(selectedPlant.plantType);
          const sprite = selectedPlant.stage <= 0 ? '🌱' : selectedPlant.stage === 1 ? '🌿' : pt.emoji;
          const isMature = selectedPlant.growthProgress >= 100;
          return (
            <div>
              <div style={{ textAlign: 'center', fontSize: '72px', marginBottom: '8px' }}>{sprite}</div>
              <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '22px', marginBottom: '4px' }}>{pt.name}</h3>
              <div style={{ textAlign: 'center', color: pt.color, fontSize: '14px', marginBottom: '16px' }}>{getRarityStars(pt.rarity)}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'var(--progress-bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>生长阶段</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{getStageName(selectedPlant.stage)}</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--progress-bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>等级</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Lv.{selectedPlant.stage + 1}</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--progress-bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>健康值</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: selectedPlant.health > 50 ? 'var(--accent-green)' : 'var(--accent-pink)' }}>
                    {selectedPlant.health}/100
                  </div>
                </div>
                <div style={{ padding: '10px', background: 'var(--progress-bg)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>成熟度</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{selectedPlant.growthProgress}%</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '6px' }}>成熟进度</div>
                <div style={{ width: '100%', height: '10px', background: 'var(--progress-bg)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${selectedPlant.growthProgress}%`,
                    background: 'linear-gradient(90deg, #4caf50, #ffc107)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              <div style={{ padding: '12px', background: pt.color + '10', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>📝 培育笔记</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pt.description}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {!isMature ? (
                  <>
                    <button
                      onClick={handleWater}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #4d96ff, #6bc5ff)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      💧 浇水
                    </button>
                    <button
                      onClick={handleFertilize}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #6bcb77, #8ddf8d)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      🌿 施肥
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleHarvest}
                    style={{
                      padding: '10px 32px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #ffd700, #ffb700)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✨ 收获 (+{pt.rarity * 10} 经验)
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default GardenPage;
