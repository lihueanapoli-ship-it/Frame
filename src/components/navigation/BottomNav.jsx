import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, MagnifyingGlassIcon, RectangleStackIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MagnifyingGlassIcon as SearchIconSolid, RectangleStackIcon as LibraryIconSolid, ChartBarIcon as ChartBarIconSolid, UsersIcon as UsersIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils'; // Assuming I created this utility

const BottomNav = () => {
    const navItems = [
        { name: 'Inicio', path: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
        { name: 'Explorar', path: '/search', icon: MagnifyingGlassIcon, activeIcon: SearchIconSolid },
        { name: 'ADN', path: '/dashboard', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
        { name: 'Amigos', path: '/friends', icon: UsersIcon, activeIcon: UsersIconSolid },
        { name: 'Listas', path: '/library', icon: RectangleStackIcon, activeIcon: LibraryIconSolid },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe md:hidden">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation transition-colors duration-200",
                            isActive ? "text-primary" : "text-secondary hover:text-white"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={cn("w-6 h-6", isActive ? "hidden" : "block")} />
                                <item.activeIcon className={cn("w-6 h-6", isActive ? "block" : "hidden")} />
                                <span className="text-[10px] font-medium">{item.name}</span>
                                {isActive && (
                                    <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full animate-fade-in" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
