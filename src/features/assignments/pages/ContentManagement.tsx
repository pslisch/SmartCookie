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
  PlusCircle,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { ContentImportWizard } from '../../content/pages/ContentImportWizard';

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
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
            >
              <Upload className="h-4 w-4" />
              <span>Import SCORM Package</span>
            </button>
          )}

          <button
            onClick={() => {
              setError('');
              setSuccess('');
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
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
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base font-sans">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t('content.createdAt', { date: new Date(lesson.createdAt).toLocaleDateString() })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
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
                ))}
              </div>
            )
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              {t('content.noCourses')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLessonOrder(index, 'down')}
                            disabled={index === courseLessons.length - 1}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveLessonFromCourse(les.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
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
