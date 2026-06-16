import React, { useState, useEffect, useRef } from 'react';
import type { ProgressStats, WorkloadItem, RiskAlert, TeamMember } from './types';
import { api } from './api';

interface DashboardProps {
  projectId: string;
  teamMembers: TeamMember[];
}

interface HoverState {
  show: boolean;
  x: number;
  y: number;
  data: WorkloadItem | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projectId,
  teamMembers
}) => {
  const [progress, setProgress] = useState<ProgressStats | null>(null);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [hoverState, setHoverState] = useState<HoverState>({
    show: false,
    x: 0,
    y: 0,
    data: null
  });
  const [showAlertAnimation, setShowAlertAnimation] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    const loadData = async () => {
      const [progressData, workloadData, risksData] = await Promise.all([
        api.getProgressStats(projectId),
        api.getWorkload(projectId),
        api.getRisks(projectId)
      ]);
      
      setProgress(progressData);
      setWorkload(workloadData);
      setRisks(risksData.filter(r => r.level === 'high' || r.level === 'medium'));
    };
    
    loadData();
    
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [projectId]);
  
  useEffect(() => {
    if (risks.length > 0) {
      setShowAlertAnimation(true);
      const timer = setTimeout(() => setShowAlertAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [risks.length]);
  
  const renderProgressRing = () => {
    if (!progress) return null;
    
    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress.percentage / 100) * circumference;
    
    const gradientId = `progress-gradient-${Date.now()}`;
    
    return (
      <div className="progress-section">
        <h3>项目进度</h3>
        <div className="progress-ring-container">
          <svg width={size} height={size} ref={svgRef}>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4CAF50" />
                <stop offset="100%" stopColor="#2196F3" />
              </linearGradient>
            </defs>
            
            <circle
              className="progress-ring-bg"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E0E0E0"
              strokeWidth={strokeWidth}
            />
            
            <circle
              className="progress-ring-bar"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              style={{
                strokeDashoffset: offset,
                transition: 'stroke-dashoffset 0.8s ease-out',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center'
              }}
            />
            
            <text
              x={size / 2}
              y={size / 2 - 10}
              textAnchor="middle"
              className="progress-percentage"
              style={{ fontSize: '28px', fontWeight: 'bold', fill: '#263238' }}
            >
              {progress.percentage}%
            </text>
            
            <text
              x={size / 2}
              y={size / 2 + 15}
              textAnchor="middle"
              className="progress-label"
              style={{ fontSize: '12px', fill: '#78909C' }}
            >
              {progress.completed}/{progress.total} 已完成
            </text>
          </svg>
          
          <div className="progress-stats">
            <div className="stat-item">
              <span className="stat-value completed">{progress.completed}</span>
              <span className="stat-label">已完成</span>
            </div>
            <div className="stat-item">
              <span className="stat-value in-progress">{progress.inProgress}</span>
              <span className="stat-label">进行中</span>
            </div>
            <div className="stat-item">
              <span className="stat-value confirmed">{progress.confirmed}</span>
              <span className="stat-label">已确认</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderWorkloadChart = () => {
    if (workload.length === 0) return null;
    
    const maxTotal = Math.max(...workload.map(w => w.totalEstimate), 1);
    const chartHeight = 200;
    const barWidth = 40;
    const barGap = 20;
    const chartWidth = workload.length * (barWidth + barGap) + 40;
    
    return (
      <div className="workload-section">
        <h3>工作量分布</h3>
        <div className="workload-chart-container" style={{ overflowX: 'auto' }}>
          <svg 
            width={chartWidth} 
            height={chartHeight + 40}
            className="workload-chart"
          >
            {workload.map((item, index) => {
              const x = 30 + index * (barWidth + barGap);
              const totalHeight = (item.totalEstimate / maxTotal) * chartHeight;
              const completedHeight = (item.completedEstimate / maxTotal) * chartHeight;
              const y = chartHeight - totalHeight + 20;
              const completedY = chartHeight - completedHeight + 20;
              
              return (
                <g key={item.memberId}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={totalHeight}
                    fill="#E3F2FD"
                    rx={4}
                    className="bar-total"
                    onMouseEnter={(e) => setHoverState({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      data: item
                    })}
                    onMouseLeave={() => setHoverState({ show: false, x: 0, y: 0, data: null })}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  <rect
                    x={x}
                    y={completedY}
                    width={barWidth}
                    height={completedHeight}
                    fill="#2196F3"
                    rx={4}
                    className="bar-completed"
                    onMouseEnter={(e) => setHoverState({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      data: item
                    })}
                    onMouseLeave={() => setHoverState({ show: false, x: 0, y: 0, data: null })}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 35}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#546E7A"
                  >
                    {item.memberName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        <div className="workload-legend">
          <div className="legend-item">
            <span className="legend-color completed" />
            <span>已完成</span>
          </div>
          <div className="legend-item">
            <span className="legend-color total" />
            <span>总估时</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderRiskList = () => {
    if (risks.length === 0) {
      return (
        <div className="risk-section">
          <h3>风险预警</h3>
          <div className="no-risks">
            <span className="check-icon">✓</span>
            <p>当前无风险预警</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="risk-section">
        <h3>风险预警</h3>
        
        {risks.filter(r => r.level === 'high').length > 0 && (
          <div 
            className={`risk-banner ${showAlertAnimation ? 'animate' : ''}`}
          >
            <span className="banner-icon">!</span>
            <div className="banner-content">
              <strong>检测到 {risks.filter(r => r.level === 'high').length} 个高风险项</strong>
              <p>请及时处理依赖阻塞问题</p>
            </div>
          </div>
        )}
        
        <div className="risk-list">
          {risks.map((risk, index) => (
            <div 
              key={`${risk.cardId}-${index}`}
              className={`risk-item ${risk.level}`}
            >
              <div className="risk-header">
                <span className={`risk-level ${risk.level}`}>
                  {risk.level === 'high' ? '高风险' : '中风险'}
                </span>
                <span className="risk-assignee">
                  👤 {teamMembers.find(m => m.id === risk.assignee)?.name || risk.assignee}
                </span>
              </div>
              <h4 className="risk-title">{risk.cardTitle}</h4>
              <p className="risk-reason">{risk.reason}</p>
              {risk.dependencyTitle && (
                <div className="risk-dependency">
                  依赖: <span>{risk.dependencyTitle}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="dashboard-container">
      {renderProgressRing()}
      {renderWorkloadChart()}
      {renderRiskList()}
      
      {hoverState.show && hoverState.data && (
        <div 
          className="workload-tooltip"
          style={{
            left: hoverState.x + 10,
            top: hoverState.y + 10
          }}
        >
          <div className="tooltip-header">{hoverState.data.memberName}</div>
          <div className="tooltip-row">
            <span>总估时:</span>
            <strong>{hoverState.data.totalEstimate}人天</strong>
          </div>
          <div className="tooltip-row">
            <span>已完成:</span>
            <strong>{hoverState.data.completedEstimate}人天</strong>
          </div>
          <div className="tooltip-row">
            <span>进行中:</span>
            <strong>{hoverState.data.totalEstimate - hoverState.data.completedEstimate}人天</strong>
          </div>
          <div className="tooltip-divider" />
          <div className="tooltip-cards">
            {hoverState.data.cards.map(card => (
              <div key={card.id} className="tooltip-card-item">
                <span className="tooltip-card-title">{card.title}</span>
                <span className="tooltip-card-estimate">{card.estimateDays}天</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
