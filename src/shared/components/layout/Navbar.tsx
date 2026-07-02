/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tab } from '../../types';
import { User, Menu, X, BookOpen, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  appName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  appName,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleTabSelect = (tab: Tab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md" id="navbar-root">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Side: Logo */}
          <div className="flex items-center">
            <button
              onClick={() => handleTabSelect(Tab.MyLessons)}
              className="flex items-center space-x-2 text-slate-950 transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] group"
              id="navbar-logo-btn"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg shadow-sm">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-blue-900 group-hover:text-blue-600 transition-colors">
                {appName}
              </span>
            </button>
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <div className="hidden md:flex items-center space-x-1" id="navbar-desktop-tabs">
            <button
              onClick={() => handleTabSelect(Tab.MyLessons)}
              className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentTab === Tab.MyLessons ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab-my-lessons-desktop"
            >
              <BookOpen className="h-4 w-4" />
              <span>My Lessons</span>
              {currentTab === Tab.MyLessons && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            
            <button
              onClick={() => handleTabSelect(Tab.Catalog)}
              className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentTab === Tab.Catalog ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab-catalog-desktop"
            >
              <Compass className="h-4 w-4" />
              <span>Catalog</span>
              {currentTab === Tab.Catalog && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Right Side: Account button */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              id="navbar-account-btn"
              title="Account"
            >
              <User className="h-4 w-4" />
            </button>
          </div>

          {/* Hamburger Menu (Mobile) */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-expanded="false"
              id="navbar-mobile-toggle"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-b border-[#E2E8F0] bg-white md:hidden overflow-hidden"
            id="navbar-mobile-drawer"
          >
            <div className="space-y-1 px-4 py-3 pb-4">
              <button
                onClick={() => handleTabSelect(Tab.MyLessons)}
                className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  currentTab === Tab.MyLessons ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
                id="tab-my-lessons-mobile"
              >
                <BookOpen className="h-5 w-5" />
                <span>My Lessons</span>
              </button>

              <button
                onClick={() => handleTabSelect(Tab.Catalog)}
                className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  currentTab === Tab.Catalog ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
                id="tab-catalog-mobile"
              >
                <Compass className="h-5 w-5" />
                <span>Catalog</span>
              </button>

              <div className="border-t border-[#E2E8F0] my-2 pt-2">
                <button
                  className="flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  id="tab-account-mobile"
                >
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
