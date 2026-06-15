import { useState, type FC } from 'react'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import MoodSubmit from './components/MoodSubmit'
import Report from './components/Report'
import ToastContainer from './components/ToastContainer'

type Tab = 'submit' | 'report'

const App: FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('submit')

  return (
    <ToastProvider>
      <div className="app">
        <ToastContainer />
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="card">
          {activeTab === 'submit' ? <MoodSubmit /> : <Report />}
        </div>
      </div>
    </ToastProvider>
  )
}

export default App
