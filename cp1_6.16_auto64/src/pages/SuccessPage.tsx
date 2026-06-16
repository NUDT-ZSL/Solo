import React, { useEffect } from 'react';

interface SuccessPageProps {
  orderId: string;
  onReturnHome: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ orderId, onReturnHome }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onReturnHome();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onReturnHome]);

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(to bottom, #2ECC71, #27AE60)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 120,
          height: 120,
          border: '4px solid white',
          borderRadius: '50%',
          animation: 'expandCircle 1s ease-out',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          fontWeight: 'bold',
          animation: 'bounceIn 0.5s ease',
        }}>
          ✓
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 24 }}>
        下单成功！
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '12px 24px',
        borderRadius: 8,
        marginTop: 16,
        fontSize: 14,
        letterSpacing: 1,
        fontFamily: 'monospace',
      }}>
        订单号: {orderId}
      </div>

      <div style={{ fontSize: 13, opacity: 0.7, marginTop: 20 }}>
        1秒后自动返回集市...
      </div>
    </div>
  );
};

export default SuccessPage;
