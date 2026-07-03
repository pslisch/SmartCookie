import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const supportedLanguages = [
    { code: 'en', label: 'English' }
  ];

  const currentLanguage = i18n.language?.split('-')[0] || 'en';

  const handleToggle = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef} id="language-switcher-container">
      <button
        onClick={handleToggle}
        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:bg-slate-100"
        aria-haspopup="true"
        aria-expanded={isOpen}
        id="language-switcher-btn"
        title="Change language"
      >
        <Languages className="h-4 w-4 mr-1.5 text-slate-500" />
        <span className="text-xs font-semibold uppercase">{currentLanguage}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-switcher-btn"
          id="language-switcher-dropdown"
        >
          {supportedLanguages.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                role="menuitem"
                id={`lang-option-${lang.code}`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
