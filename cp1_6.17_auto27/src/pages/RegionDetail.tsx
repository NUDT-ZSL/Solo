import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Droplets, BookOpen, Leaf, ClipboardList, Plus, Check, Camera } from 'lucide-react'
import { useGardenStore } from '@/store/gardenStore'
import { getHarvestCountdown, getWaterCooldown, formatCooldown, calculatePoints, getRegionStatus, getCropGrowthDays } from '@/utils/gardenLogic'
import WaterDrops from '@/components/WaterDrops'
import type { Member } from '@/types/garden'

const CROP_EMOJI: Record<string, string> = {
  番茄: '番茄🍅',
  黄瓜: '黄瓜🥒',
  胡萝卜: '胡萝卜🥕',
  生菜: '生菜🥬',
  茄子: '茄子🍆',
  辣椒: '辣椒🌶️',
}

const TASK_TYPES = ['除草', '施肥', '收割']

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  normal: { text: '生长中', color: 'bg-garden-normal text-garden-title' },
  nearHarvest: { text: '即将收获', color: 'bg-garden-nearHarvest text-yellow-800' },
  needsWater: { text: '需要浇水', color: 'bg-garden-needsWater text-red-800' },
}

export default function RegionDetail() {
  const { regionId } = useParams<{ regionId: string }>()
  const navigate = useNavigate()
  const user = useGardenStore((s) => s.user)
  const currentRegion = useGardenStore((s) => s.currentRegion)
  const members = useGardenStore((s) => s.members)
  const setCurrentRegion = useGardenStore((s) => s.setCurrentRegion)
  const setMembers = useGardenStore((s) => s.setMembers)
  const addPoints = useGardenStore((s) => s.addPoints)

  const [showAnimation, setShowAnimation] = useState(false)
  const [watering, setWatering] = useState(false)
  const [cooldownTick, setCooldownTick] = useState(0)

  const [logContent, setLogContent] = useState('')
  const [logPhoto, setLogPhoto] = useState<string | null>(null)
  const [logPhotoPreview, setLogPhotoPreview] = useState<string | null>(null)
  const [submittingLog, setSubmittingLog] = useState(false)

  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskType, setTaskType] = useState(TASK_TYPES[0])
  const [submittingTask, setSubmittingTask] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const fetchRegion = async () => {
    if (!regionId) return
    const res = await fetch(`/api/regions/${regionId}`)
    if (res.ok) {
      const data = await res.json()
      setCurrentRegion(data)
    }
  }

  useEffect(() => {
    fetchRegion()
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMembers(data))
      .catch(() => {})
  }, [regionId])

  useEffect(() => {
    const timer = setInterval(() => setCooldownTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const region = currentRegion
  if (!region) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-garden-bg">
        <p className="text-garden-text text-lg">加载中...</p>
      </div>
    )
  }

  const regionIndex = parseInt(region.id.replace('r', '')) - 1
  const daysAgo = [25, 40, 15, 28, 55, 35][regionIndex] ?? 30
  const plantDate = new Date(Date.now() - daysAgo * 86400000).toISOString()
  const growthDays = getCropGrowthDays(region.crop)
  const expectedHarvest = new Date(new Date(plantDate).getTime() + growthDays * 86400000).toISOString()
  const countdown = getHarvestCountdown(plantDate, region.crop)
  const status = getRegionStatus(region.lastWateredAt, expectedHarvest)
  const statusInfo = STATUS_LABEL[status]

  const cooldown = getWaterCooldown(region.lastWateredAt)
  const canWater = cooldown === 0 && !watering

  const handleWater = async () => {
    if (!user || !canWater) return
    setWatering(true)
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: region.id, userId: user.id }),
      })
      if (res.ok) {
        setShowAnimation(true)
        addPoints(calculatePoints('water'))
        await fetchRegion()
      }
    } finally {
      setWatering(false)
    }
  }

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setLogPhoto(dataUrl)
      setLogPhotoPreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitLog = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !logContent.trim()) return
    setSubmittingLog(true)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: region.id,
          authorId: user.id,
          content: logContent,
          photoUrl: logPhoto,
        }),
      })
      if (res.ok) {
        addPoints(calculatePoints('log'))
        setLogContent('')
        setLogPhoto(null)
        setLogPhotoPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await fetchRegion()
      }
    } finally {
      setSubmittingLog(false)
    }
  }

  const handleSubmitTask = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !taskAssignee) return
    setSubmittingTask(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: region.id,
          assigneeId: taskAssignee,
          type: taskType,
        }),
      })
      if (res.ok) {
        setTaskAssignee('')
        setTaskType(TASK_TYPES[0])
        await fetchRegion()
      }
    } finally {
      setSubmittingTask(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' })
    if (res.ok) {
      addPoints(calculatePoints('harvest'))
      await fetchRegion()
    }
  }

  void cooldownTick

  return (
    <div className="min-h-screen bg-garden-bg" style={{ paddingTop: 80 }}>
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-garden-text hover:text-garden-title transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        <h1 className="text-2xl font-bold text-garden-title mb-6">{region.name}</h1>

        {/* Crop Info */}
        <div
          className="bg-garden-card rounded-xl p-6 mb-6"
          style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="text-xl font-bold text-garden-title mb-3">
            {CROP_EMOJI[region.crop] ?? region.crop}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-garden-text text-sm mb-3">
            <span>种植日期：{new Date(plantDate).toLocaleDateString('zh-CN')}</span>
            <span>预计收获：{new Date(expectedHarvest).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-garden-text text-sm">
              {countdown.days > 0 || countdown.hours > 0
                ? `${countdown.days}天${countdown.hours}小时后收获`
                : '已到收获时间'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Watering */}
        <div className="relative mb-6">
          <button
            onClick={handleWater}
            disabled={!canWater}
            className="text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: canWater
                ? 'linear-gradient(135deg, #64B5F6, #1E88E5)'
                : '#90CAF9',
              ...(canWater
                ? {}
                : {}),
            }}
            onMouseEnter={(e) => {
              if (canWater) {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 0 8px rgba(66,165,245,0.6)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Droplets className="w-4 h-4" />
            {canWater ? '浇水' : formatCooldown(getWaterCooldown(region.lastWateredAt))}
          </button>
          <WaterDrops active={showAnimation} onComplete={() => setShowAnimation(false)} />
        </div>

        {/* Observation Logs */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-garden-title flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5" />
            观察日志
          </h2>

          <form onSubmit={handleSubmitLog} className="bg-garden-card rounded-xl p-4 mb-4" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}>
            <textarea
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              placeholder="记录观察内容..."
              rows={3}
              className="w-full px-3 py-2 border border-garden-border rounded-lg bg-garden-card text-garden-text outline-none transition-[border-color] duration-300 focus:border-garden-focus resize-none text-sm mb-3"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-sm text-garden-text cursor-pointer hover:text-garden-title transition-colors">
                <Camera className="w-4 h-4" />
                添加照片
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {logPhotoPreview && (
                <img
                  src={logPhotoPreview}
                  alt="预览"
                  className="w-[128px] h-[128px] object-cover rounded-lg"
                />
              )}
              <div className="flex-1" />
              <button
                type="submit"
                disabled={submittingLog || !logContent.trim()}
                className="px-4 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-transform duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #66BB6A, #43A047)' }}
              >
                <Plus className="w-4 h-4" />
                提交
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            {region.logs.map((log) => (
              <div
                key={log.id}
                className="bg-garden-card rounded-xl p-4 flex gap-4"
                style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
              >
                <div className="flex-shrink-0 w-[128px] h-[128px] rounded-lg overflow-hidden bg-garden-normal flex items-center justify-center">
                  {log.photoUrl ? (
                    <img src={log.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Leaf className="w-10 h-10 text-garden-title opacity-40" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <p className="text-garden-text text-sm whitespace-pre-wrap">{log.content}</p>
                  <div className="text-xs text-garden-text opacity-70 mt-2">
                    {log.authorName} · {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Assignment */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-garden-title flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5" />
            任务管理
          </h2>

          {user?.role === 'manager' && (
            <form
              onSubmit={handleSubmitTask}
              className="bg-garden-card rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3"
              style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-garden-text opacity-70">指派成员</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="px-3 py-2 border border-garden-border rounded-lg bg-garden-card text-garden-text outline-none text-sm"
                >
                  <option value="">选择成员</option>
                  {members.map((m: Member) => (
                    <option key={m.id} value={m.id}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-garden-text opacity-70">任务类型</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="px-3 py-2 border border-garden-border rounded-lg bg-garden-card text-garden-text outline-none text-sm"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submittingTask || !taskAssignee}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-transform duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #66BB6A, #43A047)' }}
              >
                <Plus className="w-4 h-4" />
                分配
              </button>
            </form>
          )}

          <div className="flex flex-col gap-3">
            {region.tasks.map((task) => (
              <div
                key={task.id}
                className="bg-garden-card rounded-xl p-4 flex items-center gap-4"
                style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
              >
                <div className="w-10 h-10 rounded-full bg-garden-normal flex items-center justify-center text-garden-title font-bold text-sm flex-shrink-0">
                  {task.assigneeName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-garden-text text-sm font-medium">
                    {task.assigneeName}
                    <span className="mx-2 opacity-40">·</span>
                    {task.type}
                  </div>
                  <div className="text-xs text-garden-text opacity-60">
                    {task.completed ? '已完成' : '待完成'}
                  </div>
                </div>
                {!task.completed && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="px-3 py-1 rounded-lg text-white text-xs font-medium flex items-center gap-1 transition-transform duration-200 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #66BB6A, #43A047)' }}
                  >
                    <Check className="w-3 h-3" />
                    完成
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
