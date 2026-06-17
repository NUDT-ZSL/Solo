import { useState, useCallback } from 'react'
import { BorrowRecord } from '@/types'
import { submitBorrow } from '@/api/borrowApi'

interface UseBorrowReturn {
  loading: boolean
  error: string | null
  data: BorrowRecord | null
  borrow: (deviceId: string, userId: string) => Promise<void>
}

export function useBorrow(): UseBorrowReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BorrowRecord | null>(null)

  const borrow = useCallback(async (deviceId: string, userId: string) => {
    setLoading(true)
    setError(null)
    try {
      const record = await submitBorrow(deviceId, userId)
      setData(record)
    } catch (err: any) {
      setError(err.message || 'Borrow failed')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, data, borrow }
}
