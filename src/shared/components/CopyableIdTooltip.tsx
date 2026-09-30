/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CopyableIdTooltipProps {
  idValue: string;
  label?: string;
  truncateLength?: number;
  className?: string;
  idPrefix?: string;
}

export const CopyableIdTooltip: React.FC<CopyableIdTooltipProps> = ({
  idValue,
  label,
  truncateLength = 8,
  className = '',
  idPrefix = 'copyable-id',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Outside-click handler
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

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(idValue);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = idValue;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID to clipboard:', err);
    }
  };

  const displayText = label || (idValue.length > truncateLength ? `${idValue.slice(0, truncateLength)}…` : idValue);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev)}
        }
        className="inline-flex items-center space-x-1 font-mono text-xs text-link-primary hover:text-link-hover hover:underline bg-card-header-bg/60 border border-card-border px-2 py-0.5 rounded-md cursor-pointer transition-colors focus:outline-hidden"
        id={`${idPrefix}-trigger-${idValue.slice(0, 6)}`}
        title={t('audit.clickToViewId', 'Click to view full ID')}
        aria-expanded={isOpen}
      >
        <Hash className="h-3 w-3 opacity-60 shrink-0" />
        <span className="select-none">{displayText}</span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-1.5 z-60 min-w-[280px] max-w-sm rounded-xl border border-card-border bg-card-bg p-3 shadow-xl ring-1 ring-black/5 text-left"
            id={`${idPrefix}-popover-${idValue.slice(0, 6)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-card-border">
              <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">
                {t('audit.technicalId', 'Technical ID')}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center space-x-1 text-2xs font-semibold text-link-primary hover:text-link-hover px-1.5 py-0.5 rounded hover:bg-card-header-bg transition-colors cursor-pointer"
                id={`${idPrefix}-copy-btn-${idValue.slice(0, 6)}`}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-status-success-text" />
                    <span className="text-status-success-text">{t('audit.copied', 'Copied!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>{t('audit.copy', 'Copy')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2 rounded-lg bg-bg-subtle/90 border border-card-border">
              <code className="text-xs font-mono text-text-heading select-all break-all block">
                {idValue}
              </code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
