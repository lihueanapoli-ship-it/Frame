import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const MovieCardSkeleton = ({ className }) => {
    return (
        <div className={cn(
            "relative bg-surface rounded-xl overflow-hidden shadow-lg border border-white/5",
            "aspect-[2/3]", // Mantener ratio
            className
        )}>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 z-10 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full" />

            {/* Content Placeholder */}
            <div className="absolute inset-0 bg-surface-elevated animate-pulse" />

            {/* Title / Meta Placeholder */}
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 z-20 bg-gradient-to-t from-black/80 to-transparent pt-10">
                <div className="h-4 bg-white/10 rounded-md w-3/4 animate-pulse" />
                <div className="flex justify-between items-center">
                    <div className="h-3 bg-white/10 rounded-md w-1/4 animate-pulse" />
                    <div className="h-3 bg-white/10 rounded-md w-1/6 animate-pulse" />
                </div>
            </div>

            {/* Icon Placeholder */}
            <div className="absolute top-2 right-2 w-6 h-6 bg-white/5 rounded-full animate-pulse" />
        </div>
    );
};

export default MovieCardSkeleton;
