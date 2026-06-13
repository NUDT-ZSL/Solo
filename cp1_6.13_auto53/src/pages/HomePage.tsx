import React, { useState, useEffect } from 'react';
import RoomCard from '../components/RoomCard';
import BookingForm from '../components/BookingForm';
import type { Room } from '../types';
import { roomApi } from '../utils/api';

const HomePage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await roomApi.getAll();
      setRooms(data);
    } catch (err) {
      console.error('加载房间列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookRoom = (room: Room) => {
    setSelectedRoomId(room.id);
    setShowBookingForm(true);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        className="fade-in"
        style={{
          textAlign: 'center',
          marginBottom: '48px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            marginBottom: '12px',
            color: 'var(--color-text)',
          }}
        >
          🐾 欢迎来到 PetHotel
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--color-text-light)',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          为您的爱宠提供温馨舒适的酒店服务，让它们在您外出时也能享受家的温暖
        </p>
      </div>

      <h2
        className="fade-in"
        style={{
          marginBottom: '24px',
          fontSize: '1.5rem',
        }}
      >
        选择房型
      </h2>

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[1, 2, 3].map(i => (
            <RoomCard
              key={i}
              room={{
                id: '',
                type: 'standard',
                name: '',
                area: 0,
                weekdayPrice: 0,
                weekendPrice: 0,
                description: '',
              }}
              onBook={() => {}}
              isLoading={true}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <RoomCard room={room} onBook={handleBookRoom} />
            </div>
          ))}
        </div>
      )}

      <div
        className="fade-in"
        style={{
          marginTop: '64px',
          padding: '32px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>
          为什么选择我们？
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}
        >
          {[
            { icon: '🏠', title: '舒适环境', desc: '温馨整洁的独立房间' },
            { icon: '👨‍⚕️', title: '专业看护', desc: '24小时专人照料' },
            { icon: '🍽️', title: '科学喂养', desc: '定制营养膳食方案' },
            { icon: '📱', title: '实时监控', desc: '随时查看宠物状态' },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                {item.icon}
              </div>
              <h4 style={{ marginBottom: '4px' }}>{item.title}</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BookingForm
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        rooms={rooms}
        preselectedRoomId={selectedRoomId}
      />
    </div>
  );
};

export default HomePage;
