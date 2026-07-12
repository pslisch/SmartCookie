/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tab } from './shared/types';
import { Shell } from './shared/components/layout/Shell';
import { Navbar } from './shared/components/layout/Navbar';
import { Footer } from './shared/components/layout/Footer';
import { MyLessons } from './features/lessons/pages/MyLessons';
import { Catalog } from './features/catalog/pages/Catalog';
import { Settings } from './features/rbac/pages/Settings';
import { Management } from './features/management/pages/Management';
import { AppGate, useAuth } from './shared/components/AppGate';
import { usePermission } from './shared/hooks/usePermission';
import { PreviewProvider } from './shared/contexts/PreviewContext';
import pkg from '@/package.json';

// Format package.json name dynamically (e.g. "smart-cookie" -> "SmartCookie")
const formatAppName = (rawName: string): string => {
  if (rawName === 'smart-cookie') return 'SmartCookie';
  return rawName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const getInitialTab = (): Tab => {
  // 1. Check if there was an attempted tab saved before login
  const saved = localStorage.getItem('attemptedTab');
  if (saved && (saved === 'catalog' || saved === 'my-lessons' || saved === 'settings' || saved === 'management')) {
    localStorage.removeItem('attemptedTab');
    return saved as Tab;
  }

  // 2. Check URL hash
  const hash = window.location.hash.replace('#', '');
  if (hash && (hash === 'catalog' || hash === 'my-lessons' || hash === 'settings' || hash === 'management')) {
    return hash as Tab;
  }

  // 3. Check query param
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && (tabParam === 'catalog' || tabParam === 'my-lessons' || tabParam === 'settings' || tabParam === 'management')) {
    return tabParam as Tab;
  }

  return Tab.MyLessons;
};

function AppContent({ appName }: { appName: string }) {
  const [currentTab, setCurrentTab] = useState<Tab>(getInitialTab);
  const { user } = useAuth();
  
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

  const hasSettingsAccess = !!user?.isSuperuser;

  // Synchronize active tab with URL hash for persistent link sharing and cold-starts
  useEffect(() => {
    window.location.hash = currentTab;
  }, [currentTab]);

  // Fallback if settings or management tab is selected but user has no permission
  useEffect(() => {
    if (currentTab === Tab.Settings && !hasSettingsAccess) {
      setCurrentTab(Tab.MyLessons);
    }
    if (currentTab === Tab.Management && !hasManagementAccess) {
      setCurrentTab(Tab.MyLessons);
    }
  }, [currentTab, hasSettingsAccess, hasManagementAccess]);

  return (
    <Shell>
      {/* Top sticky responsive Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        appName={appName}
      />

      {/* Main Content Area (Expands and fills space, keeping Footer pinned below) */}
      <main className="flex-1" id="main-content-area">
        {currentTab === Tab.MyLessons ? (
          <MyLessons />
        ) : currentTab === Tab.Catalog ? (
          <Catalog />
        ) : currentTab === Tab.Management && hasManagementAccess ? (
          <Management />
        ) : currentTab === Tab.Settings && hasSettingsAccess ? (
          <Settings />
        ) : (
          <MyLessons />
        )}
      </main>

      {/* Interactive Sticky Footer */}
      <Footer />
    </Shell>
  );
}

export default function App() {
  const appName = formatAppName(pkg.name);

  return (
    <AppGate>
      <PreviewProvider>
        <AppContent appName={appName} />
      </PreviewProvider>
    </AppGate>
  );
}
