import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProposalList from './components/ProposalList';
import ProposalEditor from './components/ProposalEditor';
import DocumentPreview from './components/DocumentPreview';
import VersionHistory from './components/VersionHistory';
import CollaboratorPanel from './components/CollaboratorPanel';
import { socketService } from './services/socket';

const PRESET_COLORS = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#1ABC9C','#3498DB','#9B59B6','#E91E63','#00BCD4','#8BC34A','#FF9800','#795548'];

function getUserId(): string {
  let id = localStorage.getItem('proposal_user_id');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('proposal_user_id', id);
  }
  return id;
}

function getUsername(): string {
  let name = localStorage.getItem('proposal_username');
  if (!name) {
    name = '用户' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('proposal_username', name);
  }
  return name;
}

function getUserColor(): string {
  let color = localStorage.getItem('proposal_user_color');
  if (!color) {
    color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    localStorage.setItem('proposal_user_color', color);
  }
  return color;
}

function ShareRedirect() {
  const { shareLink } = useParams<{ shareLink: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/api/proposals/share/${shareLink}`).then((res) => {
      navigate(`/proposal/${res.data.id}`, { replace: true });
    }).catch(() => {
      navigate('/');
    });
  }, [shareLink, navigate]);

  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#7f8c8d', fontSize: 16 }}>加载中...</div>;
}

function ProposalEditorPage() {
  const { id: proposalId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = getUserId();
  const username = getUsername();
  const userColor = getUserColor();

  const [proposal, setProposal] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [collaboratorPanelCollapsed, setCollaboratorPanelCollapsed] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!proposalId) return;
    socketService.connect();
    socketService.joinProposal(proposalId, userId, username, userColor);

    axios.get(`/api/proposals/${proposalId}`).then((res) => {
      setProposal(res.data);
      setContent(res.data.content || '');
      setTitle(res.data.title || '');
    }).catch(() => {
      navigate('/');
    });

    return () => {
      socketService.leaveProposal(proposalId, userId);
      socketService.disconnect();
    };
  }, [proposalId]);

  useEffect(() => {
    const handleRemoteContentChange = (data: { content: string; userId: string }) => {
      if (data.userId !== userId) {
        setContent(data.content);
      }
    };
    const handleProposalUpdated = () => {
      if (proposalId) {
        axios.get(`/api/proposals/${proposalId}`).then((res) => {
          setProposal(res.data);
        });
      }
    };

    socketService.on('remote-content-change', handleRemoteContentChange);
    socketService.on('proposal-updated', handleProposalUpdated);

    return () => {
      socketService.off('remote-content-change');
      socketService.off('proposal-updated');
    };
  }, [proposalId, userId]);

  useEffect(() => {
    if (saveStatus !== 'unsaved') return;
    const timer = setTimeout(() => {
      if (!proposalId) return;
      setSaveStatus('saving');
      axios.put(`/api/proposals/${proposalId}`, { content, title }).then(() => {
        setSaveStatus('saved');
      }).catch(() => {
        setSaveStatus('unsaved');
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, title, saveStatus, proposalId]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setSaveStatus('unsaved');
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaveStatus('unsaved');
  }, []);

  const handleRestore = useCallback(async (versionNumber: number) => {
    if (!proposalId) return;
    await axios.put(`/api/proposals/${proposalId}/restore`, {
      versionNumber,
      editorId: userId,
      editorName: username,
    });
    const res = await axios.get(`/api/proposals/${proposalId}`);
    setProposal(res.data);
    setContent(res.data.content || '');
    setTitle(res.data.title || '');
    setSaveStatus('saved');
  }, [proposalId, userId, username]);

  const handleCopyShareLink = useCallback(() => {
    if (proposal?.shareLink) {
      navigator.clipboard.writeText(window.location.origin + '/proposal/share/' + proposal.shareLink);
    }
  }, [proposal]);

  const saveStatusIndicator = saveStatus === 'saved' ? (
    <span style={{ color: '#2ECC71', fontSize: 13, fontWeight: 500 }}>已保存</span>
  ) : saveStatus === 'saving' ? (
    <span style={{ color: '#F39C12', fontSize: 13, fontWeight: 500 }}>
      <span style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#F39C12',
        marginRight: 6,
        animation: 'pulse 1s infinite',
      }} />
      正在保存...
    </span>
  ) : (
    <span style={{ color: '#E74C3C', fontSize: 13 }}>未保存</span>
  );

  const collaborators = proposal?.collaborators || [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECF0F1' }}>
      <nav style={{
        background: '#2C3E50',
        color: '#ECF0F1',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: 52,
        gap: 12,
        flexShrink: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#ECF0F1',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px',
            marginRight: 4,
          }}
        >
          ←
        </button>
        <input
          value={title}
          onChange={handleTitleChange}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            color: '#ECF0F1',
            padding: '4px 10px',
            fontSize: 15,
            fontWeight: 600,
            width: 240,
            outline: 'none',
          }}
        />
        <div style={{ flex: 1 }} />
        {saveStatusIndicator}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
          {collaborators.map((c: any) => (
            <div
              key={c.userId}
              title={c.username}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c.avatarColor || c.color || '#95a5a6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'default',
              }}
            >
              {(c.username || '?').charAt(0)}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowShareDialog(true)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6,
            color: '#ECF0F1',
            padding: '5px 14px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          分享
        </button>
        <button
          onClick={() => setShowDocumentPreview(true)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6,
            color: '#ECF0F1',
            padding: '5px 14px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          生成文档
        </button>
        <button
          onClick={() => setShowVersionHistory(!showVersionHistory)}
          style={{
            background: showVersionHistory ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6,
            color: '#ECF0F1',
            padding: '5px 14px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          历史版本
        </button>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {showVersionHistory && (
          <>
            <div
              onClick={() => setShowVersionHistory(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 200,
              }}
            />
            <div style={{
              width: 320,
              background: '#ECF0F1',
              borderRight: '1px solid #BDC3C7',
              flexShrink: 0,
              zIndex: 201,
              overflowY: 'auto',
              animation: 'slideInLeft 0.25s ease-out',
            }}>
              <VersionHistory proposalId={proposalId!} onRestore={handleRestore} />
            </div>
          </>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ProposalEditor
            proposalId={proposalId!}
            userId={userId}
            username={username}
            userColor={userColor}
            content={content}
            onContentChange={handleContentChange}
          />
        </div>

        {!collaboratorPanelCollapsed ? (
          <div style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
            <CollaboratorPanel proposalId={proposalId!} userId={userId} />
          </div>
        ) : null}
      </div>

      {showDocumentPreview && (
        <DocumentPreview content={content} onClose={() => setShowDocumentPreview(false)} />
      )}

      {showShareDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={() => setShowShareDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 28,
              width: 460,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ color: '#2C3E50', marginTop: 0, marginBottom: 16, fontSize: 18 }}>分享提案</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                readOnly
                value={proposal?.shareLink ? window.location.origin + '/proposal/share/' + proposal.shareLink : ''}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #bdc3c7',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#2C3E50',
                  background: '#ECF0F1',
                }}
              />
              <button
                onClick={handleCopyShareLink}
                style={{
                  padding: '8px 16px',
                  background: '#2C3E50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                复制链接
              </button>
            </div>
            <button
              onClick={() => setShowShareDialog(false)}
              style={{
                marginTop: 20,
                padding: '8px 20px',
                border: '1px solid #bdc3c7',
                borderRadius: 6,
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                color: '#2C3E50',
                float: 'right',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProposalList />} />
        <Route path="/proposal/:id" element={<ProposalEditorPage />} />
        <Route path="/proposal/share/:shareLink" element={<ShareRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
