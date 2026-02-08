import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login to:', process.env.REACT_APP_BACKEND_URL);
      const response = await api.login({ email, password });
      
      console.log('Login response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, setting token');
        setAuthToken(data.access_token);
        toast.success('Вход выполнен');
        navigate('/dashboard');
      } else {
        const error = await response.json();
        console.error('Login failed:', error);
        toast.error(error.detail || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Ошибка соединения. Проверьте интернет и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" data-testid="login-page">
      <div className="w-full max-w-md space-y-8 fade-in">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost flex items-center gap-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl mb-2">
            <LogIn className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Вход в аккаунт</h1>
          <p className="text-gray-400 text-sm">Войдите, чтобы управлять страницами</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
              disabled={loading}
              data-testid="email-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              disabled={loading}
              data-testid="password-input"
            />
          </div>

          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-gray-400 hover:text-white"
            data-testid="forgot-password"
          >
            Забыли пароль?
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            data-testid="submit-button"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="text-center">
          <span className="text-gray-400 text-sm">Нет аккаунта? </span>
          <button
            onClick={() => navigate('/')}
            className="text-white hover:underline text-sm font-medium"
            data-testid="register-link"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;