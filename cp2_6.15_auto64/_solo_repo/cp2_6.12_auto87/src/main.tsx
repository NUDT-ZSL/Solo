import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import App from './App'
import ExploreMap from './components/ExploreMap'
import TameScene from './components/TameScene'
import BattleScene from './components/BattleScene'
import StatusPanel from './components/StatusPanel'
import { useGameStore } from './store/gameStore'
import './index.css'

function GameLayout() {
  const scene = useGameStore((s) => s.scene)
  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-3 p-3">
      <motion.div
        key={scene}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 md:w-[70%] min-h-0 flex flex-col"
      >
        <AnimatePresence mode="wait">
          {scene === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0"
            >
              <ExploreMap />
            </motion.div>
          )}
          {scene === 'tame' && (
            <motion.div
              key="tame"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0"
            >
              <TameScene />
            </motion.div>
          )}
          {scene === 'battle' && (
            <motion.div
              key="battle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0"
            >
              <BattleScene />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="md:w-[30%] w-full flex-shrink-0 min-h-0">
        <StatusPanel />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<GameLayout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </App>
    </BrowserRouter>
  </StrictMode>,
)
