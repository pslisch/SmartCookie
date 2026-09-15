/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tab } from '../../types';
import { User, Menu, X, BookOpen, Compass, Languages, Settings, LayoutDashboard, Eye, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../AppGate';
import { usePreview } from '../../contexts/PreviewContext';
import { useThemeRuntime } from '../../contexts/ThemeRuntimeContext';
import { QuickProfile } from '../QuickProfile';
import { NotificationBell } from '../NotificationBell';

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
  const [showQuickProfile, setShowQuickProfile] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDarkMode, toggleDisplayMode, logoUrl } = useThemeRuntime();
  
  const hasManagementAccess = 
    usePermission('roles', 'manage') || 
    usePermission('organization', 'view') || 
    usePermission('organization', 'manage-members') || 
    usePermission('organization', 'manage-groups') || 
    usePermission('assignments', 'create') || 
    usePermission('assignments', 'edit') || 
    usePermission('assignments', 'assign-own-groups') || 
    usePermission('assignments', 'assign-globally') || 
    usePermission('assignments', 'view-reports') || 
    usePermission('assignments', 'create-mandatory');

  const canManageFields = usePermission('profile-fields', 'manage-fields');
  const hasSettingsAccess = !!user?.isSuperuser || canManageFields;

  const canPreview = usePermission('preview', 'use');
  const [eligibleRoles, setEligibleRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [showPicker, setShowPicker] = useState(false);
  const { enterPreview } = usePreview();

  useEffect(() => {
    if (canPreview) {
      fetch('/api/preview/eligible-roles')
        .then((res) => {
          if (res.ok) return res.json();
          return [];
        })
        .then((data) => {
          setEligibleRoles(data);
        })
        .catch((err) => {
          console.error('Failed to fetch eligible roles:', err);
        });
    }
  }, [canPreview]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleTabSelect = (tab: Tab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-card-border bg-nav-bg/80 backdrop-blur-md" id="navbar-root">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Side: Logo */}
          <div className="flex items-center">
            <button
              onClick={() => handleTabSelect(Tab.MyLessons)}
              className="flex items-center space-x-2 text-nav-text transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] group"
              id="navbar-logo-btn"
            >
              <img
                src={logoUrl || '/SC_logo.png'}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="h-8 w-8 object-contain"
                id="navbar-logo-img"
              />
              <span className="text-xl font-bold tracking-tight text-nav-text-active group-hover:text-link-primary transition-colors">
                {appName}
              </span>
            </button>
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <div className="hidden md:flex items-center space-x-1" id="navbar-desktop-tabs">
            <button
              onClick={() => handleTabSelect(Tab.MyLessons)}
              className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentTab === Tab.MyLessons ? 'text-nav-text-active' : 'text-nav-text hover:text-text-heading'
              }`}
              id="tab-my-lessons-desktop"
            >
              <BookOpen className="h-4 w-4" />
              <span>{t('nav.myLessons')}</span>
              {currentTab === Tab.MyLessons && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-nav-text-active rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            
            <button
              onClick={() => handleTabSelect(Tab.Catalog)}
              className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                currentTab === Tab.Catalog ? 'text-nav-text-active' : 'text-nav-text hover:text-text-heading'
              }`}
              id="tab-catalog-desktop"
            >
              <Compass className="h-4 w-4" />
              <span>{t('nav.catalog')}</span>
              {currentTab === Tab.Catalog && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-nav-text-active rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>

            {hasManagementAccess && (
              <button
                onClick={() => handleTabSelect(Tab.Management)}
                className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  currentTab === Tab.Management ? 'text-nav-text-active' : 'text-nav-text hover:text-text-heading'
                }`}
                id="tab-management-desktop"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>{t('nav.management')}</span>
                {currentTab === Tab.Management && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-nav-text-active rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )}

            {hasSettingsAccess && (
              <button
                onClick={() => handleTabSelect(Tab.Settings)}
                className={`relative flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  currentTab === Tab.Settings ? 'text-nav-text-active' : 'text-nav-text hover:text-text-heading'
                }`}
                id="tab-settings-desktop"
              >
                <Settings className="h-4 w-4" />
                <span>{t('nav.settings')}</span>
                {currentTab === Tab.Settings && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-nav-text-active rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )}
          </div>

          {/* Right Side: Account button */}
          <div className="hidden md:flex items-center space-x-4">
            {canPreview && eligibleRoles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-bg-subtle text-nav-text transition-colors hover:bg-card-border hover:text-link-primary focus:outline-none"
                  id="navbar-preview-btn"
                  title={t('preview.triggerTooltip')}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {showPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-lg border border-card-border bg-card-bg p-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                      id="preview-picker-dropdown"
                    >
                      <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-card-border mb-1">
                        {t('preview.pickerTitle')}
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {eligibleRoles.map((role) => (
                          <button
                            key={role.id}
                            onClick={() => {
                              enterPreview(role.id, role.name);
                              setShowPicker(false);
                            }}
                            className="flex w-full items-center px-3 py-2 text-sm text-text-body hover:bg-card-header-bg hover:text-link-primary rounded-md transition duration-150 text-left font-medium"
                          >
                            {role.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <LanguageSwitcher variant="desktop" />
            <button
              onClick={toggleDisplayMode}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-bg-subtle text-nav-text transition-colors hover:bg-card-border hover:text-text-heading"
              id="navbar-theme-toggle-btn"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-status-warning-text" />
              ) : (
                <Moon className="h-4 w-4 text-text-muted" />
              )}
            </button>
            <NotificationBell
              idPrefix="navbar-notif-desktop"
              onNavigate={(path) => {
                if (path === '/my-lessons' || path.startsWith('/my-lessons')) {
                  handleTabSelect(Tab.MyLessons);
                } else if (path === '/catalog' || path.startsWith('/catalog')) {
                  handleTabSelect(Tab.Catalog);
                } else if (path === '/management' || path.startsWith('/management')) {
                  handleTabSelect(Tab.Management);
                } else if (path === '/settings' || path.startsWith('/settings')) {
                  handleTabSelect(Tab.Settings);
                } else if (path === '/profile' || path.startsWith('/profile')) {
                  handleTabSelect(Tab.Profile);
                } else if (path.startsWith('/')) {
                  window.location.href = path;
                } else {
                  window.open(path, '_blank', 'noopener,noreferrer');
                }
              }}
            />
            <div className="relative">
              <button
                onClick={() => setShowQuickProfile(!showQuickProfile)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-bg-subtle text-nav-text transition-colors hover:bg-card-border"
                id="navbar-account-btn"
                title={t('nav.account')}
              >
                <User className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {showQuickProfile && (
                  <QuickProfile
                    onClose={() => setShowQuickProfile(false)}
                    onOpenFullProfile={() => handleTabSelect(Tab.Profile)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Side: Bell + Hamburger Menu (Mobile) */}
          <div className="flex md:hidden items-center space-x-2">
            <NotificationBell
              idPrefix="navbar-notif-mobile"
              onNavigate={(path) => {
                if (path === '/my-lessons' || path.startsWith('/my-lessons')) {
                  handleTabSelect(Tab.MyLessons);
                } else if (path === '/catalog' || path.startsWith('/catalog')) {
                  handleTabSelect(Tab.Catalog);
                } else if (path === '/management' || path.startsWith('/management')) {
                  handleTabSelect(Tab.Management);
                } else if (path === '/settings' || path.startsWith('/settings')) {
                  handleTabSelect(Tab.Settings);
                } else if (path === '/profile' || path.startsWith('/profile')) {
                  handleTabSelect(Tab.Profile);
                } else if (path.startsWith('/')) {
                  window.location.href = path;
                } else {
                  window.open(path, '_blank', 'noopener,noreferrer');
                }
              }}
            />
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center rounded-lg p-2 text-nav-text hover:bg-bg-subtle hover:text-text-heading transition-colors"
              aria-expanded="false"
              id="navbar-mobile-toggle"
            >
              <span className="sr-only">{t('nav.openMenu')}</span>
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
            className="border-b border-card-border bg-nav-bg md:hidden overflow-hidden"
            id="navbar-mobile-drawer"
          >
            <div className="space-y-1 px-4 py-3 pb-4">
              <button
                onClick={() => handleTabSelect(Tab.MyLessons)}
                className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  currentTab === Tab.MyLessons ? 'bg-status-info-bg text-nav-text-active' : 'text-nav-text hover:bg-card-header-bg hover:text-text-heading'
                }`}
                id="tab-my-lessons-mobile"
              >
                <BookOpen className="h-5 w-5" />
                <span>{t('nav.myLessons')}</span>
              </button>

              <button
                onClick={() => handleTabSelect(Tab.Catalog)}
                className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  currentTab === Tab.Catalog ? 'bg-status-info-bg text-nav-text-active' : 'text-nav-text hover:bg-card-header-bg hover:text-text-heading'
                }`}
                id="tab-catalog-mobile"
              >
                <Compass className="h-5 w-5" />
                <span>{t('nav.catalog')}</span>
              </button>

              {hasManagementAccess && (
                <button
                  onClick={() => handleTabSelect(Tab.Management)}
                  className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                    currentTab === Tab.Management ? 'bg-status-info-bg text-nav-text-active' : 'text-nav-text hover:bg-card-header-bg hover:text-text-heading'
                  }`}
                  id="tab-management-mobile"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>{t('nav.management')}</span>
                </button>
              )}

              {hasSettingsAccess && (
                <button
                  onClick={() => handleTabSelect(Tab.Settings)}
                  className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                    currentTab === Tab.Settings ? 'bg-status-info-bg text-nav-text-active' : 'text-nav-text hover:bg-card-header-bg hover:text-text-heading'
                  }`}
                  id="tab-settings-mobile"
                >
                  <Settings className="h-5 w-5" />
                  <span>{t('nav.settings')}</span>
                </button>
              )}

              <div className="border-t border-card-border my-2 pt-2 space-y-1">
                {canPreview && eligibleRoles.length > 0 && (
                  <div className="px-4 py-2 space-y-1" id="mobile-preview-picker">
                    <div className="text-xs font-semibold text-text-muted mb-1">
                      {t('preview.pickerTitle')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {eligibleRoles.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => {
                            enterPreview(role.id, role.name);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 bg-bg-subtle hover:bg-card-border text-xs font-semibold text-text-body rounded-lg transition duration-150"
                        >
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-base font-semibold text-nav-text hover:bg-card-header-bg transition-colors" id="mobile-language-row">
                  <div className="flex items-center space-x-2.5">
                    <Languages className="h-5 w-5" />
                    <span>{t('nav.language')}</span>
                  </div>
                  <LanguageSwitcher variant="mobile" />
                </div>

                <div className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-base font-semibold text-nav-text hover:bg-card-header-bg transition-colors" id="mobile-theme-row">
                  <div className="flex items-center space-x-2.5">
                    {isDarkMode ? <Sun className="h-5 w-5 text-status-warning-text" /> : <Moon className="h-5 w-5 text-text-muted" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <button
                    onClick={toggleDisplayMode}
                    className="px-3 py-1.5 bg-bg-subtle hover:bg-card-border text-xs font-semibold text-text-body rounded-lg transition duration-150 border border-card-border"
                    id="mobile-theme-toggle-btn"
                  >
                    {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
                  </button>
                </div>

                <button
                  onClick={() => handleTabSelect(Tab.Profile)}
                  className={`flex w-full items-center space-x-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                    currentTab === Tab.Profile ? 'bg-status-info-bg text-nav-text-active' : 'text-nav-text hover:bg-card-header-bg hover:text-text-heading'
                  }`}
                  id="tab-account-mobile"
                >
                  <User className="h-5 w-5" />
                  <span>{t('nav.account')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
