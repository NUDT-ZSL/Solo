import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { Activity, ScheduleAssignment, Volunteer } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ActivityCardData {
  activity: Activity;
  registrationCount: number;
  schedules: ScheduleAssignment[];
}

const Dashboard: React.FC = () => {
  const {
    activities,
    volunteers,
    completionRates,
    fetchActivities,
    fetchVolunteers,
    fetchCompletionRates,
    createActivity,
    getRegistrations,
    getSchedules,
    addSchedule,
    removeSchedule,
    exportSchedule,
    showDownloadProgress,
    downloadProgress,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityCards, setActivityCards] = useState<ActivityCardData[]>([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    dateTime: '',
    location: '',
    maxParticipants: 10,
    description: '',
  });

  const draggedVolunteer = useRef<Volunteer | null>(null);
  const draggedSchedule = useRef<{ scheduleId: string; volunteerName: string } | null>(null);

  useEffect(() => {
    fetchActivities();
    fetchVolunteers();
    fetchCompletionRates();
  }, [fetchActivities, fetchVolunteers, fetchCompletionRates]);

  useEffect(() => {
    const loadCardData = async () => {
      const cards = await Promise.all(
        activities.map(async (activity) => {
          const [registrations, schedules] = await Promise.all([
            getRegistrations(activity._id),
            getSchedules(activity._id),
          ]);
          return {
            activity,
            registrationCount: registrations.length,
            schedules,
          };
        })
      );
      setActivityCards(cards);
    };
    loadCardData();
  }, [activities, getRegistrations, getSchedules]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createActivity(newActivity);
    if (result) {
      setShowModal(false);
      setNewActivity({
        name: '',
        dateTime: '',
        location: '',
        maxParticipants: 10,
        description: '',
      });
    }
  };

  const handleDragStartVolunteer = (e: React.DragEvent, volunteer: Volunteer) => {
    draggedVolunteer.current = volunteer;
    draggedSchedule.current = null;
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartSchedule = (
    e: React.DragEvent,
    scheduleId: string,
    volunteerName: string
  ) => {
    draggedSchedule.current = { scheduleId, volunteerName };
    draggedVolunteer.current = null;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedVolunteer.current ? 'copy' : 'move';
  };

  const handleDropOnSchedule = async (e: React.DragEvent, activityId: string) => {
    e.preventDefault();
    if (draggedVolunteer.current) {
      const volunteer = draggedVolunteer.current;
      const result = await addSchedule(activityId, volunteer._id, volunteer.name);
      if (result) {
        const updated = await Promise.all(
          activityCards.map(async (card) => {
            if (card.activity._id === activityId) {
              const schedules = await getSchedules(activityId);
              return { ...card, schedules };
            }
            return card;
          })
        );
        setActivityCards(updated);
        fetchCompletionRates();
      }
    }
    draggedVolunteer.current = null;
    draggedSchedule.current = null;
  };

  const handleDropOutside = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedSchedule.current) {
      const success = await removeSchedule(draggedSchedule.current.scheduleId);
      if (success) {
        const updated = await Promise.all(
          activityCards.map(async (card) => {
            const schedules = card.schedules.filter(
              (s) => s._id !== draggedSchedule.current?.scheduleId
            );
            if (schedules.length !== card.schedules.length) {
              const freshSchedules = await getSchedules(card.activity._id);
              return { ...card, schedules: freshSchedules };
            }
            return card;
          })
        );
        setActivityCards(updated);
        fetchCompletionRates();
      }
    }
    draggedVolunteer.current = null;
    draggedSchedule.current = null;
  };

  const handleExportReport = () => {
    const now = new Date();
    exportSchedule(now.getFullYear(), now.getMonth() + 1);
  };

  const chartData = {
    labels: completionRates.map((r) => r.date),
    datasets: [
      {
        label: '排班完成率 (%)',
        data: completionRates.map((r) => r.rate),
        borderColor: '#ff9f43',
        backgroundColor: 'rgba(255, 159, 67, 0.1)',
        pointBackgroundColor: '#ff9f43',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 58, 95, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <div
      className="admin-layout"
      onDragOver={handleDragOver}
      onDrop={handleDropOutside}
    >
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="菜单"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>志愿者管理</h2>
        </div>
        <div className="sidebar-section">
          <h3>志愿者列表</h3>
          <div className="volunteer-list">
            {volunteers.map((volunteer) => (
              <div
                key={volunteer._id}
                className="volunteer-item"
                draggable
                onDragStart={(e) => handleDragStartVolunteer(e, volunteer)}
              >
                {volunteer.name}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="dashboard-hero">
          <div className="hero-content">
            <h1>管理员仪表板</h1>
            <p>高效管理志愿者排班与活动报名</p>
          </div>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + 创建活动
            </button>
            <button className="btn-secondary" onClick={handleExportReport}>
              导出报表
            </button>
          </div>
        </div>

        <section className="chart-section">
          <h2>过去7天排班完成率</h2>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions as any} />
          </div>
        </section>

        <section className="cards-section">
          <h2>活动报名统计</h2>
          <div className="activity-cards-grid">
            {activityCards.map((card) => (
              <div key={card.activity._id} className="activity-stat-card">
                <div className="card-header">
                  <h3>{card.activity.name}</h3>
                  <span className="card-date">
                    {new Date(card.activity.dateTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-value">{card.registrationCount}</span>
                    <span className="stat-label">已报名</span>
                  </div>
                  <div className="stat-divider">/</div>
                  <div className="stat-item">
                    <span className="stat-value">{card.activity.maxParticipants}</span>
                    <span className="stat-label">最大人数</span>
                  </div>
                </div>
                <div
                  className="schedule-drop-zone"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnSchedule(e, card.activity._id)}
                >
                  <div className="drop-zone-label">分配排班区域</div>
                  <div className="schedule-tags">
                    {card.schedules.map((schedule) => (
                      <span
                        key={schedule._id}
                        className="schedule-tag"
                        draggable
                        onDragStart={(e) =>
                          handleDragStartSchedule(e, schedule._id, schedule.volunteerName)
                        }
                      >
                        {schedule.volunteerName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建新活动</h2>
            <form onSubmit={handleCreateActivity} className="activity-form">
              <div className="form-group">
                <label>活动名称</label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>日期时间</label>
                <input
                  type="datetime-local"
                  value={newActivity.dateTime}
                  onChange={(e) => setNewActivity({ ...newActivity, dateTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>地点</label>
                <input
                  type="text"
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>最大参与人数</label>
                <input
                  type="number"
                  value={newActivity.maxParticipants}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, maxParticipants: Number(e.target.value) })
                  }
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>活动描述</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary btn-submit">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDownloadProgress && (
        <div className="download-progress-container">
          <div className="download-label">下载中...</div>
          <div className="download-progress-bar">
            <div
              className="download-progress-fill"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
