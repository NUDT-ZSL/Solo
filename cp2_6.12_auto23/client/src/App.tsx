import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FlowEditor from './components/FlowEditor';
import ApprovalList from './pages/ApprovalList';
import ApprovalDetail from './pages/ApprovalDetail';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<FlowEditor />} />
          <Route path="/my-flows" element={<ApprovalList defaultTab="mine" />} />
          <Route path="/todos" element={<ApprovalList defaultTab="todo" />} />
          <Route path="/flows/:id" element={<ApprovalDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}
