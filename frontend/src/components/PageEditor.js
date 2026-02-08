import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import {
  Trash2,
  Camera,
  Plus,
  X,
  Link2,
  Type,
  Music,
  GripVertical,
  ExternalLink,
} from 'lucide-react';

const PageEditor = ({ page, onClose }) => {
  const [pageData, setPageData] = useState({
    name: page.name,
    bio: page.bio || '',
    avatar: page.avatar,
    cover: page.cover,
  });
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

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

  const handleRemoveImage = (type) => {
    setPageData((prev) => ({ ...prev, [type]: null }));
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

  const handleDeleteBlock = async (blockId) => {
    if (window.confirm('Удалить этот блок?')) {
      try {
        await api.deleteBlock(blockId);
        toast.success('Блок удалён');
        loadPageContent();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  // Filter blocks by type
  const linkBlocks = blocks.filter(b => b.block_type === 'link');
  const otherBlocks = blocks.filter(b => b.block_type !== 'link');

  return (
    <div className="min-h-screen bg-neutral-100" data-testid="page-editor">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-neutral-900 font-semibold text-base hover:text-neutral-600 transition-colors"
            data-testid="page-username"
          >
            /{page.username}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-neutral-900 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
            data-testid="save-button"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[480px] mx-auto pb-8">
        {/* Cover Image Section */}
        <div className="relative">
          <div
            className="relative h-48 bg-neutral-200 cursor-pointer overflow-hidden"
            onClick={() => coverInputRef.current?.click()}
            data-testid="cover-upload"
          >
            {pageData.cover ? (
              <img
                src={pageData.cover}
                alt="Обложка"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <span className="text-sm text-neutral-500">Добавить обложку</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Delete cover button */}
          {pageData.cover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage('cover');
              }}
              className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
              data-testid="delete-cover"
            >
              <Trash2 className="w-4 h-4 text-neutral-600" />
            </button>
          )}
          
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files[0], 'cover')}
          />
        </div>

        {/* Avatar Section - Overlapping cover */}
        <div className="relative px-4">
          <div className="relative -mt-14 flex justify-center">
            <div className="relative">
              <div
                className="w-28 h-28 rounded-full bg-white border-4 border-white shadow-lg cursor-pointer overflow-hidden"
                onClick={() => avatarInputRef.current?.click()}
                data-testid="avatar-upload"
              >
                {pageData.avatar ? (
                  <img
                    src={pageData.avatar}
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-200 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
              </div>
              
              {/* Edit avatar button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-neutral-200 hover:bg-neutral-50 transition-colors"
                data-testid="edit-avatar"
              >
                <Camera className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
            
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files[0], 'avatar')}
            />
          </div>
        </div>

        {/* Profile Fields */}
        <div className="px-4 mt-6 space-y-4">
          {/* Name Input */}
          <div>
            <input
              type="text"
              value={pageData.name}
              onChange={(e) => setPageData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-colors"
              placeholder="Имя"
              data-testid="name-input"
            />
          </div>

          {/* Bio Textarea */}
          <div>
            <textarea
              value={pageData.bio}
              onChange={(e) => setPageData((prev) => ({ ...prev, bio: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 text-base placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 transition-colors resize-none min-h-[100px]"
              placeholder="Описание"
              data-testid="bio-input"
            />
          </div>
        </div>

        {/* Links Section */}
        <div className="px-4 mt-6">
          {/* Existing Links */}
          {linkBlocks.length > 0 && (
            <div className="space-y-2 mb-4">
              {linkBlocks.map((block) => (
                <LinkBlockItem
                  key={block.id}
                  block={block}
                  onDelete={() => handleDeleteBlock(block.id)}
                />
              ))}
            </div>
          )}

          {/* Add Links Button */}
          <button
            onClick={() => setShowLinkModal(true)}
            className="w-full py-4 bg-white border-2 border-dashed border-neutral-300 rounded-xl text-neutral-600 font-medium hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
            data-testid="add-link-button"
          >
            <Plus className="w-5 h-5" />
            Добавить ссылки
          </button>
        </div>

        {/* Other Blocks Section */}
        <div className="px-4 mt-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            {/* Existing Other Blocks */}
            {otherBlocks.length > 0 && (
              <div className="space-y-3 mb-4">
                {otherBlocks.map((block) => (
                  <OtherBlockItem
                    key={block.id}
                    block={block}
                    onDelete={() => handleDeleteBlock(block.id)}
                  />
                ))}
              </div>
            )}

            {/* Add New Block Button */}
            <button
              onClick={() => setShowBlockModal(true)}
              className="w-full py-4 bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-600 font-medium hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
              data-testid="add-block-button"
            >
              <Plus className="w-5 h-5" />
              Добавить новый блок
            </button>

            {/* Loading State */}
            {loadingBlocks && (
              <div className="py-4 text-center">
                <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto"></div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="px-4 mt-6">
          <p className="text-center text-sm text-neutral-400 leading-relaxed">
            Добавь блоки с текстом, картинками, кнопками или видео на YouTube.
            <br />
            Разделяй всё по смыслу разделителями.
          </p>
        </div>
      </main>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal
          pageId={page.id}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            toast.success('Ссылка добавлена');
            loadPageContent();
          }}
        />
      )}

      {/* Block Type Modal */}
      {showBlockModal && (
        <BlockTypeModal
          pageId={page.id}
          onClose={() => setShowBlockModal(false)}
          onSuccess={() => {
            setShowBlockModal(false);
            toast.success('Блок добавлен');
            loadPageContent();
          }}
        />
      )}
    </div>
  );
};

// Link Block Item Component
const LinkBlockItem = ({ block, onDelete }) => {
  const { content } = block;
  
  return (
    <div className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors">
      <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Link2 className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 truncate">{content.title}</div>
        <div className="text-xs text-neutral-400 truncate">{content.url}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        </a>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
      <GripVertical className="w-4 h-4 text-neutral-300 flex-shrink-0" />
    </div>
  );
};

// Other Block Item Component
const OtherBlockItem = ({ block, onDelete }) => {
  const { block_type, content } = block;
  
  const getIcon = () => {
    switch (block_type) {
      case 'text': return <Type className="w-4 h-4 text-neutral-500" />;
      case 'music': return <Music className="w-4 h-4 text-neutral-500" />;
      default: return <Type className="w-4 h-4 text-neutral-500" />;
    }
  };
  
  const getPreview = () => {
    switch (block_type) {
      case 'text': return content.text?.substring(0, 50) + (content.text?.length > 50 ? '...' : '');
      case 'music': return `${content.title} — ${content.artist}`;
      default: return 'Блок';
    }
  };
  
  return (
    <div className="group flex items-center gap-3 p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-neutral-200">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 capitalize">{block_type === 'text' ? 'Текст' : block_type === 'music' ? 'Музыка' : block_type}</div>
        <div className="text-xs text-neutral-400 truncate">{getPreview()}</div>
      </div>
      <button
        onClick={onDelete}
        className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
      <GripVertical className="w-4 h-4 text-neutral-300 flex-shrink-0" />
    </div>
  );
};

// Link Modal Component
const LinkModal = ({ pageId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !url) {
      toast.error('Заполните все поля');
      return;
    }

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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900">Добавить ссылку</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
              placeholder="Мой сайт"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
              placeholder="example.com"
              disabled={loading}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Block Type Modal Component
const BlockTypeModal = ({ pageId, onClose, onSuccess }) => {
  const [selectedType, setSelectedType] = useState(null);

  const blockTypes = [
    { id: 'text', label: 'Текст', icon: Type, description: 'Добавить текстовый блок' },
    { id: 'music', label: 'Музыка', icon: Music, description: 'Добавить трек с Spotify/Apple Music' },
  ];

  if (selectedType === 'text') {
    return <TextBlockModal pageId={pageId} onClose={onClose} onSuccess={onSuccess} />;
  }

  if (selectedType === 'music') {
    return <MusicBlockModal pageId={pageId} onClose={onClose} onSuccess={onSuccess} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900">Выберите тип блока</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <div className="space-y-2">
          {blockTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="w-full flex items-center gap-4 p-4 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors text-left"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200">
                  <Icon className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <div className="font-medium text-neutral-900">{type.label}</div>
                  <div className="text-sm text-neutral-500">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Text Block Modal
const TextBlockModal = ({ pageId, onClose, onSuccess }) => {
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900">Добавить текст</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 resize-none min-h-[120px]"
            placeholder="Ваш текст..."
            disabled={loading}
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Music Block Modal
const MusicBlockModal = ({ pageId, onClose, onSuccess }) => {
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900">Добавить музыку</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Spotify/Apple Music URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                placeholder="https://..."
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleResolve}
                disabled={loading}
                className="px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Найти'}
              </button>
            </div>
          </div>

          {musicData && (
            <div className="p-4 bg-neutral-50 rounded-xl">
              <div className="flex gap-3">
                {musicData.cover && (
                  <img src={musicData.cover} alt={musicData.title} className="w-14 h-14 rounded-lg object-cover" />
                )}
                <div>
                  <div className="font-medium text-neutral-900">{musicData.title}</div>
                  <div className="text-sm text-neutral-500">{musicData.artist}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {musicData.platforms?.length || 0} платформ
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading || !musicData} className="flex-1 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PageEditor;
