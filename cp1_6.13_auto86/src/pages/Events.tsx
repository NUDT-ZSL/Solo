import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface EventItem {
  _id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  price: number;
}

const containerStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '40px 24px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  marginBottom: 40,
  flexWrap: 'wrap',
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const gridContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 24,
};

const cardWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

function generateEmbedCode(event: EventItem) {
  return `<div style="width:400px;height:220px;border-radius:16px;background:linear-gradient(135deg,#1e1b4b,#0f0e17);padding:20px;color:#e2e8f0;font-family:system-ui,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
  <div>
    <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${event.name}</div>
    <div style="font-size:14px;color:#a78bfa;font-weight:700;margin-bottom:4px;">${event.date} ${event.time}</div>
    <div style="font-size:13px;color:#94a3b8;">📍 ${event.location}</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:18px;font-weight:700;color:#fbbf24;">¥${event.price}</div>
    <button style="padding:8px 20px;background:#a78bfa;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">想去</button>
  </div>
</div>`;
}

function HeartParticles({ trigger }: { trigger: number }) {
  const particles = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const dx = Math.cos(angle) * 40;
    const dy = Math.sin(angle) * 40 - 30;
    particles.push(
      <span
        key={`${trigger}-${i}`}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          fontSize: 14,
          animation: `heartFloat 0.6s ease-out forwards`,
          animationDelay: `${i * 0.01}s`,
          transform: `translate(-50%, -50%)`,
          '--dx': `${dx}px`,
          '--dy': `${dy}px`,
        } as React.CSSProperties}
      >
        ❤️
      </span>
    );
  }
  return (
    <>
      {particles}
      <style>{`
        @keyframes heartFloat {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.2); }
        }
      `}</style>
    </>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const [going, setGoing] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const btnRef = useRef<HTMLDivElement>(null);

  const handleGoing = () => {
    setGoing(true);
    setParticleTrigger((t) => t + 1);
  };

  const cardStyle: React.CSSProperties = {
    width: 400,
    maxWidth: '100%',
    height: 220,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #1e1b4b, #0f0e17)',
    padding: 20,
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(167, 139, 250, 0.1)',
    transition: 'all 0.2s ease-in-out',
  };

  const cardNameStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
    lineHeight: 1.3,
  };

  const cardDateStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: 700,
    marginBottom: 4,
  };

  const cardLocationStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#94a3b8',
  };

  const bottomRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#fbbf24',
  };

  const btnContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    position: 'relative',
  };

  const goBtnStyle: React.CSSProperties = {
    padding: '8px 20px',
    background: going ? '#7c3aed' : '#a78bfa',
    color: 'white',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    position: 'relative',
    overflow: 'visible',
  };

  const embedBtnStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: 8,
    fontSize: 12,
  };

  const embedModalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  };

  const embedContentStyle: React.CSSProperties = {
    background: '#1e1b4b',
    borderRadius: 12,
    padding: 24,
    maxWidth: 500,
    width: '100%',
  };

  return (
    <div style={cardWrapperStyle}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 48px rgba(167, 139, 250, 0.25)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(167, 139, 250, 0.1)';
        }}
      >
        <div>
          <div style={cardNameStyle}>{event.name}</div>
          <div style={cardDateStyle}>
            {event.date} {event.time}
          </div>
          <div style={cardLocationStyle}>📍 {event.location}</div>
        </div>
        <div style={bottomRowStyle}>
          <div style={priceStyle}>¥{event.price}</div>
          <div style={btnContainerStyle} ref={btnRef}>
            <button style={goBtnStyle} onClick={handleGoing}>
              {going ? '已想去 ❤️' : '想去'}
            </button>
            <button style={embedBtnStyle} onClick={() => setShowEmbed(true)}>
              {}嵌入
            </button>
            {particleTrigger > 0 && <HeartParticles trigger={particleTrigger} />}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Link to={`/guestbook`} style={{ fontSize: 12, color: '#a78bfa' }}>
          查看留言 →
        </Link>
      </div>

      {showEmbed && (
        <div style={embedModalStyle} onClick={() => setShowEmbed(false)}>
          <div style={embedContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>嵌入代码</h3>
            <pre
              style={{
                background: '#0f0e17',
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                marginBottom: 16,
                color: '#38bdf8',
              }}
            >
              {generateEmbedCode(event)}
            </pre>
            <button
              style={{
                padding: '8px 20px',
                background: '#a78bfa',
                color: 'white',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
              onClick={() => {
                navigator.clipboard.writeText(generateEmbedCode(event));
                setShowEmbed(false);
              }}
            >
              复制代码
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const responsiveStyle = `
  @media (max-width: 1024px) {
    .events-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  }
  @media (max-width: 768px) {
    .events-grid { grid-template-columns: 1fr !important; }
  }
`;

function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    axios.get('/api/events').then((res) => setEvents(res.data));
  }, []);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>演出日程</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>即将到来的现场演出</p>
        </div>
      </div>

      <div style={gridContainerStyle} className="events-grid">
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

      <style>{responsiveStyle}</style>
    </div>
  );
}

export default Events;
