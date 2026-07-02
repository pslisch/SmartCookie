/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#1E293B] selection:bg-blue-100 selection:text-blue-900" id="shell-container">
      {/* Scrollable Main Area (which pushes the footer down) */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
};
