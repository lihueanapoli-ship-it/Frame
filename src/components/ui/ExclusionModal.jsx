import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, FunnelIcon, GlobeAltIcon, TagIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

const GENRES = [
    { id: 28, name: 'Acción' },
    { id: 12, name: 'Aventura' },
    { id: 16, name: 'Animación' },
    { id: 35, name: 'Comedia' },
    { id: 80, name: 'Crimen' },
    { id: 99, name: 'Documental' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Familia' },
    { id: 14, name: 'Fantasía' },
    { id: 36, name: 'Historia' },
    { id: 27, name: 'Terror' },
    { id: 10402, name: 'Música' },
    { id: 9648, name: 'Misterio' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Ciencia ficción' },
    { id: 53, name: 'Suspense' },
    { id: 10752, name: 'Bélica' },
    { id: 37, name: 'Western' }
];

const COMMON_COUNTRIES = [
    { code: 'US', name: 'Estados Unidos' },
    { code: 'GB', name: 'Reino Unido' },
    { code: 'ES', name: 'España' },
    { code: 'AR', name: 'Argentina' },
    { code: 'MX', name: 'México' },
    { code: 'FR', name: 'Francia' },
    { code: 'KR', name: 'Corea del Sur' },
    { code: 'JP', name: 'Japón' },
    { code: 'BR', name: 'Brasil' },
    { code: 'IT', name: 'Italia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IN', name: 'India' }
];

const ExclusionModal = ({ isOpen, onClose, preferences, onSave }) => {
    const [excludedGenres, setExcludedGenres] = useState(preferences?.excludedGenres || []);
    const [excludedCountries, setExcludedCountries] = useState(preferences?.excludedCountries || []);
    const [activeTab, setActiveTab] = useState('genres');

    const toggleGenre = (genreId) => {
        setExcludedGenres(prev =>
            prev.includes(genreId)
                ? prev.filter(id => id !== genreId)
                : [...prev, genreId]
        );
    };

    const toggleCountry = (countryCode) => {
        setExcludedCountries(prev =>
            prev.includes(countryCode)
                ? prev.filter(code => code !== countryCode)
                : [...prev, countryCode]
        );
    };

    const handleSave = () => {
        onSave({
            ...preferences,
            excludedGenres,
            excludedCountries
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FunnelIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white font-display">Filtros de ADN</h2>
                                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Personaliza tus recomendaciones</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5 bg-white/[0.01]">
                        <button
                            onClick={() => setActiveTab('genres')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                                activeTab === 'genres' ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <TagIcon className="w-4 h-4" />
                            Géneros a Excluir
                        </button>
                        <button
                            onClick={() => setActiveTab('countries')}
                            className={cn(
                                "flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2",
                                activeTab === 'countries' ? "border-primary text-primary bg-primary/5" : "border-transparent text-gray-400 hover:text-gray-200"
                            )}
                        >
                            <GlobeAltIcon className="w-4 h-4" />
                            Países a Excluir
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        {activeTab === 'genres' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {GENRES.map(genre => (
                                    <button
                                        key={genre.id}
                                        onClick={() => toggleGenre(genre.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-all group",
                                            excludedGenres.includes(genre.id)
                                                ? "bg-red-500/10 border-red-500/50 text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                                : "bg-white/[0.03] border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                                        )}
                                    >
                                        <span className="text-sm font-medium">{genre.name}</span>
                                        {excludedGenres.includes(genre.id) ? (
                                            <XMarkIcon className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border border-white/10 group-hover:border-white/30" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {COMMON_COUNTRIES.map(country => (
                                    <button
                                        key={country.code}
                                        onClick={() => toggleCountry(country.code)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-all group",
                                            excludedCountries.includes(country.code)
                                                ? "bg-red-500/10 border-red-500/50 text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                                : "bg-white/[0.03] border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-500">{country.code}</span>
                                            <span className="text-sm font-medium">{country.name}</span>
                                        </div>
                                        {excludedCountries.includes(country.code) ? (
                                            <GlobeAltIcon className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border border-white/10 group-hover:border-white/30" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="mt-8 text-center text-xs text-gray-500 italic">
                            * Las películas que coincidan con estos criterios no aparecerán en tu carrusel de "Tu ADN".
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:brightness-110 shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckIcon className="w-5 h-5" />
                            Guardar Preferencias
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExclusionModal;
