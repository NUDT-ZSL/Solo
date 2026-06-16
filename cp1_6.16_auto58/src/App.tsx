import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import type { Instrument, Wallet, Negotiation, Order } from './types';
import InstrumentCard from './components/InstrumentCard';
import {
  getStatusStyle,
  mapRatingToStars,
  calculateRentalDeposit,
  calculateDailyRentalPrice,
  canNegotiate,
  validateNegotiationPrice,
  statusColors
} from './lib/businessService';

type Page = 'plaza' | 'consignment' | 'wallet';
type ModalView = null | 'detail' | 'negotiate' | 'rental' | 'editPrice';

const useCountAnimation = (targetValue: number, duration: number = 1000) => {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(targetValue * easeOut);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [targetValue, duration]);

  return value;
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('plaza');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rentalDays, setRentalDays] = useState(7);
  const [negotiatePrice, setNegotiatePrice] = useState('');
  const [negotiateReason, setNegotiateReason] = useState('');
  const [editPriceValue, setEditPriceValue] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentUserSellerId = 'seller-001';

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [instRes, walletRes, negRes] = await Promise.all([
        axios.get('/api/instruments'),
        axios.get('/api/wallet'),
        axios.get('/api/negotiations', { params: { sellerId: currentUserSellerId } })
      ]);
      setInstruments(instRes.data);
      setWallet(walletRes.data);
      setNegotiations(negRes.data);
    } catch (e) {
      console.error('获取数据失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePageChange = (page: Page) => {
    if (page === currentPage) return;
    setPageTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setPageTransitioning(false), 50);
    }, 150);
  };

  const openDetailModal = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setCurrentImageIndex(0);
    setModalView('detail');
  };

  const closeModal = () => {
    setModalView(null);
    setSelectedInstrument(null);
    setNegotiatePrice('');
    setNegotiateReason('');
    setRentalDays(7);
    setEditPriceValue('');
    setCounterPrice('');
  };

  const handlePurchase = async () => {
    if (!selectedInstrument) return;
    try {
      await axios.post('/api/orders', {
        instrumentId: selectedInstrument.id,
        type: 'purchase',
        price: selectedInstrument.price,
        buyerId: 'buyer-001'
      });
      showToast('购买成功！');
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleRental = async () => {
    if (!selectedInstrument) return;
    try {
      await axios.post('/api/orders', {
        instrumentId: selectedInstrument.id,
        type: 'rental',
        price: selectedInstrument.dailyRentalPrice * rentalDays,
        rentalDays,
        buyerId: 'buyer-001'
      });
      showToast(`租赁${rentalDays}天成功！押金已冻结`);
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleNegotiate = async () => {
    if (!selectedInstrument) return;
    const price = parseFloat(negotiatePrice);
    const validation = validateNegotiationPrice(price, selectedInstrument.price);
    if (!validation.valid) {
      showToast(validation.message || '价格不合法', 'error');
      return;
    }
    if (!negotiateReason.trim()) {
      showToast('请填写议价理由', 'error');
      return;
    }
    try {
      await axios.post('/api/negotiations', {
        instrumentId: selectedInstrument.id,
        proposedPrice: price,
        reason: negotiateReason,
        buyerId: 'buyer-001',
        buyerName: '我'
      });
      showToast('议价已发送，等待卖家回复');
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleNegotiationAction = async (id: string, action: 'accept' | 'reject' | 'counter') => {
    try {
      if (action === 'counter') {
        const price = parseFloat(counterPrice);
        if (isNaN(price) || price <= 0) {
          showToast('请输入有效的还价金额', 'error');
          return;
        }
        await axios.put(`/api/negotiations/${id}`, { status: 'countered', counterPrice: price });
        showToast('还价已发送');
      } else {
        await axios.put(`/api/negotiations/${id}`, {
          status: action === 'accept' ? 'accepted' : 'rejected'
        });
        showToast(action === 'accept' ? '已接受议价' : '已拒绝议价');
      }
      setCounterPrice('');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleOffShelf = async (instrumentId: string) => {
    try {
      await axios.patch(`/api/instruments/${instrumentId}`, { status: 'sold' });
      showToast('已下架');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleEditPrice = async () => {
    if (!selectedInstrument) return;
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price <= 0) {
      showToast('请输入有效的价格', 'error');
      return;
    }
    try {
      await axios.patch(`/api/instruments/${selectedInstrument.id}`, {
        price,
        dailyRentalPrice: calculateDailyRentalPrice(price)
      });
      showToast('价格已更新');
      closeModal();
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || '操作失败', 'error');
    }
  };

  const openEditPrice = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setEditPriceValue(String(instrument.price));
    setModalView('editPrice');
  };

  const myInstruments = instruments.filter((i) => i.sellerId === currentUserSellerId);
  const activeNegotiations = negotiations.filter(
    (n) => n.status === 'pending' || n.status === 'countered'
  );

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#0F3460',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: '1px'
  };

  const navLinksStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    height: '100%',
    alignItems: 'center'
  };

  const getNavButtonStyle = (page: Page): React.CSSProperties => ({
    padding: '8px 20px',
    backgroundColor: currentPage === page ? '#E94560' : 'transparent',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    position: 'relative'
  });

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#E74C3C',
    color: '#FFFFFF',
    fontSize: '10px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700'
  };

  const mainStyle: React.CSSProperties = {
    paddingTop: '80px',
    paddingBottom: '40px',
    paddingLeft: '24px',
    paddingRight: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    opacity: pageTransitioning ? 0 : 1,
    transition: 'opacity 0.3s ease'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    '@media (max-width: 640px)': {
      gridTemplateColumns: '1fr'
    }
  };

  const pageTitleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#FFFFFF'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'fadeIn 0.3s ease'
  };

  const modalContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    backgroundColor: '#16213E',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.4s ease-out'
  };

  const carouselContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '400px',
    backgroundColor: '#0F3460',
    overflow: 'hidden'
  };

  const carouselImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    animation: 'fadeIn 0.5s ease'
  };

  const arrowBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease, opacity 0.3s ease'
  };

  const modalContentStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  };

  const modalTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: '8px'
  };

  const modalBrandStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#8892B0',
    marginBottom: '16px'
  };

  const priceRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px',
    marginBottom: '20px'
  };

  const bigPriceStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#E94560'
  };

  const rentalPriceStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#F39C12',
    fontWeight: '500'
  };

  const infoGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px'
  };

  const infoItemStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '12px',
    borderRadius: '8px'
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#8892B0',
    marginBottom: '4px'
  };

  const infoValueStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#FFFFFF',
    fontWeight: '500'
  };

  const sellerSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    marginBottom: '20px'
  };

  const avatarStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#E94560',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: '700'
  };

  const sellerNameText: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF'
  };

  const ratingTextStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#8892B0',
    marginTop: '4px'
  };

  const btnGroupStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 20px',
    backgroundColor: '#E94560',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.2s ease'
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: '14px 20px',
    backgroundColor: '#2980B9',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.2s ease'
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...primaryBtnStyle,
    backgroundColor: '#555',
    cursor: 'not-allowed'
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const walletHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px'
  };

  const walletCardStyle: React.CSSProperties = {
    backgroundColor: '#16213E',
    padding: '28px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)'
  };

  const walletLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#8892B0',
    marginBottom: '8px'
  };

  const walletAmountStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: '700',
    color: '#E94560'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '16px'
  };

  const txListStyle: React.CSSProperties = {
    backgroundColor: '#16213E',
    borderRadius: '12px',
    overflow: 'hidden'
  };

  const txRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '120px 1fr auto',
    gap: '16px',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center'
  };

  const txDateStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#8892B0'
  };

  const txDescStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#FFFFFF'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    color: '#8892B0',
    marginBottom: '8px',
    marginTop: '16px'
  };

  const negCardStyle: React.CSSProperties = {
    backgroundColor: '#16213E',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid rgba(233, 69, 96, 0.2)'
  };

  const instrumentActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'opacity 0.2s ease'
  };

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    backgroundColor: toast?.type === 'error' ? '#E74C3C' : '#2ECC71',
    color: '#FFFFFF',
    borderRadius: '8px',
    zIndex: 1000,
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    animation: 'slideDown 0.3s ease-out'
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ opacity: i < count ? 1 : 0.3, color: '#F1C40F' }}>★</span>
    ));
  };

  const transactionTypeLabels: Record<string, string> = {
    consignment_income: '寄卖收入',
    rental_deposit: '租赁押金',
    rental_income: '租赁收入',
    refund: '退款'
  };

  const animatedBalance = useCountAnimation(wallet?.balance || 0);
  const animatedFrozen = useCountAnimation(wallet?.frozenDeposit || 0);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .nav-btn:hover:not(.active) { background-color: rgba(233, 69, 96, 0.3) !important; }
        .primary-btn:hover { background-color: #C23152; transform: scale(1.05); }
        .secondary-btn:hover { background-color: #1A5276; transform: scale(1.05); }
        .small-btn:hover { opacity: 0.8; }
        .instrument-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .instrument-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .instrument-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav style={navStyle}>
        <div style={logoStyle}>🎸 乐器寄卖</div>
        <div style={navLinksStyle}>
          <button
            style={getNavButtonStyle('plaza')}
            onClick={() => handlePageChange('plaza')}
            className="nav-btn"
          >
            乐器广场
          </button>
          <button
            style={getNavButtonStyle('consignment')}
            onClick={() => handlePageChange('consignment')}
            className="nav-btn"
          >
            我的寄卖
            {activeNegotiations.length > 0 && <span style={badgeStyle}>{activeNegotiations.length}</span>}
          </button>
          <button
            style={getNavButtonStyle('wallet')}
            onClick={() => handlePageChange('wallet')}
            className="nav-btn"
          >
            我的钱包
          </button>
        </div>
      </nav>

      <main style={mainStyle}>
        {currentPage === 'plaza' && (
          <div>
            <h1 style={pageTitleStyle}>乐器广场</h1>
            <div className="instrument-grid">
              {instruments.map((instrument) => (
                <InstrumentCard
                  key={instrument.id}
                  instrument={instrument}
                  onClick={() => openDetailModal(instrument)}
                />
              ))}
            </div>
          </div>
        )}

        {currentPage === 'consignment' && (
          <div>
            <h1 style={pageTitleStyle}>我的寄卖</h1>
            {activeNegotiations.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h2 style={sectionTitleStyle}>🔔 议价通知 ({activeNegotiations.length})</h2>
                {activeNegotiations.map((neg) => (
                  <div key={neg.id} style={negCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                          {neg.instrumentName}
                        </div>
                        <div style={{ fontSize: '13px', color: '#8892B0', marginTop: '4px' }}>
                          来自: {neg.buyerName} · 出价: <span style={{ color: '#E94560', fontWeight: '600' }}>¥{neg.proposedPrice.toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#8892B0', marginTop: '4px' }}>
                          理由: {neg.reason}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <input
                          type="number"
                          placeholder="还价金额"
                          value={counterPrice}
                          onChange={(e) => setCounterPrice(e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '120px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#2ECC71', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => handleNegotiationAction(neg.id, 'accept')}
                      >
                        接受
                      </button>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#E74C3C', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => handleNegotiationAction(neg.id, 'reject')}
                      >
                        拒绝
                      </button>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#F39C12', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => handleNegotiationAction(neg.id, 'counter')}
                      >
                        还价
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 style={sectionTitleStyle}>我发布的乐器 ({myInstruments.length})</h2>
            <div className="instrument-grid">
              {myInstruments.map((instrument) => (
                <InstrumentCard
                  key={instrument.id}
                  instrument={instrument}
                  showCreatedAt
                  actions={
                    <div style={instrumentActionsStyle}>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#555', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => handleOffShelf(instrument.id)}
                      >
                        下架
                      </button>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#2980B9', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => openEditPrice(instrument)}
                      >
                        改价
                      </button>
                      <button
                        style={{ ...smallBtnStyle, backgroundColor: '#8E44AD', color: '#FFFFFF' }}
                        className="small-btn"
                        onClick={() => openDetailModal(instrument)}
                      >
                        查看
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        )}

        {currentPage === 'wallet' && wallet && (
          <div>
            <h1 style={pageTitleStyle}>我的钱包</h1>
            <div style={walletHeaderStyle}>
              <div style={walletCardStyle}>
                <div style={walletLabelStyle}>账户余额</div>
                <div style={walletAmountStyle}>¥{animatedBalance.toFixed(2)}</div>
              </div>
              <div style={{ ...walletCardStyle }}>
                <div style={walletLabelStyle}>冻结押金</div>
                <div style={{ ...walletAmountStyle, color: '#F39C12' }}>¥{animatedFrozen.toFixed(2)}</div>
              </div>
            </div>

            <h2 style={sectionTitleStyle}>交易记录</h2>
            <div style={txListStyle}>
              {wallet.transactions
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((tx) => (
                  <div key={tx.id} style={txRowStyle}>
                    <div style={txDateStyle}>
                      {new Date(tx.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                    <div style={txDescStyle}>
                      <span style={{ marginRight: '8px', color: '#8892B0' }}>
                        [{transactionTypeLabels[tx.type] || tx.type}]
                      </span>
                      {tx.description}
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: tx.amount >= 0 ? '#2ECC71' : '#E74C3C'
                      }}
                    >
                      {tx.amount >= 0 ? '+' : ''}¥{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {modalView && selectedInstrument && (
        <div style={overlayStyle} onClick={closeModal}>
          <div
            ref={modalRef}
            style={modalContainerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {(modalView === 'detail' || modalView === 'rental' || modalView === 'negotiate') && (
              <div style={carouselContainerStyle}>
                <button style={closeBtnStyle} onClick={closeModal}>✕</button>
                <img
                  src={selectedInstrument.images[currentImageIndex]}
                  alt={selectedInstrument.name}
                  style={carouselImageStyle}
                />
                {selectedInstrument.images.length > 1 && (
                  <>
                    <button
                      style={{ ...arrowBtnStyle, left: '16px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + selectedInstrument.images.length) % selectedInstrument.images.length
                        );
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)')}
                    >
                      ‹
                    </button>
                    <button
                      style={{ ...arrowBtnStyle, right: '16px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev + 1) % selectedInstrument.images.length);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)')}
                    >
                      ›
                    </button>
                  </>
                )}
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
                  {selectedInstrument.images.map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: idx === currentImageIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                        transition: 'background-color 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={modalContentStyle}>
              {modalView === 'detail' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={modalTitleStyle}>{selectedInstrument.name}</h2>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getStatusStyle(selectedInstrument.status).bg,
                        color: '#FFFFFF'
                      }}
                    >
                      {getStatusStyle(selectedInstrument.status).label}
                    </span>
                  </div>
                  <div style={modalBrandStyle}>{selectedInstrument.brand}</div>

                  <div style={priceRowStyle}>
                    <div style={bigPriceStyle}>¥{selectedInstrument.price.toLocaleString()}</div>
                    <div style={rentalPriceStyle}>日租 ¥{selectedInstrument.dailyRentalPrice.toFixed(2)}</div>
                  </div>

                  <div style={infoGridStyle}>
                    <div style={infoItemStyle}>
                      <div style={infoLabelStyle}>材质</div>
                      <div style={infoValueStyle}>{selectedInstrument.material}</div>
                    </div>
                    <div style={infoItemStyle}>
                      <div style={infoLabelStyle}>年份</div>
                      <div style={infoValueStyle}>{selectedInstrument.year}</div>
                    </div>
                    <div style={infoItemStyle}>
                      <div style={infoLabelStyle}>成色</div>
                      <div style={infoValueStyle}>{selectedInstrument.condition}</div>
                    </div>
                    <div style={infoItemStyle}>
                      <div style={infoLabelStyle}>发布时间</div>
                      <div style={infoValueStyle}>
                        {new Date(selectedInstrument.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: '#CCCCCC', lineHeight: '1.6', marginBottom: '20px' }}>
                    {selectedInstrument.description}
                  </div>

                  <div style={sellerSectionStyle}>
                    <div style={avatarStyle}>{selectedInstrument.sellerName.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={sellerNameText}>{selectedInstrument.sellerName}</div>
                      <div style={ratingTextStyle}>
                        <span style={{ marginRight: '6px', fontSize: '14px' }}>
                          {renderStars(mapRatingToStars(selectedInstrument.sellerRating))}
                        </span>
                        信誉分 {selectedInstrument.sellerRating}
                      </div>
                    </div>
                  </div>

                  <div style={btnGroupStyle}>
                    <button
                      style={selectedInstrument.status === 'selling' ? primaryBtnStyle : disabledBtnStyle}
                      className={selectedInstrument.status === 'selling' ? 'primary-btn' : ''}
                      onClick={handlePurchase}
                      disabled={selectedInstrument.status !== 'selling'}
                    >
                      立即购买
                    </button>
                    <button
                      style={selectedInstrument.status === 'selling' ? secondaryBtnStyle : disabledBtnStyle}
                      className={selectedInstrument.status === 'selling' ? 'secondary-btn' : ''}
                      onClick={() => setModalView('rental')}
                      disabled={selectedInstrument.status !== 'selling'}
                    >
                      租赁（日价）
                    </button>
                    <button
                      style={canNegotiate(selectedInstrument) ? secondaryBtnStyle : disabledBtnStyle}
                      className={canNegotiate(selectedInstrument) ? 'secondary-btn' : ''}
                      onClick={() => setModalView('negotiate')}
                      disabled={!canNegotiate(selectedInstrument)}
                    >
                      议价
                    </button>
                  </div>
                </>
              )}

              {modalView === 'rental' && (
                <>
                  <h2 style={modalTitleStyle}>租赁 {selectedInstrument.name}</h2>
                  <div style={modalBrandStyle}>{selectedInstrument.brand}</div>

                  <label style={labelStyle}>租赁天数</label>
                  <input
                    type="number"
                    min={1}
                    value={rentalDays}
                    onChange={(e) => setRentalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    style={inputStyle}
                  />

                  <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#8892B0' }}>日租金</span>
                      <span style={{ color: '#FFFFFF' }}>¥{selectedInstrument.dailyRentalPrice.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#8892B0' }}>天数</span>
                      <span style={{ color: '#FFFFFF' }}>{rentalDays} 天</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#8892B0' }}>租金小计</span>
                      <span style={{ color: '#FFFFFF' }}>¥{(selectedInstrument.dailyRentalPrice * rentalDays).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: '600' }}>需支付（含押金30%）</span>
                      <span style={{ color: '#E94560', fontSize: '20px', fontWeight: '700' }}>
                        ¥{calculateRentalDeposit(selectedInstrument.price, rentalDays).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      style={{ ...secondaryBtnStyle, flex: 1 }}
                      className="secondary-btn"
                      onClick={() => setModalView('detail')}
                    >
                      返回
                    </button>
                    <button
                      style={{ ...primaryBtnStyle, flex: 2 }}
                      className="primary-btn"
                      onClick={handleRental}
                    >
                      确认租赁
                    </button>
                  </div>
                </>
              )}

              {modalView === 'negotiate' && (
                <>
                  <h2 style={modalTitleStyle}>对 {selectedInstrument.name} 发起议价</h2>
                  <div style={modalBrandStyle}>原价: ¥{selectedInstrument.price.toLocaleString()}</div>

                  <label style={labelStyle}>期望价格（不低于原价50%）</label>
                  <input
                    type="number"
                    placeholder="请输入您期望的价格"
                    value={negotiatePrice}
                    onChange={(e) => setNegotiatePrice(e.target.value)}
                    style={inputStyle}
                  />

                  <label style={labelStyle}>议价理由</label>
                  <textarea
                    placeholder="请简要说明议价理由，让卖家更容易接受..."
                    value={negotiateReason}
                    onChange={(e) => setNegotiateReason(e.target.value)}
                    style={textareaStyle}
                  />

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      style={{ ...secondaryBtnStyle, flex: 1 }}
                      className="secondary-btn"
                      onClick={() => setModalView('detail')}
                    >
                      取消
                    </button>
                    <button
                      style={{ ...primaryBtnStyle, flex: 2 }}
                      className="primary-btn"
                      onClick={handleNegotiate}
                    >
                      发送议价
                    </button>
                  </div>
                </>
              )}

              {modalView === 'editPrice' && (
                <>
                  <h2 style={modalTitleStyle}>修改价格</h2>
                  <div style={modalBrandStyle}>{selectedInstrument.name}</div>

                  <label style={labelStyle}>新价格（元）</label>
                  <input
                    type="number"
                    placeholder="请输入新的价格"
                    value={editPriceValue}
                    onChange={(e) => setEditPriceValue(e.target.value)}
                    style={inputStyle}
                  />
                  {editPriceValue && !isNaN(parseFloat(editPriceValue)) && (
                    <div style={{ marginTop: '12px', color: '#8892B0', fontSize: '13px' }}>
                      日租金将自动调整为: ¥{calculateDailyRentalPrice(parseFloat(editPriceValue)).toFixed(2)}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                      style={{ ...secondaryBtnStyle, flex: 1 }}
                      className="secondary-btn"
                      onClick={closeModal}
                    >
                      取消
                    </button>
                    <button
                      style={{ ...primaryBtnStyle, flex: 2 }}
                      className="primary-btn"
                      onClick={handleEditPrice}
                    >
                      确认修改
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={toastStyle}>{toast.message}</div>}
    </>
  );
};

export default App;
