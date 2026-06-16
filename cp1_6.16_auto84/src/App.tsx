import { useState, useEffect, useRef } from 'react';
import { PetCard } from './components/PetCard';
import { CreatePetForm } from './components/CreatePetForm';
import { Pet, petStore } from './utils/petStore';
import './App.css';

type View = 'wall' | 'detail';

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentView, setCurrentView] = useState<View>('wall');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>(undefined);
  const [detailCardRect, setDetailCardRect] = useState<DOMRect | null>(null);
  const [showLostPoster, setShowLostPoster] = useState(false);
  const [snackAnimation, setSnackAnimation] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = petStore.subscribe((allPets) => {
      setPets(allPets);
    });
    setPets(petStore.getAllPets());
    return unsubscribe;
  }, []);

  const handleCardClick = (pet: Pet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDetailCardRect(rect);
    setSelectedPet(pet);
    setCurrentView('detail');
  };

  const handleBackToWall = () => {
    setCurrentView('wall');
    setSelectedPet(null);
    setDetailCardRect(null);
  };

  const handleCreateClick = () => {
    setEditingPet(undefined);
    setShowCreateForm(true);
  };

  const handleEditClick = () => {
    if (selectedPet) {
      setEditingPet(selectedPet);
      setShowCreateForm(true);
    }
  };

  const handleSavePet = (data: {
    name: string;
    breed: string;
    age: number;
    personalityTags: string[];
    signature: string;
    avatar: string;
  }) => {
    if (editingPet) {
      const updated = petStore.updatePet(editingPet.id, data);
      if (updated) {
        setSelectedPet(updated);
      }
    } else {
      petStore.addPet(data);
    }
    setShowCreateForm(false);
    setEditingPet(undefined);
  };

  const handleToggleLostMode = () => {
    if (!selectedPet) return;

    setShakeButton(true);
    setTimeout(() => setShakeButton(false), 200);

    if (selectedPet.isLost) {
      petStore.disableLostMode(selectedPet.id);
      const updated = petStore.getPetById(selectedPet.id);
      if (updated) setSelectedPet(updated);
    } else {
      const contact = prompt('请输入主人联系方式：', '');
      if (contact !== null) {
        petStore.enableLostMode(
          selectedPet.id,
          contact || '暂无联系方式',
          new Date().toLocaleString('zh-CN')
        );
        const updated = petStore.getPetById(selectedPet.id);
        if (updated) setSelectedPet(updated);
      }
    }
  };

  const handleGiveSnack = () => {
    if (!selectedPet) return;

    setSnackAnimation(true);
    setTimeout(() => setSnackAnimation(false), 600);

    petStore.addSnack(selectedPet.id);
    const updated = petStore.getPetById(selectedPet.id);
    if (updated) setSelectedPet(updated);
  };

  const generateLostPoster = () => {
    if (!selectedPet) return;
    setShowLostPoster(true);
  };

  const downloadPoster = () => {
    if (!selectedPet) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#FFE4E1');
    gradient.addColorStop(1, '#FFF0F5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(0, 0, 800, 70);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 宠物寻回启事 🐾', 400, 48);

    const pawIcon = '🐾';
    ctx.font = '100px sans-serif';
    ctx.globalAlpha = 0.2;
    ctx.textAlign = 'left';
    ctx.fillText(pawIcon, 30, 130);
    ctx.globalAlpha = 1;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const imgSize = 250;
      const imgX = 80;
      const imgY = 120;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgSize, imgSize, 20);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();

      ctx.strokeStyle = '#FFD1DC';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgSize, imgSize, 20);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = 'bold 28px Quicksand, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(selectedPet.name, 370, 170);

      ctx.font = '18px Quicksand, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(`品种：${selectedPet.breed}`, 370, 210);
      ctx.fillText(`年龄：${selectedPet.age} 岁`, 370, 240);

      if (selectedPet.personalityTags.length > 0) {
        ctx.fillText(`性格：${selectedPet.personalityTags.join('、')}`, 370, 270);
      }

      ctx.fillStyle = '#E74C3C';
      ctx.font = 'bold 20px Quicksand, sans-serif';
      ctx.fillText('📍 最后出现时间', 370, 330);
      ctx.fillStyle = '#333';
      ctx.font = '18px Quicksand, sans-serif';
      ctx.fillText(selectedPet.lastSeenTime || '未知', 370, 360);

      ctx.fillStyle = '#E74C3C';
      ctx.font = 'bold 20px Quicksand, sans-serif';
      ctx.fillText('📞 主人联系方式', 370, 400);
      ctx.fillStyle = '#333';
      ctx.font = '18px Quicksand, sans-serif';
      ctx.fillText(selectedPet.ownerContact || '暂无', 370, 430);

      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 32px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💝 帮帮TA回家 💝', 400, 520);

      ctx.fillStyle = '#999';
      ctx.font = '14px Quicksand, sans-serif';
      ctx.fillText('—— 宠物印记 Pet Imprint ——', 400, 560);

      const link = document.createElement('a');
      link.download = `寻回启事_${selectedPet.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = selectedPet.avatar;
  };

  const badgeLevel = selectedPet ? petStore.getBadgeLevel(selectedPet.snackCount) : 'none';

  const getBadgeGradient = () => {
    switch (badgeLevel) {
      case 'bronze':
        return 'linear-gradient(145deg, #cd7f32, #b87333, #cd7f32)';
      case 'silver':
        return 'linear-gradient(145deg, #e8e8e8, #c0c0c0, #e8e8e8)';
      case 'gold':
        return 'linear-gradient(145deg, #ffd700, #daa520, #ffd700)';
      default:
        return 'none';
    }
  };

  const getBadgeName = () => {
    switch (badgeLevel) {
      case 'bronze': return '铜徽章';
      case 'silver': return '银徽章';
      case 'gold': return '金徽章';
      default: return '';
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title" onClick={handleBackToWall}>
            <span className="title-icon">🐾</span>
            宠物印记
          </h1>
          {currentView === 'wall' && (
            <button className="create-btn" onClick={handleCreateClick}>
              <span>+</span> 创建卡片
            </button>
          )}
          {currentView === 'detail' && (
            <button className="back-btn" onClick={handleBackToWall}>
              ← 返回
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {currentView === 'wall' && (
          <div className="wall-view">
            {pets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🐱</div>
                <h2>还没有宠物卡片</h2>
                <p>点击上方按钮，创建你的第一张宠物数字身份卡吧！</p>
              </div>
            ) : (
              <div className="pet-grid">
                {pets.map((pet) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    onClick={(e: any) => handleCardClick(pet, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'detail' && selectedPet && (
          <div
            className={`detail-view ${detailCardRect ? 'entering' : ''}`}
            ref={detailRef}
          >
            <div className="detail-card">
              {selectedPet.isLost && (
                <div className="detail-lost-banner">
                  <span>🚨 丢失中 - 请帮忙留意 🚨</span>
                </div>
              )}

              <div className="detail-content">
                <div className="detail-left">
                  <div className="detail-avatar-container">
                    <img
                      src={selectedPet.avatar}
                      alt={selectedPet.name}
                      className="detail-avatar"
                    />
                    {badgeLevel !== 'none' && (
                      <div
                        className="detail-badge"
                        style={{ background: getBadgeGradient() }}
                        title={getBadgeName()}
                      >
                        <span>🐾</span>
                      </div>
                    )}
                  </div>

                  <h2 className="detail-name">{selectedPet.name}</h2>
                  <p className="detail-breed">{selectedPet.breed} · {selectedPet.age} 岁</p>

                  {selectedPet.personalityTags.length > 0 && (
                    <div className="detail-tags">
                      {selectedPet.personalityTags.map((tag, index) => (
                        <span key={index} className="detail-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  {selectedPet.signature && (
                    <div className="detail-signature">
                      <p className="signature-text">"{selectedPet.signature}"</p>
                    </div>
                  )}

                  <div className="detail-actions">
                    <button className="btn-edit" onClick={handleEditClick}>
                      ✏️ 编辑资料
                    </button>
                  </div>
                </div>

                <div className="detail-right">
                  <div className="interaction-panel">
                    <h3 className="panel-title">社区互动</h3>

                    <div className="snack-section">
                      <div className="snack-display">
                        <span className="snack-number">{selectedPet.snackCount}</span>
                        <span className="snack-label">颗零食</span>
                      </div>

                      <button
                        className={`snack-btn ${snackAnimation ? 'animating' : ''}`}
                        onClick={handleGiveSnack}
                      >
                        <span className="snack-heart">
                          {snackAnimation ? '❤️' : '🤍'}
                        </span>
                        <span className="snack-btn-text">送零食</span>
                        {snackAnimation && (
                          <span className="snack-plus">+1</span>
                        )}
                      </button>

                      <div className="badge-progress">
                        <p className="progress-text">
                          {badgeLevel === 'none' && `再获得 ${10 - selectedPet.snackCount} 颗零食解锁铜徽章`}
                          {badgeLevel === 'bronze' && `再获得 ${50 - selectedPet.snackCount} 颗零食解锁银徽章`}
                          {badgeLevel === 'silver' && `再获得 ${100 - selectedPet.snackCount} 颗零食解锁金徽章`}
                          {badgeLevel === 'gold' && '已获得最高等级金徽章！🏆'}
                        </p>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, (selectedPet.snackCount / 100) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lost-mode-section">
                    <h3 className="panel-title">丢失模式</h3>
                    <button
                      className={`lost-mode-btn ${shakeButton ? 'shake' : ''} ${selectedPet.isLost ? 'active' : ''}`}
                      onClick={handleToggleLostMode}
                    >
                      {selectedPet.isLost ? '🔓 解除丢失模式' : '🚨 启用丢失模式'}
                    </button>
                    {selectedPet.isLost && (
                      <div className="lost-info">
                        <p className="lost-info-text">
                          📍 最后出现：{selectedPet.lastSeenTime || '未知'}
                        </p>
                        <p className="lost-info-text">
                          📞 联系方式：{selectedPet.ownerContact || '暂无'}
                        </p>
                        <button className="poster-btn" onClick={generateLostPoster}>
                          📄 生成寻回海报
                        </button>
                      </div>
                    )}
                    <p className="lost-hint">
                      开启后将显示丢失横幅，便于社区扩散寻找
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <CreatePetForm
              pet={editingPet}
              onSave={handleSavePet}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {showLostPoster && selectedPet && (
        <div className="modal-overlay" onClick={() => setShowLostPoster(false)}>
          <div className="modal-content poster-modal" onClick={(e) => e.stopPropagation()}>
            <div className="poster-header">
              <h3>寻回启事海报</h3>
              <button className="close-btn" onClick={() => setShowLostPoster(false)}>×</button>
            </div>
            <div className="poster-preview">
              <div className="poster-canvas">
                <div className="poster-banner">🐾 宠物寻回启事 🐾</div>
                <div className="poster-body">
                  <div className="poster-paw">🐾</div>
                  <img src={selectedPet.avatar} alt={selectedPet.name} className="poster-img" />
                  <div className="poster-info">
                    <h2 className="poster-name">{selectedPet.name}</h2>
                    <p>品种：{selectedPet.breed}</p>
                    <p>年龄：{selectedPet.age} 岁</p>
                    <p className="poster-section">📍 最后出现时间</p>
                    <p>{selectedPet.lastSeenTime || '未知'}</p>
                    <p className="poster-section">📞 主人联系方式</p>
                    <p>{selectedPet.ownerContact || '暂无'}</p>
                  </div>
                </div>
                <div className="poster-footer">
                  <p className="poster-slogan">💝 帮帮TA回家 💝</p>
                  <p className="poster-brand">—— 宠物印记 Pet Imprint ——</p>
                </div>
              </div>
            </div>
            <div className="poster-actions">
              <button className="btn btn-secondary" onClick={() => setShowLostPoster(false)}>
                关闭
              </button>
              <button className="btn btn-primary" onClick={downloadPoster}>
                📥 下载海报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
