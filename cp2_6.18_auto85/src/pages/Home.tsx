import { useState, useEffect } from 'react';
import { Search, Calendar, Users } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import { api } from '../api';
import type { Activity } from '../types';
import './Home.css';

const AGE_GROUPS = ['2-4岁', '4-6岁', '6-8岁', '8-10岁', '10-12岁'];

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [keyword, startDate, endDate, selectedAgeGroup, activities]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivities();
      setActivities(data);
      setFilteredActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!keyword && !startDate && !endDate && !selectedAgeGroup) {
      setFilteredActivities(activities);
      return;
    }

    let filtered = [...activities];

    if (keyword) {
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (startDate) {
      filtered = filtered.filter((a) => new Date(a.dateTime) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((a) => new Date(a.dateTime) <= new Date(endDate));
    }

    if (selectedAgeGroup) {
      filtered = filtered.filter((a) => a.ageGroups.includes(selectedAgeGroup));
    }

    setFilteredActivities(filtered);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const results = await api.searchActivities({
        keyword: keyword || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        ageGroup: selectedAgeGroup || undefined,
      });
      setFilteredActivities(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setKeyword('');
    setStartDate('');
    setEndDate('');
    setSelectedAgeGroup('');
    setFilteredActivities(activities);
  };

  return (
    <div className="home-page">
      <div className="container">
        <div className="hero-section">
          <h1 className="hero-title">
            <span className="hero-icon">🎈</span>
            发现精彩亲子活动
          </h1>
          <p className="hero-subtitle">为您和孩子打造难忘的亲子时光</p>
        </div>

        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="搜索活动名称..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <Calendar size={16} className="filter-icon" />
              <input
                type="date"
                className="filter-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="开始日期"
              />
              <span className="filter-separator">至</span>
              <input
                type="date"
                className="filter-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="结束日期"
              />
            </div>

            <div className="filter-group">
              <Users size={16} className="filter-icon" />
              <select
                className="filter-select"
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
              >
                <option value="">所有年龄段</option>
                {AGE_GROUPS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-outline filter-btn" onClick={handleSearch}>
              搜索
            </button>
            <button className="btn btn-outline filter-btn" onClick={clearFilters}>
              重置
            </button>
          </div>
        </div>

        <div className="activities-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂❓</div>
              <p className="empty-text">没有找到匹配的活动</p>
              <button className="btn" onClick={clearFilters}>
                查看所有活动
              </button>
            </div>
          ) : (
            <div className="activities-grid">
              {filteredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
