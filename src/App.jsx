import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SoundProvider } from './contexts/SoundContext';
import DiscoverView from './views/DiscoverView';
import LibraryView from './views/LibraryView';
import WelcomeView from './views/WelcomeView';
import CategoryView from './views/CategoryView';
import SearchView from './views/SearchView'; // Import SearchView
import BottomNav from './components/navigation/BottomNav';
import MovieDetail from './components/MovieDetail';
import DynamicLogo from './components/ui/DynamicLogo';
import StatsView from './views/StatsView';
import SpotlightCursor from './components/ui/SpotlightCursor';
import PageTransitionOverlay from './components/ui/PageTransitionOverlay';

import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserProfileProvider, useUserProfile } from './contexts/UserProfileContext';

// ... (previous imports)

// Wrapper component to use Hooks like useNavigate
const AppContent = () => {
    // Global movie selection state for the Detail Modal
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [logoKey, setLogoKey] = useState(0); // Key to restart animation


    // Auth Hooks
    const { user, loading, logout } = useAuth();
    const { language, toggleLanguage } = useLanguage();
    const { profile, loading: profileLoading } = useUserProfile();
    const navigate = useNavigate();

    // 1. Loading Guard
    if (loading) {
        return <div className="min-h-screen bg-black" />; // Or a spinner
    }

    // 2. Login Wall Guard
    if (!user) {
        return <WelcomeView />;
    }

    // 3. Authenticated App UI
    const UserMenu = () => {
        const firstName = user.displayName?.split(' ')[0] || 'Cinéfilo';

        return (
            <div className="flex items-center gap-4">
                {/* Creative Greeting - Hidden on mobile */}
                <div className="hidden md:flex flex-col items-end animate-fade-in">
                    <span className="text-[9px] font-mono text-primary uppercase tracking-[0.2em] mb-0.5">En Escena</span>
                    <span className="text-sm font-display font-bold text-white tracking-wide leading-none">
                        {firstName.toUpperCase()}
                    </span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="relative group focus:outline-none"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-200" />
                        <img
                            src={user?.photoURL || "/logo.png"}
                            alt={user?.displayName}
                            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black object-cover"
                            title={user?.displayName}
                        />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                {/* Backdrop to close */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

                                {/* Dropdown */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-white/10 shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                                        <p className="text-sm text-white font-semibold truncate">{user.displayName}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <button
                                            onClick={() => {
                                                toggleLanguage();
                                                // Optional: close menu or keep open to see change? Close is better UX.
                                                // But wait, changing language might require reload or re-fetch. 
                                                // Our Context handles API param, but View components need to re-fetch?
                                                // A simple page reload might be safest for now to refresh all data:
                                                setTimeout(() => window.location.reload(), 300);
                                            }}
                                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            🌐 {language === 'es-MX' ? 'Cambiar a Inglés' : 'Change to Spanish'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            🚪 {language === 'es-MX' ? 'Cerrar Sesión' : 'Sign Out'}
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <SpotlightCursor />
            <PageTransitionOverlay />
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/50 border-b border-white/5 transition-all duration-300">
                <div className="flex h-20 items-center w-full px-4 max-w-7xl mx-auto justify-between">
                    <a href="/" onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setLogoKey(prev => prev + 1); // Trigger animation
                    }} className="font-bold text-lg tracking-tight hover:text-primary transition-colors cursor-pointer group">
                        <motion.div
                            key={logoKey}
                            className="flex items-center gap-3"
                            initial={{ x: 0 }}
                            animate={{ x: 0 }} // We use the key change to trigger children animations if any, or we can animate this div
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="scale-90"
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 0.6, ease: "backOut" }}
                            >
                                <DynamicLogo />
                            </motion.div>
                            <span className="font-display text-3xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-primary group-hover:to-cyan-400 transition-all duration-300">
                                FRAME
                            </span>
                        </motion.div>
                    </a>
                    <UserMenu />
                </div>
            </header>

            <main className="container max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-32">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<DiscoverView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/search" element={<SearchView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/library" element={<LibraryView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/dashboard" element={<StatsView />} />
                        <Route path="/category/:id" element={<CategoryView onSelectMovie={setSelectedMovie} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AnimatePresence>
            </main>

            <footer className="fixed bottom-24 md:bottom-6 right-6 z-0 pointer-events-none opacity-20 hover:opacity-100 transition-opacity duration-700 hidden md:block">
                <div className="flex flex-col items-end gap-1 group">
                    <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/50 group-hover:tracking-[0.5em] transition-all duration-700">Directed By</span>
                    <span className="font-display font-bold text-[10px] tracking-widest text-white group-hover:text-primary transition-colors duration-500">LIHUE NAPOLI</span>
                </div>
            </footer>

            {/* Mobile Footer Signature */}
            <div className="md:hidden pb-32 flex justify-center opacity-30 mt-8">
                <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/50">Created By</span>
                    <span className="font-display font-bold text-[10px] tracking-widest text-white">LIHUE NAPOLI</span>
                </div>
            </div>

            <BottomNav />

            <AnimatePresence>
                {selectedMovie && (
                    <MovieDetail
                        key="movie-detail-modal"
                        movie={selectedMovie}
                        onClose={() => setSelectedMovie(null)}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <LanguageProvider>
                    <UserProfileProvider>
                        <MovieProvider>
                            <SoundProvider>
                                <AppContent />
                            </SoundProvider>
                        </MovieProvider>
                    </UserProfileProvider>
                </LanguageProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
