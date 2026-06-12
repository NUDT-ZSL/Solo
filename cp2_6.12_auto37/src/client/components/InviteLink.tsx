import React, { useState } from 'react';
import './InviteLink.css';

interface InviteLinkProps {
  activityId: string;
  activityName: string;
  onClose: () => void;
}

const InviteLink: React.FC<InviteLinkProps> = ({ activityId, activityName, onClose }) => {
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/activity/${activityId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="invite-link-modal" onClick={onClose}>
      <div className="invite-link-content" onClick={(e) => e.stopPropagation()}>
        <div className="invite-header">
          <div className="invite-icon">🎉</div>
          <h3>活动创建成功！</h3>
          <p className="invite-activity-name">{activityName}</p>
        </div>

        <div className="invite-body">
          <p className="invite-description">
            分享下方链接邀请好友一起参与烹饪活动
          </p>

          <div className="link-container">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="link-input"
            />
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? '✓ 已复制' : '复制链接'}
            </button>
          </div>

          {copied && (
            <div className="copy-toast">
              <span>✓ 链接已复制到剪贴板</span>
            </div>
          )}
        </div>

        <div className="invite-footer">
          <button className="done-btn" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteLink;
