import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PetCard, { PetData } from './components/PetCard';
import InteractionPanel from './components/InteractionPanel';

interface SocialPet extends PetData {
  ownerName: string;
}

interface Heart {
  id: number;
  x: number;
  y: number;
  petId: string;
}

const GlobalStyles: React.FC = () => (
  <style>{`
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.03); }
    }
    @keyframes blink {
      0%, 92%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }
    @keyframes jump {
      0%, 100% { transform: translateY(0); }
      30% { transform: translateY(-40px); }
      50% { transform: translateY(-40px) rotate(5deg); }
      70% { transform: translateY(-20px); }
    }
    @keyframes scaleUp {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1.1); }
    }
    @keyframes heartFloat {
      0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; }
    }
    @keyframes pop {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    }
    @keyframes evolveGlow {
      0% { background: rgba(255, 255, 255, 0.45); }
      30% { background: linear-gradient(135deg, #FFD700, #FFA500); }
      100% { background: linear-gradient(135deg, rgba(255,215,0,0.4), rgba(255,165,0,0.4)); }
    }
    @keyframes starSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .modal-overlay {
      animation: fadeIn 0.3s ease;
    }
    .modal-content {
      animation: slideUp 0.3s ease;
    }
  `}</style>
);

const App: React.FC = () => {
  const [pets, setPets] = useState<PetData[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [socialPets, setSocialPets] = useState<SocialPet[]>([]);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const heartIdRef = useRef(0);

  useEffect(() => {
    loadPets();
    loadSocialPets();
  }, []);

  useEffect(() => {
    if (pets.length === 0) return;
    const interval = setInterval(() => {
      setPets((prev) =>
        prev.map((pet) => {
          const newPet = { ...pet };
          newPet.hunger = Math.max(0, newPet.hunger - 1);
          if (Date.now() % 2 === 0) newPet.happiness = Math.max(0, newPet.happiness - 1);
          if (Date.now() % 4 === 0) newPet.energy = Math.max(0, newPet.energy - 1);
          newPet.isSick = newPet.hunger <= 0 || newPet.happiness <= 0 || newPet.energy <= 0;
          return newPet;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [pets.length]);

  useEffect(() => {
    if (pets.length === 0) return;
    const interval = setInterval(() => {
      setPets((prev) =>
        prev.map((pet) => {
          const newPet = { ...pet };
          newPet.happiness = Math.max(0, newPet.happiness - 1);
          return newPet;
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [pets.length]);

  useEffect(() => {
    if (pets.length === 0) return;
    const interval = setInterval(() => {
      setPets((prev) =>
        prev.map((pet) => {
          const newPet = { ...pet };
          newPet.energy = Math.max(0, newPet.energy - 1);
          return newPet;
        })
      );
    }, 20000);
    return () => clearInterval(interval);
  }, [pets.length]);

  const loadPets = async () => {
    try {
      const response = await axios.get('/api/pets');
      setPets(response.data as PetData[]);
    } catch (error) {
      console.error('加载宠物失败:', error);
    }
  };

  const loadSocialPets = async () => {
    try {
      const response = await axios.get('/api/social');
      setSocialPets(response.data as SocialPet[]);
    } catch (error) {
      console.error('加载社交宠物失败:', error);
    }
  };

  const handleAdopt = async (type: 'cat' | 'dog' | 'dragon') => {
    try {
      const response = await axios.post('/api/pets', { type });
      const newPet = response.data as PetData;
      setPets((prev) => [...prev, newPet]);
      setSelectedPetId(newPet.id);
      setShowAdoptModal(false);
    } catch (error) {
      console.error('领养失败:', error);
    }
  };

  const handlePetUpdate = (updatedPet: PetData) => {
    setPets((prev) => prev.map((p) => (p.id === updatedPet.id ? updatedPet : p)));
  };

  const handlePat = async (socialPet: SocialPet, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const newHearts: Heart[] = [];
    for (let i = 0; i < 3; i++) {
      newHearts.push({
        id: heartIdRef.current++,
        x: rect.width / 2,
        y: rect.height / 2,
        petId: socialPet.id + i,
      });
    }
    setHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.find((nh) => nh.id === h.id)));
    }, 600);

    try {
      await axios.post(`/api/social/${socialPet.id}/pat`, {
        myPetId: selectedPetId,
      });
      setSocialPets((prev) =>
        prev.map((p) =>
          p.id === socialPet.id
            ? { ...p, happiness: Math.min(100, p.happiness + 5) }
            : p
        )
      );
      if (selectedPetId) {
        setPets((prev) =>
          prev.map((p) =>
            p.id === selectedPetId
              ? { ...p, happiness: Math.min(100, p.happiness + 5) }
              : p
          )
        );
      }
    } catch (error) {
      console.error('摸摸失败:', error);
    }
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  return (
    <>
      <GlobalStyles />
      <div style={{
        width: '100%',
        height: '100%',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <h1 style={{
            color: '#333',
            fontSize: 28,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4FC3F7, #FFB74D)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🐾 虚拟宠物养成社区
          </h1>
          <button
            onClick={() => setShowAdoptModal(true)}
            style={{
              padding: '12px 28px',
              borderRadius: 8,
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)',
              boxShadow: '0 4px 14px rgba(255,107,157,0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,107,157,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,107,157,0.4)';
            }}
          >
            ➕ 领养新宠物
          </button>
        </header>

        <div style={{
          flex: 1,
          display: 'flex',
          gap: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
            paddingRight: 8,
          }}>
            {pets.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: '#888',
                background: 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                backdropFilter: 'blur(10px)',
              }}>
                还没有宠物哦~<br />点击右上角按钮领养一只吧！
              </div>
            ) : (
              pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  selected={pet.id === selectedPetId}
                  onClick={() => setSelectedPetId(pet.id)}
                />
              ))
            )}

            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
            }}>
              <h3 style={{ color: '#333', marginBottom: 12, fontSize: 16 }}>
                🌟 社交广场
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {socialPets.map((sp) => (
                  <div
                    key={sp.id}
                    ref={(el) => {}}
                    onClick={(e) => {
                      if (el) handlePat(sp, e.currentTarget);
                      else handlePat(sp, e.currentTarget);
                    }}
                    style={{
                      position: 'relative',
                      padding: 10,
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '1px solid rgba(255,255,255,0.6)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {hearts.filter((h) => h.petId.startsWith(sp.id)).map((heart, i) => (
                      <span key={heart.id} style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        fontSize: 20,
                        pointerEvents: 'none',
                        // @ts-ignore
                        '--dx': `${(Math.random() - 0.5) * 80}px`,
                        '--dy': `${-40 - Math.random() * 40}px`,
                        animation: 'heartFloat 0.6s ease-out forwards',
                        animationDelay: `${i * 0.05}s`,
                      } as React.CSSProperties}>
                        💕
                      </span>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 28 }}>
                        {sp.type === 'cat' ? '🐱' : sp.type === 'dog' ? '🐶' : '🐲'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                          {sp.name} <span style={{ color: '#888', fontWeight: 400 }}>Lv.{sp.level}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888' }}>
                          主人: {sp.ownerName}
                        </div>
                        <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                          饱{sp.hunger} | 乐{sp.happiness} | 能{sp.energy}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#FF6B9D' }}>摸摸 →</span>
                    </div>
                  </div>
                ))}
                {socialPets.length === 0 && (
                  <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
                    暂无其他宠物
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {selectedPet ? (
              <InteractionPanel pet={selectedPet} onUpdate={handlePetUpdate} />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(10px)',
                borderRadius: 20,
                color: '#888',
                fontSize: 18,
              }}>
                {pets.length === 0
                  ? '👆 请先领养一只宠物'
                  : '👈 请在左侧选择一只宠物查看详情'}
              </div>
            )}
          </div>
        </div>

        {showAdoptModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAdoptModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #fff8e7, #e0f7fa)',
                padding: 32,
                borderRadius: 24,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                maxWidth: 600,
                width: '90%',
              }}
            >
              <h2 style={{
                textAlign: 'center',
                color: '#333',
                marginBottom: 8,
                fontSize: 24,
              }}>
                🎉 选择你的小伙伴
              </h2>
              <p style={{ textAlign: 'center', color: '#888', marginBottom: 28 }}>
                每只宠物都有独特的性格哦~
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
              }}>
                {(['cat', 'dog', 'dragon'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAdopt(type)}
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      border: '2px solid transparent',
                      background: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B9D';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,157,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: 64, lineHeight: 1 }}>
                      {type === 'cat' ? '🐱' : type === 'dog' ? '🐶' : '🐲'}
                    </div>
                    <div style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#333',
                    }}>
                      {type === 'cat' ? '小猫咪' : type === 'dog' ? '小狗狗' : '小火龙'}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {type === 'cat' ? '温柔可爱' : type === 'dog' ? '忠诚活泼' : '神秘强大'}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAdoptModal(false)}
                style={{
                  display: 'block',
                  margin: '24px auto 0',
                  padding: '10px 32px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(0,0,0,0.1)',
                  color: '#666',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
