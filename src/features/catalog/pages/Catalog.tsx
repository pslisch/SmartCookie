/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Compass, Search, Filter, ShieldAlert, ArrowRight } from 'lucide-react';

export const Catalog: React.FC = () => {
  const catalogStreams = [
    {
      title: 'Software Engineering & AI',
      count: '14 Courses',
      description: 'Master full-stack systems, neural networks, cloud-native deployments, and advanced TypeScript paradigms.',
      tag: 'Tech',
    },
    {
      title: 'Digital Product Design',
      count: '8 Courses',
      description: 'Explore human-centered interfaces, interaction choreography, high-fidelity mockups, and typography rules.',
      tag: 'UI/UX',
    },
    {
      title: 'Data Science & Analytics',
      count: '10 Courses',
      description: 'Analyze data streams, predictive models, business intelligence graphs, and statistical calculations.',
      tag: 'Data',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      id="catalog-root"
    >
      
      {/* Header Container */}
      <div className="mb-8" id="catalog-header">
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 mb-3">
          <Compass className="h-3.5 w-3.5" />
          <span>Curriculum Catalog</span>
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Explore Learning Tracks
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-2xl">
          Browse through our modern curated collections. Select tracks to view available dynamic lessons and check certification paths.
        </p>
      </div>

      {/* Simulated Search and Filter Bar (Visually polished, fully static placeholder) */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center justify-between" id="catalog-filter-bar">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog categories... (Placeholder)"
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-100/50 py-2.5 pl-10 pr-4 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>
        <button
          disabled
          className="inline-flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed"
        >
          <Filter className="h-4 w-4" />
          <span>Filter Tracks</span>
        </button>
      </div>

      {/* Catalog Streams Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8" id="catalog-grid">
        {catalogStreams.map((stream, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.3 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-not-allowed"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">
                  {stream.tag}
                </span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md">
                  {stream.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {stream.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-3">
                {stream.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>View Syllabi</span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Catalog Placeholder Guard Alert */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-5 flex items-start space-x-3.5 max-w-3xl mx-auto" id="catalog-guard-info">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-amber-900">
            Catalog Sync Blocked
          </h4>
          <p className="text-xs text-amber-700/85 mt-1 leading-relaxed">
            The Catalog views are static structure outlines for the LMS shell project. Database syncing, syllabus listings, and instructor course editors are bypassed in this foundation build.
          </p>
        </div>
      </div>

    </motion.div>
  );
};
