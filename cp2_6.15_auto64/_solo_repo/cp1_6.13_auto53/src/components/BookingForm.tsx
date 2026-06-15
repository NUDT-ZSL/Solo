import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Calendar, PawPrint } from 'lucide-react';
import type { Room, PriceCalculation, BookingFormData } from '../types';
import { bookingApi, priceApi } from '../utils/api';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  preselectedRoomId?: string;
}

const BookingForm: React.FC<BookingFormProps> = ({
  isOpen,
  onClose,
  rooms,
  preselectedRoomId,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BookingFormData>({
    step: 1,
    roomId: preselectedRoomId || '',
    checkIn: '',
    checkOut: '',
    petCount: 1,
    petNames: [''],
    services: {
      feeding: false,
      walking: 0,
      bathing: 0,
    },
  });
  const [priceData, setPriceData] = useState<PriceCalculation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const getDatesBetween = (checkIn: string, checkOut: string): string[] => {
    const dates: string[] = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const current = new Date(start);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const calculatePriceLocal = (): PriceCalculation | null => {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) return null;
    
    const room = rooms.find(r => r.id === formData.roomId);
    if (!room) return null;

    const dates = getDatesBetween(formData.checkIn, formData.checkOut);
    let roomTotal = 0;
    
    for (const date of dates) {
      roomTotal += isWeekend(date) ? room.weekendPrice : room.weekdayPrice;
    }

    const days = dates.length;
    const feeding = formData.services.feeding ? 30 * days : 0;
    const walking = formData.services.walking * 50;
    const bathing = formData.services.bathing * 80;

    return {
      totalPrice: roomTotal + feeding + walking + bathing,
      days,
      breakdown: {
        roomTotal,
        feeding,
        walking,
        bathing,
      }
    };
  };

  useEffect(() => {
    if (preselectedRoomId) {
      setFormData(prev => ({ ...prev, roomId: preselectedRoomId }));
    }
  }, [preselectedRoomId]);

  useEffect(() => {
    const localPrice = calculatePriceLocal();
    setPriceData(localPrice);
    
    if (formData.roomId && formData.checkIn && formData.checkOut) {
      calculatePrice();
    }
  }, [formData.roomId, formData.checkIn, formData.checkOut, formData.services]);

  const calculatePrice = async () => {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) return;
    
    setIsCalculating(true);
    try {
      const data = await priceApi.calculate({
        roomId: formData.roomId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        feeding: formData.services.feeding,
        walking: formData.services.walking,
        bathing: formData.services.bathing,
      });
      setPriceData(data);
      setError('');
    } catch (err) {
      console.error('价格计算失败:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleNextStep = () => {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) {
      setError('请填写完整的预订信息');
      return;
    }
    if (new Date(formData.checkIn) >= new Date(formData.checkOut)) {
      setError('离店日期必须晚于入住日期');
      return;
    }
    if (formData.petNames.some(name => !name.trim())) {
      setError('请填写所有宠物的名字');
      return;
    }
    setError('');
    setFormData(prev => ({ ...prev, step: 2 }));
  };

  const handlePrevStep = () => {
    setFormData(prev => ({ ...prev, step: 1 }));
  };

  const handlePetCountChange = (count: number) => {
    const newNames = [...formData.petNames];
    while (newNames.length < count) {
      newNames.push('');
    }
    while (newNames.length > count) {
      newNames.pop();
    }
    setFormData(prev => ({
      ...prev,
      petCount: count,
      petNames: newNames,
    }));
  };

  const handlePetNameChange = (index: number, name: string) => {
    const newNames = [...formData.petNames];
    newNames[index] = name;
    setFormData(prev => ({ ...prev, petNames: newNames }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const booking = await bookingApi.create({
        roomId: formData.roomId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        petCount: formData.petCount,
        petNames: formData.petNames,
        services: formData.services,
      });
      
      onClose();
      navigate(`/order/${booking.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const selectedRoom = rooms.find(r => r.id === formData.roomId);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PawPrint size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>预订房间</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'var(--color-text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-bg-alt)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 24px 0',
          }}
        >
          {[1, 2].map(step => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: formData.step >= step ? 'var(--color-primary)' : 'var(--color-gray-200)',
                  color: formData.step >= step ? 'white' : 'var(--color-text-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                }}
              >
                {step}
              </div>
              <span
                style={{
                  fontSize: '0.9rem',
                  color: formData.step >= step ? 'var(--color-text)' : 'var(--color-text-light)',
                }}
              >
                {step === 1 ? '基本信息' : '增值服务'}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 200px)',
          }}
        >
          {error && (
            <div
              style={{
                background: '#fef2f2',
                color: 'var(--color-danger)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          {formData.step === 1 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '0.95rem',
                  }}
                >
                  <Calendar size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  入住日期
                </label>
                <input
                  type="date"
                  value={formData.checkIn}
                  min={getMinDate()}
                  onChange={e => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '0.95rem',
                  }}
                >
                  <Calendar size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  离店日期
                </label>
                <input
                  type="date"
                  value={formData.checkOut}
                  min={formData.checkIn || getMinDate()}
                  onChange={e => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '0.95rem',
                  }}
                >
                  宠物数量
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePetCountChange(num)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.petCount === num ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: formData.petCount === num ? 'rgba(217, 119, 6, 0.1)' : 'white',
                        color: formData.petCount === num ? 'var(--color-primary)' : 'var(--color-text)',
                        fontWeight: formData.petCount === num ? '600' : '400',
                        fontSize: '1rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {num}只
                    </button>
                  ))}
                </div>
              </div>

              {Array.from({ length: formData.petCount }).map((_, index) => (
                <div key={index}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '500',
                      fontSize: '0.95rem',
                    }}
                  >
                    宠物 {index + 1} 名字
                  </label>
                  <input
                    type="text"
                    value={formData.petNames[index] || ''}
                    onChange={e => handlePetNameChange(index, e.target.value)}
                    placeholder="请输入宠物名字"
                    style={{ width: '100%' }}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '0.95rem',
                  }}
                >
                  选择房间
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rooms.map(room => (
                    <label
                      key={room.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.roomId === room.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: formData.roomId === room.id ? 'rgba(217, 119, 6, 0.05)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="room"
                        checked={formData.roomId === room.id}
                        onChange={() => setFormData(prev => ({ ...prev, roomId: room.id }))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>{room.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                          {room.area}㎡ · 平日¥{room.weekdayPrice}/晚 · 周末¥{room.weekendPrice}/晚
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {formData.step === 2 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  background: 'var(--color-bg-alt)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  {selectedRoom?.name} · {formData.checkIn} 至 {formData.checkOut}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                  宠物：{formData.petNames.join('、')}
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>选择增值服务</h3>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${formData.services.feeding ? 'var(--color-feeding)' : 'var(--color-border)'}`,
                  background: formData.services.feeding ? 'rgba(249, 115, 22, 0.05)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.services.feeding}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    services: { ...prev.services, feeding: e.target.checked },
                  }))}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--color-feeding)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>🍽️ 定时喂食</span>
                    <span style={{ color: 'var(--color-feeding)', fontWeight: '500' }}>+¥30/天</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                    每日三餐按时喂养，提供优质宠物粮
                  </div>
                </div>
              </label>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${formData.services.walking > 0 ? 'var(--color-walking)' : 'var(--color-border)'}`,
                  background: formData.services.walking > 0 ? 'rgba(34, 197, 94, 0.05)' : 'white',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>🐕 遛狗服务</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                      专业遛狗师陪伴户外活动
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-walking)', fontWeight: '500' }}>+¥50/次</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>次数：</span>
                  {[0, 1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        services: { ...prev.services, walking: num },
                      }))}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.services.walking === num ? 'var(--color-walking)' : 'var(--color-border)'}`,
                        background: formData.services.walking === num ? 'var(--color-walking)' : 'white',
                        color: formData.services.walking === num ? 'white' : 'var(--color-text)',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${formData.services.bathing > 0 ? 'var(--color-bathing)' : 'var(--color-border)'}`,
                  background: formData.services.bathing > 0 ? 'rgba(59, 130, 246, 0.05)' : 'white',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>🛁 洗澡护理</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                      专业洗护，包含吹毛和修剪
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-bathing)', fontWeight: '500' }}>+¥80/次</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>次数：</span>
                  {[0, 1, 2, 3].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        services: { ...prev.services, bathing: num },
                      }))}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.services.bathing === num ? 'var(--color-bathing)' : 'var(--color-border)'}`,
                        background: formData.services.bathing === num ? 'var(--color-bathing)' : 'white',
                        color: formData.services.bathing === num ? 'white' : 'var(--color-text)',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {priceData && (
                <div
                  className="fade-in"
                  style={{
                    background: 'var(--color-bg-alt)',
                    padding: '20px',
                    borderRadius: '8px',
                    marginTop: '12px',
                  }}
                >
                  <h4 style={{ marginBottom: '16px', fontSize: '1rem' }}>费用明细</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-light)' }}>
                        房费 ({priceData.days}晚)
                      </span>
                      <span>¥{priceData.breakdown.roomTotal}</span>
                    </div>
                    {priceData.breakdown.feeding > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-light)' }}>喂食服务</span>
                        <span style={{ color: 'var(--color-feeding)' }}>¥{priceData.breakdown.feeding}</span>
                      </div>
                    )}
                    {priceData.breakdown.walking > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-light)' }}>
                          遛狗 ({formData.services.walking}次)
                        </span>
                        <span style={{ color: 'var(--color-walking)' }}>¥{priceData.breakdown.walking}</span>
                      </div>
                    )}
                    {priceData.breakdown.bathing > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-light)' }}>
                          洗澡 ({formData.services.bathing}次)
                        </span>
                        <span style={{ color: 'var(--color-bathing)' }}>¥{priceData.breakdown.bathing}</span>
                      </div>
                    )}
                    <div
                      style={{
                        borderTop: '1px dashed var(--color-border)',
                        paddingTop: '12px',
                        marginTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>总计</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                        ¥{priceData.totalPrice}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '20px 24px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {formData.step === 2 && (
            <button
              className="btn btn-secondary"
              onClick={handlePrevStep}
              style={{ flex: 1 }}
            >
              <ChevronLeft size={18} />
              上一步
            </button>
          )}
          {formData.step === 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleNextStep}
              style={{ flex: 1 }}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || isCalculating}
              style={{ flex: 1 }}
            >
              {isSubmitting ? '提交中...' : '确认预订'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
