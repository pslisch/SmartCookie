/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  Search,
  Filter,
  Check,
  Building,
  GraduationCap,
  Sparkles,
  BarChart3,
  Eye
} from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { AssignmentInstanceReport } from '../components/AssignmentInstanceReport';

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
}

interface Course {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
}

interface Target {
  id: string;
  user?: { id: string; username: string; email: string };
  organizationUnit?: { id: string; name: string };
  learningGroup?: { id: string; name: string };
}

interface Assignment {
  id: string;
  lesson: Lesson;
  assignmentType: 'IMMEDIATE' | 'SCHEDULED';
  scheduledFor: string | null;
  dueDateDefaultDays: number | null;
  isMandatory: boolean;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CANCELLED' | 'ARCHIVED';
  courseAssignmentBatchId: string | null;
  createdAt: string;
  targets: Target[];
}

interface UserOption {
  id: string;
  username: string;
  email: string;
}

interface OUOption {
  id: string;
  name: string;
}

interface LGOption {
  id: string;
  name: string;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const AssignmentManagement: React.FC = () => {
  const { t } = useTranslation();

  // Permissions
  const canCreate = usePermission('assignments', 'create');
  const canDelete = usePermission('assignments', 'delete');
  const canCreateMandatory = usePermission('assignments', 'create-mandatory');
  const canViewReports = usePermission('assignments', 'view-reports');

  // Lists and Data
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [publishedLessons, setPublishedLessons] = useState<Lesson[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<Course[]>([]);
  const [selectedReportAssignment, setSelectedReportAssignment] = useState<{ id: string; title: string } | null>(null);
  
  // Options for Target Selection
  const [users, setUsers] = useState<UserOption[]>([]);
  const [ous, setOus] = useState<OUOption[]>([]);
  const [lgs, setLgs] = useState<LGOption[]>([]);

  // Loading / Messages
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form & Modal States
  const [showCreateModal, setShowCreateModal] = useState<false | 'lesson' | 'course'>(false);
  
  // Form fields
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignmentType, setAssignmentType] = useState<'IMMEDIATE' | 'SCHEDULED'>('IMMEDIATE');
  const [scheduledForDate, setScheduledForDate] = useState('');
  const [dueDateDays, setDueDateDays] = useState<number>(14);
  const [isMandatory, setIsMandatory] = useState(false);

  // Target Picker Selected State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedOUIds, setSelectedOUIds] = useState<string[]>([]);
  const [selectedLGIds, setSelectedLGIds] = useState<string[]>([]);

  // Search inside target picker
  const [targetSearch, setTargetSearch] = useState('');

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch Assignments
      const assignmentsRes = await fetch('/api/assignments');
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data);
      }

      // 2. Fetch Lessons to filter for Published
      const lessonsRes = await fetch('/api/lessons');
      if (lessonsRes.ok) {
        const data = await lessonsRes.json();
        setPublishedLessons(data.filter((l: Lesson) => l.status === 'PUBLISHED'));
      }

      // 3. Fetch Courses to filter for Published
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setPublishedCourses(data.filter((c: Course) => c.status === 'PUBLISHED'));
      }

      // 4. Fetch Users for targets
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }

      // 5. Fetch OUs for targets
      const ousRes = await fetch('/api/organization-units');
      if (ousRes.ok) {
        const data = await ousRes.json();
        setOus(data);
      }

      // 6. Fetch Learning Groups for targets
      const lgsRes = await fetch('/api/learning-groups');
      if (lgsRes.ok) {
        const data = await lgsRes.json();
        setLgs(data);
      }
    } catch (err: any) {
      setError(t('assignments.management.initialDataError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Format Targets Summary
  const getTargetsSummary = (targets: Target[]) => {
    if (!targets || targets.length === 0) return t('assignments.management.allMembers');
    
    const parts: string[] = [];
    const userCount = targets.filter((t) => t.user).length;
    const ouCount = targets.filter((t) => t.organizationUnit).length;
    const lgCount = targets.filter((t) => t.learningGroup).length;

    if (userCount > 0) parts.push(t('assignments.management.usersCount', { count: userCount }));
    if (ouCount > 0) parts.push(t('assignments.management.deptsCount', { count: ouCount }));
    if (lgCount > 0) parts.push(t('assignments.management.groupsCount', { count: lgCount }));

    return parts.join(', ');
  };

  // Handle Cancel Assignment Action
  const handleCancelAssignment = async (assignmentId: string) => {
    if (!confirm(t('assignments.management.cancelConfirm'))) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('assignments.management.cancelError'));
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: 'CANCELLED' } : a))
      );
      setSuccess(t('assignments.management.cancelSuccess'));
    } catch (err: any) {
      setError(err.message || t('assignments.management.cancelError'));
    }
  };

  // Submission handler
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    // Validations
    if (showCreateModal === 'lesson' && !selectedLessonId) {
      setError(t('assignments.management.createModal.selectLessonError'));
      return;
    }
    if (showCreateModal === 'course' && !selectedCourseId) {
      setError(t('assignments.management.createModal.selectCourseError'));
      return;
    }

    // Build Targets list
    const targetsPayload: any[] = [];
    selectedUserIds.forEach((uid) => targetsPayload.push({ userId: uid }));
    selectedOUIds.forEach((ouid) => targetsPayload.push({ organizationUnitId: ouid }));
    selectedLGIds.forEach((lgid) => targetsPayload.push({ learningGroupId: lgid }));

    setIsActionLoading(true);

    try {
      const endpoint = showCreateModal === 'lesson' ? '/api/assignments' : '/api/assignments/course';
      const body: any = {
        targets: targetsPayload,
        type: assignmentType,
        scheduledFor: assignmentType === 'SCHEDULED' ? scheduledForDate : null,
        dueDateDefaultDays: Number(dueDateDays),
        isMandatory: isMandatory && canCreateMandatory,
      };

      if (showCreateModal === 'lesson') {
        body.lessonId = selectedLessonId;
      } else {
        body.courseId = selectedCourseId;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('assignments.management.createError'));
      }

      const created = await res.json();

      // Refresh assignments
      const assignmentsRes = await fetch('/api/assignments');
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data);
      }

      setSuccess(t('assignments.management.createSuccess'));
      closeAndResetForm();
    } catch (err: any) {
      setError(err.message || t('assignments.management.createError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const closeAndResetForm = () => {
    setShowCreateModal(false);
    setSelectedLessonId('');
    setSelectedCourseId('');
    setAssignmentType('IMMEDIATE');
    setScheduledForDate('');
    setDueDateDays(14);
    setIsMandatory(false);
    setSelectedUserIds([]);
    setSelectedOUIds([]);
    setSelectedLGIds([]);
    setTargetSearch('');
  };

  // Filter list by selected status
  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  // Toggle selection helpers for checklists
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleOUSelection = (ouId: string) => {
    setSelectedOUIds((prev) =>
      prev.includes(ouId) ? prev.filter((id) => id !== ouId) : [...prev, ouId]
    );
  };

  const toggleLGSelection = (lgId: string) => {
    setSelectedLGIds((prev) =>
      prev.includes(lgId) ? prev.filter((id) => id !== lgId) : [...prev, lgId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="assignment-management-page">
      {/* Action and Alert messages */}
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

      {/* Top action bar: Filters and Creation buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
          {['ALL', 'ACTIVE', 'SCHEDULED', 'CANCELLED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st === 'ALL'
                ? t('assignments.management.all')
                : st === 'ACTIVE'
                ? t('assignments.management.active')
                : st === 'SCHEDULED'
                ? t('assignments.management.scheduled')
                : st === 'CANCELLED'
                ? t('assignments.management.cancelled')
                : t('assignments.management.archived')}
            </button>
          ))}
        </div>

        {/* Create Flow triggers */}
        {canCreate && (
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                setError('');
                setSuccess('');
                setShowCreateModal('lesson');
              }}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              id="assign-lesson-btn"
            >
              <Plus className="h-4 w-4" />
              <span>{t('assignments.management.assignLessonBtn')}</span>
            </button>
            <button
              onClick={() => {
                setError('');
                setSuccess('');
                setShowCreateModal('course');
              }}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
              id="assign-course-btn"
            >
              <Plus className="h-4 w-4" />
              <span>{t('assignments.management.assignCourseBtn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary List View */}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          {t('assignments.management.noAssignments')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* We group list items. Course batches are displayed nicely together. */}
          {(() => {
            // Group assignments by course batch id or render singly
            const processedBatches = new Set<string>();
            return filteredAssignments.map((assignment) => {
              const batchId = assignment.courseAssignmentBatchId;

              // If it's part of a course batch, and we haven't rendered the batch card container yet
              if (batchId && !processedBatches.has(batchId)) {
                processedBatches.add(batchId);
                const batchItems = filteredAssignments.filter(
                  (a) => a.courseAssignmentBatchId === batchId
                );

                return (
                  <div
                    key={`batch-${batchId}`}
                    className="rounded-2xl border border-blue-200 bg-blue-50/20 p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <Sparkles className="h-3 w-3" />
                        </span>
                        <h3 className="text-sm font-bold text-blue-800">
                          {t('assignments.management.courseBatch')}
                        </h3>
                        <span className="text-[10px] font-mono bg-blue-100/50 text-blue-600 px-1.5 py-0.5 rounded">
                          {t('assignments.management.batchIdLabel', { id: batchId.substring(0, 8) })}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-600">
                        {t('assignments.management.fannedOut', { count: batchItems.length })}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {batchItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (canViewReports) {
                              setSelectedReportAssignment({ id: item.id, title: item.lesson.title });
                            }
                          }}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-slate-150 bg-white shadow-xs hover:border-slate-300 transition-all gap-4 ${
                            canViewReports ? 'cursor-pointer hover:bg-slate-50/50 hover:shadow-xs' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2.5">
                              <h4 className="font-bold text-slate-800 text-sm font-sans">
                                {item.lesson.title}
                              </h4>
                              {item.isMandatory && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                                  {t('assignments.management.mandatory')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center text-xs text-slate-400 mt-1 gap-x-3 gap-y-1">
                              <span className="flex items-center space-x-1">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                <span>{t('assignments.management.targetSummary', { summary: getTargetsSummary(item.targets) })}</span>
                              </span>
                              <span>&bull;</span>
                              <span>{t('assignments.management.typeLabel', { type: item.assignmentType })}</span>
                              <span>&bull;</span>
                              <span>
                                {t('assignments.management.assignedOn', { date: new Date(item.createdAt).toLocaleDateString() })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-sans border ${
                                item.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : item.status === 'SCHEDULED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}
                            >
                              {item.status}
                            </span>

                            {canViewReports && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReportAssignment({ id: item.id, title: item.lesson.title });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                                title={t('assignments.management.viewReportTooltip')}
                                id={`view-report-btn-${item.id}`}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </button>
                            )}

                            {canDelete && item.status !== 'CANCELLED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelAssignment(item.id);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                                title={t('assignments.management.cancelAssignmentTooltip')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } else if (!batchId) {
                // Render singular lesson assignments
                return (
                  <div
                    key={assignment.id}
                    onClick={() => {
                      if (canViewReports) {
                        setSelectedReportAssignment({ id: assignment.id, title: assignment.lesson.title });
                      }
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all gap-4 ${
                      canViewReports ? 'cursor-pointer hover:bg-slate-50/50 hover:shadow-sm' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <h4 className="font-bold text-slate-800 text-sm sm:text-base font-sans">
                          {assignment.lesson.title}
                        </h4>
                        {assignment.isMandatory && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                            {t('assignments.management.mandatory')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center text-xs text-slate-400 mt-1.5 gap-x-3 gap-y-1">
                        <span className="flex items-center space-x-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t('assignments.management.targetSummary', { summary: getTargetsSummary(assignment.targets) })}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{t('assignments.management.typeLabel', { type: assignment.assignmentType })}</span>
                        <span>&bull;</span>
                        <span>{t('assignments.management.assignedOn', { date: new Date(assignment.createdAt).toLocaleDateString() })}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans border ${
                          assignment.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : assignment.status === 'SCHEDULED'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}
                      >
                        {assignment.status}
                      </span>

                      {canViewReports && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportAssignment({ id: assignment.id, title: assignment.lesson.title });
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                          title={t('assignments.management.viewReportTooltip')}
                          id={`view-report-btn-${assignment.id}`}
                        >
                          <BarChart3 className="h-4.5 w-4.5" />
                        </button>
                      )}

                      {canDelete && assignment.status !== 'CANCELLED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelAssignment(assignment.id);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                          title={t('assignments.management.cancelAssignmentTooltip')}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return null; // For duplicate batch IDs that are skipped
            });
          })()}
        </div>
      )}

      {/* CREATE ASSIGNMENT FLOW DIALOG MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 font-sans flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span>{showCreateModal === 'lesson' ? t('assignments.management.createModal.lessonTitle') : t('assignments.management.createModal.courseTitle')}</span>
              </h3>
              <button
                onClick={closeAndResetForm}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                {t('assignments.management.createModal.cancelBtn')}
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-5">
              {/* Content Selection - Only published shown */}
              {showCreateModal === 'lesson' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('assignments.management.createModal.selectLesson')}
                  </label>
                  <select
                    required
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t('assignments.management.createModal.chooseLesson')}</option>
                    {publishedLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('assignments.management.createModal.selectCourse')}
                  </label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t('assignments.management.createModal.chooseCourse')}</option>
                    {publishedCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gated Target Picker Checklist UI */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('assignments.management.createModal.targetPicker')}
                  </span>
                  {/* Search filter inside picker */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={t('assignments.management.createModal.searchTargets')}
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 pl-8 text-xs focus:outline-none focus:border-blue-500 w-full sm:w-48 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-60 overflow-y-auto border border-slate-200 p-3 rounded-xl bg-slate-50/50">
                  {/* Column 1: Departments / OUs */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 sticky top-0 bg-slate-50 py-1 border-b border-slate-100 mb-1 z-10">
                      <Building className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700">{t('assignments.management.createModal.departments')}</span>
                    </div>
                    {ous
                      .filter((ou) =>
                        ou.name.toLowerCase().includes(targetSearch.toLowerCase())
                      )
                      .map((ou) => (
                        <label
                          key={ou.id}
                          className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOUIds.includes(ou.id)}
                            onChange={() => toggleOUSelection(ou.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{ou.name}</span>
                        </label>
                      ))}
                    {ous.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">{t('assignments.management.createModal.noDepartments')}</p>
                    )}
                  </div>

                  {/* Column 2: Cohorts / Learning Groups */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 sticky top-0 bg-slate-50 py-1 border-b border-slate-100 mb-1 z-10">
                      <GraduationCap className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-700">{t('assignments.management.createModal.learningCohorts')}</span>
                    </div>
                    {lgs
                      .filter((lg) =>
                        lg.name.toLowerCase().includes(targetSearch.toLowerCase())
                      )
                      .map((lg) => (
                        <label
                          key={lg.id}
                          className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLGIds.includes(lg.id)}
                            onChange={() => toggleLGSelection(lg.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{lg.name}</span>
                        </label>
                      ))}
                    {lgs.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">{t('assignments.management.createModal.noCohorts')}</p>
                    )}
                  </div>

                  {/* Column 3: Individual Users */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 sticky top-0 bg-slate-50 py-1 border-b border-slate-100 mb-1 z-10">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">{t('assignments.management.createModal.individualMembers')}</span>
                    </div>
                    {users
                      .filter((u) =>
                        u.username.toLowerCase().includes(targetSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(targetSearch.toLowerCase())
                      )
                      .map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate" title={u.email}>{u.username}</span>
                        </label>
                      ))}
                    {users.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">{t('assignments.management.createModal.noIndividualUsers')}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 mr-1.5 self-center">{t('assignments.management.createModal.selectedLabel')}</span>
                  {selectedOUIds.length === 0 && selectedLGIds.length === 0 && selectedUserIds.length === 0 && (
                    <span className="text-xs text-slate-400 italic">{t('assignments.management.createModal.wholeOrgDefault')}</span>
                  )}
                  {selectedOUIds.map((ouid) => (
                    <span key={ouid} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <span>{ous.find(o => o.id === ouid)?.name}</span>
                      <button type="button" onClick={() => toggleOUSelection(ouid)} className="text-indigo-400 hover:text-indigo-600 font-bold ml-1">&times;</button>
                    </span>
                  ))}
                  {selectedLGIds.map((lgid) => (
                    <span key={lgid} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <span>{lgs.find(g => g.id === lgid)?.name}</span>
                      <button type="button" onClick={() => toggleLGSelection(lgid)} className="text-emerald-400 hover:text-emerald-600 font-bold ml-1">&times;</button>
                    </span>
                  ))}
                  {selectedUserIds.map((uid) => (
                    <span key={uid} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      <span>{users.find(u => u.id === uid)?.username}</span>
                      <button type="button" onClick={() => toggleUserSelection(uid)} className="text-blue-400 hover:text-blue-600 font-bold ml-1">&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Assignment Type Options and Date Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('assignments.management.createModal.scheduleType')}
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAssignmentType('IMMEDIATE')}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        assignmentType === 'IMMEDIATE'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t('assignments.management.createModal.immediate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentType('SCHEDULED')}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                        assignmentType === 'SCHEDULED'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t('assignments.management.createModal.scheduled')}
                    </button>
                  </div>
                </div>

                {assignmentType === 'SCHEDULED' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t('assignments.management.createModal.releaseDateTime')}</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledForDate}
                      onChange={(e) => setScheduledForDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none animate-fade-in"
                    />
                  </div>
                )}
              </div>

              {/* Due Date Defaults and Mandatory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('assignments.management.createModal.defaultDueDays')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={dueDateDays}
                    onChange={(e) => setDueDateDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {canCreateMandatory && (
                  <div className="flex items-center self-end h-full pb-2.5">
                    <label className="flex items-center space-x-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMandatory}
                        onChange={(e) => setIsMandatory(e.target.checked)}
                        className="rounded h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <span>{t('assignments.management.createModal.mandatoryAssignment')}</span>
                        <p className="text-xs text-slate-400 font-normal mt-0.5">{t('assignments.management.createModal.mandatoryNote')}</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Form Action buttons */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAndResetForm}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('assignments.management.createModal.cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{t('assignments.management.createModal.createBtn')}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* REPORT VIEW MODAL */}
      <AnimatePresence>
        {selectedReportAssignment && (
          <AssignmentInstanceReport
            assignmentId={selectedReportAssignment.id}
            assignmentTitle={selectedReportAssignment.title}
            onClose={() => setSelectedReportAssignment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
