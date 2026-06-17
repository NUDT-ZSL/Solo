import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, MessageSquare } from 'lucide-react';
import { surveyApi } from '../utils/api';
import type { Survey, AggregatedData, HourlyResponse } from '../types';

const COLORS = ['#4A90D9', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'];

const Dashboard: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurveyId) {
      loadSurveyData(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  const loadSurveys = async () => {
    try {
      const data = await surveyApi.getSurveys();
      setSurveys(data);
      if (data.length > 0) {
        setSelectedSurveyId(data[0].id);
      }
    } catch (error) {
      console.error('加载问卷列表失败', error);
    }
  };

  const loadSurveyData = async (surveyId: string) => {
    setLoading(true);
    try {
      const [aggregated, hourly, responses] = await Promise.all([
        surveyApi.getAggregatedData(surveyId),
        surveyApi.getHourlyResponses(surveyId),
        surveyApi.getResponses(surveyId)
      ]);
      setAggregatedData(aggregated);
      setHourlyData(hourly);
      setTotalResponses(responses.length);
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const createDemoData = async () => {
    try {
      const result = await surveyApi.createDemoData();
      await loadSurveys();
      setTimeout(() => {
        setSelectedSurveyId(result.survey.id);
      }, 100);
    } catch (error) {
      console.error('创建演示数据失败', error);
    }
  };

  const getBarChartData = () => {
    const choiceQuestions = aggregatedData.filter(
      (d) => d.type === 'radio' || d.type === 'checkbox' || d.type === 'select'
    );

    if (choiceQuestions.length === 0) return [];

    const firstQuestion = choiceQuestions[0];
    if (!firstQuestion.optionCounts) return [];

    return Object.entries(firstQuestion.optionCounts).map(([name, count]) => ({
      name,
      count
    }));
  };

  const getPieChartData = () => {
    const ratingQuestion = aggregatedData.find((d) => d.type === 'rating');
    if (!ratingQuestion?.ratingStats) return [];

    return Object.entries(ratingQuestion.ratingStats.distribution).map(([score, count]) => ({
      name: `${score}星`,
      value: count
    }));
  };

  const getTextQuestions = () => {
    return aggregatedData.filter((d) => d.type === 'text');
  };

  const getAverageRating = () => {
    const ratingQuestion = aggregatedData.find((d) => d.type === 'rating');
    return ratingQuestion?.ratingStats?.average || 0;
  };

  if (surveys.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <BarChart3 size={64} />
          <p>暂无问卷数据，请先创建并发布问卷</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px', marginRight: '12px' }}
            onClick={() => (window.location.hash = '#/editor')}
          >
            去创建问卷
          </button>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '16px' }}
            onClick={createDemoData}
          >
            加载演示数据
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="survey-selector">
        <label>选择问卷：</label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
        >
          {surveys.map((survey) => (
            <option key={survey.id} value={survey.id}>
              {survey.title} ({survey.code})
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary"
          style={{ marginLeft: '12px', padding: '8px 16px', fontSize: '13px' }}
          onClick={createDemoData}
        >
          加载演示数据
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">总响应数</div>
              <div className="stat-value">{totalResponses}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">问题数量</div>
              <div className="stat-value">{aggregatedData.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均评分</div>
              <div className="stat-value">{getAverageRating()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">文本回答</div>
              <div className="stat-value">{getTextQuestions().reduce((acc, q) => acc + (q.textAnswers?.length || 0), 0)}</div>
            </div>
          </div>

          <div className="chart-section">
            <h3 className="chart-title">
              <BarChart3 size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              选项分布条形图
            </h3>
            <div className="chart-wrapper">
              {getBarChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBarChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      animationDuration={500}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="选择人数"
                      fill="#4A90D9"
                      radius={[4, 4, 0, 0]}
                      animationDuration={500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: '300px' }}>
                  <p>暂无选择题数据</p>
                </div>
              )}
            </div>
          </div>

          <div className="chart-section">
            <h3 className="chart-title">
              <TrendingUp size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              响应数量时间趋势（按小时）
            </h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    animationDuration={500}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="响应数"
                    stroke="#4A90D9"
                    strokeWidth={2}
                    dot={{ fill: '#4A90D9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-section">
            <h3 className="chart-title">
              <PieChartIcon size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              评分分布饼图
            </h3>
            <div className="chart-wrapper">
              {getPieChartData().length > 0 && getPieChartData().some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={500}
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      animationDuration={500}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: '300px' }}>
                  <p>暂无评分数据</p>
                </div>
              )}
            </div>
          </div>

          {getTextQuestions().length > 0 && (
            <div className="chart-section">
              <h3 className="chart-title">
                <MessageSquare size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                文本回答
              </h3>
              {getTextQuestions().map((question, idx) => (
                <div key={idx} style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
                    {question.label}
                  </h4>
                  <div className="text-answers-list">
                    {question.textAnswers?.map((answer, answerIdx) => (
                      <div key={answerIdx} className="text-answer-item">
                        {answer}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
