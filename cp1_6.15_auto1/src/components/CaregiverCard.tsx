import React, { useState, useMemo } from 'react';
import {
  Caregiver,
  MatchResult,
  PET_TYPE_LABELS,
  PET_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  ServiceType,
  PetType,
  FilterCriteria
} from '../types';
import { checkScheduleConflict, calculateTotalPrice, getMonthCalendarDays } from '../logic/scheduleManager';
import { getServicePrice } from '../logic/matching';
import { api } from '../data/api';

interface CaregiverCardProps {
  result: MatchResult;
  index: number;
  filters: FilterCriteria;
  onBooked: () => void;
}

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
      {[...Array(5)].map((_, i) => {
        let fill = '#D3D3D3';
        if (i < fullStars) fill = '#FFD700';
        else if (i === fullStars && hasHalf) fill = 'url(#half-gradient)';

        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id="half-gradient">
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#D3D3D3" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={fill}
            />
          </svg>
        );
      })}
      <span style={{ marginLeft: '6px', fontWeight: 600, color: '#8B7355', fontSize: size - 2 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
};

const PawAvatar: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: '#F0E68C',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid #DEB887',
      boxShadow: '0 2px 6px rgba(139,115,85,0.15)',
      flexShrink: 0
    }}
  >
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="#8B7355">
      <ellipse cx="12" cy="16" rx="4" ry="3.5" />
      <ellipse cx="6" cy="9" rx="2.2" ry="2.8" />
      <ellipse cx="18" cy="9" rx="2.2" ry="2.8" />
      <ellipse cx="9" cy="4.5" rx="1.8" ry="2.3" />
      <ellipse cx="15" cy="4.5" rx="1.8" ry="2.3" />
    </svg>
  </div>
);

const CaregiverCard: React.FC<CaregiverCardProps> = ({ result, index, filters, onBooked }) => {
  const { caregiver, nearestAvailableDate } = result;
  const [showDetail, setShowDetail] = useState(false);
  const [animState, setAnimState] = useState<'hidden' | 'showing' | 'visible' | 'hiding'>('hidden');

  const openDetail = () => {
    setShowDetail(true);
    setAnimState('showing');
    setTimeout(() => setAnimState('visible'), 50);
  };

  const closeDetail = () => {
    setAnimState('hiding');
    setTimeout(() => {
      setShowDetail(false);
      setAnimState('hidden');
    }, 250);
  };

  const priceDisplay = useMemo(() => {
    if (filters.serviceType) {
      const price = getServicePrice(caregiver, filters.serviceType);
      if (price !== null) {
        return `¥${price}/${filters.serviceType === 'overnight' ? '晚' : filters.serviceType === 'walking' || filters.serviceType === 'homefeeding' ? '次' : '天'}`;
      }
    }
    const cheapest = [...caregiver.services].sort((a, b) => a.price - b.price)[0];
    if (cheapest) {
      return `¥${cheapest.price}起`;
    }
    return '价格面议';
  }, [caregiver, filters.serviceType]);

  return (
    <>
      <div
        onClick={openDetail}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '16px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          border: '1px solid #E8DCC8',
          opacity: 0,
          transform: 'translateY(16px)',
          animation: `cardStaggerIn 0.3s ease ${index * 0.08}s forwards`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <PawAvatar size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#5C4A32' }}>
              {caregiver.name}
            </h3>
            <div style={{ marginTop: '4px' }}>
              <StarRating rating={caregiver.rating} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#228B22' }}>
            {priceDisplay}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {caregiver.acceptedPets.map((pet) => (
            <span
              key={pet}
              style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                backgroundColor: PET_TYPE_COLORS[pet] + '30',
                color: PET_TYPE_COLORS[pet],
                border: `1px solid ${PET_TYPE_COLORS[pet]}50`
              }}
            >
              {PET_TYPE_LABELS[pet]}
            </span>
          ))}
        </div>

        <div
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: nearestAvailableDate ? '#98FB9830' : '#FF634730',
            border: `1px solid ${nearestAvailableDate ? '#98FB98' : '#FF6347'}50`,
            fontSize: '12px',
            color: nearestAvailableDate ? '#228B22' : '#B22222',
            fontWeight: 600,
            transition: 'all 0.3s ease'
          }}
        >
          {nearestAvailableDate
            ? <span>📅 最近可预约: <span style={{ color: '#228B22', fontWeight: 700 }}>{nearestAvailableDate}</span></span>
            : '⚠️ 近期无空余日期'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#A08870' }}>
          <span>已服务 {caregiver.servedCount} 次</span>
          <span style={{ color: '#DEB887', fontWeight: 600 }}>查看详情 →</span>
        </div>
      </div>

      {showDetail && (
        <CaregiverDetailModal
          caregiver={caregiver}
          filters={filters}
          animState={animState}
          onClose={closeDetail}
          onBooked={onBooked}
        />
      )}
    </>
  );
};

