import { useState, useCallback } from 'react';
import ResumeParser from './ResumeParser';
import MatchPanel from './MatchPanel';

export interface Experience {
  title: string;
  years: number;
}

export interface Education {
  degree: string;
  major: string;
}

export interface ResumeData {
  name: string;
  skills: string[];
  experience: Experience[];
  education: Education;
}

export type JobType = 'frontend' | 'backend' | 'fullstack';

function App() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const response = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      
      if (!response.ok) throw new Error('解析失败');
      const data = await response.json();
      setResumeData(data);
      setSelectedJob(null);
    } catch (error) {
      setParseError('文件解析失败，请确保是有效的JSON格式');
      console.error('Parse error:', error);
    } finally {
      setTimeout(() => setIsParsing(false), 500);
    }
  }, []);

  return (
    <div className="app-container">
      <header className="header">简历匹配助手</header>
      <div className="content">
        <div className="panel left-panel">
          <ResumeParser
            resumeData={resumeData}
            isParsing={isParsing}
            onFileUpload={handleFileUpload}
            parseError={parseError}
          />
        </div>
        <div className="panel right-panel">
          <MatchPanel
            resumeData={resumeData}
            selectedJob={selectedJob}
            onJobSelect={setSelectedJob}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
