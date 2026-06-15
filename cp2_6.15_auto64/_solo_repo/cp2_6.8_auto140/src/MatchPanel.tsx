import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import type { ResumeData, JobType } from './App';

interface JobRequirement {
  id: JobType;
  name: string;
  skills: string[];
  yearsExperience: number;
  degree: string;
  majorKeywords: string[];
  description: string;
}

interface MatchResult {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  skillMatches: { skill: string; matched: boolean }[];
  experienceDetail: { totalYears: number; requiredYears: number };
  educationDetail: { degreeScore: number; majorScore: number; degreePercent: number };
}

const JOBS: JobRequirement[] = [
  {
    id: 'frontend',
    name: '前端工程师',
    skills: ['React', 'TypeScript', 'CSS'],
    yearsExperience: 3,
    degree: '本科',
    majorKeywords: ['计算机', '软件', '信息', '电子'],
    description: 'React / TypeScript / CSS\n3年经验 / 本科',
  },
  {
    id: 'backend',
    name: '后端工程师',
    skills: ['Python', 'FastAPI', 'Docker'],
    yearsExperience: 4,
    degree: '硕士',
    majorKeywords: ['计算机', '软件', '信息'],
    description: 'Python / FastAPI / Docker\n4年经验 / 硕士',
  },
  {
    id: 'fullstack',
    name: '全栈工程师',
    skills: ['React', 'Python', 'AWS'],
    yearsExperience: 5,
    degree: '本科',
    majorKeywords: ['计算机', '软件', '信息'],
    description: 'React / Python / AWS\n5年经验 / 本科',
  },
];

interface MatchPanelProps {
  resumeData: ResumeData | null;
  selectedJob: JobType | null;
  onJobSelect: (job: JobType) => void;
}

function getScoreColor(score: number): string {
  if (score < 40) return '#E53E3E';
  if (score < 70) return '#ED8936';
  return '#48BB78';
}

function ProgressRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;
  const color = getScoreColor(displayScore);

  useEffect(() => {
    setDisplayScore(0);
    const timer = setTimeout(() => {
      const duration = 1000;
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(score * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, 50);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="progress-ring-container">
      <svg width="200" height="200">
        <circle
          className="progress-ring-bg"
          cx="100"
          cy="100"
          r={radius}
        />
        <circle
          className="progress-ring-circle"
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-text" style={{ backgroundColor: color }}>
        {displayScore}%
      </div>
    </div>
  );
}

function ScoreBar({ label, score, animated }: { label: string; score: number; animated: boolean }) {
  const [displayScore, setDisplayScore] = useState(0);
  const color = getScoreColor(score);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    setDisplayScore(0);
    const duration = 1000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    const timer = setTimeout(() => requestAnimationFrame(animate), 100);
    return () => clearTimeout(timer);
  }, [score, animated]);

  return (
    <div className="score-row">
      <div className="score-name">{label}</div>
      <div className="score-bar-container">
        <div className="score-bar">
          <div
            className="score-bar-fill"
            style={{
              width: `${displayScore}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="score-value">{displayScore}%</div>
      </div>
    </div>
  );
}

function MatchPanel({ resumeData, selectedJob, onJobSelect }: MatchPanelProps) {
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const selectedJobInfo = useMemo(
    () => JOBS.find((j) => j.id === selectedJob) || null,
    [selectedJob]
  );

  useEffect(() => {
    if (!resumeData || !selectedJob) {
      setMatchResult(null);
      return;
    }

    let cancelled = false;
    setIsMatching(true);

    const fetchMatch = async () => {
      try {
        const response = await axios.post('/api/resume/match', {
          resume: resumeData,
          jobType: selectedJob,
        });
        if (!cancelled) {
          setMatchResult(response.data);
        }
      } catch (error) {
        console.error('Match error:', error);
      } finally {
        if (!cancelled) setIsMatching(false);
      }
    };

    fetchMatch();

    return () => {
      cancelled = true;
    };
  }, [resumeData, selectedJob]);

  const toggleRow = (row: string) => {
    setExpandedRow(expandedRow === row ? null : row);
  };

  return (
    <div>
      <h2 className="panel-title">岗位匹配</h2>

      <div className="job-selector">
        {JOBS.map((job) => (
          <div
            key={job.id}
            className={`job-card ${selectedJob === job.id ? 'selected' : ''}`}
            onClick={() => onJobSelect(job.id)}
          >
            <div className="job-card-name">{job.name}</div>
            <div className="job-card-req" style={{ whiteSpace: 'pre-line' }}>
              {job.description}
            </div>
          </div>
        ))}
      </div>

      {!resumeData && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">请先在左侧上传简历</div>
        </div>
      )}

      {resumeData && !selectedJob && (
        <div className="empty-state">
          <div className="empty-state-icon">👆</div>
          <div className="empty-state-text">请选择一个目标岗位进行匹配</div>
        </div>
      )}

      {resumeData && selectedJob && isMatching && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {resumeData && selectedJob && !isMatching && matchResult && selectedJobInfo && (
        <div className="match-result">
          <ProgressRing score={matchResult.overallScore} />

          <div className="score-table">
            <div onClick={() => toggleRow('skill')}>
              <ScoreBar label="技能匹配度" score={matchResult.skillScore} animated={true} />
              {expandedRow === 'skill' && (
                <div className="detail-panel">
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#2D3748' }}>
                    岗位要求技能：{selectedJobInfo.skills.join('、')}
                  </div>
                  {matchResult.skillMatches.map((item, index) => (
                    <div key={index} className="skill-match-item">
                      <span className={`skill-match-icon ${item.matched ? 'matched' : 'unmatched'}`}>
                        {item.matched ? '✓' : '✗'}
                      </span>
                      <span>{item.skill}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div onClick={() => toggleRow('experience')}>
              <ScoreBar label="经验匹配度" score={matchResult.experienceScore} animated={true} />
              {expandedRow === 'experience' && (
                <div className="detail-panel">
                  <div>累计工作经验：{matchResult.experienceDetail.totalYears} 年</div>
                  <div>岗位要求：{matchResult.experienceDetail.requiredYears} 年</div>
                  <div style={{ marginTop: 8, color: '#718096', fontSize: 12 }}>
                    超出要求年限按满分计算，不足按比例折算
                  </div>
                </div>
              )}
            </div>

            <div onClick={() => toggleRow('education')}>
              <ScoreBar label="教育匹配度" score={matchResult.educationScore} animated={true} />
              {expandedRow === 'education' && (
                <div className="detail-panel">
                  <div>学位得分：{matchResult.educationDetail.degreePercent}%</div>
                  <div>专业相关性：{matchResult.educationDetail.majorScore}%</div>
                  <div style={{ marginTop: 8, color: '#718096', fontSize: 12 }}>
                    评分标准：博士100%、硕士80%、本科60%、其他30%；专业按关键字匹配
                  </div>
                </div>
              )}
            </div>

            <ScoreBar label="综合得分" score={matchResult.overallScore} animated={true} />
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchPanel;
