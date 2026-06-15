import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { create } from 'zustand';
import { customerApi } from './http';
import type { Customer } from './types';
import Dashboard from './components/Dashboard';
import CustomerCard from './components/CustomerCard';
import CouponGrid from './components/CouponGrid';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppState {
  customers: Customer[];
  setCustomers: (c: Customer[]) => void;
  updateCustomer: (c: Customer) => void;
  addCustomer: (c: Customer) => void;
  addCustomers: (c: Customer[]) => void;
  period: 'week' | 'month';
  setPeriod: (p: 'week' | 'month') => void;
}

const useAppStore = create<AppState>((set) => ({
  customers: [],
  setCustomers: (c) => set({ customers: c }),
  updateCustomer: (updated) =>
    set((s) => ({
      customers: s.customers.map((c) => (c.id === updated.id ? updated : c)),
    })),
  addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
  addCustomers: (newCs) => set((s) => ({ customers: [...newCs, ...s.customers] })),
  period: 'month',
  setPeriod: (p) => set({ period: p }),
}));

const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return { toasts, showToast };
};

const navItems = [
  { path: '/', label: '首页概览', icon: '🏠' },
  { path: '/dashboard', label: '数据看板', icon: '📊' },
  { path: '/customers', label: '顾客管理', icon: '👥' },
  { path: '/coupons', label: '优惠券中心', icon: '🎫' },
];

const ToastContainer: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => (
  <div
    style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}
  >
    {toasts.map((toast) => (
      <div
        key={toast.id}
        style={{
          padding: '12px 20px',
          backgroundColor:
            toast.type === 'success'
              ? '#27ae60'
              : toast.type === 'warning'
              ? '#f39c12'
              : '#3498db',
          color: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontWeight: 500,
          minWidth: '240px',
          pointerEvents: 'auto',
          animation: 'toastSlideIn 0.4s ease forwards',
        }}
      >
        {toast.message}
      </div>
    ))}
  </div>
);

const Sidebar: React.FC<{
  mobileOpen: boolean;
  onCloseMobile: () => void;
}> = ({ mobileOpen, onCloseMobile }) => {
  const location = useLocation();

  const SidebarContent = (
    <div
      style={{
        width: '200px',
        minHeight: '100vh',
        backgroundColor: '#3e2723',
        color: '#f5e6d0',
        borderTopRightRadius: '8px',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
      }}
    >
      <div
        style={{
          padding: '0 20px 24px',
          borderBottom: '1px solid rgba(245,230,208,0.12)',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px' }}>
          ☕ 咖啡积分宝
        </div>
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
          会员管理系统
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                fontSize: '14px',
                color: isActive ? '#f5e6d0' : 'rgba(245,230,208,0.65)',
                textDecoration: 'none',
                backgroundColor: isActive ? 'rgba(212,163,115,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #d4a373' : '3px solid transparent',
                transition: 'all 0.2s ease',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div
        style={{
          padding: '16px 20px',
          fontSize: '12px',
          opacity: 0.5,
          borderTop: '1px solid rgba(245,230,208,0.12)',
        }}
      >
        v1.0.0 © 2026
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'none' }}>{/* desktop hidden placeholder */}</div>
      <div className="sidebar-desktop" style={{ display: 'block', flexShrink: 0 }}>
        {SidebarContent}
      </div>

      {mobileOpen && (
        <>
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 998,
              animation: 'modalFadeIn 0.2s ease',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 999,
              animation: 'toastSlideIn 0.3s ease',
            }}
          >
            {SidebarContent}
          </div>
        </>
      )}
    </>
  );
};

