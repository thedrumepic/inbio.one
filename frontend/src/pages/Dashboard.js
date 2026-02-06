import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isAuthenticated, logout } from '../utils/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ExternalLink, BarChart, Settings as SettingsIcon, LogOut } from 'lucide-react';
import PageEditor from '../components/PageEditor';

const Dashboard = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await api.getPages();
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageId) => {
    if (!confirm('Удалить эту страницу?')) return;

    try {
      const response = await api.deletePage(pageId);
      if (response.ok) {
        toast.success('Страница удалена');
        loadPages();
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (editingPage) {
    return (
      <PageEditor
        page={editingPage}
        onClose={() => {
          setEditingPage(null);
          loadPages();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen p-6" data-testid="dashboard-page">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Мои ссылки</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="btn-ghost"
              data-testid="settings-button"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="btn-ghost"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pages List */}
        <div className="space-y-4">
          {pages.map((page) => (
            <div key={page.id} className="card" data-testid="page-card">
              <div className="flex items-center gap-4">
                {page.avatar ? (
                  <img
                    src={page.avatar}
                    alt={page.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{page.name}</h3>
                  <a
                    href={`/${page.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    biolink.app/{page.username}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toast.info('Аналитика скоро')}
                    className="btn-secondary"
                    data-testid="analytics-button"
                  >
                    <BarChart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingPage(page)}
                    className="btn-secondary"
                    data-testid="edit-button"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="btn-ghost text-red-400 hover:text-red-300"
                    data-testid="delete-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
          data-testid="create-page-button"
        >
          <Plus className="w-5 h-5" />
          Создать ещё
        </button>

        {pages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            У вас пока нет страниц
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreatePageModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPages();
          }}
        />
      )}
    </div>
  );
};

const CreatePageModal = ({ onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !name.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error('Используйте только буквы, цифры, _ и -');
      return;
    }

    setLoading(true);
    try {
      const checkResponse = await api.checkUsername(username);
      const checkData = await checkResponse.json();

      if (!checkData.available) {
        toast.error('Это имя уже занято');
        setLoading(false);
        return;
      }

      const response = await api.createPage({ username, name });
      if (response.ok) {
        const pageData = await response.json();
        toast.success('Страница создана');
        window.location.href = `/dashboard?edit=${pageData.id}`;
      }
    } catch (error) {
      toast.error('Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
      data-testid="create-modal"
    >
      <div
        className="card max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">Создать страницу</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Имя пользователя</label>
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

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ваше имя"
              disabled={loading}
              data-testid="name-input"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              data-testid="cancel-button"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
              data-testid="submit-button"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
