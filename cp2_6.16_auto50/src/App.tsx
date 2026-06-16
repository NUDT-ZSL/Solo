import { useEffect } from 'react'
import Header from '@/components/Header'
import ActivityList from '@/components/ActivityList'
import ActivityForm from '@/components/ActivityForm'
import ConfirmModal from '@/components/ConfirmModal'
import LogHoursModal from '@/components/LogHoursModal'
import Toast from '@/components/Toast'
import { useStore } from '@/store/useStore'
import { Plus } from 'lucide-react'

export default function App() {
  const { fetchActivities, fetchUsers, showCreateForm, setShowCreateForm, users, setCurrentUser, currentUser, loading } = useStore()

  useEffect(() => {
    fetchUsers()
    fetchActivities()
  }, [])

  useEffect(() => {
    if (users.length > 0 && !currentUser) {
      setCurrentUser(users[1])
    }
  }, [users])

  return (
    <div className="min-h-screen" style={{ background: '#0a1929' }}>
      <Header />
      <main className="max-w-[720px] mx-auto px-6 pt-24 pb-20">
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
