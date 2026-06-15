import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './AuthPage.module.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, token } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const from = (location.state as { from?: string })?.from || '/dashboard';

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true });
    }
  }, [token, navigate, from]);

  const validateEmail = useCallback((value: string): string | undefined => {
    if (!value.trim()) return '请输入邮箱';
    if (!EMAIL_REGEX.test(value.trim())) return '邮箱格式不正确';
    return undefined;
  }, []);

  const validatePassword = useCallback((value: string): string | undefined => {
    if (!value) return '请输入密码';
    if (value.length < 8) return '密码至少8位';
    if (!PASSWORD_REGEX.test(value)) return '密码需包含字母和数字';
    return undefined;
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
    setGlobalError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
    setGlobalError('');
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const isFormValid = (): boolean => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({
      email: emailError,
      password: passwordError,
    });
    setTouched({ email: true, password: true });
    return !emailError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!isFormValid()) {
      return;
    }

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>欢迎回来</h1>
        <p className={styles.subtitle}>登录你的时光信件账户</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {globalError && <div className={styles.error}>{globalError}</div>}

          <div className={styles.field}>
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              placeholder="your@email.com"
              disabled={isLoading}
              autoComplete="email"
              className={errors.email ? styles.inputError : ''}
            />
            {errors.email && touched.email && (
              <span className={styles.fieldError}>{errors.email}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              placeholder="至少8位，包含字母和数字"
              disabled={isLoading}
              autoComplete="current-password"
              className={errors.password ? styles.inputError : ''}
            />
            {errors.password && touched.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className={styles.footer}>
          <span>还没有账户？</span>
          <Link to="/register" className={styles.link}>
            立即注册
          </Link>
        </div>

        <Link to="/" className={styles.backHome}>
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
