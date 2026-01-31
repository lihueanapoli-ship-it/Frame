import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DiscoverView from './views/DiscoverView';
import LibraryView from './views/LibraryView';
import WelcomeView from './views/WelcomeView';
import CategoryView from './views/CategoryView'; // New View
import BottomNav from './components/navigation/BottomNav';
import SearchBar from './components/SearchBar';
import MovieDetail from './components/MovieDetail';

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

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/50 border-b border-white/5 transition-all duration-300">
                <div className="flex h-16 items-center w-full px-4 max-w-7xl mx-auto justify-between">
                    <a href="/" onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/'; // Hard reload or just navigate
                    }} className="font-bold text-lg tracking-tight hover:text-primary transition-colors cursor-pointer">
                        Frame.
                    </a>
                    <UserMenu />
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl animate-fade-in mb-20">
                <Routes>
                    <Route
                        path="/"
                        element={<DiscoverView onSelectMovie={setSelectedMovie} />}
                    />
                    <Route path="/search" element={
                        <div className="p-4 pt-8">
                            <h1 className="text-2xl font-bold mb-6">Explorar</h1>
                            <SearchBar onSelectMovie={setSelectedMovie} />
                        </div>
                    } />
                    <Route
                        path="/library"
                        element={<LibraryView onSelectMovie={setSelectedMovie} />}
                    />
                    <Route
                        path="/category/:id"
                        element={<CategoryView onSelectMovie={setSelectedMovie} />}
                    />
                </Routes>
            </main>

            <BottomNav />

            {/* Global Detail Modal */}
            {/* Global Detail Modal */}
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
                    <AppContent />
                </MovieProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
