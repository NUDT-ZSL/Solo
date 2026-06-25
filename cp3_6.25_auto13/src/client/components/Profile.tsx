import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, markets } = useApp();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }} className="fade-in">
        <h2 style={{ color: '#4a148c', marginBottom: '16px' }}>请先登录</h2>
        <p style={{ color: '#7b1fa2', marginBottom: '20px' }}>登录后可查看您的活动历史</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const userBookings = markets.flatMap(market =>
    market.stalls
      .filter(stall => stall.userId === user.id && stall.booked)
      .map(stall => ({
        market,
        stall,
        feedback: market.feedbacks.find(f => f.userId === user.id),
      }))
  );

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="profile-page fade-in">
      <h2>个人中心</h2>

      <div className="profile-section">
        <h3>用户信息</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            backgroundColor: '#ec407a', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 700
          }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#4a148c' }}>{user.name}</div>
            <div style={{ fontSize: '13px', color: '#7b1fa2' }}>
              {(user.isAdmin ? '管理员' : '普通用户') + ' | ID: ' + user.id}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>我的活动历史</h3>
        {userBookings.length === 0 ? (
          <p style={{ color: '#7b1fa2', fontSize: '14px' }}>暂无参与的活动</p>
        ) : (
          <div className="history-list">
            {userBookings.map(({ market, stall, feedback }, index) => (
              <div key={market.id + '-' + stall.id + '-' + index} className="history-item">
                <h4>{market.name}</h4>
                <div className="date">活动日期：{market.date}</div>
                <div className="stall-info">
                  {'摊位号：#' + stall.id + ' | 类别：' + stall.category}
                </div>
                {stall.description && (
                  <div style={{ fontSize: '13px', color: '#6a1b9a', marginBottom: '8px' }}>
                    {'简介：' + stall.description}
                  </div>
                )}
                {feedback ? (
                  <div className="feedback-display">
                    <div className="rating" style={{ fontSize: '16px' }}>
                      {renderStars(feedback.rating)}
                    </div>
                    <div className="comment">{feedback.comment}</div>
                    <div style={{ fontSize: '11px', color: '#8e24aa', marginTop: '4px' }}>
                      {feedback.createdAt}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => navigate('/market/' + market.id)} style={{ marginTop: '8px' }}>
                    去评价
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;