export default function Empty() {
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      padding: '40px',
      color: '#6d4c41',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(121, 85, 72, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
      }}>
        ☕
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#3e2723',
      }}>
        暂无内容
      </div>
      <div style={{
        fontSize: '14px',
        color: '#6d4c41',
        textAlign: 'center',
        maxWidth: '300px',
        lineHeight: 1.6,
      }}>
        还没有任何烘焙记录，开始你的第一次咖啡烘焙吧！
      </div>
    </div>
  );
}
