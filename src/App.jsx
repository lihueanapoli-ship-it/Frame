import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomeIcon, MagnifyingGlassIcon, RectangleStackIcon, ChartBarIcon, ChatBubbleLeftRightIcon, ArrowLeftOnRectangleIcon, UserIcon, UsersIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MagnifyingGlassIcon as SearchIconSolid, RectangleStackIcon as LibraryIconSolid, ChartBarIcon as ChartBarIconSolid, UsersIcon as UsersIconSolid } from '@heroicons/react/24/solid';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, NavLink } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SoundProvider } from './contexts/SoundContext';
import { UserProfileProvider, useUserProfile } from './contexts/UserProfileContext';
import { ListProvider } from './contexts/ListContext';
import { LanguageProvider } from './contexts/LanguageContext';

import DiscoverView from './views/DiscoverView';
import LibraryView from './views/LibraryView';
import WelcomeView from './views/WelcomeView';
import CategoryView from './views/CategoryView';
import SearchView from './views/SearchView';
import StatsView from './views/StatsView';
import PublicProfileView from './views/PublicProfileView';
import FriendsView from './views/FriendsView';
import ListView from './views/ListView';

import BottomNav from './components/navigation/BottomNav';
import MovieDetail from './components/MovieDetail';
import DynamicLogo from './components/ui/DynamicLogo';
import SpotlightCursor from './components/ui/SpotlightCursor';
import PageTransitionOverlay from './components/ui/PageTransitionOverlay';
import FeedbackModal from './components/ui/FeedbackModal';


// Wrapper component to use Hooks like useNavigate
const AppContent = () => {
    // Global movie selection state for the Detail Modal
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false); // Feedback Modal State
    const [logoKey, setLogoKey] = useState(0); // Key to restart animation

    const navItems = [
        { name: 'Inicio', path: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
        { name: 'Explorar', path: '/search', icon: MagnifyingGlassIcon, activeIcon: SearchIconSolid },
        { name: 'ADN', path: '/dashboard', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
        { name: 'Amigos', path: '/friends', icon: UsersIcon, activeIcon: UsersIconSolid },
        { name: 'Listas', path: '/library', icon: RectangleStackIcon, activeIcon: LibraryIconSolid },
    ];

    // Auth Hooks
    const { user, loading, logout } = useAuth();
    // Removed useLanguage usage for UI toggle
    const { profile, loading: profileLoading } = useUserProfile();
    const navigate = useNavigate();

    // 1. Loading Guard
    if (loading) {
        return <div className="min-h-screen bg-black" />;
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
                <div className="flex flex-col items-end animate-fade-in">
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
                                    className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-white/10 shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="px-4 py-4 border-b border-white/5 bg-white/5">
                                        <p className="text-sm text-white font-semibold truncate">{user.displayName}</p>
                                        <p className="text-xs text-gray-400 truncate font-mono mt-1">{user.email}</p>
                                    </div>
                                    <div className="p-2 space-y-1">



                                        {/* Feedback Button */}
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsFeedbackOpen(true);
                                            }}
                                            className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-all group"
                                        >
                                            <div className="p-1.5 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                                                <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium">Danos tu opinión</span>
                                                <span className="text-[10px] text-gray-500">Ayúdanos a mejorar</span>
                                            </div>
                                        </button>

                                        <div className="h-px bg-white/5 my-1" />

                                        {/* Logout Button */}
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors group"
                                        >
                                            <div className="p-1.5 bg-red-500/10 rounded-md group-hover:bg-red-500/20 transition-colors">
                                                <ArrowLeftOnRectangleIcon className="w-4 h-4 text-red-400" />
                                            </div>
                                            <span className="font-medium">Cerrar Sesión</span>
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
            <header className="sticky top-0 z-[100] w-full backdrop-blur-xl bg-background/90 border-b border-white/5 transition-all duration-300">
                <div className="flex h-20 items-center w-full px-4 max-w-7xl mx-auto justify-between relative">
                    <a href="/" onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setLogoKey(prev => prev + 1); // Trigger animation
                    }} className="font-bold text-lg tracking-tight hover:text-primary transition-colors cursor-pointer group z-10">
                        <motion.div
                            key={logoKey}
                            className="flex items-center gap-3"
                            initial={{ x: 0 }}
                            animate={{ x: 0 }}
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

                    {/* Desktop Navigation (Centered) */}
                    <nav className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/5 shadow-2xl z-10">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className={({ isActive }) => `
                                    relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group outline-none focus:ring-1 focus:ring-primary/50
                                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`w-4 h-4 ${isActive ? "hidden" : "block transition-transform group-hover:scale-110"}`} />
                                        <item.activeIcon className={`w-4 h-4 text-primary ${isActive ? "block scale-110" : "hidden"}`} />
                                        <span className={isActive ? "font-bold text-white shadow-primary/20 drop-shadow-md" : ""}>{item.name}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="desktop-nav-active"
                                                className="absolute inset-0 rounded-full bg-white/10 border border-white/5 -z-10"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="z-10">
                        <UserMenu />
                    </div>
                </div>
            </header>

            <main className="container max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-32">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<DiscoverView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/search" element={<SearchView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/library" element={<LibraryView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/friends" element={<FriendsView />} />
                        <Route path="/dashboard" element={<StatsView />} />
                        <Route path="/u/:username" element={<PublicProfileView onSelectMovie={setSelectedMovie} />} />
                        <Route path="/lists/:id" element={<ListView onSelectMovie={setSelectedMovie} />} />
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

            {/* Modals */}
            <AnimatePresence>
                {selectedMovie && (
                    <MovieDetail
                        key="movie-detail-modal"
                        movie={selectedMovie}
                        onClose={() => setSelectedMovie(null)}
                    />
                )}
            </AnimatePresence>

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />

        </div >
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <LanguageProvider>
                    <UserProfileProvider>
                        <ListProvider>
                            <MovieProvider>
                                <SoundProvider>
                                    <AppContent />
                                </SoundProvider>
                            </MovieProvider>
                        </ListProvider>
                    </UserProfileProvider>
                </LanguageProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
