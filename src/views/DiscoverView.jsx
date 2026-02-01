import React, { useEffect, useState } from 'react';
import { getTrendingMovies, getTopRatedMovies, getMoviesByGenre, getCustomCollection } from '../api/tmdb';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

// ... imports
import MovieCard from '../components/MovieCard'; // Import our new powerful card

const MovieSection = ({ title, subtitle, movies, onSelectMovie, categoryId, variant = 'default' }) => {
    if (!movies || movies.length === 0) return null;
    return (
        <section className="mb-12 pl-4 group/section">
            <div className="flex items-end justify-between pr-4 mb-5">
                <div>
                    <h3 className={cn(
                        "text-lg md:text-2xl font-bold text-white flex items-center gap-2 tracking-wide font-display transition-colors group-hover/section:text-primary"
                    )}>
                        {title}
                    </h3>
                    <p className="hidden md:block mt-1 text-xs font-mono text-gray-500 opacity-0 group-hover/section:opacity-100 transition-opacity duration-300 transform -translate-x-4 group-hover/section:translate-x-0">
                        {subtitle}
                    </p>
                    <p className="md:hidden mt-1 text-[10px] font-mono text-gray-600">
                        {subtitle}
                    </p>
                </div>
                {categoryId && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary/90 hover:text-primary transition-colors uppercase tracking-widest py-1 pl-3 active:scale-95"
                    >
                        Ver Todo <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x hide-scrollbar pr-4 items-stretch">
                {movies.map((m, i) => (
                    <div
                        className={cn("snap-start shrink-0 relative z-10", variant === 'visuals' ? "w-[280px]" : "w-[150px] md:w-[200px]")}
                        key={m.id}
                    >
                        <MovieCard movie={m} onClick={onSelectMovie} variant={variant} />
                    </div>
                ))}
            </div>
        </section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const [data, setData] = useState({
        must_watch: [],
        short: [],
        conversation: [],
        tech: [],
        argentina: [],
        thriller: [],
        romance: [],
        real_life: [],
        sagas: [],
        classic_author: [],
        featured: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [
                    trending,
                    must_watch,
                    short,
                    conversation,
                    tech,
                    argentina,
                    thriller,
                    romance,
                    real_life,
                    sagas,
                    classic_author
                ] = await Promise.all([
                    getTrendingMovies(),
                    getCustomCollection('must_watch'),
                    getCustomCollection('short'),
                    getCustomCollection('conversation'),
                    getCustomCollection('tech'),
                    getCustomCollection('argentina'),
                    getCustomCollection('thriller'),
                    getCustomCollection('romance'),
                    getCustomCollection('real_life'),
                    getCustomCollection('sagas'),
                    getCustomCollection('classic_author')
                ]);

                // Create a mix for hero
                const combined = [...trending, ...must_watch, ...argentina].sort(() => 0.5 - Math.random());

                setData({
                    must_watch, short, conversation, tech, argentina,
                    thriller, romance, real_life, sagas, classic_author,
                    featured: combined.slice(0, 10)
                });
            } catch (err) {
                console.error("Failed to load dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-24">
            <HeroCarousel movies={data.featured} onRegisterAction={onSelectMovie} />

            <div className="mt-8 space-y-2">
                <MovieSection
                    title="Garantía Total"
                    subtitle="Cero riesgo. Historias que todo el mundo ama y que no podés no haber visto."
                    movies={data.must_watch}
                    onSelectMovie={onSelectMovie}
                    categoryId="must_watch"
                />
                <MovieSection
                    title="Cortitas y al Pie"
                    subtitle="Cine de alta eficiencia. Calidad pura en menos de 90 minutos para cuando el tiempo vuela."
                    movies={data.short}
                    onSelectMovie={onSelectMovie}
                    categoryId="short"
                    variant="short"
                />
                <MovieSection
                    title="Mate y Sobremesa"
                    subtitle="Charlas que valen la pena. Historias humanas para acompañar la tarde en el depto."
                    movies={data.conversation}
                    onSelectMovie={onSelectMovie}
                    categoryId="conversation"
                />
                <MovieSection
                    title="El Laboratorio"
                    subtitle="Física, sistemas y el futuro. El rincón para los que buscamos entender cómo funciona el mundo."
                    movies={data.tech}
                    onSelectMovie={onSelectMovie}
                    categoryId="tech"
                    variant="mind_bending"
                />
                <MovieSection
                    title="El Aguante"
                    subtitle="Identidad, calle y talento. Lo mejor de nuestro cine para inflar el pecho."
                    movies={data.argentina}
                    onSelectMovie={onSelectMovie}
                    categoryId="argentina"
                    variant="argentina"
                />
                <MovieSection
                    title="Pulso a Mil"
                    subtitle="Tensión constante. Preparate el café porque acá no hay respiro hasta los créditos finales."
                    movies={data.thriller}
                    onSelectMovie={onSelectMovie}
                    categoryId="thriller"
                />
                <MovieSection
                    title="Primera Cita"
                    subtitle="Clima perfecto. Pelis que te hacen quedar bien y te dejan con una sonrisa."
                    movies={data.romance}
                    onSelectMovie={onSelectMovie}
                    categoryId="romance"
                    variant="visuals"
                />
                <MovieSection
                    title="Misiones de Verdad"
                    subtitle="La realidad sin filtros. Casos reales que demuestran que la posta supera a cualquier guion."
                    movies={data.real_life}
                    onSelectMovie={onSelectMovie}
                    categoryId="real_life"
                    variant="true_story"
                />
                <MovieSection
                    title="Viaje de Ida"
                    subtitle="Plan de fin de semana. Entrá a estos universos y no salgas hasta que termine el maratón."
                    movies={data.sagas}
                    onSelectMovie={onSelectMovie}
                    categoryId="sagas"
                    variant="sagas"
                />
                <MovieSection
                    title="Solo para Locos"
                    subtitle="Filtro de autor. Técnica, encuadre y alma para los que buscamos el cine en estado puro."
                    movies={data.classic_author}
                    onSelectMovie={onSelectMovie}
                    categoryId="classic_author"
                    variant="cult"
                />
            </div>
        </div>
    );
};

export default DiscoverView;
