import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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

// Wrapper component to use Hooks like useNavigate
const AppContent = () => {
    // Global movie selection state for the Detail Modal
    const [selectedMovie, setSelectedMovie] = useState(null);

    // Auth Hooks
    const { user, loading, logout } = useAuth();

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
        // Since we are guarded, user exists here
        return (
            <div className="flex items-center gap-3">
                <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">
                    Salir
                </button>
                <img
                    src={user?.photoURL || "/logo.png"}
                    alt={user?.displayName}
                    className="w-8 h-8 rounded-full border border-white/10"
                    title={user?.displayName}
                />
            </div>
        );
    };

    // Loading State (Optional: Add a spinner if needed, but for now we just wait)
    // If we want a strict gate:
    if (!user) {
        return <WelcomeView />;
    }

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <SpotlightCursor />
            <PageTransitionOverlay />
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/50 border-b border-white/5 transition-all duration-300">
                <div className="flex h-16 items-center w-full px-4 max-w-7xl mx-auto justify-between">
                    <a href="/" onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="font-bold text-lg tracking-tight hover:text-primary transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                            <div className="scale-75"><DynamicLogo /></div>
                            <span className="font-display text-2xl tracking-tight">FRAME</span>
                        </div>
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
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <MovieProvider>
                    <SoundProvider>
                        <AppContent />
                    </SoundProvider>
                </MovieProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
