import React from 'react';
import { clsx } from 'clsx';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const FilterChip = ({ label, isSelected, onClick }) => {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200",
                isSelected
                    ? "bg-white text-black border-white shadow-lg shadow-white/10"
                    : "bg-surface text-secondary border-white/10 hover:border-white/30 hover:text-white"
            )}
        >
            {label}
        </motion.button>
    );
};
