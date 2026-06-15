import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GardenGrid from '@/components/GardenGrid';
import Modal from '@/components/Modal';
import { useGarden } from '@/hooks/useGarden';
import { getPlantType, getRarityStars, getStageName } from '@/types';
import type { Plant, Garden, Message as MessageType } from '@/types';

const avatars = ['👨‍🌾', '👩‍🌾', '🧑‍🌾', '👨‍🔬', '👩‍🎨', '🧙‍♂️', '🧚‍♀️', '🦊'];

const PlantDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchGardenDetail, fetchMessages, sendMessage } = useGarden();

  const [garden, setGarden] = useState<Garden | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('visitorName') || '访客');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const data = await fetchGardenDetail(parseInt(id));
    if (data) {
      setGarden(data);
      setPlants(data.plants || []);
    }
    const msgs = await fetchMessages(parseInt(id));
    if (msgs) setMessages(msgs);
  }, [id, fetchGardenDetail, fetchMessages]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCellClick = useCallback((index: number, plant?: Plant) => {
    if (plant) {
      setSelectedPlant(plant);
      setDetailModalOpen(true);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!id || !newMessage.trim()) return;
    localStorage.setItem('visitorName', userName);
    const result = await sendMessage(parseInt(id), userName, newMessage.trim());
    if (result) {
      setMessages(prev => [...prev, result]);
      setNewMessage('');
    }
  }, [id, userName, newMessage, sendMessage]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  }, [messages]);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/explore')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '14px',
          }}
        >
          ← 返回
        </button>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', marginBottom: '2px' }}>
            🌿 {garden?.name || '植物园详情'}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
            ❤️ {garden?.likes || 0} 喜欢 · 共 {plants.length} 株植物
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 500px', minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
          <GardenGrid
            plants={plants}
            gridSize={gridSize}
            onCellClick={handleCellClick}
            readOnly
          />
        </div>

        <div
          style={{
            width: '280px',
            maxHeight: 'calc(100vh - 100px)',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: '0 0 280px',
          }}
        >
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>💬 留言板</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
              共 {messages.length} 条留言
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {sortedMessages.map((msg, idx) => (
              <div
                key={msg.id}
                style={{
                  padding: '10px',
                  background: 'var(--progress-bg)',
                  borderRadius: '10px',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>{avatars[idx % avatars.length]}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{msg.userName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: 'auto' }}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', paddingLeft: '22px' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '13px', padding: '30px 10px' }}>
                暂无留言，来写下第一条吧~
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border-light)' }}>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="你的昵称"
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '12px',
                marginBottom: '8px',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="写留言..."
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '13px',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={detailModalOpen} onClose={() => { setDetailModalOpen(false); setSelectedPlant(null); }} width={360} slideUp>
        {selectedPlant && (() => {
          const pt = getPlantType(selectedPlant.plantType);
          const sprite = selectedPlant.stage <= 0 ? '🌱' : selectedPlant.stage === 1 ? '🌿' : pt.emoji;
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
                  }} />
                </div>
              </div>

              <div style={{ padding: '12px', background: pt.color + '10', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>📝 培育笔记</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pt.description}</div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PlantDetailPage;
