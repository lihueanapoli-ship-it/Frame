import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import DiscoverView from './views/DiscoverView';
import LibraryView from './views/LibraryView'; // Updated import
import BottomNav from './components/navigation/BottomNav';
import SearchBar from './components/SearchBar';
import MovieDetail from './components/MovieDetail';

// Wrapper component to use Hooks like useNavigate
const AppContent = () => {
    // Global movie selection state for the Detail Modal
    const [selectedMovie, setSelectedMovie] = useState(null);

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/50 border-b border-white/5 transition-all duration-300">
                <div className="flex h-16 items-center w-full px-4 max-w-7xl mx-auto justify-between">
                    <div className="font-bold text-lg tracking-tight">Frame.</div>
                    <img src="/logo.png" alt="Profile" className="w-8 h-8 rounded-full border border-white/10" />
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
            <MovieProvider>
                <AppContent />
            </MovieProvider>
        </BrowserRouter>
    );
}

export default App;
