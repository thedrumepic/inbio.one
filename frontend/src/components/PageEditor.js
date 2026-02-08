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

// ===== STREAMING SERVICE ICONS =====
const StreamingIcons = {
  spotify: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  appleMusic: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FA243C">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.364-1.29.442-2.3 1.218-2.97 2.418a5.763 5.763 0 00-.33.762 9.964 9.964 0 00-.359 2.016c-.02.19-.033.38-.048.57v10.48c.015.18.028.362.048.542.093.9.25 1.785.584 2.632.39 1.004 1.007 1.842 1.86 2.488.608.46 1.293.76 2.035.96.603.163 1.22.245 1.846.282.144.01.287.02.43.024h12.053c.14-.006.28-.013.42-.02.63-.034 1.252-.113 1.86-.27.73-.19 1.4-.478 2--.904 1.12-.79 1.903-1.82 2.336-3.103a9.053 9.053 0 00.4-2.62V6.124zm-6.663 8.836c0 .418-.055.836-.196 1.233-.143.396-.333.773-.596 1.11a3.2 3.2 0 01-.95.868c-.376.232-.796.386-1.236.463a3.784 3.784 0 01-1.426-.006 3.094 3.094 0 01-1.196-.51 2.95 2.95 0 01-.876-.954 2.748 2.748 0 01-.383-1.27c-.015-.183-.015-.366.003-.55.03-.304.104-.6.227-.88.21-.48.52-.894.91-1.232.39-.34.84-.59 1.332-.75.33-.104.67-.163 1.014-.184.08-.004.16-.007.24-.007.12 0 .238.006.356.016v-3.97c0-.11-.04-.21-.107-.29a.394.394 0 00-.27-.13l-5.69-.003v7.63c0 .42-.056.84-.197 1.24a3.384 3.384 0 01-.595 1.1 3.2 3.2 0 01-.95.87 3.056 3.056 0 01-1.236.46 3.784 3.784 0 01-1.426-.01 3.094 3.094 0 01-1.196-.51 2.95 2.95 0 01-.876-.95 2.748 2.748 0 01-.383-1.27c-.015-.18-.015-.37.003-.55.03-.3.104-.6.227-.88.21-.48.52-.9.91-1.23.39-.34.84-.59 1.332-.75.33-.1.67-.16 1.014-.18.35-.02.698.01 1.04.08V6.62c0-.14.045-.27.126-.38a.464.464 0 01.33-.17l7.45-.97c.067-.01.133-.01.2-.006.206.012.398.103.54.252a.71.71 0 01.195.48v8.97z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  youtubeMusic: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF0000">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
    </svg>
  ),
  yandex: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFCC00">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm1.398 17.727H11.28V8.682c0-.102-.06-.162-.162-.162H9.27v-1.8h2.502c.96 0 1.626.666 1.626 1.626v9.381zm2.202-9.543c-.666 0-1.206-.54-1.206-1.206s.54-1.206 1.206-1.206 1.206.54 1.206 1.206-.54 1.206-1.206 1.206z"/>
    </svg>
  ),
  deezer: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FEAA2D">
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.595v3.027h5.189v-3.027H6.27zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zm-12.54 4.22v3.027h5.189v-3.027H6.27zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zm-18.54 0v3.027h5.19v-3.027H.27z"/>
    </svg>
  ),
  tidal: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000">
      <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004L8.008 8l4.004 4 4.004-4-4.004-4.004zM12.012 12l-4.004 4.004L12.012 20l4.004-4.004L12.012 12zm4-4.004L20.016 12l-4.004 4.004-4.004-4.004 4.004-4.004zM24 7.996l-4.004-4.004-4.004 4.004L20 12l4-4.004z"/>
    </svg>
  ),
  soundcloud: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF5500">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.107.094.061 0 .1-.037.107-.094l.2-1.308-.2-1.332c-.006-.057-.046-.094-.107-.094zm1.848-1.091c-.067 0-.116.046-.127.113l-.196 2.404.196 2.34c.011.066.06.113.127.113.064 0 .116-.047.127-.113l.227-2.34-.227-2.404c-.011-.066-.063-.113-.127-.113zm.953-.131c-.08 0-.139.058-.149.139l-.163 2.535.163 2.464c.01.08.069.139.149.139.078 0 .136-.059.15-.139l.184-2.464-.184-2.535c-.014-.08-.072-.139-.15-.139zm.984-.149c-.09 0-.159.068-.168.158l-.145 2.684.145 2.545c.009.09.078.158.168.158.087 0 .159-.068.166-.158l.166-2.545-.166-2.684c-.007-.09-.079-.158-.166-.158zm1.007-.091c-.103 0-.18.078-.189.181l-.119 2.775.119 2.607c.009.104.086.181.189.181.1 0 .178-.077.189-.181l.135-2.607-.135-2.775c-.011-.103-.089-.181-.189-.181zm1.047.017c-.115 0-.201.088-.208.203l-.098 2.757.098 2.609c.007.115.093.203.208.203.112 0 .199-.088.209-.203l.111-2.609-.111-2.757c-.01-.115-.097-.203-.209-.203zm1.048-.095c-.127 0-.221.099-.23.226l-.078 2.852.078 2.631c.009.127.103.226.23.226.125 0 .222-.099.229-.226l.09-2.631-.09-2.852c-.007-.127-.104-.226-.229-.226zm1.072-.064c-.139 0-.243.107-.248.248l-.062 2.916.062 2.654c.005.139.109.248.248.248.137 0 .242-.109.251-.248l.07-2.654-.07-2.916c-.009-.141-.114-.248-.251-.248zm.957-.254c-.152 0-.268.12-.275.271l-.041 3.17.041 2.652c.007.152.123.271.275.271.149 0 .267-.119.276-.271l.049-2.652-.049-3.17c-.009-.151-.127-.271-.276-.271zm3.063-.376a3.104 3.104 0 0 0-1.268.27c-.152 0-.27.119-.276.271l-.028 3.276.028 2.608c.006.15.124.27.276.27.15 0 .268-.12.277-.27l.031-2.608-.031-3.276c-.009-.152-.127-.271-.277-.271.34-.179.713-.27 1.096-.27 1.368 0 2.479 1.111 2.479 2.479v3.518c0 .152.119.271.271.271h5.594c1.255 0 2.272-1.02 2.272-2.272 0-2.503-2.032-4.536-4.536-4.536z"/>
    </svg>
  ),
  amazon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF9900">
      <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.496.106.063.09.083.2.053.33-.027.12-.1.24-.2.35-.186.2-.47.39-.84.58-.358.18-.763.37-1.22.57l-.065.028a28.16 28.16 0 0 1-2.57.913c-1.225.384-2.53.66-3.917.825-1.387.164-2.8.18-4.238.052a18.32 18.32 0 0 1-4.202-.78 19.39 19.39 0 0 1-4.095-1.757c-.376-.22-.56-.44-.54-.66.01-.12.06-.22.15-.3zm6.89-3.05c-.746-.09-1.322-.38-1.727-.87-.405-.49-.595-1.09-.57-1.81.014-.55.157-1.05.43-1.5.273-.45.636-.81 1.09-1.08.454-.27.93-.44 1.43-.53.5-.09 1.03-.09 1.59 0 .56.09 1.03.22 1.42.39.39.18.7.4.93.65.232.26.35.56.35.92l-.01.34c-.03.14-.06.24-.09.3-.04.05-.09.08-.16.1-.07.02-.18.02-.32-.02-.14-.03-.33-.1-.57-.18-.36-.13-.74-.25-1.14-.35-.4-.1-.78-.15-1.15-.14-.36.01-.68.07-.95.18-.27.11-.48.27-.63.48-.15.21-.22.46-.22.74 0 .27.08.51.23.7.15.2.37.37.65.51l1.2.48c.6.24 1.1.51 1.48.8.39.29.68.63.86 1.02.18.38.26.84.25 1.36-.02.55-.17 1.04-.45 1.49-.28.44-.65.8-1.12 1.08-.46.27-.97.45-1.52.53-.55.09-1.12.08-1.7-.02-.58-.1-1.1-.27-1.54-.5-.45-.24-.78-.53-1-.87-.22-.35-.3-.73-.24-1.14.03-.2.1-.37.21-.49.11-.12.24-.19.4-.21.15-.02.33.02.53.13.2.11.43.27.7.48.27.22.56.42.88.61.31.19.67.34 1.07.45.4.11.82.14 1.27.1.45-.04.84-.15 1.18-.33.34-.17.59-.41.76-.72.17-.31.24-.67.21-1.09-.03-.42-.18-.78-.45-1.08-.27-.29-.68-.55-1.23-.76l-1.22-.45c-.6-.22-1.06-.46-1.36-.72z"/>
    </svg>
  ),
  vk: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0077FF">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
    </svg>
  ),
  pandora: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#005483">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.549 14.684c-.596 1.754-1.965 2.691-3.891 2.691H8.424V6.633h3.347c1.801 0 3.107.69 3.691 2.15.326.813.469 1.75.469 2.935 0 1.209-.143 2.158-.382 2.966z"/>
    </svg>
  ),
};

