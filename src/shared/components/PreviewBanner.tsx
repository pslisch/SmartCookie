import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { usePreview } from '../contexts/PreviewContext';
import { LogOut, Eye } from 'lucide-react';

export function PreviewBanner() {
  const { t } = useTranslation();
  const { previewRoleId, previewRoleName, exitPreview } = usePreview();

  return (
    <AnimatePresence>
      {previewRoleId && (
        <motion.div
          id="preview-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="bg-amber-500 text-slate-900 border-b border-amber-600 overflow-hidden font-medium shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-slate-950 animate-pulse" />
              <span>
                {t('preview.banner', { roleName: previewRoleName })}
              </span>
            </div>
            <button
              onClick={exitPreview}
              id="exit-preview-btn"
              className="flex items-center space-x-1 px-3 py-1 rounded bg-slate-950 text-white hover:bg-slate-800 transition duration-150 shadow-sm text-xs"
            >
              <LogOut className="h-3 w-3" />
              <span>{t('preview.exitButton')}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
