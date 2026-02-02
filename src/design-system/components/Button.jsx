import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Button Component - Design System
 * 
 * Componente base de botón con variants semánticos, estados de carga,
 * accesibilidad built-in y motion effects.
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * <Button variant="danger" loading icon={TrashIcon}>
 *   Eliminar
 * </Button>
 */

const Button = React.forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    className,
    onClick,
    type = 'button',
    ...props
}, ref) => {

    // Variant Styles - Justificación:
    // - primary: CTA principal, máximo énfasis visual
    // - secondary: acciones secundarias, menos énfasis
    // - ghost: toolbars, acciones terciarias, mínimo énfasis
    // - danger: acciones destructivas (eliminar, cancelar suscripción)
    const variantStyles = {
        primary: `
            bg-primary text-background font-semibold
            hover:bg-primary-hover hover:shadow-glow
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-fast
        `,
        secondary: `
            bg-transparent border-2 border-primary text-primary font-medium
            hover:bg-primary/10 hover:border-primary-hover
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-fast
        `,
        ghost: `
            bg-transparent text-text-primary font-medium
            hover:bg-white/10
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-fast
        `,
        danger: `
            bg-danger text-white font-semibold
            hover:bg-red-600 hover:shadow-lg
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-fast
        `,
        success: `
            bg-action text-white font-semibold
            hover:bg-emerald-600 hover:shadow-lg
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-fast
        `
    };

    // Size Styles - Touch targets mínimo 44x44px (WCAG)
    const sizeStyles = {
        sm: 'px-3 py-1.5 text-sm rounded-md min-h-[36px]',
        md: 'px-4 py-2.5 text-base rounded-lg min-h-[44px]',
        lg: 'px-6 py-3.5 text-lg rounded-xl min-h-[52px]',
    };

    const isDisabled = disabled || loading;

    return (
        <motion.button
            ref={ref}
            type={type}
            disabled={isDisabled}
            onClick={onClick}
            whileTap={!isDisabled ? { scale: 0.97 } : undefined}
            className={cn(
                // Base styles
                'inline-flex items-center justify-center gap-2',
                'font-sans',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                'relative overflow-hidden',

                // Variant & Size
                variantStyles[variant],
                sizeStyles[size],

                // Width
                fullWidth && 'w-full',

                // Custom classes
                className
            )}
            {...props}
        >
            {/* Loading Spinner */}
            {loading && (
                <Loader2
                    className="animate-spin"
                    size={size === 'sm' ? 14 : size === 'md' ? 16 : 18}
                />
            )}

            {/* Icon (left) */}
            {!loading && Icon && iconPosition === 'left' && (
                <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
            )}

            {/* Content */}
            <span className={loading ? 'opacity-0' : 'opacity-100'}>
                {children}
            </span>

            {/* Icon (right) */}
            {!loading && Icon && iconPosition === 'right' && (
                <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
            )}
        </motion.button>
    );
});

Button.displayName = 'Button';

export default Button;
