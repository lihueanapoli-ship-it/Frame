import React, { useMemo, useState, useEffect } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, animate } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ClockIcon, StarIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/solid';
import DynamicLogo from '../components/ui/DynamicLogo';
import { cn } from '../lib/utils';
import { getMovieDetails } from '../api/tmdb';

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

const StatsView = () => {
    const { watched, watchlist } = useMovies();
    const { user } = useAuth();

    // State for fetched genres
    const [movieGenres, setMovieGenres] = useState({});

    // Fetch movie details to get genres (since we strip them when saving)
    useEffect(() => {
        const fetchGenres = async () => {
            const genreMap = {};

            // Fetch details for up to 30 most recent movies
            const moviesToFetch = watched.slice(0, 30);

            const promises = moviesToFetch.map(async (movie) => {
                try {
                    const details = await getMovieDetails(movie.id);
                    if (details && details.genres) {
                        genreMap[movie.id] = details.genres;
                    }
                } catch (err) {
                    console.warn('[StatsView] Failed to fetch genres for:', movie.id);
                }
            });

            await Promise.all(promises);
            setMovieGenres(genreMap);
        };

        if (watched.length > 0) {
            fetchGenres();
        }
    }, [watched.length]); // Re-fetch when watched count changes

    // 1. Calculate Telemetry (Total Runtime)
    const runtimes = useMemo(() => {
        // Assuming 'runtime' exists in movie object. If not, we estimate 120min.
        const totalMinutes = watched.reduce((acc, m) => acc + (m.runtime || 110), 0);
        return totalMinutes;
    }, [watched]);

    // 2. Rank Logic
    const rank = useMemo(() => {
        const count = watched.length;
        if (count > 50) return "Director de Culto";
        if (count > 15) return "Editor Jefe";
        if (count > 5) return "Asistente de Cámara";
        return "Claquetista";
    }, [watched]);

    const rankProgress = Math.min((watched.length / 50) * 100, 100);

    // 3. Genre Radar Data - Using fetched genres
    const genreData = useMemo(() => {
        const counts = {};

        // Count genres from fetched data
        watched.forEach(movie => {
            const genres = movieGenres[movie.id];
            if (genres && genres.length > 0) {
                genres.forEach(genre => {
                    counts[genre.name] = (counts[genre.name] || 0) + 1;
                });
            }
        });

        // Transform to Array, Sort by Count, Take top 5
        const sorted = Object.keys(counts)
            .map(key => ({
                subject: key,
                A: counts[key],
                fullMark: Math.max(...Object.values(counts))
            }))
            .sort((a, b) => b.A - a.A)
            .slice(0, 5); // Top 5 géneros

        // If no data yet, return placeholder
        if (sorted.length === 0) {
            return [
                { subject: 'Cargando...', A: 0, fullMark: 1 }
            ];
        }

        return sorted;
    }, [watched, movieGenres]);

    // 4. Rating Distribution (Histogram)
    const ratingDistribution = useMemo(() => {
        const dist = Array.from({ length: 11 }, (_, i) => ({ rating: i, count: 0 })); // 0-10
        watched.forEach(m => {
            const r = m.rating || 0;
            if (dist[r]) dist[r].count++;
        });
        return dist.filter(d => d.rating > 0); // Don't show unrated (0)
    }, [watched]);

    // 5. Heatmap Data (Last 52 weeks)
    const heatmapData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        // Go back 52 weeks * 7 days
        // We want 52 columns (weeks), 7 rows (days)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (52 * 7) + 1); // Approx start

        // Helper to formatting YYYY-MM-DD
        const formatDate = (d) => d.toISOString().split('T')[0];

        // Map watched dates
        const watchedMap = {};
        watched.forEach(m => {
            if (m.watchedAt) {
                const d = m.watchedAt.split('T')[0];
                watchedMap[d] = (watchedMap[d] || 0) + 1;
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
        return weeks;
    }, [watched]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1"> {/* 1px gap for grid aesthetic? No, let's use standard gap-4 but mimic grid lines if possible. For now gap-4 is fine */}

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
                    {/* Progress Bar Timeline */}
                    <div className="relative h-2 bg-gray-800 w-full rounded-full overflow-hidden">
                        <motion.div
                            className="absolute top-0 bottom-0 left-0 bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${rankProgress}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-500">
                        <span>CLAQUETISTA</span>
                        <span>DIRECTOR DE CULTO</span>
                    </div>
                </div>

                {/* 2. Telemetry */}
                <div className="col-span-1 md:col-span-1">
                    <StatCard
                        label="TIEMPO EN VUELO"
                        value={formatRuntime(runtimes)}
                        subtext={formatHumanRuntime(runtimes)}
                        icon={ClockIcon}
                        delay={0.1}
                    />
                </div>

                {/* 3. Watchlist Count */}
                <div className="col-span-1 md:col-span-1">
                    <StatCard
                        label="EN COLA"
                        value={watchlist.length}
                        subtext="Objetivos pendientes"
                        icon={StarIcon}
                        delay={0.2}
                    />
                </div>

                {/* 4. Radar Chart - Spans 2 cols, 2 rows */}
                <div className="col-span-1 md:col-span-2 row-span-2 bg-surface border border-white/5 p-4 min-h-[300px] flex flex-col">
                    <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-4">RADAR DE GÉNEROS</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={genreData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="Géneros"
                                    dataKey="A"
                                    stroke="#00F0FF"
                                    strokeWidth={2}
                                    fill="#00F0FF"
                                    fillOpacity={0.2}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#121212', borderColor: '#333', color: '#fff' }}
                                    itemStyle={{ color: '#00F0FF', fontFamily: 'monospace' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. Rating Histogram - Spans 2 cols */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col min-h-[300px]">
                    <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-4">CURVA DE EXIGENCIA</h3>
                    <div className="flex-1 w-full h-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
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

                {/* 6. Activity Heatmap - Spans Full Width (4 cols) on large screens */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-surface border border-white/5 p-6 overflow-x-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">PULSO CINÉFILO (ÚlTIMOS 365 DÍAS)</h3>
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

                    {/* Github Style Grid */}
                    <div className="flex gap-1 min-w-[800px]">
                        {heatmapData.map((week, wIndex) => (
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

            {/* Achievement Badges (Simple Row) */}
            <div className="mt-8">
                <h3 className="font-mono text-xs text-gray-500 uppercase mb-4">LOGROS TÉCNICOS</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                    {/* Badge 1 */}
                    <div className="min-w-[120px] h-32 bg-surface border border-white/5 flex flex-col items-center justify-center p-3 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <span className="text-xl">☀️</span>
                        </div>
                        <span className="font-mono text-[10px] text-center text-gray-400">EMBAJADOR LOCAL</span>
                    </div>
                    <div className="min-w-[120px] h-32 bg-surface border border-white/5 flex flex-col items-center justify-center p-3 border-primary/50 bg-primary/5">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                            <span className="text-xl">🎬</span>
                        </div>
                        <span className="font-mono text-[10px] text-center text-white">INICIADO</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsView;
