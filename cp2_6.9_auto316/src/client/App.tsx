import { useState, useEffect, useCallback, useRef } from 'react';
import ItemCard, { Item } from './components/ItemCard';

interface NewItemForm {
  title: string;
  description: string;
  imageUrl: string;
}

const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; text-shadow: 0 0 10px rgba(160,174,192,0.3); }
    50% { opacity: 1; text-shadow: 0 0 20px rgba(160,174,192,0.6); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form, setForm] = useState<NewItemForm>({
    title: '',
    description: '',
    imageUrl: '',
  });
  const [error, setError] = useState<string>('');
  const isFirstLoad = useRef(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = (await res.json()) as Item[];
        if (!isFirstLoad.current) {
          setIsRefreshing(true);
          setTimeout(() => setIsRefreshing(false), 500);
        }
        isFirstLoad.current = false;
        setItems(data);
      }
    } catch (err) {
      console.error('获取商品失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 15 * 1000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('删除商品失败:', err);
    }
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim()) {
      setError('标题和描述是必填项');
      return;
    }
    if (form.title.length > 20) {
      setError('标题不能超过20个字符');
      return;
    }
    if (form.description.length > 50) {
      setError('描述不能超过50个字符');
      return;
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        setForm({ title: '', description: '', imageUrl: '' });
        setIsModalOpen(false);
        fetchItems();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error || '创建商品失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    }
  };

  const openModal = () => {
    setError('');
    setForm({ title: '', description: '', imageUrl: '' });
    setIsModalOpen(true);
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <h1
              style={{
                color: '#E2E8F0',
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '2px',
              }}
            >
              ⚡ 瞬态商店
            </h1>
            <button
              onClick={openModal}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.filter = 'none';
              }}
            >
              ＋ 发布新商品
            </button>
          </header>

          {items.length === 0 && !isRefreshing ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
              }}
            >
              <p
                style={{
                  color: '#A0AEC0',
                  fontSize: '18px',
                  animation: 'pulse 3s ease-in-out infinite, fadeIn 0.5s ease',
                }}
              >
                这里空空的，快发布你的第一个瞬态商品吧！
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                transition: 'opacity 0.5s ease',
                opacity: isRefreshing ? 0.3 : 1,
              }}
            >
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  isRemoving={removingIds.has(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'overlayIn 0.3s ease',
          }}
        >
          <div
            style={{
              background: 'rgba(30,30,50,0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '32px',
              width: '90%',
              maxWidth: '440px',
              animation: 'modalIn 0.3s ease',
            }}
          >
            <h2
              style={{
                color: '#E2E8F0',
                fontSize: '22px',
                fontWeight: 600,
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              发布新商品
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: '#A0AEC0',
                    fontSize: '13px',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  标题 <span style={{ color: '#E53E3E' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={20}
                  placeholder="最多20个字符"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <div style={{ textAlign: 'right', color: '#718096', fontSize: '11px', marginTop: '4px' }}>
                  {form.title.length}/20
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    color: '#A0AEC0',
                    fontSize: '13px',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  描述 <span style={{ color: '#E53E3E' }}>*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={50}
                  placeholder="最多50个字符"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <div style={{ textAlign: 'right', color: '#718096', fontSize: '11px', marginTop: '4px' }}>
                  {form.description.length}/50
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    color: '#A0AEC0',
                    fontSize: '13px',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  图片URL（可选）
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="留空将使用渐变色占位"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: 'rgba(229,62,62,0.15)',
                    border: '1px solid rgba(229,62,62,0.3)',
                    color: '#FC8181',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#A0AEC0',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.filter = 'none';
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.filter = 'none';
                  }}
                >
                  发布
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
