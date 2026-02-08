import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Logo } from '../components/Logo';
import { Link2, Calendar, User, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// ===== STREAMING SERVICE ICONS =====
const StreamingIcons = {
  spotify: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  appleMusic: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FA243C">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.364-1.29.442-2.3 1.218-2.97 2.418a5.763 5.763 0 00-.33.762 9.964 9.964 0 00-.359 2.016c-.02.19-.033.38-.048.57v10.48c.015.18.028.362.048.542.093.9.25 1.785.584 2.632.39 1.004 1.007 1.842 1.86 2.488.608.46 1.293.76 2.035.96.603.163 1.22.245 1.846.282.144.01.287.02.43.024h12.053c.14-.006.28-.013.42-.02.63-.034 1.252-.113 1.86-.27.73-.19 1.4-.478 2-.904 1.12-.79 1.903-1.82 2.336-3.103a9.053 9.053 0 00.4-2.62V6.124zm-6.663 8.836c0 .418-.055.836-.196 1.233-.143.396-.333.773-.596 1.11a3.2 3.2 0 01-.95.868c-.376.232-.796.386-1.236.463a3.784 3.784 0 01-1.426-.006 3.094 3.094 0 01-1.196-.51 2.95 2.95 0 01-.876-.954 2.748 2.748 0 01-.383-1.27c-.015-.183-.015-.366.003-.55.03-.304.104-.6.227-.88.21-.48.52-.894.91-1.232.39-.34.84-.59 1.332-.75.33-.104.67-.163 1.014-.184.08-.004.16-.007.24-.007.12 0 .238.006.356.016v-3.97c0-.11-.04-.21-.107-.29a.394.394 0 00-.27-.13l-5.69-.003v7.63c0 .42-.056.84-.197 1.24a3.384 3.384 0 01-.595 1.1 3.2 3.2 0 01-.95.87 3.056 3.056 0 01-1.236.46 3.784 3.784 0 01-1.426-.01 3.094 3.094 0 01-1.196-.51 2.95 2.95 0 01-.876-.95 2.748 2.748 0 01-.383-1.27c-.015-.18-.015-.37.003-.55.03-.3.104-.6.227-.88.21-.48.52-.9.91-1.23.39-.34.84-.59 1.332-.75.33-.1.67-.16 1.014-.18.35-.02.698.01 1.04.08V6.62c0-.14.045-.27.126-.38a.464.464 0 01.33-.17l7.45-.97c.067-.01.133-.01.2-.006.206.012.398.103.54.252a.71.71 0 01.195.48v8.97z"/>
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
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.107.094.061 0 .1-.037.107-.094l.2-1.308-.2-1.332c-.006-.057-.046-.094-.107-.094zm1.848-1.091c-.067 0-.116.046-.127.113l-.196 2.404.196 2.34c.011.066.06.113.127.113.064 0 .116-.047.127-.113l.227-2.34-.227-2.404c-.011-.066-.063-.113-.127-.113zm.953-.131c-.08 0-.139.058-.149.139l-.163 2.535.163 2.464c.01.08.069.139.149.139.078 0 .136-.059.15-.139l.184-2.464-.184-2.535c-.014-.08-.072-.139-.15-.139zm.984-.149c-.09 0-.159.068-.168.158l-.145 2.684.145 2.545c.009.09.078.158.168.158.087 0 .159-.068.166-.158l.166-2.545-.166-2.684c-.007-.09-.079-.158-.166-.158z"/>
    </svg>
  ),
  amazon: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FF9900">
      <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.496.106.063.09.083.2.053.33-.027.12-.1.24-.2.35-.186.2-.47.39-.84.58-.358.18-.763.37-1.22.57l-.065.028a28.16 28.16 0 0 1-2.57.913c-1.225.384-2.53.66-3.917.825-1.387.164-2.8.18-4.238.052a18.32 18.32 0 0 1-4.202-.78 19.39 19.39 0 0 1-4.095-1.757c-.376-.22-.56-.44-.54-.66.01-.12.06-.22.15-.3z"/>
    </svg>
  ),
  vk: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0077FF">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
    </svg>
  ),
};

// Service config
const STREAMING_SERVICES = {
  spotify: { name: 'Spotify', color: '#1DB954' },
  appleMusic: { name: 'Apple Music', color: '#FA243C' },
  youtubeMusic: { name: 'YouTube Music', color: '#FF0000' },
  youtube: { name: 'YouTube', color: '#FF0000' },
  yandex: { name: 'Yandex Music', color: '#FFCC00' },
  deezer: { name: 'Deezer', color: '#FEAA2D' },
  tidal: { name: 'Tidal', color: '#000000' },
  soundcloud: { name: 'SoundCloud', color: '#FF5500' },
  amazon: { name: 'Amazon Music', color: '#FF9900' },
  vk: { name: 'VK Music', color: '#0077FF' },
};

