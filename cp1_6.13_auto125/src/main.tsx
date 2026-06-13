import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

let ws: WebSocket | null = null

try {
  ws = new WebSocket('ws://localhost:3001')
  ws.onopen = () => {
    console.log('[EchoExplorer] WebSocket 连接已建立')
  }
  ws.onmessage = (event) => {
    console.log('[EchoExplorer] WebSocket 消息:', event.data)
  }
  ws.onerror = (err) => {
    console.log('[EchoExplorer] WebSocket 连接失败（多玩家功能暂不可用）')
  }
  ws.onclose = () => {
    console.log('[EchoExplorer] WebSocket 连接已关闭')
  }
} catch (e) {
  console.log('[EchoExplorer] WebSocket 初始化失败')
}

export { ws }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
