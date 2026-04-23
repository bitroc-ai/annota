import React, { useState, useEffect } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';

type Theme = 'auto' | 'light' | 'dark';

export const ThemeSwitcher: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('auto');
  const [isOpen, setIsOpen] = useState(false);

  const getTheme = (): Theme => {
    if (typeof window === 'undefined') return 'auto';
    const stored = localStorage.getItem('starlight-theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return 'auto';
  };

  const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const setTheme = (theme: Theme) => {
    if (typeof window === 'undefined') return;

    // Starlight stores auto as empty string, light/dark as-is
    const storageValue = theme === 'auto' ? '' : theme;
    localStorage.setItem('starlight-theme', storageValue);

    const effectiveTheme = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setCurrentTheme(theme);
    setIsOpen(false);

    // Dispatch custom event for same-page listeners
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme, effectiveTheme } }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize theme
    const initialTheme = getTheme();
    setCurrentTheme(initialTheme);
    const effectiveTheme = getEffectiveTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for storage events (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'starlight-theme') {
        const newTheme = getTheme();
        setCurrentTheme(newTheme);
        const newEffectiveTheme = getEffectiveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newEffectiveTheme);
        if (newEffectiveTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    // Listen for custom theme-change events (from same page)
    const handleThemeChange = () => {
      const newTheme = getTheme();
      setCurrentTheme(newTheme);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value as Theme);
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleThemeClick = (theme: Theme) => {
    setTheme(theme);
  };

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Theme switcher"
      >
        {currentTheme === 'light' && <Sun className="w-4 h-4" />}
        {currentTheme === 'dark' && <Moon className="w-4 h-4" />}
        {currentTheme === 'auto' && <Laptop className="w-4 h-4" />}
        <span className="sr-only sm:not-sr-only">
          {currentTheme === 'light' && 'Light'}
          {currentTheme === 'dark' && 'Dark'}
          {currentTheme === 'auto' && 'Auto'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
          <button
            onClick={() => handleThemeClick('light')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-md"
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => handleThemeClick('dark')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
          <button
            onClick={() => handleThemeClick('auto')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-md"
          >
            <Laptop className="w-4 h-4" />
            Auto
          </button>
        </div>
      )}
    </div>
  );
};