import React, { useMemo, useState, useEffect } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    ClockIcon,
    TrophyIcon,
    FireIcon,
    BookmarkIcon,
    GlobeAltIcon,
    FilmIcon,
    ChartBarIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import { getGenresForMovies } from '../utils/genreCache';
import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';
import { CINEMA_RANKS } from '../constants/cinemaRanks';

const formatRuntime = (mins) => {
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const minutes = mins % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m`;
};

const StatCard = ({ icon: Icon, label, value, colorClass = "text-primary" }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col items-center text-center group transition-colors hover:bg-white/[0.04] hover:border-white/10"
    >
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-white/5 border border-white/5 group-hover:scale-110 transition-transform", colorClass)}>
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</span>
        <span className="text-2xl font-display font-bold text-white tracking-tight">{value}</span>
    </motion.div>
);

const AchievementBadge = ({ icon, title, desc, unlocked }) => (
    <motion.div
        whileHover={unlocked ? { y: -5, scale: 1.05 } : {}}
        className={cn(
            "h-48 border flex flex-col items-center justify-center p-5 transition-all duration-500 relative group overflow-hidden rounded-[2.5rem] backdrop-blur-sm",
            unlocked
                ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
                : "border-white/5 bg-white/[0.01] opacity-30 grayscale saturate-0"
        )}
    >
        {unlocked && (
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-[40px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-12 h-12 bg-primary/10 blur-[30px] rounded-full" />
            </div>
        )}
        <div className={cn(
            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 transition-all duration-500 shadow-2xl border bg-black/40",
            unlocked ? "text-primary border-primary/20 group-hover:scale-110" : "text-gray-600 border-white/5"
        )}>
            <span className="text-3xl filter drop-shadow-lg">{icon}</span>
        </div>
        <span className={cn("font-display font-bold text-xs tracking-[0.1em] text-center mb-1", unlocked ? "text-white" : "text-gray-600")}>
            {title}
        </span>
        <span className="font-mono text-[9px] text-center text-gray-500 leading-relaxed px-2 font-black uppercase">
            {desc}
        </span>
    </motion.div>
);

const StatsView = () => {
    const { watched, watchlist } = useMovies();
    const { user } = useAuth();

    const [movieMetadata, setMovieMetadata] = useState({});
    const [radarMode, setRadarMode] = useState('consumption');
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchAllMetadata = async () => {
            if (watched.length === 0) {
                setStatsLoading(false);
                return;
            }
            const cache = await getGenresForMovies(watched);
            setMovieMetadata(cache);
            setStatsLoading(false);
        };
        fetchAllMetadata();
    }, [watched]);

    const runtimes = useMemo(() => watched.reduce((acc, m) => acc + (m.runtime || 110), 0), [watched]);
    const currentRank = useMemo(() => [...CINEMA_RANKS].reverse().find(r => watched.length >= r.min) || CINEMA_RANKS[0], [watched]);
    const nextRank = useMemo(() => CINEMA_RANKS.find(r => r.min > watched.length) || { min: 500, title: "Lumière Renacido", desc: "Eres el cine mismo." }, [watched]);

    const rankProgress = useMemo(() => {
        if (watched.length >= 500) return 100;
        const prevMin = currentRank.min;
        const targetMin = nextRank.min;
        return Math.min(Math.max(((watched.length - prevMin) / (targetMin - prevMin)) * 100, 0), 100);
    }, [watched, currentRank, nextRank]);

    const oscarStats = useMemo(() => {
        let count = 0;
        watched.forEach(m => { if (OSCAR_BEST_PICTURE_WINNERS.has(m.id)) count++; });
        return { count, total: OSCAR_BEST_PICTURE_WINNERS.size };
    }, [watched]);

    const radarData = useMemo(() => {
        const consumption = {}; const quality = {}; const qualityCounts = {};
        watched.forEach(movie => {
            const meta = movieMetadata[movie.id];
            const genres = meta?.genres;
            if (genres && genres.length > 0) {
                genres.forEach(g => {
                    consumption[g.name] = (consumption[g.name] || 0) + 1;
                    if (movie.rating && movie.rating > 0) {
                        quality[g.name] = (quality[g.name] || 0) + movie.rating;
                        qualityCounts[g.name] = (qualityCounts[g.name] || 0) + 1;
                    }
                });
            }
        });
        const formatForRadar = (dataObj, isAverage = false) => Object.keys(dataObj).map(k => ({
            subject: k, A: isAverage ? Math.round((dataObj[k] / qualityCounts[k]) * 10) / 10 : dataObj[k], fullMark: isAverage ? 10 : Math.max(...Object.values(dataObj))
        })).sort((a, b) => parseFloat(b.A) - parseFloat(a.A)).slice(0, 6);

        return { consumption: formatForRadar(consumption, false), quality: formatForRadar(quality, true) };
    }, [watched, movieMetadata]);

    const countryData = useMemo(() => {
        const countriesMap = {};
        watched.forEach(movie => {
            const meta = movieMetadata[movie.id];
            const countries = meta?.production_countries;
            if (countries && countries.length > 0) {
                countries.forEach(c => {
                    countriesMap[c.name] = (countriesMap[c.name] || 0) + 1;
                });
            }
        });

        return Object.entries(countriesMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [watched, movieMetadata]);

    const topCountries = useMemo(() => countryData.slice(0, 5), [countryData]);

    const ratingDistribution = useMemo(() => {
        const dist = Array.from({ length: 11 }, (_, i) => ({ rating: i, count: 0 }));
        watched.forEach(m => { const r = m.rating || 0; if (dist[r]) dist[r].count++; });
        return dist.filter(d => d.rating > 0);
    }, [watched]);

    const cinePulseData = useMemo(() => {
        const data = [];
        const today = new Date();
        const ratingsMap = {};

        watched.forEach(m => {
            if (m.watchedAt) {
                const d = m.watchedAt.split('T')[0];
                ratingsMap[d] = (ratingsMap[d] || 0) + (m.rating || 5);
            }
        });

        let score = 0;
        const lookback = 90;
        const startCalculation = new Date(today);
        startCalculation.setDate(today.getDate() - lookback);

        let lastWatchedDate = null;
        for (let i = 0; i <= lookback; i++) {
            const currentDate = new Date(startCalculation);
            currentDate.setDate(startCalculation.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayRating = ratingsMap[dateStr] || 0;

            if (dayRating > 0) {
                score += dayRating;
                lastWatchedDate = new Date(currentDate);
            } else if (lastWatchedDate) {
                const diffTime = currentDate.getTime() - lastWatchedDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 1) {
                    score = Math.max(0, score - 5);
                }
            }

            if (i >= (lookback - 60)) {
                data.push({
                    date: dateStr,
                    score: parseFloat(score.toFixed(1)),
                });
            }
        }
        return data;
    }, [watched]);

    const achievements = [
        { id: 'initiate', title: 'INICIADO', desc: 'TU PRIMER PASO', icon: '🎬', unlocked: watched.length > 0 },
        { id: 'critic', title: 'CRÍTICO', desc: 'EL ARTE DE JUZGAR', icon: '⭐', unlocked: watched.filter(m => m.rating > 0).length >= 10 },
        { id: 'world_tour', title: 'PASAPORTE', desc: 'CINE SIN FRONTERAS', icon: '🌎', unlocked: countryData.length >= 5 },
        { id: 'oscar_hunter', title: 'CAZADOR DE ORO', desc: 'EL PODER DE LA ACADEMIA', icon: '🏆', unlocked: oscarStats.count >= 5 },
        { id: 'explorer', title: 'EXPLORADOR', desc: 'DESCUBRIENDO TERRITORIOS', icon: '🔭', unlocked: radarData.consumption.length >= 5 },
        { id: 'cinephile', title: 'MAESTRO', desc: '50 VISIONES LOGRADAS', icon: '📽️', unlocked: watched.length >= 50 }
    ];

    const currentRadarData = radarMode === 'consumption' ? radarData.consumption : radarData.quality;

    const COLORS = ['#00F0FF', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981'];

    if (!user) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen pb-24 pt-12 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
            <header className="mb-2 md:mb-8 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-4 md:pb-6 gap-4">
                <div className="animate-slide-in-left">
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tight">
                        ADN <span className="text-primary">CINEMATOGRÁFICO</span>
                    </h1>
                    <p className="font-mono text-[10px] md:text-sm text-gray-400 uppercase tracking-widest">
                        ANÁLISIS DE TELEMETRÍA Y ESTADÍSTICAS
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 md:gap-8">
                    <div className="text-center md:text-right">
                        <span className="block font-mono text-[10px] text-gray-600 uppercase tracking-widest mb-1">Cine consumido</span>
                        <span className="text-3xl font-display font-bold text-white leading-none">{watched.length}</span>
                    </div>
                    <div className="text-center md:text-right border-l border-white/10 pl-4 md:pl-8">
                        <span className="block font-mono text-[10px] text-gray-600 uppercase tracking-widest mb-1">En lista de espera</span>
                        <span className="text-3xl font-display font-bold text-white opacity-40 leading-none">{watchlist.length}</span>
                    </div>
                </div>
            </header>

            {/* Top Grid: Rank & Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {/* Major Rank Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-1 md:col-span-2 p-8 rounded-[3rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 relative overflow-hidden group shadow-2xl"
                >
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                                    <TrophyIcon className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-display text-4xl text-white tracking-widest italic group-hover:text-primary transition-colors">{currentRank.title.toUpperCase()}</h3>
                                    <p className="font-mono text-xs text-gray-400 mt-1 max-w-sm font-bold opacity-70 tracking-tight">{currentRank.desc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-display font-bold text-white tracking-tight leading-none">{watched.length} <span className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1 block">Títulos</span></div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                                    Progreso al {watched.length >= 500 ? 'Nivel Máximo' : `Nivel ${watched.length >= nextRank.min ? nextRank.title : '???'}`}
                                </span>
                                <span className="font-mono text-xs text-primary font-bold">{Math.round(rankProgress)}%</span>
                            </div>
                            <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-primary/40 to-primary rounded-full shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rankProgress}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/20 transition-all duration-1000" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                </motion.div>

                {/* Stat Cards Stack */}
                <div className="flex flex-col gap-6">
                    <StatCard icon={ClockIcon} label="Tiempo de Vuelo" value={formatRuntime(runtimes)} />
                    <StatCard icon={FilmIcon} label="Academia (Oscar)" value={`${oscarStats.count}/${oscarStats.total}`} colorClass="text-yellow-500" />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Radar Chart (Genres) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md"
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
                        <div>
                            <h3 className="text-xl font-display font-bold text-white tracking-widest italic flex items-center gap-3">
                                <SparklesIcon className="w-5 h-5 text-primary" />
                                RADAR DE GÉNEROS
                            </h3>
                            <p className="text-[10px] font-mono text-gray-400 mt-1 font-black uppercase tracking-[0.2em]">Mapas de afinidad cinematográfica</p>
                        </div>
                        <div className="flex p-1 bg-black/40 border border-white/10 rounded-2xl w-full sm:w-auto">
                            <button
                                onClick={() => setRadarMode('consumption')}
                                className={cn(
                                    "flex-1 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                                    radarMode === 'consumption' ? "bg-primary text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                FRECUENCIA
                            </button>
                            <button
                                onClick={() => setRadarMode('quality')}
                                className={cn(
                                    "flex-1 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                                    radarMode === 'quality' ? "bg-pink-500 text-white" : "text-gray-500 hover:text-white"
                                )}
                            >
                                CALIDAD
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-[350px]">
                        {!statsLoading && currentRadarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={currentRadarData}>
                                    <PolarGrid stroke="#ffffff10" strokeDasharray="5 5" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#ffffff60', fontSize: 10, fontFamily: 'monospace', fontWeight: 900 }}
                                        tickFormatter={(val) => val.toUpperCase()}
                                    />
                                    <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, 'auto']}
                                        tick={false}
                                        axisLine={false}
                                    />
                                    <Radar
                                        name="Métrica"
                                        dataKey="A"
                                        stroke={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"}
                                        strokeWidth={3}
                                        fill={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"}
                                        fillOpacity={0.2}
                                        animationDuration={1500}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderRadius: '16px', border: '1px solid #ffffff10', color: '#fff' }}
                                        itemStyle={{ fontFamily: 'monospace', color: '#00F0FF', fontSize: '12px' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-700 animate-pulse">
                                <ChartBarIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-mono text-xs tracking-widest font-black uppercase">PENDIENTE DE DATOS</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Country Insights (NEW) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center"
                >
                    <div className="text-center mb-8">
                        <GlobeAltIcon className="w-10 h-10 text-primary/60 mx-auto mb-4" />
                        <h3 className="text-lg font-display font-bold text-white tracking-widest italic">PASAPORTE CULTURAL</h3>
                        <p className="text-[10px] font-mono text-gray-500 mt-1 font-black uppercase tracking-[0.2em]">Países de origen explorados</p>
                    </div>

                    <div className="w-full h-[220px] mb-8 relative">
                        {topCountries.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={topCountries}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="count"
                                        stroke="none"
                                    >
                                        {topCountries.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: '1px solid #ffffff15' }}
                                        itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center opacity-10">
                                <GlobeAltIcon className="w-20 h-20" />
                            </div>
                        )}
                    </div>

                    <div className="w-full space-y-4">
                        {topCountries.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors uppercase tracking-tight">{c.name}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-gray-600 italic">x{c.count}</span>
                            </div>
                        ))}
                        {countryData.length > 5 && (
                            <div className="pt-4 border-t border-white/5 text-center">
                                <span className="text-[10px] font-mono text-gray-600 font-bold uppercase tracking-widest">+{countryData.length - 5} otros territorios</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row: Pulse & Curve */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cine Pulse Chart */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden"
                >
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-display font-bold text-white tracking-widest flex items-center gap-3">
                                <FireIcon className="w-5 h-5 text-primary" />
                                PULSO CINÉFILO
                            </h3>
                            <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase font-black tracking-widest">Frecuencia cardíaca visual</p>
                        </div>
                        <div className="text-right">
                            <span className="font-display text-3xl text-primary font-bold">{(cinePulseData[cinePulseData.length - 1]?.score || 0).toFixed(1)}</span>
                        </div>
                    </div>
                    <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cinePulseData}>
                                <defs>
                                    <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.slice(8)}
                                    stroke="#ffffff10"
                                    tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 900 }}
                                    minTickGap={20}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: '1px solid #ffffff10' }}
                                    itemStyle={{ color: '#00F0FF', fontFamily: 'monospace', fontWeight: 900 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#00F0FF"
                                    fillOpacity={1}
                                    fill="url(#pulseGradient)"
                                    strokeWidth={4}
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Demand Curve */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5"
                >
                    <h3 className="font-display font-bold text-white tracking-widest mb-8 flex items-center gap-3">
                        <ChartBarIcon className="w-5 h-5 text-primary" />
                        CURVA DE EXIGENCIA
                    </h3>
                    <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratingDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="rating"
                                    stroke="#ffffff10"
                                    tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace', fontWeight: 900 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                                    contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: '1px solid #ffffff10' }}
                                    itemStyle={{ color: '#00F0FF', fontWeight: 900 }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#222"
                                    radius={[8, 8, 0, 0]}
                                    activeBar={{ fill: '#00F0FF', stroke: '#00F0FF', strokeWidth: 0 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest italic font-bold">
                        <span>Generoso</span>
                        <span>Exigente</span>
                    </div>
                </motion.div>
            </div>

            {/* Achievements Section */}
            <div className="pt-12">
                <div className="flex items-center gap-4 mb-10">
                    <span className="w-12 h-[1px] bg-white/10" />
                    <h3 className="font-mono text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">Archivos_de_Logro</h3>
                    <span className="flex-1 h-[1px] bg-white/10" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                    {achievements.map(badge => <AchievementBadge key={badge.id} {...badge} />)}
                </div>
            </div>
        </div>
    );
};

export default StatsView;
