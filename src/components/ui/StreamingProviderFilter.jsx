import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { getStreamingPlatforms } from '../../services/tmdb';

const StreamingProviderFilter = ({ selected, onChange }) => {
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getStreamingPlatforms().then(platforms => {
            if (cancelled) return;
            setPlatforms(platforms);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const toggle = (id) => {
        onChange(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Suscripción en Argentina
                </h4>
                {selected.length > 0 && (
                    <span className="text-xs text-primary">{selected.length} seleccionadas</span>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-2 gap-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : platforms.length === 0 ? (
                <p className="text-xs text-gray-500">No pudimos cargar las plataformas.</p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {platforms.map(p => {
                        const isOn = selected.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                onClick={() => toggle(p.id)}
                                aria-pressed={isOn}
                                className={cn(
                                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left',
                                    isOn
                                        ? 'bg-primary/20 border-primary text-white'
                                        : 'bg-surface border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                <img
                                    src={p.logoUrl}
                                    alt={p.name}
                                    className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <span className="text-sm font-semibold truncate">
                                    {p.name}
                                </span>
                                {isOn && (
                                    <span className="ml-auto text-primary text-xs flex-shrink-0">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StreamingProviderFilter;
