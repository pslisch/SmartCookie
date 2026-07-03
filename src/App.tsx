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
import { AppGate } from './shared/components/AppGate';
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
  if (saved && (saved === 'catalog' || saved === 'my-lessons')) {
    localStorage.removeItem('attemptedTab');
    return saved as Tab;
  }

  // 2. Check URL hash
  const hash = window.location.hash.replace('#', '');
  if (hash && (hash === 'catalog' || hash === 'my-lessons')) {
    return hash as Tab;
  }

  // 3. Check query param
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && (tabParam === 'catalog' || tabParam === 'my-lessons')) {
    return tabParam as Tab;
  }

  return Tab.MyLessons;
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>(getInitialTab);
  const appName = formatAppName(pkg.name);

  // Synchronize active tab with URL hash for persistent link sharing and cold-starts
  useEffect(() => {
    window.location.hash = currentTab;
  }, [currentTab]);

  return (
    <AppGate>
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
          ) : (
            <Catalog />
          )}
        </main>

        {/* Interactive Sticky Footer */}
        <Footer />
      </Shell>
    </AppGate>
  );
}
