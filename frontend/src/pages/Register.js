import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAuthToken, isAuthenticated } from '../utils/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useGoogleLogin } from '@react-oauth/google';
import { ThemeToggle } from '../components/ThemeToggle';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(() => {
    return searchParams.get('username') || localStorage.getItem('onboarding_username') || '';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
    // If username in search, sync to localStorage just in case
    const searchUsername = searchParams.get('username');
    if (searchUsername) {
      localStorage.setItem('onboarding_username', searchUsername);
    }
  }, [navigate, searchParams]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await handleGoogleSuccess(tokenResponse);
    },
    onError: () => toast.error('Ошибка регистрации через Google'),
  });

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const response = await api.googleAuth({
        token: tokenResponse.access_token,
        username: username || localStorage.getItem('onboarding_username')
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.access_token);
        localStorage.removeItem('onboarding_username');

        if (data.is_new_user) {
          navigate(`/edit/${data.username}`, { state: { showWelcome: true } });
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(data.detail || 'Ошибка регистрации через Google');
      }
    } catch (error) {
      console.error('Google registration error:', error);
      toast.error('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

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
        localStorage.removeItem('onboarding_username');


        if (data.username) {
          navigate(`/edit/${data.username}`, { state: { showWelcome: true } });
        } else {
          navigate('/dashboard');
        }
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
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold">Создать аккаунт</h1>
          <p className="text-muted-foreground text-sm">Начните создавать свои страницы</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          {username && (
            <div className="card-glass">
              <div className="text-sm text-muted-foreground mb-1">Ваше имя пользователя</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">inbio.one/</span>
                <span className="text-foreground font-medium">{username}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email</label>
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
            <label className="text-sm text-muted-foreground">Пароль</label>
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



          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            data-testid="submit-button"
          >
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-gray-500">Или</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => googleLogin()}
            className="w-full py-3 px-4 bg-card border border-border hover:bg-secondary/50 text-foreground rounded-[12px] font-medium text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
          >
            <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full p-1 shadow-sm shrink-0">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            Продолжить с Google
          </button>
        </div>

        <div className="text-center space-y-4">
          <div>
            <span className="text-muted-foreground text-sm">Уже есть аккаунт? </span>
            <button
              onClick={() => navigate('/login')}
              className="text-foreground hover:underline text-sm font-medium"
              data-testid="login-link"
            >
              Войти
            </button>
          </div>
          <div className="flex justify-center pt-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;