import React, { useMemo, useState, useEffect } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { ClockIcon, TrophyIcon, FireIcon, BookmarkIcon, UserPlusIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { getGenresForMovies } from '../utils/genreCache';
import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';
import UserSearchModal from '../components/ui/UserSearchModal';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================

const CINEMA_RANKS = [
    { min: 0, title: "Turista de Estudio", desc: "Acabas de entrar al set." },
    { min: 10, title: "Extra de Fondo", desc: "Ya sabes dónde pararte." },
    { min: 25, title: "Claquetista", desc: "¡Luces, cámara, acción!" },
    { min: 50, title: "Focus Puller", desc: "Manteniendo la nitidez." },
    { min: 100, title: "Montajista", desc: "Creando narrativa en las sombras." },
    { min: 200, title: "Director de Fotografía", desc: "Pintando con luz." },
    { min: 300, title: "Guionista Auteur", desc: "La pluma es más fuerte que el lente." },
    { min: 400, title: "Productor Visionario", desc: "Haces que lo imposible suceda." },
    { min: 480, title: "Arquitecto de Sueños", desc: "Construyes realidades." },
    { min: 500, title: "Lumière Renacido", desc: "Eres el cine mismo." }
];

const formatRuntime = (mins) => {
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const minutes = mins % 60;
    return `${days}d ${hours}h ${minutes}m`;
};

const formatHumanRuntime = (mins) => {
    const hours = (mins / 60).toFixed(1);
    return `Equivale a ${hours} horas de vida dedicados al cine`;
};

const RankCard = ({ rank, currentCount }) => {
    const isUnlocked = currentCount >= rank.min;
    return (
        <div className={cn("flex items-center gap-3 p-2 rounded-md transition-colors", isUnlocked ? "text-primary" : "text-gray-600")}>
            <div className={cn("w-2 h-2 rounded-full", isUnlocked ? "bg-primary shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "bg-gray-800")} />
            <div className="flex-1">
                <div className="flex justify-between items-baseline">
                    <span className="font-display font-bold text-xs">{rank.title.toUpperCase()}</span>
                    <span className="font-mono text-[10px] opacity-60">{rank.min} pelis</span>
                </div>
                {isUnlocked && <p className="text-[10px] font-mono opacity-80 leading-none mt-0.5">{rank.desc}</p>}
            </div>
        </div>
    );
};

const AchievementBadge = ({ icon, title, desc, unlocked }) => (
    <div className={cn("min-w-[140px] h-36 bg-surface border flex flex-col items-center justify-center p-4 transition-all duration-300 relative group overflow-hidden", unlocked ? "border-primary/30 bg-primary/5 hover:border-primary/60" : "border-white/5 opacity-40 grayscale")}>
        {unlocked && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 blur-xl rounded-full" />}
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110", unlocked ? "bg-primary/20 text-primary" : "bg-white/5 text-gray-500")}>
            <span className="text-2xl">{icon}</span>
        </div>
        <span className={cn("font-display font-bold text-xs text-center mb-1", unlocked ? "text-white" : "text-gray-500")}>{title}</span>
        <span className="font-mono text-[9px] text-center text-gray-500 leading-tight">{desc}</span>
    </div>
);

const StatsView = () => {
    const { watched, watchlist } = useMovies();
    const { user } = useAuth();

    // View State
    const [movieGenres, setMovieGenres] = useState({});
    const [radarMode, setRadarMode] = useState('consumption');
    const [showAllRanks, setShowAllRanks] = useState(false);

    // Modal State for Friend Search
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Genre Fetching
    useEffect(() => {
        const fetchAllGenres = async () => {
            if (watched.length === 0) return;
            const cache = await getGenresForMovies(watched);
            const genresOnly = {};
            Object.keys(cache).forEach(id => { genresOnly[id] = cache[id].genres; });
            setMovieGenres(genresOnly);
        };
        fetchAllGenres();
    }, [watched]);

    // Calculations
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
            const genres = movieGenres[movie.id];
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
    }, [watched, movieGenres]);

    const currentRadarData = radarMode === 'consumption' ? radarData.consumption : radarData.quality;
    const ratingDistribution = useMemo(() => {
        const dist = Array.from({ length: 11 }, (_, i) => ({ rating: i, count: 0 }));
        watched.forEach(m => { const r = m.rating || 0; if (dist[r]) dist[r].count++; });
        return dist.filter(d => d.rating > 0);
    }, [watched]);

    const cinePulseData = useMemo(() => {
        const data = []; const today = new Date(); const watchedMap = {};
        watched.forEach(m => { if (m.watchedAt) { const d = m.watchedAt.split('T')[0]; watchedMap[d] = (watchedMap[d] || 0) + 1; } });
        let score = 0; const lookback = 90; const startCalculation = new Date(today); startCalculation.setDate(today.getDate() - lookback);
        for (let i = 0; i <= lookback; i++) {
            const currentDate = new Date(startCalculation); currentDate.setDate(startCalculation.getDate() + i); const dateStr = currentDate.toISOString().split('T')[0];
            const moviesWatched = watchedMap[dateStr] || 0; score = Math.max(0, score - 0.5); score += (moviesWatched * 2);
            if (i >= (lookback - 60)) { data.push({ date: dateStr, score: parseFloat(score.toFixed(1)), movies: moviesWatched }); }
        }
        return data;
    }, [watched]);

    const achievements = [
        { id: 'initiate', title: 'INICIADO', desc: 'Viste tu primera película', icon: '🎬', unlocked: watched.length > 0 },
        { id: 'critic', title: 'CRÍTICO', desc: 'Puntuaste 10 películas', icon: '⭐', unlocked: watched.filter(m => m.rating > 0).length >= 10 },
        { id: 'explorer', title: 'EXPLORADOR', desc: 'Probaste 5 géneros distintos', icon: '🔭', unlocked: currentRadarData.length >= 5 },
        { id: 'oscar_hunter', title: 'CAZADOR DE ORO', desc: 'Viste 5 ganadoras del Oscar', icon: '🏆', unlocked: oscarStats.count >= 5 },
        { id: 'cinephile', title: 'CINÉFILO', desc: 'Alcanzaste 50 películas', icon: '📽️', unlocked: watched.length >= 50 }
    ];

    if (!user) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen pb-24 pt-8 px-4 md:px-8 max-w-7xl mx-auto">
            {/* HERITAGE HEADER */}
            <header className="mb-12 flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tight">
                        ADN <span className="text-primary">CINEMATOGRÁFICO</span>
                    </h1>
                    <p className="font-mono text-xs md:text-sm text-gray-400">
                        ANÁLISIS DE TELEMETRÍA :: USUARIO {user.displayName?.toUpperCase().split(' ')[0]}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Add Friends Button - Minimalist addition */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-white/10 rounded-full text-xs font-mono text-gray-400 hover:text-white hover:border-white/30 transition-all"
                        title="Buscar Amigos"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        <span className="hidden md:inline">AÑADIR AMIGOS</span>
                    </button>

                    <div className="hidden md:block text-right">
                        <div className="font-mono text-xs text-primary">{new Date().toLocaleDateString()}</div>
                        <div className="font-mono text-xs text-gray-500">ESTADO: ACTIVO</div>
                    </div>
                </div>
            </header>

            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Rank Card */}
                <div className="col-span-1 md:col-span-2 row-span-1 bg-surface border border-white/5 p-6 relative overflow-hidden group rounded-xl">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                <TrophyIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-display text-2xl text-white tracking-wide">{currentRank.title.toUpperCase()}</h3>
                                <p className="font-mono text-xs text-gray-400 max-w-[200px]">{currentRank.desc}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <button onClick={() => setShowAllRanks(!showAllRanks)} className="text-[10px] font-mono text-primary hover:text-white underline mb-1">{showAllRanks ? 'OCULTAR' : 'VER TODOS'}</button>
                            <div className="font-display text-4xl text-white">{watched.length} <span className="text-sm text-gray-500 font-sans font-normal">películas</span></div>
                        </div>
                    </div>
                    <div className="relative z-10 mb-6">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${rankProgress}%` }} transition={{ duration: 1.0 }} />
                        </div>
                    </div>
                    <motion.div initial={false} animate={{ height: showAllRanks ? 'auto' : 0, opacity: showAllRanks ? 1 : 0 }} className="overflow-hidden border-t border-white/5">
                        <div className="pt-4 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {CINEMA_RANKS.map((r) => <RankCard key={r.min} rank={r} currentCount={watched.length} />)}
                        </div>
                    </motion.div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                </div>

                {/* 2. Telemetry */}
                <div className="col-span-1 md:col-span-1 bg-surface border border-white/5 p-6 flex flex-col justify-center rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-400"><ClockIcon className="w-5 h-5" /><span className="font-mono text-xs uppercase">TIEMPO EN VUELO</span></div>
                    <div className="font-display text-2xl text-white">{formatRuntime(runtimes)}</div>
                </div>
                {/* 3. Watchlist Count */}
                <div className="col-span-1 md:col-span-1 bg-surface border border-white/5 p-6 flex flex-col justify-center rounded-xl">
                    <div className="flex items-center gap-3 mb-2 text-gray-400"><BookmarkIcon className="w-5 h-5" /><span className="font-mono text-xs uppercase">EN COLA</span></div>
                    <div className="font-display text-2xl text-white">{watchlist.length}</div>
                </div>

                {/* 4. Radar */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col min-h-[350px] rounded-xl">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">RADAR DE GÉNEROS</h3>
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                            <button onClick={() => setRadarMode('consumption')} className={cn("px-3 py-1 rounded-md text-[10px] font-mono transition-all", radarMode === 'consumption' ? "bg-primary/20 text-primary" : "text-gray-500")}>FRECUENCIA</button>
                            <button onClick={() => setRadarMode('quality')} className={cn("px-3 py-1 rounded-md text-[10px] font-mono transition-all", radarMode === 'quality' ? "bg-pink-500/20 text-pink-500" : "text-gray-500")}>CALIDAD</button>
                        </div>
                    </div>
                    <div className="w-full h-[250px] relative">
                        {currentRadarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={currentRadarData}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar name="Stats" dataKey="A" stroke={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"} strokeWidth={2} fill={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"} fillOpacity={0.2} />
                                    <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff' }} itemStyle={{ color: '#00F0FF', fontFamily: 'monospace' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-xs text-gray-600">FALTAN DATOS</div>}
                    </div>
                </div>

                {/* 5. Rating Histogram - Spans 2 cols (Restored) */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col min-h-[350px] rounded-xl">
                    <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-4">CURVA DE EXIGENCIA</h3>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={ratingDistribution}>
                                <XAxis dataKey="rating" stroke="#333" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }} />
                                <Tooltip
                                    cursor={{ fill: '#18181b' }}
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ color: '#00F0FF', fontFamily: 'monospace' }}
                                />
                                <Bar dataKey="count" fill="#333" radius={[2, 2, 0, 0]} activeBar={{ fill: '#00F0FF' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 6. Pulse */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-surface border border-white/5 p-6 rounded-xl">
                    <h3 className="font-mono text-xs text-primary uppercase tracking-widest flex items-center gap-2 mb-4"><FireIcon className="w-4 h-4" /> PULSO CINÉFILO</h3>
                    <div className="w-full h-[200px]">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={cinePulseData}>
                                <defs><linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#00F0FF" stopOpacity={0} /></linearGradient></defs>
                                <XAxis dataKey="date" tickFormatter={(val) => val.slice(5)} stroke="#333" tick={{ fill: '#6B7280', fontSize: 10 }} minTickGap={30} />
                                <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333' }} />
                                <Area type="monotone" dataKey="score" stroke="#00F0FF" fillOpacity={1} fill="url(#pulseGradient)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Achievements */}
            <div className="mt-8">
                <h3 className="font-mono text-xs text-gray-500 uppercase mb-4">LOGROS</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {achievements.map(badge => <AchievementBadge key={badge.id} {...badge} />)}
                </div>
            </div>

            {/* Friend Search Modal */}
            <UserSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
};

export default StatsView;
