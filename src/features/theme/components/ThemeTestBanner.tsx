import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { useThemeRuntime } from '../../../shared/contexts/ThemeRuntimeContext';

export const ThemeTestBanner: React.FC = () => {
  const { isTestMode, testThemeName, exitTestMode } = useThemeRuntime();
  const [isExiting, setIsExiting] = useState(false);

  if (!isTestMode) {
    return null;
  }

  const handleExit = async () => {
    try {
      setIsExiting(true);
      await exitTestMode();
    } catch (error) {
      console.error('[ThemeTestBanner] Error exiting test mode:', error);
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -48, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        id="theme-test-banner"
        aria-label="Theme Test Mode Active"
        className="sticky top-0 z-50 w-full border-b border-status-warning-text/30 bg-status-warning-bg/95 backdrop-blur-xs text-status-warning-text px-4 py-2.5 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left info badge & message */}
          <div className="flex items-center space-x-3 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-status-warning-text/10 text-status-warning-text">
              <FlaskConical className="h-4 w-4" />
            </span>
            <div className="text-xs sm:text-sm font-sans truncate">
              <span className="font-bold tracking-tight">Theme Test Mode:</span>{' '}
              <span className="font-semibold text-text-heading" id="theme-test-banner-name">
                &ldquo;{testThemeName || 'Test Theme'}&rdquo;
              </span>{' '}
              <span className="hidden md:inline text-text-body/80">
                &bull; Applied to your entire LMS session. Editing is locked for other users.
              </span>
            </div>
          </div>

          {/* Right exit action button */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleExit}
              disabled={isExiting}
              id="exit-theme-test-btn"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-status-warning-text hover:bg-status-warning-text/90 text-text-inverse px-3 py-1.5 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExiting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Restoring Theme...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit Theme Test</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
