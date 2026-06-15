import React, { useState, useEffect, useCallback } from 'react';
import { jobsApi, candidatesApi } from '../utils/api';
import type { Job, Candidate } from '../types';
import { STAGE_CONFIG } from '../types';

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  onRefresh: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ jobId, onBack, onRefresh }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [jobData, candData] = await Promise.all([
        jobsApi.getById(jobId),
        candidatesApi.getAll(jobId),
      ]);
      setJob(jobData);
      setCandidates(candData);
    } catch (err) {
      console.error('Failed to load job detail:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('请上传PDF格式的简历文件');
      return;
    }

    setUploading(true);
    try {
      const text = await extractTextFromPDF(file);
      const parsed = parseResumeText(text, file.name);

      await candidatesApi.uploadResume({
        jobId,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        yearsOfExperience: parsed.yearsOfExperience,
        skills: parsed.skills,
        fileName: file.name,
      });

      loadData();
      onRefresh();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('简历上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let text = '';
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] >= 32 && bytes[i] < 127) {
            text += String.fromCharCode(bytes[i]);
          } else if (bytes[i] >= 0xc0 && bytes[i] <= 0xdf && i + 1 < bytes.length) {
            text += String.fromCharCode(((bytes[i] & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
          }
        }
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseResumeText = (text: string, fileName: string) => {
    const nameMatch = text.match(/(?:姓名|Name)[:\s]*([^\s,，\n]+)/i);
    const phoneMatch = text.match(/(?:电话|手机|Phone|Tel|Mobile)[:\s]*([0-9\-+()]{7,20})/i);
    const emailMatch = text.match(/(?:邮箱|Email|E-mail)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const yearsMatch = text.match(/(?:工作年限|经验|Experience)[:\s]*(\d+)/i);

    const nameFromFileName = fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');

    const commonSkills = [
      'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js',
      'Python', 'Java', 'Go', 'SQL', 'Docker', 'Kubernetes',
      'Figma', 'Sketch', 'Photoshop', 'Axure', 'CSS', 'HTML',
      '产品规划', '需求分析', '数据分析', '用户研究', '交互设计',
    ];

    const foundSkills = commonSkills.filter((skill) =>
      text.toLowerCase().includes(skill.toLowerCase())
    );

    return {
      name: nameMatch?.[1] || nameFromFileName || '未知候选人',
      phone: phoneMatch?.[1] || '',
      email: emailMatch?.[1] || '',
      yearsOfExperience: yearsMatch ? parseInt(yearsMatch[1]) : 0,
      skills: foundSkills.length > 0 ? foundSkills : ['待评估'],
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!job) return <div className="loading">职位不存在</div>;

  return (
    <>
      <div className="content-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            返回
          </button>
          <h1>{job.title}</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="job-detail">
          <div className="job-detail-header">
            <div className="job-detail-meta">
              <span>部门：{job.department}</span>
              <span>招聘人数：{job.headcount}</span>
              <span>薪资范围：{job.salaryRange}</span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {job.skills.map((s) => (
                <span key={s} className="skill-tag">{s}</span>
              ))}
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>上传简历</h3>
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('resume-input')?.click()}
          >
            <div className="upload-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="upload-text">
              {uploading ? '正在解析简历...' : (
                <>拖拽PDF文件到此处，或<strong>点击上传</strong></>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a4ab', marginTop: '8px' }}>
              支持PDF格式，最多10页
            </div>
            <input
              id="resume-input"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            关联候选人 ({candidates.length})
          </h3>
          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#636e72' }}>
              暂无候选人，请上传简历
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {candidates.map((c) => {
                const stageConfig = STAGE_CONFIG.find((s) => s.key === c.stage);
                return (
                  <div
                    key={c.id}
                    style={{
                      background: '#fff',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      borderLeft: `4px solid ${stageConfig?.color || '#3498db'}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{c.name}</span>
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#636e72' }}>
                          {c.yearsOfExperience}年经验
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '4px',
                          background: `${stageConfig?.color}20`,
                          color: stageConfig?.color,
                        }}
                      >
                        {stageConfig?.label}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.skills.map((s) => (
                        <span key={s} className="skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JobDetail;
