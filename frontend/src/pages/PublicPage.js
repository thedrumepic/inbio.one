import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Link2, Calendar, ShoppingBag, Settings, User, ExternalLink } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Страница не найдена</h2>
          <p className="text-gray-400">Проверьте URL и попробуйте снова</p>
        </div>
      </div>
    );
  }

  const { page, blocks, events, showcases } = data;

  return (
    <div className="min-h-screen pb-20" data-testid="public-page">
      {/* Cover */}
      {page.cover && (
        <div 
          className="w-full h-32 sm:h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${page.cover})` }}
          data-testid="page-cover"
        />
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-16 relative">
        {/* Avatar */}
        <div className="flex justify-center mb-4 sm:mb-6">
          {page.avatar ? (
            <img
              src={page.avatar}
              alt={page.name}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#0a0a0a] object-cover"
              data-testid="page-avatar"
            />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#0a0a0a] bg-white/10 backdrop-blur-xl flex items-center justify-center">
              <User className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </div>
          )}
        </div>

        {/* Name & Bio */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="page-name">{page.name}</h1>
          {page.bio && (
            <p className="text-gray-400 text-sm" data-testid="page-bio">{page.bio}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2" data-testid="tabs-container">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            data-testid="profile-tab"
          >
            Профиль
          </button>
          {events.length > 0 && (
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'events' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
              data-testid="events-tab"
            >
              События
            </button>
          )}
          {showcases.length > 0 && (
            <button
              onClick={() => setActiveTab('showcases')}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'showcases' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
              data-testid="showcases-tab"
            >
              Витрины
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <div className="space-y-4" data-testid="blocks-container">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Пока нет контента
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4" data-testid="events-container">
            {events.map((event) => (
              <div key={event.id} className="card group" data-testid="event-card">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-white/10 flex flex-col items-center justify-center">
                    <Calendar className="w-6 h-6 text-white mb-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-400 mb-1">{event.date}</p>
                    {event.description && (
                      <p className="text-sm text-gray-300 mb-2">{event.description}</p>
                    )}
                    {event.button_url && (
                      <a
                        href={event.button_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-white hover:underline"
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
          <div className="grid grid-cols-2 gap-4" data-testid="showcases-container">
            {showcases.map((showcase) => (
              <div key={showcase.id} className="card group" data-testid="showcase-card">
                {showcase.cover && (
                  <img
                    src={showcase.cover}
                    alt={showcase.title}
                    className="w-full aspect-square object-cover rounded-xl mb-3"
                  />
                )}
                <h3 className="font-semibold text-sm mb-1">{showcase.title}</h3>
                {showcase.price && (
                  <p className="text-sm text-gray-400 mb-2">{showcase.price}</p>
                )}
                {showcase.button_url && (
                  <a
                    href={showcase.button_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-center block text-xs"
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
        className="card group flex items-center justify-between hover:scale-[1.02] transition-transform"
        data-testid="link-block"
      >
        <div className="flex items-center gap-3 flex-1">
          {content.icon && <span className="text-2xl">{content.icon}</span>}
          <div className="flex-1">
            <div className="font-medium">{content.title}</div>
            {content.subtitle && <div className="text-sm text-gray-400">{content.subtitle}</div>}
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
      </a>
    );
  }

  if (block_type === 'text') {
    return (
      <div className="text-center py-4" data-testid="text-block">
        <p className="text-gray-300">{content.text}</p>
      </div>
    );
  }

  if (block_type === 'music') {
    return (
      <div className="card" data-testid="music-block">
        <div className="flex gap-4">
          {content.cover && (
            <img
              src={content.cover}
              alt={content.title}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1">{content.title}</h3>
            <p className="text-sm text-gray-400 mb-3">{content.artist}</p>
            {content.platforms && content.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.platforms.slice(0, 4).map((platform, idx) => (
                  <a
                    key={idx}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors capitalize"
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