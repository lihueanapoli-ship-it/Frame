import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PageTransitionOverlay = () => {
    const location = useLocation();
    const [isAnimating, setIsAnimating] = useState(false);

    // Trigger animation on route change
    useEffect(() => {
        // We trigger a re-mount of the flash effect on every location change
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 500); // 500ms cleanup
        return () => clearTimeout(timer);
    }, [location.pathname]); // Only path changes

    return (
        <AnimatePresence>
            {isAnimating && (
                <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden">
                    {/* 1. The Anamorphic Flare Swipe */}
                    <motion.div
                        initial={{ x: '-150%', opacity: 0 }}
                        animate={{ x: '150%', opacity: [0, 1, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1], // Custom cinematic easing
                            times: [0, 0.5, 0.8, 1]
                        }}
                        className="w-[150vw] h-[300px] relative transform -skew-x-12"
                    >
                        {/* Core Beam */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 blur-xl" />
                        <div className="absolute top-1/2 left-0 right-0 h-2 bg-white blur-md" />
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white z-10" />

                        {/* Vertical Streaks */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-cyan-400 blur-lg opacity-20" />
                    </motion.div>

                    {/* 2. Full Screen Flash (Optional: very subtle brightness bump) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.1, 0] }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-cyan-400 mix-blend-overlay"
                    />
                </div>
            )}
        </AnimatePresence>
    );
};

export default PageTransitionOverlay;
