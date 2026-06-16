import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlants } from '../hooks/usePlants';
import { useDiaries } from '../hooks/useDiaries';
import { Plant } from '../types';
import './MyPlantsPage.css';

function MyPlantsPage() {
  const { plants, loading } = usePlants();
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [diaryContent, setDiaryContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const { addDiary, refetch: refetchDiaries } = useDiaries(selectedPlant?.id || null);

  const myPlants = plants.filter(p => p.adopted && p.adoptedBy === 'user_001');

  const getDaysAdopted = (adoptedAt: string | null) => {
    if (!adoptedAt) return 0;
    const now = new Date();
    const adopted = new Date(adoptedAt);
    const diff = now.getTime() - adopted.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleWriteDiary = (plant: Plant) => {
    setSelectedPlant(plant);
    setDiaryContent('');
    setSelectedImage(null);
    setImagePreview(null);
    setShowDiaryModal(true);
  };

  const handleViewDiaries = (plantId: string) => {
    navigate(`/plant/${plantId}`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitDiary = async () => {
    if (!selectedPlant || !diaryContent.trim()) return;

    try {
      setSubmitting(true);
      await addDiary(diaryContent, selectedImage || undefined);
      setShowDiaryModal(false);
      setDiaryContent('');
      setSelectedImage(null);
      setImagePreview(null);
      refetchDiaries();
      window.location.reload();
    } catch (err) {
      console.error('Submit diary failed:', err);
      alert('提交日记失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="my-plants-page">
        <h2 className="page-title">🌱 我的绿植</h2>
        <p className="loading-text">加载中...</p>
      </div>
    );
  }

  return (
    <div className="my-plants-page">
      <h2 className="page-title">🌱 我的绿植</h2>
      <p className="page-subtitle">共认养了 {myPlants.length} 棵绿植</p>

      {myPlants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌿</div>
          <h3>还没有认养绿植</h3>
          <p>去地图上找一棵喜欢的植物认养吧！</p>
          <button
            className="go-to-map-btn"
            onClick={() => navigate('/')}
          >
            去地图看看
          </button>
        </div>
      ) : (
        <div className="plants-grid">
          {myPlants.map(plant => (
            <div
              key={plant.id}
              className="plant-card"
              onClick={() => handleViewDiaries(plant.id)}
            >
              <div className="card-image">
                {imagePreview ? (
                  <img src={imagePreview} alt={plant.name} />
                ) : (
                  <div className="image-placeholder">
                    🌿 {plant.name}
                  </div>
                )}
              </div>

              <div className="card-content">
                <h3 className="plant-name">{plant.name}</h3>
                <p className="adopted-days">
                  已陪伴 {getDaysAdopted(plant.adoptedAt)} 天
                </p>

                <div className="growth-section">
                  <div className="growth-label">
                    <span>生长分值</span>
                    <span className="score">{plant.growthScore}/100</span>
                  </div>
                  <div className="growth-bar">
                    <div
                      className="growth-fill"
                      style={{ width: `${plant.growthScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="write-diary-btn"
                  onClick={() => handleWriteDiary(plant)}
                >
                  ✏️ 写日记
                </button>
                <button
                  className="view-diary-link"
                  onClick={() => handleViewDiaries(plant.id)}
                >
                  查看日记 →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDiaryModal && selectedPlant && (
        <div className="modal-backdrop" onClick={() => setShowDiaryModal(false)}>
          <div
            className="diary-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>写日记 - {selectedPlant.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowDiaryModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <textarea
                className="diary-textarea"
                placeholder="记录今天的植物观察、心情和故事..."
                value={diaryContent}
                onChange={(e) => setDiaryContent(e.target.value)}
                rows={5}
              />

              <div className="image-upload-section">
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="预览" className="image-preview" />
                      <button
                        className="remove-image-btn"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      📷 点击上传照片（可选，≤5MB）
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowDiaryModal(false)}
              >
                取消
              </button>
              <button
                className="submit-btn"
                onClick={handleSubmitDiary}
                disabled={!diaryContent.trim() || submitting}
              >
                {submitting ? '提交中...' : '发布日记'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPlantsPage;
