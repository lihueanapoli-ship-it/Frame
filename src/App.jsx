import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HomeIcon, MagnifyingGlassIcon, RectangleStackIcon, ChartBarIcon, ChatBubbleLeftRightIcon, ArrowLeftOnRectangleIcon, UsersIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MagnifyingGlassIcon as SearchIconSolid, RectangleStackIcon as LibraryIconSolid, ChartBarIcon as ChartBarIconSolid, UsersIcon as UsersIconSolid } from '@heroicons/react/24/solid';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, NavLink } from 'react-router-dom';
import { MovieProvider } from './contexts/MovieContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SoundProvider } from './contexts/SoundContext';
import { UserProfileProvider, useUserProfile } from './contexts/UserProfileContext';
import { ListProvider } from './contexts/ListContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import usePresence from './hooks/usePresence';

import WelcomeView from './views/WelcomeView';
import DiscoverView from './views/DiscoverView';
import BottomNav from './components/navigation/BottomNav';
import DynamicLogo from './components/ui/DynamicLogo';
import { Toaster } from 'sonner';

const LibraryView = lazy(() => import('./views/LibraryView'));
const SearchView = lazy(() => import('./views/SearchView'));
const StatsView = lazy(() => import('./views/StatsView'));
const FriendsView = lazy(() => import('./views/FriendsView'));
const PublicProfileView = lazy(() => import('./views/PublicProfileView'));
const ListView = lazy(() => import('./views/ListView'));
const CategoryView = lazy(() => import('./views/CategoryView'));

const MovieDetail = lazy(() => import('./components/MovieDetail'));
const ChatWindow = lazy(() => import('./components/ui/ChatWindow'));
const FeedbackModal = lazy(() => import('./components/ui/FeedbackModal'));
const SpotlightCursor = lazy(() => import('./components/ui/SpotlightCursor'));
const PageTransitionOverlay = lazy(() => import('./components/ui/PageTransitionOverlay'));

const RouteFallback = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
);

