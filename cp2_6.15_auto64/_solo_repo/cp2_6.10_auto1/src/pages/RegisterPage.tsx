import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './AuthPage.module.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, token } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const validateUsername = useCallback((value: string): string | undefined => {
    if (!value.trim()) return '请输入用户名';
    if (value.trim().length < 2) return '用户名至少2个字符';
    if (value.trim().length > 20) return '用户名最多20个字符';
    return undefined;
  }, []);

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

  const validateConfirmPassword = useCallback((value: string, passwordVal: string): string | undefined => {
    if (!value) return '请确认密码';
    if (value !== passwordVal) return '两次输入的密码不一致';
    return undefined;
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (touched.username) {
      setErrors((prev) => ({ ...prev, username: validateUsername(value) }));
    }
    setGlobalError('');
  };

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
    if (touched.confirmPassword && confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, value) }));
    }
    setGlobalError('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(value, password) }));
    }
    setGlobalError('');
  };

  const handleBlur = (field: 'username' | 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'username') {
      setErrors((prev) => ({ ...prev, username: validateUsername(username) }));
    } else if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    } else if (field === 'confirmPassword') {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, password) }));
    }
  };

  const isFormValid = (): boolean => {
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);
    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
    });
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    return !usernameError && !emailError && !passwordError && !confirmError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!isFormValid()) {
      return;
    }

    try {
      await register(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : '注册失败');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>创建账户</h1>
        <p className={styles.subtitle}>开启你的时光信件之旅</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {globalError && <div className={styles.error}>{globalError}</div>}

          <div className={styles.field}>
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => handleBlur('username')}
              placeholder="给自己起个名字"
              disabled={isLoading}
              autoComplete="username"
              className={errors.username ? styles.inputError : ''}
            />
            {errors.username && touched.username && (
              <span className={styles.fieldError}>{errors.username}</span>
            )}
          </div>

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
              autoComplete="new-password"
              className={errors.password ? styles.inputError : ''}
            />
            {errors.password && touched.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="再次输入密码"
              disabled={isLoading}
              autoComplete="new-password"
              className={errors.confirmPassword ? styles.inputError : ''}
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <span className={styles.fieldError}>{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注 册'}
          </button>
        </form>

        <div className={styles.footer}>
          <span>已有账户？</span>
          <Link to="/login" className={styles.link}>
            立即登录
          </Link>
        </div>

        <Link to="/" className={styles.backHome}>
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
