import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import type { ResumeData } from './App';

interface ResumeParserProps {
  resumeData: ResumeData | null;
  isParsing: boolean;
  onFileUpload: (file: File) => void;
  parseError: string | null;
}

function ResumeParser({ resumeData, isParsing, onFileUpload, parseError }: ResumeParserProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/json') {
      onFileUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div>
      <h2 className="panel-title">简历信息</h2>

      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">📄</div>
        <div className="upload-text">拖拽JSON简历文件到此处，或点击上传</div>
        <div className="upload-hint">支持 .json 格式文件</div>
      </div>

      {parseError && (
        <div style={{ color: '#E53E3E', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
          {parseError}
        </div>
      )}

      {isParsing && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {!isParsing && resumeData && (
        <div>
          <div className="resume-section">
            <div className="resume-section-title">基本信息</div>
            <div className="resume-name">{resumeData.name}</div>
          </div>

          <div className="resume-section">
            <div className="resume-section-title">技能</div>
            <div className="skills-list">
              {resumeData.skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="resume-section">
            <div className="resume-section-title">工作经历</div>
            <div className="experience-list">
              {resumeData.experience.map((exp, index) => (
                <div key={index} className="experience-card">
                  <div className="experience-title">{exp.title}</div>
                  <div className="experience-years">{exp.years} 年经验</div>
                </div>
              ))}
            </div>
          </div>

          <div className="resume-section">
            <div className="resume-section-title">教育背景</div>
            <div className="education-info">
              <div className="education-degree">{resumeData.education.degree}</div>
              <div className="education-major">{resumeData.education.major}</div>
            </div>
          </div>
        </div>
      )}

      {!isParsing && !resumeData && !parseError && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">上传简历后，此处将显示解析结果</div>
        </div>
      )}
    </div>
  );
}

export default ResumeParser;
