import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isAuthenticated, logout, getImageUrl } from '../utils/api';
import { Tooltip } from '../components/ui/Tooltip';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ExternalLink, BarChart, Settings as SettingsIcon, LogOut, CircleCheck, CircleX, UserCog, Bell, BellRing, BadgeCheck, ShieldCheck, Link2, ChevronDown, Share2, Globe, Trash, Search, Fingerprint } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import BrandVerificationModal from '../components/ui/BrandVerificationModal';
import { SOCIAL_PLATFORMS } from '../components/blocks/LinkBlock';
import { useDebounce } from '../hooks/useDebounce';
import { useMediaQuery } from '../hooks/use-media-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '../components/ui/drawer';
import WelcomeModal from '../components/ui/WelcomeModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [settingsPage, setSettingsPage] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [userData, setUserData] = useState(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Notification & Verification State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const notificationRef = useRef(null);

  // Brand Verification State
  const [brandModal, setBrandModal] = useState({ isOpen: false, page: null });
  const [brandLoading, setBrandLoading] = useState(false);

  // Welcome Modal
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDuration, setWelcomeDuration] = useState(10);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadPages();
    loadUserData();
    checkWelcome();
  }, []);

  const checkWelcome = async () => {
    const shown = localStorage.getItem('welcomeShown');
    if (!shown) {
      try {
        const res = await api.getPublicSettings();
        if (res.ok) {
          const data = await res.json();
          setWelcomeDuration(data.welcome_modal_duration || 10);
        }
        setShowWelcome(true);
      } catch (e) {
        console.error('Failed to load settings');
        setShowWelcome(true); // Fallback
      }
    }
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('welcomeShown', 'true');
  };

  const loadUserData = async () => {
    try {
      const response = await api.getMe();
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Failed to load user data');
    }
  };

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

  const loadNotifications = async () => {
    try {
      const response = await api.getNotifications();
      if (response.ok) {
        const data = await response.json();
        // Sort by date descending (newest first)
        const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Only update if data changed to avoid unnecessary re-renders
        setNotifications(prev => {
          if (JSON.stringify(prev) === JSON.stringify(sortedData)) return prev;
          return sortedData;
        });
      }
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      loadNotifications();
      // Poll every 5 seconds for "instant" feel
      const interval = setInterval(loadNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleReadNotification = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark read');
    }
  };

  const handleClearNotifications = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (error) {
      toast.error('Не удалось очистить уведомления');
    }
  };

  const isUserVerified = pages.length > 0 && pages[0].is_verified;

  const handleBrandClick = (page) => {
    if (!isUserVerified) {
      toast.error('Только верифицированные пользователи могут создавать бренды');
      return;
    }
    if (page.brand_status === 'pending') {
      toast.info('Заявка уже находится на рассмотрении');
      return;
    }
    if (page.brand_status === 'verified') {
      return;
    }
    setBrandModal({ isOpen: true, page });
  };

  const submitBrandRequest = async (data) => {
    setBrandLoading(true);
    try {
      const payload = {
        req_type: 'brand',
        page_id: brandModal.page.id,
        full_name: brandModal.page.name,
        document_type: 'Brand Verification',
        contact_info: data.website,
        ...data
      };

      const response = await api.verifyRequest(payload);
      if (response.ok) {
        toast.success('Заявка отправлена');
        setBrandModal({ isOpen: false, page: null });
        setPages(pages.map(p => p.id === brandModal.page.id ? { ...p, brand_status: 'pending' } : p));
      } else {
        const errorData = await response.json();
        let errorMessage = 'Ошибка отправки';
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setBrandLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background" data-testid="dashboard-page">
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        duration={welcomeDuration}
      />
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="default" />
            <span className="hidden sm:inline text-2xl font-bold text-foreground">Мои страницы</span>
          </div>
          <div className="flex items-center gap-2">
            {userData?.role === 'owner' && (
              <Tooltip content="SECRET ROOM">
                <button
                  onClick={() => navigate('/secretroom')}
                  className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                >
                  <Fingerprint className="w-5 h-5" />
                </button>
              </Tooltip>
            )}
            <div className="relative" ref={notificationRef}>
              <Tooltip content="Уведомления">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground relative"
                  data-testid="notifications-button"
                >
                  {Array.isArray(notifications) && notifications.some(n => !n.read) ? (
                    <>
                      <BellRing className="w-5 h-5" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                    </>
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </button>
              </Tooltip>

              {showNotifications && isDesktop && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-[12px] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-border bg-secondary/50 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Уведомления</h3>
                    {Array.isArray(notifications) && notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {Array.isArray(notifications) && notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                          onClick={() => handleReadNotification(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="text-sm">
                              <p className="text-foreground">{typeof notification.message === 'string' ? notification.message : 'New notification'}</p>
                              <span className="text-xs text-muted-foreground mt-1 block">
                                {notification.created_at ? new Date(notification.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Новых уведомлений нет
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isDesktop && (
                <Drawer open={showNotifications} onOpenChange={setShowNotifications}>
                  <DrawerContent className="max-h-[85vh]">
                    <DrawerHeader className="text-left px-4 pt-4">
                      <div className="flex items-center justify-between">
                        <DrawerTitle>Уведомления</DrawerTitle>
                        {Array.isArray(notifications) && notifications.length > 0 && (
                          <button
                            onClick={() => { handleClearNotifications(); setShowNotifications(false); }}
                            className="text-xs text-muted-foreground hover:text-destructive font-medium"
                          >
                            Очистить все
                          </button>
                        )}
                      </div>
                    </DrawerHeader>
                    <div className="px-4 pb-8 overflow-y-auto">
                      {Array.isArray(notifications) && notifications.length > 0 ? (
                        <div className="space-y-1">
                          {notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`p-3 border border-border rounded-xl active:bg-secondary/50 transition-colors ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
                              onClick={() => handleReadNotification(notification.id)}
                            >
                              <div className="flex gap-3">
                                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <div className="text-sm">
                                  <p className="text-foreground leading-relaxed">{typeof notification.message === 'string' ? notification.message : 'New notification'}</p>
                                  <span className="text-xs text-muted-foreground mt-1 block">
                                    {notification.created_at ? new Date(notification.created_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p>Новых уведомлений нет</p>
                        </div>
                      )}
                    </div>
                  </DrawerContent>
                </Drawer>
              )}
            </div>

            {userData?.is_verified ? null : (
              userData?.verification_status === 'pending' ? (
                <Tooltip content="Ваша заявка еще рассматривается">
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground opacity-50 cursor-not-allowed"
                    data-testid="verification-pending-button"
                  >
                    <BadgeCheck className="w-5 h-5 text-muted-foreground" />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip content="Верификация">
                  <button
                    onClick={() => setShowVerificationModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground"
                    data-testid="verification-button"
                  >
                    <BadgeCheck className="w-5 h-5" />
                  </button>
                </Tooltip>
              )
            )}

            <ThemeToggle />
            <Tooltip content="Настройки аккаунта">
              <button
                onClick={() => navigate('/settings')}
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground relative"
                data-testid="settings-button"
              >
                <UserCog className="w-5 h-5" />
                {Array.isArray(notifications) && notifications.some(n => {
                  if (!n.message?.includes('заполнил форму')) return false;
                  const lastCheck = localStorage.getItem('lastLeadsCheck') || '1970-01-01T00:00:00Z';
                  return new Date(n.created_at) > new Date(lastCheck);
                }) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]"></span>
                  )}
              </button>
            </Tooltip>
            <Tooltip content="Выход">
              <button
                onClick={logout}
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground"
                data-testid="logout-button"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Pages List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Загрузка страниц...
          </div>
        ) : (
          <div className="space-y-4">
            {Array.isArray(pages) && pages.length > 0 ? (
              pages.map((page, index) => (
                <div key={page.id || Math.random()} className="card bg-card border border-border p-3 sm:p-5 rounded-[12px]" data-testid="page-card">
                  <div className="flex items-start gap-4">
                    {page.avatar ? (
                      <img
                        src={getImageUrl(page.avatar)}
                        alt={page.name || 'Page'}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white/5"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 text-foreground flex items-center gap-1.5">
                        <span className="truncate">{page.name || 'Untitled'}</span>
                        {page.is_verified && !page.is_brand && page.brand_status !== 'verified' && (
                          <Tooltip content="Подтвержденная страница">
                            <BadgeCheck className="w-4 h-4 text-foreground flex-shrink-0" />
                          </Tooltip>
                        )}
                        {(page.is_brand || page.brand_status === 'verified') && (
                          <Tooltip content="Подтвержденный бренд">
                            <ShieldCheck className="w-4 h-4 text-foreground flex-shrink-0" />
                          </Tooltip>
                        )}
                      </h3>
                      <a
                        href={`/${page.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                      >
                        inbio.one/{page.username || '...'}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>

                      {/* Action buttons below on mobile, inline on desktop */}
                      <div className="flex gap-1 mt-3 sm:hidden">
                        <button
                          onClick={() => navigate(`/edit/${page.username}`)}
                          className="btn-secondary flex-1 text-xs py-2 bg-primary/5 border border-border rounded-[8px] flex items-center justify-center p-0"
                          data-testid="edit-button"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/analytics/${page.username}`)}
                          className="btn-secondary flex-1 text-xs py-2 bg-primary/5 border border-border rounded-[8px] flex items-center justify-center p-0"
                          data-testid="analytics-button"
                        >
                          <BarChart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSettingsPage(page)}
                          className="btn-secondary flex-1 text-xs py-2 bg-primary/5 border border-border rounded-[8px] flex items-center justify-center p-0"
                          data-testid="page-settings-button"
                        >
                          <SettingsIcon className="w-3.5 h-3.5" />
                        </button>

                        {index > 0 && page.brand_status !== 'verified' && (
                          <button
                            onClick={() => handleBrandClick(page)}
                            className={`btn-secondary flex-1 text-xs py-2 bg-primary/5 border border-border rounded-[8px] flex items-center justify-center p-0 ${page.brand_status === 'pending' ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!page.is_main_page && (
                          <button
                            onClick={() => setDeleteConfirmId(page.id)}
                            className="btn-ghost text-destructive hover:text-red-300 flex-1 text-xs py-2 flex items-center justify-center p-0"
                            data-testid="delete-button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop buttons */}
                    <div className="hidden sm:flex gap-2 flex-shrink-0">
                      <Tooltip content="Редактировать страницу">
                        <button
                          onClick={() => navigate(`/edit/${page.username}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-bold hover:bg-foreground/90 transition-all shadow-lg"
                          data-testid="edit-button"
                        >
                          <Edit2 className="w-4 h-4 text-background" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Аналитика страницы">
                        <button
                          onClick={() => navigate(`/analytics/${page.username}`)}
                          className="p-2 bg-primary/5 border border-border rounded-[12px] hover:bg-primary/10 transition-colors"
                          data-testid="analytics-button"
                        >
                          <BarChart className="w-4 h-4 text-foreground" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Настройки ссылки">
                        <button
                          onClick={() => setSettingsPage(page)}
                          className="p-2 bg-primary/5 border border-border rounded-[12px] hover:bg-primary/10 transition-colors"
                          data-testid="page-settings-button"
                        >
                          <SettingsIcon className="w-4 h-4 text-foreground" />
                        </button>
                      </Tooltip>
                      {index > 0 && page.brand_status !== 'verified' && (
                        <Tooltip content={
                          page.brand_status === 'pending' ? 'Заявка на рассмотрении' : 'Верифицировать бренд'
                        }>
                          <button
                            onClick={() => handleBrandClick(page)}
                            className={`p-2 bg-primary/5 border border-border rounded-[12px] hover:bg-primary/10 transition-colors ${page.brand_status === 'pending' ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}

                      {!page.is_main_page && (
                        <Tooltip content="Удалить страницу">
                          <button
                            onClick={() => setDeleteConfirmId(page.id)}
                            className="p-2 text-destructive hover:text-red-300 hover:bg-destructive/10 rounded-[12px] transition-colors"
                            data-testid="delete-button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))) : null}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-4 bg-primary text-primary-foreground rounded-[12px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
          data-testid="create-page-button"
        >
          <Plus className="w-5 h-5" />
          Создать ещё
        </button>


        {!loading && pages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            У вас пока нет страниц
          </div>
        )}
      </div>

      {
        showCreateModal && (
          <CreatePageModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={(createdPage) => {
              setShowCreateModal(false);
              loadPages();
              navigate(`/edit/${createdPage.username}`);
            }}
          />
        )
      }

      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDelete(deleteConfirmId)}
        title="Удалить страницу?"
        message="Это действие необратимо. Все блоки и данные этой страницы будут удалены навсегда."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
      />

      {
        settingsPage && (
          <PageSettingsModal
            page={settingsPage}
            onClose={() => setSettingsPage(null)}
            onSuccess={() => {
              setSettingsPage(null);
              loadPages();
            }}
          />
        )
      }

      {
        showVerificationModal && (
          <VerificationRequestModal
            onClose={() => setShowVerificationModal(false)}
          />
        )
      }

      {
        brandModal.isOpen && (
          <BrandVerificationModal
            isOpen={brandModal.isOpen}
            onClose={() => setBrandModal({ ...brandModal, isOpen: false })}
            onSubmit={submitBrandRequest}
            loading={brandLoading}
          />
        )
      }
    </div>
  );
};

const VerificationRequestModal = ({ onClose }) => {
  const [fullName, setFullName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [bio, setBio] = useState('');
  const [comment, setComment] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleUrlChange = (value) => {
    setCurrentUrl(value);
    if (value && value.trim()) {
      const lowerValue = value.toLowerCase().trim();
      const detected = SOCIAL_PLATFORMS.find(p =>
        p.id !== 'custom' && p.domain && lowerValue.includes(p.domain)
      );

      if (detected) {
        // If detected, add to links and clear input
        addSocialLink(detected, value.trim());
        setCurrentUrl('');
      }
    }
  };

  const addSocialLink = (platform, url) => {
    if (socialLinks.some(l => l.url === url)) return;
    setSocialLinks([...socialLinks, { platform: platform.id, url, icon: platform.icon, name: platform.name, color: platform.color }]);
  };

  const removeSocialLink = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (socialLinks.length === 0 && !currentUrl.trim()) {
      toast.error('Добавьте хотя бы одну соцсеть');
      return;
    }

    setLoading(true);

    // Final links including potentially typed but not yet "auto-added" custom link
    let finalLinks = [...socialLinks];
    if (currentUrl.trim()) {
      finalLinks.push({ platform: 'custom', url: currentUrl.trim() });
    }

    try {
      const response = await api.verifyRequest({
        full_name: fullName,
        contact_info: contactInfo,
        bio: bio,
        comment: comment,
        social_links: finalLinks.map(l => ({ platform: l.platform, url: l.url }))
      });

      if (response.ok) {
        toast.success('Заявка отправлена!');
        onClose();
      } else {
        const data = await response.json();
        let errorMessage = 'Ошибка отправки';
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">ФИО</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground transition-all"
          placeholder="Иванов Иван Иванович"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">О себе</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground min-h-[100px] resize-none transition-all"
          placeholder="Расскажите о своей деятельности..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Социальные сети</label>
        <div className="space-y-2 mb-3">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-secondary/50 border border-border rounded-[10px] animate-in fade-in slide-in-from-left-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-background">
                {link.icon ? (
                  <img src={getImageUrl(link.icon)} className="w-5 h-5 object-contain" alt="" />
                ) : (
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 text-xs truncate font-medium">{link.url}</div>
              <button
                type="button"
                onClick={() => removeSocialLink(index)}
                className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="relative group">
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground transition-all"
            placeholder="Вставьте ссылку на соцсеть..."
          />
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 ml-1 italic">
          * Ссылка определится автоматически при вставке
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Контактная информация</label>
        <input
          type="text"
          required
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground transition-all"
          placeholder="Почта или социальная сеть"
        />
      </div>

      <div className="pt-4 pb-safe">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-foreground text-background rounded-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
        >
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div className="bg-card border border-border rounded-[20px] p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <CircleX className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold mb-6 text-foreground text-center">Заявка на верификацию</h2>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-bold text-foreground">Заявка на верификацию</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 overflow-y-auto">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const PageSettingsModal = ({ page, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('link'); // 'link' or 'seo'
  const [newUsername, setNewUsername] = useState(page.username);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // SEO State
  const [seoTitle, setSeoTitle] = useState(page.seoSettings?.title || '');
  const [seoDescription, setSeoDescription] = useState(page.seoSettings?.description || '');
  const [favicon, setFavicon] = useState(page.seoSettings?.favicon || '');
  const [ogImage, setOgImage] = useState(page.seoSettings?.og_image || '');
  const [uploading, setUploading] = useState(false);

  const faviconInputRef = useRef(null);
  const ogImageInputRef = useRef(null);

  const debouncedUsername = useDebounce(newUsername, 400);

  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername === page.username) {
        setIsAvailable(null);
        return;
      }

      const validRegex = /^[a-zA-Z0-9_-]+$/;
      if (!validRegex.test(debouncedUsername)) {
        setIsAvailable(false);
        return;
      }

      setChecking(true);
      try {
        const response = await api.checkUsername(debouncedUsername);
        const data = await response.json();
        setIsAvailable(data.available);
      } catch (error) {
        console.error('Check error:', error);
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, page.username]);

  const handleFileUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await api.uploadImage(file, category);
      if (response.ok) {
        const data = await response.json();
        if (category === 'favs') setFavicon(data.url);
        else setOgImage(data.url);
        toast.success('Файл загружен');
      } else {
        toast.error('Ошибка загрузки');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLink = async (e) => {
    if (e) e.preventDefault();
    if (!newUsername.trim()) {
      toast.error('Введите ник');
      return;
    }
    if (newUsername === page.username) {
      onClose();
      return;
    }
    if (isAvailable === false) {
      toast.error('Это имя уже занято');
      return;
    }

    setSaving(true);
    try {
      const response = await api.updateUsername(page.id, newUsername);
      if (response.ok) {
        toast.success('Ссылка успешно обновлена!');
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Ошибка обновления');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSEO = async () => {
    setSaving(true);
    try {
      const seoSettings = {
        title: seoTitle,
        description: seoDescription,
        favicon: favicon,
        og_image: ogImage
      };
      const response = await api.updatePage(page.id, { seoSettings });
      if (response.ok) {
        toast.success('SEO-настройки сохранены');
        onSuccess();
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const PreviewCard = () => {
    const displayTitle = seoTitle || page.name || 'Моя страница';
    const previewImage = ogImage ? getImageUrl(ogImage) : getImageUrl('/uploads/files/og-preview/default.jpg');

    return (
      <div className="mt-6 space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Предпросмотр в соцсетях</label>
        <div className="bg-secondary/50 border border-border rounded-xl overflow-hidden shadow-sm max-w-sm">
          {previewImage && (
            <div className="aspect-[1.91/1] w-full bg-secondary overflow-hidden flex items-center justify-center">
              <img src={previewImage} alt="OG Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-3 bg-white/5 space-y-1">
            <h4 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-1">{displayTitle} | InBio.One</h4>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {seoDescription || 'Описание страницы в поисковых системах и социальных сетях...'}
            </p>
            <div className="text-[10px] text-muted-foreground pt-1 truncate">inbio.one/{newUsername}</div>
          </div>
        </div>
      </div>
    );
  };

  const navItem = (id, icon, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      {React.createElement(icon, { className: `w-5 h-5 ${activeTab === id ? 'text-foreground' : 'text-muted-foreground'}` })}
      <span className="text-[10px] font-medium uppercase tracking-tight">{label}</span>
      {activeTab === id && <div className="absolute bottom-0 w-8 h-1 bg-foreground rounded-t-full" />}
    </button>
  );

  const content = (
    <div className="space-y-6">
      {activeTab === 'link' && (
        <form onSubmit={handleSaveLink} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground ml-1">Персональная ссылка</label>
            <div className={`flex items-center gap-2 px-4 py-3 bg-secondary border rounded-[12px] transition-all duration-300 ${isAvailable === true ? 'border-green-500/50' :
              isAvailable === false ? 'border-destructive/50' :
                'border-border focus-within:border-border'
              }`}>
              <span className="text-muted-foreground text-sm">inbio.one/</span>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="flex-1 bg-transparent border-none outline-none text-foreground text-sm"
                placeholder="link"
                disabled={saving}
              />

              {checking && (
                <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
              )}
              {!checking && newUsername && newUsername !== page.username && isAvailable === true && (
                <CircleCheck className="w-5 h-5 text-green-400 fill-green-400/10" />
              )}
              {!checking && newUsername && newUsername !== page.username && isAvailable === false && (
                <CircleX className="w-5 h-5 text-destructive fill-destructive/10" />
              )}
            </div>

            {!checking && newUsername !== page.username && isAvailable === false && (
              <p className="text-destructive text-xs pl-1">Этот ник уже занят или имеет неверный формат</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 ml-1 px-1">
              * Смена ника изменит URL-адрес вашей страницы. Убедитесь, что вы обновили ссылку в своих соцсетях.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || (newUsername !== page.username && isAvailable !== true)}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Название страницы (Title)</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground transition-all text-sm"
                placeholder={page.name || "FUTURE"}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Описание (OG Description)</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] focus:outline-none focus:border-foreground/30 text-foreground min-h-[80px] text-sm resize-none transition-all"
                placeholder="Краткое описание вашей ссылки..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Favicon (.ico, .png)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-secondary border border-border rounded-[12px] hover:bg-secondary/80 transition-all text-xs font-medium"
                  >
                    {uploading ? <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
                    {favicon ? 'Изменить' : 'Загрузить'}
                  </button>
                  {favicon && (
                    <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden">
                      <img src={getImageUrl(favicon)} alt="Favicon" className="w-4 h-4 object-contain" />
                    </div>
                  )}
                </div>
                <input type="file" ref={faviconInputRef} className="hidden" accept=".ico,.png" onChange={(e) => handleFileUpload(e, 'favs')} />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">Preview (OG Image)</label>
                <button
                  onClick={() => ogImageInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-secondary border border-border rounded-[12px] hover:bg-secondary/80 transition-all text-xs font-medium"
                >
                  {uploading ? <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" /> : <Share2 className="w-4 h-4" />}
                  {ogImage ? 'Изменить фото' : 'Загрузить фото'}
                </button>
                <input type="file" ref={ogImageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'covers')} />
              </div>
            </div>
          </div>

          <PreviewCard />

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveSEO}
              disabled={saving}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-[12px] font-bold hover:opacity-90 transition-all shadow-lg"
            >
              {saving ? 'Сохранение...' : 'Сохранить SEO'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={onClose}>
        <div className="bg-card border border-border rounded-[24px] p-0 max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex border-b border-border bg-secondary/30 relative">
            {navItem('link', Link2, 'Аккаунт')}
            {navItem('seo', Globe, 'SEO настройки')}
          </div>
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6 text-foreground text-center">
              {activeTab === 'link' ? 'Настройки ссылки' : 'Поисковая оптимизация'}
            </h2>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="p-0">
          <div className="flex border-b border-border bg-secondary/30 relative">
            {navItem('link', Link2, 'Аккаунт')}
            {navItem('seo', Globe, 'SEO настройки')}
          </div>
        </DrawerHeader>
        <div className="px-6 pb-8 pt-4 overflow-y-auto no-scrollbar">
          <DrawerTitle className="text-lg font-bold text-foreground mb-6 text-center">
            {activeTab === 'link' ? 'Настройки ссылки' : 'SEO настройки'}
          </DrawerTitle>
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const CreatePageModal = ({ onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

    if (username.length < 4) {
      toast.error('Минимальная длина ссылки - 4 символа');
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
        onSuccess(pageData);
      }
    } catch (error) {
      toast.error('Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground ml-1">Ссылка вашей страницы</label>
        <div className="flex items-center gap-2 px-4 py-3 bg-secondary border border-border rounded-[12px] focus-within:border-border transition-colors">
          <span className="text-muted-foreground text-sm">inbio.one/</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm"
            placeholder="link"
            disabled={loading}
            data-testid="username-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground ml-1">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-secondary border border-border rounded-[12px] text-foreground text-sm focus:outline-none focus:border-border transition-colors"
          placeholder="Название или имя"
          disabled={loading}
          data-testid="name-input"
        />
      </div>

      <div className="flex gap-3 pt-2 pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors"
          data-testid="cancel-button"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
          data-testid="submit-button"
        >
          {loading ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
        onClick={onClose}
        data-testid="create-modal"
      >
        <div
          className="bg-card border border-border rounded-[12px] p-8 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground text-center">Создать страницу</h2>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Drawer open={true} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left px-6 pt-6">
          <DrawerTitle className="text-xl font-bold text-foreground">Создать страницу</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 overflow-y-auto">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default Dashboard;
