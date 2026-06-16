import React, { useState } from 'react';
import type { Client, CommunicationStatus, CommunicationLog } from '../api/dataService';
import { statusColors, statusLabels, addClientLog } from '../api/dataService';

interface ClientLogProps {
  clients: Client[];
  onClientsUpdate: (clients: Client[]) => void;
}

interface DrawerProps {
  client: Client;
  onClose: () => void;
  onAddLog: (log: CommunicationLog) => void;
}

const StatusBadge: React.FC<{ status: CommunicationStatus }> = ({ status }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        color: 'white',
        background: `linear-gradient(135deg, ${statusColors[status]}, ${statusColors[status]}dd)`,
        animation: 'pulse 2s infinite',
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'white',
          animation: 'pulse 1.5s infinite',
        }}
      />
      {statusLabels[status]}
    </div>
  );
};

const ClientDrawer: React.FC<DrawerProps> = ({ client, onClose, onAddLog }) => {
  const [newLogContent, setNewLogContent] = useState('');
  const [newLogStatus, setNewLogStatus] = useState<CommunicationStatus>(client.logs[0]?.status || 'initial');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newLogContent.trim()) return;
    setIsSubmitting(true);
    try {
      const newLog = await addClientLog(client.id, {
        content: newLogContent,
        status: newLogStatus,
      });
      onAddLog(newLog);
      setNewLogContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
          animation: 'lightboxFade 0.35s ease-out',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          background: 'var(--bg-secondary)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.35s ease-out',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {client.name}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{client.company}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>邮箱</span>
              <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{client.email}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>电话</span>
              <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{client.phone}</div>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>当前状态</span>
            <div style={{ marginTop: '8px' }}>
              {client.logs.length > 0 && <StatusBadge status={client.logs[0].status} />}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
            添加沟通记录
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              沟通状态
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['initial', 'quoting', 'negotiating', 'signed', 'rejected'] as CommunicationStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setNewLogStatus(status)}
                  style={{
                    padding: '8px 12px',
                    background: newLogStatus === status ? statusColors[status] : 'var(--bg-card)',
                    border: `2px solid ${newLogStatus === status ? statusColors[status] : 'transparent'}`,
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-out',
                  }}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={newLogContent}
            onChange={(e) => setNewLogContent(e.target.value)}
            placeholder="记录沟通内容..."
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit',
              transition: 'all 0.25s ease-out',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <button
            onClick={handleSubmit}
            disabled={!newLogContent.trim() || isSubmitting}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: newLogContent.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              opacity: newLogContent.trim() && !isSubmitting ? 1 : 0.5,
              transition: 'all 0.25s ease-out',
            }}
          >
            {isSubmitting ? '提交中...' : '保存记录'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
            沟通历史 ({client.logs.length})
          </h3>
          {client.logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
              <div>暂无沟通记录</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '15px',
                  top: '8px',
                  bottom: '8px',
                  width: '2px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              />
              {client.logs.map((log, index) => (
                <div
                  key={log.id}
                  style={{
                    position: 'relative',
                    paddingLeft: '40px',
                    marginBottom: '20px',
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '7px',
                      top: '8px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: statusColors[log.status],
                      border: '3px solid var(--bg-secondary)',
                      boxShadow: `0 0 0 2px ${statusColors[log.status]}40`,
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      padding: '16px',
                      transition: 'all 0.25s ease-out',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <StatusBadge status={log.status} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.6 }}>
                      {log.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const ClientLog: React.FC<ClientLogProps> = ({ clients, onClientsUpdate }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddLog = (clientId: string, newLog: CommunicationLog) => {
    onClientsUpdate(
      clients.map(c =>
        c.id === clientId
          ? { ...c, logs: [newLog, ...c.logs] }
          : c
      )
    );
  };

  const getLatestStatus = (client: Client): CommunicationStatus => {
    return client.logs[0]?.status || 'initial';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>
        客户沟通日志
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {clients.map((client, index) => {
          const latestStatus = getLatestStatus(client);
          return (
            <div
              key={client.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.25s ease-out',
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                border: '1px solid transparent',
              }}
              onClick={() => setSelectedClientId(client.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.3)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {client.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {client.company}
                  </div>
                </div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${statusColors[latestStatus]}, var(--accent))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                >
                  {client.name.charAt(0)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <span>📧 {client.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {client.logs.length} 条沟通记录
                </div>
                <StatusBadge status={latestStatus} />
              </div>
            </div>
          );
        })}
      </div>

      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClientId(null)}
          onAddLog={(log) => handleAddLog(selectedClient.id, log)}
        />
      )}
    </div>
  );
};

export default ClientLog;
