/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock, Award, Star, Play, BookOpenCheck } from 'lucide-react';

export const MyLessons: React.FC = () => {
  // Static placeholder data for future lessons (designed according to UI Guidelines)
  const placeholderLessons = [
    {
      id: 'placeholder-1',
      title: 'Introduction to Modern Frontend Architectures',
      category: 'Web Development',
      duration: '45 mins',
      difficulty: 'Beginner',
      rating: '4.9',
      color: 'bg-blue-50 border-blue-100 text-blue-700 hover:shadow-blue-100/50',
      iconBg: 'bg-blue-600',
    },
    {
      id: 'placeholder-2',
      title: 'State Management & Performance Tuning in React',
      category: 'Advanced React',
      duration: '1 hr 15 mins',
      difficulty: 'Intermediate',
      rating: '4.8',
      color: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:shadow-emerald-100/50',
      iconBg: 'bg-emerald-600',
    },
    {
      id: 'placeholder-3',
      title: 'Designing Accessible User Interfaces',
      category: 'UI/UX Design',
      duration: '30 mins',
      difficulty: 'All Levels',
      rating: '5.0',
      color: 'bg-amber-50 border-amber-100 text-amber-700 hover:shadow-amber-100/50',
      iconBg: 'bg-amber-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      id="my-lessons-root"
    >
      
      {/* Header Panel */}
      <div className="mb-8" id="my-lessons-header">
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 mb-3">
          <BookOpenCheck className="h-3.5 w-3.5" />
          <span>Student Hub</span>
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome back to SmartCookie!
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-2xl">
          Here is your dashboard overview. Dive back into your active studies or explore our curriculum catalog to learn something brand new today.
        </p>
      </div>

      {/* Grid Overview Info (Optional visual stats cards, standard in premium dashboards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8" id="my-lessons-stats">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Lessons</p>
            <h3 className="text-lg font-bold text-slate-900">3 Placeholder Cards</h3>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Study Duration</p>
            <h3 className="text-lg font-bold text-slate-900">2.5 hrs Planned</h3>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Completeness</p>
            <h3 className="text-lg font-bold text-slate-900">v1.0.0 Ready</h3>
          </div>
        </div>
      </div>

      {/* Placeholder Section for Future Lesson Cards */}
      <div id="lessons-placeholder-section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            My Enrolled Lessons
          </h2>
          <div className="h-px flex-1 bg-slate-200 ml-4"></div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" id="lessons-grid">
          {placeholderLessons.map((lesson, idx) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-not-allowed"
              id={`lesson-card-${lesson.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-400">
                    {lesson.category}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-amber-500 font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>{lesson.rating}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-800 line-clamp-2 mb-4 group-hover:text-blue-600 transition-colors">
                  {lesson.title}
                </h3>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{lesson.duration}</span>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 font-medium text-slate-600">
                    {lesson.difficulty}
                  </span>
                </div>
                
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Informative Help Box with LMS Initialized style */}
        <div className="mt-8 flex flex-col items-center text-center py-6 px-4" id="dashboard-notice">
          <div className="bg-blue-50 text-blue-600 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider mb-4">
            LMS Project Initialized
          </div>
          <p className="text-slate-400 text-xs max-w-lg italic">
            Component library successfully mapped. Documentation structures ready in `/docs` folder. UI framework loaded and baseline layouts confirmed. Use the **Catalog** view above to inspect curriculum branches.
          </p>
        </div>

      </div>

    </motion.div>
  );
};
