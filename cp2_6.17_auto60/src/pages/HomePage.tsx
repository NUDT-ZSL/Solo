import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PetCard } from '../components/PetCard';
import { getPets, addPet, updatePet, deletePet, Pet } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthDate: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const data = await getPets();
      setPets(data);
    } catch (error) {
      console.error('Failed to load pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (petId: string) => {
    navigate(`/pet/${petId}`);
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      breed: pet.breed,
      birthDate: pet.birthDate
    });
    setShowAddModal(true);
  };

  const handleDelete = async (petId: string) => {
    try {
      await deletePet(petId);
      setPets(pets.filter(p => p.id !== petId));
    } catch (error) {
      console.error('Failed to delete pet:', error);
    }
  };

  const handleUpdateAvatar = async (petId: string, avatar: string) => {
    try {
      await updatePet(petId, { avatar });
      setPets(pets.map(p => p.id === petId ? { ...p, avatar } : p));
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPet) {
        const updated = await updatePet(editingPet.id, formData);
        setPets(pets.map(p => p.id === editingPet.id ? updated : p));
      } else {
        const newPet = await addPet({ ...formData, avatar: '' });
        setPets([...pets, newPet]);
      }
      setShowAddModal(false);
      setEditingPet(null);
      setFormData({ name: '', breed: '', birthDate: '' });
    } catch (error) {
      console.error('Failed to save pet:', error);
    }
  };

  const openAddModal = () => {
    setEditingPet(null);
    setFormData({ name: '', breed: '', birthDate: '' });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#666'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#4e342e', margin: 0, fontFamily: 'Roboto, sans-serif' }}>
          我的宠物
        </h1>
        <button
          onClick={openAddModal}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#f57c00',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            fontFamily: 'Roboto, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e65100';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(245, 124, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f57c00';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={18} />
          添加宠物
        </button>
      </div>

      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '24px',
          justifyContent: 'flex-start'
        }}
      >
        {pets.map(pet => (
          <PetCard
            key={pet.id}
            pet={pet}
            onClick={() => handleCardClick(pet.id)}
            onEdit={() => handleEdit(pet)}
            onDelete={() => handleDelete(pet.id)}
            onUpdateAvatar={(avatar) => handleUpdateAvatar(pet.id, avatar)}
          />
        ))}

        {pets.length === 0 && (
          <div 
            style={{
              width: '100%',
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              fontSize: '16px'
            }}
          >
            还没有宠物档案，点击右上角"添加宠物"创建第一个档案吧！
          </div>
        )}
      </div>

      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
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
              borderRadius: '16px',
              padding: '32px',
              width: '400px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h2 
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#4e342e',
                margin: '0 0 24px 0',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              {editingPet ? '编辑宠物' : '添加宠物'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '6px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  宠物名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'Roboto, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f57c00';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '6px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  品种
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'Roboto, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f57c00';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '6px',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  出生日期
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'Roboto, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f57c00';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    color: '#666',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Roboto, sans-serif'
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
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#f57c00',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e65100';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 124, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f57c00';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {editingPet ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
