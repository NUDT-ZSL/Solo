import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  Pet,
  Task,
  NotificationSettings,
  getPets,
  getTasks,
  addPet as apiAddPet,
  updatePet as apiUpdatePet,
  deletePet as apiDeletePet,
  addTask as apiAddTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  getNotificationSettings,
  updateNotificationSettings as apiUpdateNotificationSettings,
  seedData,
} from '../api'

interface PetContextType {
  pets: Pet[]
  tasks: Task[]
  currentPetId: string | null
  notificationSettings: NotificationSettings | null
  loading: boolean
  setCurrentPetId: (id: string | null) => void
  fetchData: () => Promise<void>
  addPet: (pet: Omit<Pet, '_id' | 'createdAt'>) => Promise<Pet>
  updatePet: (id: string, pet: Partial<Pet>) => Promise<void>
  deletePet: (id: string) => Promise<void>
  addTask: (task: Omit<Task, '_id' | 'createdAt' | 'completed'>) => Promise<Task>
  updateTask: (id: string, task: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>
  getCurrentPetTasks: () => Task[]
}

const PetContext = createContext<PetContextType | undefined>(undefined)

export const PetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pets, setPets] = useState<Pet[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentPetId, setCurrentPetId] = useState<string | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [fetchedPets, fetchedTasks, settings] = await Promise.all([
        getPets(),
        getTasks(),
        getNotificationSettings(),
      ])
      setPets(fetchedPets)
      setTasks(fetchedTasks)
      setNotificationSettings(settings)
      if (!currentPetId && fetchedPets.length > 0) {
        setCurrentPetId(fetchedPets[0]._id || null)
      }
      if (fetchedPets.length === 0) {
        try {
          await seedData()
          const [newPets, newTasks] = await Promise.all([getPets(), getTasks()])
          setPets(newPets)
          setTasks(newTasks)
          if (newPets.length > 0) {
            setCurrentPetId(newPets[0]._id || null)
          }
        } catch {}
      }
    } catch (err) {
      console.error('获取数据失败:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPetId])

  useEffect(() => {
    fetchData()
  }, [])

  const addPet = async (pet: Omit<Pet, '_id' | 'createdAt'>): Promise<Pet> => {
    const newPet = await apiAddPet(pet)
    setPets((prev) => [newPet, ...prev])
    if (!currentPetId) {
      setCurrentPetId(newPet._id || null)
    }
    return newPet
  }

  const updatePet = async (id: string, pet: Partial<Pet>) => {
    await apiUpdatePet(id, pet)
    setPets((prev) => prev.map((p) => (p._id === id ? { ...p, ...pet } : p)))
  }

  const deletePet = async (id: string) => {
    await apiDeletePet(id)
    setPets((prev) => prev.filter((p) => p._id !== id))
    setTasks((prev) => prev.filter((t) => t.petId !== id))
    if (currentPetId === id) {
      const remaining = pets.filter((p) => p._id !== id)
      setCurrentPetId(remaining.length > 0 ? remaining[0]._id || null : null)
    }
  }

  const addTask = async (task: Omit<Task, '_id' | 'createdAt' | 'completed'>): Promise<Task> => {
    const newTask = await apiAddTask(task)
    setTasks((prev) => [...prev, newTask])
    return newTask
  }

  const updateTask = async (id: string, task: Partial<Task>) => {
    await apiUpdateTask(id, task)
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...task } : t)))
  }

  const deleteTask = async (id: string) => {
    await apiDeleteTask(id)
    setTasks((prev) => prev.filter((t) => t._id !== id))
  }

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    const updated = await apiUpdateNotificationSettings(settings)
    setNotificationSettings(updated)
  }

  const getCurrentPetTasks = useCallback(() => {
    if (!currentPetId) return []
    return tasks.filter((t) => t.petId === currentPetId)
  }, [tasks, currentPetId])

  return (
    <PetContext.Provider
      value={{
        pets,
        tasks,
        currentPetId,
        notificationSettings,
        loading,
        setCurrentPetId,
        fetchData,
        addPet,
        updatePet,
        deletePet,
        addTask,
        updateTask,
        deleteTask,
        updateNotificationSettings,
        getCurrentPetTasks,
      }}
    >
      {children}
    </PetContext.Provider>
  )
}

export const usePetContext = (): PetContextType => {
  const context = useContext(PetContext)
  if (!context) {
    throw new Error('usePetContext must be used within a PetProvider')
  }
  return context
}
