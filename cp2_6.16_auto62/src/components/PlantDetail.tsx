import React, { useState, useEffect } from 'react';
import { Sun, MapPin, Droplets, Leaf, Edit3, X, Camera } from 'lucide-react';
import type { Plant, CareType } from '../types';
import { LIGHT_LABELS, LOCATION_LABELS, CARE_TYPE_LABELS } from '../types';
import { formatDateTime } from '../utils';
import { updatePlant, addCareRecord } from '../api';

interface PlantDetailProps {
  plant: Plant;
  onUpdate: (plant: Plant) => void;
}

const PlantDetail: React.FC<PlantDetailProps> = ({ plant, onUpdate }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: plant.name,
    variety: plant.variety,
    lightPreference: plant.lightPreference,
    locationPreference: plant.locationPreference,
  });

  useEffect(() => {
    setEditForm({
      name: plant.name,
      variety: plant.variety,
      lightPreference: plant.lightPreference,
      locationPreference: plant.locationPreference,
    });
  }, [plant.id, plant.name, plant.variety, plant.lightPreference, plant.locationPreference]);

  const headerPlaceholderStyle: React.CSSProperties = {
    width: '100%',
    height: '200px',
    borderRadius: '12px',
    backgroundColor: '#e0f2fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  };

  const infoSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
  };

  const infoLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#6b7280',
    minWidth: '110px',
  };

  const infoValueStyle: React.CSSProperties = {
    color: '#1f2937',
    fontWeight: 500,
  };

  const actionButtonStyle: React.CSSProperties = {
    width: '160px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    marginBottom: '24px',
  };

  const editButtonStyle: React.CSSProperties = {
    ...actionButtonStyle,
    backgroundColor: '#ffffff',
    color: '#16a34a',
    border: '1px solid #16a34a',
    marginLeft: '12px',
  };

  const handleActionButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.03)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
  };

  const handleActionButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const recordsTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  };

  const recordItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'background-color 0.2s ease',
  };

  const recordTypeBadgeStyle = (type: CareType): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: type === 'water' ? '#dbeafe' : '#dcfce7',
    color: type === 'water' ? '#2563eb' : '#16a34a',
    minWidth: '50px',
    textAlign: 'center',
  });

  const recordTimeStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px',
  };

  const recordOperatorStyle: React.CSSProperties = {
    marginLeft: 'auto',
    color: '#6b7280',
    fontSize: '13px',
  };

  const modalBackdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#00000055',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContentStyle: React.CSSProperties = {
    width: '400px',
    height: '500px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  };

  const modalTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '24px',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  };

  const formGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
  };

  const formLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  };

  const formInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
  };

  const formSelectStyle: React.CSSProperties = {
    ...formInputStyle,
    cursor: 'pointer',
    backgroundColor: '#ffffff',
  };

  const modalFooterStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginTop: 'auto',
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const saveButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const handleAddCareRecord = async (type: CareType) => {
    try {
      const updated = await addCareRecord(plant.id, type);
      onUpdate(updated);
    } catch (err) {
      console.error('添加养护记录失败', err);
    }
  };

  const handleOpenEditModal = () => {
    setIsModalClosing(false);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setIsModalClosing(false);
    }, 300);
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await updatePlant(plant.id, editForm);
      onUpdate(updated);
      handleCloseEditModal();
    } catch (err) {
      console.error('保存植物信息失败', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseEditModal();
    }
  };

  return (
    <div>
      <div style={headerPlaceholderStyle}>
        <Camera size={64} color="#0ea5e9" />
      </div>

      <div style={infoSectionStyle}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
          {plant.name}
        </h2>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>品种</span>
          <span style={infoValueStyle}>{plant.variety}</span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>
            <Sun size={16} />
            光照偏好
          </span>
          <span style={infoValueStyle}>{LIGHT_LABELS[plant.lightPreference]}</span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>
            <MapPin size={16} />
            位置偏好
          </span>
          <span style={infoValueStyle}>{LOCATION_LABELS[plant.locationPreference]}</span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>
            <Droplets size={16} color="#3b82f6" />
            上次浇水
          </span>
          <span style={infoValueStyle}>{formatDateTime(plant.lastWaterTime)}</span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>
            <Leaf size={16} color="#22c55e" />
            上次施肥
          </span>
          <span style={infoValueStyle}>{formatDateTime(plant.lastFertilizeTime)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          style={actionButtonStyle}
          onClick={() => handleAddCareRecord('water')}
          onMouseEnter={handleActionButtonHover}
          onMouseLeave={handleActionButtonLeave}
        >
          <Droplets size={18} />
          添加浇水记录
        </button>
        <button
          style={editButtonStyle}
          onClick={handleOpenEditModal}
          onMouseEnter={handleActionButtonHover}
          onMouseLeave={handleActionButtonLeave}
        >
          <Edit3 size={18} />
          编辑植物信息
        </button>
      </div>

      <h3 style={recordsTitleStyle}>养护记录</h3>
      <div>
        {plant.careRecords.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>暂无养护记录</p>
        ) : (
          plant.careRecords.slice(0, 10).map((record) => (
            <div
              key={record.id}
              style={recordItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
            >
              <span style={recordTypeBadgeStyle(record.type)}>
                {CARE_TYPE_LABELS[record.type]}
              </span>
              <span style={recordTimeStyle}>{formatDateTime(record.time)}</span>
              <span style={recordOperatorStyle}>{record.operator}</span>
            </div>
          ))
        )}
      </div>

      {isEditModalOpen && (
        <div
          style={modalBackdropStyle}
          className={isModalClosing ? 'modal-backdrop-exiting' : 'modal-backdrop-entering'}
          onClick={handleBackdropClick}
        >
          <div
            style={modalContentStyle}
            className={isModalClosing ? 'modal-content-exiting' : 'modal-content-entering'}
          >
            <h3 style={modalTitleStyle}>编辑植物信息</h3>
            <button
              style={closeButtonStyle}
              onClick={handleCloseEditModal}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>

            <div style={formGroupStyle}>
              <div>
                <label style={formLabelStyle}>植物名称</label>
                <input
                  style={formInputStyle}
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label style={formLabelStyle}>品种</label>
                <input
                  style={formInputStyle}
                  type="text"
                  value={editForm.variety}
                  onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                />
              </div>
              <div>
                <label style={formLabelStyle}>光照偏好</label>
                <select
                  style={formSelectStyle}
                  value={editForm.lightPreference}
                  onChange={(e) => setEditForm({ ...editForm, lightPreference: e.target.value as any })}
                >
                  <option value="direct">直射</option>
                  <option value="scattered">散射</option>
                  <option value="shady">阴暗</option>
                </select>
              </div>
              <div>
                <label style={formLabelStyle}>位置偏好</label>
                <select
                  style={formSelectStyle}
                  value={editForm.locationPreference}
                  onChange={(e) => setEditForm({ ...editForm, locationPreference: e.target.value as any })}
                >
                  <option value="balcony">阳台</option>
                  <option value="living_room">客厅</option>
                  <option value="bedroom">卧室</option>
                </select>
              </div>
              <div style={modalFooterStyle}>
                <button
                  style={cancelButtonStyle}
                  onClick={handleCloseEditModal}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  取消
                </button>
                <button
                  style={saveButtonStyle}
                  onClick={handleSaveEdit}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantDetail;
