import { useEffect, useState, useRef } from 'react';
import { UserProfile, DishRecord } from '../types';

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = performance.now();
    const startVal = 0;
    const animate = (now: number) => {
      if (startTime.current === null) return;
      const elapsed = now - startTime.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span>{display}</span>;
}

interface BarData {
  label: string;
  date: string;
  count: number;
}

function BarChart({ data }: { data: BarData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 20;
  const barGap = 10;
  const chartHeight = 140;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: chartHeight + 50,
        padding: '0 10px',
        borderBottom: '1px solid var(--color-gray-200)',
        position: 'relative',
      }}
    >
      {data.map((d, i) => {
        const hasData = d.count > 0;
        const barHeight = hasData ? Math.max((d.count / maxCount) * chartHeight, 10) : 4;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              width: barWidth + barGap,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: hasData ? 'var(--color-primary)' : '#9ca3af',
                minHeight: 14,
              }}
            >
              {d.count > 0 ? d.count : ''}
            </div>
            <div
              style={{
                width: barWidth,
                height: barHeight,
                background: hasData
                  ? `linear-gradient(to top, #f97316 0%, #fb923c 100%)`
                  : '#e5e7eb',
                borderRadius: '4px 4px 2px 2px',
                transition: 'height 0.5s ease',
                minHeight: 4,
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: hasData ? 'var(--color-text)' : '#9ca3af',
                fontWeight: 500,
              }}
            >
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<DishRecord[]>([]);
  const [nicknameInput, setNicknameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/user').then((r) => r.json()), fetch('/api/records').then((r) => r.json())])
      .then(([u, r]: [UserProfile, DishRecord[]]) => {
        setUser(u);
        setNicknameInput(u.nickname);
        setRecords(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function handleNicknameChange(val: string) {
    const trimmed = val.slice(0, 10);
    setNicknameInput(trimmed);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!user || trimmed === user.nickname) return;
      setSaving(true);
      try {
        const res = await fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: trimmed }),
        });
        if (res.ok) {
          const updated = await res.json();
          setUser(updated);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        const res = await fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: dataUrl }),
        });
        if (res.ok) {
          const updated = await res.json();
          setUser(updated);
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleExport() {
    if (!user) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = user.nickname.replace(/[^\w\u4e00-\u9fa5]/g, '_') || 'user';
    const filename = `${safeName}_records_${dateStr}.json`;

    const exportData = {
      exportAt: new Date().toISOString(),
      user: { nickname: user.nickname, createdAt: user.createdAt },
      records,
      statistics: {
        totalRecords: records.length,
        averageRating:
          records.length > 0
            ? (records.reduce((s, r) => s + r.rating, 0) / records.length).toFixed(2)
            : 0,
        uniqueIngredients: new Set(records.flatMap((r) => r.ingredients)).size,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const last7Days: BarData[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = records.filter((r) => r.createdAt.slice(0, 10) === dateStr).length;
    const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    last7Days.push({
      label: i === 0 ? '今天' : dayLabels[d.getDay()],
      date: dateStr,
      count,
    });
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
          正在加载个人信息...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>👤</span> 个人中心
      </h1>

      <div className="grid grid-2">
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 20,
          }}
        >
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '3px solid var(--color-primary)',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              transition: 'var(--transition)',
              background: 'linear-gradient(135deg, #fdba74, #f97316)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(249, 115, 22, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="头像"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                {user?.nickname?.charAt(0) || '?'}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '0')}
            >
              点击上传
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />

          <div style={{ width: '100%' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--color-text-light)',
                fontWeight: 500,
                marginBottom: 6,
                textAlign: 'left',
              }}
            >
              昵称
              {saving && <span style={{ marginLeft: 8, color: 'var(--color-primary)' }}>保存中...</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                value={nicknameInput}
                onChange={(e) => handleNicknameChange(e.target.value)}
                maxLength={10}
                placeholder="输入昵称"
              />
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'var(--color-text-light)',
                }}
              >
                {nicknameInput.length}/10
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              width: '100%',
              marginTop: 8,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  lineHeight: 1.2,
                }}
              >
                <AnimatedNumber value={records.length} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)', marginTop: 4 }}>
                累计菜品
              </div>
            </div>
            <div
              style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#d97706',
                  lineHeight: 1.2,
                }}
              >
                <AnimatedNumber
                  value={
                    records.length > 0
                      ? Math.round((records.reduce((s, r) => s + r.rating, 0) / records.length) * 10)
                      : 0
                  }
                />
                <span style={{ fontSize: 18 }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)', marginTop: 4 }}>
                好评率
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div>
            <h3 className="section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📈</span> 近7天记录趋势
            </h3>
            <BarChart data={last7Days} />
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-light)',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              近7天共记录 {last7Days.reduce((s, d) => s + d.count, 0)} 条菜品体验
            </p>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 20,
              borderTop: '1px solid var(--color-gray-100)',
            }}
          >
            <button
              onClick={handleExport}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)',
                color: 'white',
                fontWeight: 600,
                fontSize: 15,
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 20px rgba(249, 115, 22, 0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#ea580c';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)';
              }}
            >
              <span style={{ fontSize: 18 }}>⬇</span>
              导出数据 (JSON)
            </button>
            <p
              style={{
                fontSize: 11,
                color: 'var(--color-text-light)',
                textAlign: 'center',
                marginTop: 10,
              }}
            >
              导出所有记录为 JSON 文件，方便备份和迁移
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
