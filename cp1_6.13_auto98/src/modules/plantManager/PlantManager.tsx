import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import axios from 'axios'
import {
  Plant, Operation, PlantStatus, PlantLocation, OperationType,
  computeReminders, Reminder, getNextTasks, inferPlantStatus
} from '../reminderEngine/ReminderEngine'

export interface Photo {
  _id: string
  plantId: string
  dataUrl: string
  date: string
  createdAt: string
}

interface PlantState {
  plants: Plant[]
  operations: Operation[]
  reminders: Reminder[]
  loading: boolean
  error: string | null
}

interface PlantContextType extends PlantState {
  addPlant: (plant: Omit<Plant, '_id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>
  updatePlant: (id: string, data: Partial<Plant>) => Promise<void>
  deletePlant: (id: string) => Promise<void>
  addOperation: (op: Omit<Operation, '_id' | 'createdAt'>) => Promise<void>
  deleteOperation: (id: string) => Promise<void>
  getPlantPhotos: (plantId: string, page?: number) => Promise<{ photos: Photo[]; hasMore: boolean; total: number }>
  uploadPhoto: (plantId: string, dataUrl: string, date?: string) => Promise<void>
  deletePhoto: (plantId: string, photoId: string) => Promise<void>
  getNextTasksForPlant: (plant: Plant) => { type: 'water' | 'fertilize' | 'prune' | 'repot'; message: string; dueInDays: number }[]
  refreshData: () => Promise<void>
}

const PlantContext = createContext<PlantContextType | null>(null)

export const usePlantManager = () => {
  const ctx = useContext(PlantContext)
  if (!ctx) throw new Error('usePlantManager must be used within PlantManagerProvider')
  return ctx
}

const STATUS_COLORS: Record<PlantStatus, string> = {
  healthy: '#22c55e',
  thirsty: '#f97316',
  hungry: '#a855f7',
  sick: '#ef4444'
}

const LOCATION_LABELS: Record<PlantLocation, string> = {
  indoor: '室内',
  balcony: '阳台',
  garden: '花园'
}

const OPERATION_LABELS: Record<OperationType, string> = {
  water: '浇水',
  fertilize: '施肥',
  repot: '换盆',
  prune: '修剪',
  other: '其他'
}

export const getStatusColor = (status: PlantStatus) => STATUS_COLORS[status]
export const getLocationLabel = (loc: PlantLocation) => LOCATION_LABELS[loc]
export const getOperationLabel = (type: OperationType) => OPERATION_LABELS[type]

export const PlantManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlantState>({
    plants: [],
    operations: [],
    reminders: [],
    loading: true,
    error: null
  })

  const computeAndSetReminders = useCallback((plants: Plant[], operations: Operation[]) => {
    const reminders = computeReminders(plants, operations)
    setState(prev => ({ ...prev, reminders }))
  }, [])

  const refreshData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const [plantsRes, opsRes] = await Promise.all([
        axios.get<Plant[]>('/api/plants'),
        axios.get<Operation[]>('/api/operations')
      ])
      const plants = plantsRes.data
      const operations = opsRes.data
      const updatedPlants = plants.map(p => ({
        ...p,
        status: inferPlantStatus(p, operations) as PlantStatus
      }))
      const reminders = computeReminders(updatedPlants, operations)
      setState({
        plants: updatedPlants,
        operations,
        reminders,
        loading: false,
        error: null
      })
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || '加载数据失败'
      }))
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addPlant = useCallback(async (plant: Omit<Plant, '_id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      await axios.post('/api/plants', plant)
      await refreshData()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '添加植物失败')
    }
  }, [refreshData])

  const updatePlant = useCallback(async (id: string, data: Partial<Plant>) => {
    try {
      await axios.put(`/api/plants/${id}`, data)
      await refreshData()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '更新植物失败')
    }
  }, [refreshData])

  const deletePlant = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/plants/${id}`)
      await refreshData()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '删除植物失败')
    }
  }, [refreshData])

  const addOperation = useCallback(async (op: Omit<Operation, '_id' | 'createdAt'>) => {
    try {
      await axios.post('/api/operations', op)
      await refreshData()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '添加操作记录失败')
    }
  }, [refreshData])

  const deleteOperation = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/operations/${id}`)
      await refreshData()
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '删除操作记录失败')
    }
  }, [refreshData])

  const PAGE_SIZE = 8

  const getPlantPhotos = useCallback(async (plantId: string, page: number = 1) => {
    const pageSize = PAGE_SIZE
    const res = await axios.get(`/api/plants/${plantId}/photos`, {
      params: { page: page, limit: pageSize }
    })
    return {
      ...res.data,
      pageSize
    }
  }, [])

  const uploadPhoto = useCallback(async (plantId: string, dataUrl: string, date?: string) => {
    try {
      await axios.post(`/api/plants/${plantId}/photos`, { dataUrl, date })
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '上传照片失败')
    }
  }, [])

  const deletePhoto = useCallback(async (plantId: string, photoId: string) => {
    try {
      await axios.delete(`/api/plants/${plantId}/photos/${photoId}`)
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '删除照片失败')
    }
  }, [])

  const getNextTasksForPlant = useCallback((plant: Plant) => {
    return getNextTasks(plant, state.operations)
  }, [state.operations])

  const value: PlantContextType = {
    ...state,
    addPlant,
    updatePlant,
    deletePlant,
    addOperation,
    deleteOperation,
    getPlantPhotos,
    uploadPhoto,
    deletePhoto,
    getNextTasksForPlant,
    refreshData
  }

  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>
}

