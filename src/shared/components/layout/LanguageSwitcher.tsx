import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant: 'desktop' | 'mobile';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant }) => {
  const { t, i18n } = useTranslation();
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
    <div className="relative inline-block text-left" ref={containerRef} id={`language-switcher-container-${variant}`}>
      <button
        onClick={handleToggle}
        className="flex h-9 items-center justify-center rounded-lg border border-card-border bg-card-bg px-3 text-text-body transition-colors hover:bg-card-header-bg hover:text-text-heading focus:outline-none focus:ring-2 focus:ring-input-border-focus/20 active:bg-bg-subtle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        id={`language-switcher-btn-${variant}`}
        title={t('nav.changeLanguage')}
      >
        <Languages className="h-4 w-4 mr-1.5 text-text-muted" />
        <span className="text-xs font-semibold uppercase">{currentLanguage}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg border border-card-border bg-card-bg p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`language-switcher-btn-${variant}`}
          id={`language-switcher-dropdown-${variant}`}
        >
          {supportedLanguages.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-status-info-bg text-link-primary'
                    : 'text-text-body hover:bg-card-header-bg hover:text-text-heading'
                }`}
                role="menuitem"
                id={`lang-option-${lang.code}-${variant}`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-link-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
