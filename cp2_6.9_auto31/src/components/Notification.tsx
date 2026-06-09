import { useState, useEffect } from 'react'

export interface NotificationOptions {
  type?: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

let notifyCallback: ((opts: NotificationOptions) => void = () => {}

export function notify(opts: NotificationOptions) {
  notifyCallback(opts)
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Array<{ id: number; opts: NotificationOptions>>([])

  useEffect(() => {
    notifyCallback = (opts) => {
      const id = Date.now() + Math.random()
      setNotifications((prev) => [...prev, { id, opts }])
      const duration = opts.duration || 2500
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, duration)
    }
  }, [])

  return null
}
