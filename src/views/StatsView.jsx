import React, { useMemo } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ClockIcon, StarIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/solid';
import DynamicLogo from '../components/ui/DynamicLogo';

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
                {value}
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

    // 3. Genre Radar Data
    const genreData = useMemo(() => {
        const counts = {};
        watched.forEach(m => {
            m.genre_ids?.forEach(id => {
                // Map IDs to Names
                // Simple mapping for demo
                const map = { 28: 'Acción', 12: 'Aventura', 18: 'Drama', 35: 'Comedia', 27: 'Terror', 878: 'Sci-Fi' };
                const name = map[id] || 'Otros';
                if (name !== 'Otros') counts[name] = (counts[name] || 0) + 1;
            });
        });

        // Transform to Array
        return Object.keys(counts).map(key => ({
            subject: key,
            A: counts[key],
            fullMark: watched.length // Normalize?
        })).slice(0, 6); // Top 6 genres
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
                    <div className="flex-1 w-full h-full min-h-[250px]">
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

                {/* 5. Placeholder for Histogram / Activity (Simple Version) */}
                <div className="col-span-1 md:col-span-2 bg-surface border border-white/5 p-6 flex flex-col justify-center items-center text-center">
                    <FireIcon className="w-10 h-10 text-gray-700 mb-2" />
                    <p className="font-mono text-xs text-gray-500">MÓDULO "PULSO CINÉFILO" EN CONSTRUCCIÓN</p>
                    <p className="font-display text-xl text-gray-400 mt-2">Próximamente: Heatmap de Actividad</p>
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
