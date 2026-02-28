import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, FunnelIcon, GlobeAltIcon, TagIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { getCountries } from '../../api/tmdb';

const GENRES = [
    { id: 28, name: 'Acción' }, { id: 12, name: 'Aventura' }, { id: 16, name: 'Animación' },
    { id: 35, name: 'Comedia' }, { id: 80, name: 'Crimen' }, { id: 99, name: 'Documental' },
    { id: 18, name: 'Drama' }, { id: 10751, name: 'Familia' }, { id: 14, name: 'Fantasía' },
    { id: 36, name: 'Historia' }, { id: 27, name: 'Terror' }, { id: 10402, name: 'Música' },
    { id: 9648, name: 'Misterio' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Ciencia ficción' },
    { id: 53, name: 'Suspense' }, { id: 10752, name: 'Bélica' }, { id: 37, name: 'Western' }
];

const COMMON_COUNTRIES = [
    { code: 'US', name: 'Estados Unidos' }, { code: 'GB', name: 'Reino Unido' },
    { code: 'ES', name: 'España' }, { code: 'AR', name: 'Argentina' },
    { code: 'MX', name: 'México' }, { code: 'FR', name: 'Francia' },
    { code: 'KR', name: 'Corea del Sur' }, { code: 'JP', name: 'Japón' },
    { code: 'BR', name: 'Brasil' }, { code: 'IT', name: 'Italia' },
    { code: 'DE', name: 'Alemania' }, { code: 'IN', name: 'India' }
];

const ExclusionModal = ({ isOpen, onClose, preferences, onSave, recommendations = [] }) => {
    const [excludedGenres, setExcludedGenres] = useState(preferences?.excludedGenres || []);
    const [excludedCountries, setExcludedCountries] = useState(preferences?.excludedCountries || []);
    const [allCountries, setAllCountries] = useState(COMMON_COUNTRIES);
    const [activeTab, setActiveTab] = useState('genres');
    const [searchTerm, setSearchTerm] = useState('');
    const [countryCounts, setCountryCounts] = useState({});

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            fetchCountries();
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const fetchCountries = async () => {
        const counts = {};
        recommendations.forEach(movie => {
            const processedCodes = new Set();
            let originCountries = movie.origin_country || [];
            if (typeof originCountries === 'string') originCountries = [originCountries];
            originCountries.forEach(code => {
                const upperCode = (code || '').toUpperCase();
                if (upperCode && !processedCodes.has(upperCode)) {
                    counts[upperCode] = (counts[upperCode] || 0) + 1;
                    processedCodes.add(upperCode);
                }
            });
            const prodCountries = movie.production_countries || [];
            prodCountries.forEach(c => {
                const upperCode = (c.iso_3166_1 || '').toUpperCase();
                if (upperCode && !processedCodes.has(upperCode)) {
                    counts[upperCode] = (counts[upperCode] || 0) + 1;
                    processedCodes.add(upperCode);
                }
            });
        });
        setCountryCounts(counts);

        const countries = await getCountries();
        if (countries && countries.length > 0) {
            const sorted = countries
                .map(c => ({
                    code: c.iso_3166_1,
                    name: c.native_name || c.english_name,
                    count: counts[c.iso_3166_1] || 0
                }))
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
            setAllCountries(sorted);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-[calc(100%-2rem)] sm:w-full max-w-7xl bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden h-[92vh] sm:h-[94vh] my-auto flex flex-col"
                >
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><FunnelIcon className="w-5 h-5 text-primary" /></div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-display">Filtros de ADN</h2>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Personaliza tus recomendaciones</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex border-b border-white/5 bg-white/[0.01]">
                        {['genres', 'countries'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-b-2",
                                    activeTab === tab ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-500 hover:text-gray-200"
                                )}
                            >
                                {tab === 'genres' ? <TagIcon className="w-4 h-4" /> : <GlobeAltIcon className="w-4 h-4" />}
                                {tab === 'genres' ? 'Géneros' : 'Países'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        {activeTab === 'genres' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {GENRES.map(genre => (
                                    <button
                                        key={genre.id}
                                        onClick={() => setExcludedGenres(prev => prev.includes(genre.id) ? prev.filter(id => id !== genre.id) : [...prev, genre.id])}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                                            excludedGenres.includes(genre.id) ? "bg-red-500/10 border-red-500/50 text-white" : "bg-white/[0.03] border-white/5"
                                        )}
                                    >
                                        <span className="font-bold text-sm">{genre.name}</span>
                                        {excludedGenres.includes(genre.id) ? <XMarkIcon className="w-5 h-5 text-red-500" /> : <div className="w-5 h-5 rounded-full border border-white/10" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input type="text" placeholder="Buscar país..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-white text-base focus:outline-none focus:border-primary/40" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {allCountries.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(country => (
                                        <button
                                            key={country.code}
                                            onClick={() => setExcludedCountries(prev => prev.includes(country.code) ? prev.filter(cd => cd !== country.code) : [...prev, country.code])}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                                excludedCountries.includes(country.code) ? "bg-red-500/10 border-red-500/50 text-white" : "bg-white/[0.03] border-white/5"
                                            )}
                                        >
                                            <div className="truncate">
                                                <p className="font-bold text-sm truncate">{country.name}</p>
                                                {country.count > 0 && <p className="text-[10px] text-primary font-mono font-bold">{country.count} pelis</p>}
                                            </div>
                                            {excludedCountries.includes(country.code) ? <GlobeAltIcon className="w-5 h-5 text-red-500" /> : <div className="w-5 h-5 rounded-full border border-white/10" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold transition-all">Cancelar</button>
                        <button onClick={() => { onSave({ ...preferences, excludedGenres, excludedCountries }); onClose(); }}
                            className="flex-1 py-4 rounded-2xl bg-primary text-black font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                            <CheckIcon className="w-5 h-5" /> Guardar Filtros
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExclusionModal;
