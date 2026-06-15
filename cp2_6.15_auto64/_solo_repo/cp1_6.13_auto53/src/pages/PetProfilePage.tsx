import React, { useState } from 'react';
import { PawPrint, Calendar, Info } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  photoUrl?: string;
  allergies: string[];
  history: {
    checkIn: string;
    checkOut: string;
    roomName: string;
  }[];
}

const mockPets: Pet[] = [
  {
    id: 'pet-1',
    name: '旺财',
    breed: '金毛寻回犬',
    age: 3,
    allergies: ['花生', '牛肉'],
    history: [
      { checkIn: '2026-05-01', checkOut: '2026-05-05', roomName: '豪华房' },
      { checkIn: '2026-04-10', checkOut: '2026-04-12', roomName: '标准间' },
    ],
  },
  {
    id: 'pet-2',
    name: '豆豆',
    breed: '柯基',
    age: 2,
    allergies: ['海鲜'],
    history: [
      { checkIn: '2026-05-10', checkOut: '2026-05-15', roomName: '标准间' },
    ],
  },
  {
    id: 'pet-3',
    name: '咪咪',
    breed: '布偶猫',
    age: 4,
    allergies: ['鸡肉'],
    history: [
      { checkIn: '2026-05-10', checkOut: '2026-05-15', roomName: '标准间' },
      { checkIn: '2026-03-20', checkOut: '2026-03-25', roomName: '豪华房' },
    ],
  },
  {
    id: 'pet-4',
    name: '球球',
    breed: '泰迪',
    age: 1,
    allergies: [],
    history: [],
  },
];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

const getPetEmoji = (breed: string) => {
  if (breed.includes('猫')) return '🐱';
  return '🐕';
};

const PetProfilePage: React.FC = () => {
  const [selectedPetId, setSelectedPetId] = useState<string | null>('pet-1');

  const selectedPet = mockPets.find(p => p.id === selectedPetId);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '1.75rem' }}>🐾 宠物档案</h1>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          minHeight: '600px',
          flexWrap: 'wrap',
        }}
        className="fade-in"
      >
        <div
          style={{
            width: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            '@media (max-width: 768px)': { width: '100%' },
          }}
          className="pet-list"
        >
          <style>{`
            @media (max-width: 768px) {
              .pet-list { width: 100% !important; }
            }
          `}</style>
          
          {mockPets.map(pet => (
            <div
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--color-gray-100)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderLeft: `4px solid ${selectedPetId === pet.id ? 'var(--color-accent-blue)' : 'transparent'}`,
                transform: selectedPetId === pet.id ? 'translateX(4px)' : 'translateX(0)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-gray-200)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-gray-100)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    fontSize: '2rem',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {getPetEmoji(pet.breed)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1rem' }}>{pet.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                    {pet.breed} · {pet.age}岁
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: '300px',
          }}
        >
          {selectedPet ? (
            <div className="fade-in">
              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '32px',
                  marginBottom: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '4rem',
                      flexShrink: 0,
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {getPetEmoji(selectedPet.breed)}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>
                      {selectedPet.name}
                    </h2>
                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '1rem' }}>
                      <PawPrint size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {selectedPet.breed} · {selectedPet.age}岁
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--color-bg-alt)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                      <Info size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      品种
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedPet.breed}</div>
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--color-bg-alt)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                      年龄
                    </div>
                    <div style={{ fontWeight: '500' }}>{selectedPet.age}岁</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>过敏史</h4>
                  {selectedPet.allergies.length > 0 ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedPet.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-danger)',
                            borderRadius: '999px',
                            fontSize: '0.85rem',
                          }}
                        >
                          ⚠️ {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem' }}>
                      无过敏史
                    </p>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <h3 style={{ marginBottom: '20px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} />
                  历史入住记录
                </h3>

                {selectedPet.history.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <thead>
                        <tr style={{ background: 'var(--color-bg-alt)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', fontSize: '0.9rem' }}>
                            入住日期
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', fontSize: '0.9rem' }}>
                            离店日期
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', fontSize: '0.9rem' }}>
                            房型
                          </th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', fontSize: '0.9rem' }}>
                            时长
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPet.history.map((record, index) => {
                          const nights = Math.ceil(
                            (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / 
                            (1000 * 60 * 60 * 24)
                          );
                          return (
                            <tr
                              key={index}
                              style={{
                                background: index % 2 === 1 ? 'var(--color-gray-100)' : 'white',
                              }}
                            >
                              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
                                {formatDate(record.checkIn)}
                              </td>
                              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
                                {formatDate(record.checkOut)}
                              </td>
                              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
                                {record.roomName}
                              </td>
                              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
                                {nights}晚
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--color-text-light)',
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅</div>
                    <p>暂无入住记录</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--color-text-light)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🐾</div>
              <p>请选择一个宠物查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetProfilePage;
