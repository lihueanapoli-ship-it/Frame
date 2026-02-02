import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Sparkles } from 'lucide-react';
import { searchMovies } from '../../api/tmdb';
import { useMovies } from '../../contexts/MovieContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getPosterUrl } from '../../api/tmdb';
import Button from '../../design-system/components/Button';

/**
 * OnboardingModal
 * 
 * Modal que aparece en el primer uso de la app.
 * Pide al usuario que agregue 5 películas favoritas para:
 * 1. Personalizar recomendaciones desde el día 1
 * 2. Calcular expertise level inicial
 * 3. Analizar géneros/décadas preferidas
 * 
 * UX Justification:
 * - No preguntamos "¿Sos cinéfilo?" (forzar auto-clasificación)
 * - Aprendemos del comportamiento natural (qué películas elige)
 * - Es skippable (no forzar si el usuario quiere explorar primero)
 * - 5 películas es suficiente para perfil inicial (no abrumar)
 */

const OnboardingModal = ({ isOpen, onComplete }) => {
    const [step, setStep] = useState(1); // 1: Intro, 2: Selección, 3: Confirmación
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const { addToWatchlist } = useMovies();
    const { completeOnboarding } = useUserProfile();

    const MIN_MOVIES = 5;
    const MAX_MOVIES = 10;

    // ========================================
    // SEARCH HANDLER
    // ========================================
    const handleSearch = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchMovies(query);
            setSearchResults(results.slice(0, 12)); // Máximo 12 resultados
        } catch (error) {
            console.error('Error searching movies:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ========================================
    // MOVIE SELECTION
    // ========================================
    const toggleMovie = (movie) => {
        const isSelected = selectedMovies.some(m => m.id === movie.id);

        if (isSelected) {
            setSelectedMovies(selectedMovies.filter(m => m.id !== movie.id));
        } else {
            if (selectedMovies.length < MAX_MOVIES) {
                setSelectedMovies([...selectedMovies, movie]);
            }
        }
    };

    // ========================================
    // COMPLETE ONBOARDING
    // ========================================
    const handleComplete = async () => {
        // Agregar películas seleccionadas a watchlist
        selectedMovies.forEach(movie => {
            addToWatchlist(movie);
        });

        // Marcar onboarding como completo
        await completeOnboarding();

        // Celebración sutil
        console.log('🎉 Onboarding completado!');

        onComplete();
    };

    const handleSkip = async () => {
        await completeOnboarding();
        onComplete();
    };

    // ========================================
    // RENDER
    // ========================================
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={handleSkip}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface border border-white/10 shadow-2xl"
                >
                    {/* Step 1: Intro */}
                    {step === 1 && (
                        <div className="p-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6"
                            >
                                <Sparkles className="w-8 h-8 text-primary" />
                            </motion.div>

                            <h2 className="text-3xl font-display text-white mb-4">
                                ¡Bienvenido a FRAME!
                            </h2>

                            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
                                Para personalizar tu experiencia, necesitamos conocer tus gustos.
                                <br />
                                <span className="text-primary font-semibold">Agregá 5 películas que amas</span>
                                {' '}y FRAME se encargará del resto.
                            </p>

                            <div className="flex gap-4 justify-center">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => setStep(2)}
                                >
                                    Empezar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={handleSkip}
                                >
                                    Explorar sin personalizar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Selección */}
                    {step === 2 && (
                        <div className="flex flex-col h-full max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-display text-white">
                                        Tus películas favoritas
                                    </h3>
                                    <button
                                        onClick={handleSkip}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-text-secondary" />
                                    </button>
                                </div>

                                <p className="text-text-secondary mb-4">
                                    {selectedMovies.length} de {MIN_MOVIES} mínimo
                                    {selectedMovies.length >= MIN_MOVIES && (
                                        <span className="text-primary ml-2">✓ Listo para continuar</span>
                                    )}
                                </p>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscá películas... (ej: Relatos Salvajes)"
                                        className="w-full pl-10 pr-4 py-3 bg-background border border-white/10 rounded-lg text-white placeholder-text-tertiary focus:outline-none focus:border-primary transition-colors"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Selected Movies Chips */}
                            {selectedMovies.length > 0 && (
                                <div className="px-6 py-4 border-b border-white/10 flex-shrink-0">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMovies.map(movie => (
                                            <motion.button
                                                key={movie.id}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                onClick={() => toggleMovie(movie)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/40 rounded-full text-sm text-primary hover:bg-primary/30 transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                                {movie.title}
                                                <X className="w-4 h-4" />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search Results */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {isSearching ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                        <p className="text-text-secondary mt-4">Buscando...</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {searchResults.map(movie => {
                                            const isSelected = selectedMovies.some(m => m.id === movie.id);

                                            return (
                                                <motion.button
                                                    key={movie.id}
                                                    onClick={() => toggleMovie(movie)}
                                                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${isSelected
                                                            ? 'border-primary shadow-glow'
                                                            : 'border-transparent hover:border-white/20'
                                                        }`}
                                                    whileHover={{ y: -4 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <img
                                                        src={getPosterUrl(movie.poster_path, 'w342')}
                                                        alt={movie.title}
                                                        className="w-full aspect-[2/3] object-cover"
                                                    />

                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                                                                <Check className="w-6 h-6 text-black" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                                                        <p className="text-xs text-white font-medium line-clamp-2">
                                                            {movie.title}
                                                        </p>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                ) : searchQuery.trim() ? (
                                    <div className="text-center py-12">
                                        <p className="text-text-secondary">No se encontraron resultados</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Search className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                                        <p className="text-text-secondary">
                                            Buscá tus películas favoritas para empezar
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 flex-shrink-0">
                                <div className="flex gap-4 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep(1)}
                                    >
                                        Volver
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleComplete}
                                        disabled={selectedMovies.length < MIN_MOVIES}
                                    >
                                        Continuar ({selectedMovies.length}/{MIN_MOVIES})
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OnboardingModal;
