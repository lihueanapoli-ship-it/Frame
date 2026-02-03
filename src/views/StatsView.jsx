import React, { useMemo, useState, useEffect } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, animate } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ClockIcon, StarIcon, TrophyIcon, FireIcon, FilmIcon, BookmarkIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import DynamicLogo from '../components/ui/DynamicLogo';
import { cn } from '../lib/utils';
import { getMovieDetails } from '../api/tmdb';
import { getGenresForMovies } from '../utils/genreCache';
import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================

// Immersive Cinema Ranks
// Max level implicitly around 500
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

// Helper: Convert mins to days/hours/min
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

// Colors
const COLORS = {
    background: '#050505',
    surface: '#121212',
    primary: '#00F0FF',
    text: '#E0E0E0',
    grid: '#333'
};

const RankCard = ({ rank, currentCount }) => {
    const isUnlocked = currentCount >= rank.min;

    return (
        <div className={cn(
            "flex items-center gap-3 p-2 rounded-md transition-colors",
            isUnlocked ? "text-primary" : "text-gray-600"
        )}>
            <div className={cn(
                "w-2 h-2 rounded-full",
                isUnlocked ? "bg-primary shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "bg-gray-800"
            )} />
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
    <div className={cn(
        "min-w-[140px] h-36 bg-surface border flex flex-col items-center justify-center p-4 transition-all duration-300 relative group overflow-hidden",
        unlocked
            ? "border-primary/30 bg-primary/5 hover:border-primary/60 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            : "border-white/5 opacity-40 grayscale"
    )}>
        {unlocked && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 blur-xl rounded-full" />}
        <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
            unlocked ? "bg-primary/20 text-primary" : "bg-white/5 text-gray-500"
        )}>
            <span className="text-2xl">{icon}</span>
        </div>
        <span className={cn("font-display font-bold text-xs text-center mb-1", unlocked ? "text-white" : "text-gray-500")}>{title}</span>
        <span className="font-mono text-[9px] text-center text-gray-500 leading-tight">{desc}</span>
    </div>
);
// Scratch that thought process, I will implement a proper 'Counter' component inside the file in the full tool call.

const Counter = ({ value }) => {
    const nodeRef = React.useRef();

    React.useEffect(() => {
        const node = nodeRef.current;
        const controls = animate(0, value, {
            duration: 1.5,
            ease: "circOut",
            onUpdate: (latest) => {
                if (node) node.textContent = typeof value === 'string' ? value : Math.round(latest);
            }
        });
        return () => controls.stop();
    }, [value]);

    return <span ref={nodeRef} />;
};

