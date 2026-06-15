import React, { useState, useEffect, useCallback } from 'react';
import { jobsApi, candidatesApi } from '../utils/api';
import CreateJobModal from './CreateJobModal';
import type { Job, Candidate } from '../types';

interface JobBoardProps {
  onJobClick: (jobId: string) => void;
  onRefresh: () => void;
}

const JobBoard: React.FC<JobBoardProps> = ({ onJobClick, onRefresh }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [jobsData, candData] = await Promise.all([
        jobsApi.getAll(),
        candidatesApi.getAll(),
      ]);
      setJobs(jobsData);
      setCandidates(candData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departments = Array.from(new Set(jobs.map((j) => j.department)));

  const filtered = jobs.filter((job) => {
    const matchSearch =
      !search ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || job.department === deptFilter;
    return matchSearch && matchDept;
  });

  const getHiredCount = (jobId: string) => {
    return candidates.filter((c) => c.jobId === jobId && c.stage === 'hired').length;
  };

  const handleJobCreated = () => {
    setShowCreateModal(false);
    loadData();
    onRefresh();
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <>
      <div className="content-header">
        <h1>职位管理</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          创建职位
        </button>
      </div>
      <div className="content-body">
        <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder="搜索职位名称或部门..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">全部部门</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="job-grid">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="job-card animate-in"
              onClick={() => onJobClick(job.id)}
            >
              <div className="job-card-title">{job.title}</div>
              <div className="job-card-dept">{job.department}</div>
              <div className="job-card-progress">
                招聘进度：<span>{getHiredCount(job.id)}/{job.headcount}</span>人
              </div>
              <div className="job-card-skills">
                {job.skills.map((s) => (
                  <span key={s} className="skill-tag">{s}</span>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#636e72' }}>
                {job.salaryRange}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#636e72' }}>
            暂无匹配的职位
          </div>
        )}
      </div>
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleJobCreated}
        />
      )}
    </>
  );
};

export default JobBoard;
