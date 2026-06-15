import { useState, useEffect, useCallback } from 'react'
import { Activity, Signup } from './types'
import ActivityList from './components/ActivityList'
import SignupPanel from './components/SignupPanel'

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [signups, setSignups] = useState<Signup[]>([])
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activities')
      const data = await res.json()
      setActivities(data)
    } catch (e) {
      console.error('Failed to fetch activities', e)
    }
  }, [])

  const fetchSignups = useCallback(async (activityId: string) => {
    try {
      const res = await fetch(`/api/signups?activityId=${activityId}`)
      const data = await res.json()
      setSignups(data)
    } catch (e) {
      console.error('Failed to fetch signups', e)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    if (selectedActivityId) {
      fetchSignups(selectedActivityId)
    } else {
      setSignups([])
    }
  }, [selectedActivityId, fetchSignups])

  const handleSelectActivity = useCallback((id: string) => {
    setSelectedActivityId(id)
    setMobileView('detail')
  }, [])

  const handleAddSignup = useCallback(async (activityId: string, nickname: string, phone: string) => {
    const res = await fetch('/api/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, nickname, phone }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || '添加失败')
    }
    const { signup, activity } = await res.json()
    setSignups((prev) => [...prev, signup])
    setActivities((prev) => prev.map((a) => (a.id === activity.id ? activity : a)))
  }, [])

  const handleDeleteSignup = useCallback(async (signupId: string) => {
    const signup = signups.find((s) => s.id === signupId)
    if (!signup) return
    const res = await fetch(`/api/signups/${signupId}`, { method: 'DELETE' })
    if (!res.ok) return
    const { activity } = await res.json()
    setSignups((prev) => prev.filter((s) => s.id !== signupId))
    setActivities((prev) => prev.map((a) => (a.id === activity.id ? activity : a)))
  }, [signups])

  const handleToggleSupply = useCallback(async (signupId: string, supplyName: string) => {
    const signup = signups.find((s) => s.id === signupId)
    if (!signup || !selectedActivityId) return
    const newSupplies = signup.supplies.includes(supplyName)
      ? signup.supplies.filter((s) => s !== supplyName)
      : [...signup.supplies, supplyName]
    const res = await fetch(`/api/activities/${selectedActivityId}/supplies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupId, supplies: newSupplies }),
    })
    if (!res.ok) return
    const { signup: updatedSignup, activity } = await res.json()
    setSignups((prev) => prev.map((s) => (s.id === updatedSignup.id ? updatedSignup : s)))
    setActivities((prev) => prev.map((a) => (a.id === activity.id ? activity : a)))
  }, [signups, selectedActivityId])

  const selectedActivity = activities.find((a) => a.id === selectedActivityId) || null

  return (
    <div className="app-container">
      <div className={`panel-left ${mobileView === 'list' ? 'mobile-visible' : ''}`}>
        <div className="panel-left-header">
          <h1 className="app-title">🏔️ 户外活动管理</h1>
        </div>
        <ActivityList
          activities={activities}
          selectedActivityId={selectedActivityId}
          onSelect={handleSelectActivity}
        />
      </div>
      <div className="panel-divider" />
      <div className={`panel-right ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        <SignupPanel
          activity={selectedActivity}
          signups={signups}
          onAddSignup={handleAddSignup}
          onDeleteSignup={handleDeleteSignup}
          onToggleSupply={handleToggleSupply}
          onBack={() => setMobileView('list')}
        />
      </div>

      <div className="mobile-nav">
        <button
          className={`mobile-tab ${mobileView === 'list' ? 'active' : ''}`}
          onClick={() => setMobileView('list')}
        >
          活动列表
        </button>
        <button
          className={`mobile-tab ${mobileView === 'detail' ? 'active' : ''}`}
          onClick={() => setMobileView('detail')}
        >
          报名管理
        </button>
      </div>
    </div>
  )
}