const StatCard = ({ label, value, subtext, icon: Icon, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-surface border border-white/5 p-4 md:p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:border-primary/30 transition-colors"
    >
        <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{label}</span>
            {Icon && <Icon className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />}
        </div>
        <div>
            <div className="text-2xl md:text-4xl font-display font-bold text-white mb-1 group-hover:text-primary transition-colors">
                {typeof value === 'number' ? <Counter value={value} /> : value}
            </div>
            {subtext && <div className="text-[10px] md:text-xs font-mono text-gray-500">{subtext}</div>}
        </div>
        {/* Light Leak */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
    </motion.div>
);



const StatsView = () => {
    const { watched, watchlist } = useMovies();
    const { user } = useAuth();

    // State for fetched genres
    const [movieGenres, setMovieGenres] = useState({});

    // UI State
    const [radarMode, setRadarMode] = useState('consumption'); // 'consumption' | 'quality'
    const [showAllRanks, setShowAllRanks] = useState(false);

    // Fetch movie details to get genres (since we strip them when saving)
    useEffect(() => {
        const fetchAllGenres = async () => {
            if (watched.length === 0) return;

            // Use our centralized cache utility to fetch ALL genres progressively
            // This handles rate limiting and caching automatically
            const cache = await getGenresForMovies(watched);

            // Transform cache format to what the view expects (retaining just genres for now)
            const genresOnly = {};
            Object.keys(cache).forEach(id => {
                genresOnly[id] = cache[id].genres;
            });

            setMovieGenres(genresOnly);
        };

        fetchAllGenres();
    }, [watched]); // Removed .length to detect deep changes if needed, but array ref change is enough

    // 1. Calculate Telemetry (Total Runtime)
    const runtimes = useMemo(() => {
        const totalMinutes = watched.reduce((acc, m) => acc + (m.runtime || 110), 0);
        return totalMinutes;
    }, [watched]);

    // 2. Rank Logic (New System)
    const currentRank = useMemo(() => {
        const count = watched.length;
        // Find the highest rank achieved. Clone to avoid mutating constant if sort used, but reverse creates new array on spread.
        return [...CINEMA_RANKS].reverse().find(r => count >= r.min) || CINEMA_RANKS[0];
    }, [watched]);

    const nextRank = useMemo(() => {
        const count = watched.length;
        return CINEMA_RANKS.find(r => r.min > count) || { min: 500, title: "Lumière Renacido", desc: "Eres el cine mismo." };
    }, [watched]);

    const rankProgress = useMemo(() => {
        const count = watched.length;
        if (count >= 500) return 100;

        // Calculate progress within current bracket
        const prevMin = currentRank.min;
        const targetMin = nextRank.min;
        const totalInBracket = targetMin - prevMin;
        const currentInBracket = count - prevMin;

        return Math.min(Math.max((currentInBracket / totalInBracket) * 100, 0), 100);
    }, [watched, currentRank, nextRank]);

    // 3. Oscar Progress
    const oscarStats = useMemo(() => {
        let count = 0;
        watched.forEach(m => {
            if (OSCAR_BEST_PICTURE_WINNERS.has(m.id)) count++;
        });
        return { count, total: OSCAR_BEST_PICTURE_WINNERS.size };
    }, [watched]);

    // 4. Genre Radar Data (Split Logic)
    const radarData = useMemo(() => {
        const consumption = {}; // Count
        const quality = {};     // Sum Ratings
        const qualityCounts = {}; // Count of rated movies per genre

        watched.forEach(movie => {
            const genres = movieGenres[movie.id];
            if (genres && genres.length > 0) {
                genres.forEach(g => {
                    // Consumption: Simple Frequency
                    consumption[g.name] = (consumption[g.name] || 0) + 1;

                    // Quality: Only user-rated movies
                    if (movie.rating && movie.rating > 0) {
                        quality[g.name] = (quality[g.name] || 0) + movie.rating;
                        qualityCounts[g.name] = (qualityCounts[g.name] || 0) + 1;
                    }
                });
            }
        });

        // Helper to format for Recharts
        const formatForRadar = (dataObj, isAverage = false) => {
            return Object.keys(dataObj)
                .map(k => ({
                    subject: k,
                    A: isAverage ? Math.round((dataObj[k] / qualityCounts[k]) * 10) / 10 : dataObj[k],
                    fullMark: isAverage ? 10 : Math.max(...Object.values(dataObj))
                }))
                .sort((a, b) => parseFloat(b.A) - parseFloat(a.A))
                .slice(0, 6); // Top 6
        };

        return {
            consumption: formatForRadar(consumption, false),
            quality: formatForRadar(quality, true)
        };
    }, [watched, movieGenres]);

    const currentRadarData = radarMode === 'consumption' ? radarData.consumption : radarData.quality;

    // 5. Rating Distribution (Histogram)
    const ratingDistribution = useMemo(() => {
        const dist = Array.from({ length: 11 }, (_, i) => ({ rating: i, count: 0 })); // 0-10
        watched.forEach(m => {
            const r = m.rating || 0;
            if (dist[r]) dist[r].count++;
        });
        return dist.filter(d => d.rating > 0);
    }, [watched]);

    // 6. CINE-PULSE (Electrocardiograma Logic)
    // Mountain/Stairs: +X per movie, -0.5 per day.
    const cinePulseData = useMemo(() => {
        const daysToShow = 60;
        const data = [];
        const today = new Date();
        const watchedMap = {};

        watched.forEach(m => {
            if (m.watchedAt) {
                const d = m.watchedAt.split('T')[0];
                watchedMap[d] = (watchedMap[d] || 0) + 1;
            }
        });

        // Calculate score with inertia
        let score = 0;
        const lookback = 90; // Calculate 90 days back for inertia, show 60

        const startCalculation = new Date(today);
        startCalculation.setDate(today.getDate() - lookback);

        for (let i = 0; i <= lookback; i++) {
            const currentDate = new Date(startCalculation);
            currentDate.setDate(startCalculation.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            const moviesWatched = watchedMap[dateStr] || 0;

            // Logic: Decrease by 0.5/day, Increase by 2/movie.
            score = Math.max(0, score - 0.5);
            score += (moviesWatched * 2);

            // Only push to data if within window
            if (i >= (lookback - daysToShow)) {
                data.push({
                    date: dateStr,
                    dayShort: currentDate.toLocaleDateString('es-ES', { weekday: 'narrow' }),
                    score: parseFloat(score.toFixed(1)),
                    movies: moviesWatched
                });
            }
        }
        return data;
    }, [watched]);

    // 7. Dynamic Achievements
    const achievements = [
        {
            id: 'initiate',
            title: 'INICIADO',
            desc: 'Viste tu primera película',
            icon: '🎬',
            unlocked: watched.length > 0
        },
        {
            id: 'critic',
            title: 'CRÍTICO',
            desc: 'Puntuaste 10 películas',
            icon: '⭐',
            unlocked: watched.filter(m => m.rating > 0).length >= 10
        },
        {
            id: 'explorer',
            title: 'EXPLORADOR',
            desc: 'Probaste 5 géneros distintos',
            icon: '🔭',
            // Need to safeguard against undefined if currentRadarData not ready, though it should be.
            unlocked: (radarMode === 'consumption' ? radarData.consumption : radarData.quality).length >= 5
        },
        {
            id: 'oscar_hunter',
            title: 'CAZADOR DE ORO',
            desc: 'Viste 5 ganadoras del Oscar',
            icon: '🏆',
            unlocked: oscarStats.count >= 5
        },
        {
            id: 'marathon',
            title: 'MARATONISTA',
            desc: '3 películas en un día',
            icon: '🔥',
            unlocked: cinePulseData.some(d => d.movies >= 3)
        },
        {
            id: 'cinephile',
            title: 'CINÉFILO',
            desc: 'Alcanzaste 50 películas',
            icon: '📽️',
            unlocked: watched.length >= 50
        }
    ];

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <p className="font-mono text-gray-500">INIT_SESSION_REQUIRED</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 pt-8 px-4 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-12 flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tight">
                        ADN <span className="text-primary">CINEMATOGRÁFICO</span>
                    </h1>
                    <p className="font-mono text-xs md:text-sm text-gray-400">
                        ANÁLISIS DE TELEMETRÍA :: USUARIO {user.displayName?.toUpperCase().split(' ')[0]}
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <div className="font-mono text-xs text-primary">{new Date().toLocaleDateString()}</div>
                    <div className="font-mono text-xs text-gray-500">ESTADO: ACTIVO</div>
                </div>
            </header>

            {/* Grid Layout - Modular */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. New Rank System - Spans 2 cols */}
                <div className="col-span-1 md:col-span-2 row-span-1 bg-surface border border-white/5 p-6 relative overflow-hidden group">
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
                            <button
                                onClick={() => setShowAllRanks(!showAllRanks)}
                                className="text-[10px] font-mono text-primary hover:text-white underline mb-1"
                            >
                                {showAllRanks ? 'OCULTAR NIVELES' : 'VER TODOS LOS RANGOS'}
                            </button>
                            <div className="font-display text-4xl text-white">{watched.length} <span className="text-sm text-gray-500 font-sans font-normal">películas</span></div>
                        </div>
                    </div>

                    {/* Rank Progress Bar */}
                    <div className="relative z-10 mb-6">
                        <div className="flex justify-between font-mono text-[10px] text-gray-500 mb-1">
                            <span>PROGRESO ACTUAL</span>
                            <span>SIGUIENTE: {nextRank.title.toUpperCase()} ({nextRank.min})</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${rankProgress}%` }}
                                transition={{ duration: 1.0, ease: 'easeOut' }}
                            />
                        </div>
                    </div>

                    {/* Expanded Ranks List (Dropdown) */}
                    <motion.div
                        initial={false}
                        animate={{ height: showAllRanks ? 'auto' : 0, opacity: showAllRanks ? 1 : 0 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="pt-4 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {CINEMA_RANKS.map((r) => (
                                <RankCard key={r.min} rank={r} currentCount={watched.length} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Oscar Progress embedded */}
                    <div className="relative z-10 mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-[10px] text-yellow-500 tracking-wider flex items-center gap-2">
                                <span className="text-base">🏆</span> CARRERA AL OSCAR
                            </span>
                            <span className="font-mono text-xs text-white">{oscarStats.count} / {oscarStats.total}</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-yellow-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(oscarStats.count / oscarStats.total) * 100}%` }}
                                transition={{ duration: 1.0, delay: 0.2 }}
                            />
                        </div>
                    </div>

                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                </div>

                {/* 2. Telemetry */}
                <div className="col-span-1 md:col-span-1 bg-surface border border-white/5 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2 text-gray-400">
                        <ClockIcon className="w-5 h-5" />
                        <span className="font-mono text-xs uppercase">TIEMPO EN VUELO</span>
                    </div>
                    <div className="font-display text-2xl text-white">{formatRuntime(runtimes)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{formatHumanRuntime(runtimes)}</div>
                </div>

                {/* 3. Watchlist Count */}
                <div className="col-span-1 md:col-span-1 bg-surface border border-white/5 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2 text-gray-400">
                        <BookmarkIcon className="w-5 h-5" />
                        <span className="font-mono text-xs uppercase">EN COLA</span>
                    </div>
                    <div className="font-display text-2xl text-white">{watchlist.length}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Objetivos pendientes</div>
                </div>

                {/* 4. Radar Chart - Dual Mode */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">RADAR DE GÉNEROS</h3>

                        {/* Mode Switcher */}
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setRadarMode('consumption')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-mono transition-all",
                                    radarMode === 'consumption' ? "bg-primary/20 text-primary border border-primary/20" : "text-gray-500 hover:text-white"
                                )}
                            >
                                MÁS VISTOS
                            </button>
                            <button
                                onClick={() => setRadarMode('quality')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-mono transition-all",
                                    radarMode === 'quality' ? "bg-pink-500/20 text-pink-500 border border-pink-500/20" : "text-gray-500 hover:text-white"
                                )}
                            >
                                MEJOR PUNTUADOS
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-[250px] relative">
                        {currentRadarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={currentRadarData}>
                                    <PolarGrid stroke="#333" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                    <Radar
                                        name={radarMode === 'consumption' ? "Vistos" : "Rating Promedio"}
                                        dataKey="A"
                                        stroke={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"}
                                        strokeWidth={2}
                                        fill={radarMode === 'consumption' ? "#00F0FF" : "#EC4899"}
                                        fillOpacity={0.2}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff' }}
                                        itemStyle={{ color: radarMode === 'consumption' ? '#00F0FF' : '#EC4899', fontFamily: 'monospace' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-600 font-mono text-xs">
                                Insuficientes datos para generar radar
                            </div>
                        )}

                        {/* Legend Overlay */}
                        <div className="absolute bottom-0 right-0 text-[10px] font-mono text-gray-500 text-right">
                            {radarMode === 'consumption' ? 'Basado en frecuencia' : 'Basado en promedio (1-10)'}
                        </div>
                    </div>
                </div>

                {/* 5. Rating Histogram - Spans 2 cols */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col min-h-[350px]">
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

                {/* 6. CINE-PULSE (Replaces Heatmap) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-surface border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-mono text-xs text-primary uppercase tracking-widest flex items-center gap-2">
                                <FireIcon className="w-4 h-4" /> PULSO CINÉFILO (ÚLTIMOS 60 DÍAS)
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1 font-mono">Tu ritmo cardíaco de consumo. Sube al ver películas, decae con la inactividad.</p>
                        </div>
                    </div>

                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={cinePulseData}>
                                <defs>
                                    <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                    stroke="#333"
                                    tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
                                    minTickGap={30}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ color: '#00F0FF', fontFamily: 'monospace' }}
                                    labelFormatter={(label) => `Fecha: ${label}`}
                                    formatter={(value, name) => [value, name === 'score' ? 'Nivel de Pulso' : 'Películas']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#00F0FF"
                                    fillOpacity={1}
                                    fill="url(#pulseGradient)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Achievement Badges (Enhanced) */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-mono text-xs text-gray-500 uppercase">LOGROS TÉCNICOS</h3>
                    <span className="font-mono text-xs text-primary">{achievements.filter(a => a.unlocked).length} / {achievements.length} DESBLOQUEADOS</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {achievements.map(badge => (
                        <AchievementBadge key={badge.id} {...badge} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatsView;
