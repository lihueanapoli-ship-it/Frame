import React, { useState } from 'react';
import { motion } from 'framer-motion';

const DynamicLogo = () => {
    return (
        <motion.div
            className="relative cursor-pointer group flex items-center justify-center"
            initial="16_9"
            whileHover="239_1"
            title="Frame"
        >
            {/* The Dynamic Frame Container */}
            <motion.div
                className="border-[3px] border-primary bg-transparent relative z-10 flex items-center justify-center overflow-hidden"
                variants={{
                    "16_9": { width: 48, height: 27 }, // 16:9 approx
                    "4_3": { width: 40, height: 30 },  // 4:3
                    "239_1": { width: 64, height: 26 }, // 2.39:1 Anamorphic
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                }}
            >
                {/* 
                  Inner F Concept: 
                  Minimalist representation. 
                  Just the frame is enough as requested ("El logo... debe ser un contenedor")
                  But let's add a subtle 'F' hint or just leave the frame empty/dynamic.
                  Let's assume the Frame IS the logo.
                  Or we can put a small 'f' inside.
                */}
                <motion.span
                    className="font-display font-bold text-primary text-xl select-none"
                    variants={{
                        "16_9": { opacity: 1, scale: 1 },
                        "239_1": { opacity: 1, scale: 1.1, letterSpacing: "2px" }
                    }}
                >
                    F
                </motion.span>
            </motion.div>

            {/* Light Leak Glow Effect on Hover */}
            <motion.div
                className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
        </motion.div>
    );
};

export default DynamicLogo;
