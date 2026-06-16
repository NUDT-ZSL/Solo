import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { CollaborativeEditor } from '../collaboration/CollaborativeEditor';
import CodeRunner from '../collaboration/CodeRunner';
import type { UserInfo } from '../types';

function EditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [code, setCode] = useState<string>('// 在此输入代码\nconsole.log("Hello, World!");\n');
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [initialTemplate, setInitialTemplate] = useState<string>('');

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('userRole') as 'student' | 'teacher';

    if (savedUserId) setUserId(savedUserId);
    if (savedUsername) setUsername(savedUsername);
    if (savedRole) setRole(savedRole);

    if (savedUserId && savedUsername && roomId) {
      const mockUser: UserInfo = {
        userId: savedUserId,
        username: savedUsername,
        role: savedRole || 'student',
        color: '#3b82f6',
        connectedAt: Date.now()
      };
      setUsers([mockUser]);
    }
  }, [roomId]);

  useEffect(() => {
    const template = language === 'javascript'
      ? '// 在此输入 JavaScript 代码\nconsole.log("Hello, World!");\n'
      : '# 在此输入 Python 代码\nprint("Hello, World!")\n';
    setInitialTemplate(template);
  }, [language]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleLanguageChange = (newLanguage: 'javascript' | 'python') => {
    setLanguage(newLanguage);
  };

  const handleBack = () => navigate('/');

  return (
    <div className="app-container">
      <Sidebar
        roomId={roomId || ''}
        users={users}
        currentUserId={userId}
        isTeacher={role === 'teacher'}
      />

      <div className="editor-container" style={{ position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {userId && username && roomId ? (
            <CollaborativeEditor
              roomId={roomId}
              userId={userId}
              username={username}
              role={role}
              language={language}
              onLanguageChange={handleLanguageChange}
              onCodeChange={handleCodeChange}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '14px'
            }}>
              <div>
                <button
                  onClick={handleBack}
                  style={{
                    display: 'block',
                    margin: '0 auto 20px',
                    padding: '8px 16px',
                    background: 'var(--highlight)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ← 返回首页
                </button>
                正在加载编辑器...
              </div>
            </div>
          )}
        </div>
        <CodeRunner
          code={code}
          language={language}
        />
      </div>
    </div>
  );
}

export default EditorPage;
