import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import SurveyForm from './components/SurveyForm';
import StatsPanel from './components/StatsPanel';
import { surveyApi, Survey, Question } from './api/surveyApi';

const THANK_YOU_DURATION = 1800;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const CLIENT_ID_KEY = 'survey_client_id_v2';
const SUBMIT_RECORD_PREFIX = 'survey_submit_';

const LazyStatsPanel = lazy(() => import('./components/StatsPanel'));
const LazySurveyForm = lazy(() => import('./components/SurveyForm'));

const apiCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function cachedGetSurvey(id: string): Promise<Survey> {
  const cacheKey = `survey:${id}`;
  const cached = apiCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data as Survey;
  }
  const data = await surveyApi.getSurvey(id);
  apiCache.set(cacheKey, { data, timestamp: now });
  return data;
}

function getOrCreateClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = uuidv4();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function checkLocalSubmitLimit(surveyId: string): { allowed: boolean; message?: string; remainingMs?: number } {
  const key = `${SUBMIT_RECORD_PREFIX}${surveyId}`;
  const recordRaw = localStorage.getItem(key);
  if (!recordRaw) return { allowed: true };
  try {
    const record = JSON.parse(recordRaw);
    const submittedAt: number = record.submittedAt;
    const now = Date.now();
    const elapsed = now - submittedAt;
    if (elapsed < TWENTY_FOUR_HOURS) {
      const remainingMs = TWENTY_FOUR_HOURS - elapsed;
      const hoursLeft = Math.ceil(remainingMs / 3600000);
      return {
        allowed: false,
        message: `24小时内只能提交一次，还剩${hoursLeft}小时可再次提交`,
        remainingMs,
      };
    }
    localStorage.removeItem(key);
    return { allowed: true };
  } catch {
    localStorage.removeItem(key);
    return { allowed: true };
  }
}

function recordLocalSubmit(surveyId: string): void {
  const key = `${SUBMIT_RECORD_PREFIX}${surveyId}`;
  localStorage.setItem(key, JSON.stringify({
    submittedAt: Date.now(),
    clientId: getOrCreateClientId(),
  }));
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '2px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  transition: 'all 0.2s ease',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box',
};

