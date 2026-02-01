import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SpotlightCursor = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updateMousePosition = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', updateMousePosition);

        return () => {
            window.removeEventListener('mousemove', updateMousePosition);
        };
    }, []);

    return (
        <motion.div
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-[100]"
            animate={{
                background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 240, 255, 0.03), transparent 40%)`
            }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.05 }} // Fast update but smooth
        />
    );
};

export default SpotlightCursor;
