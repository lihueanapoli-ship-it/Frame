import React from 'react';

const OscarBadge = ({ className = "" }) => {
    return (
        <div
            className={`absolute bottom-2 right-2 z-30 ${className}`}
            title="Ganadora del Óscar a Mejor Película"
        >
            <div className="relative group/oscar">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-yellow-400/40 blur-md rounded-full animate-pulse" />

                {/* Oscar trophy icon */}
                <svg
                    viewBox="0 0 24 24"
                    className="w-7 h-7 drop-shadow-lg relative z-10"
                    fill="url(#oscarGradient)"
                >
                    <defs>
                        <linearGradient id="oscarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFD700" />
                            <stop offset="50%" stopColor="#FFA500" />
                            <stop offset="100%" stopColor="#FF8C00" />
                        </linearGradient>
                    </defs>

                    {/* Trophy base */}
                    <rect x="8" y="20" width="8" height="2" rx="1" fill="#8B7355" />
                    <rect x="7" y="18" width="10" height="2" rx="0.5" fill="#A0826D" />

                    {/* Trophy body */}
                    <path d="M12 3 L8 8 L8 16 L16 16 L16 8 Z" />

                    {/* Head/handles */}
                    <circle cx="12" cy="3" r="2" />
                    <path d="M8 8 L6 10 L6 12 L8 12" />
                    <path d="M16 8 L18 10 L18 12 L16 12" />
                </svg>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black/90 text-yellow-400 text-xs font-bold rounded whitespace-nowrap opacity-0 group-hover/oscar:opacity-100 transition-opacity pointer-events-none">
                    Óscar Mejor Película
                </div>
            </div>
        </div>
    );
};

export default OscarBadge;