const AppContent = () => {
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [logoKey, setLogoKey] = useState(0);

    const navItems = [
        { name: 'Inicio', path: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
        { name: 'Explorar', path: '/search', icon: MagnifyingGlassIcon, activeIcon: SearchIconSolid },
        { name: 'ADN', path: '/dashboard', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
        { name: 'Amigos', path: '/friends', icon: UsersIcon, activeIcon: UsersIconSolid },
        { name: 'Listas', path: '/library', icon: RectangleStackIcon, activeIcon: LibraryIconSolid },
    ];

    const { user, loading, logout } = useAuth();
    const { loading: profileLoading } = useUserProfile();
    const { setOpenMovieDetailFn } = useChat();
    const navigate = useNavigate();
    const location = useLocation();
    const isHome = location.pathname === '/';

    usePresence();

    useEffect(() => {
        setOpenMovieDetailFn(setSelectedMovie);
    }, [setOpenMovieDetailFn, setSelectedMovie]);

    if (!loading && !user) {
        return <WelcomeView />;
    }

    const FriendsBadge = () => {
        const { totalUnread } = useChat();
        if (!totalUnread) return null;
        return (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-black text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-primary/40 z-10">
                {totalUnread > 9 ? '9+' : totalUnread}
            </span>
        );
    };

    const UserMenuSkeleton = () => (
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 animate-pulse" />
    );

    const UserMenu = () => {
        if (loading) return <UserMenuSkeleton />;

        const firstName = user?.displayName?.split(' ')[0] || 'Cinéfilo';

        return (
            <div className="flex items-center gap-3 md:gap-4">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[9px] font-mono text-primary uppercase tracking-[0.2em] mb-0.5">En Escena</span>
                    <span className="text-sm font-display font-bold text-white tracking-wide leading-none">
                        {firstName.toUpperCase()}
                    </span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="relative group focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                        aria-label={`Menú de usuario: ${user?.displayName || 'Perfil'}`}
                        aria-expanded={isMenuOpen}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-200" />
                        <img
                            src={user?.photoURL || "/logo.png"}
                            alt={`Foto de perfil de ${user?.displayName || 'usuario'}`}
                            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black object-cover"
                            width="48"
                            height="48"
                        />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

                            <div
                                className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-white/10 shadow-2xl z-50 overflow-hidden animate-fade-in-fast"
                            >
                                <div className="px-4 py-4 border-b border-white/5 bg-white/5">
                                    <p className="text-sm text-white font-semibold truncate">{user.displayName}</p>
                                    <p className="text-xs text-gray-400 truncate font-mono mt-1">{user.email}</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    <button
                                        onClick={() => { setIsMenuOpen(false); setIsFeedbackOpen(true); }}
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

                                    <button
                                        onClick={() => { logout(); setIsMenuOpen(false); }}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors group"
                                    >
                                        <div className="p-1.5 bg-red-500/10 rounded-md group-hover:bg-red-500/20 transition-colors">
                                            <ArrowLeftOnRectangleIcon className="w-4 h-4 text-red-400" />
                                        </div>
                                        <span className="font-medium">Cerrar Sesión</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-[100] w-full backdrop-blur-xl bg-background/90 border-b border-white/5 transition-all duration-300">
                <div className="flex h-14 md:h-16 items-center w-full px-4 max-w-7xl mx-auto justify-between relative pt-safe sm:pt-1">
                    <div className="flex items-center gap-1.5 z-10">
                        {!isHome && (
                            <button
                                onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
                                className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 animate-fade-in-fast"
                                aria-label="Volver"
                                title="Volver"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                            </button>
                        )}
                        <a href="/" onClick={(e) => {
                            e.preventDefault();
                            navigate('/');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setLogoKey(prev => prev + 1);
                        }} className="font-bold text-lg tracking-tight hover:text-primary transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3 active:scale-95 transition-transform">
                                <DynamicLogo />
                                <span className="font-display text-3xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-primary group-hover:to-cyan-400 transition-all duration-300">
                                    FRAME
                                </span>
                            </div>
                        </a>
                    </div>

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
                                        {item.name === 'Amigos' && <span className="relative"><FriendsBadge /></span>}
                                        {isActive && (
                                            <span className="absolute inset-0 rounded-full bg-white/10 border border-white/5 -z-10" />
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

            <main className="container max-w-7xl mx-auto px-4 py-3 sm:py-6 md:py-8 sm:px-6 lg:px-8 pb-28 md:pb-32">
                <Suspense fallback={<RouteFallback />}>
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
                </Suspense>
            </main>

            <footer className="fixed bottom-24 md:bottom-6 right-6 z-0 pointer-events-none opacity-20 hover:opacity-100 transition-opacity duration-700 hidden md:block">
                <div className="flex flex-col items-end gap-1 group">
                    <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/50 group-hover:tracking-[0.5em] transition-all duration-700">Directed By</span>
                    <span className="font-display font-bold text-[10px] tracking-widest text-white group-hover:text-primary transition-colors duration-500">LIHUE NAPOLI</span>
                </div>
            </footer>

            <div className="md:hidden pb-32 flex justify-center opacity-30 mt-8">
                <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/50">Created By</span>
                    <span className="font-display font-bold text-[10px] tracking-widest text-white">LIHUE NAPOLI</span>
                </div>
            </div>

            <BottomNav />

            <Suspense fallback={null}>
                {selectedMovie && (
                    <MovieDetail
                        key="movie-detail-modal"
                        movie={selectedMovie}
                        onClose={() => setSelectedMovie(null)}
                    />
                )}

                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={() => setIsFeedbackOpen(false)}
                />

                <ChatWindow />
                <SpotlightCursor />
                <PageTransitionOverlay />
            </Suspense>

            <Toaster
                theme="dark"
                position="bottom-center"
            />
        </div>
    );
};

const AuthenticatedProviders = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading || !user) {
        return (
            <UserProfileProvider>
                <ListProvider>
                    <MovieProvider>
                        <SoundProvider>
                            <ChatProvider>
                                {children}
                            </ChatProvider>
                        </SoundProvider>
                    </MovieProvider>
                </ListProvider>
            </UserProfileProvider>
        );
    }

    return (
        <UserProfileProvider>
            <ListProvider>
                <MovieProvider>
                    <SoundProvider>
                        <ChatProvider>
                            {children}
                        </ChatProvider>
                    </SoundProvider>
                </MovieProvider>
            </ListProvider>
        </UserProfileProvider>
    );
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <LanguageProvider>
                    <AuthenticatedProviders>
                        <AppContent />
                    </AuthenticatedProviders>
                </LanguageProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
