import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, isAuthenticated } from '../utils/api';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ArrowLeft, Users, MousePointer2, Percent, TrendingUp, ExternalLink } from 'lucide-react';

const Analytics = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        loadStats();
    }, [username]);

    const loadStats = async () => {
        try {
            const response = await api.getPageAnalytics(username);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                toast.error('Ошибка загрузки статистики');
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error('Ошибка соединения');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 bg-secondary border border-border rounded-[12px] hover:bg-secondary/80 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Аналитика страницы</h1>
                        <p className="text-muted-foreground text-sm">@{username}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Просмотры"
                        value={stats.total_views}
                        icon={<Users className="w-5 h-5 text-blue-400" />}
                        description="Всего заходов на страницу"
                    />
                    <StatCard
                        title="Клики"
                        value={stats.total_clicks}
                        icon={<MousePointer2 className="w-5 h-5 text-green-400" />}
                        description="Всего кликов по ссылкам"
                    />
                    <StatCard
                        title="CTR"
                        value={`${stats.ctr}%`}
                        icon={<Percent className="w-5 h-5 text-purple-400" />}
                        description="Процент кликов к просмотрам"
                    />
                </div>

                {/* Chart */}
                <div className="card bg-card border border-border p-6 rounded-[24px]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-foreground/60" />
                            Активность за неделю
                        </h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chart_data}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickFormatter={(val) => val.split('-').slice(1).reverse().join('.')}
                                />
                                <YAxis stroke="#888888" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorViews)"
                                    name="Просмотры"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="clicks"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorClicks)"
                                    name="Клики"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Links */}
                <div className="card bg-card border border-border p-6 rounded-[24px]">
                    <h2 className="text-lg font-bold mb-6">Популярные ссылки</h2>
                    <div className="space-y-4">
                        {stats.top_links.map((link, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-[16px] border border-border hover:border-border transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-secondary rounded-[12px] flex items-center justify-center text-muted-foreground font-bold">
                                        {index + 1}
                                    </div>
                                    <span className="font-medium">{link.title}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-sm font-bold">{link.clicks}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">кликов</div>
                                    </div>
                                    <div className="w-12 h-1 bg-foreground/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500"
                                            style={{ width: `${(link.clicks / stats.total_clicks) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {stats.top_links.length === 0 && (
                            <p className="text-center py-8 text-muted-foreground">Пока нет данных по кликам</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, description }) => (
    <div className="card bg-card border border-border p-6 rounded-[24px] group hover:border-border transition-all">
        <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary rounded-[16px] group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="text-xs font-bold text-foreground/20 uppercase tracking-widest">{title}</div>
        </div>
        <div className="text-3xl font-black mb-1">{value}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
    </div>
);

export default Analytics;
