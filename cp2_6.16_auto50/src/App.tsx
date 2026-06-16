import { useEffect } from 'react'
import Header from '@/components/Header'
import ActivityList from '@/components/ActivityList'
import ActivityForm from '@/components/ActivityForm'
import ConfirmModal from '@/components/ConfirmModal'
import LogHoursModal from '@/components/LogHoursModal'
import Toast from '@/components/Toast'
import { useStore } from '@/store/useStore'
import { Plus, RefreshCw } from 'lucide-react'

export default function App() {
  const {
    fetchActivities,
    fetchUsers,
    showCreateForm,
    setShowCreateForm,
    users,
    setCurrentUser,
    currentUser,
    loading,
    error,
    authToken,
    clearError,
  } = useStore()

  useEffect(() => {
    const init = async () => {
      const [usersSuccess] = await Promise.all([fetchUsers(), fetchActivities()])
      if (usersSuccess && !authToken) {
        const defaultUser = users.length > 1 ? users[1] : users[0]
        if (defaultUser) {
          await setCurrentUser(defaultUser)
        }
      }
    }
    init()
  }, [])

  const handleRetry = () => {
    clearError()
    fetchActivities()
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a1929' }}>
      <Header />
      <main className="max-w-[720px] mx-auto px-6 pt-24 pb-20">
        {error && (
          <div
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{ background: '#3e1a1a', border: '1px solid #ef5350' }}
          >
            <span className="text-red-300">{error}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-3 py-1 rounded text-sm"
              style={{ background: '#ef5350', color: '#fff' }}
            >
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        )}
        <ActivityList />
      </main>
      <button
        onClick={() => setShowCreateForm(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:rotate-45 transition-all duration-300 z-40"
        style={{ background: '#0d47a1' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#1565c0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#0d47a1')}
      >
        <Plus size={28} />
      </button>
      {showCreateForm && <ActivityForm />}
      <ConfirmModal />
      <LogHoursModal />
      <Toast />
    </div>
  )
}
