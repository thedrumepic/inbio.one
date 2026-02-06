import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Link2,
  Type,
  Music,
  Save,
  Calendar,
  ShoppingBag,
} from 'lucide-react';

const PageEditor = ({ page, onClose }) => {
  const [pageData, setPageData] = useState({
    name: page.name,
    bio: page.bio || '',
    avatar: page.avatar,
    cover: page.cover,
  });
  const [blocks, setBlocks] = useState([]);
  const [events, setEvents] = useState([]);
  const [showcases, setShowcases] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    loadPageContent();
  }, [page.id]);

  const loadPageContent = async () => {
    try {
      const response = await api.getPageByUsername(page.username);
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks || []);
        setEvents(data.events || []);
        setShowcases(data.showcases || []);
      }
    } catch (error) {
      console.error('Error loading page content:', error);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;

    try {
      const response = await api.uploadImage(file);
      if (response.ok) {
        const data = await response.json();
        setPageData((prev) => ({ ...prev, [type]: data.url }));
        toast.success('Изображение загружено');
      }
    } catch (error) {
      toast.error('Ошибка загрузки');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.updatePage(page.id, pageData);
      if (response.ok) {
        toast.success('Изменения сохранены');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-20" data-testid="page-editor">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn-ghost flex items-center gap-2"
            data-testid="close-button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Назад</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-8"
            data-testid="save-button"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        {/* Cover */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm sm:text-base">Обложка</h3>
          <div
            className="relative h-32 sm:h-48 rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors overflow-hidden"
            onClick={() => coverInputRef.current?.click()}
            data-testid="cover-upload"
          >
            {pageData.cover ? (
              <img
                src={pageData.cover}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <Upload className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-400">Загрузить обложку</p>
              </div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files[0], 'cover')}
          />
        </div>

        {/* Profile */}
        <div className="card">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">Профиль</h3>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors overflow-hidden flex-shrink-0"
              onClick={() => avatarInputRef.current?.click()}
              data-testid="avatar-upload"
            >
              {pageData.avatar ? (
                <img
                  src={pageData.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files[0], 'avatar')}
            />

            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs sm:text-sm text-gray-400 mb-1 block">Имя</label>
                <input
                  type="text"
                  value={pageData.name}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input text-sm sm:text-base"
                  placeholder="Ваше имя"
                  data-testid="name-input"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-gray-400 mb-1 block">Описание</label>
            <textarea
              value={pageData.bio}
              onChange={(e) =>
                setPageData((prev) => ({ ...prev, bio: e.target.value }))
              }
              className="input min-h-[60px] sm:min-h-[80px] resize-none text-sm sm:text-base"
              placeholder="Расскажите о себе..."
              data-testid="bio-input"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            data-testid="profile-tab"
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            data-testid="events-tab"
          >
            События
          </button>
          <button
            onClick={() => setActiveTab('showcases')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'showcases'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            data-testid="showcases-tab"
          >
            Витрины
          </button>
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {blocks.length > 0 && (
              <div className="space-y-3 mb-4" data-testid="blocks-list">
                {blocks.map((block) => (
                  <BlockPreview
                    key={block.id}
                    block={block}
                    onDelete={async () => {
                      if (confirm('Удалить блок?')) {
                        try {
                          await api.deleteBlock(block.id);
                          toast.success('Блок удалён');
                          loadPageContent();
                        } catch (error) {
                          toast.error('Ошибка удаления');
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setShowBlockModal(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              data-testid="add-block-button"
            >
              <Plus className="w-4 h-4" />
              Добавить блок
            </button>
            {loadingBlocks && (
              <div className="text-center py-8">
                <div className="spinner mx-auto"></div>
              </div>
            )}
            {!loadingBlocks && blocks.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Блоки будут отображаться здесь
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {events.length > 0 && (
              <div className="space-y-3 mb-4">
                {events.map((event) => (
                  <div key={event.id} className="card flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-gray-400">{event.date}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('Удалить событие?')) {
                          try {
                            await api.deleteEvent(event.id);
                            toast.success('Событие удалено');
                            loadPageContent();
                          } catch (error) {
                            toast.error('Ошибка удаления');
                          }
                        }
                      }}
                      className="btn-ghost text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowEventModal(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              data-testid="add-event-button"
            >
              <Plus className="w-4 h-4" />
              Добавить событие
            </button>
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                События будут отображаться здесь
              </div>
            )}
          </div>
        )}

        {activeTab === 'showcases' && (
          <div className="space-y-4">
            {showcases.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {showcases.map((showcase) => (
                  <div key={showcase.id} className="card relative">
                    <button
                      onClick={async () => {
                        if (confirm('Удалить витрину?')) {
                          try {
                            await api.deleteShowcase(showcase.id);
                            toast.success('Витрина удалена');
                            loadPageContent();
                          } catch (error) {
                            toast.error('Ошибка удаления');
                          }
                        }
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {showcase.cover && (
                      <img src={showcase.cover} alt={showcase.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
                    )}
                    <h3 className="font-semibold text-sm">{showcase.title}</h3>
                    {showcase.price && <p className="text-xs text-gray-400">{showcase.price}</p>}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowShowcaseModal(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              data-testid="add-showcase-button"
            >
              <Plus className="w-4 h-4" />
              Добавить витрину
            </button>
            {showcases.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Витрины будут отображаться здесь
              </div>
            )}
          </div>
        )}
      </div>

      {showBlockModal && (
        <BlockModal
          pageId={page.id}
          onClose={() => setShowBlockModal(false)}
          onSuccess={() => {
            setShowBlockModal(false);
            toast.success('Блок добавлен');
            loadPageContent();
          }}
        />
      )}

      {showEventModal && (
        <EventModal
          pageId={page.id}
          onClose={() => setShowEventModal(false)}
          onSuccess={() => {
            setShowEventModal(false);
            toast.success('Событие добавлено');
            loadPageContent();
          }}
        />
      )}

      {showShowcaseModal && (
        <ShowcaseModal
          pageId={page.id}
          onClose={() => setShowShowcaseModal(false)}
          onSuccess={() => {
            setShowShowcaseModal(false);
            toast.success('Витрина добавлена');
            loadPageContent();
          }}
        />
      )}
    </div>
  );
};

const BlockModal = ({ pageId, onClose, onSuccess }) => {
  const [blockType, setBlockType] = useState('');

  const types = [
    { id: 'link', label: 'Ссылка', icon: Link2 },
    { id: 'text', label: 'Текст', icon: Type },
    { id: 'music', label: 'Музыка', icon: Music },
  ];

  if (!blockType) {
    return (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
        onClick={onClose}
      >
        <div
          className="card max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-6">Выберите тип блока</h2>
          <div className="space-y-2">
            {types.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setBlockType(type.id)}
                  className="w-full card hover:border-white/30 flex items-center gap-3 p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (blockType === 'link') {
    return <LinkBlockForm pageId={pageId} onClose={onClose} onSuccess={onSuccess} />;
  }
  if (blockType === 'text') {
    return <TextBlockForm pageId={pageId} onClose={onClose} onSuccess={onSuccess} />;
  }
  if (blockType === 'music') {
    return <MusicBlockForm pageId={pageId} onClose={onClose} onSuccess={onSuccess} />;
  }
};

const LinkBlockForm = ({ pageId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !url) {
      toast.error('Заполните все поля');
      return;
    }

    // Auto-add https:// if not present
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    try {
      const response = await api.createBlock({
        page_id: pageId,
        block_type: 'link',
        content: { title, url: finalUrl },
        order: 0,
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Добавить ссылку</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Мой сайт"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input"
              placeholder="example.com или https://example.com"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TextBlockForm = ({ pageId, onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) {
      toast.error('Введите текст');
      return;
    }

    setLoading(true);
    try {
      const response = await api.createBlock({
        page_id: pageId,
        block_type: 'text',
        content: { text },
        order: 0,
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Добавить текст</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input min-h-[120px] resize-none"
            placeholder="Ваш текст..."
            disabled={loading}
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MusicBlockForm = ({ pageId, onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [musicData, setMusicData] = useState(null);

  const handleResolve = async () => {
    if (!url) {
      toast.error('Введите URL');
      return;
    }

    setLoading(true);
    try {
      const response = await api.resolveMusic({ url, mode: 'auto' });
      const result = await response.json();

      if (result.success) {
        setMusicData(result.data);
        toast.success('Трек найден');
      } else {
        toast.error(result.error || 'Не удалось найти');
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!musicData) {
      toast.error('Сначала найдите трек');
      return;
    }

    setLoading(true);
    try {
      const response = await api.createBlock({
        page_id: pageId,
        block_type: 'music',
        content: musicData,
        order: 0,
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Добавить музыку</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Spotify/Apple Music URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input flex-1"
                placeholder="https://..."
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleResolve}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? '...' : 'Найти'}
              </button>
            </div>
          </div>

          {musicData && (
            <div className="card-glass p-4">
              <div className="flex gap-3">
                {musicData.cover && (
                  <img
                    src={musicData.cover}
                    alt={musicData.title}
                    className="w-16 h-16 rounded-lg"
                  />
                )}
                <div>
                  <div className="font-semibold">{musicData.title}</div>
                  <div className="text-sm text-gray-400">{musicData.artist}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {musicData.platforms?.length || 0} платформ
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !musicData}
              className="btn-primary flex-1"
            >
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EventModal = ({ pageId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Подробнее');
  const [buttonUrl, setButtonUrl] = useState('');
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const coverInputRef = useRef(null);

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      const response = await api.uploadImage(file);
      if (response.ok) {
        const data = await response.json();
        setCover(data.url);
        toast.success('Обложка загружена');
      }
    } catch (error) {
      toast.error('Ошибка загрузки обложки');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date) {
      toast.error('Заполните обязательные поля');
      return;
    }

    // Auto-add https:// to button URL if not present
    let finalButtonUrl = buttonUrl.trim();
    if (finalButtonUrl && !/^https?:\/\//i.test(finalButtonUrl)) {
      finalButtonUrl = 'https://' + finalButtonUrl;
    }

    setLoading(true);
    try {
      const response = await api.createEvent({
        page_id: pageId,
        title,
        date,
        description,
        cover,
        button_text: buttonText,
        button_url: finalButtonUrl,
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Добавить событие</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover upload */}
          <div
            className="relative h-32 rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors overflow-hidden"
            onClick={() => coverInputRef.current?.click()}
          >
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Загрузить обложку (опционально)</p>
              </div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files[0])}
          />
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Концерт"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Дата *</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              placeholder="15 февраля 2026"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px] resize-none"
              placeholder="Детали события..."
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Текст кнопки</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="input"
                placeholder="Подробнее"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">URL кнопки</label>
              <input
                type="text"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                className="input"
                placeholder="example.com"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ShowcaseModal = ({ pageId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [cover, setCover] = useState(null);
  const [buttonText, setButtonText] = useState('Купить');
  const [buttonUrl, setButtonUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const coverInputRef = useRef(null);

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      const response = await api.uploadImage(file);
      if (response.ok) {
        const data = await response.json();
        setCover(data.url);
        toast.success('Обложка загружена');
      }
    } catch (error) {
      toast.error('Ошибка загрузки обложки');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      toast.error('Укажите название');
      return;
    }

    // Auto-add https:// to button URL if not present
    let finalButtonUrl = buttonUrl.trim();
    if (finalButtonUrl && !/^https?:\/\//i.test(finalButtonUrl)) {
      finalButtonUrl = 'https://' + finalButtonUrl;
    }

    setLoading(true);
    try {
      const response = await api.createShowcase({
        page_id: pageId,
        title,
        cover,
        price,
        button_text: buttonText,
        button_url: finalButtonUrl,
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Добавить витрину</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover upload */}
          <div
            className="relative aspect-square rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors overflow-hidden"
            onClick={() => coverInputRef.current?.click()}
          >
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Загрузить обложку</p>
              </div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files[0])}
          />
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Название товара"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Цена</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input"
              placeholder="$19.99"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Текст кнопки</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="input"
                placeholder="Купить"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">URL кнопки</label>
              <input
                type="text"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                className="input"
                placeholder="example.com"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BlockPreview = ({ block, onDelete }) => {
  const { block_type, content } = block;

  if (block_type === 'link') {
    return (
      <div className="card flex items-center justify-between group" data-testid="block-preview">
        <div className="flex items-center gap-3 flex-1">
          <Link2 className="w-5 h-5 text-gray-400" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{content.title}</div>
            <div className="text-sm text-gray-400 truncate">{content.url}</div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost text-red-400 p-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (block_type === 'text') {
    return (
      <div className="card group" data-testid="block-preview">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Type className="w-5 h-5 text-gray-400 mt-1" />
            <p className="text-gray-300 flex-1">{content.text}</p>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost text-red-400 p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (block_type === 'music') {
    return (
      <div className="card group" data-testid="block-preview">
        <div className="flex gap-3">
          {content.cover && (
            <img src={content.cover} alt={content.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{content.title}</h3>
            <p className="text-sm text-gray-400 truncate">{content.artist}</p>
            <p className="text-xs text-gray-500 mt-1">
              {content.platforms?.length || 0} платформ
            </p>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost text-red-400 p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PageEditor;