const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { id: 'create', label: '创建问卷', path: '/' },
    { id: 'list', label: '问卷列表', path: '/surveys' },
  ];

  return (
    <nav style={navbarStyle}>
      <div style={navbarInnerStyle}>
        <Link to="/" style={logoStyle}>
          <span style={{ fontSize: 24 }}>📝</span>
          <span>匿名反馈问卷</span>
        </Link>

        {isMobile ? (
          <>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={hamburgerBtnStyle}
              aria-label="菜单"
            >
              <div style={hamburgerIconStyle(mobileOpen)}>
                <span />
                <span />
                <span />
              </div>
            </button>
            {mobileOpen && (
              <div style={mobileMenuStyle}>
                {navItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    style={{
                      ...mobileNavItemStyle,
                      background: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                      borderLeft: isActive(item.path) ? '3px solid #3b82f6' : '3px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={desktopMenuStyle}>
            {navItems.map((item) => (
              <Link key={item.id} to={item.path} style={navLinkWrapStyle}>
                <span style={navLinkTextStyle}>{item.label}</span>
                <span
                  style={{
                    ...navUnderlineStyle,
                    width: isActive(item.path) ? '100%' : '0%',
                  }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdSurvey, setCreatedSurvey] = useState<Survey | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(async (title: string, questions: Question[]) => {
    try {
      setLoading(true);
      const survey = await surveyApi.createSurvey({ title, questions });
      setCreatedSurvey(survey);
    } catch (error) {
      alert('创建失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const copyLink = useCallback(() => {
    if (!createdSurvey) return;
    const link = `${window.location.origin}/survey/${createdSurvey.shortId}`;
    try {
      navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdSurvey]);

  const viewStats = useCallback(() => {
    if (createdSurvey) navigate(`/stats/${createdSurvey._id}`);
  }, [createdSurvey, navigate]);

  if (createdSurvey) {
    const shareLink = `${window.location.origin}/survey/${createdSurvey.shortId}`;
    return (
      <div style={pageContainerStyle}>
        <div style={successCardStyle}>
          <div style={successCheckmarkContainerStyle}>
            <div style={successCheckmarkCircleStyle}>
              <svg width="56" height="56" viewBox="0 0 52 52" style={successCheckmarkSvgStyle}>
                <circle cx="26" cy="26" r="25" fill="none" style={successCircleStyle} />
                <path fill="none" d="M14 27l7 7 16-16" style={successCheckStyle} />
              </svg>
            </div>
          </div>
          <h2 style={successTitleStyle}>问卷创建成功！</h2>
          <p style={successSubtitleStyle}>
            问卷 "<strong style={{ color: '#1e293b' }}>{createdSurvey.title}</strong>" 已创建，可分享以下链接收集反馈
          </p>

          <div style={linkBoxStyle}>
            <div style={linkBoxLabelStyle}>分享链接</div>
            <div style={linkBoxRowStyle}>
              <input type="text" value={shareLink} readOnly style={linkInputStyle} />
              <button onClick={copyLink} style={copyButtonStyle(copied)}>
                {copied ? '已复制 ✓' : '复制链接'}
              </button>
            </div>
          </div>

          <div style={successActionsStyle}>
            <button
              onClick={() => { setCreatedSurvey(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={secondaryButtonStyle}
            >
              继续创建新问卷
            </button>
            <button onClick={viewStats} style={primaryButtonStyle}>
              查看数据分析 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageContainerStyle}>
      <div style={pageHeaderStyle}>
        <h1 style={pageTitleStyle}>创建问卷</h1>
        <p style={pageDescStyle}>
          几分钟内创建一个匿名反馈问卷，支持单选、多选和开放性问题
        </p>
      </div>
      <Suspense fallback={<div style={loadingStyle}>正在加载表单组件...</div>}>
        <SurveyForm onSubmit={handleCreate} loading={loading} />
      </Suspense>
    </div>
  );
};

const SurveyListPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const loadSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const params = startDate || endDate ? { startDate, endDate } : undefined;
      const data = await surveyApi.getSurveys(params);
      setSurveys(data);
    } catch (error) {
      alert('加载失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!window.confirm(`确定要删除问卷「${title}」吗？\n所有收集的数据将无法恢复。`)) return;
    try {
      await surveyApi.deleteSurvey(id);
      setSurveys(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      alert('删除失败：' + (error as Error).message);
    }
  }, []);

  const handleExport = useCallback(async (id: string) => {
    try { await surveyApi.exportExcel(id); }
    catch (error) { alert('导出失败：' + (error as Error).message); }
  }, []);

  const copyShareLink = useCallback((shortId: string) => {
    const link = `${window.location.origin}/survey/${shortId}`;
    try { navigator.clipboard.writeText(link); alert('链接已复制到剪贴板'); }
    catch { alert('复制失败，请手动复制：' + link); }
  }, []);

  return (
    <div style={pageContainerStyle}>
      <div style={pageHeaderStyle}>
        <h1 style={pageTitleStyle}>问卷列表</h1>
        <p style={pageDescStyle}>管理所有问卷，查看数据或导出结果</p>
      </div>

      <div style={filterBarStyle}>
        <div style={filterItemStyle}>
          <label style={filterLabelStyle}>开始日期</label>
          <input
            type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={filterItemStyle}>
          <label style={filterLabelStyle}>结束日期</label>
          <input
            type="date" value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ ...filterItemStyle, flexGrow: 0 }}>
          <label style={{ ...filterLabelStyle, visibility: 'hidden' }}>操作</label>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            style={resetFilterBtnStyle}
          >
            重置筛选
          </button>
        </div>
      </div>

      {loading ? (
        <div style={loadingStyle}>加载中...</div>
      ) : surveys.length === 0 ? (
        <div style={emptyCardStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>
            {startDate || endDate ? '所选时间范围内暂无问卷' : '还没有创建任何问卷'}
          </div>
          <Link to="/" style={emptyLinkStyle}>去创建第一个问卷 →</Link>
        </div>
      ) : (
        <div style={surveyGridStyle}>
          {surveys.map((survey) => (
            <div key={survey._id} style={surveyCardStyle}>
              <div style={surveyCardHeaderStyle}>
                <h3 style={surveyCardTitleStyle}>{survey.title}</h3>
                <div style={surveyCardBadgeStyle}>
                  {survey.responseCount} 份
                </div>
              </div>
              <div style={surveyCardMetaStyle}>
                <span>📅 {new Date(survey.createdAt).toLocaleDateString('zh-CN')}</span>
                <span style={surveyShortIdStyle}>链接：/survey/{survey.shortId}</span>
              </div>
              <div style={surveyCardBodyStyle}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  {survey.questions.length} 道题
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  包含：{survey.questions.map(q =>
                    q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : '文本'
                  ).join('、')}
                </div>
              </div>
              <div style={surveyCardActionsStyle}>
                <button onClick={() => navigate(`/stats/${survey._id}`)} style={cardLinkBtnStyle}>
                  📊 分析
                </button>
                <button onClick={() => copyShareLink(survey.shortId)} style={cardLinkBtnStyle}>
                  🔗 链接
                </button>
                <button onClick={() => handleExport(survey._id)} style={cardLinkBtnStyle}>
                  📥 导出
                </button>
                <button
                  onClick={() => handleDelete(survey._id, survey.title)}
                  style={{ ...cardLinkBtnStyle, color: '#ef4444' }}
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div style={loadingStyle}>缺少问卷ID</div>;
  return (
    <div style={{ padding: '32px 0' }}>
      <Suspense fallback={<div style={loadingStyle}>正在加载统计组件...</div>}>
        <LazyStatsPanel surveyId={id} />
      </Suspense>
    </div>
  );
};

const SurveyTakePage: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | string[])[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const clientId = useMemo(() => getOrCreateClientId(), []);

  useEffect(() => {
    if (!shortId) return;
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const limitCheck = checkLocalSubmitLimit(shortId);
        if (!limitCheck.allowed) {
          setLimitError(limitCheck.message || '24小时内只能提交一次');
        }
        const s = await cachedGetSurvey(shortId);
        if (!canceled) {
          setSurvey(s);
          setAnswers(new Array(s.questions.length).fill('').map((_, i) => 
            s.questions[i].type === 'multiple' ? [] : ''
          ));
        }
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : '问卷不存在');
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [shortId]);

  const setAnswer = useCallback((idx: number, value: string | string[]) => {
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  const toggleMultiOption = useCallback((qIdx: number, option: string) => {
    setAnswers(prev => {
      const next = [...prev];
      const current = Array.isArray(next[qIdx]) ? next[qIdx] as string[] : [];
      const exists = current.includes(option);
      next[qIdx] = exists
        ? current.filter(v => v !== option)
        : [...current, option];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    const localCheck = checkLocalSubmitLimit(shortId!);
    if (!localCheck.allowed) {
      setLimitError(localCheck.message || '24小时内只能提交一次');
      return;
    }

    for (let i = 0; i < survey.questions.length; i++) {
      const q = survey.questions[i];
      const ans = answers[i];
      if (q.type === 'single') {
        if (!ans || (typeof ans === 'string' && !ans.trim())) {
          alert(`请回答第 ${i + 1} 题：${q.text}`);
          return;
        }
      } else if (q.type === 'multiple') {
        if (!Array.isArray(ans) || ans.length === 0) {
          alert(`请至少选择一个选项，第 ${i + 1} 题：${q.text}`);
          return;
        }
      } else if (q.type === 'text') {
        if (!ans || (typeof ans === 'string' && !ans.trim())) {
          alert(`请回答第 ${i + 1} 题：${q.text}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const submitStart = performance.now();
      await surveyApi.submitResponse(shortId!, { answers, clientId });
      recordLocalSubmit(shortId!);
      const elapsed = performance.now() - submitStart;
      const delay = Math.max(0, 120 - elapsed);
      setTimeout(() => navigate(`/survey/${shortId}/thanks`), delay);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || (err as Error).message;
      if (msg.includes('24小时')) {
        setLimitError(msg);
      } else {
        alert('提交失败：' + msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [survey, answers, clientId, shortId, navigate]);

  if (loading) {
    return (
      <div style={pageContainerStyle}>
        <div style={loadingStyle}>加载问卷中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageContainerStyle}>
        <div style={errorCardStyle}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
          <div style={{ fontSize: 18, color: '#475569', marginBottom: 24 }}>{error}</div>
          <Link to="/" style={primaryButtonStyle}>返回首页</Link>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div style={pageContainerStyle}>
      <div style={takeSurveyCardStyle}>
        <div style={takeSurveyHeaderStyle}>
          <h1 style={takeSurveyTitleStyle}>{survey.title}</h1>
          <div style={takeSurveyDescStyle}>
            匿名反馈 · 共 {survey.questions.length} 题 · 数据严格保密
          </div>
        </div>

        {limitError && (
          <div style={limitErrorStyle}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div>{limitError}</div>
          </div>
        )}

        {limitError ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Link to="/" style={secondaryButtonStyle}>返回首页</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {survey.questions.map((q, qIdx) => (
              <div key={q.id} style={questionCardStyle}>
                <div style={questionHeaderStyle}>
                  <span style={questionNumberStyle}>{qIdx + 1}</span>
                  <div style={questionTextStyle}>{q.text}</div>
                  <span style={requiredBadgeStyle}>必答</span>
                </div>

                {q.type === 'single' && (
                  <div style={optionsContainerStyle}>
                    {(q.options || []).map((opt, oIdx) => {
                      const selected = answers[qIdx] === opt;
                      return (
                        <label key={oIdx} style={optionLabelStyle(selected, false)}>
                          <div style={radioOuterStyle(selected)}>
                            {selected && <div style={radioInnerStyle} />}
                          </div>
                          <span style={{ flex: 1 }}>{opt}</span>
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={opt}
                            checked={selected}
                            onChange={() => setAnswer(qIdx, opt)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'multiple' && (
                  <div style={optionsContainerStyle}>
                    {(q.options || []).map((opt, oIdx) => {
                      const arr = Array.isArray(answers[qIdx]) ? answers[qIdx] as string[] : [];
                      const selected = arr.includes(opt);
                      return (
                        <label key={oIdx} style={optionLabelStyle(selected, true)}>
                          <div style={checkboxOuterStyle(selected)}>
                            {selected && <span style={checkboxCheckStyle}>✓</span>}
                          </div>
                          <span style={{ flex: 1 }}>{opt}</span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMultiOption(qIdx, opt)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'text' && (
                  <textarea
                    value={answers[qIdx] as string || ''}
                    onChange={(e) => setAnswer(qIdx, e.target.value)}
                    placeholder="请输入您的反馈..."
                    rows={4}
                    style={textareaStyle}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...submitSurveyBtnStyle,
                opacity: submitting ? 0.65 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '提交中...' : '提交反馈 ✓'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const ThanksPage: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 50);
    const t2 = setTimeout(() => navigate('/'), THANK_YOU_DURATION + 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [navigate]);

  return (
    <div style={thanksPageStyle}>
      <div style={thanksCardStyle}>
        <div style={thanksAnimContainer(show)}>
          <div style={thanksAnimCircle(show)}>
            <svg width="100" height="100" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" style={thanksCircleStyle(show)} />
              <path fill="none" d="M14 27l7 7 16-16" style={thanksPathStyle(show)} />
            </svg>
          </div>
        </div>
        <h1 style={thanksTitleStyle(show)}>提交成功！</h1>
        <p style={thanksDescStyle(show)}>感谢您的宝贵反馈，您的意见对我们非常重要。</p>
        {shortId && (
          <div style={thanksSubStyle(show)}>
            问卷码：<code style={thanksCodeStyle}>{shortId}</code>
          </div>
        )}
        <div style={thanksFooterStyle(show)}>
          即将跳转至首页...
        </div>
      </div>
    </div>
  );
};

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={pageContainerStyle}>
      <div style={errorCardStyle}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>404</div>
        <div style={{ fontSize: 18, color: '#64748b', marginBottom: 24 }}>页面不存在</div>
        <button onClick={() => navigate('/')} style={primaryButtonStyle}>返回首页</button>
      </div>
    </div>
  );
};

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
    <Navbar />
    <main style={{ flex: 1 }}>
      {children}
    </main>
    <footer style={footerStyle}>
      <div>匿名反馈问卷系统 · 数据本地存储，安全可靠</div>
    </footer>
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
          -webkit-font-smoothing: antialiased;
          background-color: #f8fafc;
          color: #1e293b;
          margin: 0;
          padding: 0;
        }
        @media (max-width: 768px) {
          html { font-size: 14px; }
        }
        input:focus, textarea:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        button { font-family: inherit; }
        a { text-decoration: none; }
        @keyframes thanks-scale-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes thanks-draw-circle {
          0% { stroke-dashoffset: 166; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes thanks-draw-check {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const preloadRoutes = () => {
      setTimeout(() => {
        import('./components/StatsPanel');
        import('./components/SurveyForm');
      }, 800);
    };
    preloadRoutes();
  }, []);

  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<CreateSurveyPage />} />
        <Route path="/surveys" element={<SurveyListPage />} />
        <Route path="/stats/:id" element={<StatsPage />} />
        <Route path="/survey/:shortId" element={<SurveyTakePage />} />
        <Route path="/survey/:shortId/thanks" element={<ThanksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PageLayout>
  );
};

// ============ Style Helpers ============

const navbarStyle: React.CSSProperties = {
  background: '#1e293b',
  color: 'white',
  padding: '0 20px',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
};

const navbarInnerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
};

const logoStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  fontSize: 18,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
};

const hamburgerBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const hamburgerIconStyle = (open: boolean): React.CSSProperties => ({
  width: 24,
  height: 20,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  position: 'relative',
});

const mobileMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 60,
  left: -20,
  right: -20,
  background: '#1e293b',
  flexDirection: 'column',
  padding: '8px 0 12px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  display: 'flex',
  zIndex: 999,
};

const mobileNavItemStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  padding: '12px 24px',
  fontSize: 15,
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const desktopMenuStyle: React.CSSProperties = {
  display: 'flex',
  gap: 28,
  height: '100%',
  alignItems: 'center',
};

const navLinkWrapStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  fontWeight: 500,
  height: '100%',
  justifyContent: 'center',
  cursor: 'pointer',
};

const navLinkTextStyle: React.CSSProperties = {
  fontSize: 15,
};

const navUnderlineStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  height: 3,
  background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
  transition: 'width 0.3s ease',
  borderRadius: '3px 3px 0 0',
};

const pageContainerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '32px 20px 48px',
};

const pageHeaderStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto 28px',
  textAlign: 'left',
};

const pageTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 30,
  color: '#0f172a',
  fontWeight: 800,
  letterSpacing: '-0.02em',
};

const pageDescStyle: React.CSSProperties = {
  color: '#64748b',
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
};

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 24px',
  color: '#64748b',
  fontSize: 15,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 600,
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  textDecoration: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'white',
  color: '#475569',
  border: '2px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 500,
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
};

const successCardStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: '32px auto',
  background: '#ffffff',
  borderRadius: 16,
  padding: 48,
  textAlign: 'center',
  boxShadow: '0 4px 28px rgba(0,0,0,0.08)',
  border: '1px solid #f1f5f9',
};

const successCheckmarkContainerStyle: React.CSSProperties = {
  width: 100,
  height: 100,
  margin: '0 auto 28px',
  position: 'relative',
};

const successCheckmarkCircleStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'thanks-scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
};

const successCheckmarkSvgStyle: React.CSSProperties = {
  display: 'block',
};

const successCircleStyle: React.CSSProperties = {
  stroke: 'rgba(255,255,255,0.4)',
  strokeWidth: 2,
};

const successCheckStyle: React.CSSProperties = {
  stroke: '#ffffff',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeDasharray: 48,
  animation: 'thanks-draw-check 0.35s 0.15s ease-out both',
};

const successTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 28,
  color: '#0f172a',
  fontWeight: 800,
};

const successSubtitleStyle: React.CSSProperties = {
  color: '#64748b',
  marginBottom: 32,
  fontSize: 15,
  lineHeight: 1.7,
};

const linkBoxStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: 12,
  padding: 20,
  marginBottom: 28,
  textAlign: 'left',
  border: '1px solid #e2e8f0',
};

const linkBoxLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 10,
  fontWeight: 500,
};

const linkBoxRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'stretch',
};

const linkInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  border: '2px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  background: 'white',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  color: '#334155',
  minWidth: 0,
  outline: 'none',
  transition: 'all 0.2s ease',
};

const copyButtonStyle = (copied: boolean): React.CSSProperties => ({
  padding: '10px 18px',
  background: copied ? '#10b981' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

const successActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  background: 'white',
  padding: 20,
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: 24,
  border: '1px solid #f1f5f9',
};

const filterItemStyle: React.CSSProperties = {
  flex: '1 1 180px',
  minWidth: 150,
};

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#64748b',
  marginBottom: 6,
  fontWeight: 500,
};

const resetFilterBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: 'white',
  color: '#64748b',
  border: '2px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  height: 42,
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
};

const emptyCardStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '64px 24px',
  background: 'white',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid #f1f5f9',
};

const emptyLinkStyle: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 15,
  display: 'inline-block',
};

const surveyGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 20,
};

const surveyCardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 22,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid #f1f5f9',
  transition: 'all 0.2s ease',
  cursor: 'default',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const surveyCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
};

const surveyCardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 17,
  color: '#0f172a',
  fontWeight: 700,
  lineHeight: 1.4,
  flex: 1,
  wordBreak: 'break-word',
};

const surveyCardBadgeStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  flexShrink: 0,
};

const surveyCardMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  fontSize: 13,
  color: '#64748b',
};

const surveyShortIdStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  color: '#94a3b8',
};

const surveyCardBodyStyle: React.CSSProperties = {
  padding: '12px 0',
  borderTop: '1px solid #f1f5f9',
  borderBottom: '1px solid #f1f5f9',
};

const surveyCardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  flexWrap: 'wrap',
  marginTop: 'auto',
};

const cardLinkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  color: '#3b82f6',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const errorCardStyle: React.CSSProperties = {
  maxWidth: 500,
  margin: '48px auto',
  textAlign: 'center',
  padding: 48,
  background: 'white',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid #f1f5f9',
};

const takeSurveyCardStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '24px auto',
  background: 'white',
  borderRadius: 16,
  padding: 36,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid #f1f5f9',
};

const takeSurveyHeaderStyle: React.CSSProperties = {
  textAlign: 'center',
  paddingBottom: 24,
  borderBottom: '2px solid #f1f5f9',
  marginBottom: 28,
};

const takeSurveyTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  color: '#0f172a',
  fontWeight: 800,
  lineHeight: 1.3,
  marginBottom: 10,
};

const takeSurveyDescStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 14,
  fontWeight: 500,
};

const limitErrorStyle: React.CSSProperties = {
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  color: '#92400e',
  padding: '20px',
  borderRadius: 12,
  textAlign: 'center',
  marginBottom: 24,
  fontSize: 15,
  fontWeight: 500,
};

const questionCardStyle: React.CSSProperties = {
  background: '#fafbfc',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #f1f5f9',
};

const questionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const questionNumberStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  width: 28,
  height: 28,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 700,
  flexShrink: 0,
  marginTop: 2,
};

const questionTextStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 16,
  fontWeight: 600,
  color: '#0f172a',
  lineHeight: 1.6,
  minWidth: 0,
  wordBreak: 'break-word',
};

const requiredBadgeStyle: React.CSSProperties = {
  color: '#ef4444',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  fontSize: 12,
  padding: '3px 8px',
  borderRadius: 4,
  fontWeight: 600,
  flexShrink: 0,
};

const optionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const optionLabelStyle = (selected: boolean, _isCheckbox: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  background: selected ? 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)' : 'white',
  border: selected ? '2px solid #818cf8' : '2px solid #e2e8f0',
});

const radioOuterStyle = (selected: boolean): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  border: selected ? '2px solid #6366f1' : '2px solid #cbd5e1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.2s ease',
  background: selected ? 'white' : 'white',
});

const radioInnerStyle: React.CSSProperties = {
  width: 11,
  height: 11,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
};

const checkboxOuterStyle = (selected: boolean): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: selected ? '2px solid #6366f1' : '2px solid #cbd5e1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  background: selected ? 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' : 'white',
  transition: 'all 0.2s ease',
});

const checkboxCheckStyle: React.CSSProperties = {
  color: 'white',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 15,
  outline: 'none',
  transition: 'all 0.2s ease',
  background: 'white',
  resize: 'vertical',
  minHeight: 100,
  fontFamily: 'inherit',
  lineHeight: 1.6,
  boxSizing: 'border-box',
};

const submitSurveyBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 24px',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
  marginTop: 8,
};

const thanksPageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 60px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
};

const thanksCardStyle: React.CSSProperties = {
  maxWidth: 500,
  width: '100%',
  background: 'white',
  borderRadius: 20,
  padding: 56,
  textAlign: 'center',
  boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
};

const thanksAnimContainer = (show: boolean): React.CSSProperties => ({
  width: 120,
  height: 120,
  margin: '0 auto 32px',
  opacity: show ? 1 : 0,
  transform: show ? 'scale(1)' : 'scale(0.85)',
  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
});

const thanksAnimCircle = (_show: boolean): React.CSSProperties => ({
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 12px 32px rgba(16, 185, 129, 0.4)',
  animation: 'thanks-scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
});

const thanksCircleStyle = (show: boolean): React.CSSProperties => ({
  stroke: 'rgba(255,255,255,0.35)',
  strokeWidth: 2,
  strokeDasharray: 166,
  animation: show ? 'thanks-draw-circle 0.5s ease-out both' : 'none',
});

const thanksPathStyle = (show: boolean): React.CSSProperties => ({
  stroke: '#ffffff',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeDasharray: 48,
  animation: show ? 'thanks-draw-check 0.35s 0.15s ease-out both' : 'none',
});

const thanksTitleStyle = (show: boolean): React.CSSProperties => ({
  margin: '0 0 10px',
  fontSize: 30,
  color: '#0f172a',
  fontWeight: 800,
  opacity: show ? 1 : 0,
  transform: show ? 'translateY(0)' : 'translateY(10px)',
  transition: 'all 0.4s 0.3s ease',
});

const thanksDescStyle = (show: boolean): React.CSSProperties => ({
  color: '#64748b',
  fontSize: 16,
  lineHeight: 1.7,
  margin: '0 0 16px',
  opacity: show ? 1 : 0,
  transform: show ? 'translateY(0)' : 'translateY(10px)',
  transition: 'all 0.4s 0.4s ease',
});

const thanksSubStyle = (show: boolean): React.CSSProperties => ({
  marginBottom: 20,
  opacity: show ? 1 : 0,
  transform: show ? 'translateY(0)' : 'translateY(10px)',
  transition: 'all 0.4s 0.5s ease',
  color: '#475569',
  fontSize: 14,
});

const thanksCodeStyle: React.CSSProperties = {
  background: '#f1f5f9',
  padding: '4px 10px',
  borderRadius: 6,
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13,
  color: '#475569',
};

const thanksFooterStyle = (show: boolean): React.CSSProperties => ({
  marginTop: 24,
  paddingTop: 20,
  borderTop: '1px solid #f1f5f9',
  color: '#94a3b8',
  fontSize: 13,
  opacity: show ? 1 : 0,
  transition: 'all 0.4s 0.6s ease',
});

const footerStyle: React.CSSProperties = {
  background: '#ffffff',
  borderTop: '1px solid #e2e8f0',
  padding: '20px 24px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: 13,
};

// Object.assign styles for :hover effects via DOM event handlers
document.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  if (target.matches?.('button')) {
    if (target.style.background?.includes('gradient') || target.textContent?.includes('提交') || target.textContent?.includes('复制') || target.textContent?.includes('分析')) {
      if (!target.style.background?.includes('gradient')) return;
    }
  }
});

export default App;
