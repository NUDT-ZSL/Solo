import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Animal, getAnimals, submitApplication } from '../api';

/* ---------- Types ---------- */
interface AdoptModalProps {
  animal: Animal | null;
  open: boolean;
  onClose: () => void;
}

/* ---------- Adopt Modal ---------- */
function AdoptModal({ animal, open, onClose }: AdoptModalProps) {
  const [form, setForm] = useState({
    applicantName: '',
    phone: '',
    address: '',
    experience: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ applicantName: '', phone: '', address: '', experience: '' });
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [open, animal?._id]);

  if (!open || !animal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await submitApplication({
        animalId: animal._id,
        animalName: animal.name,
        ...form,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || submitted;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000050',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .adopt-input {
          width: 100%; padding: 11px 14px; border-radius: 12px;
          border: 2px solid #e5e7eb; font-size: 14px; outline: none;
          background: #ffffff; color: #1f2937; transition: all 0.3s ease;
          box-sizing: border-box; font-family: inherit;
        }
        .adopt-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.12); }
        .adopt-input::placeholder { color: #9ca3af; }
        .adopt-input:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: '92vw',
          background: '#ffffff',
          borderRadius: 12,
          padding: 28,
          animation: 'scaleIn 0.3s ease',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: '0 0 6px 0',
            color: '#1f2937',
          }}
        >
          申请领养
        </h3>
        <p style={{ color: '#6b7280', margin: '0 0 20px 0', fontSize: 14 }}>
          您正在申请领养：
          <span style={{ color: '#f97316', fontWeight: 600 }}>{animal.name}</span>
        </p>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 13,
                color: '#374151',
                fontWeight: 600,
                marginBottom: 6,
                display: 'block',
              }}
            >
              申请人姓名
            </label>
            <input
              required
              className="adopt-input"
              value={form.applicantName}
              disabled={disabled}
              onChange={(e) =>
                setForm({ ...form, applicantName: e.target.value })
              }
              placeholder="请输入您的姓名"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                color: '#374151',
                fontWeight: 600,
                marginBottom: 6,
                display: 'block',
              }}
            >
              联系电话
            </label>
            <input
              required
              type="tel"
              className="adopt-input"
              value={form.phone}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="请输入联系电话"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                color: '#374151',
                fontWeight: 600,
                marginBottom: 6,
                display: 'block',
              }}
            >
              家庭住址
            </label>
            <input
              required
              className="adopt-input"
              value={form.address}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="请输入家庭住址"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                color: '#374151',
                fontWeight: 600,
                marginBottom: 6,
                display: 'block',
              }}
            >
              养宠经验简述
            </label>
            <textarea
              required
              rows={3}
              className="adopt-input"
              style={{ resize: 'none' }}
              value={form.experience}
              disabled={disabled}
              onChange={(e) =>
                setForm({ ...form, experience: e.target.value })
              }
              placeholder="请描述您的养宠经验"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#4b5563',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                transition: 'all 0.3s ease',
                fontSize: 14,
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={disabled}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: disabled ? '#9ca3af' : '#f97316',
                color: '#ffffff',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                fontSize: 14,
              }}
            >
              {submitting
                ? '提交中...'
                : submitted
                ? '✓ 已提交'
                : '提交申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Animal Card ---------- */
interface AnimalCardProps {
  animal: Animal;
  onAdopt: () => void;
}

function AnimalCard({ animal, onAdopt }: AnimalCardProps) {
  const gradient =
    animal.species === 'cat'
      ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
      : animal.species === 'dog'
      ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
      : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';

  const emoji =
    animal.species === 'cat'
      ? '🐱'
      : animal.species === 'dog'
      ? '🐶'
      : '🐾';

  return (
    <div
      style={{
        width: 300,
        height: 440,
        borderRadius: 16,
        background: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      className="animal-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow =
          '0 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow =
          '0 4px 12px rgba(0,0,0,0.08)';
      }}
    >
      <div
        style={{
          height: 180,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {animal.thumbnail ? (
          <img
            src={animal.thumbnail}
            alt={animal.name}
            loading="lazy"
            style={{
              width: 150,
              height: 150,
              objectFit: 'cover',
              borderRadius: 12,
              border: '4px solid rgba(255,255,255,0.8)',
            }}
          />
        ) : (
          <div style={{ fontSize: 80 }}>{emoji}</div>
        )}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 10px',
            borderRadius: 20,
            background: animal.vaccinated ? '#34d399' : '#f87171',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {animal.vaccinated ? '✓ 已接种' : '待接种'}
        </div>
      </div>
      <div
        style={{
          padding: 18,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              color: '#1f2937',
            }}
          >
            {animal.name}
          </h3>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {animal.gender}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 8,
              background: '#fef3c7',
              color: '#92400e',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {animal.breed}
          </span>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 8,
              background: '#dbeafe',
              color: '#1e40af',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {animal.age} 岁
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.5,
            margin: '4px 0 0 0',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {animal.personality}
        </p>
      </div>
      <div style={{ padding: '0 18px 18px 18px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdopt();
          }}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            border: 'none',
            background: '#f97316',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ea580c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f97316';
          }}
        >
          ❤️ 申请领养
        </button>
      </div>
    </div>
  );
}

/* ---------- Page Component ---------- */
const PAGE_SIZE = 24;

export default function AdoptPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadAnimals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAnimals();
      setAnimals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnimals();
  }, [loadAnimals]);

  const matchesSearch = useCallback((a: Animal, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
      a.name.toLowerCase().includes(lower) ||
      a.breed.toLowerCase().includes(lower) ||
      (a.species || '').toLowerCase().includes(lower)
    );
  }, []);

  const filtered = useMemo(
    () => animals.filter((a) => matchesSearch(a, search)),
    [animals, search, matchesSearch]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filtered.length) {
          setVisibleCount((n) =>
            Math.min(n + PAGE_SIZE, filtered.length)
          );
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, filtered.length]);

  const displayedAnimals = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 24px 80px 24px',
      }}
      ref={scrollRef}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: '#1f2937',
            letterSpacing: '-0.5px',
          }}
        >
          <span style={{ color: '#f97316' }}>❤</span> 给它们一个温暖的家
        </h1>
        <p style={{ color: '#6b7280', marginTop: 8, fontSize: 15 }}>
          每一只毛孩子都在等待遇见属于它的家人
        </p>
      </div>

      <div
        style={{
          position: 'sticky',
          top: 80,
          zIndex: 30,
          padding: '12px 0 24px 0',
          marginTop: -12,
          display: 'flex',
          justifyContent: 'center',
          background:
            'linear-gradient(to bottom, #f1f5f9 60%, rgba(241,245,249,0) 100%)',
        }}
      >
        <div
          style={{
            width: '60%',
            minWidth: 280,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 18,
              color: '#9ca3af',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索品种关键字，如：橘猫、金毛、柯基..."
            className="adopt-search-input"
          />
          <style>{`
            .adopt-search-input {
              width: 100%;
              padding: 16px 20px 16px 52px;
              border-radius: 16px;
              border: 2px solid #e5e7eb;
              font-size: 15px;
              outline: none;
              background: #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.04);
              color: #1f2937;
              transition: all 0.3s ease;
              box-sizing: border-box;
              font-family: inherit;
            }
            .adopt-search-input::placeholder { color: #9ca3af; }
            .adopt-search-input:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
            }
            .adopt-search-input:focus::placeholder { color: #3b82f6; opacity: 0.7; }
            @keyframes cardAppear {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .card-wrap {
              animation: cardAppear 0.3s ease both;
            }
            @media (max-width: 768px) {
              .cards-grid { grid-template-columns: 1fr !important; justify-items: center; }
            }
          `}</style>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            color: '#6b7280',
            fontSize: 16,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
          加载中...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            color: '#6b7280',
            fontSize: 16,
            background: '#ffffff',
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
          <div
            style={{
              fontWeight: 600,
              color: '#374151',
              fontSize: 18,
              marginBottom: 4,
            }}
          >
            暂无符合条件的小动物
          </div>
          <div style={{ fontSize: 14 }}>试试其他关键字，或稍后再来看看~</div>
        </div>
      ) : (
        <>
          <div
            className="cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 300px)',
              gap: 28,
              justifyContent: 'center',
            }}
          >
            {displayedAnimals.map((animal, i) => (
              <div
                className="card-wrap"
                key={animal._id}
                style={{ animationDelay: `${(i % PAGE_SIZE) * 0.02}s` }}
              >
                <AnimalCard
                  animal={animal}
                  onAdopt={() => {
                    setSelectedAnimal(animal);
                    setModalOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 20 }} />
          {visibleCount < filtered.length && (
            <div
              style={{
                textAlign: 'center',
                padding: 30,
                color: '#94a3b8',
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  borderTopColor: '#f97316',
                  animation: 'spin 0.8s linear infinite',
                  marginRight: 10,
                  verticalAlign: 'middle',
                }}
              />
              加载更多 ({visibleCount}/{filtered.length})...
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
            </div>
          )}
        </>
      )}
      <AdoptModal
        animal={selectedAnimal}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
