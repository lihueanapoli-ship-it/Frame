import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Card Component - Design System
 * 
 * Contenedor base para contenido con glassmorphism, elevación y hover effects.
 * Usado como base para MovieCard, ProfileCard, StatCard, etc.
 * 
 * @example
 * <Card variant="glass" hoverable interactive onClick={handleClick}>
 *   <CardHeader>Título</CardHeader>
 *   <CardContent>Contenido</CardContent>
 * </Card>
 */

export const Card = React.forwardRef(({
    children,
    variant = 'default',
    hoverable = false,
    interactive = false,
    padding = 'md',
    className,
    onClick,
    ...props
}, ref) => {

    // Variants - Justificación UX:
    // - default: superficie sólida, contenido principal
    // - glass: glassmorphism, overlay sobre contenido
    // - elevated: superficie elevada, dropdowns, modals
    // - outline: subtle, metadata o información secundaria
    const variantStyles = {
        default: `
            bg-surface
            border border-white/5
        `,
        glass: `
            bg-glass backdrop-blur-glass
            border border-white/10
        `,
        elevated: `
            bg-surface-elevated
            border border-white/10
            shadow-lg
        `,
        outline: `
            bg-transparent
            border border-white/10
        `
    };

    const paddingStyles = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8'
    };

    const Component = interactive || onClick ? motion.div : 'div';

    const motionProps = (interactive || onClick) ? {
        whileHover: hoverable ? { y: -4, scale: 1.02 } : undefined,
        whileTap: interactive ? { scale: 0.98 } : undefined,
        transition: { duration: 0.2, ease: 'easeOut' }
    } : {};

    return (
        <Component
            ref={ref}
            onClick={onClick}
            className={cn(
                // Base styles
                'rounded-xl',
                'transition-all duration-normal',

                // Variant
                variantStyles[variant],

                // Padding
                paddingStyles[padding],

                // Interactive states
                hoverable && 'hover:shadow-xl hover:border-white/20',
                interactive && 'cursor-pointer',

                // Custom
                className
            )}
            {...motionProps}
            {...props}
        >
            {children}
        </Component>
    );
});

Card.displayName = 'Card';

/**
 * CardHeader - Encabezado de card con tipografía consistente
 */
export const CardHeader = ({ children, className, subtitle, action }) => {
    return (
        <div className={cn('mb-4', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-text-primary truncate">
                        {children}
                    </h3>
                    {subtitle && (
                        <p className="text-sm text-text-secondary mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && (
                    <div className="flex-shrink-0">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
};

CardHeader.displayName = 'CardHeader';

/**
 * CardContent - Contenido del card
 */
export const CardContent = ({ children, className }) => {
    return (
        <div className={cn('text-text-secondary', className)}>
            {children}
        </div>
    );
};

CardContent.displayName = 'CardContent';

/**
 * CardFooter - Footer del card (acciones, metadata)
 */
export const CardFooter = ({ children, className }) => {
    return (
        <div className={cn(
            'mt-4 pt-4',
            'border-t border-white/5',
            'flex items-center justify-between gap-4',
            className
        )}>
            {children}
        </div>
    );
};

CardFooter.displayName = 'CardFooter';

export default Card;
