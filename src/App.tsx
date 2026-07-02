/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tab } from './shared/types';
import { Shell } from './shared/components/layout/Shell';
import { Navbar } from './shared/components/layout/Navbar';
import { Footer } from './shared/components/layout/Footer';
import { MyLessons } from './features/lessons/pages/MyLessons';
import { Catalog } from './features/catalog/pages/Catalog';
import pkg from '@/package.json';

// Format package.json name dynamically (e.g. "smart-cookie" -> "SmartCookie")
const formatAppName = (rawName: string): string => {
  if (rawName === 'smart-cookie') return 'SmartCookie';
  return rawName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.MyLessons);
  const appName = formatAppName(pkg.name);

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
        ) : (
          <Catalog />
        )}
      </main>

      {/* Interactive Sticky Footer */}
      <Footer />
    </Shell>
  );
}
