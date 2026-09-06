/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Check,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  Bookmark,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  completionRule: 'MARKED_COMPLETE' | 'QUIZ_PASSED' | 'MIN_SCORE' | 'ACKNOWLEDGEMENT' | 'CUSTOM';
}

interface CourseLesson {
  id: string;
  courseId: string;
  lessonId: string;
  order: number;
  lesson: Lesson;
}

interface Course {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  courseLessons: CourseLesson[];
}

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

interface UserAssignmentInstance {
  id: string;
  assignmentId: string;
  userId: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  dueDate: string | null;
  completedAt: string | null;
  progressPercent: number;
  sources: InstanceSource[];
  assignment: {
    id: string;
    lesson: Lesson;
  };
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const Catalog: React.FC = () => {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instances, setInstances] = useState<UserAssignmentInstance[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'LESSONS' | 'COURSES'>('LESSONS');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [lessonsRes, coursesRes, instancesRes] = await Promise.all([
        fetch('/api/lessons'),
        fetch('/api/courses'),
        fetch('/api/assignment-instances'),
      ]);

      if (!lessonsRes.ok || !coursesRes.ok || !instancesRes.ok) {
        throw new Error(t('catalog.messages.fetchError'));
      }

      const lessonsData = await lessonsRes.json();
      const coursesData = await coursesRes.json();
      const instancesData = await instancesRes.json();

      setLessons(lessonsData.filter((l: Lesson) => l.status === 'PUBLISHED'));
      setCourses(coursesData.filter((c: Course) => c.status === 'PUBLISHED'));
      setInstances(instancesData);
    } catch (err: any) {
      setError(err.message || t('catalog.messages.fetchErr'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if a specific lesson is already assigned to the user (via any active source type)
  const isLessonAssigned = (lessonId: string) => {
    return instances.some(
      (inst) => inst.assignment?.lesson?.id === lessonId && inst.status !== 'CANCELLED'
    );
  };

  // Check if a specific lesson is already specifically self-assigned by the user
  const isLessonSelfAssigned = (lessonId: string) => {
    return instances.some(
      (inst) => 
        inst.assignment?.lesson?.id === lessonId && 
        inst.status !== 'CANCELLED' &&
        inst.sources?.some((src) => src.sourceType === 'SELF_ASSIGNED')
    );
  };

  // Self-assign a single lesson
  const handleSelfAssignLesson = async (lessonId: string, lessonTitle: string) => {
    if (isLessonAssigned(lessonId)) return; // Client-side prevention

    setError('');
    setSuccess('');
    setIsActionLoading(lessonId);

    try {
      const res = await fetch('/api/assignments/self-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ lessonId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('catalog.messages.selfAssignError', { title: lessonTitle }));
      }

      setSuccess(t('catalog.messages.selfAssignSuccess', { title: lessonTitle }));
      
      // Reload instances to update assigned state
      const instancesRes = await fetch('/api/assignment-instances');
      if (instancesRes.ok) {
        const instancesData = await instancesRes.json();
        setInstances(instancesData);
      }
    } catch (err: any) {
      setError(err.message || t('catalog.messages.selfAssignErr'));
    } finally {
      setIsActionLoading(null);
    }
  };

  // Self-assign all lessons inside a Course that are not already assigned
  const handleSelfAssignCourse = async (course: Course) => {
    const unassignedLessons = (course.courseLessons || [])
      .map((cl) => cl.lesson)
      .filter((l) => l.status === 'PUBLISHED' && !isLessonAssigned(l.id));

    if (unassignedLessons.length === 0) return; // Client-side prevention

    setError('');
    setSuccess('');
    setIsActionLoading(course.id);

    try {
      let succeededCount = 0;
      for (const lesson of unassignedLessons) {
        const res = await fetch('/api/assignments/self-assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCookie('csrfToken'),
          },
          body: JSON.stringify({ lessonId: lesson.id }),
        });
        if (res.ok) {
          succeededCount++;
        }
      }

      if (succeededCount > 0) {
        setSuccess(t('catalog.messages.selfAssignCourseSuccess', { title: course.title, count: succeededCount }));
      } else {
        throw new Error(t('catalog.messages.selfAssignCourseError'));
      }

      // Reload instances to update assigned state
      const instancesRes = await fetch('/api/assignment-instances');
      if (instancesRes.ok) {
        const instancesData = await instancesRes.json();
        setInstances(instancesData);
      }
    } catch (err: any) {
      setError(err.message || t('catalog.messages.selfAssignCourseErr'));
    } finally {
      setIsActionLoading(null);
    }
  };

  // Filter lessons based on search
  const filteredLessons = lessons.filter((lesson) =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter courses based on search
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
      id="catalog-root"
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-heading font-sans">
            {t('catalog.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1 font-medium">
            {t('catalog.subtitle')}
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

      {/* Filter and Search Box */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card-header-bg p-4 rounded-2xl border border-card-border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={activeTab === 'LESSONS' ? t('catalog.searchLessonsPlaceholder') : t('catalog.searchCoursesPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card-bg pl-10 pr-4 py-2 text-sm font-semibold text-text-body shadow-xs focus:border-link-primary focus:outline-none"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-bg-subtle p-1 rounded-xl self-start md:self-auto">
          {(['LESSONS', 'COURSES'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wide ${
                activeTab === tab
                  ? 'bg-card-bg text-text-heading shadow-sm'
                  : 'text-text-muted hover:text-text-heading'
              }`}
            >
              {tab === 'LESSONS' ? t('catalog.lessonsTab') : t('catalog.coursesTab')}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-link-primary" />
          <p className="text-sm text-text-muted font-medium">{t('catalog.loading')}</p>
        </div>
      ) : activeTab === 'LESSONS' ? (
        filteredLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-16 text-center text-text-muted">
            <BookOpen className="h-10 w-10 mx-auto text-text-muted mb-3" />
            <p className="text-base font-bold text-text-heading">{t('catalog.noLessonsTitle')}</p>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              {t('catalog.noLessonsDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => {
              const assigned = isLessonAssigned(lesson.id);
              return (
                <div
                  key={lesson.id}
                  className="flex flex-col justify-between rounded-2xl border border-card-border bg-card-bg p-5 shadow-xs hover:shadow-md transition-all gap-5"
                  id={`catalog-lesson-${lesson.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-status-info-bg text-status-info-text border border-card-border">
                        <BookOpen className="h-3 w-3" />
                        {t('catalog.lessonBadge')}
                      </span>
                      {assigned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-success-text">
                          <Check className="h-3.5 w-3.5" />
                          {t('catalog.assignedBadge')}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-text-heading text-base leading-tight font-sans">
                        {lesson.title}
                      </h3>
                      <p className="text-[10px] font-mono text-text-muted mt-1.5 uppercase tracking-wide">
                        {t('catalog.ruleLabel', { rule: lesson.completionRule })}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-card-border flex items-center justify-between gap-4">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      {t('catalog.selfAssignAllowed')}
                    </span>
                    
                    {assigned ? (
                      <button
                        disabled
                        className="inline-flex items-center justify-center space-x-1 px-4 py-2 bg-bg-subtle text-text-muted rounded-xl text-xs font-bold border border-card-border cursor-not-allowed"
                        id={`already-assigned-btn-${lesson.id}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t('catalog.alreadyAssignedBtn')}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelfAssignLesson(lesson.id, lesson.title)}
                        disabled={isActionLoading !== null}
                        className="inline-flex items-center justify-center space-x-1 px-4 py-2 bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                        id={`self-assign-btn-${lesson.id}`}
                      >
                        {isActionLoading === lesson.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t('catalog.selfAssignBtn')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-16 text-center text-text-muted">
          <Bookmark className="h-10 w-10 mx-auto text-text-muted mb-3" />
          <p className="text-base font-bold text-text-heading">{t('catalog.noCoursesTitle')}</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {t('catalog.noCoursesDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => {
            const courseLessons = (course.courseLessons || []).map((cl) => cl.lesson);
            const totalLessons = courseLessons.length;
            const unassignedLessons = courseLessons.filter((l) => !isLessonAssigned(l.id));
            const allAssigned = unassignedLessons.length === 0;

            return (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs hover:shadow-md transition-all gap-5"
                id={`catalog-course-${course.id}`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-status-info-bg text-status-info-text border border-card-border">
                      <Layers className="h-3.5 w-3.5" />
                      {t('catalog.courseBadge')}
                    </span>
                    <span className="text-xs font-bold text-text-muted">
                      {t('catalog.lessonsCount', { count: totalLessons })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-text-heading text-lg leading-tight font-sans">
                      {course.title}
                    </h3>
                  </div>

                  {/* Course Lessons List */}
                  <div className="space-y-2 bg-card-header-bg p-3 rounded-xl border border-card-border">
                    <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                      {t('catalog.includedLessonsTitle')}
                    </p>
                    {courseLessons.length === 0 ? (
                      <p className="text-xs text-text-muted italic">{t('catalog.noLessonsInCourse')}</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(course.courseLessons || []).map((cl) => {
                          const assigned = isLessonAssigned(cl.lesson.id);
                          return (
                            <div
                              key={cl.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-card-bg border border-card-border"
                            >
                              <span className="font-semibold text-text-body truncate max-w-[70%]">
                                {cl.order}. {cl.lesson.title}
                              </span>
                              {assigned ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-status-success-text gap-0.5">
                                  <Check className="h-3 w-3" /> {t('catalog.assignedBadge')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-text-muted">{t('catalog.notAssignedBadge')}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-card-border flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-text-muted">
                    {allAssigned 
                      ? t('catalog.allLessonsAssigned') 
                      : t('catalog.lessonsToAssign', { count: unassignedLessons.length })
                    }
                  </span>

                  {allAssigned ? (
                    <button
                      disabled
                      className="inline-flex items-center justify-center space-x-1 px-4 py-2 bg-bg-subtle text-text-muted rounded-xl text-xs font-bold border border-card-border cursor-not-allowed"
                      id={`course-already-assigned-${course.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{t('catalog.alreadyAssignedBtn')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelfAssignCourse(course)}
                      disabled={isActionLoading !== null}
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                      id={`course-self-assign-btn-${course.id}`}
                    >
                      {isActionLoading === course.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t('catalog.assignCourseBtn')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
