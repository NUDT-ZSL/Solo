import { useState } from 'react'
import PreviewCanvas from './components/PreviewCanvas'
import ControlPanel from './components/ControlPanel'
import { exportTokenToJSON } from './utils/tokenExport'
import { BASE_TOKEN, DEFAULT_USER_TOKEN, type DesignToken } from './types'
import './App.css'

export default function App() {
  const [userToken, setUserToken] = useState<DesignToken>(DEFAULT_USER_TOKEN)

  const handleTokenChange = (newToken: DesignToken) => {
    setUserToken(newToken)
  }

  const handleExport = () => {
    exportTokenToJSON(userToken)
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">设计令牌对比板</h1>
        <p className="app-subtitle">实时预览与对比组件参数，一键导出设计令牌</p>
      </div>
      <div className="app-body">
        <div className="canvas-wrap">
          <PreviewCanvas baseToken={BASE_TOKEN} userToken={userToken} />
        </div>
        <div className="panel-wrap">
          <ControlPanel token={userToken} onChange={handleTokenChange} />
          <div className="export-wrap">
            <button className="export-btn" onClick={handleExport}>
              导出 JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
