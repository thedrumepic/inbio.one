import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAuthToken } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(searchParams.get('username') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting registration to:', process.env.REACT_APP_BACKEND_URL);
      const response = await api.register({ email, password, username: username || null });
      
      console.log('Registration response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Registration successful, setting token');
        setAuthToken(data.access_token);
        toast.success('Регистрация успешна');
        navigate('/dashboard');
      } else {
        const error = await response.json();
        console.error('Registration failed:', error);
        toast.error(error.detail || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Ошибка соединения. Проверьте интернет и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" data-testid="register-page">
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
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Создать аккаунт</h1>
          <p className="text-gray-400 text-sm">Начните создавать свои страницы</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          {username && (
            <div className="card-glass">
              <div className="text-sm text-gray-400 mb-1">Ваше имя пользователя</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">biolink.app/</span>
                <span className="text-white font-medium">{username}</span>
              </div>
            </div>
          )}

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
              placeholder="Минимум 6 символов"
              disabled={loading}
              data-testid="password-input"
            />
          </div>

          {!username && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Имя пользователя (опционально)</label>
              <div className="flex items-center gap-2 input">
                <span className="text-gray-400 text-sm">biolink.app/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="flex-1 bg-transparent border-none outline-none"
                  placeholder="username"
                  disabled={loading}
                  data-testid="username-input"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            data-testid="submit-button"
          >
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="text-center">
          <span className="text-gray-400 text-sm">Уже есть аккаунт? </span>
          <button
            onClick={() => navigate('/login')}
            className="text-white hover:underline text-sm font-medium"
            data-testid="login-link"
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;