interface DetailModalProps {
  caregiver: Caregiver;
  filters: FilterCriteria;
  animState: 'hidden' | 'showing' | 'visible' | 'hiding';
  onClose: () => void;
  onBooked: () => void;
}

const CaregiverDetailModal: React.FC<DetailModalProps> = ({ caregiver, filters, animState, onClose, onBooked }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedStart, setSelectedStart] = useState<string | null>(filters.startDate || null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(filters.endDate || null);
  const [selectedService, setSelectedService] = useState<ServiceType>(
    filters.serviceType || caregiver.services[0]?.type || 'overnight'
  );
  const [petType, setPetType] = useState<PetType>(filters.petType || caregiver.acceptedPets[0] || 'dog');
  const [petName, setPetName] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const calendarDays = getMonthCalendarDays(currentYear, currentMonth);

  const handleDateClick = (dateStr: string) => {
    if (caregiver.bookedDates.includes(dateStr)) return;
    if (new Date(dateStr) < new Date(today.toISOString().split('T')[0])) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(dateStr);
      setSelectedEnd(null);
    } else {
      if (new Date(dateStr) >= new Date(selectedStart)) {
        setSelectedEnd(dateStr);
      } else {
        setSelectedStart(dateStr);
      }
    }
  };

  const totalDays = selectedStart && selectedEnd
    ? Math.ceil((new Date(selectedEnd).getTime() - new Date(selectedStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const servicePrice = getServicePrice(caregiver, selectedService) || 0;
  const totalPrice = servicePrice * totalDays;

  const isDateInRange = (dateStr: string) => {
    if (!selectedStart || !selectedEnd) return false;
    return new Date(dateStr) >= new Date(selectedStart) && new Date(dateStr) <= new Date(selectedEnd);
  };

  const handleSubmit = async () => {
    if (!selectedStart || !selectedEnd) {
      setErrorMsg('请选择预约日期范围');
      return;
    }
    if (!petName.trim()) {
      setErrorMsg('请填写宠物名字');
      return;
    }

    const conflict = checkScheduleConflict(caregiver, selectedStart, selectedEnd);
    if (conflict.hasConflict) {
      setErrorMsg(`所选日期 ${conflict.conflictingDates?.join(', ')} 已被预约`);
      return;
    }

    setSubmitState('submitting');
    setErrorMsg('');
    try {
      await api.createOrder({
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        petType,
        petName: petName.trim(),
        serviceType: selectedService,
        startDate: selectedStart,
        endDate: selectedEnd,
        totalPrice
      });
      setSubmitState('success');
      setTimeout(() => {
        onBooked();
      }, 2000);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (e) {
      setErrorMsg('提交失败，请重试');
      setSubmitState('idle');
    }
  };

  const transformStyle = animState === 'visible'
    ? 'translateY(0)'
    : 'translateY(100%)';
  const overlayOpacity = animState === 'visible' ? 1 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: overlayOpacity,
          transition: 'opacity 0.25s ease'
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: '#FFFEF7',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
          transform: transformStyle,
          transition: 'transform 0.25s ease',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E8DCC8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: '#FFFEF7',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PawAvatar size={52} />
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#5C4A32' }}>{caregiver.name}</h2>
              <div style={{ marginTop: '4px' }}>
                <StarRating rating={caregiver.rating} size={18} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#F5DEB380',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#8B7355',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}
          className="modal-content-grid"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                📝 个人介绍
              </h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#5C4A32' }}>
                {caregiver.bio}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                🐾 可接受宠物
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {caregiver.acceptedPets.map((p) => (
                  <span
                    key={p}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      backgroundColor: PET_TYPE_COLORS[p] + '30',
                      color: PET_TYPE_COLORS[p],
                      border: `1px solid ${PET_TYPE_COLORS[p]}60`,
                      fontWeight: 500
                    }}
                  >
                    {PET_TYPE_LABELS[p]}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                📊 服务统计
              </h4>
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#F5DEB340',
                fontSize: '15px',
                fontWeight: 600,
                color: '#5C4A32'
              }}>
                🏆 已服务 <span style={{ color: '#B22222' }}>{caregiver.servedCount}</span> 只宠物
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                💬 客户评价标签
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {caregiver.reviewTags.map((tag) => (
                  <span
                    key={tag.text}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      backgroundColor: '#DEB88740',
                      color: '#8B7355',
                      border: '1px solid #DEB88760',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {tag.text}
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>({tag.count})</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                💰 服务价格
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {caregiver.services.map((s) => (
                  <div
                    key={s.type}
                    onClick={() => setSelectedService(s.type)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1.5px solid ${selectedService === s.type ? '#B22222' : '#E8DCC8'}`,
                      backgroundColor: selectedService === s.type ? '#B2222210' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#5C4A32', fontWeight: 500 }}>
                      {SERVICE_TYPE_LABELS[s.type]}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#228B22' }}>
                      ¥{s.price}
                      <span style={{ fontSize: '11px', fontWeight: 400, color: '#A08870' }}>
                        /{s.type === 'overnight' ? '晚' : s.type === 'walking' || s.type === 'homefeeding' ? '次' : '天'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                📅 选择预约日期
              </h4>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #E8DCC8',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <button
                    onClick={() => {
                      if (currentMonth === 0) {
                        setCurrentMonth(11);
                        setCurrentYear(currentYear - 1);
                      } else {
                        setCurrentMonth(currentMonth - 1);
                      }
                    }}
                    style={{
                      width: '32px', height: '32px', border: 'none', borderRadius: '50%',
                      backgroundColor: '#F5DEB360', cursor: 'pointer', color: '#8B7355', fontSize: '16px'
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '16px', color: '#5C4A32' }}>
                    {currentYear}年{currentMonth + 1}月
                  </span>
                  <button
                    onClick={() => {
                      if (currentMonth === 11) {
                        setCurrentMonth(0);
                        setCurrentYear(currentYear + 1);
                      } else {
                        setCurrentMonth(currentMonth + 1);
                      }
                    }}
                    style={{
                      width: '32px', height: '32px', border: 'none', borderRadius: '50%',
                      backgroundColor: '#F5DEB360', cursor: 'pointer', color: '#8B7355', fontSize: '16px'
                    }}
                  >
                    ▶
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                  {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#A08870', fontWeight: 600, padding: '6px 0' }}>
                      {d}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {calendarDays.map((dateStr) => {
                    const isBooked = caregiver.bookedDates.includes(dateStr);
                    const isPast = new Date(dateStr) < new Date(today.toISOString().split('T')[0]);
                    const isCurrentMonth = new Date(dateStr).getMonth() === currentMonth;
                    const isSelected = dateStr === selectedStart || dateStr === selectedEnd;
                    const inRange = isDateInRange(dateStr);

                    let bg = 'transparent';
                    let color = isCurrentMonth ? '#5C4A32' : '#D3D3D3';
                    let cursor = 'pointer';
                    let border = '1px solid transparent';

                    if (isBooked) {
                      bg = '#FF6347';
                      color = '#FFFFFF';
                      cursor = 'not-allowed';
                      border = '1px solid #FF6347';
                    } else if (isPast) {
                      bg = '#F0E8DC';
                      color = '#C8B8A0';
                      cursor = 'not-allowed';
                    } else if (isSelected) {
                      bg = '#B22222';
                      color = '#FFFFFF';
                      border = '1px solid #B22222';
                    } else if (inRange) {
                      bg = '#DEB88760';
                      color = '#5C4A32';
                    } else if (isCurrentMonth) {
                      bg = '#98FB98';
                      color = '#2E7D32';
                      border = '1px solid #98FB9880';
                    }

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDateClick(dateStr)}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isBooked || isSelected ? 700 : 500,
                          backgroundColor: bg,
                          color,
                          cursor,
                          border,
                          transition: 'all 0.2s ease',
                          userSelect: 'none',
                          position: 'relative'
                        }}
                      >
                        {new Date(dateStr).getDate()}
                        {isBooked && (
                          <div style={{
                            position: 'absolute', bottom: '2px',
                            width: '6px', height: '2px',
                            borderRadius: '1px', backgroundColor: '#FFFFFF'
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px',
                  borderTop: '1px solid #F0E8DC', fontSize: '12px', flexWrap: 'wrap'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#FF6347', border: '1px solid #FF6347' }} />
                    已预约
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#98FB98', border: '1px solid #98FB9880' }} />
                    可预约
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#B22222' }} />
                    已选择
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E8DCC8',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <h4 style={{ margin: 0, fontSize: '14px', color: '#8B7355', fontWeight: 600 }}>
                ✍️ 填写预约信息
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '6px' }}>宠物类型</label>
                  <select
                    value={petType}
                    onChange={(e) => setPetType(e.target.value as PetType)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #E8DCC8',
                      fontSize: '14px',
                      backgroundColor: '#FFFEF7',
                      color: '#5C4A32',
                      boxSizing: 'border-box'
                    }}
                  >
                    {caregiver.acceptedPets.map((p) => (
                      <option key={p} value={p}>{PET_TYPE_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '6px' }}>宠物名字</label>
                  <input
                    type="text"
                    placeholder="请输入宠物名字"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #E8DCC8',
                      fontSize: '14px',
                      backgroundColor: '#FFFEF7',
                      color: '#5C4A32',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {selectedStart && selectedEnd && totalDays > 0 && (
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#F5DEB340',
                  border: '1px solid #DEB88760'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#8B7355' }}>
                    <span>📅 服务时间</span>
                    <span>{selectedStart} ~ {selectedEnd} ({totalDays}天)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#8B7355' }}>
                    <span>🛎️ 服务类型</span>
                    <span>{SERVICE_TYPE_LABELS[selectedService]}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', paddingTop: '10px',
                    marginTop: '10px', borderTop: '1px dashed #DEB887'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#5C4A32' }}>💵 总计</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#228B22' }}>
                      ¥{totalPrice}
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FF634720',
                  color: '#B22222',
                  fontSize: '13px',
                  border: '1px solid #FF634740'
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitState !== 'idle'}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: submitState === 'idle' ? 'pointer' : 'not-allowed',
                  backgroundColor: submitState === 'success' ? '#32CD32' : '#B22222',
                  color: '#FFFFFF',
                  transition: 'background-color 0.3s ease, transform 0.2s ease',
                  transform: submitState === 'submitting' ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {submitState === 'idle' && '🎯 申请预约'}
                {submitState === 'submitting' && '⏳ 提交中...'}
                {submitState === 'success' && '✅ 已提交，等待确认'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverCard;
