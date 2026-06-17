import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { DeviceDetail } from './pages/DeviceDetail';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';

/* App.tsx - 应用根组件
   调用关系：被 src/main.tsx 渲染
   路由结构：/overview 设备总览、/device/:id 设备详情、/profile 用户档案、/admin 管理面板
   数据流向：各页面通过 src/api/borrowApi.ts → 自定义 Hook → 后端 server/index.js
*/

export default function App() {
  return (
    <BrowserRouter>
      <div style={appShellStyle}>
        <Navbar />
        <main style={mainStyle}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/device/:id" element={<DeviceDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const appShellStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
};

const mainStyle: React.CSSProperties = {
  paddingTop: '0',
};
