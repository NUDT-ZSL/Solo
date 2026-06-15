import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store'

function NotificationList() {
  const notifications = useAppStore((state) => state.notifications)

  return (
    <div className="notification-container">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            className="notification-item"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.3 }}
          >
            <p className="notification-message">{notification.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default NotificationList
