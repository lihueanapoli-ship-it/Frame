import React, { useMemo, useState, useEffect } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, animate } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ClockIcon, StarIcon, TrophyIcon, FireIcon, FilmIcon, BookmarkIcon } from '@heroicons/react/24/solid';
import DynamicLogo from '../components/ui/DynamicLogo';
import { cn } from '../lib/utils';
import { getMovieDetails } from '../api/tmdb';
import { getGenresForMovies } from '../utils/genreCache';
import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';

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

const AnimatedCounter = ({ value, duration = 2 }) => {
    const { number } = useSpring({
        from: { number: 0 },
        number: value,
        delay: 200,
        config: { mass: 1, tension: 20, friction: 10 },
    }); // Correction: framer-motion doesn't use 'useSpring' this way for numbers easily in direct render without a MotionValue.
    // Let's use a simpler approach with framer-motion's animate() or just a custom hook?
    // Actually, let's use a cleaner custom hook approach using `animate` provided by framer-motion which is the modern way.

    return <span>{value}</span>; // Placeholder, I will fix this in the main tool call below properly.
};
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

const StatsView = () => {
    const { watched, watchlist } = useMovies();
    const { user } = useAuth();

    // State for fetched genres
    const [movieGenres, setMovieGenres] = useState({});

    // UI State
    const [radarMode, setRadarMode] = useState('consumption'); // 'consumption' | 'quality'

    // Fetch movie details to get genres (since we strip them when saving)
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

    // 2. Rank Logic
    const rank = useMemo(() => {
        const count = watched.length;
        if (count > 200) return "Director de Culto";
        if (count > 100) return "Productor Ejecutivo";
        if (count > 50) return "Editor Jefe";
        if (count > 20) return "Asistente de Dirección";
        if (count > 5) return "Asistente de Cámara";
        return "Claquetista";
    }, [watched]);

    const rankProgress = Math.min((watched.length / 50) * 100, 100);

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

    // 6. Heatmap Data
    const heatmapData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (52 * 7) + 1);

        const formatDate = (d) => d.toISOString().split('T')[0];

        const watchedMap = {};
        let maxInDay = 0;

        watched.forEach(m => {
            if (m.watchedAt) {
                const d = m.watchedAt.split('T')[0];
                watchedMap[d] = (watchedMap[d] || 0) + 1;
                if (watchedMap[d] > maxInDay) maxInDay = watchedMap[d];
            }
        });

        let current = new Date(startDate);
        for (let w = 0; w < 52; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = formatDate(current);
                week.push({
                    date: dateStr,
                    count: watchedMap[dateStr] || 0
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
        }
        return { weeks, maxInDay };
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
            unlocked: currentRadarData.length >= 5
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
            unlocked: heatmapData.maxInDay >= 3
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

                {/* 1. Rank & Progress - Spans 2 cols */}
                <div className="col-span-1 md:col-span-2 row-span-1 bg-surface border border-white/5 p-6 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <TrophyIcon className="w-8 h-8 text-yellow-500" />
                            <div>
                                <h3 className="font-display text-2xl text-white">{rank}</h3>
                                <p className="font-mono text-xs text-gray-500">NIVEL ACTUAL</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-display text-4xl text-primary">{watched.length}</span>
                            <span className="text-sm text-gray-500 block">PELÍCULAS</span>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="mb-2 flex justify-between font-mono text-[10px] text-gray-500">
                        <span>XP NIVEL</span>
                        <span>{Math.round(rankProgress)}%</span>
                    </div>
                    <div className="relative h-1.5 bg-gray-800 w-full rounded-full overflow-hidden mb-6">
                        <motion.div
                            className="absolute top-0 bottom-0 left-0 bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${rankProgress}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </div>

                    {/* Oscar Progress (New Feature) */}
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🏆</span>
                            <span className="font-bold text-white text-sm">Progreso Oscars</span>
                        </div>
                        <span className="font-mono text-xs text-yellow-500">{oscarStats.count} / {oscarStats.total}</span>
                    </div>
                    <div className="relative h-2 bg-gray-800 w-full rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-700 to-yellow-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${(oscarStats.count / oscarStats.total) * 100}%` }}
                            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
                        />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 font-mono">
                        Has visto el {Math.round((oscarStats.count / oscarStats.total) * 100)}% de las ganadoras a Mejor Película.
                    </p>
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

                {/* 6. Activity Heatmap - Spans Full Width */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-surface border border-white/5 p-6 overflow-x-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">PULSO CINÉFILO (ÚLTIMOS 365 DÍAS)</h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <span>MENOS</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-[#1f1f1f] rounded-sm" />
                                <div className="w-2 h-2 bg-[#0e4429] rounded-sm" />
                                <div className="w-2 h-2 bg-[#006d32] rounded-sm" />
                                <div className="w-2 h-2 bg-[#26a641] rounded-sm" />
                                <div className="w-2 h-2 bg-[#39d353] rounded-sm" />
                            </div>
                            <span>MÁS</span>
                        </div>
                    </div>

                    <div className="flex gap-1 min-w-[800px]">
                        {heatmapData.weeks.map((week, wIndex) => (
                            <div key={wIndex} className="flex flex-col gap-1">
                                {week.map((day, dIndex) => (
                                    <div
                                        key={`${wIndex}-${dIndex}`}
                                        className={cn(
                                            "w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-white/50",
                                            day.count === 0 ? "bg-[#1f1f1f]" :
                                                day.count === 1 ? "bg-[#00F0FF]/20" :
                                                    day.count === 2 ? "bg-[#00F0FF]/40" :
                                                        day.count === 3 ? "bg-[#00F0FF]/60" :
                                                            "bg-[#00F0FF]"
                                        )}
                                        title={`${day.date}: ${day.count} películas`}
                                    />
                                ))}
                            </div>
                        ))}
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
