import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRecipesContext, useFavoritesContext, useSearchContext } from '../App';

const tagColors = [
  { bg: '#FFF3E0', color: '#E65100' },
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#FCE4EC', color: '#AD1457' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FFF8E1', color: '#F57F17' },
  { bg: '#E0F7FA', color: '#00695C' },
  { bg: '#FFEBEE', color: '#C62828' },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes } = useRecipesContext();
  const { isFavorite, toggleFavorite, getAdjustedLikes } = useFavoritesContext();
  const { setActiveTag } = useSearchContext();

  const recipe = useMemo(() => recipes.find((r) => r.id === Number(id)), [recipes, id]);

  const [liked, setLiked] = useState(false);
  const [showFlash, setShowFlash] = useState<null | 'plus' | 'minus'>(null);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [scrolled, setScrolled] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [detailColumns, setDetailColumns] = useState<'1fr 280px' | '1fr'>('1fr 280px');

  useEffect(() => {
    if (recipe) {
      setLiked(isFavorite(recipe.id));
    }
  }, [recipe, isFavorite]);

  useEffect(() => {
    const maskTimer = setTimeout(() => setShowMask(true), 200);
    return () => clearTimeout(maskTimer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) setDetailColumns('1fr');
      else setDetailColumns('1fr 280px');
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (!recipe) {
    return (
      <div style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text-primary)' }}>食谱不存在</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const handleHeartClick = () => {
    const wasFavorite = liked;
    const nowFavorite = toggleFavorite(recipe.id);
    setLiked(nowFavorite);
    setHeartAnimating(true);
    setShowFlash(nowFavorite ? 'plus' : 'minus');
    setTimeout(() => setHeartAnimating(false), 500);
    setTimeout(() => setShowFlash(null), 800);
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    navigate('/');
  };

  const adjustedLikes = getAdjustedLikes(recipe.id, recipe.likes);

  return (
    <div>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 24px',
          backgroundColor: scrolled ? 'rgba(255, 245, 230, 0.85)' : 'rgba(255, 245, 230, 0.6)',
          backdropFilter: scrolled ? 'blur(12px)' : 'blur(6px)',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'blur(6px)',
          borderBottom: scrolled ? '1px solid rgba(255, 140, 0, 0.15)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'rgba(255,255,255,0.8)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回
          </button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF8C00, #FFA940)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v6a6 6 0 0 0 12 0V2" />
                <path d="M9 2h6" />
                <path d="M12 14v8" />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)' }}>
              美食食谱
            </span>
          </Link>
        </div>
      </nav>

      <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
        {!imgLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#F0E6D6',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
        <img
          src={recipe.image}
          alt={recipe.title}
          onLoad={() => setImgLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
            opacity: showMask ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '40px 24px',
            maxWidth: '1000px',
            margin: '0 auto',
            opacity: showMask ? 1 : 0,
            transform: showMask ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {recipe.tags.map((tag) => {
                  const tc = getTagColor(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        backgroundColor: tc.bg,
                        color: tc.color,
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
              <h1
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: 'white',
                  marginBottom: '10px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  lineHeight: 1.2,
                }}
              >
                {recipe.title}
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', maxWidth: '600px' }}>
                {recipe.description}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <button
                onClick={handleHeartClick}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s',
                  animation: heartAnimating ? 'heartBeat 0.5s ease' : 'none',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill={liked ? 'var(--heart-color)' : 'none'}
                  stroke={liked ? 'var(--heart-color)' : '#999'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {showFlash && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      right: '50%',
                      transform: 'translateX(50%)',
                      color: showFlash === 'plus' ? 'var(--heart-color)' : 'white',
                      fontWeight: 700,
                      fontSize: '16px',
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      animation: 'likeFlash 0.8s ease forwards',
                    }}
                  >
                    {showFlash === 'plus' ? '+1' : '-1'}
                  </span>
                )}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '14px', fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--heart-color)" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{adjustedLikes}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: detailColumns, gap: '32px' }}>
          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  width: '4px',
                  height: '22px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--primary-color)',
                }}
              />
              烹饪步骤
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recipe.steps.map((step, index) => {
                const isExpanded = expandedSteps.has(index);
                const isShort = step.length <= 30;
                return (
                  <div
                    key={index}
                    onClick={() => !isShort && toggleStep(index)}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      borderRadius: 'var(--radius)',
                      padding: '16px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      gap: '16px',
                      cursor: isShort ? 'default' : 'pointer',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isShort) e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isShort) e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF8C00, #FFA940)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(255, 140, 0, 0.3)',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          lineHeight: 1.7,
                          overflow: 'hidden',
                          display: isShort ? 'block' : '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'unset' : 1,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {step}
                      </p>
                      {!isShort && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--primary-color)',
                            marginTop: '6px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isExpanded ? '收起' : '展开详情'}
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                              transition: 'transform 0.3s ease',
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  width: '4px',
                  height: '22px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--primary-color)',
                }}
              />
              所需食材
            </h2>
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 4px',
                      borderBottom: index < recipe.ingredients.length - 1 ? '1px dashed #F0E6D6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '22px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--primary-color)',
                  }}
                />
                相关标签
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recipe.tags.map((tag) => {
                  const tc = getTagColor(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '14px',
                        backgroundColor: tc.bg,
                        color: tc.color,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
