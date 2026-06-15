import React from 'react';
import { useNavigate } from 'react-router-dom';
import FlowerParticles from '@/components/FlowerParticles';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        animation: 'fadeIn 0.4s ease',
      }}
    >
      <h1
        style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: '8px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        🌿 虚拟植物园 🌸
      </h1>
      <p
        style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        创造属于你的秘密花园，与世界分享自然之美
      </p>

      <div
        style={{
          width: '320px',
          maxWidth: '90vw',
          height: '320px',
          marginBottom: '36px',
        }}
      >
        <FlowerParticles />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => navigate('/garden')}
          style={{
            width: '160px',
            height: '48px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          🌱 我的植物园
        </button>
        <button
          onClick={() => navigate('/explore')}
          style={{
            width: '160px',
            height: '48px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          🔍 探索广场
        </button>
      </div>
    </div>
  );
};

export default HomePage;
