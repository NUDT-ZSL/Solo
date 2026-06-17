import React, { useState, useEffect, useCallback } from 'react';
import { TopicList } from './components/TopicList';
import { VotingPanel } from './components/VotingPanel';
import { ReportPanel } from './components/ReportPanel';
import { api, getVoterId } from './api';
import type { Topic, DetailedReport, CreateTopicRequest } from './types';

type View = 'list' | 'voting' | 'report';

const getDefaultDeadline = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 16);
};

export const App: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [votedTopics, setVotedTopics] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  const [formData, setFormData] = useState<CreateTopicRequest>({
    title: '',
    options: ['', '', '', ''],
    deadline: getDefaultDeadline(),
  });

  const voterId = getVoterId();

  const loadTopics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTopics();
      setTopics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    const saved = localStorage.getItem('votedTopics');
    if (saved) {
      setVotedTopics(new Set(JSON.parse(saved)));
    }
  }, []);

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setView('voting');
  };

  const handleVote = async (optionId: string): Promise<boolean> => {
    if (!selectedTopic) return false;

    try {
      const response = await api.submitVote({
        topicId: selectedTopic.id,
        optionId,
        voterId,
      });

      if (response.success) {
        const newVoted = new Set(votedTopics);
        newVoted.add(selectedTopic.id);
        setVotedTopics(newVoted);
        localStorage.setItem('votedTopics', JSON.stringify([...newVoted]));

        setTopics((prev) =>
          prev.map((t) => (t.id === response.topic.id ? response.topic : t))
        );
        setSelectedTopic(response.topic);
      }
      return response.success;
    } catch {
      return false;
    }
  };

  const handleGenerateReport = async (topic: Topic) => {
    try {
      setError(null);
      const reportData = await api.fetchDetailedReport(topic.id);
      setSelectedTopic(topic);
      setReport(reportData);
      setView('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      options: topic.options.map((o) => o.text),
      deadline: topic.deadline.slice(0, 16),
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (topic: Topic) => {
    if (!window.confirm(`确定要删除话题"${topic.title}"吗？`)) return;

    try {
      setError(null);
      await api.deleteTopic(topic.id);
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAddOption = () => {
    if (formData.options.length < 6) {
      setFormData((prev) => ({
        ...prev,
        options: [...prev.options, ''],
      }));
    }
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 4) {
      setFormData((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validOptions = formData.options.filter((o) => o.trim());
    if (validOptions.length < 4) {
      setError('请至少填写4个选项');
      return;
    }

    try {
      if (editingTopic) {
        const updated = await api.updateTopic(editingTopic.id, {
          ...formData,
          options: validOptions,
        });
        setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const newTopic = await api.createTopic({
          ...formData,
          options: validOptions,
        });
        setTopics((prev) => [newTopic, ...prev]);
      }
      setShowCreateForm(false);
      setEditingTopic(null);
      setFormData({
        title: '',
        options: ['', '', '', ''],
        deadline: getDefaultDeadline(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    }
  };

  const handleCloseModal = () => {
    setView('list');
    setSelectedTopic(null);
    setReport(null);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </div>
            <div>
              <h1 className="app-title">话题互动台</h1>
              <p className="app-subtitle">轻松创建投票活动，智能生成复盘报告</p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-create"
            onClick={() => {
              setEditingTopic(null);
              setFormData({
                title: '',
                options: ['', '', '', ''],
                deadline: getDefaultDeadline(),
              });
              setShowCreateForm(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            创建新话题
          </button>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}

        {topics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="13" x2="15" y2="13"></line>
                <line x1="9" y1="17" x2="13" y2="17"></line>
              </svg>
            </div>
            <h3>暂无话题</h3>
            <p>点击上方按钮创建您的第一个投票话题</p>
          </div>
        ) : (
          <TopicList
            topics={topics}
            onTopicClick={handleTopicClick}
            onGenerateReport={handleGenerateReport}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </main>

      {showCreateForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className="modal-content create-form">
            <button
              className="modal-close"
              onClick={() => {
                setShowCreateForm(false);
                setEditingTopic(null);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="modal-header">
              <h2 className="modal-title">{editingTopic ? '编辑话题' : '创建新话题'}</h2>
            </div>

            <form onSubmit={handleSubmitForm} className="modal-body">
              <div className="form-group">
                <label>话题标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入话题标题"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  投票选项 ({formData.options.length}/6)
                </label>
                {formData.options.map((option, index) => (
                  <div key={index} className="option-input-row">
                    <span className="option-index">{index + 1}</span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`选项 ${index + 1}`}
                      required
                    />
                    {formData.options.length > 4 && (
                      <button
                        type="button"
                        className="btn-remove-option"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {formData.options.length < 6 && (
                  <button type="button" className="btn-add-option" onClick={handleAddOption}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    添加选项
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>截止时间</label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-large"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTopic(null);
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary btn-large">
                  {editingTopic ? '保存修改' : '创建话题'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === 'voting' && selectedTopic && (
        <VotingPanel
          topic={selectedTopic}
          onClose={handleCloseModal}
          onVote={handleVote}
          hasVoted={votedTopics.has(selectedTopic.id)}
        />
      )}

      {view === 'report' && selectedTopic && report && (
        <ReportPanel
          topic={selectedTopic}
          report={report}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
