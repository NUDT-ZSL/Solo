import React from 'react';
import { Utensils, MapPin, Briefcase, ShoppingBag, MessageCircle, Users } from 'lucide-react';
import { Topic } from '../types';

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicId: string | null;
  onSelect: (topic: Topic) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  utensils: <Utensils size={28} />,
  'map-pin': <MapPin size={28} />,
  briefcase: <Briefcase size={28} />,
  'shopping-bag': <ShoppingBag size={28} />,
  'message-circle': <MessageCircle size={28} />,
  users: <Users size={28} />
};

export const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, selectedTopicId, onSelect }) => {
  return (
    <div>
      <h3 style={{
        fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
        fontWeight: 700,
        color: '#1E3A5F',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🎯</span> 选择对话主题
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {topics.map((topic, idx) => {
          const isSelected = selectedTopicId === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => onSelect(topic)}
              className="animate-slide-in"
              style={{
                animationDelay: `${idx * 60}ms`,
                opacity: 0,
                textAlign: 'left',
                padding: '20px',
                borderRadius: '20px',
                border: isSelected ? '2px solid #3B82F6' : '2px solid transparent',
                background: isSelected
                  ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                  : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected
                  ? '0 8px 24px rgba(59, 130, 246, 0.2)'
                  : '0 2px 12px rgba(30, 58, 95, 0.06)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(30, 58, 95, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(30, 58, 95, 0.06)';
                }
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: isSelected
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : 'linear-gradient(135deg, #E0F2FE, #DBEAFE)',
                color: isSelected ? '#FFFFFF' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                transition: 'all 0.25s ease'
              }}>
                {iconMap[topic.icon] || <MessageCircle size={28} />}
              </div>
              <div>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1E3A5F',
                  marginBottom: '4px'
                }}>
                  {topic.name}
                </h4>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#64748B',
                  lineHeight: 1.4
                }}>
                  {topic.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
