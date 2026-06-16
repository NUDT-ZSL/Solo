import { useState, useEffect } from 'react';
import { appDataStore, type Booking, type BookingPurpose, type Equipment } from '@/DataStore';

interface ScheduleBoardProps {
  from: typeof appDataStore;
}

const purposeLabels: Record<BookingPurpose, string> = {
  baking: '烘焙',
  chinese: '中餐',
  dessert: '西点',
};

interface BookingFormData {
  userName: string;
  peopleCount: number;
  purpose: BookingPurpose;
}

export function ScheduleBoard({ from }: ScheduleBoardProps) {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookingsBySlot, setBookingsBySlot] = useState<Map<string, Booking[]>>(new Map());
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    userName: '',
    peopleCount: 1,
    purpose: 'baking',
  });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);

  useEffect(() => {
    setTimeSlots(from.getTimeSlots());
    refreshData();
    return from.subscribe(refreshData);
  }, [from]);

  const refreshData = () => {
    const newMap = new Map<string, Booking[]>();
    from.getTimeSlots().forEach(slot => {
      newMap.set(slot, from.getBookingsBySlot(slot));
    });
    setBookingsBySlot(newMap);
    setEquipments(from.getEquipments());
  };

  const handleSlotClick = (slot: string) => {
    if (from.hasConflict(slot)) {
      const nextSlot = from.findNextAvailableSlot(slot);
      setConflictMessage(
        nextSlot
          ? `该时段已满，推荐最近空闲时段：${nextSlot}`
          : '今日所有时段均已满'
      );
      return;
    }
    setSelectedSlot(slot);
    setShowForm(true);
    setConflictMessage(null);
  };

  const handleBooking = () => {
    if (!selectedSlot || !formData.userName.trim()) return;

    const result = from.bookSlot(selectedSlot, {
      userName: formData.userName.trim(),
      peopleCount: formData.peopleCount,
      purpose: formData.purpose,
    });

    if (result) {
      setShowForm(false);
      setSelectedSlot(null);
      setFormData({ userName: '', peopleCount: 1, purpose: 'baking' });
    }
  };

  const handleCancel = (bookingId: string) => {
    setCancellingId(bookingId);
    setTimeout(() => {
      from.releaseSlot(bookingId);
      setCancellingId(null);
    }, 300);
  };

  const handleLockEquipment = (equipmentId: string) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (equipment?.status === 'idle') {
      from.lockEquipment(equipmentId, 'manual-lock');
    } else if (equipment?.status === 'in-use') {
      from.unlockEquipment(equipmentId);
    }
  };

  const getEquipmentStatusText = (eq: Equipment) => {
    switch (eq.status) {
      case 'idle':
        return '空闲';
      case 'in-use':
        if (eq.occupiedUntil) {
          const hours = Math.ceil(
            (eq.occupiedUntil.getTime() - Date.now()) / (1000 * 60 * 60)
          );
          return `使用中 (约${hours}小时后结束)`;
        }
        return '使用中';
      case 'maintenance':
        return '维护中';
    }
  };

  return (
    <div className="schedule-board">
      <h2 className="panel-title">
        <span className="title-icon">📅</span>
        预约管理
      </h2>

      <div className="schedule-grid">
        <div className="time-labels">
          {timeSlots.map(slot => (
            <div key={slot} className="time-label">
              {slot}
            </div>
          ))}
        </div>

        <div className="booking-columns">
          {timeSlots.map(slot => {
            const slotBookings = bookingsBySlot.get(slot) || [];
            const isFull = from.hasConflict(slot);

            return (
              <div key={slot} className="time-row">
                {[0, 1, 2].map(colIndex => {
                  const booking = slotBookings[colIndex];
                  const isCancelling = booking && cancellingId === booking.id;

                  return (
                    <div
                      key={colIndex}
                      className={`booking-slot ${booking ? 'booked' : 'empty'} ${
                        isFull && !booking ? 'full' : ''
                      } ${isCancelling ? 'cancelling' : ''}`}
                      onClick={() => {
                        if (booking) {
                          handleCancel(booking.id);
                        } else if (!isFull) {
                          handleSlotClick(slot);
                        } else {
                          handleSlotClick(slot);
                        }
                      }}
                      onMouseEnter={() => booking && setHoveredBooking(booking)}
                      onMouseLeave={() => setHoveredBooking(null)}
                    >
                      {booking ? (
                        <div className="booking-card">
                          <div className="booking-name">{booking.userName}</div>
                          <div className="booking-info">
                            {booking.peopleCount}人 · {purposeLabels[booking.purpose]}
                          </div>
                        </div>
                      ) : isFull ? (
                        <span className="full-text">已满</span>
                      ) : (
                        <span className="plus-sign">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {conflictMessage && (
        <div className="conflict-message">
          <span className="warning-icon">⚠️</span>
          {conflictMessage}
        </div>
      )}

      <div className="equipment-section">
        <h3 className="section-subtitle">设备状态</h3>
        <div className="equipment-scroll">
          {equipments.map(eq => (
            <div
              key={eq.id}
              className={`equipment-card status-${eq.status}`}
              onClick={() => handleLockEquipment(eq.id)}
            >
              <div className="equipment-name">{eq.name}</div>
              <div className={`equipment-status status-${eq.status}`}>
                {getEquipmentStatusText(eq)}
              </div>
              {eq.status === 'idle' && (
                <div className="equipment-hint">点击锁定</div>
              )}
              {eq.status === 'in-use' && (
                <div className="equipment-hint">点击释放</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showForm && selectedSlot && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>预约 {selectedSlot} 时段</h3>
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={formData.userName}
                onChange={e =>
                  setFormData({ ...formData, userName: e.target.value })
                }
                placeholder="请输入您的姓名"
              />
            </div>
            <div className="form-group">
              <label>预计使用人数</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.peopleCount}
                onChange={e =>
                  setFormData({
                    ...formData,
                    peopleCount: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>用途</label>
              <div className="purpose-options">
                {(['baking', 'chinese', 'dessert'] as BookingPurpose[]).map(p => (
                  <label
                    key={p}
                    className={`purpose-option ${
                      formData.purpose === p ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value={p}
                      checked={formData.purpose === p}
                      onChange={() => setFormData({ ...formData, purpose: p })}
                    />
                    <span>{purposeLabels[p]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleBooking}
                disabled={!formData.userName.trim()}
              >
                确认预约
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredBooking && (
        <div className="tooltip">
          <div className="tooltip-title">{hoveredBooking.userName}</div>
          <div className="tooltip-row">时段：{hoveredBooking.timeSlot}</div>
          <div className="tooltip-row">人数：{hoveredBooking.peopleCount}人</div>
          <div className="tooltip-row">用途：{purposeLabels[hoveredBooking.purpose]}</div>
          <div className="tooltip-hint">点击取消预约</div>
        </div>
      )}
    </div>
  );
}
