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
  Compass,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Eye,
  EyeOff,
  Upload,
  Pencil,
  FileCode2,
  Folder,
  Tag,
  User,
  Globe,
  History,
  Download,
  Archive,
  FileCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { ContentImportWizard } from '../../content/pages/ContentImportWizard';

interface ContentTag {
  id: string;
  tag: string;
}

interface ContentCategory {
  id: string;
  name: string;
}

interface ContentPackage {
  id: string;
  providerType: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  category: ContentCategory | null;
  author: string | null;
  language: string | null;
  version: number;
  contentGroupId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  storagePathZip: string;
  storagePathExtracted: string;
  launchFile: string;
  thumbnailPath: string | null;
  tags: ContentTag[];
  createdAt: string;
  updatedAt: string;
}

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  contentId?: string | null;
  content?: ContentPackage | null;
}

interface CourseLesson {
  courseId: string;
  lessonId: string;
  order: number;
  lesson: Lesson;
}

interface Course {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  courseLessons: CourseLesson[];
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const ContentManagement: React.FC = () => {
  const { t } = useTranslation();

  // Navigation: Lessons vs Courses Tab
  const [activeTab, setActiveTab] = useState<'lessons' | 'courses'>('lessons');

  // Lists
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Expanded lesson row IDs for detail inspection
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({});

  // Selection for course structure management
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]); // ordered lessons of selected course

  // Loading / Messages
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Version History Modal
  const [historyGroupId, setHistoryGroupId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyVersions, setHistoryVersions] = useState<ContentPackage[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const hasImportPermission = usePermission('content', 'import');

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/lessons');
      if (!res.ok) throw new Error(t('content.messages.fetchLessonsError'));
      const data = await res.json();
      setLessons(data);
    } catch (err: any) {
      setError(err.message || t('content.messages.fetchLessonsErr'));
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (!res.ok) throw new Error(t('content.messages.fetchCoursesError'));
      const data = await res.json();
      setCourses(data);

      // Keep selected course data fresh
      if (selectedCourse) {
        const fresh = data.find((c: Course) => c.id === selectedCourse.id);
        if (fresh) {
          setSelectedCourse(fresh);
          setCourseLessons((fresh.courseLessons || []).map((cl: CourseLesson) => cl.lesson));
        }
      }
    } catch (err: any) {
      setError(err.message || t('content.messages.fetchCoursesErr'));
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    setError('');
    await Promise.all([fetchLessons(), fetchCourses()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessonIds((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  // Handle Lesson Creation
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ title: titleInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('content.messages.createLessonError'));
      }

      const newLesson = await res.json();
      setLessons((prev) => [newLesson, ...prev]);
      setSuccess(t('content.messages.createLessonSuccess', { title: newLesson.title }));
      setShowCreateModal(false);
      setTitleInput('');
    } catch (err: any) {
      setError(err.message || t('content.messages.createLessonError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Course Creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ title: titleInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('content.messages.createCourseError'));
      }

      const newCourse = await res.json();
      setCourses((prev) => [newCourse, ...prev]);
      setSuccess(t('content.messages.createCourseSuccess', { title: newCourse.title }));
      setShowCreateModal(false);
      setTitleInput('');
    } catch (err: any) {
      setError(err.message || t('content.messages.createCourseError'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Toggle Publication status for Lesson
  const handleToggleLessonPublish = async (lesson: Lesson) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('content.messages.togglePublishError'));
      }

      const updated = await res.json();
      setLessons((prev) => prev.map((l) => (l.id === lesson.id ? updated : l)));
      setSuccess(
        t('content.messages.togglePublishSuccess', {
          title: lesson.title,
          status: updated.status === 'PUBLISHED' ? t('content.published') : t('content.draft')
        })
      );

      // Refresh courses as well to reflect changes in included lessons
      await fetchCourses();
    } catch (err: any) {
      setError(err.message || t('content.messages.togglePublishErr'));
    }
  };

  // Toggle Publication status for Course
  const handleToggleCoursePublish = async (course: Course) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/courses/${course.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('content.messages.togglePublishError'));
      }

      const updated = await res.json();
      setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)));
      setSuccess(
        t('content.messages.togglePublishCourseSuccess', {
          title: course.title,
          status: updated.status === 'PUBLISHED' ? t('content.published') : t('content.draft')
        })
      );
    } catch (err: any) {
      setError(err.message || t('content.messages.togglePublishErr'));
    }
  };

  // SCORM Content Package Actions
  const handlePublishContent = async (contentId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/content/${contentId}/publish`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || t('content.messages.publishContentErr'));
      }
      const updated = await res.json();
      setSuccess(t('content.messages.publishContentSuccess', { title: updated.title }));
      await fetchLessons();
    } catch (err: any) {
      setError(err.message || t('content.messages.publishContentErr'));
    }
  };

  const handleArchiveContent = async (contentId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/content/${contentId}/archive`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || t('content.messages.archiveContentErr'));
      }
      const updated = await res.json();
      setSuccess(t('content.messages.archiveContentSuccess', { title: updated.title }));
      await fetchLessons();
    } catch (err: any) {
      setError(err.message || t('content.messages.archiveContentErr'));
    }
  };

  const handleRestoreContent = async (contentId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/content/${contentId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ targetStatus: 'DRAFT' }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || t('content.messages.restoreContentErr'));
      }
      const updated = await res.json();
      setSuccess(t('content.messages.restoreContentSuccess', { title: updated.title }));
      await fetchLessons();
    } catch (err: any) {
      setError(err.message || t('content.messages.restoreContentErr'));
    }
  };

  const handleDownloadZip = (contentId: string) => {
    window.location.href = `/api/content/${contentId}/download`;
  };

  const handleViewHistory = async (contentGroupId: string, title: string) => {
    setHistoryGroupId(contentGroupId);
    setHistoryTitle(title);
    setIsHistoryLoading(true);
    setHistoryVersions([]);
    try {
      const res = await fetch(`/api/content/${contentGroupId}/versions`);
      if (!res.ok) throw new Error(t('content.messages.fetchVersionsErr'));
      const data = await res.json();
      setHistoryVersions(data);
    } catch (err: any) {
      setError(err.message || t('content.messages.fetchVersionsErr'));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handlePreviewLesson = (lesson: Lesson) => {
    if (lesson.content) {
      window.open(`/preview/content/${lesson.content.id}`, '_blank');
    }
  };

  // Course Lesson Ordering Helper Logic
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseLessons((course.courseLessons || []).map((cl) => cl.lesson));
    setError('');
    setSuccess('');
  };

  const handleAddLessonToCourse = (lesson: Lesson) => {
    if (courseLessons.some((l) => l.id === lesson.id)) return;
    setCourseLessons((prev) => [...prev, lesson]);
  };

  const handleRemoveLessonFromCourse = (lessonId: string) => {
    setCourseLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  const moveLessonOrder = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= courseLessons.length) return;

    const copy = [...courseLessons];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    setCourseLessons(copy);
  };

  const handleSaveCourseLessons = async () => {
    if (!selectedCourse) return;
    setError('');
    setSuccess('');
    setIsActionLoading(true);

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/lessons`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ lessonIds: courseLessons.map((l) => l.id) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('content.messages.saveCourseLessonsError'));
      }

      const updatedCourse = await res.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === selectedCourse.id ? updatedCourse : c))
      );
      setSelectedCourse(updatedCourse);
      setSuccess(t('content.messages.saveCourseLessonsSuccess', { title: selectedCourse.title }));
    } catch (err: any) {
      setError(err.message || t('content.messages.saveCourseLessonsErr'));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="content-management-page">
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

      {/* Main navigation tabs and Creation button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => {
              setActiveTab('lessons');
              setSelectedCourse(null);
            }}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'lessons'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-btn-lessons"
          >
            {t('content.lessonsTab')}
          </button>
          <button
            onClick={() => {
              setActiveTab('courses');
            }}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'courses'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-btn-courses"
          >
            {t('content.coursesTab')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'lessons' && hasImportPermission && (
            <button
              onClick={() => {
                setError('');
                setSuccess('');
                setShowImportWizard(true);
              }}
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-950"
              id="btn-import-scorm-package"
            >
              <Upload className="h-4 w-4" />
              <span>{t('content.importScormBtn')}</span>
            </button>
          )}

          <button
            onClick={() => {
              setError('');
              setSuccess('');
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            id="btn-create-lesson-or-course"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === 'lessons' ? t('content.createLessonBtn') : t('content.createCourseBtn')}</span>
          </button>
        </div>
      </div>

      {/* Primary Panels layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left main column: List of items */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 font-sans">
            {activeTab === 'lessons' ? t('content.allLessons') : t('content.allCourses')}
          </h2>

          {activeTab === 'lessons' ? (
            lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                {t('content.noLessons')}
              </div>
            ) : (
              <div className="divide-y divide-slate-150 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm" id="lessons-list">
                {lessons.map((lesson) => {
                  const isExpanded = !!expandedLessonIds[lesson.id];
                  const hasScorm = !!lesson.content;

                  return (
                    <div key={lesson.id} className="transition-colors">
                      {/* Primary Lesson Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/50 gap-4">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleLessonExpansion(lesson.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-0.5 sm:mt-0 flex-shrink-0"
                            title={isExpanded ? t('content.hideDetailsBtn') : t('content.detailsBtn')}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-800 text-sm sm:text-base font-sans truncate">
                                {lesson.title}
                              </h4>
                              {hasScorm && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                  <FileCode2 className="h-3 w-3 text-blue-500" />
                                  <span>{t('content.scormBadge')}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {t('content.createdAt', { date: new Date(lesson.createdAt).toLocaleDateString() })}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons on the row */}
                        <div className="flex items-center space-x-2.5 self-end sm:self-auto flex-shrink-0">
                          {/* Preview Action: opens SCORM package in a new tab */}
                          {hasScorm ? (
                            <button
                              onClick={() => handlePreviewLesson(lesson)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all shadow-xs"
                              title={t('content.previewTooltip')}
                            >
                              <Eye className="h-3.5 w-3.5 text-amber-600" />
                              <span>{t('content.previewBtn')}</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-300 text-xs font-bold cursor-not-allowed"
                              title={t('content.previewDisabledTooltip')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{t('content.previewBtn')}</span>
                            </button>
                          )}

                          {/* Edit Action: non-functional placeholder for future Lesson Builder */}
                          <button
                            disabled
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-bold cursor-not-allowed"
                            title={t('content.editTooltip')}
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-400" />
                            <span>{t('content.editBtn')}</span>
                          </button>

                          {/* Status indicator */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans ${
                              lesson.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-50 text-slate-600 border border-slate-100'
                            }`}
                          >
                            {lesson.status === 'PUBLISHED' ? t('content.published') : t('content.draft')}
                          </span>

                          {/* Action Publish/Unpublish */}
                          <button
                            onClick={() => handleToggleLessonPublish(lesson)}
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors shadow-sm ${
                              lesson.status === 'PUBLISHED'
                                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                            title={lesson.status === 'PUBLISHED' ? t('content.unpublishTooltip') : t('content.publishTooltip')}
                          >
                            {lesson.status === 'PUBLISHED' ? (
                              <EyeOff className="h-4.5 w-4.5" />
                            ) : (
                              <Eye className="h-4.5 w-4.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable SCORM / Content details panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 overflow-hidden"
                          >
                            {lesson.content ? (
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-slate-800">
                                        {lesson.content.title}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                                        {t('content.versionLabel', { version: lesson.content.version })}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                          lesson.content.status === 'PUBLISHED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : lesson.content.status === 'ARCHIVED'
                                            ? 'bg-slate-200 text-slate-600 border-slate-300'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}
                                      >
                                        {lesson.content.status}
                                      </span>
                                    </div>

                                    <p className="text-xs text-slate-500 font-medium">
                                      {lesson.content.description || t('content.noDescription')}
                                    </p>
                                  </div>

                                  {/* Action Buttons for Content Package */}
                                  <div className="flex items-center gap-2 flex-wrap self-start">
                                    <button
                                      onClick={() => handleViewHistory(lesson.content!.contentGroupId, lesson.content!.title)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:border-blue-200 shadow-2xs transition-colors"
                                      title={t('content.versionHistoryBtn')}
                                    >
                                      <History className="h-3.5 w-3.5" />
                                      <span>{t('content.versionHistoryBtn')}</span>
                                    </button>

                                    <button
                                      onClick={() => handleDownloadZip(lesson.content!.id)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs transition-colors"
                                      title={t('content.downloadZipBtn')}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>{t('content.downloadZipBtn')}</span>
                                    </button>

                                    {lesson.content.status === 'DRAFT' && (
                                      <button
                                        onClick={() => handlePublishContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>{t('content.publishContentBtn')}</span>
                                      </button>
                                    )}

                                    {lesson.content.status !== 'ARCHIVED' && (
                                      <button
                                        onClick={() => handleArchiveContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 bg-white border border-slate-200 hover:border-rose-200 rounded-lg shadow-2xs transition-colors"
                                      >
                                        <Archive className="h-3.5 w-3.5" />
                                        <span>{t('content.archiveContentBtn')}</span>
                                      </button>
                                    )}

                                    {lesson.content.status === 'ARCHIVED' && (
                                      <button
                                        onClick={() => handleRestoreContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
                                      >
                                        <FileCheck className="h-3.5 w-3.5" />
                                        <span>{t('content.restoreContentBtn')}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata Badges */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
                                  {lesson.content.category && (
                                    <div className="flex items-center gap-1.5 text-slate-600 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200/60">
                                      <Folder className="h-3.5 w-3.5 text-slate-400" />
                                      <span>{lesson.content.category.name}</span>
                                    </div>
                                  )}

                                  {lesson.content.author && (
                                    <span className="inline-flex items-center gap-1 bg-white text-slate-600 px-2.5 py-1 rounded-md font-bold border border-slate-200/60">
                                      <User className="h-3 w-3 text-slate-400" />
                                      {t('content.authorLabel', { author: lesson.content.author })}
                                    </span>
                                  )}

                                  {lesson.content.language && (
                                    <span className="inline-flex items-center gap-1 bg-white text-slate-600 px-2.5 py-1 rounded-md font-bold border border-slate-200/60">
                                      <Globe className="h-3 w-3 text-slate-400" />
                                      {t('content.languageLabel', { language: lesson.content.language })}
                                    </span>
                                  )}

                                  {lesson.content.tags && lesson.content.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {lesson.content.tags.map((tg) => (
                                        <span
                                          key={tg.id}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/60"
                                        >
                                          <Tag className="h-2.5 w-2.5 text-blue-400" />
                                          {tg.tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="py-2 flex items-center justify-between">
                                <p className="text-xs text-slate-400 italic">
                                  {t('content.noLinkedScorm')}
                                </p>
                                {hasImportPermission && (
                                  <button
                                    onClick={() => {
                                      setError('');
                                      setSuccess('');
                                      setShowImportWizard(true);
                                    }}
                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                                  >
                                    <Upload className="h-3 w-3" />
                                    <span>{t('content.importScormBtn')}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              {t('content.noCourses')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm" id="courses-list">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/50 transition-colors gap-4 ${
                    selectedCourse?.id === course.id ? 'bg-blue-50/30 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base font-sans">
                        {course.title}
                      </h4>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {t('content.lessonsCount', { count: (course.courseLessons || []).length })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('content.createdAt', { date: new Date(course.createdAt).toLocaleDateString() })}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    {/* Status indicator */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans ${
                        course.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}
                    >
                      {course.status === 'PUBLISHED' ? t('content.published') : t('content.draft')}
                    </span>

                    {/* Manage internal lessons */}
                    <button
                      onClick={() => handleSelectCourse(course)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                        selectedCourse?.id === course.id
                          ? 'border-blue-300 bg-blue-100 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{t('content.structureBtn')}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    {/* Toggle publish button */}
                    <button
                      onClick={() => handleToggleCoursePublish(course)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors shadow-sm ${
                        course.status === 'PUBLISHED'
                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                      title={course.status === 'PUBLISHED' ? t('content.unpublishTooltip') : t('content.publishTooltip')}
                    >
                      {course.status === 'PUBLISHED' ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar column: Structure and Ordering manager for Courses */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 font-sans">
            {t('content.courseStructureTitle')}
          </h2>

          {selectedCourse ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4 shadow-sm">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">{t('content.editingCourse')}</span>
                  <h3 className="font-bold text-slate-800 text-base">{selectedCourse.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  {t('content.deselectBtn')}
                </button>
              </div>

              {/* Orderable lists */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500">{t('content.orderedList')}</span>
                {courseLessons.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-xl bg-white">
                    {t('content.noLessonsInCourse')}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {courseLessons.map((les, index) => (
                      <div
                        key={les.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs shadow-sm"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-bold text-slate-400 w-4 text-center">
                            {index + 1}
                          </span>
                          <span className="font-bold text-slate-700 truncate">{les.title}</span>
                          {les.status === 'DRAFT' && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                              {t('content.draftBadge')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => moveLessonOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            title={t('content.arrowUpTooltip')}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLessonOrder(index, 'down')}
                            disabled={index === courseLessons.length - 1}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            title={t('content.arrowDownTooltip')}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveLessonFromCourse(les.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                            title={t('content.removeLessonTooltip')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save structure action button */}
              <button
                onClick={handleSaveCourseLessons}
                disabled={isActionLoading}
                className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-slate-800 text-white font-bold py-2 text-sm shadow hover:bg-slate-950 transition-colors disabled:opacity-50"
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{t('content.saveStructureBtn')}</span>
                )}
              </button>

              {/* Picker list to add lessons */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <span className="text-xs font-bold text-slate-500">{t('content.addLessonToCourse')}</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {lessons
                    .filter((l) => !courseLessons.some((cl) => cl.id === l.id))
                    .map((l) => (
                      <button
                        key={l.id}
                        onClick={() => handleAddLessonToCourse(l)}
                        className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white text-xs hover:border-blue-300 hover:bg-blue-50/20 text-left"
                      >
                        <span className="font-bold text-slate-700 truncate">{l.title}</span>
                        <PlusCircle className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  {lessons.filter((l) => !courseLessons.some((cl) => cl.id === l.id)).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                      {t('content.allLessonsInCourse')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
              {t('content.selectCourseFirst')}
            </div>
          )}
        </div>
      </div>

      {/* VERSION HISTORY MODAL */}
      {historyGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  <span>{t('content.versionHistoryModal.title')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium truncate">
                  {historyTitle}
                </p>
              </div>
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-400 font-bold">{t('content.messages.fetchVersionsErr')}</p>
                </div>
              ) : historyVersions.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs font-bold">{t('content.versionHistoryModal.noVersions')}</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                  {historyVersions.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-sm">
                            {t('content.versionLabel', { version: ver.version })}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                              ver.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : ver.status === 'ARCHIVED'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold">
                          {t('content.versionHistoryModal.uploaded', { date: new Date(ver.createdAt).toLocaleString() })}
                        </p>
                        {ver.author && (
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {t('content.authorLabel', { author: ver.author })}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadZip(ver.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t('content.downloadZipBtn')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MVP Notice */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>
                  {t('content.versionHistoryModal.mvpNote')}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                {t('content.versionHistoryModal.closeBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* STUB CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {activeTab === 'lessons' ? t('content.createModal.newLessonTitle') : t('content.createModal.newCourseTitle')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                {t('content.createModal.cancelBtn')}
              </button>
            </div>

            <form
              onSubmit={activeTab === 'lessons' ? handleCreateLesson : handleCreateCourse}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t('content.createModal.titleLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={
                    activeTab === 'lessons' ? t('content.createModal.lessonPlaceholder') : t('content.createModal.coursePlaceholder')
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('content.createModal.cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !titleInput.trim()}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{t('content.createModal.createBtn')}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CONTENT IMPORT WIZARD MODAL */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8">
            <ContentImportWizard
              onClose={() => setShowImportWizard(false)}
              onSuccess={() => {
                setShowImportWizard(false);
                loadAll();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
