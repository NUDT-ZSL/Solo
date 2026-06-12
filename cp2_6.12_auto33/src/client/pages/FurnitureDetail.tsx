import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Ruler,
  Calendar,
  MapPin,
  Clock,
  X,
  Home,
  User,
  Mail,
  Phone,
  ArrowRight,
  ChevronRight as BreadcrumbArrow,
} from 'lucide-react';
import { getFurnitureDetail, getFurnitureReviews, createExchangeRequest } from '../api';
import type { Furniture, Review } from '../types';
import { CATEGORY_MAP, STATUS_MAP, STATUS_COLOR } from '../types';
import { formatRelativeTime } from '../utils/format';
import { useAppStore } from '../store';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '28px 28px 60px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    fontSize: 14,
    color: '#8b7355',
  },
  breadcrumbLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    color: '#8b7355',
    textDecoration: 'none',
  },
  breadcrumbCurrent: {
    color: '#5a4a3a',
    fontWeight: 500,
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: 32,
  },
  carouselWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    borderRadius: 16,
    backgroundColor: '#FAF7F3',
    overflow: 'hidden',
  },
  carouselTrack: {
    display: 'flex',
    width: '100%',
    height: '100%',
    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  carouselSlide: {
    minWidth: '100%',
    height: '100%',
    flexShrink: 0,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  carouselImagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0ebe3',
    color: '#b09e84',
    fontSize: 14,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%) scale(1)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 12px rgba(90, 74, 58, 0.15)',
    opacity: 0.4,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    color: '#5a4a3a',
    zIndex: 2,
  },
  arrowButtonLeft: {
    left: 16,
  },
  arrowButtonRight: {
    right: 16,
  },
  arrowButtonHover: {
    opacity: 1,
    transform: 'translateY(-50%) scale(1.2)',
  },
  arrowButtonActive: {
    transform: 'translateY(-50%) scale(0.95)',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 8,
    zIndex: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#d6ccc0',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    border: 'none',
    padding: 0,
  },
  dotActive: {
    backgroundColor: '#d4a574',
    transform: 'scale(1.25)',
  },
  infoPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#3a2e22',
    lineHeight: 1.3,
    margin: 0,
  },
  statusTag: {
    flexShrink: 0,
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  infoCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    padding: 20,
    border: '1px solid rgba(139, 115, 85, 0.08)',
    boxShadow: '0 2px 8px rgba(90, 74, 58, 0.04)',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid rgba(139, 115, 85, 0.06)',
  },
  infoItemLast: {
    borderBottom: 'none',
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#faf2e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#b8865c',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: '#a08f78',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 500,
    color: '#3a2e22',
  },
  applyBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(184, 134, 92, 0.3)',
  },
  applyBtnDisabled: {
    background: '#d6ccc0',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  reviewsSection: {
    marginTop: 48,
  },
  reviewsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#3a2e22',
    margin: 0,
  },
  averageRating: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  averageRatingValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#d4a574',
  },
  reviewItem: {
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    border: '1px solid rgba(139, 115, 85, 0.08)',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#3a2e22',
  },
  reviewStars: {
    display: 'flex',
    gap: 2,
    marginTop: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: '#a08f78',
  },
  reviewContent: {
    fontSize: 14,
    color: '#5a4a3a',
    lineHeight: 1.6,
    paddingLeft: 52,
  },
  skeletonBlock: {
    backgroundColor: '#f0ebe3',
    borderRadius: 8,
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  },
  emptyReviews: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#a08f78',
    fontSize: 14,
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    border: '1px solid rgba(139, 115, 85, 0.08)',
  },
  overlayMask: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(58, 46, 34, 0.45)',
    zIndex: 100,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  overlayMaskVisible: {
    opacity: 1,
  },
  sidePanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 440,
    maxWidth: '100%',
    backgroundColor: '#fdf8f0',
    zIndex: 101,
    transform: 'translateX(100%)',
    transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 24px rgba(90, 74, 58, 0.12)',
  },
  sidePanelVisible: {
    transform: 'translateX(0)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
    backgroundColor: '#fffdf8',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#3a2e22',
    margin: 0,
  },
  panelCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b7355',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  panelBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
  },
  panelFurnitureInfo: {
    backgroundColor: '#faf2e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  panelFurnitureImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    objectFit: 'cover',
    flexShrink: 0,
  },
  panelFurnitureName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#3a2e22',
    marginBottom: 4,
  },
  panelFurnitureCategory: {
    fontSize: 12,
    color: '#8b7355',
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#5a4a3a',
    marginBottom: 8,
  },
  formLabelRequired: {
    color: '#e53935',
    marginLeft: 4,
  },
  formInputWrap: {
    position: 'relative',
  },
  formInputIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a08f78',
    pointerEvents: 'none',
  },
  formInput: {
    width: '100%',
    height: 44,
    padding: '0 14px 0 40px',
    borderRadius: 10,
    border: '1.5px solid rgba(139, 115, 85, 0.15)',
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#3a2e22',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  formTextarea: {
    width: '100%',
    minHeight: 90,
    padding: '12px 14px 12px 40px',
    borderRadius: 10,
    border: '1.5px solid rgba(139, 115, 85, 0.15)',
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#3a2e22',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  panelFooter: {
    padding: '16px 24px 24px',
    borderTop: '1px solid rgba(139, 115, 85, 0.1)',
    backgroundColor: '#fffdf8',
  },
  submitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(184, 134, 92, 0.3)',
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  toastContainer: {
    position: 'fixed',
    top: 88,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
  },
  toast: {
    backgroundColor: '#fff',
    padding: '12px 20px',
    borderRadius: 10,
    boxShadow: '0 4px 20px rgba(90, 74, 58, 0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#3a2e22',
    border: '1px solid rgba(139, 115, 85, 0.1)',
    animation: 'toast-in 0.3s ease',
  },
  toastSuccess: {
    borderLeft: '3px solid #10b981',
  },
  toastError: {
    borderLeft: '3px solid #e53935',
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

const keyframesStyle = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= rating ? '#f59e0b' : 'transparent'}
          color={i <= rating ? '#f59e0b' : '#d6ccc0'}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

