import React, { useState } from 'react';
import { useMovies } from '../contexts/MovieContext';
import MovieCard from './MovieCard';
import { LayoutGrid, ListChecks, Film } from 'lucide-react';
import clsx from 'clsx';

const Dashboard = ({ onSelectMovie }) => {
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const { watchlist, watched } = useMovies();

    const movies = activeTab === 'watchlist' ? watchlist : watched;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-center mb-8">
                <div className="flex bg-surface p-1 rounded-xl shadow-inner border border-white/5">
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === 'watchlist'
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Film size={18} />
                        Por Ver ({watchlist.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('watched')}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === 'watched'
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-400 hover:text-white"
                        )}
                    >
                        <ListChecks size={18} />
                        Vistas ({watched.length})
                    </button>
                </div>
            </div>

            {movies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 text-gray-500">
                        {activeTab === 'watchlist' ? <Film size={40} /> : <ListChecks size={40} />}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {activeTab === 'watchlist' ? 'No hay películas pendientes' : 'No has visto ninguna película'}
                    </h3>
                    <p className="text-gray-400 max-w-sm">
                        {activeTab === 'watchlist'
                            ? 'Busca películas y agrégalas a tu lista para verlas más tarde.'
                            : 'Cuando termines de ver una película, márcala como vista para llevar un registro.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-fade-in pb-20">
                    {movies.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onClick={onSelectMovie}
                            rating={movie.rating}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