const getServiceIcon = (serviceId) => StreamingIcons[serviceId] || StreamingIcons.spotify;
const getServiceName = (serviceId) => STREAMING_SERVICES[serviceId]?.name || serviceId;
const getServiceColor = (serviceId) => STREAMING_SERVICES[serviceId]?.color || '#888888';

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
        
        {/* LEVEL 1: BANNER */}
        {page.cover ? (
          <div 
            className="h-40 rounded-2xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${page.cover})` }}
            data-testid="page-cover"
          />
        ) : (
          <div className="h-24 rounded-2xl bg-[#171717]" />
        )}

        {/* LEVEL 2: PROFILE CARD */}
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            {page.avatar ? (
              <img src={page.avatar} alt={page.name} className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] object-cover" data-testid="page-avatar" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] bg-[#171717] flex items-center justify-center">
                <User className="w-10 h-10 text-gray-500" />
              </div>
            )}
          </div>

          <div className="bg-[#171717] rounded-2xl border border-white/10 pt-16 pb-6 px-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-2" data-testid="page-name">{page.name}</h1>
              {page.bio && <p className="text-gray-400 text-sm" data-testid="page-bio">{page.bio}</p>}
            </div>

            {(events.length > 0 || showcases.length > 0) && (
              <div className="flex justify-center gap-2 mb-6 overflow-x-auto" data-testid="tabs-container">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  Профиль
                </button>
                {events.length > 0 && (
                  <button onClick={() => setActiveTab('events')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'events' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    События
                  </button>
                )}
                {showcases.length > 0 && (
                  <button onClick={() => setActiveTab('showcases')} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'showcases' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    Витрины
                  </button>
                )}
              </div>
            )}

            <div data-testid="blocks-container">
              {activeTab === 'profile' && (
                <div className="space-y-3">
                  {blocks.map((block) => <BlockRenderer key={block.id} block={block} />)}
                  {blocks.length === 0 && <div className="text-center py-8 text-gray-500">Пока нет контента</div>}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-3">
                  {events.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              )}

              {activeTab === 'showcases' && (
                <div className="grid grid-cols-2 gap-3">
                  {showcases.map((showcase) => <ShowcaseCard key={showcase.id} showcase={showcase} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-8 pb-4">
          <a href="https://1bio.cc" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-gray-600 hover:text-gray-400 transition-colors">
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
      <a href={content.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all" data-testid="link-block">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          {content.icon ? <span className="text-lg">{content.icon}</span> : <Link2 className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{content.title}</div>
          {content.subtitle && <div className="text-sm text-gray-500">{content.subtitle}</div>}
        </div>
        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
      </a>
    );
  }

  // Text Block - wrapped in button-like container, with border for highlighted
  if (block_type === 'text') {
    const style = content.style || 'plain';
    const isHighlighted = style === 'highlighted';
    
    const Wrapper = content.url ? 'a' : 'div';
    const wrapperProps = content.url ? { href: content.url, target: '_blank', rel: 'noopener noreferrer', className: 'block' } : {};

    return (
      <Wrapper {...wrapperProps} data-testid="text-block">
        <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-3">
          <div className={`rounded-lg p-4 ${isHighlighted ? 'bg-[#f5f0e6] border-2 border-gray-300' : 'bg-transparent'}`}>
            {content.title && (
              <h3 className={`text-lg font-semibold mb-2 ${isHighlighted ? 'text-[#2a2a2a]' : 'text-white'}`}>
                {content.title}
              </h3>
            )}
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isHighlighted ? 'text-[#4a4a4a] italic' : 'text-gray-400'}`}>
              {content.text}
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // Music Block
  if (block_type === 'music') {
    const theme = content.theme || 'dark';
    const showCover = content.showCover !== false;
    const platforms = content.platforms || [];
    const isLight = theme === 'light';
    const visiblePlatforms = platforms.filter(p => p.visible !== false && p.url);

    return (
      <div className={`rounded-xl overflow-hidden border ${isLight ? 'bg-white border-gray-200' : 'bg-[#1a1a1a] border-white/10'}`} data-testid="music-block">
        {showCover && content.cover && (
          <img src={content.cover} alt={content.title} className="w-full aspect-square object-cover" />
        )}

        <div className="p-4">
          {content.title && (
            <div className="mb-4">
              <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-black' : 'text-white'}`}>{content.title}</h3>
              {content.artist && <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{content.artist}</p>}
            </div>
          )}

          {visiblePlatforms.length > 0 && (
            <div className="space-y-2">
              {visiblePlatforms.map((p, idx) => (
                <a
                  key={idx}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center">{getServiceIcon(p.platform)}</span>
                    <span className="font-medium">{getServiceName(p.platform)}</span>
                  </span>
                  <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Слушать →</span>
                </a>
              ))}
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
    {event.cover && <img src={event.cover} alt={event.title} className="w-full h-40 object-cover rounded-lg mb-4" />}
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex flex-col items-center justify-center">
        <Calendar className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white mb-1">{event.title}</h3>
        <p className="text-sm text-gray-400 mb-1">{event.date}</p>
        {event.description && <p className="text-sm text-gray-500 mb-2">{event.description}</p>}
        {event.button_url && (
          <a href={event.button_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-white hover:text-gray-300 transition-colors">
            {event.button_text} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  </div>
);

// ===== SHOWCASE CARD =====
const ShowcaseCard = ({ showcase }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
    {showcase.cover && <img src={showcase.cover} alt={showcase.title} className="w-full aspect-square object-cover rounded-lg mb-3" />}
    <h3 className="font-semibold text-white text-sm mb-1">{showcase.title}</h3>
    {showcase.price && <p className="text-sm text-gray-400 mb-2">{showcase.price}</p>}
    {showcase.button_url && (
      <a href={showcase.button_url} target="_blank" rel="noopener noreferrer" className="block w-full py-2 text-center text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
        {showcase.button_text}
      </a>
    )}
  </div>
);

export default PublicPage;