function Skeleton({
  width,
  height,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...styles.skeletonBlock,
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style,
      }}
    />
  );
}

export default function FurnitureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);

  const [furniture, setFurniture] = useState<Furniture | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [leftArrowHovered, setLeftArrowHovered] = useState(false);
  const [leftArrowActive, setLeftArrowActive] = useState(false);
  const [rightArrowHovered, setRightArrowHovered] = useState(false);
  const [rightArrowActive, setRightArrowActive] = useState(false);

  const [showPanel, setShowPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [maskVisible, setMaskVisible] = useState(false);

  const [formContact, setFormContact] = useState(currentUser.name);
  const [formEmail, setFormEmail] = useState(currentUser.email || '');
  const [formPhone, setFormPhone] = useState(currentUser.phone || '');
  const [formExpectedTime, setFormExpectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-furniture-detail', 'true');
    styleEl.textContent = keyframesStyle;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([getFurnitureDetail(id), getFurnitureReviews(id)])
      .then(([detail, reviewList]) => {
        setFurniture(detail);
        setReviews(reviewList || []);
      })
      .catch((err) => {
        console.error('加载家具详情失败:', err);
        setError('加载失败，请稍后重试');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (showPanel) {
      requestAnimationFrame(() => {
        setMaskVisible(true);
        requestAnimationFrame(() => {
          setPanelVisible(true);
        });
      });
    } else {
      setPanelVisible(false);
      setTimeout(() => {
        setMaskVisible(false);
      }, 350);
    }
  }, [showPanel]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const images = furniture?.images || [];
  const totalSlides = Math.max(images.length, 1);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleDotClick = (idx: number) => {
    setCurrentIndex(idx);
  };

  const openPanel = () => {
    if (furniture?.status === 'exchanged') return;
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!furniture || !id) return;
    if (!formContact.trim() || !formEmail.trim() || !formPhone.trim()) {
      setToast({ message: '请填写完整的联系方式', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await createExchangeRequest({
        furnitureId: id,
        furnitureName: furniture.name,
        fromUserId: currentUser.id,
        fromUserName: formContact.trim(),
        fromUserAvatar: currentUser.avatar,
        toUserId: furniture.userId,
        toUserName: '家具主人',
        contact: formContact.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        expectedTime: formExpectedTime.trim() || '待定',
        status: 'pending',
        read: 0,
      });
      setToast({ message: '交换申请已提交，等待家具主人确认', type: 'success' });
      setTimeout(() => {
        closePanel();
      }, 600);
    } catch (err) {
      console.error('提交失败:', err);
      setToast({ message: '提交失败，请稍后重试', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const leftArrowMerged: React.CSSProperties = {
    ...styles.arrowButton,
    ...styles.arrowButtonLeft,
    ...(leftArrowHovered ? styles.arrowButtonHover : {}),
    ...(leftArrowActive ? styles.arrowButtonActive : {}),
  };

  const rightArrowMerged: React.CSSProperties = {
    ...styles.arrowButton,
    ...styles.arrowButtonRight,
    ...(rightArrowHovered ? styles.arrowButtonHover : {}),
    ...(rightArrowActive ? styles.arrowButtonActive : {}),
  };

  const applyBtnDisabled = furniture?.status === 'exchanged';
  const applyBtnMerged: React.CSSProperties = {
    ...styles.applyBtn,
    ...(applyBtnDisabled ? styles.applyBtnDisabled : {}),
  };

  const submitBtnMerged: React.CSSProperties = {
    ...styles.submitBtn,
    ...(submitting ? styles.submitBtnLoading : {}),
  };

  return (
    <div style={styles.container}>
      <div style={styles.breadcrumb}>
        <a
          onClick={() => navigate('/')}
          style={styles.breadcrumbLink}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = '#5a4a3a';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = '#8b7355';
          }}
        >
          <Home size={14} />
          <span>首页</span>
        </a>
        <BreadcrumbArrow size={14} style={{ color: '#c8bcac' }} />
        <span style={styles.breadcrumbCurrent}>
          {loading ? '加载中...' : furniture?.name || '家具详情'}
        </span>
      </div>

      {error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a08f78' }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid rgba(139,115,85,0.2)',
              background: '#fff',
              color: '#8b7355',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      ) : (
        <>
          <div style={styles.mainLayout}>
            <div>
              {loading ? (
                <Skeleton
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    borderRadius: 16,
                  }}
                />
              ) : (
                <div style={styles.carouselWrapper}>
                  <div
                    style={{
                      ...styles.carouselTrack,
                      transform: `translateX(-${100 * currentIndex}%)`,
                    }}
                  >
                    {images.length === 0 ? (
                      <div style={styles.carouselSlide}>
                        <div style={styles.carouselImagePlaceholder}>暂无图片</div>
                      </div>
                    ) : (
                      images.map((img, idx) => (
                        <div style={styles.carouselSlide} key={idx}>
                          <img
                            src={img}
                            alt={`${furniture?.name || ''} ${idx + 1}`}
                            style={styles.carouselImage}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                              const parent = (e.currentTarget as HTMLImageElement)
                                .parentElement;
                              if (parent) {
                                const ph = document.createElement('div');
                                Object.assign(ph.style, styles.carouselImagePlaceholder);
                                ph.textContent = '图片加载失败';
                                parent.appendChild(ph);
                              }
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>

                  {totalSlides > 1 && (
                    <>
                      <button
                        aria-label="上一张"
                        style={leftArrowMerged}
                        onClick={handlePrev}
                        onMouseEnter={() => setLeftArrowHovered(true)}
                        onMouseLeave={() => {
                          setLeftArrowHovered(false);
                          setLeftArrowActive(false);
                        }}
                        onMouseDown={() => setLeftArrowActive(true)}
                        onMouseUp={() => setLeftArrowActive(false)}
                      >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                      </button>
                      <button
                        aria-label="下一张"
                        style={rightArrowMerged}
                        onClick={handleNext}
                        onMouseEnter={() => setRightArrowHovered(true)}
                        onMouseLeave={() => {
                          setRightArrowHovered(false);
                          setRightArrowActive(false);
                        }}
                        onMouseDown={() => setRightArrowActive(true)}
                        onMouseUp={() => setRightArrowActive(false)}
                      >
                        <ChevronRight size={22} strokeWidth={2.5} />
                      </button>
                    </>
                  )}

                  {totalSlides > 1 && (
                    <div style={styles.dotsContainer}>
                      {Array.from({ length: totalSlides }).map((_, idx) => (
                        <button
                          key={idx}
                          aria-label={`第 ${idx + 1} 张`}
                          style={{
                            ...styles.dot,
                            ...(idx === currentIndex ? styles.dotActive : {}),
                          }}
                          onClick={() => handleDotClick(idx)}
                          onMouseEnter={(e) => {
                            if (idx !== currentIndex) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                '#b8865c';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (idx !== currentIndex) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                '#d6ccc0';
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.infoPanel}>
              {loading ? (
                <>
                  <Skeleton height={32} style={{ width: '70%', marginBottom: 8 }} />
                  <Skeleton height={60} style={{ marginBottom: 4 }} />
                  <Skeleton height={60} style={{ marginBottom: 4 }} />
                  <Skeleton height={48} />
                </>
              ) : furniture ? (
                <>
                  <div style={styles.titleRow}>
                    <h1 style={styles.title}>{furniture.name}</h1>
                    <span
                      style={{
                        ...styles.statusTag,
                        backgroundColor: STATUS_COLOR[furniture.status].bg,
                        color: STATUS_COLOR[furniture.status].text,
                      }}
                    >
                      {STATUS_MAP[furniture.status]}
                    </span>
                  </div>

                  <div style={styles.infoCard}>
                    <div style={styles.infoItem}>
                      <div style={styles.infoIconWrap}>
                        <Ruler size={18} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.infoLabel}>尺寸</div>
                        <div style={styles.infoValue}>{furniture.size}</div>
                      </div>
                    </div>
                    <div style={styles.infoItem}>
                      <div style={styles.infoIconWrap}>
                        <Calendar size={18} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.infoLabel}>使用年限</div>
                        <div style={styles.infoValue}>{furniture.years} 年</div>
                      </div>
                    </div>
                    <div style={styles.infoItem}>
                      <div style={styles.infoIconWrap}>
                        <MapPin size={18} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.infoLabel}>所在城市</div>
                        <div style={styles.infoValue}>{furniture.city}</div>
                      </div>
                    </div>
                    <div style={{ ...styles.infoItem, ...styles.infoItemLast }}>
                      <div style={styles.infoIconWrap}>
                        <Clock size={18} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.infoLabel}>可交换时间</div>
                        <div style={styles.infoValue}>{furniture.timeRange}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    style={applyBtnMerged}
                    onClick={openPanel}
                    disabled={applyBtnDisabled}
                    onMouseEnter={(e) => {
                      if (!applyBtnDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'linear-gradient(135deg, #c89566 0%, #a67550 100%)';
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          'translateY(-1px)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          '0 6px 18px rgba(184, 134, 92, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = applyBtnDisabled
                        ? '#d6ccc0'
                        : 'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = applyBtnDisabled
                        ? 'none'
                        : '0 4px 14px rgba(184, 134, 92, 0.3)';
                    }}
                    onMouseDown={(e) => {
                      if (!applyBtnDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!applyBtnDisabled) {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          'translateY(-1px)';
                      }
                    }}
                  >
                    <ArrowRight size={18} strokeWidth={2.5} />
                    {furniture.status === 'exchanged'
                      ? '该家具已完成交换'
                      : furniture.status === 'reserved'
                        ? '该家具已被预约，仍然申请'
                        : '申请交换'}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div style={styles.reviewsSection}>
            <div style={styles.reviewsHeader}>
              <h2 style={styles.reviewsTitle}>
                评价 <span style={{ color: '#a08f78', fontWeight: 500 }}>({reviews.length})</span>
              </h2>
              {reviews.length > 0 && (
                <div style={styles.averageRating}>
                  <Stars rating={Math.round(averageRating)} size={18} />
                  <span style={styles.averageRatingValue}>{averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {loading ? (
              <>
                <Skeleton height={90} style={{ marginBottom: 12 }} />
                <Skeleton height={90} style={{ marginBottom: 12 }} />
                <Skeleton height={90} />
              </>
            ) : reviews.length === 0 ? (
              <div style={styles.emptyReviews}>暂无评价，成为第一个评价的人吧~</div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} style={styles.reviewItem}>
                  <div style={styles.reviewHeader}>
                    <img
                      src={review.avatar}
                      alt={review.userName}
                      style={styles.reviewAvatar}
                    />
                    <div style={styles.reviewUserInfo}>
                      <div style={styles.reviewUserName}>{review.userName}</div>
                      <Stars rating={review.rating} size={13} />
                    </div>
                    <div style={styles.reviewTime}>{formatRelativeTime(review.createdAt)}</div>
                  </div>
                  <div style={styles.reviewContent}>{review.content}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {(maskVisible || showPanel) && (
        <>
          <div
            style={{
              ...styles.overlayMask,
              ...(maskVisible ? styles.overlayMaskVisible : {}),
            }}
            onClick={closePanel}
          />
          <div
            style={{
              ...styles.sidePanel,
              ...(panelVisible ? styles.sidePanelVisible : {}),
            }}
          >
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>申请交换</h3>
              <button
                aria-label="关闭"
                style={styles.panelCloseBtn}
                onClick={closePanel}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'rgba(139, 115, 85, 0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div style={styles.panelBody}>
              {furniture && (
                <div style={styles.panelFurnitureInfo}>
                  <img
                    src={furniture.images[0] || ''}
                    alt={furniture.name}
                    style={styles.panelFurnitureImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect fill="%23f0ebe3" width="56" height="56"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23b09e84" font-size="10" font-family="sans-serif">暂无图</text></svg>';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.panelFurnitureName}>{furniture.name}</div>
                    <div style={styles.panelFurnitureCategory}>
                      {CATEGORY_MAP[furniture.category]} · {furniture.city}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    联系人
                    <span style={styles.formLabelRequired}>*</span>
                  </label>
                  <div style={styles.formInputWrap}>
                    <User size={16} strokeWidth={2} style={styles.formInputIcon} />
                    <input
                      type="text"
                      style={styles.formInput}
                      placeholder="请输入您的姓名"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(184, 134, 92, 0.4)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(184, 134, 92, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    邮箱
                    <span style={styles.formLabelRequired}>*</span>
                  </label>
                  <div style={styles.formInputWrap}>
                    <Mail size={16} strokeWidth={2} style={styles.formInputIcon} />
                    <input
                      type="email"
                      style={styles.formInput}
                      placeholder="请输入您的邮箱"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(184, 134, 92, 0.4)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(184, 134, 92, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    电话
                    <span style={styles.formLabelRequired}>*</span>
                  </label>
                  <div style={styles.formInputWrap}>
                    <Phone size={16} strokeWidth={2} style={styles.formInputIcon} />
                    <input
                      type="tel"
                      style={styles.formInput}
                      placeholder="请输入您的联系电话"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(184, 134, 92, 0.4)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(184, 134, 92, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>期望交换时间</label>
                  <div style={styles.formInputWrap}>
                    <Calendar size={16} strokeWidth={2} style={styles.formInputIcon} />
                    <textarea
                      style={styles.formTextarea}
                      placeholder="例如：本周五下午 3 点至 6 点"
                      value={formExpectedTime}
                      onChange={(e) => setFormExpectedTime(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(184, 134, 92, 0.4)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(184, 134, 92, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div style={styles.panelFooter}>
              <button
                style={submitBtnMerged}
                onClick={handleSubmit}
                disabled={submitting}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'linear-gradient(135deg, #c89566 0%, #a67550 100%)';
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      'translateY(-1px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 6px 18px rgba(184, 134, 92, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg, #d4a574 0%, #b8865c 100%)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 4px 14px rgba(184, 134, 92, 0.3)';
                }}
                onMouseDown={(e) => {
                  if (!submitting) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!submitting) {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      'translateY(-1px)';
                  }
                }}
              >
                {submitting ? (
                  <>
                    <div style={styles.loadingSpinner} />
                    <span>提交中...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} strokeWidth={2.5} />
                    <span>提交申请</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={styles.toastContainer}>
          <div
            style={{
              ...styles.toast,
              ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError),
            }}
          >
            {toast.type === 'success' ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={10} stroke="#e53935" strokeWidth={2} />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="#e53935"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
