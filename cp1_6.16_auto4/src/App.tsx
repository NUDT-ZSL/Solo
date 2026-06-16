import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import VolunteerForm from './components/VolunteerForm';
import ActivityCard from './components/ActivityCard';
import Dashboard from './components/Dashboard';
import VolunteerReport from './components/VolunteerReport';
import RecordsList from './components/RecordsList';
import type {
  Activity,
  Volunteer,
  ServiceRecord,
  MatchedActivity,
  VolunteerReport as VolunteerReportType,
  DashboardStats,
  Skill,
} from './types';
import {
  matchActivitiesToVolunteer,
  generateDashboardStats,
  generateVolunteerReport,
} from './utils/volunteerLogic';

const AppContent: React.FC = () => {
  const { showToast } = useToast();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [currentVolunteerName, setCurrentVolunteerName] = useState<string>('');
  const [currentVolunteerSkills, setCurrentVolunteerSkills] = useState<Skill[]>([]);
  const [report, setReport] = useState<VolunteerReportType | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [activitiesRes, volunteersRes, recordsRes] = await Promise.all([
          fetch('/api/activities'),
          fetch('/api/volunteers'),
          fetch('/api/records'),
        ]);

        const [activitiesData, volunteersData, recordsData] = await Promise.all([
          activitiesRes.json(),
          volunteersRes.json(),
          recordsRes.json(),
        ]);

        setActivities(activitiesData);
        setVolunteers(volunteersData);
        setRecords(recordsData);
      } catch (err) {
        console.error('加载数据失败:', err);
        showToast('加载数据失败，请刷新重试', 'error');
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [showToast]);

  const matchedActivities: MatchedActivity[] = useMemo(() => {
    const volunteer = volunteers.find((v) => v.name === currentVolunteerName) || null;
    return matchActivitiesToVolunteer(activities, volunteer, currentVolunteerSkills, {
      threshold: 0.6,
    });
  }, [activities, volunteers, currentVolunteerName, currentVolunteerSkills]);

  const dashboardStats: DashboardStats = useMemo(() => {
    return generateDashboardStats(records);
  }, [records]);

  const handleSubmit = useCallback(
    async (data: {
      volunteerName: string;
      activityId: string;
      date: string;
      hours: number;
      skills: Skill[];
    }) => {
      setSubmitting(true);
      try {
        const response = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('提交失败');
        }

        const newRecord: ServiceRecord = await response.json();

        setRecords((prev) => [...prev, newRecord]);

        setCurrentVolunteerName(data.volunteerName);
        setCurrentVolunteerSkills(data.skills);

        setActivities((prev) =>
          prev.map((a) =>
            a.id === data.activityId
              ? { ...a, currentParticipants: Math.min(a.currentParticipants + 1, a.maxParticipants) }
              : a
          )
        );

        const matched = matchActivitiesToVolunteer(
          activities,
          null,
          data.skills,
          { threshold: 0.6 }
        );
        const recommendedCount = matched.filter((a) => a.isRecommended).length;

        showToast(
          `提交成功！为您推荐 ${recommendedCount} 个匹配活动`,
          'success'
        );
      } catch (err) {
        console.error('提交失败:', err);
        showToast('提交失败，请重试', 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [activities, showToast]
  );

  const handleSearchReport = useCallback(
    async (name: string) => {
      setReportLoading(true);
      setReport(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 400));

        const reportData = generateVolunteerReport(records, name);
        setReport(reportData);

        if (reportData.activityCount === 0) {
          showToast(`未找到 "${name}" 的服务记录`, 'info');
        }
      } catch (err) {
        console.error('生成报告失败:', err);
        showToast('生成报告失败', 'error');
      } finally {
        setReportLoading(false);
      }
    },
    [records, showToast]
  );

  if (pageLoading) {
    return (
      <div className="app-container">
        <div className="sidebar">
          <div className="skeleton skeleton-title" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ height: 38 }} />
            </div>
          ))}
        </div>
        <div className="main-content">
          <div className="skeleton skeleton-title" style={{ marginBottom: 20 }} />
          <div className="dashboard" style={{ marginBottom: 32 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
            ))}
          </div>
          <div className="skeleton skeleton-title" style={{ marginBottom: 16 }} />
          <div className="cards-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="section-title">📝 服务记录录入</div>
        <VolunteerForm activities={activities} onSubmit={handleSubmit} loading={submitting} />
        <div style={{ marginTop: 24 }}>
          <RecordsList records={[...records].reverse()} />
        </div>
      </aside>

      <main className="main-content">
        <section>
          <div className="section-title">📊 数据看板</div>
          <Dashboard stats={dashboardStats} />
        </section>

        <section>
          <div className="section-title">🎯 活动推荐</div>
          <div className="cards-grid">
            {matchedActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>

        <VolunteerReport report={report} loading={reportLoading} onSearch={handleSearchReport} />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
