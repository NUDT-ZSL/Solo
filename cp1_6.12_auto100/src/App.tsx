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

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCoupons(searchQuery, filterStatus);
      setCoupons(data);
    } catch (err) {
      showToast('加载优惠券失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadCoupons();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, filterStatus, loadCoupons]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleClaim = useCallback(async (couponId: string) => {
    try {
      const result = await api.claimCoupon(couponId);
      setCoupons(prev => prev.map(c => c.id === couponId ? result.coupon : c));
      showToast('领取成功！', 'success');
    } catch (err: any) {
      showToast(err.message || '领取失败', 'error');
    }
  }, [showToast]);

  const validateCreateField = (field: keyof CreateCouponData, value: any): string => {
    switch (field) {
      case 'name':
        if (!value || !String(value).trim()) return '优惠券名称必填';
        return '';
      case 'amount':
        const amt = Number(value);
        if (!value || isNaN(amt) || !Number.isInteger(amt) || amt < 1 || amt > 100)
          return '面额必须是1-100的正整数';
        return '';
      case 'threshold':
        const thr = Number(value);
        if (value === '' || isNaN(thr) || thr <= 0) return '门槛金额必须大于0';
        if (createForm.amount !== '' && thr <= Number(createForm.amount))
          return '门槛金额必须大于面额';
        return '';
      case 'start_date':
        if (!value) return '开始日期必填';
        return '';
      case 'end_date':
        if (!value) return '结束日期必填';
        if (createForm.start_date && new Date(value) < new Date(createForm.start_date))
          return '截止日期不能早于开始日期';
        return '';
      case 'daily_limit':
        const lim = Number(value);
        if (!value || isNaN(lim) || !Number.isInteger(lim) || lim < 1 || lim > 500)
          return '每日上限必须是1-500的整数';
        return '';
      default:
        return '';
    }
  };

  const handleCreateBlur = (field: keyof CreateCouponData) => {
    setCreateTouched(prev => ({ ...prev, [field]: true }));
    const err = validate