// ===== STREAMING SERVICES CONFIG =====
const STREAMING_SERVICES = [
  { id: 'spotify', name: 'Spotify', color: '#1DB954' },
  { id: 'appleMusic', name: 'Apple Music', color: '#FA243C' },
  { id: 'youtubeMusic', name: 'YouTube Music', color: '#FF0000' },
  { id: 'yandex', name: 'Yandex Music', color: '#FFCC00' },
  { id: 'vk', name: 'VK Music', color: '#0077FF' },
  { id: 'deezer', name: 'Deezer', color: '#FEAA2D' },
  { id: 'tidal', name: 'Tidal', color: '#000000' },
  { id: 'soundcloud', name: 'SoundCloud', color: '#FF5500' },
  { id: 'amazon', name: 'Amazon Music', color: '#FF9900' },
  { id: 'pandora', name: 'Pandora', color: '#005483' },
];

const getServiceIcon = (serviceId) => {
  return StreamingIcons[serviceId] || StreamingIcons.spotify;
};

const getServiceName = (serviceId) => {
  const service = STREAMING_SERVICES.find(s => s.id === serviceId);
  return service?.name || serviceId;
};

const getServiceColor = (serviceId) => {
  const service = STREAMING_SERVICES.find(s => s.id === serviceId);
  return service?.color || '#888888';
};

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

  const linkBlocks = blocks.filter(b => b.block_type === 'link');
  const otherBlocks = blocks.filter(b => b.block_type !== 'link');

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

      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* LEVEL 1: BANNER */}
        <div className="relative">
          <div
            className="relative h-40 bg-[#171717] rounded-2xl cursor-pointer overflow-hidden border border-white/10"
            onClick={() => coverInputRef.current?.click()}
            data-testid="cover-upload"
          >
            {pageData.cover ? (
              <img src={pageData.cover} alt="Обложка" className="w-full h-full object-cover" />
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
              onClick={(e) => { e.stopPropagation(); handleRemoveImage('cover'); }}
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

        {/* LEVEL 2: PROFILE CARD */}
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full bg-[#171717] border-4 border-[#0a0a0a] cursor-pointer overflow-hidden"
                onClick={() => avatarInputRef.current?.click()}
                data-testid="avatar-upload"
              >
                {pageData.avatar ? (
                  <img src={pageData.avatar} alt="Аватар" className="w-full h-full object-cover" />
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
                  <LinkBlockItem key={block.id} block={block} onDelete={() => handleDeleteBlock(block.id)} />
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

        {/* LEVEL 3: ACTION BUTTONS */}
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

        {/* FOOTER */}
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

      {showLinkModal && (
        <LinkModal
          pageId={page.id}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => { setShowLinkModal(false); toast.success('Ссылка добавлена'); loadPageContent(); }}
        />
      )}

      {showBlockModal && (
        <BlockTypeModal
          onClose={() => setShowBlockModal(false)}
          onSelectType={(type) => {
            setShowBlockModal(false);
            if (type === 'text') setEditingBlock('new_text');
            else if (type === 'music') setEditingBlock('new_music');
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

  const isHighlighted = style === 'highlighted';

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Введите текст');
      return;
    }

    setSaving(true);
    try {
      const content = { style, title, text, url };
      
      if (block?.id) {
        const response = await api.updateBlock(block.id, { content });
        if (response.ok) { toast.success('Блок обновлён'); onSuccess(); }
      } else {
        const response = await api.createBlock({
          page_id: pageId,
          block_type: 'text',
          content,
          order: 0,
        });
        if (response.ok) { toast.success('Блок создан'); onSuccess(); }
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Текст</h1>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* LEVEL 1: Preview Card - wrapped like button */}
        <div className="bg-[#171717] rounded-2xl border border-white/10 p-3">
          <div className={`rounded-xl p-4 ${isHighlighted ? 'bg-[#f5f0e6] border-2 border-gray-300' : 'bg-transparent'}`}>
            {title && (
              <h3 className={`text-lg font-semibold mb-2 ${isHighlighted ? 'text-[#2a2a2a]' : 'text-white'}`}>
                {title}
              </h3>
            )}
            <p className={`text-sm leading-relaxed ${isHighlighted ? 'text-[#4a4a4a] italic' : 'text-gray-400'}`}>
              {text || 'Введите текст для предпросмотра...'}
            </p>
          </div>
        </div>

        {/* LEVEL 2: Settings Card */}
        <div className="bg-[#171717] rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setStyle('highlighted')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${style === 'highlighted' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              С выделением
            </button>
            <button
              onClick={() => setStyle('plain')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${style === 'plain' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Без выделения
            </button>
          </div>

          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30"
              placeholder="Заголовок (необязательно)"
            />
          </div>

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

          <div className="p-4 border-b border-white/10">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 resize-none min-h-[150px]"
              placeholder="Введите текст..."
            />
          </div>

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

        {/* LEVEL 3: Save Button */}
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
    if (!musicData?.title && platforms.filter(p => p.url).length === 0) {
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
        if (response.ok) { toast.success('Блок обновлён'); onSuccess(); }
      } else {
        const response = await api.createBlock({
          page_id: pageId,
          block_type: 'music',
          content,
          order: 0,
        });
        if (response.ok) { toast.success('Блок создан'); onSuccess(); }
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const visiblePlatforms = platforms.filter(p => p.visible !== false && p.url);
  const isLight = theme === 'light';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Музыкальный релиз</h1>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* LEVEL 1: Preview Card */}
        <div className={`rounded-2xl p-4 border ${isLight ? 'bg-white border-gray-200' : 'bg-[#171717] border-white/10'}`}>
          {musicData?.cover && showCover && (
            <img src={musicData.cover} alt={musicData.title} className="w-full aspect-square object-cover rounded-xl mb-4" />
          )}
          {musicData?.title ? (
            <>
              <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-black' : 'text-white'}`}>{musicData.title}</h3>
              <p className={`text-sm mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{musicData.artist}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Добавьте трек для предпросмотра...</p>
          )}
          
          {visiblePlatforms.length > 0 && (
            <div className="space-y-2">
              {visiblePlatforms.map((p, idx) => (
                <a
                  key={idx}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center">{getServiceIcon(p.platform)}</span>
                    <span className="font-medium">{getServiceName(p.platform)}</span>
                  </span>
                  <span className="text-sm opacity-60">Слушать →</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* LEVEL 2: Settings Card */}
        <div className="bg-[#171717] rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Тёмная тема
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${theme === 'light' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Светлая тема
            </button>
          </div>

          <div className="flex border-b border-white/10">
            <button
              onClick={() => setMethod('auto')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${method === 'auto' ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Автоматически
            </button>
            <button
              onClick={() => setMethod('manual')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${method === 'manual' ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Ручной ввод
            </button>
          </div>

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

          {method === 'manual' && (
            <div className="p-4 space-y-3 border-b border-white/10 max-h-[300px] overflow-y-auto">
              {STREAMING_SERVICES.map((service) => {
                const platform = platforms.find(p => p.platform === service.id);
                return (
                  <div key={service.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                      {getServiceIcon(service.id)}
                    </span>
                    <input
                      type="url"
                      value={platform?.url || ''}
                      onChange={(e) => updatePlatformUrl(service.id, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/30"
                      placeholder={`${service.name} URL`}
                    />
                    <button
                      onClick={() => togglePlatform(service.id)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
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

          <div className="p-4 flex items-center justify-between">
            <span className="text-white text-sm">Показывать обложку</span>
            <button
              onClick={() => setShowCover(!showCover)}
              className={`w-12 h-7 rounded-full transition-colors relative ${showCover ? 'bg-[#7dd3a8]' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${showCover ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* LEVEL 3: Save Button */}
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
        <a href={content.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors" onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </a>
        <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors">
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
    <div className="group flex items-center gap-3 p-3 bg-[#171717] border border-white/10 rounded-xl hover:border-white/20 transition-colors cursor-pointer" onClick={onEdit}>
      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white capitalize">{block_type === 'text' ? 'Текст' : block_type === 'music' ? 'Музыка' : block_type}</div>
        <div className="text-xs text-gray-500 truncate">{getPreview()}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all">
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
    if (!title || !url) { toast.error('Заполните все поля'); return; }

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    setLoading(true);
    try {
      const response = await api.createBlock({ page_id: pageId, block_type: 'link', content: { title, url: finalUrl }, order: 0 });
      if (response.ok) onSuccess();
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
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30" placeholder="Мой сайт" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">URL</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30" placeholder="example.com" disabled={loading} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors">Отмена</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">{loading ? 'Добавление...' : 'Добавить'}</button>
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
              <button key={type.id} onClick={() => onSelectType(type.id)} className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left border border-white/5 hover:border-white/10">
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

export { getServiceIcon, getServiceName, getServiceColor, STREAMING_SERVICES };
export default PageEditor;
