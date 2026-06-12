import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Coupon, PageView, FilterStatus, CreateCouponData } from './types';
import { api } from './api';
import CouponList from './components/CouponList';
import CouponDetail from './components/CouponDetail';
import StatsDashboard from './components/StatsDashboard';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export default function App() {
  const [page, setPage] = useState<PageView>('list');
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createTouched, setCreateTouched] = useState<Record<string, boolean>>({});
  const [createForm, setCreateForm] = useState<CreateCouponData>({
    name: '',
    amount: '',
    threshold: '',
    start_date: '',
    end_date: '',
    daily_limit: 50,
  });
  const [creating, setCreating] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCoupons(searchQuery, filterStatus);
      setCoupons(data);
    } catch {
      showToast('加载优惠券失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, showToast]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCoupons();
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery, filterStatus, loadCoupons]);

  const handleClaim = useCallback(async (couponId: string) => {
    try {
      const result = await api.claimCoupon(couponId);
      setCoupons(prev => prev.map(c => c.id === couponId ? result.coupon : c));
      showToast('领取成功！', 'success');
    } catch (err: any) {
      showToast(err.message || '领取失败', 'error');
    }
  }, [showToast]);

  const validateCreateField = (field: keyof CreateCouponData, value: any, formState?: CreateCouponData): string => {
    const form = formState || createForm;
    switch (field) {
      case 'name':
        if (!value || !String(value).trim()) return '优惠券名称必填';
        return '';
      case 'amount':
        const amt = Number(value);
        if (value === '' || isNaN(amt)) return '请输入面额';
        if (!Number.isInteger(amt)) return '面额必须是整数';
        if (amt < 1 || amt > 100) return '面额必须在1-100元之间';
        return '';
      case 'threshold':
        const thr = Number(value);
        if (value === '' || isNaN(thr)) return '请输入门槛金额';
        if (thr <= 0) return '门槛金额必须大于0';
        const currentAmount = form.amount !== '' ? Number(form.amount) : 0;
        if (currentAmount > 0 && thr <= currentAmount) return '门槛金额必须大于面额';
        return '';
      case 'start_date':
        if (!value) return '开始日期必填';
        return '';
      case 'end_date':
        if (!value) return '结束日期必填';
        if (form.start_date && new Date(value) < new Date(form.start_date)) {
          return '截止日期不能早于开始日期';
        }
        return '';
      case 'daily_limit':
        const lim = Number(value);
        if (value === '' || isNaN(lim)) return '请输入每日上限';
        if (!Number.isInteger(lim)) return '每日上限必须是整数';
        if (lim < 1 || lim > 500) return '每日上限必须在1-500之间';
        return '';
      default:
        return '';
    }
  };

  const handleCreateBlur = (field: keyof CreateCouponData) => {
    setCreateTouched(prev => ({ ...prev, [field]: true }));
    const err = validateCreateField(field, createForm[field]);
    setCreateErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleCreateChange = (field: keyof CreateCouponData, value: any) => {
    const newForm = { ...createForm, [field]: value };
    setCreateForm(newForm);
    if (createTouched[field]) {
      const err = validateCreateField(field, value, newForm);
      setCreateErrors(prev => ({ ...prev, [field]: err }));
    }
    if (field === 'amount' && createTouched.threshold) {
      const thrErr = validateCreateField('threshold', newForm.threshold, newForm);
      setCreateErrors(prev => ({ ...prev, threshold: thrErr }));
    }
    if (field === 'start_date' && createTouched.end_date) {
      const endErr = validateCreateField('end_date', newForm.end_date, newForm);
      setCreateErrors(prev => ({ ...prev, end_date: endErr }));
    }
  };

  const validateAllCreateFields = (): boolean => {
    const fields: (keyof CreateCouponData)[] = ['name', 'amount', 'threshold', 'start_date', 'end_date', 'daily_limit'];
    const errors: Record<string, string> = {};
    let valid = true;
    fields.forEach(f => {
      const err = validateCreateField(f, createForm[f]);
      if (err) valid = false;
      errors[f] = err;
    });
    setCreateErrors(errors);
    setCreateTouched({ name: true, amount: true, threshold: true, start_date: true, end_date: true, daily_limit: true });
    return valid;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllCreateFields()) return;
    setCreating(true);
    try {
      const payload = {
        name: createForm.name,
        amount: Number(createForm.amount),
        threshold: Number(createForm.threshold),
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        daily_limit: Number(createForm.daily_limit),
      };
      await api.createCoupon(payload);
      showToast('优惠券创建成功！', 'success');
      setCreateForm({ name: '', amount: '', threshold: '', start_date: '', end_date: '', daily_limit: 50 });
      setCreateTouched({});
      setCreateErrors({});
      setPage('list');
      loadCoupons();
    } catch (err: any) {
      const msg = err.message;
      if (typeof msg === 'object' && msg !== null) {
        setCreateErrors(msg as Record<string, string>);
        showToast('请检查表单输入', 'error');
      } else {
        showToast(String(msg) || '创建失败', 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSelectCoupon = (id: string) => {
    setSelectedCouponId(id);
    setPage('detail');
  };

  const handleBackToList = () => {
    setSelectedCouponId(null);
    setPage('list');
  };

  const renderPage = () => {
    if (page === 'stats') {
      return <StatsDashboard />;
    }
    if (page === 'create') {
      return (
        <div className="create-form-card">
          <h2>创建优惠券</h2>
          <p>设置优惠券规则，创建后用户可立即领取</p>
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label">优惠券名称</label>
              <input
                type="text"
                className={`form-input ${createTouched.name && createErrors.name ? 'error' : ''}`}
                placeholder="例如：新用户专享立减券"
                value={createForm.name}
                onChange={e => handleCreateChange('name', e.target.value)}
                onBlur={() => handleCreateBlur('name')}
              />
              {createTouched.name && createErrors.name && (
                <div className="error-message">{createErrors.name}</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">面额（元）</label>
                <input
                  type="number"
                  className={`form-input ${createTouched.amount && createErrors.amount ? 'error' : ''}`}
                  placeholder="1-100"
                  value={createForm.amount}
                  onChange={e => handleCreateChange('amount', e.target.value)}
                  onBlur={() => handleCreateBlur('amount')}
                  min={1}
                  max={100}
                />
                {createTouched.amount && createErrors.amount && (
                  <div className="error-message">{createErrors.amount}</div>
                )}
                <div className="input-hint">1-100元整数</div>
              </div>
              <div className="form-group">
                <label className="form-label">使用门槛（元）</label>
                <input
                  type="number"
                  className={`form-input ${createTouched.threshold && createErrors.threshold ? 'error' : ''}`}
                  placeholder="最小使用金额"
                  value={createForm.threshold}
                  onChange={e => handleCreateChange('threshold', e.target.value)}
                  onBlur={() => handleCreateBlur('threshold')}
                  min={0}
                />
                {createTouched.threshold && createErrors.threshold && (
                  <div className="error-message">{createErrors.threshold}</div>
                )}
                <div className="input-hint">必须大于面额</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">开始日期</label>
                <input
                  type="date"
                  className={`form-input ${createTouched.start_date && createErrors.start_date ? 'error' : ''}`}
                  value={createForm.start_date}
                  onChange={e => handleCreateChange('start_date', e.target.value)}
                  onBlur={() => handleCreateBlur('start_date')}
                />
                {createTouched.start_date && createErrors.start_date && (
                  <div className="error-message">{createErrors.start_date}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">截止日期</label>
                <input
                  type="date"
                  className={`form-input ${createTouched.end_date && createErrors.end_date ? 'error' : ''}`}
                  value={createForm.end_date}
                  onChange={e => handleCreateChange('end_date', e.target.value)}
                  onBlur={() => handleCreateBlur('end_date')}
                />
                {createTouched.end_date && createErrors.end_date && (
                  <div className="error-message">{createErrors.end_date}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">每日发放上限（张）</label>
              <input
                type="number"
                className={`form-input ${createTouched.daily_limit && createErrors.daily_limit ? 'error' : ''}`}
                placeholder="1-500"
                value={createForm.daily_limit}
                onChange={e => handleCreateChange('daily_limit', e.target.value)}
                onBlur={() => handleCreateBlur('daily_limit')}
                min={1}
                max={500}
              />
              {createTouched.daily_limit && createErrors.daily_limit && (
                <div className="error-message">{createErrors.daily_limit}</div>
              )}
              <div className="input-hint">1-500张，默认50张</div>
            </div>

            <button type="submit" className="submit-btn" disabled={creating}>
              {creating ? '创建中...' : '创建优惠券'}
            </button>
          </form>
        </div>
      );
    }
    if (page === 'detail' && selectedCouponId) {
      return (
        <CouponDetail
          couponId={selectedCouponId}
          onBack={handleBackToList}
        />
      );
    }
    return (
      <CouponList
        coupons={coupons}
        loading={loading}
        searchQuery={searchQuery}
        filterStatus={filterStatus}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilterStatus}
        onSelectCoupon={handleSelectCoupon}
        onClaim={handleClaim}
      />
    );
  };

  return (
    <AppContext.Provider value={{ showToast }}>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
            </svg>
            CouponCrafter
          </div>
          <div className="navbar-nav">
            <button
              className={`nav-btn ${page === 'list' || page === 'detail' ? 'active' : ''}`}
              onClick={() => { setPage('list'); setSelectedCouponId(null); }}
            >
              优惠券
            </button>
            <button
              className={`nav-btn ${page === 'create' ? 'active' : ''}`}
              onClick={() => setPage('create')}
            >
              创建
            </button>
            <button
              className={`nav-btn ${page === 'stats' ? 'active' : ''}`}
              onClick={() => setPage('stats')}
            >
              数据看板
            </button>
          </div>
        </nav>

        <main>{renderPage()}</main>

        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast" style={{
              background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#3B82F6'
            }}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}
