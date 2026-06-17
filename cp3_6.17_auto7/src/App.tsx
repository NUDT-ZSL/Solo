import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from '@/pages/Home';
import AuthForm from '@/components/AuthForm';

function LoginPage() {
  const navigate = useNavigate();
  return (
    <AuthForm
      mode="login"
      onSuccess={() => navigate('/')}
      onSwitchMode={() => navigate('/register')}
    />
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  return (
    <AuthForm
      mode="register"
      onSuccess={() => navigate('/')}
      onSwitchMode={() => navigate('/login')}
    />
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
  );
}
