import { useState } from 'react';
import dayjs from 'dayjs';
import DatePicker from 'react-datepicker';
import { Device, Booking } from '../types';

interface BookingDialogProps {
  device: Device;
  bookings: Booking[];
  onClose: () => void;
  onSuccess: () => void;
}

const BookingDialog = ({ device, bookings, onClose, onSuccess }: BookingDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [shake, setShake] = useState(false);

  const timeSlots = [];
  for (let i = 9; i < 23; i++) {
    const start = `${i.toString().padStart(2, '0')}:00`;
    const end = `${(i + 1).toString().padStart(2, '0')}:00`;
    timeSlots.push({ start, end, label: `${start}-${end}` });
  }

  const isTimeSlotBooked = (start: string, end: string): boolean => {
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    return bookings.some(
      (b) =>
        b.deviceId === device.id &&
        b.date === dateStr &&
        !(end <= b.startTime || start >= b.endTime)
    );
  };

  const handleSubmit = async () => {
    if (!selectedTime) {
      setError('请选择预约时间段');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    const [start, end] = selectedTime.split('-');
    if (isTimeSlotBooked(start, end)) {
      setError('该时段已被预约，请选择其他时间');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.id,
          date: dayjs(selectedDate).format('YYYY-MM-DD'),
          startTime: start,
          endTime: end,
          note,
          userId: 'current-user',
        }),
      });

      if (res.status === 409) {
        setError('该时段已被预约，请选择其他时间');
        setShake(true);
        setTimeout(() => setShake(false), 300);
        return;
      }

      if (res.ok) {
        onSuccess();
      }
    } catch (err) {
      setError('提交失败，请重试');
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={shake ? 'shake-animation' : ''}
        style={{
          width: '480px',
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#004d40' }}>预约设备</h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            {device.name} · {device.model}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: 500 }}>
            选择日期
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            minDate={new Date()}
            maxDate={dayjs().add(7, 'day').toDate()}
            dateFormat="yyyy-MM-dd"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: 500 }}>
            选择时间段
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {timeSlots.map((slot) => {
              const booked = isTimeSlotBooked(slot.start, slot.end);
              return (
                <div
                  key={slot.label}
                  onClick={() => !booked && setSelectedTime(slot.label)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: selectedTime === slot.label ? '1px solid #00796b' : '1px solid #e0e0e0',
                    backgroundColor: booked ? '#eeeeee' : selectedTime === slot.label ? '#e0f2f1' : '#fff',
                    color: booked ? '#9e9e9e' : '#333',
                    cursor: booked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{slot.label}</span>
                  {booked && (
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#f44336',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      !
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: 500 }}>
            备注
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="请输入备注信息（选填）"
              style={{
                width: '400px',
                height: '80px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                resize: 'none',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00796b')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            />
            <span
              style={{
                position: 'absolute',
                right: '32px',
                bottom: '8px',
                fontSize: '12px',
                color: '#999',
              }}
            >
              {note.length}/200
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: '#d32f2f', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              color: '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'box-shadow 0.3s ease-out',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#004d40',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'box-shadow 0.3s ease-out',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
          >
            确认预约
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDialog;
