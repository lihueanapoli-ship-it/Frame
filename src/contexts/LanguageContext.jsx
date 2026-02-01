import React, { createContext, useContext, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { setApiLanguage } from '../api/tmdb';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    // Default to Spanish
    const [language, setLanguage] = useLocalStorage('cinetrack_language', 'es-MX');

    useEffect(() => {
        // Update API configuration whenever language changes
        setApiLanguage(language);
        console.log(`Language set to: ${language}`);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'es-MX' ? 'en-US' : 'es-MX');
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};
