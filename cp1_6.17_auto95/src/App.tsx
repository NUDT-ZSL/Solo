import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { useStore } from './store'

export default function App() {
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  useEffect(() => {
    const handleResize = () => {
      const shouldCollapse = window.innerWidth < 768
      if (shouldCollapse !== sidebarCollapsed) {
        toggleSidebar()
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarCollapsed, toggleSidebar])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? 0 : 240,
          marginTop: sidebarCollapsed ? 64 : 0,
          padding: 28,
          transition: 'margin-left 0.3s ease, margin-top 0.3s ease',
          minWidth: 0,
        }}
      >
        <Dashboard />
      </main>
    </div>
  )
}
