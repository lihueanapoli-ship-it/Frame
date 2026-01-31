import React from 'react';
import { getPosterUrl } from '../api/tmdb';
import { Star } from 'lucide-react';

const MovieCard = ({ movie, onClick, rating }) => {
    return (
        <div
            onClick={() => onClick(movie)}
            className="group relative bg-surface rounded-xl overflow-hidden shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        >
            <div className="aspect-[2/3] w-full overflow-hidden">
                <img
                    src={getPosterUrl(movie.poster_path)}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white text-sm font-medium">Ver detalles</p>
                </div>
            </div>

            <div className="p-3">
                <h3 className="font-semibold text-white truncate text-sm md:text-base">{movie.title}</h3>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-secondary text-xs">
                        {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                    </span>
                    {rating > 0 && (
                        <div className="flex items-center text-yellow-400 gap-1">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-bold">{rating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieCard;
