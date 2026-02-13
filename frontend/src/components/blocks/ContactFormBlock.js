import React, { useState } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { ArrowLeft, X, Check, Loader2 } from 'lucide-react';

// Editor State & Save
export const ContactFormBlockEditor = ({ block, pageId, blocksCount, onClose, onSuccess }) => {
    const [fields, setFields] = useState(block?.content?.fields || {
        name: true,
        email: true,
        phone: false,
        message: true
    });
    const [title, setTitle] = useState(block?.content?.title || '');
    const [buttonText, setButtonText] = useState(block?.content?.button_text || 'Отправить');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const content = { fields, button_text: buttonText, title };
            let response;

            if (block?.id) {
                response = await api.updateBlock(block.id, { content });
            } else {
                response = await api.createBlock({
                    page_id: pageId,
                    block_type: 'contact_form',
                    content,
                    order: blocksCount || 0,
                });
            }

            if (response.ok) {
                toast.success(block?.id ? 'Блок обновлён' : 'Блок создан');
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

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-50 bg-background border-b border-border">
                <div className="max-w-[440px] mx-auto px-4 h-14 flex items-center justify-between">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold">Форма контактов</h1>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-[440px] mx-auto px-4 pt-6 pb-32 space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Заголовок (необязательно)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-12 px-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all"
                        placeholder="Свяжитесь с нами"
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Поля формы</h3>

                    {[
                        { id: 'name', label: 'Имя' },
                        { id: 'email', label: 'Email' },
                        { id: 'phone', label: 'Телефон' },
                        { id: 'message', label: 'Сообщение' }
                    ].map(field => (
                        <div key={field.id} className="flex items-center justify-between p-4 bg-secondary rounded-[16px] border border-transparent hover:border-border transition-all">
                            <span className="font-medium">{field.label}</span>
                            <button
                                onClick={() => setFields(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                                className={`w-12 h-7 rounded-full transition-colors relative ${fields[field.id] ? 'bg-primary' : 'bg-zinc-300 dark:bg-muted'}`}
                            >
                                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-transform ${fields[field.id] ? 'translate-x-5 bg-primary-foreground' : 'bg-white'}`} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Текст кнопки</label>
                    <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        className="w-full h-12 px-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all"
                        placeholder="Например: Отправить"
                    />
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border mt-auto">
                <div className="max-w-[440px] mx-auto">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-12 bg-foreground text-background rounded-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ContactFormBlockRenderer = ({ block }) => {
    const { fields, button_text, title } = block.content || {};
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (fields?.email && !formData.email && !fields.phone && !formData.phone) {
            toast.error("Укажите контакт для связи");
            setLoading(false);
            return;
        }

        try {
            const response = await api.submitLead({
                page_id: block.page_id,
                form_id: block.id,
                name: formData.name || '',
                contact: formData.email || formData.phone || 'Не указан',
                email: formData.email || '',
                phone: formData.phone || '',
                message: formData.message || ''
            });

            if (response.ok) {
                setSent(true);
                toast.success('Сообщение отправлено!');
                setFormData({ name: '', email: '', phone: '', message: '' });
                setTimeout(() => setSent(false), 3000);
            } else {
                toast.error('Ошибка отправки');
            }
        } catch (error) {
            toast.error('Ошибка соединения');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-card border border-border rounded-[24px] p-6 shadow-sm">
            {title && <h3 className="text-xl font-bold mb-4 text-center">{title}</h3>}
            {sent ? (
                <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Отправлено!</h3>
                    <p className="text-muted-foreground">Мы свяжемся с вами в ближайшее время.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {fields?.name && (
                        <input
                            type="text"
                            placeholder="Ваше имя"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full h-12 px-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                            required
                        />
                    )}

                    {fields?.email && (
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full h-12 px-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                            required={!fields.phone} // Require email if phone is not active or empty (handled in submit)
                        />
                    )}

                    {fields?.phone && (
                        <input
                            type="tel"
                            placeholder="Телефон"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full h-12 px-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                        />
                    )}

                    {fields?.message && (
                        <textarea
                            placeholder="Сообщение..."
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            className="w-full p-4 bg-secondary rounded-[12px] border border-transparent focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground resize-none h-32"
                            required
                        />
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-foreground text-background rounded-[12px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {button_text || 'Отправить'}
                    </button>
                </form>
            )}
        </div>
    );
};
