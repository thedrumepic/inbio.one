import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Logo } from './Logo';
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
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eraser,
  Eye,
  EyeOff,
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
  const [editingBlock, setEditingBlock] = useState(null);

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

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  // Filter blocks by type
  const linkBlocks = blocks.filter(b => b.block_type === 'link');
  const otherBlocks = blocks.filter(b => b.block_type !== 'link');

  // If editing a block, show the appropriate editor
  if (editingBlock) {
    if (editingBlock.block_type === 'text' || editingBlock === 'new_text') {
      return (
        <TextBlockEditor
          block={editingBlock === 'new_text' ? null : editingBlock}
          pageId={page.id}
          onClose={() => setEditingBlock(null)}
          onSuccess={() => {
            setEditingBlock(null);
            loadPageContent();
          }}
        />
      );
    }
    if (editingBlock.block_type === 'music' || editingBlock === 'new_music') {
      return (
        <MusicBlockEditor
          block={editingBlock === 'new_music' ? null : editingBlock}
          pageId={page.id}
          onClose={() => setEditingBlock(null)}
          onSuccess={() => {
            setEditingBlock(null);
            loadPageContent();
          }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]" data-testid="page-editor">
      {/* ===== FIXED HEADER ===== */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-white font-semibold text-base hover:text-gray-300 transition-colors flex items-center gap-2"
            data-testid="page-username"
          >
            <Logo size="sm" />
            <span className="text-gray-400">/</span>
            <span>{page.username}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            data-testid="save-button"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        
        {/* ===== LEVEL 1: BANNER BLOCK ===== */}
        <div className="relative">
          <div
            className="relative h-40 bg-[#171717] rounded-2xl cursor-pointer overflow-hidden border border-white/10"
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
                  <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <span className="text-sm text-gray-500">Добавить обложку</span>
                </div>
              </div>
            )}
          </div>
          
          {pageData.cover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage('cover');
              }}
              className="absolute top-3 right-3 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
              data-testid="delete-cover"
            >
              <Trash2 className="w-4 h-4 text-white" />
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

        {/* ===== LEVEL 2: PROFILE & LINKS CARD ===== */}
        <div className="relative">
          {/* Avatar */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full bg-[#171717] border-4 border-[#0a0a0a] cursor-pointer overflow-hidden"
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
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
                data-testid="edit-avatar"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
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

          {/* Profile Card */}
          <div className="bg-[#171717] rounded-2xl border border-white/10 pt-16 pb-6 px-4">
            <div className="mb-4">
              <input
                type="text"
                value={pageData.name}
                onChange={(e) => setPageData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder:text-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-colors"
                placeholder="Имя"
                data-testid="name-input"
              />
            </div>

            <div className="mb-4">
              <textarea
                value={pageData.bio}
                onChange={(e) => setPageData((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder:text-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-colors resize-none min-h-[80px]"
                placeholder="Описание"
                data-testid="bio-input"
              />
            </div>

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

            <button
              onClick={() => setShowLinkModal(true)}
              className="w-full py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-gray-400 font-medium hover:border-white/40 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              data-testid="add-link-button"
            >
              <Plus className="w-5 h-5" />
              Добавить ссылки
            </button>
          </div>
        </div>

        {/* ===== LEVEL 3: ACTION BUTTONS ===== */}
        <div className="space-y-3">
          {otherBlocks.length > 0 && (
            <div className="space-y-2">
              {otherBlocks.map((block) => (
                <OtherBlockItem
                  key={block.id}
                  block={block}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onEdit={() => handleEditBlock(block)}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setShowBlockModal(true)}
            className="w-full py-4 bg-[#171717] border border-white/10 rounded-2xl text-gray-400 font-medium hover:border-white/20 hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
            data-testid="add-block-button"
          >
            <Plus className="w-5 h-5" />
            Добавить новый блок
          </button>

          {loadingBlocks && (
            <div className="py-4 text-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="pt-8 pb-4">
          <a 
            href="https://1bio.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-gray-600 hover:text-gray-400 transition-colors"
          >
            <span className="text-xs">Powered by</span>
            <Logo size="xs" className="opacity-60" />
          </a>
        </div>
      </main>

      {/* Modals */}
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

      {showBlockModal && (
        <BlockTypeModal
          onClose={() => setShowBlockModal(false)}
          onSelectType={(type) => {
            setShowBlockModal(false);
            if (type === 'text') {
              setEditingBlock('new_text');
            } else if (type === 'music') {
              setEditingBlock('new_music');
            }
          }}
        />
      )}
    </div>
  );
};

// ===== TEXT BLOCK EDITOR =====
const TextBlockEditor = ({ block, pageId, onClose, onSuccess }) => {
  const [style, setStyle] = useState(block?.content?.style || 'highlighted');
  const [title, setTitle] = useState(block?.content?.title || '');
  const [text, setText] = useState(block?.content?.text || '');
  const [url, setUrl] = useState(block?.content?.url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Введите текст');
      return;
    }

    setSaving(true);
    try {
      const content = { style, title, text, url };
      
      if (block?.id) {
        // Update existing block
        const response = await api.updateBlock(block.id, { content });
        if (response.ok) {
          toast.success('Блок обновлён');
          onSuccess();
        }
      } else {
        // Create new block
        const response = await api.createBlock({
          page_id: pageId,
          block_type: 'text',
          content,
          order: 0,
        });
        if (response.ok) {
          toast.success('Блок создан');
          onSuccess();
        }
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Текст</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* LEVEL 1: Preview Card */}
        <div className={`rounded-2xl p-4 border ${style === 'highlighted' ? 'bg-[#f5f0e6] border-[#e5dcc8]' : 'bg-[#171717] border-white/10'}`}>
          {title && (
            <h3 className={`text-lg font-semibold mb-2 ${style === 'highlighted' ? 'text-[#2a2a2a]' : 'text-white'}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm leading-relaxed ${style === 'highlighted' ? 'text-[#4a4a4a] italic' : 'text-gray-400'}`}>
            {text || 'Введите текст для предпросмотра...'}
          </p>
        </div>

        {/* LEVEL 2: Settings Card */}
        <div className="bg-[#171717] rounded-2xl border border-white/10 overflow-hidden">
          {/* Style Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setStyle('highlighted')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                style === 'highlighted' 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              С выделением
            </button>
            <button
              onClick={() => setStyle('plain')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                style === 'plain' 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Без выделения
            </button>
          </div>

          {/* Title Input */}
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30"
              placeholder="Заголовок (необязательно)"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-white/10">
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Bold className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Italic className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Underline className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Strikethrough className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Link2 className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors">
              <Eraser className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Text Content */}
          <div className="p-4 border-b border-white/10">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 resize-none min-h-[150px]"
              placeholder="Введите текст..."
            />
          </div>

          {/* URL Input */}
          <div className="p-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30"
              placeholder="https://ссылка (необязательно)"
            />
          </div>
        </div>

        {/* LEVEL 3: Save Button (Separate) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#7dd3a8] text-black rounded-2xl font-semibold hover:bg-[#6bc497] transition-colors disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </main>
    </div>
  );
};

// ===== MUSIC BLOCK EDITOR =====
const MusicBlockEditor = ({ block, pageId, onClose, onSuccess }) => {
  const [theme, setTheme] = useState(block?.content?.theme || 'dark');
  const [method, setMethod] = useState('auto');
  const [showCover, setShowCover] = useState(block?.content?.showCover !== false);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicData, setMusicData] = useState(block?.content || null);
  const [platforms, setPlatforms] = useState(block?.content?.platforms || []);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);

  const streamingServices = [
    { id: 'spotify', name: 'Spotify', color: '#1DB954', icon: '🎵' },
    { id: 'apple', name: 'Apple Music', color: '#FA243C', icon: '🍎' },
    { id: 'youtube', name: 'YouTube Music', color: '#FF0000', icon: '▶️' },
    { id: 'yandex', name: 'Яндекс Музыка', color: '#FFCC00', icon: '🎧' },
    { id: 'vk', name: 'VK Музыка', color: '#0077FF', icon: '💿' },
    { id: 'deezer', name: 'Deezer', color: '#00C7F2', icon: '🎶' },
  ];

  const handleResolve = async () => {
    if (!musicUrl.trim()) {
      toast.error('Введите URL');
      return;
    }

    setResolving(true);
    try {
      const response = await api.resolveMusic({ url: musicUrl, mode: 'auto' });
      const result = await response.json();

      if (result.success) {
        setMusicData(result.data);
        setPlatforms(result.data.platforms || []);
        toast.success('Трек найден!');
      } else {
        toast.error(result.error || 'Не удалось найти трек');
      }
    } catch (error) {
      toast.error('Ошибка поиска');
    } finally {
      setResolving(false);
    }
  };

  const togglePlatform = (platformId) => {
    setPlatforms(prev => 
      prev.map(p => p.platform === platformId ? { ...p, visible: !p.visible } : p)
    );
  };

  const updatePlatformUrl = (platformId, url) => {
    setPlatforms(prev => {
      const exists = prev.find(p => p.platform === platformId);
      if (exists) {
        return prev.map(p => p.platform === platformId ? { ...p, url } : p);
      }
      return [...prev, { platform: platformId, url, visible: true }];
    });
  };

  const handleSave = async () => {
    if (!musicData?.title && platforms.length === 0) {
      toast.error('Добавьте хотя бы один трек');
      return;
    }

    setSaving(true);
    try {
      const content = {
        ...musicData,
        theme,
        showCover,
        platforms: platforms.filter(p => p.url),
      };
      
      if (block?.id) {
        const response = await api.updateBlock(block.id, { content });
        if (response.ok) {
          toast.success('Блок обновлён');
          onSuccess();
        }
      } else {
        const response = await api.createBlock({
          page_id: pageId,
          block_type: 'music',
          content,
          order: 0,
        });
        if (response.ok) {
          toast.success('Блок создан');
          onSuccess();
        }
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Музыкальный релиз</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* LEVEL 1: Preview Card */}
        <div className={`rounded-2xl p-4 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#171717] border-white/10'}`}>
          {musicData?.cover && showCover && (
            <img 
              src={musicData.cover} 
              alt={musicData.title}
              className="w-full aspect-square object-cover rounded-xl mb-4"
            />
          )}
          {musicData?.title ? (
            <>
              <h3 className={`text-lg font-semibold mb-1 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                {musicData.title}
              </h3>
              <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {musicData.artist}
              </p>
            </>
          ) : (
            <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
              Добавьте трек для предпросмотра...
            </p>
          )}
          
          {platforms.filter(p => p.visible !== false && p.url).length > 0 && (
            <div className="space-y-2">
              {platforms.filter(p => p.visible !== false && p.url).map((p, idx) => {
                const service = streamingServices.find(s => s.id === p.platform);
                return (
                  <a
                    key={idx}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      theme === 'light' 
                        ? 'bg-gray-100 hover:bg-gray-200 text-black' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">{service?.icon || '🎵'}</span>
                      <span className="font-medium">{service?.name || p.platform}</span>
                    </span>
                    <span className="text-sm opacity-60">Слушать</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* LEVEL 2: Settings Card */}
        <div className="bg-[#171717] rounded-2xl border border-white/10 overflow-hidden">
          {/* Theme Toggle */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                theme === 'dark' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Тёмная тема
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                theme === 'light' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Светлая тема
            </button>
          </div>

          {/* Method Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setMethod('auto')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                method === 'auto' ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Автоматически
            </button>
            <button
              onClick={() => setMethod('manual')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                method === 'manual' ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Ручной ввод
            </button>
          </div>

          {/* Auto Method */}
          {method === 'auto' && (
            <div className="p-4 border-b border-white/10">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30"
                  placeholder="Вставьте ссылку на трек..."
                />
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-4 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  {resolving ? '...' : 'Найти'}
                </button>
              </div>
            </div>
          )}

          {/* Manual Method - Platform Links */}
          {method === 'manual' && (
            <div className="p-4 space-y-3 border-b border-white/10">
              {streamingServices.map((service) => {
                const platform = platforms.find(p => p.platform === service.id);
                return (
                  <div key={service.id} className="flex items-center gap-3">
                    <span className="text-lg w-8">{service.icon}</span>
                    <input
                      type="url"
                      value={platform?.url || ''}
                      onChange={(e) => updatePlatformUrl(service.id, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/30"
                      placeholder={`${service.name} URL`}
                    />
                    <button
                      onClick={() => togglePlatform(service.id)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                        platform?.visible !== false ? 'bg-white/10 text-white' : 'text-gray-600'
                      }`}
                    >
                      {platform?.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show Cover Toggle */}
          <div className="p-4 flex items-center justify-between">
            <span className="text-white text-sm">Показывать обложку</span>
            <button
              onClick={() => setShowCover(!showCover)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                showCover ? 'bg-[#7dd3a8]' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                showCover ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* LEVEL 3: Save Button (Separate) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#7dd3a8] text-black rounded-2xl font-semibold hover:bg-[#6bc497] transition-colors disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </main>
    </div>
  );
};

// ===== HELPER COMPONENTS =====
const LinkBlockItem = ({ block, onDelete }) => {
  const { content } = block;
  
  return (
    <div className="group flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Link2 className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{content.title}</div>
        <div className="text-xs text-gray-500 truncate">{content.url}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </a>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
      <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
    </div>
  );
};

const OtherBlockItem = ({ block, onDelete, onEdit }) => {
  const { block_type, content } = block;
  
  const getIcon = () => {
    switch (block_type) {
      case 'text': return <Type className="w-4 h-4 text-gray-400" />;
      case 'music': return <Music className="w-4 h-4 text-gray-400" />;
      default: return <Type className="w-4 h-4 text-gray-400" />;
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
    <div 
      className="group flex items-center gap-3 p-3 bg-[#171717] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white capitalize">
          {block_type === 'text' ? 'Текст' : block_type === 'music' ? 'Музыка' : block_type}
        </div>
        <div className="text-xs text-gray-500 truncate">{getPreview()}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
      <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
    </div>
  );
};

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-[#171717] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Добавить ссылку</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
              placeholder="Мой сайт"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
              placeholder="example.com"
              disabled={loading}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BlockTypeModal = ({ onClose, onSelectType }) => {
  const blockTypes = [
    { id: 'text', label: 'Текст', icon: Type, description: 'Текстовый блок с форматированием' },
    { id: 'music', label: 'Музыка', icon: Music, description: 'Музыкальный релиз со ссылками' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-[#171717] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Выберите тип блока</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-2">
          {blockTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left border border-white/5 hover:border-white/10"
              >
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <div className="font-medium text-white">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PageEditor;
