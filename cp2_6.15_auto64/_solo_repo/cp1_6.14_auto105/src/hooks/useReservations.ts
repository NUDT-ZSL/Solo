import { useState, useEffect, useCallback } from 'react'
import http from '../http'

export interface Reservation {
  id: string
  deviceId: string
  deviceName: string
  userId: string
  userName: string
  date: string
  timeSlot: string
  note: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
}

export function useReservations(userId: string) {
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMyReservations = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await http.get(`/reservations/user/${userId}`)
      if (res.data.success) {
        setMyReservations(res.data.data)
      }
    } catch {
      console.error('Failed to fetch reservations')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchPendingReservations = useCallback(async () => {
    try {
      const res = await http.get('/reservations/pending')
      if (res.data.success) {
        setPendingReservations(res.data.data)
      }
    } catch {
      console.error('Failed to fetch pending reservations')
    }
  }, [])

  const createReservation = useCallback(async (data: {
    deviceId: string
    userId: string
    userName: string
    date: string
    timeSlot: string
    note?: string
  }) => {
    const res = await http.post('/reservations', data)
    return res.data
  }, [])

  const cancelReservation = useCallback(async (id: string) => {
    await http.delete(`/reservations/${id}`)
    fetchMyReservations()
  }, [fetchMyReservations])

  const approveReservation = useCallback(async (id: string) => {
    await http.put(`/reservations/${id}/approve`)
    fetchPendingReservations()
    fetchMyReservations()
  }, [fetchPendingReservations, fetchMyReservations])

  const rejectReservation = useCallback(async (id: string) => {
    await http.put(`/reservations/${id}/reject`)
    fetchPendingReservations()
    fetchMyReservations()
  }, [fetchPendingReservations, fetchMyReservations])

  useEffect(() => {
    fetchMyReservations()
    fetchPendingReservations()
  }, [fetchMyReservations, fetchPendingReservations])

  return {
    myReservations,
    pendingReservations,
    loading,
    fetchMyReservations,
    fetchPendingReservations,
    createReservation,
    cancelReservation,
    approveReservation,
    rejectReservation
  }
}
