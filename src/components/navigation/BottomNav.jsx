import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home as HomeIcon, Search as MagnifyingGlassIcon, Layers as RectangleStackIcon, BarChart3 as ChartBarIcon, Users as UsersIcon } from 'lucide-react';
import { Home as HomeIconSolid, Search as SearchIconSolid, Layers as LibraryIconSolid, BarChart3 as ChartBarIconSolid, Users as UsersIconSolid } from 'lucide-react';
import { cn } from '../../lib/utils';

const BottomNav = () => {

    const navItems = [
        { name: 'Inicio', path: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
        { name: 'Explorar', path: '/search', icon: MagnifyingGlassIcon, activeIcon: SearchIconSolid },
        { name: 'ADN', path: '/dashboard', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
        { name: 'Amigos', path: '/friends', icon: UsersIcon, activeIcon: UsersIconSolid },
        { name: 'Listas', path: '/library', icon: RectangleStackIcon, activeIcon: LibraryIconSolid },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-[#050505] border-t border-white/10 pb-safe md:hidden shadow-[0_-10px_40px_rgba(0,0,0,1)] translate-z-0">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 touch-manipulation transition-colors duration-200 relative",
                            isActive ? "text-primary" : "text-secondary hover:text-white"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <div className="relative">
                                    <item.icon className={cn("w-6 h-6", isActive ? "hidden" : "block")} />
                                    <item.activeIcon className={cn("w-6 h-6", isActive ? "block" : "hidden")} />
                                </div>
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
