import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar } from 'lucide-react';
import { surveyApi } from '../utils/api';
import type { Survey } from '../types';

const SurveyList: React.FC = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      const data = await surveyApi.getSurveys();
      setSurveys(data);
    } catch (error) {
      console.error('加载问卷列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = () => {
    navigate('/editor');
  };

  const handleSurveyClick = (survey: Survey) => {
    navigate(`/dashboard`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>我的问卷</h2>
        <button className="btn btn-primary" onClick={handleCreateSurvey}>
          <Plus size={18} style={{ marginRight: '6px' }} />
          创建问卷
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      ) : surveys.length === 0 ? (
        <div className="empty-state">
          <FileText size={64} />
          <p>暂无问卷，点击右上角按钮创建您的第一份问卷</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={handleCreateSurvey}
          >
            立即创建
          </button>
        </div>
      ) : (
        <div className="survey-list">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="survey-card"
              onClick={() => handleSurveyClick(survey)}
            >
              <div>
                <h3 className="survey-card-title">{survey.title}</h3>
                <p className="survey-card-meta">
                  {survey.components.length} 个问题
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="survey-card-code">{survey.code}</span>
                <span className="survey-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {formatDate(survey.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyList;
