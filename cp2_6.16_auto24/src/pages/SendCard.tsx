import React, { useState, useEffect } from 'react';
import { sendsApi, contactsApi } from '../utils/api';
import type { Contact } from '../types';

interface SendCardProps {
  cardId: number;
  onBack: () => void;
  onSent: () => void;
}

interface SendResult {
  linkToken: string;
  receiverEmail: string;
}

const SendCard: React.FC<SendCardProps> = ({ cardId, onBack, onSent }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await contactsApi.getAll() as Contact[];
      setContacts(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load contacts:', err);
      const mockContacts: Contact[] = [
        { id: 1, user_id: 1, name: '张三', email: 'zhangsan@example.com', avatar: 'https://i.pravatar.cc/100?img=1' },
        { id: 2, user_id: 1, name: '李四', email: 'lisi@example.com', avatar: 'https://i.pravatar.cc/100?img=2' },
        { id: 3, user_id: 1, name: '王五', email: 'wangwu@example.com', avatar: 'https://i.pravatar.cc/100?img=3' },
        { id: 4, user_id: 1, name: '赵六', email: 'zhaoliu@example.com', avatar: 'https://i.pravatar.cc/100?img=4' },
        { id: 5, user_id: 1, name: '钱七', email: 'qianqi@example.com', avatar: 'https://i.pravatar.cc/100?img=5' },
      ];
      setContacts(mockContacts);
    }
  };

  const handleSelectContact = (contactId: number) => {
    if (isMultiSelect) {
      setSelectedContacts(prev => {
        if (prev.includes(contactId)) {
          return prev.filter(id => id !== contactId);
        } else {
          return [...prev, contactId];
        }
      });
    } else {
      setSelectedContacts([contactId]);
    }
  };

  const getSelectedContacts = (): Contact[] => {
    return contacts.filter(c => selectedContacts.includes(c.id));
  };

  const handlePreview = () => {
    if (selectedContacts.length === 0) {
      alert('请至少选择一个联系人');
      return;
    }
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      alert('请至少选择一个联系人');
      return;
    }

    setSending(true);
    try {
      const results: SendResult[] = [];
      const selected = getSelectedContacts();

      for (const contact of selected) {
        try {
          const result: any = await sendsApi.create(cardId, contact.email);
          results.push({
            linkToken: result.link_token || result.linkToken,
            receiverEmail: contact.email,
          });
        } catch (err: any) {
          console.error(`Failed to send to ${contact.email}:`, err);
        }
      }

      setSendResults(results);
      setShowPreview(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = (linkToken: string) => {
    const link = `${window.location.origin}?token=${linkToken}`;
    navigator.clipboard.writeText(link);
    alert('链接已复制到剪贴板');
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const selected = getSelectedContacts();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          ← 返回
        </button>
        <h1 style={styles.title}>发送贺卡</h1>
        <div style={{ width: '60px' }}></div>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>选择收件人</h2>
            <div style={styles.toggleContainer}>
              <span style={styles.toggleLabel}>多选</span>
              <div
                style={{
                  ...styles.toggleSwitch,
                  background: isMultiSelect ? 'linear-gradient(135deg, #ff8c42, #ff6f42)' : '#ddd',
                }}
                onClick={() => {
                  setIsMultiSelect(!isMultiSelect);
                  setSelectedContacts([]);
                }}
              >
                <div
                  style={{
                    ...styles.toggleKnob,
                    transform: isMultiSelect ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </div>
            </div>
          </div>

          {isMultiSelect && (
            <div style={styles.selectAllRow}>
              <div
                style={styles.checkbox}
                onClick={handleSelectAll}
              >
                {selectedContacts.length === contacts.length && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </div>
              <span style={styles.selectAllText}>全选</span>
              <span style={styles.selectedCount}>
                已选 {selectedContacts.length} / {contacts.length}
              </span>
            </div>
          )}

          <div style={styles.contactsList}>
            {contacts.map(contact => {
              const isSelected = selectedContacts.includes(contact.id);
              return (
                <div
                  key={contact.id}
                  style={{
                    ...styles.contactCard,
                    border: isSelected
                      ? '2px solid #4a90d9'
                      : '2px solid transparent',
                    background: isSelected ? '#eef3f9' : '#f8f9fa',
                  }}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  {isMultiSelect && (
                    <div style={styles.checkbox}>
                      {isSelected && <span style={styles.checkmark}>✓</span>}
                    </div>
                  )}
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    style={styles.avatar}
                  />
                  <div style={styles.contactInfo}>
                    <p style={styles.contactName}>{contact.name}</p>
                    <p style={styles.contactEmail}>{contact.email}</p>
                  </div>
                  {!isMultiSelect && isSelected && (
                    <span style={styles.selectedIcon}>✓</span>
                  )}
                </div>
              );
            })}
          </div>

          {selected.length > 0 && !sendResults.length && (
            <div style={styles.actionButtons}>
              <button
                onClick={handlePreview}
                className="btn-secondary"
                style={styles.previewBtn}
              >
                预览效果
              </button>
              <button
                onClick={handleSend}
                className="btn-primary"
                style={styles.sendBtn}
                disabled={sending}
              >
                {sending ? '发送中...' : `发送给 ${selected.length} 人`}
              </button>
            </div>
          )}

          {sendResults.length > 0 && (
            <div style={styles.resultsSection}>
              <div style={styles.successHeader}>
                <span style={styles.successIcon}>✓</span>
                <h3 style={styles.successTitle}>发送成功！</h3>
              </div>
              <p style={styles.successSubtitle}>
                已成功发送 {sendResults.length} 张贺卡
              </p>

              <div style={styles.linksList}>
                {sendResults.map((result, index) => (
                  <div key={index} style={styles.linkItem}>
                    <div style={styles.linkInfo}>
                      <p style={styles.linkReceiver}>{result.receiverEmail}</p>
                      <p style={styles.linkUrl}>
                        {`${window.location.origin}?token=${result.linkToken}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyLink(result.linkToken)}
                      style={styles.copyBtn}
                    >
                      复制
                    </button>
                  </div>
                ))}
              </div>

              <div style={styles.resultActions}>
                <button
                  onClick={() => {
                    setSendResults([]);
                    setSelectedContacts([]);
                  }}
                  className="btn-secondary"
                  style={styles.continueBtn}
                >
                  继续发送
                </button>
                <button
                  onClick={onSent}
                  className="btn-primary"
                  style={styles.doneBtn}
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div style={styles.modalOverlay} onClick={() => setShowPreview(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>发送预览</h3>
            <p style={styles.modalSubtitle}>
              将向以下 {selected.length} 位联系人发送贺卡：
            </p>

            <div style={styles.previewList}>
              {selected.map(contact => (
                <div key={contact.id} style={styles.previewItem}>
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    style={styles.previewAvatar}
                  />
                  <div style={styles.previewInfo}>
                    <p style={styles.previewName}>{contact.name}</p>
                    <p style={styles.previewEmail}>{contact.email}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.previewCard}>
              <p style={styles.previewCardText}>🎁 贺卡预览</p>
              <p style={styles.previewCardHint}>
                收件人将收到一张精美的电子贺卡
              </p>
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary"
                style={styles.modalCancelBtn}
              >
                取消
              </button>
              <button
                onClick={handleSend}
                className="btn-primary"
                style={styles.modalConfirmBtn}
                disabled={sending}
              >
                {sending ? '发送中...' : '确认发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    background: 'linear-gradient(180deg, #fdf6ee 0%, #ffede0 100%)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'background 0.3s ease',
  },
  title: {
    fontSize: '22px',
    color: '#4a4a4a',
    fontWeight: '600',
  },
  content: {
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#4a4a4a',
    fontWeight: '600',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleLabel: {
    fontSize: '13px',
    color: '#666',
  },
  toggleSwitch: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.3s ease',
  },
  toggleKnob: {
    width: '20px',
    height: '20px',
    background: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  selectAllRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
    marginBottom: '8px',
    borderBottom: '1px solid #f0f0f0',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'white',
    transition: 'all 0.2s ease',
  },
  checkmark: {
    color: '#4a90d9',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  selectAllText: {
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
  },
  selectedCount: {
    marginLeft: 'auto',
    fontSize: '13px',
    color: '#999',
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  contactCard: {
    height: '80px',
    borderRadius: '10px',
    background: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: '15px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '2px',
  },
  contactEmail: {
    fontSize: '12px',
    color: '#999',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  selectedIcon: {
    color: '#4a90d9',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  previewBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
  },
  sendBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
  },
  resultsSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #f0f0f0',
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  successIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: '18px',
    color: '#333',
    fontWeight: '600',
  },
  successSubtitle: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '20px',
  },
  linksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  linkItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    gap: '10px',
  },
  linkInfo: {
    flex: 1,
    minWidth: 0,
  },
  linkReceiver: {
    fontSize: '13px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '2px',
  },
  linkUrl: {
    fontSize: '11px',
    color: '#999',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #ff8c42, #ff6f42)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  resultActions: {
    display: 'flex',
    gap: '12px',
  },
  continueBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
  },
  doneBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '420px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    color: '#333',
    fontWeight: '600',
    marginBottom: '8px',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
    textAlign: 'center',
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    gap: '10px',
  },
  previewAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  previewInfo: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '1px',
  },
  previewEmail: {
    fontSize: '12px',
    color: '#999',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  previewCard: {
    background: 'linear-gradient(135deg, #fef3e7 0%, #fde0c8 100%)',
    borderRadius: '12px',
    padding: '30px 20px',
    textAlign: 'center',
    marginBottom: '24px',
  },
  previewCardText: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  previewCardHint: {
    fontSize: '13px',
    color: '#999',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
  },
};

export default SendCard;
