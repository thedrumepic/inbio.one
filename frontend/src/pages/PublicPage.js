import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Logo } from '../components/Logo';
import { Link2, Calendar, ShoppingBag, User, ExternalLink } from 'lucide-react';
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
      <div className="max-w-[480px] mx-auto">
        {/* Cover */}
        {page.cover ? (
          <div 
            className="w-full h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${page.cover})` }}
            data-testid="page-cover"
          />
        ) : (
          <div className="w-full h-32 bg-white/5" />
        )}

        {/* Content Card - wrapping avatar, name, bio, links */}
        <div className="relative -mt-8">
          <div className="bg-[#171717] rounded-t-[32px] min-h-[400px] px-4 pb-8">
            {/* Avatar - Overlapping into card */}
            <div className="relative flex justify-center">
              <div className="-mt-14">
                {page.avatar ? (
                  <img
                    src={page.avatar}
                    alt={page.name}
                    className="w-28 h-28 rounded-full border-4 border-[#171717] object-cover"
                    data-testid="page-avatar"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-[#171717] bg-white/10 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Name & Bio */}
            <div className="text-center mt-4 mb-6">
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
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
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
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'events' 
                        ? 'bg-white text-black' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    data-testid="events-tab"
                  >
                    События
                  </button>
                )}
                {showcases.length > 0 && (
                  <button
                    onClick={() => setActiveTab('showcases')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeTab === 'showcases' 
                        ? 'bg-white text-black' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    data-testid="showcases-tab"
                  >
                    Витрины
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div>
              {activeTab === 'profile' && (
                <div className="space-y-3" data-testid="blocks-container">
                  {blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} />
                  ))}
                  {blocks.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Пока нет контента
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-3" data-testid="events-container">
                  {events.map((event) => (
                    <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-4" data-testid="event-card">
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
                  ))}
                </div>
              )}

              {activeTab === 'showcases' && (
                <div className="grid grid-cols-2 gap-3" data-testid="showcases-container">
                  {showcases.map((showcase) => (
                    <div key={showcase.id} className="bg-white/5 border border-white/10 rounded-xl p-3" data-testid="showcase-card">
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Powered by 1bio */}
      <div className="fixed bottom-0 left-0 right-0 py-4 flex justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pointer-events-none z-50">
        <a 
          href="https://1bio.cc" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 transition-colors pointer-events-auto"
        >
          <span className="text-xs">Powered by</span>
          <Logo size="xs" className="opacity-60" />
        </a>
      </div>
    </div>
  );
};

const BlockRenderer = ({ block }) => {
  const { block_type, content } = block;

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

  if (block_type === 'text') {
    return (
      <div className="text-center py-4 px-4" data-testid="text-block">
        <p className="text-gray-400">{content.text}</p>
      </div>
    );
  }

  if (block_type === 'music') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4" data-testid="music-block">
        <div className="flex gap-4">
          {content.cover && (
            <img
              src={content.cover}
              alt={content.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">{content.title}</h3>
            <p className="text-sm text-gray-400 mb-3">{content.artist}</p>
            {content.platforms && content.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.platforms.slice(0, 4).map((platform, idx) => (
                  <a
                    key={idx}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white transition-colors capitalize"
                  >
                    {platform.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PublicPage;