const TopBar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => (
  <div
    className="mobile-topbar"
    style={{
      display: 'none',
      alignItems: 'center',
      height: '56px',
      padding: '0 16px',
      backgroundColor: '#3e2723',
      color: '#f5e6d0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}
  >
    <button
      onClick={onMenuClick}
      style={{
        width: '40px',
        height: '40px',
        backgroundColor: 'transparent',
        color: '#f5e6d0',
        fontSize: '22px',
        lineHeight: '40px',
        textAlign: 'center',
        marginRight: '12px',
      }}
    >
      ☰
    </button>
    <div style={{ fontSize: '16px', fontWeight: 700 }}>☕ 咖啡积分宝</div>
  </div>
);

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [phase, setPhase] = useState<'enter' | 'idle'>('enter');

  useEffect(() => {
    setPhase('enter');
    const t = setTimeout(() => setPhase('idle'), 320);
    setDisplayed(children);
    return () => clearTimeout(t);
  }, [location.pathname, children]);

  return (
    <div
      style={{
        opacity: phase === 'enter' ? 0 : 1,
        transform: phase === 'enter' ? 'translateX(-16px)' : 'translateX(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      {displayed}
    </div>
  );
};

const HomePage: React.FC<{ showToast: (m: string, t?: any) => void }> = ({ showToast }) => {
  const { customers, period, setPeriod, updateCustomer, addCustomers } = useAppStore();
  const [customersLoading, setCustomersLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');
  const [singleForm, setSingleForm] = useState({ name: '', phone: '' });
  const [batchText, setBatchText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customerApi
      .getAll()
      .then((data) => {
        useAppStore.getState().setCustomers(data);
      })
      .finally(() => setCustomersLoading(false));
  }, []);

  const handleConsumeThreshold = () => {
    showToast('🎉 恭喜！该顾客积分已达到兑换阈值', 'success');
  };

  const handleCustomerUpdate = (c: Customer) => {
    updateCustomer(c);
  };

  const handleSubmitAdd = async () => {
    setSubmitting(true);
    try {
      if (addMode === 'single') {
        if (!singleForm.name || !singleForm.phone) {
          showToast('请填写姓名和手机号', 'warning');
          return;
        }
        const c = await customerApi.create(singleForm);
        useAppStore.getState().addCustomer(c);
        showToast('添加顾客成功', 'success');
        setSingleForm({ name: '', phone: '' });
        setShowAddModal(false);
      } else {
        const lines = batchText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l);
        const parsed = lines.map((line) => {
          const parts = line.split(/[,\t\s]+/);
          return { name: parts[0] || '', phone: parts[1] || '' };
        }).filter((p) => p.name && p.phone);

        if (parsed.length === 0) {
          showToast('请按格式输入：姓名 手机号（每行一个）', 'warning');
          return;
        }
        const created = await customerApi.batchCreate(parsed);
        addCustomers(created);
        showToast(`成功添加 ${created.length} 名顾客`, 'success');
        setBatchText('');
        setShowAddModal(false);
      }
    } catch (e) {
      showToast('操作失败，请重试', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Dashboard period={period} onPeriodChange={setPeriod} />

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#3e2723' }}>
            顾客列表
            <span
              style={{
                fontSize: '13px',
                fontWeight: 400,
                color: '#9e9e9e',
                marginLeft: '8px',
              }}
            >
              共 {customers.length} 名会员
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setAddMode('batch');
                setShowAddModal(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#3e2723',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                transition: 'all 0.2s ease',
              }}
            >
              批量导入
            </button>
            <button
              onClick={() => {
                setAddMode('single');
                setShowAddModal(true);
              }}
              style={{
                padding: '8px 18px',
                backgroundColor: '#d4a373',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                transition: 'background-color 0.2s ease',
              }}
            >
              + 添加顾客
            </button>
          </div>
        </div>

        {customersLoading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#9e9e9e' }}>
            加载中...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 280px)',
              gap: '16px',
              justifyContent: 'flex-start',
            }}
          >
            {customers.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onConsumeSuccess={handleConsumeThreshold}
                onCustomerUpdate={handleCustomerUpdate}
              />
            ))}
          </div>
        )}
      </div>

      <CouponGrid />

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
            animation: 'modalFadeIn 0.3s ease',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '460px',
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              animation: 'modalContentScale 0.3s ease',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {addMode === 'single' ? '添加顾客' : '批量导入顾客'}
            </h3>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '18px',
                borderBottom: '1px solid #f0ece6',
              }}
            >
              {(['single', 'batch'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAddMode(m)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: addMode === m ? '#d4a373' : '#9e9e9e',
                    fontSize: '14px',
                    fontWeight: addMode === m ? 600 : 500,
                    borderBottom: addMode === m ? '2px solid #d4a373' : '2px solid transparent',
                    marginBottom: '-1px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {m === 'single' ? '逐个添加' : '批量导入'}
                </button>
              ))}
            </div>

            {addMode === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={fieldLabel}>姓名</label>
                  <input
                    type="text"
                    placeholder="请输入姓名"
                    value={singleForm.name}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, name: e.target.value })
                    }
                    style={fieldInput}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>手机号</label>
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={singleForm.phone}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, phone: e.target.value })
                    }
                    style={fieldInput}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label style={fieldLabel}>
                  顾客列表（每行一条，格式：姓名 手机号，可用逗号或空格分隔）
                </label>
                <textarea
                  placeholder={'张三 13800138000\n李四,13900139000\n王五\t13700137000'}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  style={{
                    ...fieldInput,
                    height: '160px',
                    padding: '12px 14px',
                    resize: 'vertical',
                    fontFamily: 'var(--font-serif)',
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '24px',
              }}
            >
              <button onClick={() => setShowAddModal(false)} style={cancelBtn}>
                取消
              </button>
              <button
                onClick={handleSubmitAdd}
                disabled={submitting}
                style={{
                  ...confirmBtn,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { period, setPeriod } = useAppStore();
  return <Dashboard period={period} onPeriodChange={setPeriod} />;
};

const CustomersPage: React.FC<{
  showToast: (m: string, t?: any) => void;
}> = ({ showToast }) => {
  return <HomePage showToast={showToast} />;
};

const CouponsPage: React.FC = () => <CouponGrid />;

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#3e2723',
  marginBottom: '6px',
};

const fieldInput: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 14px',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#3e2723',
  backgroundColor: '#fff',
  outline: 'none',
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: 'transparent',
  color: '#3e2723',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  border: '1px solid #e9ecef',
  transition: 'all 0.2s ease',
};

const confirmBtn: React.CSSProperties = {
  padding: '8px 20px',
  backgroundColor: '#d4a373',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  transition: 'background-color 0.2s ease',
};

const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toasts, showToast } = useToast();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#faf3e0' }}>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .main-content { padding: 16px !important; }
        }
      `}</style>

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />

        <main
          className="main-content"
          style={{
            flex: 1,
            padding: '28px',
            maxWidth: '100%',
            overflow: 'auto',
          }}
        >
          <PageTransition>
            <Routes>
              <Route path="/" element={<HomePage showToast={showToast} />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/customers"
                element={<CustomersPage showToast={showToast} />}
              />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
};

export default App;
