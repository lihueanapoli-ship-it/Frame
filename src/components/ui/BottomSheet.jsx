import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
                        drag={!isDesktop ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 150) onClose();
                        }}
                        initial={isDesktop ? { opacity: 0, scale: 0.9, x: "-50%", y: "-50%" } : { y: "100%" }}
                        animate={isDesktop ? { opacity: 1, scale: 1, x: "-50%", y: "-50%" } : { y: 0 }}
                        exit={isDesktop ? { opacity: 0, scale: 0.9, x: "-50%", y: "-50%" } : { y: "100%" }}
                        transition={{
                            type: "spring",
                            damping: 32,
                            stiffness: 400,
                            mass: 0.8
                        }}
                        className={cn(
                            "fixed z-[70] bg-[#0F0F0F]/95 backdrop-blur-2xl overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                            isDesktop
                                ? "top-1/2 left-1/2 w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] border border-white/10"
                                : "bottom-0 left-0 right-0 rounded-t-[3rem] border-t border-white/10 max-h-[92vh]"
                        )}
                    >
                        {/* Handle bar (Mobile Only) */}
                        {!isDesktop && (
                            <div className="w-full flex justify-center pt-4 pb-2 group cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors" />
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex justify-between items-center px-8 py-5 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all active:scale-95 border border-white/5 shadow-inner"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 pb-safe custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
