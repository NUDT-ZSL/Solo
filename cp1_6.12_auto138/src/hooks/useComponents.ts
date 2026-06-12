import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ComponentMeta } from '@/types'

export function useComponents() {
  const { components, setComponents } = useAppStore()

  useEffect(() => {
    async function fetchComponents() {
      try {
        const res = await fetch('/api/components')
        const data = await res.json()
        setComponents(data.components as ComponentMeta[])
      } catch (err) {
        console.error('Failed to fetch components:', err)
      }
    }
    fetchComponents()
  }, [setComponents])

  return { components }
}
