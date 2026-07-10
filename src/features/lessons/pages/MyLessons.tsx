/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  AlertCircle,
  Search,
  Check,
  ExternalLink,
  Layers
} from 'lucide-react';

interface SourceOrgUnit {
  id: string;
  name: string;
}

interface SourceLearningGroup {
  id: string;
  name: string;
}

interface InstanceSource {
  id: string;
  sourceType: 'MANUAL' | 'ORGANIZATION_UNIT' | 'LEARNING_GROUP' | 'SELF_ASSIGNED' | 'MANDATORY' | 'API';
  sourceOrganizationUnitId: string | null;
  sourceOrganizationUnit: SourceOrgUnit | null;
  sourceLearningGroupId: string | null;
  sourceLearningGroup: SourceLearningGroup | null;
}

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  completionRule: 'MARKED_COMPLETE' | 'QUIZ_PASSED' | 'MIN_SCORE' | 'ACKNOWLEDGEMENT' | 'CUSTOM';
}

interface Assignment {
  id: string;
  lesson: Lesson;
}

interface UserAssignmentInstance {
  id: string;
  assignmentId: string;
  userId: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  dueDate: string | null;
  completedAt: string | null;
  progressPercent: number;
  sources: InstanceSource[];
  assignment: Assignment;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const MyLessons: React.FC = () => {
  const [instances, setInstances] = useState<UserAssignmentInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const fetchMyLessons = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/assignment-instances');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch assigned lessons.');
      }
      const data = await res.json();
      setInstances(data);
    } catch (err: any) {
      setError(err.message || 'Error loading lessons.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLessons();
  }, []);

  const handleMarkComplete = async (instanceId: string) => {
    setError('');
    setSuccess('');
    setIsActionLoading(instanceId);
    try {
      const res = await fetch(`/api/assignment-instances/${instanceId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark lesson as complete.');
      }

      setSuccess('Lesson completed successfully!');
      // Refresh local list
      await fetchMyLessons();
    } catch (err: any) {
      setError(err.message || 'Error completing lesson.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRemoveSelfAssignment = async (instanceId: string) => {
    if (!confirm('Are you sure you want to remove this self-assigned lesson?')) {
      return;
    }

    setError('');
    setSuccess('');
    setIsActionLoading(instanceId);
    try {
      const res = await fetch(`/api/assignments/self-assign/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove self-assigned lesson.');
      }

      setSuccess('Self-assigned lesson removed successfully.');
      // Refresh local list
      await fetchMyLessons();
    } catch (err: any) {
      setError(err.message || 'Error removing lesson.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const isOverdue = (inst: UserAssignmentInstance) => {
    if (inst.status === 'COMPLETED' || !inst.dueDate) return false;
    return new Date(inst.dueDate) < new Date();
  };

  // Determine if instance is purely self-assigned and therefore removable
  const canRemove = (inst: UserAssignmentInstance) => {
    if (!inst.sources || inst.sources.length === 0) return false;
    // Removable ONLY if every single source is SELF_ASSIGNED
    return inst.sources.every((src) => src.sourceType === 'SELF_ASSIGNED');
  };

  // Filter lessons based on search and selected tab
  const filteredInstances = instances.filter((inst) => {
    const titleMatch = inst.assignment?.lesson?.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    if (!titleMatch) return false;

    if (activeFilter === 'IN_PROGRESS') {
      return inst.status !== 'COMPLETED';
    }
    if (activeFilter === 'COMPLETED') {
      return inst.status === 'COMPLETED';
    }

    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
      id="my-lessons-root"
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 font-sans">
            My Lessons & Assignments
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            View, track progress, and complete your assigned learning content.
          </p>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 shadow-sm"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action and Filter controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl self-start md:self-auto">
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wide ${
                activeFilter === filter
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Primary List Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400 font-medium">Loading assigned lessons...</p>
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-600">No lessons found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm 
              ? "We couldn't find any lessons matching your search query. Try another term!"
              : "You do not have any lessons assigned to you in this section. Explore courses to self-assign published content!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((inst) => {
            const overdue = isOverdue(inst);
            const removable = canRemove(inst);
            const isCompleted = inst.status === 'COMPLETED';

            return (
              <div
                key={inst.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs hover:shadow-md transition-all gap-5 ${
                  overdue ? 'border-rose-200 bg-rose-50/5' : 'border-slate-200'
                }`}
                id={`lesson-card-${inst.id}`}
              >
                {/* Card Top: Header / Meta */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : overdue
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      {isCompleted ? 'Completed' : overdue ? 'Overdue' : 'In Progress'}
                    </span>

                    {/* Sources Badge Row */}
                    <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
                      {inst.sources?.map((src) => {
                        let shortLabel: string = src.sourceType;
                        if (src.sourceType === 'SELF_ASSIGNED') shortLabel = 'Self';
                        else if (src.sourceType === 'MANDATORY') shortLabel = 'Mandatory';
                        else if (src.sourceType === 'ORGANIZATION_UNIT') shortLabel = 'Dept';
                        else if (src.sourceType === 'LEARNING_GROUP') shortLabel = 'Group';

                        return (
                          <span
                            key={src.id}
                            title={`Assigned via ${src.sourceType}`}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-150"
                          >
                            {shortLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base leading-tight font-sans">
                      {inst.assignment?.lesson?.title || 'Untitled Lesson'}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wide flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-300" />
                      Rule: {inst.assignment?.lesson?.completionRule || 'MARKED_COMPLETE'}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Progress / Actions */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>Progress</span>
                      <span className="text-slate-600 font-mono">{inst.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : overdue ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${inst.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
                    {inst.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Due {new Date(inst.dueDate).toLocaleDateString()}</span>
                      </span>
                    )}
                    {isCompleted && inst.completedAt && (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check className="h-3.5 w-3.5" />
                        <span>Done {new Date(inst.completedAt).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-2">
                    {/* Mark Complete Action (only if rule is MARKED_COMPLETE) */}
                    {!isCompleted && inst.assignment?.lesson?.completionRule === 'MARKED_COMPLETE' && (
                      <button
                        onClick={() => handleMarkComplete(inst.id)}
                        disabled={isActionLoading !== null}
                        className="flex-1 flex items-center justify-center space-x-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                        id={`mark-complete-btn-${inst.id}`}
                      >
                        {isActionLoading === inst.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Mark Complete</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Self Assignment Removal Action (ONLY shown/enabled for completely self-assigned instances) */}
                    {removable && (
                      <button
                        onClick={() => handleRemoveSelfAssignment(inst.id)}
                        disabled={isActionLoading !== null}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2.5 bg-white text-rose-600 hover:text-rose-700 border border-slate-200 hover:bg-rose-50/50 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        title="Remove self-assignment"
                        id={`remove-self-assign-btn-${inst.id}`}
                      >
                        {isActionLoading === inst.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
