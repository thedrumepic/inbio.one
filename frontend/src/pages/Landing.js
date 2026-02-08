import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Введите имя пользователя');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error('Используйте только буквы, цифры, _ и -');
      return;
    }

    setChecking(true);
    try {
      const response = await api.checkUsername(username);
      const data = await response.json();
      
      if (data.available) {
        navigate(`/register?username=${username}`);
      } else {
        toast.error('Это имя уже занято');
      }
    } catch (error) {
      toast.error('Ошибка проверки имени');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" data-testid="landing-page">
      <div className="w-full max-w-md space-y-8 fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl mb-4">
            <LinkIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Ссылка в био для<br />любых целей
          </h1>
          <p className="text-gray-400 text-base">
            Создайте свою персональную страницу за минуту
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4" data-testid="username-form">
          <div className="card-glass">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">1bio.cc/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="flex-1 bg-transparent border-none outline-none text-white"
                disabled={checking}
                data-testid="username-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={checking}
            className="btn-primary w-full flex items-center justify-center gap-2"
            data-testid="create-button"
          >
            {checking ? 'Проверка...' : 'Создать'}
            {!checking && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center">
          <span className="text-gray-400 text-sm">Уже есть профиль? </span>
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

export default Landing;