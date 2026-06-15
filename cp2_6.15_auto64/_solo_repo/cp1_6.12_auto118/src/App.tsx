import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import MemberPanel from './components/MemberPanel';
import CalendarView from './components/CalendarView';
import ExpenseSummary from './components/ExpenseSummary';
import type { Plan, Member, Schedule, PlanData } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'plan'>('home');
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [shareLink, setShareLink] = useState('');
  
  const [createName, setCreateName] = useState('');
  const [createStartDate, setCreateStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [createEndDate, setCreateEndDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [createCities, setCreateCities] = useState('');
  const [createMemberName, setCreateMemberName] = useState('');
  
  const [joinCode, setJoinCode] = useState('');
  const [joinMemberName, setJoinMemberName] = useState('');
  const [joinError, setJoinError] = useState('');
  
  const pollingRef = useRef<boolean>(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');
    const mode = urlParams.get('mode');
    
    if (planId) {
      if (mode === 'view') {
        setIsReadOnly(true);
      }
      const savedMemberId = localStorage.getItem(`member_${planId}`);
      if (savedMemberId) {
        setMemberId(savedMemberId);
      } else if (mode === 'view') {
        setMemberId(null);
      }
      loadPlanData(planId);
      setCurrentView('plan');
      setShareLink(`${window.location.origin}${window.location.pathname}?plan=${planId}&mode=view`);
    }
  }, []);

  const loadPlanData = async (planId: string) => {
    try {
      const response = await fetch(`/api/plans/${planId}`);
      if (!response.ok) throw new Error('Failed to load plan');
      const data = await response.json();
      setPlanData(data);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  useEffect(() => {
    if (currentView === 'plan' && planData?.plan.id) {
      startPolling(planData.plan.id);
    }
    return () => {
      pollingRef.current = false;
    };
  }, [currentView, planData?.plan.id]);

  const startPolling = async (planId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    
    while (pollingRef.current) {
      try {
        const response = await fetch(`/api/plans/${planId}/poll`);
        if (response.ok) {
          const data = await response.json();
          if (data.updated) {
            loadPlanData(planId);
          }
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleCreatePlan = async () => {
    if (!createName || !createStartDate || !createEndDate || !createCities || !createMemberName) {
      return;
    }
    
    try {
      const cities = createCities.split(',').map(c => c.trim()).filter(c => c);
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          startDate: createStartDate,
          endDate: createEndDate,
          cities,
          memberName: createMemberName
        })
      });
      
      if (!response.ok) throw new Error('Failed to create plan');
      
      const data = await response.json();
      setMemberId(data.memberId);
      localStorage.setItem(`member_${data.planId}`, data.memberId);
      
      const fullResponse = await fetch(`/api/plans/${data.planId}`);
      const fullData = await fullResponse.json();
      setPlanData(fullData);
      setCurrentView('plan');
      
      window.history.pushState({}, '', `?plan=${data.planId}`);
      setShareLink(`${window.location.origin}${window.location.pathname}?plan=${data.planId}&mode=view`);
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  const handleJoinPlan = async () => {
    if (!joinCode || !joinMemberName) return;
    
    try {
      setJoinError('');
      const codeResponse = await fetch(`/api/plans/code/${joinCode.toUpperCase()}`);
      if (!codeResponse.ok) {
        setJoinError('邀请码无效');
        return;
      }
      const codeData = await codeResponse.json();
      
      const joinResponse = await fetch(`/api/plans/${codeData.planId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberName: joinMemberName })
      });
      
      if (!joinResponse.ok) throw new Error('Failed to join plan');
      
      const joinData = await joinResponse.json();
      setMemberId(joinData.memberId);
      localStorage.setItem(`member_${codeData.planId}`, joinData.memberId);
      
      const fullResponse = await fetch(`/api/plans/${codeData.planId}`);
      const fullData = await fullResponse.json();
      setPlanData(fullData);
      setCurrentView('plan');
      setIsReadOnly(false);
      
      window.history.pushState({}, '', `?plan=${codeData.planId}`);
      setShareLink(`${window.location.origin}${window.location.pathname}?plan=${codeData.planId}&mode=view`);
    } catch (error) {
      setJoinError('加入失败，请重试');
      console.error('Error joining plan:', error);
    }
  };

  const handleAddSchedule = async (schedule: Partial<Schedule>) => {
    if (!planData || !memberId || isReadOnly) return;
    
    try {
      const response = await fetch(`/api/plans/${planData.plan.id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          memberId
        })
      });
      
      if (!response.ok) throw new Error('Failed to add schedule');
      loadPlanData(planData.plan.id);
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const handleUpdateSchedule = async (scheduleId: string, updates: Partial<Schedule>) => {
    if (!planData || isReadOnly) return;
    
    try {
      const response = await fetch(`/api/plans/${planData.plan.id}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update schedule');
      loadPlanData(planData.plan.id);
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!planData || isReadOnly) return;
    
    try {
      const response = await fetch(`/api/plans/${planData.plan.id}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete schedule');
      loadPlanData(planData.plan.id);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const handleBack = () => {
    setCurrentView('home');
    setPlanData(null);
    setMemberId(null);
    setIsReadOnly(false);
    pollingRef.current = false;
    window.history.pushState({}, '', window.location.pathname);
  };

  if (currentView === 'home') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
              ✈️ 旅行规划助手
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
              多人协作规划行程，实时同步，智能记账
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div className="card" style={{ animation: 'fadeIn 0.5s ease' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: 'var(--primary)' }}>创建新旅行</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>旅行名称</label>
                  <input
                    type="text"
                    placeholder="例如：日本七日游"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>开始日期</label>
                    <input
                      type="date"
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>结束日期</label>
                    <input
                      type="date"
                      value={createEndDate}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>目标城市（逗号分隔）</label>
                  <input
                    type="text"
                    placeholder="东京, 大阪, 京都"
                    value={createCities}
                    onChange={(e) => setCreateCities(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>你的名字</label>
                  <input
                    type="text"
                    placeholder="输入你的昵称"
                    value={createMemberName}
                    onChange={(e) => setCreateMemberName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <button className="btn-primary" onClick={handleCreatePlan} style={{ marginTop: '8px' }}>
                  创建旅行计划
                </button>
              </div>
            </div>

            <div className="card" style={{ animation: 'fadeIn 0.5s ease 0.2s both' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: 'var(--secondary)' }}>加入旅行</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>邀请码</label>
                  <input
                    type="text"
                    placeholder="输入6位邀请码"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    style={{ width: '100%', letterSpacing: '2px', textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>你的名字</label>
                  <input
                    type="text"
                    placeholder="输入你的昵称"
                    value={joinMemberName}
                    onChange={(e) => setJoinMemberName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                {joinError && (
                  <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{joinError}</p>
                )}
                <button className="btn-secondary" onClick={handleJoinPlan} style={{ marginTop: '8px' }}>
                  加入旅行计划
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="card member-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <div>
          <button className="btn-ghost" onClick={handleBack} style={{ marginBottom: '12px', padding: '6px 0' }}>
            ← 返回首页
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{planData.plan.name}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {dayjs(planData.plan.start_date).format('MM/DD')} - {dayjs(planData.plan.end_date).format('MM/DD')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            📍 {planData.plan.cities.join(' · ')}
          </p>
        </div>

        <MemberPanel members={planData.members} currentMemberId={memberId} />

        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>邀请码</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              letterSpacing: '3px',
              fontSize: '18px',
              flex: 1,
              textAlign: 'center'
            }}>
              {planData.plan.invite_code}
            </div>
          </div>
          <button
            className="btn-ghost"
            onClick={handleCopyShareLink}
            style={{ width: '100%', marginTop: '10px', fontSize: '13px' }}
          >
            📋 复制分享链接
          </button>
        </div>

        {isReadOnly && (
          <div style={{
            background: '#FFF3CD',
            color: '#856404',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            👁️ 只读模式
          </div>
        )}
      </div>

      <CalendarView
        schedules={planData.schedules}
        members={planData.members}
        startDate={planData.plan.start_date}
        endDate={planData.plan.end_date}
        onAddSchedule={handleAddSchedule}
        onUpdateSchedule={handleUpdateSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        readOnly={isReadOnly}
        currentMemberId={memberId}
      />

      <ExpenseSummary
        summary={planData.summary}
        members={planData.members}
        startDate={planData.plan.start_date}
        endDate={planData.plan.end_date}
      />
    </div>
  );
}

export default App;
