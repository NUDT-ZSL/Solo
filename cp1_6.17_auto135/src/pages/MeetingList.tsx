import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Meeting, MeetingStatus, Contact } from '../types';

const statusConfig: Record<MeetingStatus, { label: string; color: string }> = {
  upcoming: { label: '即将开始', color: '#3498DB' },
  ongoing: { label: '进行中', color: '#2ECC71' },
  finished: { label: '已结束', color: '#95A5A6' },
};

export default function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    dateTime: '',
    participantIds: [] as string[],
    location: '',
    agenda: '',
  });

  useEffect(() => {
    loadMeetings();
    loadContacts();
  }, []);

  useEffect(() => {
    let result = meetings;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.location.toLowerCase().includes(query) ||
        m.participants.some(p => p.name.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter);
    }
    
    setFilteredMeetings(result);
  }, [meetings, searchQuery, statusFilter]);

  const loadMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(data);
      setFilteredMeetings(data);
    } catch (err) {
      console.error('加载会议列表失败:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error('加载联系人失败:', err);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting),
      });
      if (res.ok) {
        setShowModal(false);
        setNewMeeting({ title: '', dateTime: '', participantIds: [], location: '', agenda: '' });
        loadMeetings();
      }
    } catch (err) {
      console.error('创建会议失败:', err);
    }
  };

  const toggleParticipant = (contactId: string) => {
    setNewMeeting(prev => ({
      ...prev,
      participantIds: prev.participantIds.includes(contactId)
        ? prev.participantIds.filter(id => id !== contactId)
        : [...prev.participantIds, contactId],
    }));
  };

  const getTodoProgress = (meeting: Meeting) => {
    if (meeting.todos.length === 0) return 0;
    const completed = meeting.todos.filter(t => t.completed).length;
    return Math.round((completed / meeting.todos.length) * 100);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="meeting-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">会议列表</h1>
          <p className="page-subtitle">管理所有会议记录和待办事项</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 创建会议
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索会议标题、地点或参与人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            全部
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setStatusFilter('upcoming')}
          >
            即将开始
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'ongoing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ongoing')}
          >
            进行中
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'finished' ? 'active' : ''}`}
            onClick={() => setStatusFilter('finished')}
          >
            已结束
          </button>
        </div>
      </div>

      <div className="meeting-grid">
        {filteredMeetings.map(meeting => (
          <Link 
            to={`/meeting/${meeting.id}`} 
            key={meeting.id}
            className="meeting-card"
          >
            <div className="card-status" style={{ backgroundColor: statusConfig[meeting.status].color }}>
              {statusConfig[meeting.status].label}
            </div>
            
            <div className="card-content">
              <h3 className="card-title">{meeting.title}</h3>
              <p className="card-meta">
                <span>📅 {formatDateTime(meeting.dateTime)}</span>
              </p>
              <p className="card-meta">
                <span>📍 {meeting.location || '未设置'}</span>
              </p>
              <p className="card-agenda">{meeting.agenda || '暂无议程'}</p>
            </div>

            <div className="card-footer">
              <div className="participant-avatars">
                {meeting.participants.slice(0, 4).map((p, i) => (
                  <div 
                    key={p.id} 
                    className="avatar avatar-small"
                    style={{ zIndex: 4 - i }}
                    title={p.name}
                  >
                    {p.name.charAt(0)}
                  </div>
                ))}
                {meeting.participants.length > 4 && (
                  <div className="avatar avatar-small avatar-more">
                    +{meeting.participants.length - 4}
                  </div>
                )}
              </div>
              
              <div className="todo-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${getTodoProgress(meeting)}%` }}
                  />
                </div>
                <span className="progress-text">{getTodoProgress(meeting)}%</span>
              </div>
            </div>
          </Link>
        ))}
        
        {filteredMeetings.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">📭</p>
            <p>暂无会议</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>创建新会议</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMeeting}>
              <div className="form-group">
                <label>会议标题 *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>日期时间 *</label>
                <input
                  type="datetime-local"
                  value={newMeeting.dateTime}
                  onChange={(e) => setNewMeeting({ ...newMeeting, dateTime: new Date(e.target.value).toISOString() })}
                  required
                />
              </div>
              <div className="form-group">
                <label>会议地点</label>
                <input
                  type="text"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>参与人</label>
                <div className="contact-selector">
                  {contacts.map(contact => (
                    <label 
                      key={contact.id} 
                      className={`contact-option ${newMeeting.participantIds.includes(contact.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={newMeeting.participantIds.includes(contact.id)}
                        onChange={() => toggleParticipant(contact.id)}
                      />
                      <div className="avatar avatar-xsmall">{contact.name.charAt(0)}</div>
                      <span>{contact.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>会议议程</label>
                <textarea
                  rows={3}
                  value={newMeeting.agenda}
                  onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
