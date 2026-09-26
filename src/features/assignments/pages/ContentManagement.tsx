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
  const [lessonCreationMode, setLessonCreationMode] = useState<'blank' | 'import'>('blank');

  interface PackageImportOption {
    id: string;
    name: string;
    description: string;
    badge?: string;
    icon: React.ElementType;
    onSelect: () => void;
  }

  const packageImportOptions: PackageImportOption[] = [
    {
      id: 'scorm',
      name: t('content.createModal.packageScormTitle', 'SCORM Package (.zip)'),
      description: t('content.createModal.packageScormDesc', 'Upload a SCORM 1.2 package archive containing imsmanifest.xml.'),
      badge: 'SCORM 1.2',
      icon: Upload,
      onSelect: () => {
        setShowCreateModal(false);
        setShowImportWizard(true);
      },
    },
  ];

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
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
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
            className="flex items-center space-x-2.5 rounded-xl border border-card-border bg-status-error-bg p-4 text-status-error-text shadow-sm"
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
            className="flex items-center space-x-2.5 rounded-xl border border-card-border bg-status-success-bg p-4 text-status-success-text shadow-sm"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main navigation tabs and Creation button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-card-border pb-4 gap-4">
        <div className="flex bg-bg-subtle p-1 rounded-xl self-start">
          <button
            onClick={() => {
              setActiveTab('lessons');
              setSelectedCourse(null);
            }}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'lessons'
                ? 'bg-card-bg text-text-heading shadow-sm'
                : 'text-text-muted hover:text-text-heading'
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
                ? 'bg-card-bg text-text-heading shadow-sm'
                : 'text-text-muted hover:text-text-heading'
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
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-bg-inverse px-4 py-2.5 text-sm font-bold text-text-inverse shadow-sm transition-colors hover:bg-bg-inverse/90"
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
              setLessonCreationMode('blank');
              setTitleInput('');
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-link-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-link-primary-hover"
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
          <h2 className="text-lg font-bold text-text-heading font-sans">
            {activeTab === 'lessons' ? t('content.allLessons') : t('content.allCourses')}
          </h2>

          {activeTab === 'lessons' ? (
            lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-12 text-center text-text-muted">
                {t('content.noLessons')}
              </div>
            ) : (
              <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-sm" id="lessons-list">
                {lessons.map((lesson) => {
                  const isExpanded = !!expandedLessonIds[lesson.id];
                  const hasScorm = !!lesson.content;

                  return (
                    <div key={lesson.id} className="transition-colors">
                      {/* Primary Lesson Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-card-header-bg gap-4">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleLessonExpansion(lesson.id)}
                            className="p-1 rounded-lg text-text-muted hover:text-text-heading hover:bg-bg-subtle transition-colors mt-0.5 sm:mt-0 flex-shrink-0"
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
                              <h4 className="font-bold text-text-heading text-sm sm:text-base font-sans truncate">
                                {lesson.title}
                              </h4>
                              {hasScorm && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-status-info-bg text-status-info-text border border-card-border flex-shrink-0">
                                  <FileCode2 className="h-3 w-3 text-link-primary" />
                                  <span>{t('content.scormBadge')}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
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
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-border bg-status-warning-bg hover:bg-status-warning-bg/80 text-status-warning-text text-xs font-bold transition-all shadow-xs"
                              title={t('content.previewTooltip')}
                            >
                              <Eye className="h-3.5 w-3.5 text-status-warning-text" />
                              <span>{t('content.previewBtn')}</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-border bg-bg-subtle text-text-muted/40 text-xs font-bold cursor-not-allowed"
                              title={t('content.previewDisabledTooltip')}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{t('content.previewBtn')}</span>
                            </button>
                          )}

                          {/* Edit Action: non-functional placeholder for future Lesson Builder */}
                          <button
                            disabled
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-border bg-bg-subtle text-text-muted text-xs font-bold cursor-not-allowed"
                            title={t('content.editTooltip')}
                          >
                            <Pencil className="h-3.5 w-3.5 text-text-muted" />
                            <span>{t('content.editBtn')}</span>
                          </button>

                          {/* Status indicator */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans ${
                              lesson.status === 'PUBLISHED'
                                ? 'bg-status-success-bg text-status-success-text border border-card-border'
                                : 'bg-bg-subtle text-text-muted border border-card-border'
                            }`}
                          >
                            {lesson.status === 'PUBLISHED' ? t('content.published') : t('content.draft')}
                          </span>

                          {/* Action Publish/Unpublish */}
                          <button
                            onClick={() => handleToggleLessonPublish(lesson)}
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors shadow-sm ${
                              lesson.status === 'PUBLISHED'
                                ? 'border-card-border bg-status-error-bg text-status-error-text hover:bg-status-error-bg/80'
                                : 'border-card-border bg-status-success-bg text-status-success-text hover:bg-status-success-bg/80'
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
                            className="bg-card-header-bg border-t border-card-border px-6 py-4 overflow-hidden"
                          >
                            {lesson.content ? (
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-text-heading">
                                        {lesson.content.title}
                                      </span>
                                      <span className="text-[10px] font-bold text-text-muted bg-bg-subtle px-2 py-0.5 rounded">
                                        {t('content.versionLabel', { version: lesson.content.version })}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                          lesson.content.status === 'PUBLISHED'
                                            ? 'bg-status-success-bg text-status-success-text border-card-border'
                                            : lesson.content.status === 'ARCHIVED'
                                            ? 'bg-bg-subtle text-text-muted border-card-border'
                                            : 'bg-status-warning-bg text-status-warning-text border-card-border'
                                        }`}
                                      >
                                        {lesson.content.status}
                                      </span>
                                    </div>

                                    <p className="text-xs text-text-muted font-medium">
                                      {lesson.content.description || t('content.noDescription')}
                                    </p>
                                  </div>

                                  {/* Action Buttons for Content Package */}
                                  <div className="flex items-center gap-2 flex-wrap self-start">
                                    <button
                                      onClick={() => handleViewHistory(lesson.content!.contentGroupId, lesson.content!.title)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-link-primary bg-card-bg border border-card-border rounded-lg hover:border-card-border shadow-2xs transition-colors"
                                      title={t('content.versionHistoryBtn')}
                                    >
                                      <History className="h-3.5 w-3.5" />
                                      <span>{t('content.versionHistoryBtn')}</span>
                                    </button>

                                    <button
                                      onClick={() => handleDownloadZip(lesson.content!.id)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-heading bg-card-bg border border-card-border rounded-lg hover:border-card-border shadow-2xs transition-colors"
                                      title={t('content.downloadZipBtn')}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>{t('content.downloadZipBtn')}</span>
                                    </button>

                                    {lesson.content.status === 'DRAFT' && (
                                      <button
                                        onClick={() => handlePublishContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-link-primary hover:bg-link-primary-hover rounded-lg shadow-2xs transition-colors"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>{t('content.publishContentBtn')}</span>
                                      </button>
                                    )}

                                    {lesson.content.status !== 'ARCHIVED' && (
                                      <button
                                        onClick={() => handleArchiveContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-status-error-text bg-card-bg border border-card-border hover:border-card-border shadow-2xs transition-colors"
                                      >
                                        <Archive className="h-3.5 w-3.5" />
                                        <span>{t('content.archiveContentBtn')}</span>
                                      </button>
                                    )}

                                    {lesson.content.status === 'ARCHIVED' && (
                                      <button
                                        onClick={() => handleRestoreContent(lesson.content!.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-text-inverse bg-bg-inverse hover:bg-bg-inverse/90 rounded-lg shadow-2xs transition-colors"
                                      >
                                        <FileCheck className="h-3.5 w-3.5" />
                                        <span>{t('content.restoreContentBtn')}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata Badges */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-card-border text-xs">
                                  {lesson.content.category && (
                                    <div className="flex items-center gap-1.5 text-text-body font-bold bg-card-bg px-2.5 py-1 rounded-md border border-card-border">
                                      <Folder className="h-3.5 w-3.5 text-text-muted" />
                                      <span>{lesson.content.category.name}</span>
                                    </div>
                                  )}

                                  {lesson.content.author && (
                                    <span className="inline-flex items-center gap-1 bg-card-bg text-text-body px-2.5 py-1 rounded-md font-bold border border-card-border">
                                      <User className="h-3 w-3 text-text-muted" />
                                      {t('content.authorLabel', { author: lesson.content.author })}
                                    </span>
                                  )}

                                  {lesson.content.language && (
                                    <span className="inline-flex items-center gap-1 bg-card-bg text-text-body px-2.5 py-1 rounded-md font-bold border border-card-border">
                                      <Globe className="h-3 w-3 text-text-muted" />
                                      {t('content.languageLabel', { language: lesson.content.language })}
                                    </span>
                                  )}

                                  {lesson.content.tags && lesson.content.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {lesson.content.tags.map((tg) => (
                                        <span
                                          key={tg.id}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-status-info-bg text-status-info-text px-2 py-0.5 rounded-md border border-card-border"
                                        >
                                          <Tag className="h-2.5 w-2.5 text-link-primary" />
                                          {tg.tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="py-2 flex items-center justify-between">
                                <p className="text-xs text-text-muted italic">
                                  {t('content.noLinkedScorm')}
                                </p>
                                {hasImportPermission && (
                                  <button
                                    onClick={() => {
                                      setError('');
                                      setSuccess('');
                                      setShowImportWizard(true);
                                    }}
                                    className="flex items-center gap-1 text-xs font-bold text-link-primary hover:text-link-primary-hover underline"
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
            <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-12 text-center text-text-muted">
              {t('content.noCourses')}
            </div>
          ) : (
            <div className="divide-y divide-card-border rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-sm" id="courses-list">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-card-header-bg transition-colors gap-4 ${
                    selectedCourse?.id === course.id ? 'bg-status-info-bg/30 border-l-4 border-l-link-primary' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="font-bold text-text-heading text-sm sm:text-base font-sans">
                        {course.title}
                      </h4>
                      <span className="text-xs font-bold text-text-muted bg-bg-subtle px-2 py-0.5 rounded-lg">
                        {t('content.lessonsCount', { count: (course.courseLessons || []).length })}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {t('content.createdAt', { date: new Date(course.createdAt).toLocaleDateString() })}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto">
                    {/* Status indicator */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans ${
                        course.status === 'PUBLISHED'
                          ? 'bg-status-success-bg text-status-success-text border border-card-border'
                          : 'bg-bg-subtle text-text-muted border border-card-border'
                      }`}
                    >
                      {course.status === 'PUBLISHED' ? t('content.published') : t('content.draft')}
                    </span>

                    {/* Manage internal lessons */}
                    <button
                      onClick={() => handleSelectCourse(course)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                        selectedCourse?.id === course.id
                          ? 'border-card-border bg-status-info-bg text-status-info-text'
                          : 'border-card-border bg-card-bg text-text-muted hover:bg-card-header-bg'
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
                          ? 'border-card-border bg-status-error-bg text-status-error-text hover:bg-status-error-bg/80'
                          : 'border-card-border bg-status-success-bg text-status-success-text hover:bg-status-success-bg/80'
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
          <h2 className="text-lg font-bold text-text-heading font-sans">
            {t('content.courseStructureTitle')}
          </h2>

          {selectedCourse ? (
            <div className="rounded-2xl border border-card-border bg-card-header-bg p-4 space-y-4 shadow-sm">
              <div className="border-b border-card-border pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-link-primary tracking-wider uppercase">{t('content.editingCourse')}</span>
                  <h3 className="font-bold text-text-heading text-base">{selectedCourse.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-text-muted hover:text-text-heading text-xs font-semibold"
                >
                  {t('content.deselectBtn')}
                </button>
              </div>

              {/* Orderable lists */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-muted">{t('content.orderedList')}</span>
                {courseLessons.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-2 text-center border border-dashed border-card-border rounded-xl bg-card-bg">
                    {t('content.noLessonsInCourse')}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {courseLessons.map((les, index) => (
                      <div
                        key={les.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-card-border bg-card-bg text-xs shadow-sm"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-bold text-text-muted w-4 text-center">
                            {index + 1}
                          </span>
                          <span className="font-bold text-text-heading truncate">{les.title}</span>
                          {les.status === 'DRAFT' && (
                            <span className="text-[9px] font-bold text-text-muted bg-bg-subtle px-1 py-0.5 rounded">
                              {t('content.draftBadge')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => moveLessonOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-text-muted hover:bg-bg-subtle disabled:opacity-30"
                            title={t('content.arrowUpTooltip')}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLessonOrder(index, 'down')}
                            disabled={index === courseLessons.length - 1}
                            className="p-1 rounded text-text-muted hover:bg-bg-subtle disabled:opacity-30"
                            title={t('content.arrowDownTooltip')}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveLessonFromCourse(les.id)}
                            className="p-1 rounded text-status-error-text hover:bg-status-error-bg"
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
                className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-bg-inverse text-text-inverse font-bold py-2 text-sm shadow hover:bg-bg-inverse/90 transition-colors disabled:opacity-50"
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{t('content.saveStructureBtn')}</span>
                )}
              </button>

              {/* Picker list to add lessons */}
              <div className="border-t border-card-border pt-3 space-y-2">
                <span className="text-xs font-bold text-text-muted">{t('content.addLessonToCourse')}</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {lessons
                    .filter((l) => !courseLessons.some((cl) => cl.id === l.id))
                    .map((l) => (
                      <button
                        key={l.id}
                        onClick={() => handleAddLessonToCourse(l)}
                        className="w-full flex items-center justify-between p-2 rounded-lg border border-card-border bg-card-bg text-xs hover:border-card-border hover:bg-card-header-bg text-left"
                      >
                        <span className="font-bold text-text-heading truncate">{l.title}</span>
                        <PlusCircle className="h-4 w-4 text-link-primary flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  {lessons.filter((l) => !courseLessons.some((cl) => cl.id === l.id)).length === 0 && (
                    <p className="text-xs text-text-muted italic text-center py-2">
                      {t('content.allLessonsInCourse')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-6 text-center text-text-muted text-sm">
              {t('content.selectCourseFirst')}
            </div>
          )}
        </div>
      </div>

      {/* VERSION HISTORY MODAL */}
      {historyGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card-header-bg">
              <div>
                <h3 className="font-bold text-text-heading text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-link-primary" />
                  <span>{t('content.versionHistoryModal.title')}</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5 font-medium truncate">
                  {historyTitle}
                </p>
              </div>
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl p-2 text-text-muted hover:bg-bg-subtle hover:text-text-heading transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-link-primary" />
                  <p className="text-xs text-text-muted font-bold">{t('content.messages.fetchVersionsErr')}</p>
                </div>
              ) : historyVersions.length === 0 ? (
                <p className="text-text-muted text-center py-8 text-xs font-bold">{t('content.versionHistoryModal.noVersions')}</p>
              ) : (
                <div className="divide-y divide-card-border border border-card-border rounded-2xl overflow-hidden shadow-xs">
                  {historyVersions.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-4 bg-card-bg hover:bg-card-header-bg transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-text-heading text-sm">
                            {t('content.versionLabel', { version: ver.version })}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                              ver.status === 'PUBLISHED'
                                ? 'bg-status-success-bg text-status-success-text border-card-border'
                                : ver.status === 'ARCHIVED'
                                ? 'bg-bg-subtle text-text-muted border-card-border'
                                : 'bg-status-warning-bg text-status-warning-text border-card-border'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted font-bold">
                          {t('content.versionHistoryModal.uploaded', { date: new Date(ver.createdAt).toLocaleString() })}
                        </p>
                        {ver.author && (
                          <p className="text-[10px] text-text-muted font-semibold">
                            {t('content.authorLabel', { author: ver.author })}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadZip(ver.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-bold text-text-body hover:bg-card-header-bg transition-colors"
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
              <div className="bg-status-info-bg border border-card-border rounded-xl p-3 text-xs text-status-info-text flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-link-primary" />
                <span>
                  {t('content.versionHistoryModal.mvpNote')}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-card-border bg-card-header-bg flex justify-end">
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-bold text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
              >
                {t('content.versionHistoryModal.closeBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* STUB CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-card-bg p-6 shadow-xl border border-card-border"
          >
            <div className="flex items-center justify-between border-b border-card-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-text-heading font-sans">
                {activeTab === 'lessons' ? t('content.createModal.newLessonTitle') : t('content.createModal.newCourseTitle')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-heading"
                id="btn-close-create-modal"
              >
                {t('content.createModal.cancelBtn')}
              </button>
            </div>

            {/* Mode selection for Lessons: Blank Lesson vs Import Package */}
            {activeTab === 'lessons' && (
              <div className="flex rounded-xl bg-card-header-bg p-1 border border-card-border mb-4" id="lesson-creation-mode-tabs">
                <button
                  type="button"
                  onClick={() => setLessonCreationMode('blank')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    lessonCreationMode === 'blank'
                      ? 'bg-card-bg text-text-heading shadow-xs'
                      : 'text-text-muted hover:text-text-body'
                  }`}
                  id="btn-mode-blank"
                >
                  {t('content.createModal.modeBlank', 'Blank Lesson')}
                </button>
                <button
                  type="button"
                  onClick={() => setLessonCreationMode('import')}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    lessonCreationMode === 'import'
                      ? 'bg-card-bg text-text-heading shadow-xs'
                      : 'text-text-muted hover:text-text-body'
                  }`}
                  id="btn-mode-import"
                >
                  {t('content.createModal.modeImport', 'Import Package')}
                </button>
              </div>
            )}

            {activeTab === 'lessons' && lessonCreationMode === 'import' ? (
              <div className="space-y-4" id="import-package-options-view">
                <p className="text-xs text-text-muted">
                  {t('content.createModal.selectPackageType', 'Select a package format to upload and convert into a lesson:')}
                </p>
                <div className="space-y-2">
                  {packageImportOptions.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={pkg.onSelect}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-card-border bg-card-bg hover:bg-card-header-bg hover:border-link-primary transition-all text-left group shadow-xs cursor-pointer"
                      id={`btn-import-package-${pkg.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-info-bg text-link-primary group-hover:scale-105 transition-transform">
                          <pkg.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-text-heading group-hover:text-link-primary transition-colors">
                              {pkg.name}
                            </span>
                            {pkg.badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-card-header-bg text-text-muted border border-card-border">
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-link-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
                <div className="flex justify-end pt-2 border-t border-card-border">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-card-border px-4 py-2 text-xs font-bold text-text-muted hover:bg-card-header-bg transition-colors cursor-pointer"
                    id="btn-cancel-package-import"
                  >
                    {t('content.createModal.cancelBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={activeTab === 'lessons' ? handleCreateLesson : handleCreateCourse}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
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
                    className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2.5 text-sm font-bold text-text-heading placeholder-text-muted shadow-sm focus:border-link-primary focus:outline-none"
                    id="input-create-title"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border border-card-border px-4 py-2.5 text-sm font-bold text-text-muted hover:bg-card-header-bg transition-colors cursor-pointer"
                  >
                    {t('content.createModal.cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading || !titleInput.trim()}
                    className="flex-1 rounded-xl bg-link-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-link-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                    id="btn-submit-create"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>{t('content.createModal.createBtn')}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* CONTENT IMPORT WIZARD MODAL */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
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
