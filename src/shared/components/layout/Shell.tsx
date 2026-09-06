/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PreviewBanner } from '../PreviewBanner';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-bg-app text-text-heading selection:bg-status-info-bg selection:text-link-primary" id="shell-container">
      <PreviewBanner />
      {/* Scrollable Main Area (which pushes the footer down) */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
};
