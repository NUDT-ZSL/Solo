import { useState } from 'react';
import { Device, Booking } from '../types';

interface DeviceCardProps {
  device: Device;
  bookings: Booking[];
  usageRate: number;
  isAdmin: boolean;
  onClick: () => void;
  onUpdate: (deviceId: string, updates: Partial<Device>) => void;
  showRipple: boolean;
}

const DeviceCard = ({ device, bookings, usageRate, isAdmin, onClick, onUpdate, showRipple }: DeviceCardProps) => {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(device.name);
  const [editModel, setEditModel] = useState(device.model);
  const [isMaintenance, setIsMaintenance] = useState(device.maintenance);

  const getStatusText = () => {
    if (device.maintenance || isMaintenance) return 'maintenance';
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours().toString().padStart(2, '0') + ':00';
    const hasActiveBooking = bookings.some(
      (b) => b.date === today && b.startTime <= currentHour && b.endTime > currentHour
    );
    if (hasActiveBooking) return 'in-use';
    return 'idle';
  };

  const status = getStatusText();

  const handleSave = () => {
    const newStatus = isMaintenance ? 'maintenance' : status;
    onUpdate(device.id, {
      name: editName,
      model: editModel,
      maintenance: isMaintenance,
      status: newStatus as Device['status'],
    });
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditName(device.name);
    setEditModel(device.model);
    setIsMaintenance(device.maintenance);
    setEditMode(false);
  };

  const statusColor = status === 'idle' ? '#4caf50' : status === 'in-use' ? '#ff9800' : '#f44336';

  return (
    <div
      onClick={!editMode && status === 'idle' ? onClick : undefined}
      style={{
        width: '280px',
        height: '200px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #e0f2f1 100%)',
        padding: '20px',
        position: 'relative',
        cursor: !editMode && status === 'idle' ? 'pointer' : 'default',
        transition: 'box-shadow 0.3s ease-out',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      {showRipple && (
        <div
          className="ripple-effect"
          style={{
            left: '50%',
            top: '50%',
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
          }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {editMode ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#004d40',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '2px 6px',
                marginBottom: '4px',
                width: '180px',
                outline: 'none',
              }}
            />
          ) : (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#004d40' }}>{device.name}</div>
            )}
          {editMode ? (
            <input
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '14px',
                color: '#00796b',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '2px 6px',
                width: '180px',
                outline: 'none',
              }}
            />
          ) : (
              <div style={{ fontSize: '14px', color: '#00796b', marginTop: '4px' }}>{device.model}</div>
            )}
        </div>
        <span className={`status-light ${status}`} />
      </div>

      {status === 'in-use' && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '20px',
            backgroundColor: '#ff9800',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          使用中
        </div>
      )}
      {status === 'maintenance' && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '20px',
            backgroundColor: '#f44336',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          维护中
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#00796b' }}>今日使用率</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#004d40' }}>{usageRate}%</span>
        </div>
        <div
          style={{
            height: '12px',
            borderRadius: '8px',
            backgroundColor: '#b2dfdb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${usageRate}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #66bb6a 0%, #43a047 100%)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {editMode && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#333' }}>设为维护中</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaintenance(!isMaintenance);
                }}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: isMaintenance ? '#f44336' : '#bdbdbd',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: isMaintenance ? '26px' : '2px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#004d40',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'box-shadow 0.3s ease-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
              >
                保存
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#fff',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'box-shadow 0.3s ease-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {isAdmin && !editMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditMode(true);
          }}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: statusColor,
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'box-shadow 0.3s ease-out',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
        >
          ⚙
        </button>
      )}
    </div>
  );
};

export default DeviceCard;
