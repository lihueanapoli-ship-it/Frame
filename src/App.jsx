import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DiscoverView from './views/DiscoverView';
import LibraryView from './views/LibraryView'; // Updated import
import BottomNav from './components/navigation/BottomNav';
import SearchBar from './components/SearchBar';
import MovieDetail from './components/MovieDetail';

// Wrapper component to use Hooks like useNavigate
const AppContent = () => {
    // Global movie selection state for the Detail Modal
    const [selectedMovie, setSelectedMovie] = useState(null);

    // Provide a User Menu component locally here (or extract it)
    const UserMenu = () => {
        const { user, loginWithGoogle, logout } = useAuth();

        if (!user) {
            return (
                <button
                    onClick={loginWithGoogle}
                    className="text-xs font-semibold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Iniciar Sesión
                </button>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">
                    Salir
                </button>
                <img
                    src={user.photoURL || "/logo.png"}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full border border-white/10"
                    title={user.displayName}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/50 border-b border-white/5 transition-all duration-300">
                <div className="flex h-16 items-center w-full px-4 max-w-7xl mx-auto justify-between">
                    <div className="font-bold text-lg tracking-tight">Frame.</div>
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
