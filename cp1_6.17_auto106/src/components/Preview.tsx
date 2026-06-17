import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useEditorStore } from '../data/store';
import { surveyApi } from '../utils/api';
import type { Answer } from '../types';
import ComponentRenderer from './ComponentRenderer';

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const { components, surveyTitle, currentSurveyId } = useEditorStore();

  const [answers, setAnswers] = useState<{ [key: string]: string | string[] | number }>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswerChange = (componentId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentSurveyId) {
      alert('请先发布问卷');
      return;
    }

    const answerList: Answer[] = Object.entries(answers).map(([componentId, value]) => ({
      componentId,
      value
    }));

    try {
      await surveyApi.submitResponse(currentSurveyId, answerList);
      setSubmitted(true);
    } catch (error) {
      alert('提交失败，请重试');
      console.error(error);
    }
  };

  if (components.length === 0) {
    return (
      <div className="preview-container">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <button
            className="btn btn-secondary"
            style={{ marginRight: '16px', padding: '8px 16px' }}
            onClick={() => navigate('/editor')}
          >
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            返回编辑器
          </button>
        </div>
        <div className="empty-state">
          <p>暂无问卷内容，请先在编辑器中添加组件</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/editor')}
          >
            去创建问卷
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="preview-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', color: '#334155', marginBottom: '8px' }}>提交成功！</h2>
          <p style={{ color: '#64748B', marginBottom: '24px' }}>感谢您参与本次调查</p>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/editor')}
          >
            返回编辑器
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          className="btn btn-secondary"
          style={{ marginRight: '16px', padding: '8px 16px' }}
          onClick={() => navigate('/editor')}
        >
          <ArrowLeft size={16} style={{ marginRight: '6px' }} />
          返回编辑器
        </button>
        <span style={{ color: '#94A3B8', fontSize: '14px' }}>问卷预览模式</span>
      </div>

      <div className="preview-header">
        <h1 className="preview-title">{surveyTitle}</h1>
        <p className="preview-desc">请认真填写以下问卷，您的反馈对我们很重要</p>
      </div>

      {components.map((component) => (
        <div key={component.id} className="preview-component">
          <h3 className="preview-component-label">{component.label}</h3>
          <ComponentRenderer
            component={component}
            mode="preview"
            answer={answers[component.id]}
            onAnswerChange={(value) => handleAnswerChange(component.id, value)}
          />
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button className="btn btn-primary" onClick={handleSubmit}>
          <Send size={16} style={{ marginRight: '6px' }} />
          提交问卷
        </button>
      </div>
    </div>
  );
};

export default Preview;
