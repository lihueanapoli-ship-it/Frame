import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { getAvailableProvidersInRegion } from '../../api/tmdb';

// Provider IDs we care about (main platforms in Argentina), in display order
const PLATFORM_IDS = [8, 119, 337, 384, 531, 350, 619, 100, 1899];

// Module-level cache so we only fetch once per app session
let platformsCache = null;

const StreamingProviderFilter = ({ selected, onChange }) => {
    const [platforms, setPlatforms] = useState(platformsCache || []);
    const [loading, setLoading] = useState(!platformsCache);

    useEffect(() => {
        if (platformsCache) {
            setPlatforms(platformsCache);
            setLoading(false);
            return;
        }
        getAvailableProvidersInRegion('AR').then(all => {
            // Filter to only known platforms, preserving our preferred order
            const filtered = PLATFORM_IDS
                .map(id => all.find(p => p.provider_id === id))
                .filter(Boolean);
            platformsCache = filtered;
            setPlatforms(filtered);
            setLoading(false);
        });
    }, []);

    const toggle = (id) => {
        onChange(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Plataformas
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
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {platforms.map(p => {
                        const isOn = selected.includes(p.provider_id);
                        return (
                            <button
                                key={p.provider_id}
                                onClick={() => toggle(p.provider_id)}
                                className={cn(
                                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left',
                                    isOn
                                        ? 'bg-primary/20 border-primary text-white'
                                        : 'bg-surface border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                <img
                                    src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                    alt={p.provider_name}
                                    className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <span className="text-sm font-semibold truncate">
                                    {p.provider_name}
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
