import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'
import ThemeToggle from '@/components/ThemeToggle'
import NotificationList from '@/components/NotificationList'
import { useAppStore } from '@/store'
import { useSocket } from '@/hooks/useSocket'

function AnimatedRoutes() {
  const location = useLocation()

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <HomePage />
            </motion.div>
          }
        />
        <Route
          path="/map/:id"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <EditorPage />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const { theme } = useAppStore()
  const addNotification = useAppStore((state) => state.addNotification)
  const { on } = useSocket()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const cleanup = on({
      onInvite: (data) => {
        addNotification({
          message: `邀请你协同编辑导图「${data.mapTitle}」`,
          type: 'invite'
        })
      }
    })
    return cleanup
  }, [on, addNotification])

  return (
    <div className="app-container">
      <ThemeToggle />
      <NotificationList />
      <AnimatedRoutes />
    </div>
  )
}

export default App
