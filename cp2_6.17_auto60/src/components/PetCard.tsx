import React, { useRef, useState } from 'react';
import { Pencil, Trash2, Cat } from 'lucide-react';
import { Pet } from '../utils/api';

interface PetCardProps {
  pet: Pet;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateAvatar: (avatar: string) => void;
}

export const PetCard: React.FC<PetCardProps> = ({ 
  pet, 
  onClick, 
  onEdit, 
  onDelete,
  onUpdateAvatar 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <>
      <div
        className="pet-card"
        onClick={onClick}
        style={{
          width: '240px',
          height: '320px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'perspective(1000px) rotateY(5deg) translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'perspective(1000px) rotateY(0) translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <div
          className="pet-avatar"
          onClick={handleAvatarClick}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '3px solid #ffb74d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: '16px',
            backgroundColor: '#fff',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {pet.avatar ? (
            <img 
              src={pet.avatar} 
              alt={pet.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Cat size={48} color="#8d6e63" />
          )}
        </div>

        <h3 
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#4e342e',
            margin: '0 0 8px 0',
            fontFamily: 'Roboto, sans-serif'
          }}
        >
          {pet.name}
        </h3>

        <p 
          style={{
            fontSize: '14px',
            color: '#8d6e63',
            margin: '4px 0',
            fontFamily: 'Roboto, sans-serif'
          }}
        >
          {pet.breed}
        </p>

        <p 
          style={{
            fontSize: '14px',
            color: '#8d6e63',
            margin: '4px 0',
            fontFamily: 'Roboto, sans-serif'
          }}
        >
          出生：{pet.birthDate}
        </p>

        <div 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            display: 'flex',
            gap: '8px'
          }}
        >
          <button
            onClick={handleEditClick}
            className="action-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Pencil size={16} color="#795548" />
          </button>

          <button
            onClick={handleDeleteClick}
            className="action-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Trash2 size={16} color="#e53935" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          onClick={handleCancelDelete}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              width: '320px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h3 
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#4e342e',
                margin: '0 0 12px 0'
              }}
            >
              确认删除
            </h3>
            <p 
              style={{
                fontSize: '14px',
                color: '#666',
                margin: '0 0 20px 0'
              }}
            >
              确定要删除宠物「{pet.name}」的档案吗？此操作不可撤销。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#e53935',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c62828';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(229, 57, 53, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e53935';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
