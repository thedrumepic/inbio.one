import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Logo } from '../components/Logo';
import { Link2, Calendar, User, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PublicPage = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadPage();
  }, [username]);

  const loadPage = async () => {
    try {
      const response = await api.getPageByUsername(username);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error('Страница не найдена');
      }
    } catch (error) {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Страница не найдена</h2>
          <p className="text-gray-400">Проверьте URL и попробуйте снова</p>
        </div>
      </div>
    );
  }

  const { page, blocks, events, showcases } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20" data-testid="public-page">
      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        
        {/* ===== LEVEL 1: BANNER BLOCK ===== */}
        {page.cover ? (
          <div 
            className="h-40 rounded-2xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${page.cover})` }}
            data-testid="page-cover"
          />
        ) : (
          <div className="h-24 rounded-2xl bg-[#171717]" />
        )}

        {/* ===== LEVEL 2: PROFILE & LINKS CARD ===== */}
        <div className="relative">
          {/* Avatar */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            {page.avatar ? (
              <img
                src={page.avatar}
                alt={page.name}
                className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] object-cover"
                data-testid="page-avatar"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] bg-[#171717] flex items-center justify-center">
                <User className="w-10 h-10 text-gray-500" />
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="bg-[#171717] rounded-2xl border border-white/10 pt-16 pb-6 px-4">
            {/* Name & Bio */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-2" data-testid="page-name">{page.name}</h1>
              {page.bio && (
                <p className="text-gray-400 text-sm" data-testid="page-bio">{page.bio}</p>
              )}
            </div>

            {/* Tabs */}
            {(events.length > 0 || showcases.length > 0) && (
              <div className="flex justify-center gap-2 mb-6 overflow-x-auto" data-testid="tabs-container">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  data-testid="profile-tab"
                >
                  Профиль
                </button>
                {events.length > 0 && (
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'events' 
                        ? 'bg-white text-black' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    События
                  </button>
                )}
                {showcases.length > 0 && (
                  <button
                    onClick={() => setActiveTab('showcases')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'showcases' 
                        ? 'bg-white text-black' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Витрины
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div data-testid="blocks-container">
              {activeTab === 'profile' && (
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} />
                  ))}
                  {blocks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Пока нет контента
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-3">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {activeTab === 'showcases' && (
                <div className="grid grid-cols-2 gap-3">
                  {showcases.map((showcase) => (
                    <ShowcaseCard key={showcase.id} showcase={showcase} />
                  ))}
                </div>
              )}
            </div>
          </div>
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
      </div>
    </div>
  );
};

// ===== BLOCK RENDERER =====
const BlockRenderer = ({ block }) => {
  const { block_type, content } = block;

  // Link Block
  if (block_type === 'link') {
    return (
      <a
        href={content.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
        data-testid="link-block"
      >
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          {content.icon ? (
            <span className="text-lg">{content.icon}</span>
          ) : (
            <Link2 className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{content.title}</div>
          {content.subtitle && <div className="text-sm text-gray-500">{content.subtitle}</div>}
        </div>
        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
      </a>
    );
  }

  // Text Block - with style support
  if (block_type === 'text') {
    const style = content.style || 'plain';
    const isHighlighted = style === 'highlighted';
    
    // Clickable if has URL
    const Wrapper = content.url ? 'a' : 'div';
    const wrapperProps = content.url ? {
      href: content.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'block cursor-pointer'
    } : {};

    return (
      <Wrapper {...wrapperProps} data-testid="text-block">
        <div className={`rounded-xl p-4 transition-all ${
          isHighlighted 
            ? 'bg-[#f5f0e6] border border-[#e5dcc8]' 
            : 'bg-transparent'
        } ${content.url ? 'hover:opacity-90' : ''}`}>
          {content.title && (
            <h3 className={`text-lg font-semibold mb-2 ${
              isHighlighted ? 'text-[#2a2a2a]' : 'text-white'
            }`}>
              {content.title}
            </h3>
          )}
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isHighlighted ? 'text-[#4a4a4a] italic' : 'text-gray-400'
          }`}>
            {content.text}
          </p>
        </div>
      </Wrapper>
    );
  }

  // Music Block - with theme and platform support
  if (block_type === 'music') {
    const theme = content.theme || 'dark';
    const showCover = content.showCover !== false;
    const platforms = content.platforms || [];
    const isLight = theme === 'light';

    // Streaming service icons and colors
    const serviceConfig = {
      spotify: { name: 'Spotify', icon: '🎵', color: '#1DB954' },
      apple: { name: 'Apple Music', icon: '🍎', color: '#FA243C' },
      youtube: { name: 'YouTube Music', icon: '▶️', color: '#FF0000' },
      yandex: { name: 'Яндекс Музыка', icon: '🎧', color: '#FFCC00' },
      vk: { name: 'VK Музыка', icon: '💿', color: '#0077FF' },
      deezer: { name: 'Deezer', icon: '🎶', color: '#00C7F2' },
      tidal: { name: 'Tidal', icon: '🌊', color: '#000000' },
      soundcloud: { name: 'SoundCloud', icon: '☁️', color: '#FF5500' },
    };

    const visiblePlatforms = platforms.filter(p => p.visible !== false && p.url);

    return (
      <div 
        className={`rounded-xl overflow-hidden border ${
          isLight 
            ? 'bg-white border-gray-200' 
            : 'bg-[#1a1a1a] border-white/10'
        }`}
        data-testid="music-block"
      >
        {/* Cover Image */}
        {showCover && content.cover && (
          <div className="relative">
            <img 
              src={content.cover} 
              alt={content.title}
              className="w-full aspect-square object-cover"
            />
            {/* Gradient overlay for better text readability */}
            <div className={`absolute inset-0 bg-gradient-to-t ${
              isLight ? 'from-white/80' : 'from-black/60'
            } to-transparent`} />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Title & Artist */}
          {content.title && (
            <div className="mb-4">
              <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-black' : 'text-white'}`}>
                {content.title}
              </h3>
              {content.artist && (
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {content.artist}
                </p>
              )}
            </div>
          )}

          {/* Platform Links */}
          {visiblePlatforms.length > 0 && (
            <div className="space-y-2">
              {visiblePlatforms.map((platform, idx) => {
                const config = serviceConfig[platform.platform] || { 
                  name: platform.platform, 
                  icon: '🎵',
                  color: '#888888'
                };
                
                return (
                  <a
                    key={idx}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isLight 
                        ? 'bg-gray-100 hover:bg-gray-200 text-black' 
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        {config.icon}
                      </span>
                      <span className="font-medium">{config.name}</span>
                    </span>
                    <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      Слушать →
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// ===== EVENT CARD =====
const EventCard = ({ event }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    {event.cover && (
      <img
        src={event.cover}
        alt={event.title}
        className="w-full h-40 object-cover rounded-lg mb-4"
      />
    )}
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex flex-col items-center justify-center">
        <Calendar className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white mb-1">{event.title}</h3>
        <p className="text-sm text-gray-400 mb-1">{event.date}</p>
        {event.description && (
          <p className="text-sm text-gray-500 mb-2">{event.description}</p>
        )}
        {event.button_url && (
          <a
            href={event.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-white hover:text-gray-300 transition-colors"
          >
            {event.button_text}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  </div>
);

// ===== SHOWCASE CARD =====
const ShowcaseCard = ({ showcase }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
    {showcase.cover && (
      <img
        src={showcase.cover}
        alt={showcase.title}
        className="w-full aspect-square object-cover rounded-lg mb-3"
      />
    )}
    <h3 className="font-semibold text-white text-sm mb-1">{showcase.title}</h3>
    {showcase.price && (
      <p className="text-sm text-gray-400 mb-2">{showcase.price}</p>
    )}
    {showcase.button_url && (
      <a
        href={showcase.button_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2 text-center text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
      >
        {showcase.button_text}
      </a>
    )}
  </div>
);

export default PublicPage;
