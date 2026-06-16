import { useState, useEffect, useRef, useCallback } from 'react';
import type { Animal, PersonalityTag, HealthStatus } from '../logic/AdoptionLogic';
import ApplicationForm from './ApplicationForm';
import AddAnimalModal from '../components/AddAnimalModal';

interface LazyImageProps {
  src: string;
  alt: string;
}

function LazyImage({ src, alt }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '150px' }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="photo-wrapper" ref={imgRef}>
      {!loaded && (
        <div className="skeleton-wrapper">
          <div className="skeleton-shimmer">
            <div className="skeleton-paw">🐾</div>
            <div className="skeleton-placeholder"></div>
          </div>
        </div>
      )}
      {isVisible && (
        <>
          <img
            src={src}
            alt={alt}
            className={`animal-photo ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)}
            style={{ visibility: loaded ? 'visible' : 'hidden' }}
          />
          <div className="photo-gradient-overlay"></div>
        </>
      )}
    </div>
  );
}

interface PersonalityColorMap {
  [key: string]: { bg: string; border: string; text: string };
}

interface HealthColorMap {
  [key: string]: { bg: string; border: string; text: string };
}

const personalityColors: PersonalityColorMap = {
  '友好': { bg: '#52C41A', border: '#389E0D', text: '#FFFFFF' },
  '胆小': { bg: '#1890FF', border: '#096DD9', text: '#FFFFFF' },
  '活泼': { bg: '#FA8C16', border: '#D46B08', text: '#FFFFFF' }
};

const healthColors: HealthColorMap = {
  '已驱虫': { bg: '#F5F5F5', border: '#D9D9D9', text: '#666666' },
  '已疫苗': { bg: '#F5F5F5', border: '#D9D9D9', text: '#666666' },
  '已绝育': { bg: '#F5F5F5', border: '#D9D9D9', text: '#666666' }
};

function Tag({
  text,
  colors,
  icon
}: {
  text: string;
  colors: { bg: string; border: string; text: string };
  icon: string;
}) {
  const isLightBg = colors.text !== '#FFFFFF';
  return (
    <span
      className="enhanced-tag"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        boxShadow: isLightBg
          ? '0 1px 3px rgba(0, 0, 0, 0.06)'
          : `0 2px 6px ${colors.bg}60`
      }}
    >
      <span className="tag-icon">{icon}</span>
      {text}
    </span>
  );
}

export default function AnimalList() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadAnimals = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/animals?page=${pageNum}&pageSize=20`);
      const data = await res.json();
      setTotal(data.total);
      if (reset) {
        setAnimals(data.animals);
      } else {
        setAnimals((prev) => [...prev, ...data.animals]);
      }
      if (pageNum * data.pageSize >= data.total) {
        setHasMore(false);
      }
    } catch (e) {
      console.error('加载动物列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadAnimals(1, true);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            setPage((p) => {
              const next = p + 1;
              loadAnimals(next);
              return next;
            });
          }
        });
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadAnimals]);

  const openDetail = (animal: Animal) => {
    setSelectedAnimal(animal);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setTimeout(() => setSelectedAnimal(null), 300);
  };

  const openApplication = () => {
    setShowDetail(false);
    setShowApplication(true);
  };

  const closeApplication = () => {
    setShowApplication(false);
  };

  const handleAnimalAdded = (newAnimal: Animal) => {
    setAnimals((prev) => [newAnimal, ...prev]);
    setTotal((t) => t + 1);
  };

  const personalityTagIcon = (tag: PersonalityTag): string => {
    switch (tag) {
      case '友好': return '💝';
      case '胆小': return '🌸';
      case '活泼': return '⚡';
    }
  };

  const healthTagIcon = (status: HealthStatus): string => {
    switch (status) {
      case '已驱虫': return '🛡️';
      case '已疫苗': return '💉';
      case '已绝育': return '✂️';
    }
  };

  return (
    <div className="animal-list-page">
      <div className="page-header">
        <h1 className="page-title">等待温暖的家 🏠</h1>
        <p className="page-subtitle">
          共 <span className="highlight-text">{total}</span> 只小动物正在寻找爱它们的家人
        </p>
      </div>

      <div className="animal-waterfall">
        {animals.map((animal) => (
          <div
            key={animal.id}
            className="animal-card-enhanced"
            onClick={() => openDetail(animal)}
          >
            <LazyImage src={animal.photo} alt={animal.name} />
            <div className="card-content-enhanced">
              <div className="card-header-enhanced">
                <div>
                  <h3 className="animal-name-enhanced">{animal.name}</h3>
                  <p className="animal-breed-enhanced">{animal.breed}</p>
                </div>
                <span className={`gender-badge gender-${animal.gender === '公' ? 'male' : 'female'}`}>
                  {animal.gender === '公' ? '♂' : '♀'} {animal.age}岁
                </span>
              </div>

              <div className="tags-section">
                {animal.personalityTags.length > 0 && (
                  <div className="tags-group">
                    <span className="tags-group-label">性格</span>
                    <div className="tags-row">
                      {animal.personalityTags.slice(0, 2).map((tag) => (
                        <Tag
                          key={`p-${tag}`}
                          text={tag}
                          colors={personalityColors[tag]}
                          icon={personalityTagIcon(tag)}
                        />
                      ))}
                      {animal.personalityTags.length > 2 && (
                        <span className="more-tag">+{animal.personalityTags.length - 2}</span>
                      )}
                    </div>
                  </div>
                )}
                {animal.healthStatus.length > 0 && (
                  <div className="tags-group">
                    <span className="tags-group-label">健康</span>
                    <div className="tags-row">
                      {animal.healthStatus.slice(0, 2).map((status) => (
                        <Tag
                          key={`h-${status}`}
                          text={status}
                          colors={healthColors[status]}
                          icon={healthTagIcon(status)}
                        />
                      ))}
                      {animal.healthStatus.length > 2 && (
                        <span className="more-tag">+{animal.healthStatus.length - 2}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="load-more-sentinel">
        {loading && <div className="loading-spinner"></div>}
        {!hasMore && animals.length > 0 && (
          <p className="no-more-text">—— 已经到底啦，感谢关注 ——</p>
        )}
      </div>

      <button
        className="add-animal-btn"
        onClick={() => setShowAddModal(true)}
        title="添加新动物"
      >
        +
      </button>

      {showDetail && selectedAnimal && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div
            className="modal-content detail-modal modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                <span className="title-emoji">🐾</span>
                {selectedAnimal.name} 的资料卡
              </h2>
              <button className="modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-photo-wrapper">
                <div className="detail-photo-container">
                  <img
                    src={selectedAnimal.photo}
                    alt={selectedAnimal.name}
                    className="detail-photo"
                  />
                  <div className="detail-photo-overlay"></div>
                </div>
              </div>

              <div className="detail-info">
                <div className="detail-row">
                  <span className="detail-label">品种</span>
                  <span className="detail-value">{selectedAnimal.breed}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">年龄</span>
                  <span className="detail-value">{selectedAnimal.age} 岁</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">性别</span>
                  <span className="detail-value">{selectedAnimal.gender}</span>
                </div>
                <div className="detail-row detail-tags-section">
                  <span className="detail-label">性格标签</span>
                  <div className="detail-tags">
                    {selectedAnimal.personalityTags.map((tag) => (
                      <Tag
                        key={`dp-${tag}`}
                        text={tag}
                        colors={personalityColors[tag]}
                        icon={personalityTagIcon(tag)}
                      />
                    ))}
                  </div>
                </div>
                <div className="detail-row detail-tags-section">
                  <span className="detail-label">健康状况</span>
                  <div className="detail-tags">
                    {selectedAnimal.healthStatus.map((status) => (
                      <Tag
                        key={`dh-${status}`}
                        text={status}
                        colors={healthColors[status]}
                        icon={healthTagIcon(status)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="detail-description-title">关于 {selectedAnimal.name}</div>
              <p className="detail-description">{selectedAnimal.description}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeDetail}>
                稍后再说
              </button>
              <button className="btn btn-primary" onClick={openApplication}>
                💖 申请领养 {selectedAnimal.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplication && selectedAnimal && (
        <ApplicationForm
          animal={selectedAnimal}
          onClose={closeApplication}
        />
      )}

      {showAddModal && (
        <AddAnimalModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAnimalAdded}
        />
      )}
    </div>
  );
}
