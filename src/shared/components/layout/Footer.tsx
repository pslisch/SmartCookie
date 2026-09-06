/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import pkg from '@/package.json';

export const Footer: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <footer className="h-12 w-full border-t border-card-border bg-card-bg flex items-center shrink-0 mt-auto" id="footer-root">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center justify-between w-full text-xs font-medium text-text-muted">
          
          {/* Copyright Area with Hover Reveal */}
          <div 
            className="relative cursor-help select-none py-1 px-3 rounded-full hover:bg-card-header-bg transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            id="footer-copyright-trigger"
          >
            <div className="flex items-center space-x-1">
              <span>&copy; 2026</span>
              <AnimatePresence mode="popLayout">
                {isHovered ? (
                  <motion.span
                    key="author"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.15 }}
                    className="font-semibold text-text-heading"
                    id="footer-author-name"
                  >
                    Philipp Slišković
                  </motion.span>
                ) : (
                  <motion.span
                    key="standard"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.15 }}
                    className="text-text-muted font-normal"
                  >
                    {t('footer.brand')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Version Info from package.json */}
          <div className="flex items-center space-x-1.5 font-mono text-xs text-text-muted" id="footer-version-tag">
            <span>{t('footer.version')}</span>
            <span className="px-2 py-0.5 bg-bg-subtle rounded border border-card-border font-mono text-[10px]">v{pkg.version}</span>
          </div>

        </div>
      </div>
    </footer>
  );
};
