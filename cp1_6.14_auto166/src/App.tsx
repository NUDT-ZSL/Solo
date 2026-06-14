import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CodeEditor } from './CodeEditor';
import { executionEngine, OutputLine } from './execution-engine';
import {
  User,
  CursorState,
  CursorPosition,
  Selection,
  cursorSyncService,
  getRandomColor,
} from './cursor-sync';

interface OtherExecution {
  userId: string;
  userName: string;
  userColor: string;
  outputs: Array<{ type: string; content: string; timestamp: number }>;
}

const DEFAULT_CODE = `// 欢迎使用 CodeCanvas · 协作编码
// 在这里编写 JavaScript 代码，点击运行按钮查看结果
// 支持多人实时协作编辑，看到彼此的光标位置

function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to CodeCanvas\`;
}

// 计算斐波那契数列
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 测试代码
const result = greet('开发者');
console.log('Result:', result);

console.log('\\n斐波那契数列前10项:');
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}

// 试试修改这段代码，看看协作效果！
`;

const App: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [myOutputs, setMyOutputs] = useState<OutputLine[]>([]);
  const [otherExecutions, setOtherExecutions] = useState<OtherExecution[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorState>>(new Map());
  const [showCountPulse, setShowCountPulse] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const myOutputRef = useRef<HTMLDivElement>(null);
  const otherOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedCode = localStorage.getItem('codecanvas-code');
      if (savedCode) {
        setCode(savedCode);
      }
    } catch {
      // 忽略localStorage错误
    }
  }, []);

  useEffect(() => {
    if (!isJoined || !currentUser) return;

    const unregisterHandlers: Array<() => void> = [];

    unregisterHandlers.push(
      cursorSyncService.on('user-joined', (data) => {
        setUsers(data.users);
        triggerCountPulse();
      })
    );

    unregisterHandlers.push(
      cursorSyncService.on('user-left', (data) => {
        setUsers(data.users);
        setRemoteCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        triggerCountPulse();
      })
    );

    unregisterHandlers.push(
      cursorSyncService.on('cursor-update', (data) => {
        setRemoteCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });
      })
    );

    unregisterHandlers.push(
      cursorSyncService.on('code-update', (data) => {
        setCode(data.code);
      })
    );

    unregisterHandlers.push(
      cursorSyncService.on('execution-broadcast', (data) => {
        const user = users.find(u => u.id === data.userId);
        if (user) {
          const execution: OtherExecution = {
            userId: data.userId,
            userName: user.nickname,
            userColor: user.color,
            outputs: data.outputs,
          };
          setOtherExecutions(prev => [execution, ...prev.slice(0, 4)]);
        }
      })
    );

    cursorSyncService.connect(currentUser);

    return () => {
      unregisterHandlers.forEach(unregister => unregister());
      cursorSyncService.disconnect();
    };
  }, [isJoined, currentUser]);

  useEffect(() => {
    if (myOutputRef.current) {
      myOutputRef.current.scrollTop = myOutputRef.current.scrollHeight;
    }
  }, [myOutputs]);

  useEffect(() => {
    if (otherOutputRef.current) {
      otherOutputRef.current.scrollTop = otherOutputRef.current.scrollHeight;
    }
  }, [otherExecutions]);

  const triggerCountPulse = () => {
    setShowCountPulse(true);
    setTimeout(() => setShowCountPulse(false), 300);
  };

  const handleJoin = () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname || trimmedNickname.length > 10) return;

    const usedColors = users.map(u => u.color);
    const color = getRandomColor(usedColors);
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nickname: trimmedNickname,
      color,
    };

    setCurrentUser(user);
    setIsJoined(true);
  };

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    cursorSyncService.sendCodeUpdate(newCode);
  }, []);

  const handleCursorChange = useCallback((position: CursorPosition, selection: Selection | null) => {
    cursorSyncService.sendCursorPosition(position, selection);
  }, []);

  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      const result = executionEngine.execute(code);
      setMyOutputs(result.outputs);
      cursorSyncService.broadcastExecution(result.outputs);
      setIsRunning(false);
    }, 50);
  };

  const handleAutoSave = () => {
    // 自动保存完成，可以添加额外逻辑
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleNicknameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  if (!isJoined) {
    return (
      <div className="nickname-modal-overlay">
        <div className="nickname-modal">
          <h1 className="modal-title">CodeCanvas</h1>
          <p className="modal-subtitle">协作编码 · 实时同步</p>
          <input
            type="text"
            className="nickname-input"
            placeholder="请输入你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleNicknameKeyDown}
            maxLength={10}
            autoFocus
          />
          <p className="nickname-hint">
            昵称最多10个字符 · 加入后将自动分配专属颜色
          </p>
          <button
            className="join-button"
            onClick={handleJoin}
            disabled={!nickname.trim() || nickname.length > 10}
          >
            加入协作
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title">CodeCanvas · 协作编码</h1>
        <div className="user-list-section">
          <div className="user-list">
            {users.map((user) => (
              <div
                key={user.id}
                className="user-card"
                title={user.id === currentUser?.id ? '你' : user.nickname}
              >
                <div
                  className="user-avatar"
                  style={{ backgroundColor: user.color }}
                >
                  {getInitial(user.nickname)}
                </div>
                <span className="user-nickname">
                  {user.nickname}
                  {user.id === currentUser?.id && ' (你)'}
                </span>
              </div>
            ))}
          </div>
          <div className={`online-count ${showCountPulse ? 'pulse' : ''}`}>
            {users.length}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="editor-section">
          <div className="editor-header">
            <span className="editor-title">代码编辑器</span>
            <button
              className="run-button"
              onClick={handleRunCode}
              disabled={isRunning}
            >
              {isRunning ? '运行中...' : '▶ 运行代码'}
            </button>
          </div>
          <CodeEditor
            code={code}
            onChange={handleCodeChange}
            onCursorChange={handleCursorChange}
            remoteCursors={remoteCursors}
            users={users}
            onAutoSave={handleAutoSave}
          />
        </div>

        <div className="output-section">
          <h2 className="output-title">输出结果</h2>
          <div className="output-panel">
            <div className="my-output">
              <h3 className="output-subtitle">我的运行结果</h3>
              <div className="output-content" ref={myOutputRef}>
                {myOutputs.length === 0 ? (
                  <span style={{ color: '#64748b' }}>点击「运行代码」查看输出...</span>
                ) : (
                  myOutputs.map((output, index) => (
                    <div
                      key={`${output.timestamp}-${index}`}
                      className={`output-line ${output.type}`}
                    >
                      {output.content}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="divider" />

            <div className="others-output">
              <h3 className="output-subtitle">其他用户运行结果</h3>
              <div className="output-content" ref={otherOutputRef}>
                {otherExecutions.length === 0 ? (
                  <span style={{ color: '#64748b' }}>暂无其他用户的运行结果</span>
                ) : (
                  otherExecutions.map((execution, execIndex) => (
                    <div key={execIndex} className="other-execution-item">
                      <div className="other-execution-header">
                        <span
                          className="user-dot"
                          style={{ backgroundColor: execution.userColor }}
                        />
                        <span className="other-user-name">{execution.userName}</span>
                      </div>
                      {execution.outputs.map((output, outIndex) => (
                        <div
                          key={outIndex}
                          className={`other-output-line ${output.type === 'error' ? 'error' : ''}`}
                        >
                          {output.content}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
