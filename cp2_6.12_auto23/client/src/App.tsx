import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div className="text-center text-xl py-20">欢迎使用审批系统</div>} />
          <Route path="/create" element={<div className="text-center text-xl py-20">创建审批 - Coming Soon</div>} />
          <Route path="/my-flows" element={<div className="text-center text-xl py-20">我的审批 - Coming Soon</div>} />
          <Route path="/admin" element={<div className="text-center text-xl py-20">管理员控制台 - Coming Soon</div>} />
          <Route path="/flows/:id" element={<div className="text-center text-xl py-20">审批详情 - Coming Soon</div>} />
          <Route path="/todos" element={<div className="text-center text-xl py-20">全部待办 - Coming Soon</div>} />
        </Route>
      </Routes>
    </Router>
  );
}
