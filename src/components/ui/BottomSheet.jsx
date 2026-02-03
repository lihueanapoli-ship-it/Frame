import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

const BottomSheet = ({ isOpen, onClose, title, children }) => {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);

        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        initial={isDesktop ? { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" } : { y: "100%" }}
                        animate={isDesktop ? { opacity: 1, scale: 1, x: "-50%", y: "-50%" } : { y: 0 }}
                        exit={isDesktop ? { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" } : { y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed z-[70] bg-surface-elevated overflow-hidden flex flex-col shadow-2xl",
                            isDesktop
                                ? "top-1/2 left-1/2 w-full max-w-2xl max-h-[85vh] rounded-3xl border border-white/10"
                                : "bottom-0 left-0 right-0 rounded-t-[32px] border-t border-white/10 max-h-[90vh]"
                        )}
                    >
                        {/* Handle bar (Mobile Only) */}
                        {!isDesktop && (
                            <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md z-10">
                            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-secondary hover:text-white transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 pb-safe custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