interface PlantCardProps {
  plant: Plant
  onClick?: () => void
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const { getNextTasksForPlant } = usePlantManager()
  const tasks = getNextTasksForPlant(plant)
  const borderColor = STATUS_COLORS[plant.status]

  const taskIcons: Record<string, string> = {
    water: '💧',
    fertilize: '🌿',
    prune: '✂️',
    repot: '🪴'
  }

  const ellipsisStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: 300,
        height: 380,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        borderTop: `4px solid ${borderColor}`,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{
        height: 180,
        background: plant.coverPhoto ? `url(${plant.coverPhoto}) center/cover no-repeat` : '#f0fdf4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 64,
        overflow: 'hidden'
      }}>
        {!plant.coverPhoto && '🌱'}
      </div>
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#334155',
            flex: 1,
            minWidth: 0,
            ...ellipsisStyle
          }}>{plant.name}</h3>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: '#f0fdf4',
            color: '#16a34a',
            flexShrink: 0
          }}>
            {LOCATION_LABELS[plant.location]}
          </span>
        </div>
        <p style={{
          margin: '0 0 4px 0',
          fontSize: 13,
          color: '#64748b',
          ...ellipsisStyle
        }}>{plant.variety}</p>
        <p style={{
          margin: 0,
          fontSize: 12,
          color: '#94a3b8',
          ...ellipsisStyle
        }}>
          种植于 {new Date(plant.plantDate).toLocaleDateString('zh-CN')}
        </p>
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {tasks.length > 0 ? (
            tasks.map((task, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: task.dueInDays <= 0 ? '#dc2626' : '#64748b',
                marginBottom: idx < tasks.length - 1 ? 4 : 0,
                overflow: 'hidden'
              }}>
                <span style={{ flexShrink: 0 }}>{taskIcons[task.type]}</span>
                <span style={ellipsisStyle}>{task.message}</span>
              </div>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', ...ellipsisStyle }}>暂无待办事项</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface TimelineProps {
  plantId: string
}

export const GrowthTimeline: React.FC<TimelineProps> = ({ plantId }) => {
  const { getPlantPhotos } = usePlantManager()
  const PAGE_SIZE = 8
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hasMorePhotos, setHasMorePhotos] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef<boolean>(false)
  const lastScrollHeightRef = useRef<number>(0)

  const loadEarlierPhotos = useCallback(async (pageToLoad: number): Promise<void> => {
    if (isLoadingRef.current || !hasMorePhotos) return
    isLoadingRef.current = true
    setIsLoading(true)

    const container = containerRef.current
    if (container) {
      lastScrollHeightRef.current = container.scrollHeight
    }

    try {
      const result = await getPlantPhotos(plantId, pageToLoad)
      if (result.photos && result.photos.length > 0) {
        setPhotos(prevPhotos => {
          const existingIds = new Set(prevPhotos.map(p => p._id))
          const newUniquePhotos = result.photos.filter(
            (p: Photo) => !existingIds.has(p._id)
          )
          return [...newUniquePhotos, ...prevPhotos]
        })
        setCurrentPage(pageToLoad)
      }
      setHasMorePhotos(Boolean(result.hasMore))
    } catch (err) {
      console.error('加载更早照片失败:', err)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
      if (container && lastScrollHeightRef.current > 0) {
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - lastScrollHeightRef.current + 30
        })
      }
    }
  }, [plantId, hasMorePhotos, getPlantPhotos])

  const loadFirstPage = useCallback(async (): Promise<void> => {
    isLoadingRef.current = true
    setIsLoading(true)
    try {
      const result = await getPlantPhotos(plantId, 1)
      setPhotos(result.photos || [])
      setCurrentPage(1)
      setHasMorePhotos(Boolean(result.hasMore))
    } catch (err) {
      console.error('加载照片失败:', err)
      setPhotos([])
      setHasMorePhotos(false)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [plantId, getPlantPhotos])

  useEffect(() => {
    setPhotos([])
    setCurrentPage(1)
    setHasMorePhotos(true)
    isLoadingRef.current = false
    loadFirstPage()
  }, [plantId, loadFirstPage])

  const handleScroll = useCallback((): void => {
    const container = containerRef.current
    if (!container || isLoadingRef.current || !hasMorePhotos) return

    const scrollTop = container.scrollTop
    const SCROLL_THRESHOLD = 50

    if (scrollTop <= SCROLL_THRESHOLD) {
      const nextPage = currentPage + 1
      loadEarlierPhotos(nextPage)
    }
  }, [currentPage, hasMorePhotos, loadEarlierPhotos])

  if (photos.length === 0 && !isLoading) {
    return (
      <div style={{
        padding: 48,
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
        <p>还没有上传照片，记录植物的成长吧！</p>
      </div>
    )
  }

  const sortedPhotos = [...photos].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        maxHeight: 500,
        overflowY: 'auto',
        padding: '24px 16px',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {isLoading && photos.length > 0 && (
        <div style={{ textAlign: 'center', padding: '0 0 16px 0' }}>
          <div style={{
            width: 280,
            height: 200,
            borderRadius: 8,
            background: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
            margin: '0 auto'
          }} />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>加载更早的照片 (每次{PAGE_SIZE}张)...</p>
        </div>
      )}
      {isLoading && photos.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: 280,
              height: 200,
              borderRadius: 8,
              background: '#e2e8f0',
              animation: 'pulse 1.5s ease-in-out infinite',
              margin: '0 auto'
            }} />
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 2,
          background: '#e2e8f0',
          transform: 'translateX(-50%)'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sortedPhotos.map((photo, idx) => (
            <div key={photo._id} style={{
              display: 'flex',
              justifyContent: idx % 2 === 0 ? 'flex-start' : 'flex-end',
              padding: '0 24px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 100,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#22c55e',
                border: '3px solid white',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 30,
                transform: 'translateX(-50%)',
                fontSize: 12,
                color: '#64748b',
                fontWeight: 500,
                background: 'white',
                padding: '2px 10px',
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                zIndex: 1,
                whiteSpace: 'nowrap'
              }}>
                {new Date(photo.date).toLocaleDateString('zh-CN')}
              </div>
              <div
                onMouseEnter={() => setHoveredPhoto(photo._id)}
                onMouseLeave={() => setHoveredPhoto(null)}
                style={{
                  width: hoveredPhoto === photo._id ? 320 : 280,
                  height: hoveredPhoto === photo._id ? 240 : 200,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  background: '#f0fdf4',
                  position: 'relative'
                }}
              >
                <img
                  src={photo.dataUrl}
                  alt="成长照片"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {hoveredPhoto === photo._id && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: 'white',
                    padding: '12px 12px 10px',
                    fontSize: 12
                  }}>
                    📅 {new Date(photo.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!hasMorePhotos && photos.length > 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 16 }}>
          已加载全部 {photos.length} 张照片 · 最早记录于 {new Date(sortedPhotos[0]?.date).toLocaleDateString('zh-CN')}
        </p>
      )}
    </div>
  )
}
