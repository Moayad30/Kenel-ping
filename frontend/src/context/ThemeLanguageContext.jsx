import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const ThemeLanguageContext = createContext();

export function ThemeLanguageProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kernelping_theme') || 'dark';
  });

  const [lang, setLang] = useState(() => {
    return localStorage.getItem('kernelping_lang') || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('kernelping_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('kernelping_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (lang === 'ar') {
      document.body.style.fontFamily = "'Tajawal', system-ui, sans-serif";
    } else {
      document.body.style.fontFamily = "'Inter', system-ui, sans-serif";
    }
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = translations[lang] || translations.ar;

  return (
    <ThemeLanguageContext.Provider value={{ theme, toggleTheme, lang, toggleLang, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
}

export function useThemeLang() {
  return useContext(ThemeLanguageContext);
}

