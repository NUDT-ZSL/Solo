import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { meetingApi, voteApi, proposalApi } from '../api';
import VoteBar from '../components/VoteBar';
import CommentStream from '../components/CommentStream';
import type { Meeting, Proposal, Vote, Comment, MeetingSummary } from '../types';

interface MeetingRoomProps {
  meetingId: string;
  onBack: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, onBack }) => {
  const { currentUser, setCurrentMeeting } = useApp();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary[]>([]);
  const [notesContent, setNotesContent] = useState('待生成的会议纪要...');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadMeetingData();
  }, [meetingId]);

  const loadMeetingData = async () => {
    try {
      setIsLoading(true);
      const [meetingData, proposalsData] = await Promise.all([
        meetingApi.getMeeting(meetingId),
        meetingApi.getProposals(meetingId),
      ]);
      setMeeting(meetingData);
      setCurrentMeeting(meetingData);
      setProposals(proposalsData);
      if (proposalsData.length > 0) {
        setSelectedProposalId(proposalsData[0].id);
        loadComments(proposalsData[0].id);
      }
    } catch (error) {
      console.error('加载会议数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async (proposalId: string) => {
    try {
      const data = await proposalApi.getComments(proposalId, 50);
      setComments(data);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId);
  const selectedVotes = selectedProposal?.votes || [];

  const handleProposalClick = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    loadComments(proposalId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleVote = async (voteType: 'approve' | 'reject' | 'abstain') => {
    if (!selectedProposalId || !currentUser) return;

    try {
      await voteApi.submitVote(selectedProposalId, currentUser.id, voteType);
      const updatedProposals = await meetingApi.getProposals(meetingId);
      setProposals(updatedProposals);
    } catch (error) {
      console.error('投票失败:', error);
    }
  };

  const handleCommentAdded = (comment: Comment) => {
    setComments((prev) => [comment, ...prev]);
  };

  const handleSummaryEdit = () => {
    if (contentEditableRef.current) {
      contentEditableRef.current.contentEditable = 'true';
      contentEditableRef.current.focus();
    }
  };

  const handleSummaryBlur = () => {
    if (contentEditableRef.current) {
      contentEditableRef.current.contentEditable = 'false';
      setNotesContent(contentEditableRef.current.innerText);
    }
  };

  const handleGenerateNotes = async () => {
    try {
      const summary = await meetingApi.getSummary(meetingId);
      setMeetingSummary(summary);

      const notes = generateMeetingNotes(summary);
      setNotesContent(notes);
      setShowNotesModal(true);
    } catch (error) {
      console.error('生成会议纪要失败:', error);
    }
  };

  const generateMeetingNotes = (summary: MeetingSummary[]): string => {
    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let notes = `会议纪要\n生成时间：${date}\n\n`;
    notes += `一、会议概况\n`;
    notes += `本次会议共审议 ${summary.length} 个选题。\n\n`;
    notes += `二、各选题投票结果\n\n`;

    summary.forEach((item, index) => {
      const total = item.votes.approve + item.votes.reject + item.votes.abstain;
      const passRate = total > 0 ? ((item.votes.approve / total) * 100).toFixed(1) : '0';
      const status = item.votes.approve > item.votes.reject ? '通过' : '未通过';

      notes += `${index + 1}. ${item.title}\n`;
      notes += `   投票结果：${status}\n`;
      notes += `   赞成：${item.votes.approve}票 | 反对：${item.votes.reject}票 | 弃权：${item.votes.abstain}票\n`;
      notes += `   赞成率：${passRate}%\n`;
      notes += `   评论数：${item.commentCount}条\n\n`;
    });

    notes += `三、任务分配\n`;
    notes += `（请在此处填写后续任务安排）\n\n`;
    notes += `四、备注\n`;
    notes += `（请在此处填写其他需要说明的事项）\n`;

    return notes;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(notesContent);
      alert('已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await meetingApi.saveMeetingNote(meetingId, notesContent);
      alert('会议纪要已保存！');
      setShowNotesModal(false);
    } catch (error) {
      console.error('保存纪要失败:', error);
    }
  };

  const filteredProposals = proposals.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVoteColor = (proposal: Proposal): string => {
    if (!proposal.votes || proposal.votes.length === 0) return '#9ca3af';
    const approveCount = proposal.votes.filter((v) => v.voteType === 'approve').length;
    const rejectCount = proposal.votes.filter((v) => v.voteType === 'reject').length;
    return approveCount >= rejectCount ? '#22c55e' : '#ef4444';
  };

  const formatBold = () => {
    document.execCommand('bold', false);
  };

  const formatItalic = () => {
    document.execCommand('italic', false);
  };

  const handleSummaryChange = useCallback(() => {
    if (contentEditableRef.current) {
      setNotesContent(contentEditableRef.current.innerText);
    }
  }, []);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>正在加载会议...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {isMobile && (
            <button
              style={styles.hamburger}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>
          )}
          <button style={styles.backButton} onClick={onBack}>
            ← 返回
          </button>
          <h1 style={styles.title}>{meeting?.title}</h1>
        </div>
        <button
          style={styles.generateNotesButton}
          onClick={handleGenerateNotes}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1';
          }}
        >
          📝 生成纪要
        </button>
      </div>

      <div style={styles.mainContent}>
        <div
          style={{
            ...styles.sidebar,
            ...(isMobile
              ? {
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  height: '100vh',
                  zIndex: 100,
                  transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                  transition: 'transform 0.3s ease',
                }
              : {}),
            width: isMobile ? '280px' : '320px',
          }}
        >
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>选题列表</h3>
            <span style={styles.proposalCount}>{proposals.length} 个</span>
          </div>
          <div style={styles.searchContainer}>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="搜索选题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={styles.proposalList}>
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                style={{
                  ...styles.proposalItem,
                  ...(selectedProposalId === proposal.id
                    ? styles.proposalItemActive
                    : {}),
                  borderLeftColor: getVoteColor(proposal),
                }}
                onClick={() => handleProposalClick(proposal.id)}
              >
                <div style={styles.proposalItemContent}>
                  <h4 style={styles.proposalTitle}>{proposal.title}</h4>
                  <p style={styles.proposalVotes}>
                    {proposal.votes?.length || 0} 人已投票
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isMobile && sidebarOpen && (
          <div
            style={styles.overlay}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div style={styles.contentArea}>
          {selectedProposal ? (
            <div style={styles.detailPanel}>
              <div style={styles.detailHeader}>
                <h2 style={styles.detailTitle}>{selectedProposal.title}</h2>
              </div>

              <div style={styles.coverPlaceholder}>
                <span style={styles.coverText}>📖 封面占位</span>
              </div>

              <div style={styles.summarySection}>
                <div style={styles.summaryToolbar}>
                  <button
                    style={styles.formatButton}
                    onClick={formatBold}
                    title="加粗"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    style={styles.formatButton}
                    onClick={formatItalic}
                    title="斜体"
                  >
                    <em>I</em>
                  </button>
                </div>
                <div
                  ref={contentEditableRef}
                  style={styles.summaryContent}
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: selectedProposal.summary }}
                  onBlur={handleSummaryBlur}
                />
              </div>

              <VoteBar
                votes={selectedVotes}
                currentUserId={currentUser!.id}
                onVote={handleVote}
              />

              <div style={styles.commentsSection}>
                <CommentStream
                  proposalId={selectedProposal.id}
                  currentUser={currentUser!}
                  comments={comments}
                  onCommentAdded={handleCommentAdded}
                />
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>请选择一个选题查看详情</p>
            </div>
          )}
        </div>
      </div>

      {showNotesModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📝 会议纪要</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowNotesModal(false)}
              >
                ✕
              </button>
            </div>
            <div ref={summaryRef} style={styles.modalContent}>
              <div
                ref={contentEditableRef}
                style={styles.notesTextarea}
                contentEditable
                suppressContentEditableWarning
                onInput={handleSummaryChange}
              >
                {notesContent}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.copyButton}
                onClick={handleCopyToClipboard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
              >
                📋 复制到剪贴板
              </button>
              <button
                style={styles.saveButton}
                onClick={handleSaveNotes}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1';
                }}
              >
                💾 保存纪要
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
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 69px)',
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 69px)',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  hamburgerLine: {
    width: '24px',
    height: '2px',
    backgroundColor: '#64748b',
    borderRadius: '2px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
  },
  generateNotesButton: {
    width: '140px',
    height: '44px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  proposalCount: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  searchContainer: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  proposalList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  proposalItem: {
    display: 'flex',
    alignItems: 'center',
    height: '72px',
    padding: '12px 16px',
    marginBottom: '4px',
    backgroundColor: '#ffffff',
    borderLeft: '2px solid #9ca3af',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  proposalItemActive: {
    backgroundColor: '#eef2ff',
    borderLeftColor: '#6366f1',
  },
  proposalItemContent: {
    flex: 1,
    minWidth: 0,
  },
  proposalTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  proposalVotes: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  detailPanel: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  detailHeader: {
    marginBottom: '8px',
  },
  detailTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
  },
  coverPlaceholder: {
    width: '100%',
    aspectRatio: '4 / 3',
    background: 'linear-gradient(135deg, #e2e8f0 0%, #bfdbfe 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    fontSize: '18px',
    color: '#64748b',
    fontWeight: 500,
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  summaryToolbar: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  formatButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    transition: 'background-color 0.2s ease',
  },
  summaryContent: {
    padding: '20px',
    minHeight: '120px',
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#334155',
    outline: 'none',
  },
  commentsSection: {
    minHeight: '400px',
    height: '50vh',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
    fontSize: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  notesTextarea: {
    width: '100%',
    minHeight: '300px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: 1.8,
    fontFamily: 'inherit',
    color: '#334155',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  copyButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
};

export default MeetingRoom;
